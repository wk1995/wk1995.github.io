"use strict";

const http = require("http");
const fs = require("fs");
const path = require("path");
const os = require("os");
const { spawnSync } = require("child_process");

const args = parseArgs(process.argv.slice(2));
const WEB_PORT = Number(args["web-port"] || 18080);
const ANDROID_PORT = Number(args["android-port"] || 8081);
const WEB_DIR = path.resolve(__dirname, "../web");
const FORCE = Boolean(args.force);
const ANDROID_PACKAGE = args.package || "com.wk1995.usbandroidcamera";
const ANDROID_ACTIVITY = args.activity || ".MainActivity";
const bridgeState = {
  adb: null,
  deviceSerial: null,
};

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});

async function main() {
  const system = detectSystem();
  if (!system.isWindows10 && !FORCE) {
    throw new Error(
      `Windows 10 is required for this MVP bridge. Detected: ${system.caption || os.type() + " " + os.release()}. ` +
        "Use --force only for development."
    );
  }

  const adb = findAdb();
  if (!adb) {
    throw new Error("ADB not found. Install Android Platform Tools and add adb.exe to PATH.");
  }

  const device = getConnectedDevice(adb);
  if (!device) {
    throw new Error("No authorized USB Android device found. Run `adb devices -l` and authorize USB debugging on the phone.");
  }

  const sdk = getAndroidSdk(adb, device.serial);
  if (sdk && sdk < 29) {
    throw new Error(`Android 10+ required. Device SDK is ${sdk}.`);
  }

  bridgeState.adb = adb;
  bridgeState.deviceSerial = device.serial;

  runAdb(adb, ["-s", device.serial, "forward", `tcp:${ANDROID_PORT}`, `tcp:${ANDROID_PORT}`]);
  console.log(`[ok] Windows system: ${system.caption || os.release()}`);
  console.log(`[ok] Android device: ${device.serial}${sdk ? `, SDK ${sdk}` : ""}`);
  console.log(`[ok] ADB forward: tcp:${ANDROID_PORT} -> tcp:${ANDROID_PORT}`);

  const server = http.createServer((req, res) => route(req, res));
  server.on("clientError", (_err, socket) => {
    socket.end("HTTP/1.1 400 Bad Request\r\n\r\n");
  });
  server.listen(WEB_PORT, "127.0.0.1", () => {
    console.log(`[ok] Web UI: http://127.0.0.1:${WEB_PORT}/`);
    console.log(`[ok] MJPEG: http://127.0.0.1:${WEB_PORT}/camera`);
  });
}

function route(req, res) {
  setCors(res);

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url, `http://127.0.0.1:${WEB_PORT}`);

  if (url.pathname === "/camera") {
    proxyStream(req, res, "/stream");
    return;
  }

  if (url.pathname === "/snapshot") {
    proxyStream(req, res, "/snapshot");
    return;
  }

  if (url.pathname === "/android-health") {
    proxyJson(req, res, "/health");
    return;
  }

  if (url.pathname === "/switch") {
    proxyJson(req, res, "/switch", "POST");
    return;
  }

  if (url.pathname === "/launch-app") {
    launchAndroidApp(req, res);
    return;
  }

  if (url.pathname === "/health") {
    writeJsonResponse(res, 200, {
      ok: true,
      bridge: true,
      androidPort: ANDROID_PORT,
      packageName: ANDROID_PACKAGE,
      activityName: ANDROID_ACTIVITY,
      deviceSerial: bridgeState.deviceSerial,
    });
    return;
  }

  serveStatic(req, res, url.pathname);
}

function proxyStream(_req, res, targetPath) {
  const options = {
    hostname: "127.0.0.1",
    port: ANDROID_PORT,
    path: targetPath,
    method: "GET",
  };

  const upstream = http.request(options, (upstreamRes) => {
    const headers = {
      ...upstreamRes.headers,
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
    };
    res.writeHead(upstreamRes.statusCode || 200, headers);
    upstreamRes.pipe(res);
  });

  upstream.on("error", (error) => {
    if (!res.headersSent) {
      res.writeHead(502, { "Content-Type": "application/json; charset=utf-8" });
    }
    res.end(JSON.stringify({
      ok: false,
      error: "android_stream_unavailable",
      detail: error.message,
      hint: "Start the Android app stream, then run adb forward tcp:8081 tcp:8081.",
    }));
  });

  res.on("close", () => upstream.destroy());
  upstream.end();
}

function proxyJson(_req, res, targetPath, method = "GET") {
  const upstream = http.request(
    {
      hostname: "127.0.0.1",
      port: ANDROID_PORT,
      path: targetPath,
      method,
    },
    (upstreamRes) => {
      let body = "";
      upstreamRes.setEncoding("utf8");
      upstreamRes.on("data", (chunk) => {
        body += chunk;
      });
      upstreamRes.on("end", () => {
        res.writeHead(upstreamRes.statusCode || 200, { "Content-Type": "application/json; charset=utf-8" });
        res.end(body || "{}");
      });
    }
  );

  upstream.on("error", (error) => {
    res.writeHead(502, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({ ok: false, error: error.message }));
  });

  upstream.end();
}

