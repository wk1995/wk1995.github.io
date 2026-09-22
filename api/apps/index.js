/**
 * App 列表接口：查询与更新
 *
 * 数据源：apps/packages/manifest.json
 * 约定：与其他 api/* 处理器一致，导出 `async function handler(req, res)`，
 *       并自带 CORS 头。由 scripts/video-resolver-server.cjs 的 apiRoutes 分发。
 *
 * 路由（前缀 /api/apps）：
 *   GET  /api/apps                列出全部 App，支持过滤：
 *                                   ?platform=android      按平台过滤（platformId）
 *                                   ?q=body                关键字，匹配 name/id/platform/description/version
 *                                   ?id=android/xxx        精确取某一条（URL 编码）
 *   GET  /api/apps?id=<id>         取单条 App 信息（404 若不存在）
 *   POST /api/apps                 新增或更新（upsert）一条 App，body 需含 id + name
 *   PUT  /api/apps?id=<id>         整体替换某条 App（不存在返回 404）
 *   PATCH /api/apps?id=<id>        局部合并更新某条 App 的字段
 *   DELETE /api/apps?id=<id>       删除某条 App
 *
 * 写保护：所有写操作（POST/PUT/PATCH/DELETE）需要环境变量
 *   APPS_API_WRITE=1 才允许，否则返回 403。避免误写生产清单。
 *
 * 写操作后自动：
 *   - 重新计算 platforms 分组
 *   - 将 manifest.updatedAt 刷新为今天（本地时区）
 *
 * 分发渠道（betaqr，可选）：每条 App 可携带 `betaqr` 块记录其在
 *   betaqr.com.cn 的分发信息（id / short / tokenRef / enabled）。
 *   注意：betaqr 的 api_token 属于密钥，绝不放进 manifest.json，
 *   统一存放在服务端配置（如 .betaqr-env.json），由后续代理接口按
 *   tokenRef / id 解析。本接口只负责数据模型，不发任何线上请求。
 */

const fs = require("fs");
const path = require("path");

const MANIFEST_PATH = path.resolve(__dirname, "..", "..", "apps", "packages", "manifest.json");
const WRITE_ENV = "APPS_API_WRITE";
const PLATFORMS = ["android", "ios", "harmony", "windows", "macos", "linux", "web", "other"];
const APP_ID_RE = /^[A-Za-z0-9._-]+\/[A-Za-z0-9._-]+$/;
const BETAQR_SHORT_RE = /^[A-Za-z0-9_-]+$/;

function setCorsHeaders(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

function sendJson(res, statusCode, payload) {
  res.statusCode = statusCode;
  setCorsHeaders(res);
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(payload));
}

function readManifest() {
  try {
    const raw = fs.readFileSync(MANIFEST_PATH, "utf8");
    const data = JSON.parse(raw);
    if (!data || typeof data !== "object") {
      return { apps: [], platforms: {} };
    }
    if (!Array.isArray(data.apps)) {
      data.apps = [];
    }
    if (!data.platforms || typeof data.platforms !== "object") {
      data.platforms = {};
    }
    return data;
  } catch (error) {
    if (error && error.code === "ENOENT") {
      return { apps: [], platforms: {} };
    }
    throw error;
  }
}

function writeManifest(manifest) {
  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2) + "\n", "utf8");
}

function todayStr() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function normalizePlatform(value) {
  const raw = String(value || "").trim().toLowerCase();
  return PLATFORMS.indexOf(raw) !== -1 ? raw : "";
}

function recomputePlatforms(manifest) {
  const groups = {};
  PLATFORMS.forEach((platform) => {
    groups[platform] = [];
  });
  (manifest.apps || []).forEach((app) => {
    const platformId = normalizePlatform(app.platformId || app.platform) || "other";
    if (!groups[platformId]) {
      groups[platformId] = [];
    }
    if (groups[platformId].indexOf(app.id) === -1) {
      groups[platformId].push(app.id);
    }
  });
  manifest.platforms = groups;
}

function findApp(apps, id) {
  return apps.find((app) => app && app.id === id) || null;
}

/**
 * 校验可选的 betaqr 分发渠道块。
 * 允许字段：id / short / tokenRef / enabled。
 * api_token 属于密钥，不在此处，也不进 manifest —— 由服务端配置按 tokenRef 解析。
 */
function validateBetaqr(input) {
  if (!input || typeof input !== "object") {
    return "betaqr 必须是对象";
  }
  const allowed = ["id", "short", "tokenRef", "enabled"];
  const unknown = Object.keys(input).filter((key) => allowed.indexOf(key) === -1);
  if (unknown.length) {
    return "betaqr 包含未知字段：" + unknown.join(", ");
  }
  if (input.id !== undefined) {
    if (typeof input.id !== "string" || !input.id.trim()) {
      return "betaqr.id 必须是非空字符串";
    }
  }
  if (input.short !== undefined) {
    if (typeof input.short !== "string" || !BETAQR_SHORT_RE.test(input.short.trim())) {
      return "betaqr.short 只能是字母、数字、下划线和连字符";
    }
  }
  if (input.tokenRef !== undefined) {
    if (typeof input.tokenRef !== "string" || !input.tokenRef.trim()) {
      return "betaqr.tokenRef 必须是非空字符串（指向服务端密钥配置的逻辑键）";
    }
  }
  if (input.enabled !== undefined && typeof input.enabled !== "boolean") {
    return "betaqr.enabled 必须是布尔值";
  }
  return "";
}

