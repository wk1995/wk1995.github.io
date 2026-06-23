const http = require("http");
const fs = require("fs");
const path = require("path");
const { exec } = require("child_process");

const douyinHandler = require("../api/douyin/resolve.js");

const root = path.resolve(__dirname, "..");
const preferredPort = Number(process.env.PORT || process.argv[2] || 8010);

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
};

function send(res, statusCode, body, contentType = "text/plain; charset=utf-8") {
  res.statusCode = statusCode;
  res.setHeader("Content-Type", contentType);
  res.end(body);
}

function staticFilePath(urlPathname) {
  let pathname = decodeURIComponent(urlPathname);
  if (pathname.endsWith("/")) {
    pathname += "index.html";
  }

  const filePath = path.resolve(root, `.${pathname.replace(/^\/+/, "/")}`);
  return filePath.startsWith(root) ? filePath : "";
}

function serveStatic(req, res, url) {
  const filePath = staticFilePath(url.pathname);
  if (!filePath) {
    send(res, 403, "Forbidden");
    return;
  }

  fs.stat(filePath, (error, stat) => {
    if (error || !stat.isFile()) {
      send(res, 404, "Not Found");
      return;
    }

    res.statusCode = 200;
    res.setHeader("Content-Type", mimeTypes[path.extname(filePath).toLowerCase()] || "application/octet-stream");
    fs.createReadStream(filePath).pipe(res);
  });
}

function createServer() {
  return http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url, "http://127.0.0.1");
      if (url.pathname === "/api/douyin/resolve") {
        await douyinHandler(req, res);
        return;
      }

      serveStatic(req, res, url);
    } catch (error) {
      send(res, 500, error && error.stack ? error.stack : String(error));
    }
  });
}

function openBrowser(url) {
  if (process.env.OPEN_BROWSER === "0") {
    return;
  }

  const escaped = url.replace(/"/g, "");
  if (process.platform === "win32") {
    exec(`start "" "${escaped}"`);
  } else if (process.platform === "darwin") {
    exec(`open "${escaped}"`);
  } else {
    exec(`xdg-open "${escaped}"`);
  }
}

function listen(port) {
  const server = createServer();

  server.on("error", (error) => {
    if (error && error.code === "EADDRINUSE" && port < preferredPort + 20) {
      listen(port + 1);
      return;
    }

    console.error(error && error.stack ? error.stack : error);
    process.exitCode = 1;
  });

  server.listen(port, "127.0.0.1", () => {
    const url = `http://127.0.0.1:${port}/video/`;
    console.log("");
    console.log("WK1995 video preview is running.");
    console.log("Douyin resolver handler: /api/douyin/resolve");
    console.log(`Open: ${url}`);
    console.log("");
    openBrowser(url);
  });
}

listen(preferredPort);
