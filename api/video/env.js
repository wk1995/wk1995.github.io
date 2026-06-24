const fs = require("fs");
const path = require("path");

const CONFIG_PATH = path.resolve(process.cwd(), ".video-resolver-env.json");
const COMMAND = "node scripts/video-resolver-server.cjs";

function setCorsHeaders(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

function sendJson(res, statusCode, payload) {
  res.statusCode = statusCode;
  setCorsHeaders(res);
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(payload));
}

function getRoute(req) {
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  const parts = url.pathname.split("/").filter(Boolean);
  return {
    action: parts[3] || "status",
    platform: url.searchParams.get("platform") || "video",
  };
}

function getResolverHealth() {
  const checks = [];
  const douyinPath = path.resolve(process.cwd(), "api/douyin/resolve.js");
  const wechatPath = path.resolve(process.cwd(), "api/wechat/resolve.js");

  checks.push({
    id: "node",
    ok: Boolean(process.versions && process.versions.node),
    detail: process.version,
  });
  checks.push({
    id: "douyin",
    ok: fs.existsSync(douyinPath),
    detail: "api/douyin/resolve.js",
  });
  checks.push({
    id: "wechat",
    ok: fs.existsSync(wechatPath),
    detail: "api/wechat/resolve.js",
  });

  return checks;
}

function readConfig() {
  try {
    return JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8"));
  } catch (error) {
    return null;
  }
}

function writeConfig(platform) {
  const config = {
    configured: true,
    platform,
    node: process.version,
    updated_at: new Date().toISOString(),
  };
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), "utf8");
  return config;
}

function removeConfig() {
  if (fs.existsSync(CONFIG_PATH)) {
    fs.unlinkSync(CONFIG_PATH);
  }
}

function statusPayload(platform) {
  const checks = getResolverHealth();
  const config = readConfig();
  const ready = Boolean(config && config.configured && checks.every((check) => check.ok));

  return {
    status: "success",
    ready,
    platform,
    command: COMMAND,
    configured: Boolean(config && config.configured),
    node: process.version,
    checks,
    message: ready ? "Node 解析环境已就绪" : "Node 解析环境未配置",
  };
}

module.exports = async function handler(req, res) {
  try {
    if (req.method === "OPTIONS") {
      setCorsHeaders(res);
      res.statusCode = 204;
      res.end();
      return;
    }

    const route = getRoute(req);

    if (route.action === "status") {
      if (req.method !== "GET") {
        sendJson(res, 405, {
          status: "error",
          error: "Method Not Allowed",
        });
        return;
      }
      sendJson(res, 200, statusPayload(route.platform));
      return;
    }

    if (req.method !== "POST") {
      sendJson(res, 405, {
        status: "error",
        error: "Method Not Allowed",
      });
      return;
    }

    if (route.action === "setup") {
      const checks = getResolverHealth();
      const failed = checks.filter((check) => !check.ok);
      if (failed.length) {
        sendJson(res, 500, {
          status: "error",
          error: `解析接口缺失：${failed.map((check) => check.id).join(", ")}`,
          command: COMMAND,
          checks,
        });
        return;
      }

      writeConfig(route.platform);
      sendJson(res, 200, statusPayload(route.platform));
      return;
    }

    if (route.action === "cleanup") {
      removeConfig();
      sendJson(res, 200, {
        ...statusPayload(route.platform),
        ready: false,
        configured: false,
        message: "Node 解析环境配置已清除",
      });
      return;
    }

    sendJson(res, 404, {
      status: "error",
      error: "Not Found",
      command: COMMAND,
    });
  } catch (error) {
    sendJson(res, 500, {
      status: "error",
      error: error && error.message ? error.message : "解析环境操作失败",
      command: COMMAND,
    });
  }
};
