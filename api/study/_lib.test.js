const assert = require("node:assert/strict");
const test = require("node:test");
const { readBounded, unzipFirstJson } = require("./_lib");

test("decompression is bounded even when ZIP metadata understates the output", () => {
  const payload = require("zlib").deflateRawSync(Buffer.alloc(6 * 1024 * 1024, 32));
  const name = Buffer.from("read-model.json");
  const local = Buffer.alloc(30 + name.length);
  local.writeUInt32LE(0x04034b50, 0); local.writeUInt16LE(name.length, 26); name.copy(local, 30);
  const central = Buffer.alloc(46 + name.length);
  central.writeUInt32LE(0x02014b50, 0); central.writeUInt16LE(8, 10);
  central.writeUInt32LE(payload.length, 20); central.writeUInt32LE(1, 24); central.writeUInt16LE(name.length, 28); name.copy(central, 46);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(1, 10); end.writeUInt32LE(local.length + payload.length, 16);
  assert.throws(() => unzipFirstJson(Buffer.concat([local, payload, central, end])));
});

test("streaming download aborts before oversized body is buffered", async () => {
  let cancelled = false;
  const response = new Response(new ReadableStream({
    pull(controller) { controller.enqueue(new Uint8Array(8)); },
    cancel() { cancelled = true; },
  }));
  await assert.rejects(readBounded(response, 10), /too large/);
  assert.equal(cancelled, true);
});

test("ZIP rejects malformed archives and too many entries", () => {
  assert.throws(() => unzipFirstJson(Buffer.from("bad")), /invalid/);
  const zip = Buffer.alloc(22);
  zip.writeUInt32LE(0x06054b50, 0);
  zip.writeUInt16LE(21, 10);
  assert.throws(() => unzipFirstJson(zip), /too many/);
});

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
