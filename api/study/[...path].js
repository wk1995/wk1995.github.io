const {
  SESSION_COOKIE, STATE_COOKIE, applyCors, clearCookie, cookieMap, env, github,
  json, loadReadModel, repoConfig, seal, session, setCookie, sha256, unseal,
} = require("./_lib");
const { publishChangeSet } = require("./_changes");

function route(req) {
  return new URL(req.url, `https://${req.headers.host || "localhost"}`).pathname.replace(/^\/api\/study\/?/, "");
}

async function body(req) {
  if (req.body && typeof req.body === "object") {
    if (Buffer.byteLength(JSON.stringify(req.body)) > 1024 * 1024) throw Object.assign(new Error("Request body too large"), { status: 413 });
    return req.body;
  }
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 1024 * 1024) throw Object.assign(new Error("Request body too large"), { status: 413 });
    chunks.push(chunk);
  }
  return chunks.length ? JSON.parse(Buffer.concat(chunks).toString("utf8")) : {};
}

async function oauthStart(req, res) {
  const state = cryptoRandom();
  setCookie(res, STATE_COOKIE, seal({ state, exp: Date.now() + 10 * 60 * 1000 }), 600);
  const callback = `${env("STUDY_BFF_ORIGIN")}/api/study/oauth/callback`;
  const url = new URL("https://github.com/login/oauth/authorize");
  url.searchParams.set("client_id", env("GH_OAUTH_CLIENT_ID"));
  url.searchParams.set("redirect_uri", callback);
  url.searchParams.set("scope", "repo workflow read:user");
  url.searchParams.set("state", state);
  res.statusCode = 302;
  res.setHeader("Location", url.toString());
  res.end();
}

async function oauthCallback(req, res) {
  const url = new URL(req.url, env("STUDY_BFF_ORIGIN"));
  const saved = unseal(cookieMap(req.headers.cookie)[STATE_COOKIE] || "");
  if (!url.searchParams.get("code") || saved.state !== url.searchParams.get("state")) throw new Error("OAuth state mismatch");
  const exchange = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: env("GH_OAUTH_CLIENT_ID"),
      client_secret: env("GH_OAUTH_CLIENT_SECRET"),
      code: url.searchParams.get("code"),
      redirect_uri: `${env("STUDY_BFF_ORIGIN")}/api/study/oauth/callback`,
    }),
  }).then((response) => response.json());
  if (!exchange.access_token) throw new Error(exchange.error_description || "OAuth token exchange failed");
  const user = await github("/user", exchange.access_token);
  setCookie(res, SESSION_COOKIE, seal({ token: exchange.access_token, login: user.login, exp: Date.now() + 15 * 60 * 1000 }), 900);
  clearCookie(res, STATE_COOKIE);
  res.statusCode = 302;
  res.setHeader("Location", new URL("/study/#/settings", env("STUDY_WEB_ORIGIN")).toString());
  res.end();
}

function cryptoRandom() {
  return require("crypto").randomBytes(24).toString("base64url");
}

async function ensureHead(token, baseCommit) {
  if (!/^[0-9a-f]{40}$/.test(baseCommit || "")) throw new Error("base_commit is invalid");
  const { owner, repo } = repoConfig();
  const repository = await github(`/repos/${owner}/${repo}`, token);
  const head = await github(`/repos/${owner}/${repo}/commits/${encodeURIComponent(repository.default_branch)}`, token);
  if (head.sha !== baseCommit) {
    const error = new Error("默认分支已更新，请刷新数据并重新预览变更");
    error.status = 409;
    throw error;
  }
  return repository.default_branch;
}

async function readSidecar(token, assessmentId, baseCommit) {
  if (!/^[A-Za-z0-9._-]+$/.test(assessmentId)) throw new Error("Invalid assessment_id");
  const { owner, repo } = repoConfig();
  const path = `生成/学习仪表盘/assessments/${assessmentId}.assessment.json`;
  try {
    const file = await github(`/repos/${owner}/${repo}/contents/${encodeURIComponent(path).replaceAll("%2F", "/")}?ref=${baseCommit}`, token);
    return { path, sha: file.sha, value: JSON.parse(Buffer.from(file.content, "base64").toString("utf8")) };
  } catch (error) {
    if (error.status !== 404) throw error;
    return { path, sha: null, value: { assessment_id: assessmentId, attempts: [], score_runs: [], review_decisions: [], audit_events: [] } };
  }
}

