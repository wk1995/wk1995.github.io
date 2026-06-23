const HEADERS = {
  "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) EdgiOS/121.0.2277.107 Version/17.0 Mobile/15E148 Safari/604.1",
  "Referer": "https://www.douyin.com/",
};

const URL_PATTERN = /https?:\/\/[^\s"'<>，。；、)）]+/i;

function sendJson(res, statusCode, payload) {
  res.statusCode = statusCode;
  setCorsHeaders(res);
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(payload));
}

function setCorsHeaders(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

function getRequestOrigin(req) {
  const host = req.headers["x-forwarded-host"] || req.headers.host;
  const proto = req.headers["x-forwarded-proto"]
    || (req.socket && req.socket.encrypted ? "https" : "http");
  return host ? `${proto}://${host}` : "";
}

function getFirstUrl(text) {
  const match = String(text || "").match(URL_PATTERN);
  return match ? match[0] : "";
}

function getVideoIdFromUrl(url) {
  const parsed = new URL(url);
  const parts = parsed.pathname.split("/").filter(Boolean);
  const videoIndex = parts.findIndex((part) => part === "video" || part === "note");

  if (videoIndex >= 0 && parts[videoIndex + 1]) {
    return parts[videoIndex + 1];
  }

  return parts[parts.length - 1] || "";
}

function sanitizeTitle(title, fallback) {
  const value = String(title || fallback || "douyin-video").trim();
  return value.replace(/[\\/:*?"<>|]/g, "_").slice(0, 120) || fallback || "douyin-video";
}

function pickVideoInfo(loaderData) {
  const preferredKeys = ["video_(id)/page", "note_(id)/page"];
  for (const key of preferredKeys) {
    if (loaderData && loaderData[key] && loaderData[key].videoInfoRes) {
      return loaderData[key].videoInfoRes;
    }
  }

  for (const value of Object.values(loaderData || {})) {
    if (value && value.videoInfoRes) {
      return value.videoInfoRes;
    }
  }

  return null;
}

async function resolveDouyinShare(shareText) {
  const inputUrl = getFirstUrl(shareText);
  if (!inputUrl) {
    throw new Error("未找到有效的抖音分享链接");
  }

  const shareResponse = await fetch(inputUrl, {
    headers: HEADERS,
    redirect: "follow",
  });
  if (!shareResponse.ok) {
    throw new Error(`抖音分享链接请求失败：${shareResponse.status}`);
  }

  const videoId = getVideoIdFromUrl(shareResponse.url);
  if (!videoId) {
    throw new Error("无法从抖音跳转链接中提取视频 ID");
  }

  const pageUrl = `https://www.iesdouyin.com/share/video/${videoId}`;
  const pageResponse = await fetch(pageUrl, {
    headers: HEADERS,
  });
  if (!pageResponse.ok) {
    throw new Error(`抖音视频页请求失败：${pageResponse.status}`);
  }

  const html = await pageResponse.text();
  const match = html.match(/window\._ROUTER_DATA\s*=\s*(.*?)<\/script>/s);
  if (!match || !match[1]) {
    throw new Error("从抖音 HTML 中解析视频信息失败");
  }

  const routerData = JSON.parse(match[1].trim());
  const videoInfo = pickVideoInfo(routerData.loaderData);
  const item = videoInfo && videoInfo.item_list && videoInfo.item_list[0];
  const playUrl = item && item.video && item.video.play_addr
    && item.video.play_addr.url_list
    && item.video.play_addr.url_list[0];

  if (!playUrl) {
    throw new Error("抖音页面没有返回可下载的视频地址");
  }

  const downloadUrl = playUrl.replace("playwm", "play");
  const title = sanitizeTitle(item.desc, `douyin_${videoId}`);

  return {
    video_id: videoId,
    title,
    download_url: downloadUrl,
  };
}

async function readJsonBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }

  if (!chunks.length) {
    return {};
  }

  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

async function proxyDownload(req, res) {
  const requestUrl = new URL(req.url, getRequestOrigin(req) || "http://localhost");
  const target = requestUrl.searchParams.get("url");
  const filename = sanitizeTitle(requestUrl.searchParams.get("filename"), "douyin-video") + ".mp4";

  if (!target || !/^https?:\/\//i.test(target)) {
    sendJson(res, 400, {
      status: "error",
      error: "缺少有效的视频下载地址",
    });
    return;
  }

  const upstream = await fetch(target, {
    headers: {
      ...HEADERS,
      "Accept": "*/*",
      "Accept-Encoding": "identity",
    },
    redirect: "follow",
  });

  if (!upstream.ok || !upstream.body) {
    sendJson(res, upstream.status || 502, {
      status: "error",
      error: `视频下载失败：${upstream.status}`,
    });
    return;
  }

  res.statusCode = 200;
  setCorsHeaders(res);
  res.setHeader("Content-Type", upstream.headers.get("content-type") || "video/mp4");
  res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(filename)}"`);
  res.setHeader("Cache-Control", "no-store");

  const contentLength = upstream.headers.get("content-length");
  if (contentLength) {
    res.setHeader("Content-Length", contentLength);
  }

  if (typeof upstream.body.pipe === "function") {
    upstream.body.pipe(res);
    return;
  }

  const reader = upstream.body.getReader();
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      res.write(Buffer.from(value));
    }
    res.end();
  } catch (error) {
    res.destroy(error);
  }
}

module.exports = async function handler(req, res) {
  try {
    if (req.method === "OPTIONS") {
      setCorsHeaders(res);
      res.statusCode = 204;
      res.end();
      return;
    }

    if (req.method === "GET") {
      await proxyDownload(req, res);
      return;
    }

    if (req.method !== "POST") {
      res.setHeader("Allow", "GET, POST");
      sendJson(res, 405, {
        status: "error",
        error: "Method Not Allowed",
      });
      return;
    }

    const body = await readJsonBody(req);
    const videoInfo = await resolveDouyinShare(body.shareText || body.share_link || body.url || "");
    const origin = getRequestOrigin(req);
    const proxyPath = `/api/douyin/resolve?url=${encodeURIComponent(videoInfo.download_url)}&filename=${encodeURIComponent(videoInfo.video_id)}`;

    sendJson(res, 200, {
      status: "success",
      ...videoInfo,
      proxy_url: origin ? `${origin}${proxyPath}` : proxyPath,
      description: `视频标题: ${videoInfo.title}`,
      usage_tip: "download_url 是抖音无水印直链；proxy_url 可用于同源下载和浏览器预览。",
    });
  } catch (error) {
    sendJson(res, 500, {
      status: "error",
      error: error && error.message ? error.message : "获取抖音无水印下载链接失败",
    });
  }
};

module.exports.resolveDouyinShare = resolveDouyinShare;