function launchAndroidApp(req, res) {
  if (req.method !== "POST" && req.method !== "GET") {
    writeJsonResponse(res, 405, { ok: false, error: "method_not_allowed" });
    return;
  }

  if (!bridgeState.adb || !bridgeState.deviceSerial) {
    writeJsonResponse(res, 500, { ok: false, error: "adb_not_ready" });
    return;
  }

  const component = `${ANDROID_PACKAGE}/${ANDROID_ACTIVITY}`;
  const result = run(bridgeState.adb, [
    "-s",
    bridgeState.deviceSerial,
    "shell",
    "am",
    "start",
    "-n",
    component,
    "--ez",
    "autoStart",
    "true",
  ], false);

  if (!result.ok) {
    writeJsonResponse(res, 500, {
      ok: false,
      error: "launch_failed",
      detail: result.stderr || result.stdout,
      hint: `Install ${ANDROID_PACKAGE} on the connected Android device first.`,
    });
    return;
  }

  writeJsonResponse(res, 200, {
    ok: true,
    launched: true,
    component,
    stdout: result.stdout.trim(),
  });
}

function serveStatic(req, res, pathname) {
  let filePath = pathname === "/" ? "/index.html" : pathname;
  filePath = path.normalize(filePath).replace(/^(\.\.[/\\])+/, "");
  const absolutePath = path.join(WEB_DIR, filePath);

  if (!absolutePath.startsWith(WEB_DIR)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  fs.readFile(absolutePath, (error, content) => {
    if (error) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Not found");
      return;
    }

    res.writeHead(200, {
      "Content-Type": getContentType(absolutePath),
      "Cache-Control": "no-store",
    });
    res.end(content);
  });
}

function writeJsonResponse(res, status, payload) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(payload));
}

function setCors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

function getContentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "application/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".svg": "image/svg+xml",
  }[ext] || "application/octet-stream";
}

function parseArgs(values) {
  const parsed = {};
  for (const value of values) {
    if (!value.startsWith("--")) continue;
    const [key, rawValue] = value.slice(2).split("=");
    parsed[key] = rawValue === undefined ? true : rawValue;
  }
  return parsed;
}

function detectSystem() {
  const captionResult = spawnSync(
    "powershell.exe",
    ["-NoProfile", "-Command", "(Get-CimInstance Win32_OperatingSystem).Caption"],
    { encoding: "utf8" }
  );
  const caption = (captionResult.stdout || "").trim();
  return {
    caption,
    isWindows10: os.platform() === "win32" && /Windows 10/i.test(caption),
  };
}

function findAdb() {
  const direct = run("adb", ["version"], false);
  if (direct.ok) return "adb";

  const candidates = [
    process.env.ANDROID_HOME && path.join(process.env.ANDROID_HOME, "platform-tools", "adb.exe"),
    process.env.ANDROID_SDK_ROOT && path.join(process.env.ANDROID_SDK_ROOT, "platform-tools", "adb.exe"),
    path.join(os.homedir(), "AppData", "Local", "Android", "Sdk", "platform-tools", "adb.exe"),
  ].filter(Boolean);

  for (const candidate of candidates) {
    if (fs.existsSync(candidate) && run(candidate, ["version"], false).ok) {
      return candidate;
    }
  }

  return null;
}

function getConnectedDevice(adb) {
  const result = runAdb(adb, ["devices", "-l"]);
  const lines = result.stdout.split(/\r?\n/).slice(1);
  const devices = lines
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const parts = line.split(/\s+/);
      return {
        serial: parts[0],
        state: parts[1],
        detail: parts.slice(2).join(" "),
      };
    })
    .filter((device) => device.serial && device.state);

  const unauthorized = devices.find((device) => device.state === "unauthorized");
  if (unauthorized) {
    throw new Error(`Device ${unauthorized.serial} is unauthorized. Accept the USB debugging prompt on the phone.`);
  }

  const authorizedDevices = devices.filter((device) => device.state === "device");
  const usbDevice = authorizedDevices.find((device) => isLikelyUsbDevice(device));
  if (!usbDevice && authorizedDevices.length && !FORCE) {
    throw new Error(
      "ADB device exists, but it does not look like a USB device. Disable Wi-Fi ADB or run with --force for development."
    );
  }

  return usbDevice || authorizedDevices[0] || null;
}

function isLikelyUsbDevice(device) {
  if (/usb:/i.test(device.detail)) return true;
  if (/^\d+\.\d+\.\d+\.\d+:\d+$/.test(device.serial)) return false;
  if (/^emulator-\d+$/.test(device.serial)) return false;
  return true;
}

function getAndroidSdk(adb, serial) {
  const result = runAdb(adb, ["-s", serial, "shell", "getprop", "ro.build.version.sdk"]);
  const sdk = Number((result.stdout || "").trim());
  return Number.isFinite(sdk) ? sdk : null;
}

function runAdb(adb, adbArgs) {
  const result = run(adb, adbArgs, true);
  if (!result.ok) {
    throw new Error(`ADB failed: ${adb} ${adbArgs.join(" ")}\n${result.stderr || result.stdout}`);
  }
  return result;
}

function run(command, commandArgs, throwOnMissing) {
  const result = spawnSync(command, commandArgs, { encoding: "utf8" });
  if (result.error) {
    if (throwOnMissing) throw result.error;
    return { ok: false, stdout: "", stderr: result.error.message };
  }
  return {
    ok: result.status === 0,
    stdout: result.stdout || "",
    stderr: result.stderr || "",
  };
}
