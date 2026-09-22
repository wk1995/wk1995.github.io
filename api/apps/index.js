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
 *   POST /api/apps                 更新已有 App，body 需含 id + name；不存在返回 404
 *   PUT  /api/apps?id=<id>         替换可写字段，保留生成字段（不存在返回 404）
 *   PATCH /api/apps?id=<id>        局部合并；betaqr 按字段浅合并
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

const DEFAULT_PACKAGES_DIR = path.resolve(__dirname, "..", "..", "apps", "packages");
let PACKAGES_DIR = process.env.APPS_PACKAGES_DIR
  ? path.resolve(process.env.APPS_PACKAGES_DIR)
  : DEFAULT_PACKAGES_DIR;
let MANIFEST_PATH = path.join(PACKAGES_DIR, "manifest.json");
const WRITE_ENV = "APPS_API_WRITE";
const MAX_BODY_BYTES = 64 * 1024;
const PLATFORMS = ["android", "ios", "harmony", "windows", "macos", "linux", "web", "other"];
const APP_ID_RE = /^[A-Za-z0-9._-]+\/[A-Za-z0-9._-]+$/;
const BETAQR_SHORT_RE = /^[A-Za-z0-9_-]+$/;
const WRITABLE_KEYS = ["name", "platformId", "description", "betaqr"];
const GENERATED_KEYS = ["slug", "platform", "readme", "readmeFile", "latest", "versions", "hasHistory"];

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
  const payload = JSON.stringify(manifest, null, 2) + "\n";
  const dir = path.dirname(MANIFEST_PATH);
  const tmpPath = path.join(dir, `.manifest.${process.pid}.${Date.now()}.tmp`);
  const lockPath = MANIFEST_PATH + ".lock";
  let lockFd;
  try {
    lockFd = fs.openSync(lockPath, "wx");
  } catch (error) {
    if (error && error.code === "EEXIST") {
      throw new Error("清单正在被其他写入占用，请稍后重试");
    }
    throw error;
  }
  try {
    fs.writeFileSync(tmpPath, payload, "utf8");
    fs.renameSync(tmpPath, MANIFEST_PATH);
  } catch (error) {
    try {
      fs.unlinkSync(tmpPath);
    } catch (cleanupError) {
      // 临时文件可能尚未创建。
    }
    throw error;
  } finally {
    fs.closeSync(lockFd);
    try {
      fs.unlinkSync(lockPath);
    } catch (cleanupError) {
      // 锁文件由本次写入负责清理。
    }
  }
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

function packageDirForId(id) {
  const parts = String(id || "").split("/");
  if (parts.length !== 2) {
    return "";
  }
  const platform = normalizePlatform(parts[0]);
  const slug = parts[1];
  if (!platform || !slug || slug.indexOf("..") !== -1) {
    return "";
  }
  return path.join(PACKAGES_DIR, platform, slug);
}

function hasPackageDirectory(id) {
  const dir = packageDirForId(id);
  if (!dir) {
    return false;
  }
  try {
    return fs.statSync(dir).isDirectory();
  } catch (error) {
    return false;
  }
}

function validateWritableKeys(body) {
  const unknown = Object.keys(body).filter((key) => key !== "id" && WRITABLE_KEYS.indexOf(key) === -1);
  if (unknown.length) {
    return "包含不可写字段：" + unknown.join(", ") + "。可写字段：" + WRITABLE_KEYS.join(", ");
  }
  return "";
}

function validateAppInput(body, { requireId, requireName }) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return "请求体必须是 JSON 对象";
  }
  if (requireId && !body.id) {
    return "缺少必填字段 id";
  }
  const id = typeof body.id === "string" ? body.id.trim() : "";
  if (body.id !== undefined && (typeof body.id !== "string" || !APP_ID_RE.test(id))) {
    return "id 格式应为 platform/slug，例如 android/demo-app";
  }
  if (requireName && (typeof body.name !== "string" || !body.name.trim())) {
    return "缺少必填字段 name";
  }
  if (typeof body.name !== "undefined" && (typeof body.name !== "string" || !body.name.trim())) {
    return "name 必须是非空字符串";
  }
  if (typeof body.description !== "undefined" && typeof body.description !== "string") {
    return "description 必须是字符串";
  }
  if (body.platformId !== undefined && body.platformId !== "" && !normalizePlatform(body.platformId)) {
    return "platformId 必须是已知平台：" + PLATFORMS.join(", ");
  }
  if (body.betaqr !== undefined && body.betaqr !== null) {
    const betaqrError = validateBetaqr(body.betaqr);
    if (betaqrError) {
      return betaqrError;
    }
  }
  return validateWritableKeys(body);
}

function normalizeBetaqr(input) {
  const next = {};
  if (typeof input.id === "string") next.id = input.id.trim();
  if (typeof input.short === "string") next.short = input.short.trim();
  if (typeof input.tokenRef === "string") next.tokenRef = input.tokenRef.trim();
  if (typeof input.enabled === "boolean") next.enabled = input.enabled;
  return next;
}