function validateAppInput(body, { requireId }) {
  if (!body || typeof body !== "object") {
    return "请求体必须是 JSON 对象";
  }
  if (requireId && !body.id) {
    return "缺少必填字段 id";
  }
  const id = typeof body.id === "string" ? body.id.trim() : "";
  if (id && !APP_ID_RE.test(id)) {
    return "id 格式应为 platform/slug，例如 android/demo-app";
  }
  if (typeof body.name !== "undefined") {
    if (typeof body.name !== "string" || !body.name.trim()) {
      return "name 必须是非空字符串";
    }
  }
  const platform = normalizePlatform(body.platformId || body.platform);
  if (body.platformId !== undefined && body.platformId !== "" && !platform && body.platformId) {
    return "platformId 必须是已知平台：" + PLATFORMS.join(", ");
  }
  if (body.betaqr !== undefined && body.betaqr !== null) {
    const betaqrError = validateBetaqr(body.betaqr);
    if (betaqrError) {
      return betaqrError;
    }
  }
  return "";
}

/**
 * 将输入合并进一条 App，并补齐 platform/platformId 派生字段。
 */
function applyAppFields(target, source, { replace }) {
  const result = replace ? {} : Object.assign({}, target);
  Object.keys(source).forEach((key) => {
    if (key === "id") {
      return; // id 不可改
    }
    result[key] = source[key];
  });
  if (!result.id) {
    result.id = source.id;
  }
  const platformId = normalizePlatform(result.platformId || result.platform);
  if (platformId) {
    result.platformId = platformId;
    if (!result.platform) {
      result.platform = platformId.charAt(0).toUpperCase() + platformId.slice(1);
    }
  } else if (result.id) {
    const inferred = result.id.split("/")[0];
    const inferredPlatform = normalizePlatform(inferred) || "other";
    result.platformId = inferredPlatform;
    if (!result.platform) {
      result.platform = inferredPlatform.charAt(0).toUpperCase() + inferredPlatform.slice(1);
    }
  }
  if (!result.name) {
    result.name = result.id.split("/").pop() || result.id;
  }
  result.updatedAt = todayStr();
  return result;
}

async function readJsonBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }
  if (!chunks.length) {
    return {};
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch (error) {
    throw new Error("请求体不是合法 JSON");
  }
}

function parseQuery(req) {
  const url = new URL(req.url, "http://" + (req.headers.host || "localhost"));
  return {
    id: url.searchParams.get("id") || "",
    platform: url.searchParams.get("platform") || "",
    q: url.searchParams.get("q") || "",
  };
}

function appMatchesQuery(app, platform, q) {
  if (platform) {
    const platformId = normalizePlatform(platform);
    if (platformId && app.platformId !== platformId) {
      return false;
    }
  }
  if (q) {
    const needle = q.trim().toLowerCase();
    if (needle) {
      const haystack = [
        app.id,
        app.name,
        app.platform,
        app.platformId,
        app.description,
        app.version,
        (app.versions || []).map((v) => v.version).join(" "),
      ].join(" ").toLowerCase();
      if (haystack.indexOf(needle) === -1) {
        return false;
      }
    }
  }
  return true;
}

function requireWriteEnabled(res) {
  if (process.env[WRITE_ENV] !== "1") {
    sendJson(res, 403, {
      status: "error",
      error: `写操作被禁用。请在启动时设置环境变量 ${WRITE_ENV}=1 后再试。`,
      hint: `APPS_API_WRITE=1 node scripts/video-resolver-server.cjs`,
    });
    return false;
  }
  return true;
}