async function mutationPr({ token, login, assessmentId, baseCommit, operationId, title, transform }) {
  const base = await ensureHead(token, baseCommit);
  const { owner, repo } = repoConfig();
  const sidecar = await readSidecar(token, assessmentId, baseCommit);
  if (sidecar.value.assessment_id !== assessmentId) throw new Error("Assessment sidecar stable ID mismatch");
  const branch = `learning-dashboard/web-${operationId.toLowerCase()}`;
  const updated = transform(sidecar.value, login);
  await publishChangeSet({ token, baseCommit, branch, changes: [{ path: sidecar.path, expectedSha: sidecar.sha, content: `${JSON.stringify(updated, null, 2)}\n` }], message: `[codex] ${title}` });
  const pulls = await github(`/repos/${owner}/${repo}/pulls?state=all&head=${encodeURIComponent(`${owner}:${branch}`)}`, token);
  if (pulls.length) return { operation_id: operationId, pr_url: pulls[0].html_url, status: pulls[0].merged_at ? "merged" : pulls[0].state === "closed" ? "closed" : "submitted" };
  const pull = await github(`/repos/${owner}/${repo}/pulls`, token, {
    method: "POST",
    body: JSON.stringify({ title, head: branch, base, body: `Web BFF mutation \`${operationId}\`\n\nAssessment: \`${assessmentId}\`\nBase commit: \`${baseCommit}\`\n\n请在 vault 校验通过后合并。` }),
  });
  return { operation_id: operationId, pr_url: pull.html_url, status: "submitted" };
}

function appendAudit(sidecar, event) {
  sidecar.audit_events ||= [];
  if (!sidecar.audit_events.some((item) => item.audit_event_id === event.audit_event_id)) sidecar.audit_events.push(event);
}

function event(login, operationId, operation, baseCommit, inputIds, outputIds, reason = "", createdAt = new Date().toISOString()) {
  return {
    audit_event_id: `AUDIT-${operationId.replace(/^OP-/, "")}`,
    operation_id: operationId,
    operation,
    source_type: "web",
    source_locator: `web://bff/${operationId}`,
    actor_id: login,
    input_artifact_ids: inputIds,
    input_snapshot_id: `${inputIds.join(",") || "repository"}@${baseCommit}`,
    output_artifact_id: outputIds[0] || null,
    output_artifact_ids: outputIds,
    source_commit: baseCommit,
    status: "succeeded",
    reason,
    created_at: createdAt,
  };
}

async function dispatch(token, workflow, inputs) {
  const base = await ensureHead(token, inputs.source_commit || inputs.base_commit);
  const { owner, repo } = repoConfig();
  const workflowInputs = { ...inputs };
  delete workflowInputs.base_commit;
  await github(`/repos/${owner}/${repo}/actions/workflows/${workflow}/dispatches`, token, { method: "POST", body: JSON.stringify({ ref: base, inputs: workflowInputs }) });
  return { operation_id: `OP-WEB-${sha256({ workflow, inputs }).slice(0, 20).toUpperCase()}`, pr_url: "", status: "submitted" };
}

async function loadAssessment(token, recordId, assessmentId) {
  const model = await loadReadModel(token);
  const assessment = model.assessments.find((item) => item.record_id === recordId && item.assessment_id === assessmentId);
  if (!assessment) throw new Error("record_id / assessment_id stable ID mismatch");
  return assessment;
}