function applyBetaqr(current, incoming) {
  if (incoming === null) return null;
  const base = current && typeof current === "object" ? current : {};
  return normalizeBetaqr(Object.assign({}, base, incoming));
}

function applyAppFields(target, source) {
  const result = Object.assign({}, target);
  if (!result.id && typeof source.id === "string") result.id = source.id.trim();
  if (Object.prototype.hasOwnProperty.call(source, "name") && typeof source.name === "string") {
    result.name = source.name.trim();
  }
  if (Object.prototype.hasOwnProperty.call(source, "description") && typeof source.description === "string") {
    result.description = source.description.trim();
  }
  const platformId = normalizePlatform(source.platformId);
  if (platformId) result.platformId = platformId;
  if (Object.prototype.hasOwnProperty.call(source, "betaqr")) {
    const merged = applyBetaqr(result.betaqr, source.betaqr);
    if (merged === null) delete result.betaqr;
    else result.betaqr = merged;
  }
  if (!result.platformId && result.id) {
    result.platformId = normalizePlatform(result.id.split("/")[0]) || "other";
  }
  if (!result.platform && result.platformId) result.platform = result.platformId;
  if (!result.slug && result.id) result.slug = result.id.split("/").pop();
  GENERATED_KEYS.forEach((key) => {
    if (target[key] !== undefined) result[key] = target[key];
  });
  result.updatedAt = todayStr();
  return result;
}

async function readJsonBody(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BODY_BYTES) {
      throw new Error("请求体超过 64KB");
    }
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
    if (!platformId || app.platformId !== platformId) {
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

    // ---------- 更新已有条目 ----------
    if (req.method === "POST") {
      if (!requireWriteEnabled(res)) {
        return;
      }
      const validationError = validateAppInput(body, { requireId: true, requireName: true });
      if (validationError) {
        sendJson(res, 400, { status: "error", error: validationError });
        return;
      }
      const manifest = readManifest();
      const existing = findApp(manifest.apps, body.id.trim());
      if (!existing) {
        sendJson(res, 404, {
          status: "error",
          error: `未找到 id 为 ${body.id.trim()} 的 App。清单条目由安装包目录生成，接口不能凭空创建。`,
        });
        return;
      }
      if (!hasPackageDirectory(existing.id)) {
        sendJson(res, 400, {
          status: "error",
          error: `id 为 ${existing.id} 的安装包目录不存在，拒绝写入。`,
        });
        return;
      }
      const index = manifest.apps.indexOf(existing);
      const app = applyAppFields(existing, body);
      manifest.apps[index] = app;
      manifest.updatedAt = todayStr();
      recomputePlatforms(manifest);
      writeManifest(manifest);
      sendJson(res, 200, {
        status: "success",
        action: "updated",
        app,
        updatedAt: manifest.updatedAt,
      });
      return;
    }

    // ---------- 替换可写字段，保留生成字段 ----------
    if (req.method === "PUT") {
      if (!requireWriteEnabled(res)) {
        return;
      }
      const id = query.id || (typeof body.id === "string" ? body.id.trim() : "");
      if (!id) {
        sendJson(res, 400, { status: "error", error: "PUT 需要 ?id= 参数或 body.id" });
        return;
      }
      const validationError = validateAppInput(Object.assign({}, body, { id }), { requireId: true, requireName: true });
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
      if (!hasPackageDirectory(existing.id)) {
        sendJson(res, 400, {
          status: "error",
          error: `id 为 ${existing.id} 的安装包目录不存在，拒绝写入。`,
        });
        return;
      }
      const index = manifest.apps.indexOf(existing);
      const next = applyAppFields(existing, Object.assign({}, body, { id }));
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
      const patchValidation = validateAppInput(body, { requireId: false, requireName: false });
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
      if (!hasPackageDirectory(existing.id)) {
        sendJson(res, 400, {
          status: "error",
          error: `id 为 ${existing.id} 的安装包目录不存在，拒绝写入。`,
        });
        return;
      }
      const index = manifest.apps.indexOf(existing);
      const next = applyAppFields(existing, Object.assign({}, body, { id }));
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

function setPackagesDir(dir) {
  PACKAGES_DIR = path.resolve(dir);
  MANIFEST_PATH = path.join(PACKAGES_DIR, "manifest.json");
}

module.exports.readManifest = readManifest;
module.exports.writeManifest = writeManifest;
module.exports.setPackagesDir = setPackagesDir;
module.exports.validateAppInput = validateAppInput;
module.exports.validateBetaqr = validateBetaqr;
module.exports.applyAppFields = applyAppFields;
module.exports.appMatchesQuery = appMatchesQuery;
module.exports.hasPackageDirectory = hasPackageDirectory;
