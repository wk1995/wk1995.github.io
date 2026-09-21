const test = require("node:test");
const assert = require("node:assert/strict");
const handler = require("./[...path]");
process.env.STUDY_WEB_ORIGIN = "https://web.example.test";
process.env.STUDY_BFF_ORIGIN = "https://bff.example.test";

function response() {
  return { headers: {}, setHeader(key, value) { this.headers[key] = value; }, getHeader(key) { return this.headers[key]; }, end(body) { this.body = JSON.parse(body); } };
}
test("BFF rejects cross-origin mutations before reading a session or calling GitHub", async () => {
  const res = response();
  await handler({ method: "POST", url: "/api/study/v1/logout", headers: { origin: "https://untrusted.example.test" } }, res);
  assert.equal(res.statusCode, 403);
});
test("asynchronous session errors return a controlled unauthenticated response", async () => {
  const res = response();
  await handler({ method: "GET", url: "/api/study/v1/session", headers: {} }, res);
  assert.equal(res.statusCode, 401);
  assert.equal(res.body.error, "Not authenticated");
});
test("cross-origin session cookie works with authenticated BFF fetches", () => {
  const res = response();
  require("./_lib").setCookie(res, "study_session", "opaque", 60);
  assert.match(res.headers['Set-Cookie'], /HttpOnly; Secure; SameSite=None/);
});
