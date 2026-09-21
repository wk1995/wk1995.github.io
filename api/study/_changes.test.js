const test = require("node:test");
const assert = require("node:assert/strict");
const { publishChangeSet } = require("./_changes");

test("multi-file changes publish atomically and recover after every write failure", async () => {
  for (const failedStep of ["/git/blobs", "/git/trees", "/git/commits", "/git/refs"]) {
    let failure = failedStep, published = false, entries = [];
    const baseCommit = "a".repeat(40);
    const api = async (path, token, init = {}) => {
      if (path.endsWith(failure)) throw Object.assign(new Error("injected failure"), { status: 500 });
      if (path.includes("/contents/")) throw Object.assign(new Error("missing"), { status: 404 });
      if (path.endsWith(`/git/commits/${baseCommit}`)) return { tree: { sha: "base-tree" } };
      if (path.endsWith("/git/blobs")) return { sha: "blob" };
      if (path.endsWith("/git/trees")) { entries = JSON.parse(init.body).tree; return { sha: "complete-tree" }; }
      if (path.endsWith("/git/commits")) return { sha: "commit" };
      if (path.endsWith("/git/commits/commit")) return { tree: { sha: "complete-tree" }, parents: [{ sha: baseCommit }] };
      if (path.includes("/git/ref/heads/")) {
        if (published) return { object: { sha: "commit" } };
        throw Object.assign(new Error("missing"), { status: 404 });
      }
      if (path.endsWith("/git/refs")) { assert.equal(entries.length, 2); published = true; return {}; }
      throw new Error(`Unexpected ${path}`);
    };
    const args = { token: "test", baseCommit, branch: "branch", changes: ["one", "two"].map((id) => ({ path: `生成/学习仪表盘/${id}.json`, content: "{}", expectedSha: null })), message: "test" };
    await assert.rejects(publishChangeSet(args, api), /injected/);
    assert.equal(published, false);
    failure = "none";
    assert.equal(await publishChangeSet(args, api), "commit");
    assert.equal(await publishChangeSet(args, api), "commit");
  }
});

test("change set rejects path escape and changed expected old value before mutation", async () => {
  let writes = 0;
  const api = async (path, token, init = {}) => { if (init.method) writes++; return { sha: "other" }; };
  const args = { token: "test", baseCommit: "a".repeat(40), branch: "branch", message: "test" };
  for (const path of ["日记/private.md", "学习项目/../知识库/private.md", "学习项目/demo.md"]) {
    await assert.rejects(publishChangeSet({ ...args, changes: [{ path, content: "{}", expectedSha: null }] }, api));
  }
  assert.equal(writes, 0);
});
