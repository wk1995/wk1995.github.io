const assert = require("assert");
const fs = require("fs");
const http = require("http");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");

const root = path.resolve(__dirname, "..");
const api = require(path.join(root, "api", "apps", "index.js"));

const fixture = {
  schemaVersion: 2,
  version: 2,
  versionName: "test",
  versionNumber: "20260922000000",
  updatedAt: "2026-09-01",
  apps: [
    {
      id: "android/demo",
      slug: "demo",
      name: "Demo",
      platform: "android",
      platformId: "android",
      description: "body os demo",
      readme: "keep me",
      latest: { version: "1" },
      versions: [{ version: "1" }],
      betaqr: { id: "AbC", short: "demo", tokenRef: "wk-default", enabled: true },
    },
  ],
  platforms: { android: ["android/demo"] },
};

function testApplyKeepsGeneratedFieldsAndMergesBetaqr() {
  const current = fixture.apps[0];
  const next = api.applyAppFields(current, {
    name: "  Demo Renamed  ",
    latest: { version: "wiped" },
    betaqr: { short: "demo2" },
  });
  assert.strictEqual(next.name, "Demo Renamed");
  assert.strictEqual(next.platform, "android");
  assert.deepStrictEqual(next.latest, { version: "1" });
  assert.strictEqual(next.readme, "keep me");
  assert.deepStrictEqual(next.betaqr, {
    id: "AbC",
    short: "demo2",
    tokenRef: "wk-default",
    enabled: true,
  });
}

function testPutDoesNotDropGeneratedFields() {
  const next = api.applyAppFields(fixture.apps[0], {
    id: "android/demo",
    name: "Demo",
    description: "only writable",
  });
  assert.deepStrictEqual(next.latest, { version: "1" });
  assert.deepStrictEqual(next.versions, [{ version: "1" }]);
  assert.strictEqual(next.description, "only writable");
}

function testValidation() {
  assert.ok(api.validateAppInput({ id: "android/demo" }, { requireId: true, requireName: true }));
  assert.strictEqual(api.validateAppInput({
    id: "android/demo",
    name: "Demo",
  }, { requireId: true, requireName: true }), "");
  assert.ok(api.validateAppInput({
    id: "android/demo",
    name: "Demo",
    latest: {},
  }, { requireId: true, requireName: true }));
  assert.ok(api.validateBetaqr({ short: "bad short" }));
  assert.ok(api.validateBetaqr({ api_token: "secret" }));
}

function testUnknownPlatformDoesNotMatchAll() {
  const app = fixture.apps[0];
  assert.strictEqual(api.appMatchesQuery(app, "foo", ""), false);
  assert.strictEqual(api.appMatchesQuery(app, "android", ""), true);
}

function testStaleLockCanBeTakenOver() {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), "apps-lock-"));
  try {
    fs.writeFileSync(path.join(temp, "manifest.json"), JSON.stringify(fixture));
    const lockPath = path.join(temp, "manifest.json.lock");
    fs.writeFileSync(lockPath, "");
    const stale = new Date(Date.now() - 60 * 1000);
    fs.utimesSync(lockPath, stale, stale);
    api.setPackagesDir(temp);
    api.writeManifest(JSON.parse(JSON.stringify(fixture)));
    assert.ok(!fs.existsSync(lockPath));
    const written = JSON.parse(fs.readFileSync(path.join(temp, "manifest.json"), "utf8"));
    assert.strictEqual(written.apps[0].id, "android/demo");
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
}

function testGeneratorPreservesApiFields() {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), "apps-manifest-"));
  try {
    const packages = path.join(temp, "apps", "packages", "android", "demo");
    fs.mkdirSync(packages, { recursive: true });
    fs.writeFileSync(path.join(packages, "demo.apk"), "apk");
    const manifestPath = path.join(temp, "apps", "packages", "manifest.json");
    fs.writeFileSync(manifestPath, JSON.stringify({
      apps: [{
        id: "android/demo",
        name: "接口改过的名字",
        description: "接口改过的简介",
        betaqr: { id: "AbC", short: "demo", tokenRef: "wk", enabled: true },
      }],
    }));

    const script = fs.readFileSync(path.join(root, "scripts", "generate_app_manifest.py"), "utf8")
      .replace('ROOT = Path(__file__).resolve().parents[1]', `ROOT = Path(${JSON.stringify(temp)})`);
    const runner = path.join(temp, "generate.py");
    fs.writeFileSync(runner, script);
    const result = spawnSync("python3", [runner], { encoding: "utf8" });
    assert.strictEqual(result.status, 0, result.stderr || result.stdout);
    const written = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
    const app = written.apps.find((item) => item.id === "android/demo");
    assert.ok(app, "generated app missing");
    assert.deepStrictEqual(app.betaqr, { id: "AbC", short: "demo", tokenRef: "wk", enabled: true });
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
}

function testRouteDoesNotCaptureOpenApi() {
  const source = fs.readFileSync(path.join(root, "scripts", "video-resolver-server.cjs"), "utf8");
  assert.ok(source.includes('prefix: "/api/apps"'));
  assert.ok(source.includes("exact: true"));
  assert.ok(source.includes("if (candidate.exact)"));
}

function testGitignoreCoversTokenFile() {
  const source = fs.readFileSync(path.join(root, ".gitignore"), "utf8");
  assert.ok(source.includes(".betaqr-env.json"));
}