module.exports = async function handler(req, res) {
  try {
    if (req.method === "OPTIONS") {
      setCorsHeaders(res);
      res.statusCode = 204;
      res.end();
      return;
    }

    const query = parseQuery(req);

    // ---------- 查询 ----------
    if (req.method === "GET") {
      const manifest = readManifest();
      if (query.id) {
        const app = findApp(manifest.apps, query.id);
        if (!app) {
          sendJson(res, 404, { status: "error", error: `未找到 id 为 ${query.id} 的 App` });
          return;
        }
        sendJson(res, 200, {
          status: "success",
          app,
          manifestVersion: manifest.versionNumber || manifest.versionName || "",
          updatedAt: manifest.updatedAt || "",
        });
        return;
      }
      const apps = manifest.apps.filter((app) => appMatchesQuery(app, query.platform, query.q));
      sendJson(res, 200, {
        status: "success",
        total: manifest.apps.length,
        count: apps.length,
        platform: query.platform || "all",
        q: query.q || "",
        apps,
        manifestVersion: manifest.versionNumber || manifest.versionName || "",
        updatedAt: manifest.updatedAt || "",
      });
      return;
    }

    // ---------- 删除 ----------
    if (req.method === "DELETE") {
      if (!requireWriteEnabled(res)) {
        return;
      }
      const id = query.id;
      if (!id) {
        sendJson(res, 400, { status: "error", error: "DELETE 需要 ?id= 参数" });
        return;
      }
      const manifest = readManifest();
      const before = manifest.apps.length;
      manifest.apps = manifest.apps.filter((app) => app.id !== id);
      if (manifest.apps.length === before) {
        sendJson(res, 404, { status: "error", error: `未找到 id 为 ${id} 的 App` });
        return;
      }
      manifest.updatedAt = todayStr();
      recomputePlatforms(manifest);
      writeManifest(manifest);
      sendJson(res, 200, {
        status: "success",
        deleted: id,
        remaining: manifest.apps.length,
        updatedAt: manifest.updatedAt,
      });
      return;
    }

    // 其余写操作都需要读取请求体
    const body = await readJsonBody(req);

    // ---------- 新增 / 更新（upsert） ----------
    if (req.method === "POST") {
      if (!requireWriteEnabled(res)) {
        return;
      }
      const validationError = validateAppInput(body, { requireId: true });
      if (validationError) {
        sendJson(res, 400, { status: "error", error: validationError });
        return;
      }
      const manifest = readManifest();
      const existing = findApp(manifest.apps, body.id);
      let app;
      if (existing) {
        const index = manifest.apps.indexOf(existing);
        app = applyAppFields(existing, body, { replace: false });
        manifest.apps[index] = app;
      } else {
        app = applyAppFields({}, body, { replace: false });
        manifest.apps.push(app);
      }
      manifest.updatedAt = todayStr();
      recomputePlatforms(manifest);
      writeManifest(manifest);
      sendJson(res, 200, {
        status: "success",
        action: existing ? "updated" : "created",
        app,
        updatedAt: manifest.updatedAt,
      });
      return;
    }

    // ---------- 整体替换 ----------
    if (req.method === "PUT") {
      if (!requireWriteEnabled(res)) {
        return;
      }
      const id = query.id || (typeof body.id === "string" ? body.id.trim() : "");
      if (!id) {
        sendJson(res, 400, { status: "error", error: "PUT 需要 ?id= 参数或 body.id" });
        return;
      }
      const validationError = validateAppInput(Object.assign({}, body, { id }), { requireId: true });
      if (validationError) {
        sendJson(res, 400, { status: "error", error: validationError });
        return;
      }
      const manifest = readManifest();
      const existing = findApp(manifest.apps, id);
      if (!existing) {
        sendJson(res, 404, { status: "error", error: `未找到 id 为 ${id} 的 App` });
        return;
      }
      const index = manifest.apps.indexOf(existing);
      const next = applyAppFields({}, Object.assign({}, body, { id }), { replace: true });
      manifest.apps[index] = next;
      manifest.updatedAt = todayStr();
      recomputePlatforms(manifest);
      writeManifest(manifest);
      sendJson(res, 200, {
        status: "success",
        action: "replaced",
        app: next,
        updatedAt: manifest.updatedAt,
      });
      return;
    }

    // ---------- 局部合并 ----------
    if (req.method === "PATCH") {
      if (!requireWriteEnabled(res)) {
        return;
      }
      const id = query.id || (typeof body.id === "string" ? body.id.trim() : "");
      if (!id) {
        sendJson(res, 400, { status: "error", error: "PATCH 需要 ?id= 参数或 body.id" });
        return;
      }
      const patchValidation = validateAppInput(body, { requireId: false });
      if (patchValidation) {
        sendJson(res, 400, { status: "error", error: patchValidation });
        return;
      }
      const manifest = readManifest();
      const existing = findApp(manifest.apps, id);
      if (!existing) {
        sendJson(res, 404, { status: "error", error: `未找到 id 为 ${id} 的 App` });
        return;
      }
      const index = manifest.apps.indexOf(existing);
      const next = applyAppFields(existing, Object.assign({}, body, { id }), { replace: false });
      manifest.apps[index] = next;
      manifest.updatedAt = todayStr();
      recomputePlatforms(manifest);
      writeManifest(manifest);
      sendJson(res, 200, {
        status: "success",
        action: "patched",
        app: next,
        updatedAt: manifest.updatedAt,
      });
      return;
    }

    res.setHeader("Allow", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
    sendJson(res, 405, { status: "error", error: "Method Not Allowed" });
  } catch (error) {
    sendJson(res, 500, {
      status: "error",
      error: error && error.message ? error.message : "App 接口处理失败",
    });
  }
};

module.exports.readManifest = readManifest;
module.exports.writeManifest = writeManifest;
module.exports.validateAppInput = validateAppInput;
module.exports.validateBetaqr = validateBetaqr;
