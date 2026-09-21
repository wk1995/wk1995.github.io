const crypto = require("crypto");
const zlib = require("zlib");

const API = "https://api.github.com";
const SESSION_COOKIE = "study_session";
const STATE_COOKIE = "study_oauth_state";

function env(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing server configuration: ${name}`);
  return value;
}

function cookieMap(header) {
  return Object.fromEntries(String(header || "").split(";").map((item) => item.trim()).filter(Boolean).map((item) => {
    const index = item.indexOf("=");
    return [item.slice(0, index), decodeURIComponent(item.slice(index + 1))];
  }));
}

function seal(payload) {
  const key = crypto.createHash("sha256").update(env("STUDY_SESSION_SECRET")).digest();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const body = Buffer.concat([cipher.update(JSON.stringify(payload), "utf8"), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), body]).toString("base64url");
}

function unseal(value) {
  const bytes = Buffer.from(value, "base64url");
  if (bytes.length < 29) throw new Error("Invalid session");
  const key = crypto.createHash("sha256").update(env("STUDY_SESSION_SECRET")).digest();
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, bytes.subarray(0, 12));
  decipher.setAuthTag(bytes.subarray(12, 28));
  const payload = JSON.parse(Buffer.concat([decipher.update(bytes.subarray(28)), decipher.final()]).toString("utf8"));
  if (!payload.exp || Date.now() >= payload.exp) throw new Error("Session expired");
  return payload;
}

function setCookie(res, name, value, maxAge) {
  const crossOrigin = process.env.STUDY_BFF_ORIGIN && process.env.STUDY_WEB_ORIGIN && new URL(process.env.STUDY_BFF_ORIGIN).origin !== new URL(process.env.STUDY_WEB_ORIGIN).origin;
  const sameSite = name === SESSION_COOKIE && crossOrigin ? "None" : "Lax";
  const next = `${name}=${encodeURIComponent(value)}; Path=/api/study; HttpOnly; Secure; SameSite=${sameSite}; Max-Age=${maxAge}`;
  const existing = res.getHeader("Set-Cookie");
  res.setHeader("Set-Cookie", existing ? [...(Array.isArray(existing) ? existing : [existing]), next] : next);
}

function clearCookie(res, name) {
  setCookie(res, name, "", 0);
}

function json(res, status, payload) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(payload));
}

function applyCors(req, res) {
  const allowed = env("STUDY_WEB_ORIGIN");
  const origin = req.headers.origin;
  if (origin && origin === allowed) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader("Vary", "Origin");
  }
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type,X-Idempotency-Key");
}

async function github(path, token, init = {}) {
  if (path.startsWith("http") && new URL(path).origin !== API) throw new Error("Invalid GitHub API origin");
  const response = await fetch(path.startsWith("http") ? path : `${API}${path}`, {
    ...init,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "wk1995-study-dashboard-bff",
      ...init.headers,
    },
    redirect: "manual",
  });
  if (!response.ok) {
    const error = new Error(`GitHub API ${response.status}`);
    error.status = response.status;
    throw error;
  }
  if (response.status === 204) return null;
  const contentType = response.headers.get("content-type") || "";
  return contentType.includes("json") ? response.json() : Buffer.from(await response.arrayBuffer());
}

async function downloadGithubArtifact(url, token) {
  if (new URL(url).origin !== API) throw new Error("Invalid Artifact API origin");
  const initial = await fetch(url, {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "wk1995-study-dashboard-bff",
    },
    redirect: "manual",
  });
  if (![301, 302, 303, 307, 308].includes(initial.status)) throw new Error(`Artifact download redirect expected, got HTTP ${initial.status}`);
  const location = initial.headers.get("location");
  if (!location || !location.startsWith("https://")) throw new Error("Artifact download redirect is invalid");
  const response = await fetch(location, { redirect: "error" });
  if (!response.ok) throw new Error(`Artifact object download failed: HTTP ${response.status}`);
  return readBounded(response, 6 * 1024 * 1024);
}

async function readBounded(response, limit) {
  if (Number(response.headers.get("content-length")) > limit) throw new Error("Artifact ZIP is too large");
  const reader = response.body.getReader();
  const chunks = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > limit) throw new Error("Artifact ZIP is too large");
      chunks.push(Buffer.from(value));
    }
    return Buffer.concat(chunks, size);
  } finally { await reader.cancel(); reader.releaseLock(); }
}

function unzipFirstJson(zip) {
  if (zip.length > 6 * 1024 * 1024) throw new Error("Artifact ZIP is too large");
  const eocd = zip.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  if (eocd < 0 || eocd + 22 > zip.length) throw new Error("Artifact ZIP is invalid");
  const count = zip.readUInt16LE(eocd + 10);
  let offset = zip.readUInt32LE(eocd + 16);
  if (count > 20) throw new Error("Artifact contains too many files");
  let selected = null;
  const names = new Set();
  for (let index = 0; index < count; index += 1) {
    if (offset + 46 > eocd) throw new Error("Artifact central directory is truncated");
    if (zip.readUInt32LE(offset) !== 0x02014b50) throw new Error("Artifact central directory is invalid");
    const method = zip.readUInt16LE(offset + 10);
    const compressedSize = zip.readUInt32LE(offset + 20);
    const uncompressedSize = zip.readUInt32LE(offset + 24);
    const nameLength = zip.readUInt16LE(offset + 28);
    const extraLength = zip.readUInt16LE(offset + 30);
    const commentLength = zip.readUInt16LE(offset + 32);
    const localOffset = zip.readUInt32LE(offset + 42);
    const name = zip.subarray(offset + 46, offset + 46 + nameLength).toString("utf8");
    if (offset + 46 + nameLength + extraLength + commentLength > eocd || name.startsWith("/") || name.includes("\\") || name.split("/").includes("..") || names.has(name)) throw new Error("Artifact entry path is invalid");
    names.add(name);
    if (name.endsWith(".json")) {
      if (compressedSize > 6 * 1024 * 1024 || uncompressedSize > 5 * 1024 * 1024) throw new Error("Artifact read model is too large");
      if (selected || localOffset + 30 > offset || zip.readUInt32LE(localOffset) !== 0x04034b50) throw new Error("Artifact must have one valid JSON entry");
      const localNameLength = zip.readUInt16LE(localOffset + 26);
      const localExtraLength = zip.readUInt16LE(localOffset + 28);
      const start = localOffset + 30 + localNameLength + localExtraLength;
      if (start + compressedSize > offset) throw new Error("Artifact JSON is truncated");
      const bytes = zip.subarray(start, start + compressedSize);
      const output = method === 0 ? bytes : method === 8 ? zlib.inflateRawSync(bytes, { maxOutputLength: 5 * 1024 * 1024 }) : null;
      if (!output || output.length !== uncompressedSize) throw new Error("Artifact entry cannot be decoded");
      selected = JSON.parse(output.toString("utf8"));
    }
    offset += 46 + nameLength + extraLength + commentLength;
  }
  if (!selected) throw new Error("Artifact has no JSON read model");
  return selected;
}

function repoConfig() {
  return {
    owner: process.env.STUDY_REPOSITORY_OWNER || "wk1995",
    repo: process.env.STUDY_REPOSITORY_NAME || "study",
    artifactPrefix: process.env.STUDY_ARTIFACT_PREFIX || "learning-dashboard-read-model-",
  };
}

async function loadReadModel(token) {
  const { owner, repo, artifactPrefix } = repoConfig();
  const repository = await github(`/repos/${owner}/${repo}`, token);
  const commit = await github(`/repos/${owner}/${repo}/commits/${encodeURIComponent(repository.default_branch)}`, token);
  const expectedName = `${artifactPrefix}${commit.sha}`;
  const artifacts = await github(`/repos/${owner}/${repo}/actions/artifacts?name=${encodeURIComponent(expectedName)}&per_page=20`, token);
  const artifact = artifacts.artifacts.find((item) => item.name === expectedName && !item.expired);
  if (!artifact) {
    const error = new Error("当前默认分支没有可用 read-model Artifact，请先触发学习仪表盘 workflow");
    error.status = 409;
    throw error;
  }
  if (artifact.workflow_run?.head_sha !== commit.sha || !artifact.workflow_run?.id) throw new Error("Artifact workflow source mismatch");
  const run = await github(`/repos/${owner}/${repo}/actions/runs/${artifact.workflow_run.id}`, token);
  if (run.head_sha !== commit.sha || run.status !== "completed" || run.conclusion !== "success") throw new Error("Artifact workflow is not successful for current HEAD");
  const zip = await downloadGithubArtifact(artifact.archive_download_url, token);
  const model = unzipFirstJson(zip);
  if (model.source_commit !== commit.sha) throw new Error("Artifact source_commit 与默认分支 HEAD 不一致");
  if (!["1.0.0", "1.1.0"].includes(model.schema_version) || !/^0\.[1-3]\.\d+$/.test(model.generator_version)) throw new Error("Unsupported read model version");
  return model;
}

function session(req) {
  const value = cookieMap(req.headers.cookie)[SESSION_COOKIE];
  if (!value) {
    const error = new Error("Not authenticated");
    error.status = 401;
    throw error;
  }
  try { return unseal(value); }
  catch { throw Object.assign(new Error("Session expired or invalid"), { status: 401 }); }
}

module.exports = {
  API, SESSION_COOKIE, STATE_COOKIE, applyCors, clearCookie, cookieMap, env, github,
  downloadGithubArtifact, json, loadReadModel, repoConfig, seal, session, setCookie, sha256(value) {
    return crypto.createHash("sha256").update(typeof value === "string" ? value : JSON.stringify(value)).digest("hex");
  }, unzipFirstJson, unseal, readBounded,
};
