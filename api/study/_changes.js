const { github, repoConfig } = require("./_lib");

// No ref exists until all files are assembled in one immutable tree and commit.
async function publishChangeSet({ token, baseCommit, branch, changes, message }, api = github) {
  if (!/^[0-9a-f]{40}$/.test(baseCommit) || !changes.length || new Set(changes.map((item) => item.path)).size !== changes.length) throw new Error("Invalid change set");
  const { owner, repo } = repoConfig();
  const root = `/repos/${owner}/${repo}`;
  const encodePath = (path) => path.split("/").map(encodeURIComponent).join("/");
  for (const change of changes) {
    if (!/^(学习项目|生成\/学习仪表盘|配置\/学习仪表盘)\//.test(change.path) || change.path.split("/").some((part) => !part || part === ".." || part === ".")) throw new Error("Path outside learning business");
    let actual = null;
    try { actual = (await api(`${root}/contents/${encodePath(change.path)}?ref=${baseCommit}`, token)).sha; }
    catch (error) { if (error.status !== 404) throw error; }
    if (actual !== change.expectedSha) throw Object.assign(new Error("Expected file changed; preview again"), { status: 409 });
  }
  const base = await api(`${root}/git/commits/${baseCommit}`, token);
  const post = (path, value) => api(`${root}${path}`, token, { method: "POST", body: JSON.stringify(value) });
  const entries = [];
  for (const change of [...changes].sort((a, b) => a.path.localeCompare(b.path))) {
    const blob = await post("/git/blobs", { content: change.content, encoding: "utf-8" });
    entries.push({ path: change.path, mode: "100644", type: "blob", sha: blob.sha });
  }
  const tree = await post("/git/trees", { base_tree: base.tree.sha, tree: entries });
  const existingCommit = async () => {
    let ref;
    try { ref = await api(`${root}/git/ref/heads/${encodePath(branch)}`, token); }
    catch (error) { if (error.status === 404) return null; throw error; }
    const commit = await api(`${root}/git/commits/${ref.object.sha}`, token);
    if (commit.tree.sha !== tree.sha || commit.parents.length !== 1 || commit.parents[0].sha !== baseCommit) throw Object.assign(new Error("Idempotent branch has a different change set"), { status: 409 });
    return ref.object.sha;
  };
  const existing = await existingCommit();
  if (existing) return existing;
  const commit = await post("/git/commits", { message, tree: tree.sha, parents: [baseCommit] });
  try { await post("/git/refs", { ref: `refs/heads/${branch}`, sha: commit.sha }); }
  catch (error) {
    if (error.status !== 422) throw error;
    const recovered = await existingCommit();
    if (!recovered) throw error;
    return recovered;
  }
  return commit.sha;
}

module.exports = { publishChangeSet };