async function handleV1(req, res, pathname) {
  const auth = session(req);
  if (pathname === "v1/session" && req.method === "GET") return json(res, 200, { authenticated: true, login: auth.login, expires_in_seconds: Math.max(0, Math.floor((auth.exp - Date.now()) / 1000)) });
  if (pathname === "v1/logout" && req.method === "POST") { clearCookie(res, SESSION_COOKIE); return json(res, 200, { status: "signed_out" }); }
  if (pathname === "v1/read-model" && req.method === "GET") return json(res, 200, await loadReadModel(auth.token));
  if (pathname === "v1/changes" && req.method === "GET") {
    const { owner, repo } = repoConfig();
    const root = `/repos/${owner}/${repo}`;
    const pulls = await github(`${root}/pulls?state=all&per_page=50`, auth.token);
    const changes = [];
    for (const pull of pulls.filter((item) => item.head.ref.startsWith("learning-dashboard/")).slice(0, 10)) {
      const detail = await github(`${root}/pulls/${pull.number}`, auth.token);
      const files = await github(`${root}/pulls/${pull.number}/files?per_page=100`, auth.token);
      const checks = await github(`${root}/commits/${pull.head.sha}/check-runs`, auth.token);
      const runs = checks.check_runs || [];
      changes.push({ pr_url: pull.html_url, title: pull.title, state: detail.merged ? "merged" : pull.state,
        mergeable: detail.mergeable ?? null,
        checks: runs.length === 0 ? "unknown" : runs.some((run) => run.status !== "completed") ? "pending" : runs.every((run) => ["success", "skipped", "neutral"].includes(run.conclusion)) ? "passed" : "failed",
        files: files.filter((file) => /^(学习项目|生成\/学习仪表盘|配置\/学习仪表盘)\//.test(file.filename)).map((file) => ({
          path: file.filename, status: file.status, additions: file.additions, deletions: file.deletions,
          patch: "正文请在授权 GitHub PR 中审阅；此处仅显示变更范围。",
        })),
      });
    }
    return json(res, 200, changes);
  }
  const readMatch = pathname.match(/^v1\/assessments\/([^/]+)(?:\/attempts\/([^/]+))?$/);
  if (readMatch && req.method === "GET") {
    const model = await loadReadModel(auth.token);
    const assessment = model.assessments.find((item) => item.record_id === decodeURIComponent(readMatch[1]));
    if (!assessment) return json(res, 404, { error: "Assessment not archived" });
    if (!readMatch[2]) return json(res, 200, assessment);
    const attempt = assessment.attempts.find((item) => item.attempt_id === decodeURIComponent(readMatch[2]));
    if (!attempt) return json(res, 404, { error: "Attempt not archived; check submission PR" });
    return json(res, 200, { attempt_id: attempt.attempt_id, source_commit: model.source_commit, status: "archived", score_runs: assessment.score_runs.filter((item) => item.attempt_id === attempt.attempt_id) });
  }
  const payload = await body(req);
  const attemptMatch = pathname.match(/^v1\/assessments\/([^/]+)\/attempts$/);
  if (attemptMatch && req.method === "POST") {
    const assessment = await loadAssessment(auth.token, decodeURIComponent(attemptMatch[1]), payload.assessment_id);
    const ids = assessment.questions.map((item) => item.question_id).sort();
    const answers = Object.fromEntries((payload.answers || []).map((item) => [item.question_id, String(item.answer || "").trim()]));
    if (Object.keys(answers).sort().join() !== ids.join() || ids.some((id) => !answers[id])) throw new Error("answers must cover the archived question set exactly");
    const answerHash = sha256(ids.map((id) => `${id}\0${answers[id]}`).join("\n"));
    const key = sha256(`${auth.login}\0${assessment.assessment_id}\0${payload.base_commit}\0${answerHash}\0${req.headers["x-idempotency-key"] || cryptoRandom()}`).slice(0, 24).toUpperCase();
    const submittedAt = payload.submitted_at;
    if (!submittedAt || !Number.isFinite(Date.parse(submittedAt))) throw new Error("submitted_at is required");
    const operationId = `OP-WEB-${key}`;
    const attemptId = `ATTEMPT-WEB-${key}`;
    const receipt = await mutationPr({ token: auth.token, login: auth.login, assessmentId: assessment.assessment_id, baseCommit: payload.base_commit, operationId, title: `Archive Web answer attempt ${attemptId}`, transform(current) {
      current.attempts ||= [];
      const found = current.attempts.find((item) => item.operation_id === operationId);
      if (found && found.answer_hash !== answerHash) throw new Error("Idempotency key conflicts with an existing attempt");
      if (!found) current.attempts.push({ attempt_id: attemptId, source_type: "web", source_locator: `web://bff/${operationId}`, actor_id: auth.login, submitted_at: submittedAt, period: `cycle-${assessment.cycle_index}`, question_schema_version: payload.question_schema_version, answer_template_version: payload.answer_template_version, answer_hash: answerHash, input_snapshot_id: `${assessment.question_set_id || assessment.assessment_id}@${payload.base_commit}`, operation_id: operationId, audit_event_id: `AUDIT-WEB-${key}`, answers: ids.map((question_id) => ({ question_id, answer: answers[question_id] })) });
      appendAudit(current, event(auth.login, operationId, "submit_answer", payload.base_commit, [assessment.question_set_id || assessment.assessment_id], [attemptId], "Web answer archived through a file change PR", submittedAt));
      return current;
    } });
    return json(res, 200, { ...receipt, attempt_id: attemptId });
  }
  const scoreMatch = pathname.match(/^v1\/assessments\/([^/]+)\/attempts\/([^/]+)\/scores$/);
  if (scoreMatch && req.method === "POST") {
    if (!["review_required", "review_optional", "review_not_required"].includes(payload.review_policy)) throw new Error("review_policy is invalid");
    const assessment = await loadAssessment(auth.token, decodeURIComponent(scoreMatch[1]), payload.assessment_id);
    if (!assessment.attempts.some((item) => item.attempt_id === decodeURIComponent(scoreMatch[2]))) throw new Error("attempt_id does not belong to this assessment");
    return json(res, 200, await dispatch(auth.token, "score-assessment.yml", { assessment_id: payload.assessment_id, attempt_id: decodeURIComponent(scoreMatch[2]), profile_id: payload.llm_profile_id, source_commit: payload.base_commit, force_rescore: String(Boolean(payload.force_rescore)), review_policy: payload.review_policy }));
  }
  const selectionMatch = pathname.match(/^v1\/assessments\/([^/]+)\/attempts\/([^/]+)\/score-selection$/);
  if (selectionMatch && req.method === "POST") {
    const assessment = await loadAssessment(auth.token, decodeURIComponent(selectionMatch[1]), payload.assessment_id);
    const score = assessment.score_runs.find((item) => item.score_run_id === payload.selected_score_run_id && item.attempt_id === decodeURIComponent(selectionMatch[2]) && item.status === "succeeded");
    if (!score) throw new Error("ScoreRun stable ID does not belong to this assessment/attempt");
    const key = req.headers["x-idempotency-key"] || sha256(`${assessment.assessment_id}\0${payload.base_commit}\0${score.score_run_id}`).slice(0, 20).toUpperCase();
    const operationId = `OP-WEB-SCORE-SELECTION-${key}`;
    const receipt = await mutationPr({ token: auth.token, login: auth.login, assessmentId: assessment.assessment_id, baseCommit: payload.base_commit, operationId, title: `Select ScoreRun ${score.score_run_id}`, transform(current) {
      if (payload.expected_selected_score_run_id !== undefined && (current.selected_score_run_id || null) !== payload.expected_selected_score_run_id) throw new Error("selected_score_run_id changed since preview");
      if (!(current.score_runs || []).some((item) => item.score_run_id === score.score_run_id && item.status === "succeeded")) throw new Error("ScoreRun is not archived in the current sidecar");
      current.selected_score_run_id = score.score_run_id;
      current.score_status = "scored";
      current.score_total = score.total;
      current.level = score.level;
      appendAudit(current, event(auth.login, operationId, "select_score", payload.base_commit, [score.attempt_id, score.score_run_id], [`${assessment.assessment_id}:selected-score`], "Explicit ScoreRun selection"));
      return current;
    } });
    return json(res, 200, receipt);
  }
  const reviewMatch = pathname.match(/^v1\/assessments\/([^/]+)\/scores\/([^/]+)\/review$/);
  if (reviewMatch && req.method === "POST") {
    const assessment = await loadAssessment(auth.token, decodeURIComponent(reviewMatch[1]), payload.assessment_id);
    if (!assessment.score_runs.some((item) => item.score_run_id === decodeURIComponent(reviewMatch[2]))) throw new Error("score_run_id does not belong to this assessment");
    return json(res, 200, await dispatch(auth.token, "review-score.yml", { assessment_id: payload.assessment_id, score_run_id: decodeURIComponent(reviewMatch[2]), decision: payload.decision, reason: payload.reason, source_commit: payload.base_commit }));
  }
  const cycleMatch = pathname.match(/^v1\/assessments\/([^/]+)\/cycle-decision$/);
  if (cycleMatch && req.method === "POST") {
    await loadAssessment(auth.token, decodeURIComponent(cycleMatch[1]), payload.assessment_id);
    return json(res, 200, await dispatch(auth.token, "decide-cycle.yml", { assessment_id: payload.assessment_id, decision: payload.decision, reason: payload.reason, source_commit: payload.base_commit }));
  }
  return json(res, 404, { error: "Not found" });
}

module.exports = async function handler(req, res) {
  try {
    applyCors(req, res);
    if (req.method === "POST" && req.headers.origin !== env("STUDY_WEB_ORIGIN")) return json(res, 403, { error: "Origin mismatch" });
    if (req.method === "OPTIONS") { res.statusCode = 204; return res.end(); }
    const pathname = route(req);
    if (pathname === "oauth/start" && req.method === "GET") return await oauthStart(req, res);
    if (pathname === "oauth/callback" && req.method === "GET") return await oauthCallback(req, res);
    if (pathname.startsWith("v1/")) return await handleV1(req, res, pathname);
    return json(res, 404, { error: "Not found" });
  } catch (error) {
    return json(res, error.status || 500, { error: error.message || "Unexpected error" });
  }
};
