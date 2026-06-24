#!/usr/bin/env node

const fs = require("fs");
const http = require("http");
const path = require("path");
const { URL } = require("url");

const root = path.resolve(__dirname, "..");
const port = Number(process.env.PORT || process.argv[2] || 8024);
const host = process.env.HOST || "127.0.0.1";

process.chdir(root);

const mime = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
};

function send(res, status, body, type) {
  res.statusCode = status;
  res.setHeader("Content-Type", type || "text/plain; charset=utf-8");
  res.end(body);
}

function routeApi(req, res) {
  const parsed = new URL(req.url, `http://${req.headers.host || `${host}:${port}`}`);
  const apiRoutes = [
    {
      prefix: "/api/wechat/resolve",
      file: "api/wechat/resolve.js",
    },
    {
      prefix: "/api/douyin/resolve",
      file: "api/douyin/resolve.js",
    },
    {
      prefix: "/api/video/env",
      file: "api/video/env.js",
    },
  ];

  const route = apiRoutes.find((candidate) => parsed.pathname.startsWith(candidate.prefix));
  if (!route) {
    return false;
  }

  const handlerPath = path.join(root, route.file);
  delete require.cache[require.resolve(handlerPath)];
  require(handlerPath)(req, res);
  return true;
}

function serveStatic(req, res) {
  const parsed = new URL(req.url, `http://${req.headers.host || `${host}:${port}`}`);
  let pathname = decodeURIComponent(parsed.pathname);
  if (pathname.endsWith("/")) {
    pathname += "index.html";
  }

  const filePath = path.resolve(root, `.${pathname}`);
  if (!filePath.startsWith(root)) {
    send(res, 403, "Forbidden");
    return;
  }

  fs.readFile(filePath, (error, content) => {
    if (error) {
      send(res, error.code === "ENOENT" ? 404 : 500, error.code === "ENOENT" ? "Not found" : error.message);
      return;
    }

    if (req.method === "HEAD") {
      res.statusCode = 200;
      res.setHeader("Content-Type", mime[path.extname(filePath).toLowerCase()] || "application/octet-stream");
      res.end();
      return;
    }

    send(res, 200, content, mime[path.extname(filePath).toLowerCase()] || "application/octet-stream");
  });
}

http.createServer((req, res) => {
  if (routeApi(req, res)) {
    return;
  }

  if (req.method !== "GET" && req.method !== "HEAD") {
    send(res, 405, "Method Not Allowed");
    return;
  }

  serveStatic(req, res);
}).listen(port, host, () => {
  console.log(`Video resolver preview: http://${host}:${port}/video/`);
  console.log("Use Ctrl+C to stop the server.");
});
