const HEADERS = {
  "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 MicroMessenger/8.0.47 Safari/604.1",
  "Referer": "https://mp.weixin.qq.com/",
  "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
};

const URL_PATTERN = /https?:\/\/[^\s"'<>，。；、)）]+/i;
const VIDEO_FILE_PATTERN = /\.(?:mp4|mov|m4v|webm|mkv|avi|ogv|ogg|3gp)(?:$|[?#])/i;
const VIDEO_HOST_PATTERN = /(?:^|\.)mpvideo\.qpic\.cn$|(?:^|\.)vweixinf\.tc\.qq\.com$|(?:^|\.)vv\.video\.qq\.com$|(?:^|\.)video\.qq\.com$/i;
const PLAYER_HOST_PATTERN = /(?:^|\.)mp\.weixin\.qq\.com$/i;
const FETCH_TIMEOUT_MS = 12000;
const MAX_IFRAMES = 16;
const MAX_CANDIDATES = 40;

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

function getRequestOrigin(req) {
  const host = req.headers["x-forwarded-host"] || req.headers.host;
  const isLocalHost = /^(localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/i.test(host || "");
  const proto = req.headers["x-forwarded-proto"] || (isLocalHost ? "http" : "https");
  return host ? `${proto}://${host}` : "";
}

function getFirstUrl(text) {
  const match = String(text || "").match(URL_PATTERN);
  return match ? match[0] : "";
}

function sanitizeTitle(title, fallback) {
  const value = String(title || fallback || "wechat-video").trim();
  return value.replace(/[\\/:*?"<>|]/g, "_").slice(0, 120) || fallback || "wechat-video";
}

function decodeHtmlEntities(value) {
  return String(value || "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/&#x([0-9a-fA-F]+);/g, (match, code) => String.fromCharCode(parseInt(code, 16)))
    .replace(/&#(\d+);/g, (match, code) => String.fromCharCode(parseInt(code, 10)))
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function decodeEscapedText(value) {
  let output = decodeHtmlEntities(value);
  output = output.replace(/\\x([0-9a-fA-F]{2})/g, (match, code) => String.fromCharCode(parseInt(code, 16)));
  output = output.replace(/\\\//g, "/");
  output = output.replace(/\\u([0-9a-fA-F]{4})/g, (match, code) => String.fromCharCode(parseInt(code, 16)));
  return output;
}

function cleanRawUrl(rawUrl) {
  let value = decodeEscapedText(rawUrl).trim();
  value = value.replace(/^['"(]+|['")]+$/g, "");
  value = value.replace(/[),.;，。；、）\]}]+$/g, "");

  const hardStop = value.search(/(?:&lt;|<|\\n|\\r)/i);
  if (hardStop > 0) {
    value = value.slice(0, hardStop);
  }

  return value;
}

function normalizeUrl(rawUrl, baseUrl) {
  const decoded = cleanRawUrl(rawUrl);
  if (!decoded || /^(blob:|data:|javascript:)/i.test(decoded)) {
    return "";
  }

  try {
    return new URL(decoded, baseUrl).href;
  } catch (error) {
    return "";
  }
}

function getUrlFileName(url) {
  try {
    const parsed = new URL(url);
    const lastPart = parsed.pathname.split("/").filter(Boolean).pop();
    return lastPart ? decodeURIComponent(lastPart) : "wechat-video.mp4";
  } catch (error) {
    return "wechat-video.mp4";
  }
}

function isWechatArticleUrl(url) {
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.toLowerCase();
    return hostname === "mp.weixin.qq.com" || hostname.endsWith(".mp.weixin.qq.com");
  } catch (error) {
    return false;
  }
}

function isLikelyVideoUrl(url) {
  if (VIDEO_FILE_PATTERN.test(url)) {
    return true;
  }

  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.toLowerCase();
    return VIDEO_HOST_PATTERN.test(hostname) && /(?:\/mpvideo\/|\/video\/|\/videoplayer|\/getmpvideo|\/getinfo|vid=|video_id=|wxv_)/i.test(parsed.href);
  } catch (error) {
    return false;
  }
}

function isLikelyPlayerUrl(url) {
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.toLowerCase();
    return PLAYER_HOST_PATTERN.test(hostname) && /(?:readtemplate|video_player|videoplayer|vid=|wxv_|srcid=)/i.test(parsed.href);
  } catch (error) {
    return false;
  }
}

function createCandidate(url, title, source, pageUrl, videoId, meta) {
  const candidateUrl = normalizeUrl(url, pageUrl);
  if (!candidateUrl || !isLikelyVideoUrl(candidateUrl)) {
    return null;
  }

  const details = getVideoDetails(candidateUrl);

  return {
    video_id: videoId || getVideoId(candidateUrl),
    title: sanitizeTitle(title, getUrlFileName(candidateUrl)),
    download_url: candidateUrl,
    source,
    quality: details.quality,
    ext: details.ext,
    confidence: meta && meta.confidence ? meta.confidence : "medium",
  };
}

function getVideoId(url) {
  try {
    const parsed = new URL(url);
    return parsed.searchParams.get("vid")
      || parsed.searchParams.get("wxv")
      || parsed.searchParams.get("video_id")
      || parsed.searchParams.get("srcid")
      || parsed.pathname.split("/").filter(Boolean).pop()
      || "";
  } catch (error) {
    return "";
  }
}

function getVideoDetails(url) {
  const details = {
    ext: "mp4",
    quality: "unknown",
  };

  try {
    const parsed = new URL(url);
    const file = parsed.pathname.split("/").pop() || "";
    const extMatch = file.match(/\.([a-z0-9]+)(?:$|[?#])/i);
    const qualityMatch = file.match(/\.f(\d+)\./i);
    if (extMatch) {
      details.ext = extMatch[1].toLowerCase();
    }
    if (qualityMatch) {
      details.quality = `f${qualityMatch[1]}`;
    }
  } catch (error) {
    return details;
  }

  return details;
}

function dedupeCandidates(candidates) {
  const seen = new Set();
  return candidates.filter((candidate) => {
    if (!candidate || !candidate.download_url) {
      return false;
    }

    const key = getDedupeKey(candidate.download_url);
    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function getDedupeKey(url) {
  try {
    const parsed = new URL(url);
    ["token", "expires", "expire", "wxfrom", "scene"].forEach((key) => {
      parsed.searchParams.delete(key);
    });
    return parsed.href;
  } catch (error) {
    return url;
  }
}

function candidateRank(candidate) {
  const confidenceScore = {
    high: 30,
    medium: 20,
    low: 10,
  }[candidate.confidence] || 0;
  const qualityScore = (Number((candidate.quality || "").replace(/^f/i, "")) || 0) * 10;
  const sourceScore = candidate.source === "wechat-trans-info"
    ? 6
    : candidate.source === "wechat-script"
      ? 4
      : candidate.source === "wechat-attribute"
        ? 3
        : 0;

  return confidenceScore + qualityScore + sourceScore;
}

function extractTitle(html) {
  const patterns = [
    /<meta\s+property=["']og:title["']\s+content=["']([^"']+)["']/i,
    /<meta\s+name=["']twitter:title["']\s+content=["']([^"']+)["']/i,
    /var\s+msg_title\s*=\s*['"]([^'"]+)['"]/i,
    /<title[^>]*>([\s\S]*?)<\/title>/i,
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match && match[1]) {
      return sanitizeTitle(decodeEscapedText(match[1]), "wechat-video");
    }
  }

  return "wechat-video";
}

function extractAttributeUrls(html, pageUrl) {
  const candidates = [];
  const attrPattern = /\b(?:src|data-src|href|content|video_url|ori_url|url|mpurl|play_url)=["']([^"']+)["']/gi;
  let match;

  while ((match = attrPattern.exec(html)) !== null) {
    const url = normalizeUrl(match[1], pageUrl);
    if (url && isLikelyVideoUrl(url)) {
      candidates.push(createCandidate(url, getUrlFileName(url), "wechat-attribute", pageUrl, "", {
        confidence: "high",
      }));
    }
  }

  return candidates;
}

function extractScriptVideoUrls(html, pageUrl) {
  const candidates = [];
  const decoded = decodeEscapedText(html);
  const transInfoPattern = /window\.__mpVideoTransInfo\s*=\s*\[([\s\S]*?)\];/gi;
  let transMatch;

  while ((transMatch = transInfoPattern.exec(decoded)) !== null) {
    const block = transMatch[1];
    const blockUrlPattern = /\burl\s*:\s*\(?["']([^"']+)["']/gi;
    let blockUrlMatch;

    while ((blockUrlMatch = blockUrlPattern.exec(block)) !== null) {
      const url = normalizeUrl(blockUrlMatch[1], pageUrl);
      if (url && isLikelyVideoUrl(url)) {
        candidates.push(createCandidate(url, getUrlFileName(url), "wechat-trans-info", pageUrl, "", {
          confidence: "high",
        }));
      }
    }
  }

  const patterns = [
    {
      source: "wechat-script",
      pattern: /(?:video_url|play_url|mp_video_url|mpVideoUrl|videoUrl|playUrl|ori_url|source_url|content_url|url)\s*[:=]\s*\(?["']([^"']+)["']/gi,
    },
  ];

  patterns.forEach(({ source, pattern }) => {
    let match;
    while ((match = pattern.exec(decoded)) !== null) {
      const url = normalizeUrl(match[1], pageUrl);
      if (url && isLikelyVideoUrl(url)) {
        candidates.push(createCandidate(url, getUrlFileName(url), source, pageUrl, "", {
          confidence: source === "wechat-trans-info" ? "high" : "medium",
        }));
      }
    }
  });

  return candidates;
}

function extractTextUrls(html, pageUrl) {
  const candidates = [];
  const decoded = decodeEscapedText(html);
  const urlPattern = /https?:\/\/[^\s"'<>\\]+/gi;
  let match;

  while ((match = urlPattern.exec(decoded)) !== null) {
    const url = normalizeUrl(match[0], pageUrl);
    if (url && isLikelyVideoUrl(url)) {
      candidates.push(createCandidate(url, getUrlFileName(url), "wechat-html", pageUrl, "", {
        confidence: VIDEO_FILE_PATTERN.test(url) ? "medium" : "low",
      }));
    }
  }

  return candidates;
}

function extractIframeUrls(html, pageUrl) {
  const urls = [];
  const iframePattern = /<iframe\b[^>]*(?:data-src|src)=["']([^"']+)["'][^>]*>/gi;
  let match;

  while ((match = iframePattern.exec(html)) !== null) {
    const url = normalizeUrl(match[1], pageUrl);
    if (url && isLikelyPlayerUrl(url)) {
      urls.push(url);
    }
  }

  const vidPattern = /\b(?:data-mpvid|data-vid|vid|mpvid)=["']?(wxv_[0-9A-Za-z_-]+|[0-9A-Za-z_-]{10,})["']?/gi;
  while ((match = vidPattern.exec(html)) !== null) {
    urls.push(createPlayerUrl(match[1]));
  }

  const scriptVidPattern = /["'](?:vid|mpvid|video_id)["']?\s*[:=]\s*["'](wxv_[0-9A-Za-z_-]+|[0-9A-Za-z_-]{10,})["']/gi;
  while ((match = scriptVidPattern.exec(html)) !== null) {
    urls.push(createPlayerUrl(match[1]));
  }

  const wxvPattern = /\bwxv_[0-9A-Za-z_-]{8,}\b/gi;
  while ((match = wxvPattern.exec(html)) !== null) {
    urls.push(createPlayerUrl(match[0]));
  }

  return Array.from(new Set(urls.filter(Boolean)));
}

function createPlayerUrl(videoId) {
  if (!videoId) {
    return "";
  }

  try {
    const iframeUrl = new URL("https://mp.weixin.qq.com/mp/readtemplate");
    iframeUrl.searchParams.set("t", "pages/video_player_tmpl");
    iframeUrl.searchParams.set("auto", "0");
    iframeUrl.searchParams.set("vid", videoId);
    return iframeUrl.href;
  } catch (error) {
    return "";
  }
}

function extractAllCandidates(html, pageUrl) {
  return [
    ...extractAttributeUrls(html, pageUrl),
    ...extractScriptVideoUrls(html, pageUrl),
    ...extractTextUrls(html, pageUrl),
  ];
}

function createPlayerFallbackCandidates(iframeUrls, title, pageUrl) {
  return iframeUrls.map((iframeUrl) => {
    const videoId = getVideoId(iframeUrl);
    if (!videoId) {
      return null;
    }

    return createCandidate(iframeUrl, title, "wechat-player", pageUrl, videoId, {
      confidence: "low",
    });
  });
}

function attachProxyUrls(req, candidates) {
  const origin = getRequestOrigin(req);
  return candidates.map((candidate, index) => {
    const filename = candidate.video_id || `wechat-video-${index + 1}`;
    const proxyPath = `/api/wechat/resolve?url=${encodeURIComponent(candidate.download_url)}&filename=${encodeURIComponent(filename)}`;
    return {
      ...candidate,
      proxy_url: origin ? `${origin}${proxyPath}` : proxyPath,
    };
  });
}

async function fetchText(url, referer) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      headers: {
        ...HEADERS,
        "Referer": referer || HEADERS.Referer,
      },
      redirect: "follow",
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`微信公众号页面请求失败：${response.status}`);
    }

    return {
      url: response.url,
      html: await response.text(),
    };
  } catch (error) {
    if (error && error.name === "AbortError") {
      throw new Error("微信公众号页面请求超时");
    }

    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

async function resolveWechatArticle(shareText) {
  const inputUrl = getFirstUrl(shareText);
  if (!inputUrl || !isWechatArticleUrl(inputUrl)) {
    throw new Error("未找到有效的微信公众号文章链接");
  }

  const article = await fetchText(inputUrl);
  const title = extractTitle(article.html);
  const iframeUrls = extractIframeUrls(article.html, article.url);
  const candidates = extractAllCandidates(article.html, article.url);
  const warnings = [];

  for (const iframeUrl of iframeUrls.slice(0, MAX_IFRAMES)) {
    try {
      const iframe = await fetchText(iframeUrl, article.url);
      candidates.push(...extractAllCandidates(iframe.html, iframe.url));
    } catch (error) {
      warnings.push(`播放器页读取失败：${error.message || iframeUrl}`);
    }
  }

  const resolved = dedupeCandidates(candidates)
    .sort((a, b) => candidateRank(b) - candidateRank(a))
    .map((candidate, index) => ({
      ...candidate,
      title: index === 0 ? title : `${title}-${index + 1}`,
    }));

  if (!resolved.length) {
    throw new Error("没有在微信公众号文章中找到可识别的视频资源");
  }

  return {
    title,
    article_url: article.url,
    iframe_count: iframeUrls.length,
    warnings,
    candidates: resolved.slice(0, MAX_CANDIDATES),
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
  const filename = sanitizeTitle(requestUrl.searchParams.get("filename"), "wechat-video") + ".mp4";

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
    const result = await resolveWechatArticle(body.shareText || body.share_link || body.url || "");
    const candidates = attachProxyUrls(req, result.candidates);
    const first = candidates[0];

    sendJson(res, 200, {
      status: "success",
      title: result.title,
      article_url: result.article_url,
      iframe_count: result.iframe_count,
      video_id: first && first.video_id,
      download_url: first && first.download_url,
      proxy_url: first && first.proxy_url,
      candidates,
      warnings: result.warnings,
      description: `文章标题: ${result.title}`,
      usage_tip: "candidates 包含微信公众号文章里识别到的视频资源；proxy_url 可用于同源下载和浏览器预览。",
    });
  } catch (error) {
    sendJson(res, 500, {
      status: "error",
      error: error && error.message ? error.message : "获取微信公众号视频资源失败",
    });
  }
};

module.exports.resolveWechatArticle = resolveWechatArticle;