function request(port, method, urlPath, body) {
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: "127.0.0.1",
      port,
      path: urlPath,
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
    }, (res) => {
      const chunks = [];
      res.on("data", (chunk) => chunks.push(chunk));
      res.on("end", () => {
        const text = Buffer.concat(chunks).toString("utf8");
        let json = null;
        try {
          json = JSON.parse(text);
        } catch (error) {
          json = null;
        }
        resolve({ status: res.statusCode, json, text });
      });
    });
    req.on("error", reject);
    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function testHttpAgainstTempManifest() {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), "apps-api-"));
  const packages = path.join(temp, "packages");
  fs.mkdirSync(path.join(packages, "android", "demo"), { recursive: true });
  fs.writeFileSync(path.join(packages, "manifest.json"), JSON.stringify(fixture, null, 2));
  api.setPackagesDir(packages);
  const previousWrite = process.env.APPS_API_WRITE;
  delete process.env.APPS_API_WRITE;

  const server = http.createServer((req, res) => api(req, res));
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address();
  try {
    const list = await request(port, "GET", "/api/apps");
    assert.strictEqual(list.status, 200);
    assert.strictEqual(list.json.count, 1);

    const unknown = await request(port, "GET", "/api/apps?platform=foo");
    assert.strictEqual(unknown.status, 200);
    assert.strictEqual(unknown.json.count, 0);

    const missing = await request(port, "GET", "/api/apps?id=android%2Fmissing");
    assert.strictEqual(missing.status, 404);

    const denied = await request(port, "POST", "/api/apps", {
      id: "android/demo",
      name: "Demo",
    });
    assert.strictEqual(denied.status, 403);

    process.env.APPS_API_WRITE = "1";
    const noName = await request(port, "POST", "/api/apps", { id: "android/demo" });
    assert.strictEqual(noName.status, 400);

    const ghost = await request(port, "POST", "/api/apps", {
      id: "android/ghost",
      name: "Ghost",
    });
    assert.strictEqual(ghost.status, 404);

    const patched = await request(port, "PATCH", "/api/apps?id=android%2Fdemo", {
      betaqr: { short: "demo2" },
    });
    assert.strictEqual(patched.status, 200);
    assert.deepStrictEqual(patched.json.app.betaqr, {
      id: "AbC",
      short: "demo2",
      tokenRef: "wk-default",
      enabled: true,
    });
    assert.deepStrictEqual(patched.json.app.latest, { version: "1" });

    const replaced = await request(port, "PUT", "/api/apps?id=android%2Fdemo", {
      name: "Demo Replaced",
    });
    assert.strictEqual(replaced.status, 200);
    assert.strictEqual(replaced.json.app.name, "Demo Replaced");
    assert.strictEqual(replaced.json.app.readme, "keep me");
    assert.deepStrictEqual(replaced.json.app.versions, [{ version: "1" }]);

    const removed = await request(port, "DELETE", "/api/apps?id=android%2Fdemo");
    assert.strictEqual(removed.status, 200);
    const after = JSON.parse(fs.readFileSync(path.join(packages, "manifest.json"), "utf8"));
    assert.strictEqual(after.apps.length, 0);
    assert.ok(!fs.existsSync(path.join(packages, "manifest.json.lock")));
  } finally {
    server.close();
    if (previousWrite === undefined) {
      delete process.env.APPS_API_WRITE;
    } else {
      process.env.APPS_API_WRITE = previousWrite;
    }
    fs.rmSync(temp, { recursive: true, force: true });
  }
}

async function testOpenApiIsStatic() {
  const serverPath = path.join(root, "scripts", "video-resolver-server.cjs");
  const port = 18024 + Math.floor(Math.random() * 1000);
  const child = require("child_process").spawn(process.execPath, [serverPath, String(port)], {
    cwd: root,
    env: { ...process.env, HOST: "127.0.0.1", PORT: String(port) },
    stdio: "ignore",
  });
  try {
    let ready = false;
    for (let i = 0; i < 30; i += 1) {
      try {
        await request(port, "GET", "/api/apps/openapi.json");
        ready = true;
        break;
      } catch (error) {
        await new Promise((resolve) => setTimeout(resolve, 50));
      }
    }
    assert.ok(ready, "preview server did not start");
    const spec = await request(port, "GET", "/api/apps/openapi.json");
    const apps = await request(port, "GET", "/api/apps");
    assert.strictEqual(spec.status, 200);
    assert.strictEqual(spec.json.openapi, "3.0.3");
    assert.ok(!spec.json.apps);
    assert.strictEqual(apps.status, 200);
    assert.ok(Array.isArray(apps.json.apps));
    assert.ok(!apps.json.openapi);
  } finally {
    child.kill("SIGTERM");
  }
}

async function main() {
  testApplyKeepsGeneratedFieldsAndMergesBetaqr();
  testPutDoesNotDropGeneratedFields();
  testValidation();
  testUnknownPlatformDoesNotMatchAll();
  testStaleLockCanBeTakenOver();
  testGeneratorPreservesApiFields();
  testRouteDoesNotCaptureOpenApi();
  testGitignoreCoversTokenFile();
  await testHttpAgainstTempManifest();
  await testOpenApiIsStatic();
  console.log("apps api checks passed");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
