const assert = require("node:assert/strict");
const test = require("node:test");

process.env.STUDY_SESSION_SECRET = "test-only-session-secret";
const { downloadGithubArtifact, seal, unseal } = require("./_lib");

test("session payload is authenticated and expires", () => {
  const value = seal({ login: "wk", exp: Date.now() + 60_000 });
  assert.equal(unseal(value).login, "wk");
  assert.throws(() => unseal(seal({ login: "wk", exp: Date.now() - 1 })), /expired/);
});

test("artifact redirect drops GitHub authorization", async () => {
  const originalFetch = global.fetch;
  const calls = [];
  global.fetch = async (url, init) => {
    calls.push({ url, init });
    if (calls.length === 1) return new Response(null, { status: 302, headers: { Location: "https://objects.example/artifact.zip" } });
    return new Response(Uint8Array.from([1, 2, 3]), { status: 200 });
  };
  try {
    const bytes = await downloadGithubArtifact("https://api.github.com/artifact", "secret-token");
    assert.deepEqual([...bytes], [1, 2, 3]);
    assert.equal(calls[0].init.headers.Authorization, "Bearer secret-token");
    assert.equal(calls[0].init.redirect, "manual");
    assert.equal(calls[1].url, "https://objects.example/artifact.zip");
    assert.equal(calls[1].init.headers, undefined);
    assert.equal(calls[1].init.redirect, "error");
  } finally {
    global.fetch = originalFetch;
  }
});
