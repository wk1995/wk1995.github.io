(function () {
  const input = document.getElementById("video-input");
  const dropzone = document.getElementById("video-dropzone");
  const urlForm = document.getElementById("video-url-form");
  const urlInput = document.getElementById("video-url-input");
  const previewUrlButton = document.getElementById("preview-url");
  const discoveryPanel = document.getElementById("video-discovery-panel");
  const discoveryList = document.getElementById("video-discovery-list");
  const discoveryCount = document.getElementById("video-discovery-count");
  const addDiscoveredButton = document.getElementById("add-discovered-videos");
  const queuePanel = document.getElementById("video-queue-panel");
  const queueList = document.getElementById("video-queue-list");
  const queueCount = document.getElementById("video-queue-count");
  const previewShell = document.getElementById("preview-shell");
  const previewEmpty = document.getElementById("preview-empty");
  const video = document.getElementById("source-video");
  const canvas = document.getElementById("preview-canvas");
  const playToggle = document.getElementById("play-toggle");
  const playIcon = document.getElementById("play-icon");
  const playerBar = document.getElementById("player-bar");
  const seekControl = document.getElementById("seek-control");
  const currentTime = document.getElementById("current-time");
  const duration = document.getElementById("duration");
  const fileSummary = document.getElementById("file-summary");
  const fileMeta = document.getElementById("file-meta");
  const pathSummary = document.getElementById("path-summary");
  const sourcePath = document.getElementById("source-path");
  const downloadPath = document.getElementById("download-path");
  const status = document.getElementById("video-status");
  const regionList = document.getElementById("region-list");
  const addRegionButton = document.getElementById("add-region");
  const regionInputs = {
    x: document.getElementById("region-x"),
    y: document.getElementById("region-y"),
    w: document.getElementById("region-w"),
    h: document.getElementById("region-h"),
  };
  const modeButtons = Array.from(document.querySelectorAll(".video-mode-button"));
  const strengthControl = document.getElementById("strength-control");
  const strengthValue = document.getElementById("strength-value");
  const formatSelect = document.getElementById("format-select");
  const fpsSelect = document.getElementById("fps-select");
  const audioToggle = document.getElementById("audio-toggle");
  const exportButton = document.getElementById("export-button");
  const exportProgress = document.getElementById("export-progress");

  const scratch = document.createElement("canvas");
  const scratchContext = scratch.getContext("2d");

  const copy = {
    zh: {
      backHome: "返回首页",
      title: "视频水印移除与导出",
      intro: "导入本地视频，框选一个或多个水印区域，实时预览局部修复效果，并按浏览器支持的格式导出。",
      dropTitle: "选择或拖入视频文件",
      dropCopy: "支持 MP4、MOV、WebM、MKV、AVI、OGV、3GP 等常见视频容器；实际解码由当前浏览器决定。",
      urlLabel: "抖音分享文案、微信公众号文章、网页或视频地址",
      urlPlaceholder: "粘贴抖音分享文案、微信公众号文章、网页地址或视频直链",
      urlPreviewAction: "解析视频",
      discoveryTitle: "发现的视频",
      addSelectedVideos: "加入选中视频",
      queueTitle: "已选视频队列",
      previewEmpty: "正在准备视频预览",
      fileLabel: "当前文件",
      fileEmpty: "尚未选择视频",
      sourcePathLabel: "资源路径",
      regionTitle: "水印区域",
      addRegion: "新增区域",
      repairTitle: "处理方式",
      modeBlur: "柔化修复",
      modeMosaic: "马赛克",
      modeFill: "邻域填充",
      strengthLabel: "强度",
      exportTitle: "导出",
      formatLabel: "格式",
      fpsLabel: "帧率",
      audioLabel: "保留原视频音频",
      exportAction: "导出视频",
      metaTitle: "视频水印移除 | WK1995",
      metaDescription: "上传视频文件，框选水印区域，预览局部修复效果并导出处理后的视频。",
      play: "播放",
      pause: "暂停",
      unsupportedExport: "当前浏览器不支持 MediaRecorder 视频导出。",
      noFormat: "当前浏览器没有可用的视频导出格式。",
      emptyRegion: "还没有区域，点击新增区域或直接在预览画面拖拽框选。",
      regionName: "区域",
      active: "当前",
      select: "选择",
      delete: "删除",
      loading: "正在读取视频文件...",
      scanningPage: "正在扫描网页中的视频资源...",
      resolvingDouyin: "正在解析抖音无水印视频链接...",
      resolvingWechat: "正在解析微信公众号文章中的视频资源...",
      scanFound: "已发现视频资源",
      scanEmpty: "没有在这个网页中发现可识别的视频文件。",
      scanBlocked: "无法读取这个网页。目标网站可能不允许跨域读取 HTML；请改用视频直链。",
      douyinResolved: "已解析抖音无水印视频",
      douyinSource: "抖音无水印",
      douyinBlocked: "无法解析抖音视频。请确认已部署 /api/douyin/resolve 代理，或在服务器环境中配置同等接口。",
      douyinUnavailable: "这个页面需要服务端代理解析抖音分享页；静态 GitHub Pages 不能直接请求抖音页面。",
      wechatResolved: "已解析微信公众号视频资源",
      wechatSource: "微信公众号视频",
      wechatBlocked: "无法解析微信公众号文章。请确认已部署 /api/wechat/resolve 代理，或在服务器环境中配置同等接口。",
      wechatUnavailable: "这个页面需要服务端代理读取微信公众号文章；静态 GitHub Pages 不能直接请求微信文章页。",
      failureTitle: "处理失败",
      failureInputTip: "请粘贴完整的 http 或 https 地址，或包含抖音短链、微信公众号文章链接的分享文案。",
      failureScanTip: "可能原因：目标网站禁止跨域读取、页面视频由脚本动态加载、需要登录或存在防盗链。可以打开网页复制视频直链后再扫描。",
      failurePreviewTip: "可能原因：视频编码或容器不被当前浏览器支持、远程服务器禁止跨域媒体加载，或链接不是可直接访问的视频文件。",
      failureDownloadTip: "可能原因：远程服务器禁止跨域下载、需要登录授权、链接已过期或存在防盗链。可改用本地文件导入。",
      selectedCount: "已选择",
      candidateCount: "个候选",
      queueCount: "个视频",
      operateVideo: "操作",
      videoCandidate: "视频候选",
      directVideo: "视频直链",
      pageVideo: "网页资源",
      previewLoading: "正在获取视频预览图...",
      loaded: "视频已载入。可拖拽画面框选水印区域。",
      remoteLoaded: "已获取远程视频预览图。编辑或导出前会先下载原视频。",
      downloadOriginal: "正在下载原视频...",
      downloadReady: "原视频已下载到浏览器临时资源。",
      downloadPending: "原视频尚未下载；使用编辑或导出功能时会自动下载。",
      downloadBlocked: "无法下载原视频。请确认视频地址允许跨域访问，或改用本地文件导入。",
      remotePreview: "远程预览",
      localSource: "本地文件",
      tempBlobPath: "临时 Blob 路径",
      decodeError: "当前浏览器无法解码这个视频格式或编码。",
      formatExtension: "扩展名",
      formatMime: "MIME",
      formatUnknown: "未知",
      formatSourceUrl: "来源 URL",
      pickVideo: "请选择视频文件。",
      pickUrl: "请输入有效的视频网址。",
      unsupportedUrl: "仅支持 http 或 https 视频网址。",
      canvasBlocked: "预览帧受跨域限制，已保留视频元数据；下载原视频后可继续处理。",
      exporting: "正在导出视频",
      exported: "已导出视频：",
      exportFailed: "导出失败。",
      audioFallback: "音频轨道无法接入，已导出静音视频。",
      formatAuto: "自动选择",
      formatWebmVp9: "WebM VP9",
      formatWebmVp8: "WebM VP8",
      formatWebm: "WebM",
      formatMp4H264: "MP4 H.264",
      formatMp4: "MP4",
      sizeLabel: "尺寸",
      durationLabel: "时长",
    },
    en: {
      backHome: "Back home",
      title: "Video Watermark Removal and Export",
      intro: "Import a local video, mark one or more watermark regions, preview the repair, and export in a format supported by the browser.",
      dropTitle: "Choose or drop a video file",
      dropCopy: "Accepts common containers such as MP4, MOV, WebM, MKV, AVI, OGV, and 3GP. Actual decoding depends on the current browser.",
      urlLabel: "Douyin share text, WeChat article, page, or video URL",
      urlPlaceholder: "Paste Douyin share text, a WeChat article, a page URL, or a direct video link",
      urlPreviewAction: "Resolve video",
      discoveryTitle: "Discovered videos",
      addSelectedVideos: "Add selected",
      queueTitle: "Selected video queue",
      previewEmpty: "Preparing video preview",
      fileLabel: "Current file",
      fileEmpty: "No video selected",
      sourcePathLabel: "Resource path",
      regionTitle: "Watermark regions",
      addRegion: "Add region",
      repairTitle: "Repair mode",
      modeBlur: "Soft repair",
      modeMosaic: "Mosaic",
      modeFill: "Neighbor fill",
      strengthLabel: "Strength",
      exportTitle: "Export",
      formatLabel: "Format",
      fpsLabel: "Frame rate",
      audioLabel: "Keep original audio",
      exportAction: "Export video",
      metaTitle: "Video Watermark Removal | WK1995",
      metaDescription: "Upload a video, select watermark areas, preview local repair, and export the processed video.",
      play: "Play",
      pause: "Pause",
      unsupportedExport: "This browser does not support MediaRecorder video export.",
      noFormat: "This browser has no available video export format.",
      emptyRegion: "No regions yet. Add one or drag on the preview.",
      regionName: "Region",
      active: "Active",
      select: "Select",
      delete: "Delete",
      loading: "Reading video file...",
      scanningPage: "Scanning the page for video resources...",
      resolvingDouyin: "Resolving the Douyin no-watermark video URL...",
      resolvingWechat: "Resolving video resources from the WeChat article...",
      scanFound: "Discovered video resources",
      scanEmpty: "No recognizable video files were found on this page.",
      scanBlocked: "Could not read this page. The target site may block cross-origin HTML access; use a direct video URL instead.",
      douyinResolved: "Resolved Douyin no-watermark video",
      douyinSource: "Douyin no-watermark",
      douyinBlocked: "Could not resolve this Douyin video. Confirm that the /api/douyin/resolve proxy is deployed, or provide an equivalent server endpoint.",
      douyinUnavailable: "This page needs a server proxy to parse Douyin share pages; static GitHub Pages cannot request Douyin pages directly.",
      wechatResolved: "Resolved WeChat article videos",
      wechatSource: "WeChat article video",
      wechatBlocked: "Could not resolve this WeChat article. Confirm that the /api/wechat/resolve proxy is deployed, or provide an equivalent server endpoint.",
      wechatUnavailable: "This page needs a server proxy to read WeChat article pages; static GitHub Pages cannot request WeChat article pages directly.",
      failureTitle: "Failed",
      failureInputTip: "Paste a complete http or https URL, or share text containing a Douyin short link or WeChat article URL.",
      failureScanTip: "Possible causes: the target site blocks cross-origin HTML reads, loads videos dynamically, requires login, or uses hotlink protection. Open the page and copy a direct video URL instead.",
      failurePreviewTip: "Possible causes: the codec or container is not supported by this browser, the remote server blocks cross-origin media loading, or the link is not a directly playable video file.",
      failureDownloadTip: "Possible causes: the remote server blocks cross-origin downloads, requires authorization, the link expired, or hotlink protection is enabled. Import a local file instead.",
      selectedCount: "Selected",
      candidateCount: "candidates",
      queueCount: "videos",
      operateVideo: "Operate",
      videoCandidate: "Video candidate",
      directVideo: "Direct video",
      pageVideo: "Page resource",
      previewLoading: "Loading video preview...",
      loaded: "Video loaded. Drag on the frame to mark a watermark region.",
      remoteLoaded: "Remote preview loaded. The original video will be downloaded before editing or export.",
      downloadOriginal: "Downloading original video...",
      downloadReady: "Original video downloaded into a temporary browser resource.",
      downloadPending: "Original video is not downloaded yet. Editing or export will download it automatically.",
      downloadBlocked: "Could not download the original video. Confirm the video URL allows cross-origin access, or import a local file instead.",
      remotePreview: "Remote preview",
      localSource: "Local file",
      tempBlobPath: "Temporary Blob path",
      decodeError: "This browser cannot decode the selected video format or codec.",
      formatExtension: "Extension",
      formatMime: "MIME",
      formatUnknown: "unknown",
      formatSourceUrl: "Source URL",
      pickVideo: "Choose a video file.",
      pickUrl: "Enter a valid video URL.",
      unsupportedUrl: "Only http or https video URLs are supported.",
      canvasBlocked: "The preview frame is restricted by cross-origin policy. Download the original video before processing.",
      exporting: "Exporting video",
      exported: "Exported video: ",
      exportFailed: "Export failed.",
      audioFallback: "Audio could not be attached, exported a silent video.",
      formatAuto: "Auto",
      formatWebmVp9: "WebM VP9",
      formatWebmVp8: "WebM VP8",
      formatWebm: "WebM",
      formatMp4H264: "MP4 H.264",
      formatMp4: "MP4",
      sizeLabel: "Size",
      durationLabel: "Duration",
    },
  };

  let file = null;
  let objectUrl = "";
  let sourceMode = "none";
  let remoteUrl = "";
  let sourceName = "";
  let regions = [];
  let activeRegionId = null;
  let repairMode = "blur";
  let renderHandle = 0;
  let dragging = null;
  let supportedFormats = [];
  let isExporting = false;
  let isDownloadingOriginal = false;
  let discoveredVideos = [];
  let queuedVideos = [];
  let activeQueueId = null;

  function lang() {
    return window.WKSite && typeof window.WKSite.getLanguage === "function"
      ? window.WKSite.getLanguage()
      : (document.documentElement.lang || "").indexOf("zh") === 0
        ? "zh"
        : "en";
  }

  function text(key) {
    const messages = copy[lang()] || copy.zh;
    return messages[key] || copy.zh[key] || key;
  }

  function formatTime(seconds) {
    if (!Number.isFinite(seconds) || seconds <= 0) {
      return "0:00";
    }
    const minutes = Math.floor(seconds / 60);
    const remaining = Math.floor(seconds % 60).toString().padStart(2, "0");
    return `${minutes}:${remaining}`;
  }

  function formatBytes(bytes) {
    if (!Number.isFinite(bytes) || bytes <= 0) {
      return "--";
    }
    const units = ["B", "KB", "MB", "GB"];
    let value = bytes;
    let unitIndex = 0;
    while (value >= 1024 && unitIndex < units.length - 1) {
      value /= 1024;
      unitIndex += 1;
    }
    return `${value.toFixed(value >= 10 ? 0 : 1)} ${units[unitIndex]}`;
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function setStatus(message, kind) {
    status.textContent = message || "";
    status.classList.toggle("is-error", kind === "error");
    status.classList.toggle("is-success", kind === "success");
  }

  function setPlayIcon(isPlaying) {
    playToggle.setAttribute("aria-label", isPlaying ? text("pause") : text("play"));
    playToggle.setAttribute("title", isPlaying ? text("pause") : text("play"));
    playIcon.innerHTML = isPlaying
      ? '<path d="M7 5a1 1 0 0 1 1 1v12a1 1 0 1 1-2 0V6a1 1 0 0 1 1-1Zm10 0a1 1 0 0 1 1 1v12a1 1 0 1 1-2 0V6a1 1 0 0 1 1-1Z"></path>'
      : '<path d="M8 5.8c0-.74.82-1.18 1.43-.77l8.34 5.72a.92.92 0 0 1 0 1.5l-8.34 5.72A.92.92 0 0 1 8 17.2V5.8Z"></path>';
  }

  function getActiveRegion() {
    return regions.find(function (region) {
      return region.id === activeRegionId;
    }) || null;
  }

  function createDefaultRegion() {
    return {
      id: `region-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      x: 0.68,
      y: 0.07,
      w: 0.24,
      h: 0.11,
    };
  }

  function isVideoFile(candidate) {
    return candidate
      && (candidate.type.indexOf("video/") === 0 || /\.(mp4|mov|m4v|webm|mkv|avi|ogv|3gp)$/i.test(candidate.name));
  }

  function isLikelyVideoUrl(url) {
    return /\.(mp4|mov|m4v|webm|mkv|avi|ogv|ogg|3gp)(?:$|[?#])/i.test(url || "");
  }

  function extractFirstHttpUrl(value) {
    const match = String(value || "").match(/https?:\/\/[^\s"'<>，。；、)）]+/i);
    return match ? match[0] : "";
  }

  function isDouyinUrl(value) {
    const url = extractFirstHttpUrl(value);
    if (!url) {
      return false;
    }

    try {
      const hostname = new URL(url).hostname.toLowerCase();
      return hostname === "v.douyin.com"
        || hostname.endsWith(".douyin.com")
        || hostname === "iesdouyin.com"
        || hostname.endsWith(".iesdouyin.com");
    } catch (error) {
      return false;
    }
  }

  function getDouyinResolverEndpoint() {
    return window.WK_DOUYIN_RESOLVER || "/api/douyin/resolve";
  }

  function isWechatArticleUrl(value) {
    const url = extractFirstHttpUrl(value);
    if (!url) {
      return false;
    }

    try {
      const parsed = new URL(url);
      const hostname = parsed.hostname.toLowerCase();
      return hostname === "mp.weixin.qq.com" || hostname.endsWith(".mp.weixin.qq.com");
    } catch (error) {
      return false;
    }
  }

  function getWechatResolverEndpoint() {
    return window.WK_WECHAT_RESOLVER || "/api/wechat/resolve";
  }

  function normalizeCandidateUrl(rawUrl, baseUrl) {
    if (!rawUrl || /^(blob:|data:|javascript:)/i.test(rawUrl)) {
      return "";
    }

    try {
      return new URL(rawUrl, baseUrl).href;
    } catch (error) {
      return "";
    }
  }

  function createCandidate(url, label, source) {
    return {
      id: `candidate-${Math.random().toString(16).slice(2)}-${Date.now()}`,
      url: url,
      label: label || getUrlFileName(url),
      source: source || text("pageVideo"),
      selected: true,
    };
  }

  function dedupeCandidates(candidates) {
    const seen = new Set();
    return candidates.filter(function (candidate) {
      if (!candidate.url || seen.has(candidate.url)) {
        return false;
      }
      seen.add(candidate.url);
      return true;
    });
  }

  function extractVideoCandidatesFromHtml(html, pageUrl) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");
    const candidates = [];

    doc.querySelectorAll("video[src], video source[src], source[src]").forEach(function (node) {
      const url = normalizeCandidateUrl(node.getAttribute("src"), pageUrl);
      if (url) {
        candidates.push(createCandidate(url, node.getAttribute("title") || node.getAttribute("label") || getUrlFileName(url), "video/source"));
      }
    });

    doc.querySelectorAll('meta[property="og:video"], meta[property="og:video:url"], meta[property="og:video:secure_url"], meta[name="twitter:player:stream"]').forEach(function (node) {
      const url = normalizeCandidateUrl(node.getAttribute("content"), pageUrl);
      if (url) {
        candidates.push(createCandidate(url, getUrlFileName(url), "meta"));
      }
    });

    doc.querySelectorAll("a[href], link[href]").forEach(function (node) {
      const url = normalizeCandidateUrl(node.getAttribute("href"), pageUrl);
      if (url && isLikelyVideoUrl(url)) {
        const label = node.textContent && node.textContent.trim()
          ? node.textContent.trim().slice(0, 90)
          : getUrlFileName(url);
        candidates.push(createCandidate(url, label, node.tagName.toLowerCase()));
      }
    });

    const urlPattern = /https?:\/\/[^\s"'<>\\]+?\.(?:mp4|mov|m4v|webm|mkv|avi|ogv|ogg|3gp)(?:\?[^\s"'<>\\]*)?/gi;
    (html.match(urlPattern) || []).forEach(function (url) {
      candidates.push(createCandidate(url, getUrlFileName(url), "html"));
    });

    return dedupeCandidates(candidates).slice(0, 80);
  }

  function hasSource() {
    return sourceMode === "local" || sourceMode === "remote";
  }

  function clearObjectUrl() {
    if (objectUrl) {
      URL.revokeObjectURL(objectUrl);
      objectUrl = "";
    }
  }

  function getUrlFileName(url) {
    try {
      const parsed = new URL(url);
      const lastPart = parsed.pathname.split("/").filter(Boolean).pop();
      return lastPart ? decodeURIComponent(lastPart) : "remote-video.mp4";
    } catch (error) {
      return "remote-video.mp4";
    }
  }

  function getExtensionFromName(name) {
    const match = /\.([a-z0-9]+)(?:$|[?#])/i.exec(name || "");
    return match ? `.${match[1].toLowerCase()}` : text("formatUnknown");
  }

  function getSourceFormatSummary(media) {
    const name = sourceName || (file && file.name) || remoteUrl || "";
    const extension = getExtensionFromName(name);
    const mime = file && file.type ? file.type : text("formatUnknown");
    const parts = [
      `${text("formatExtension")} ${extension}`,
      `${text("formatMime")} ${mime}`,
    ];

    if (sourceMode === "remote" && remoteUrl) {
      parts.push(`${text("formatSourceUrl")} ${remoteUrl}`);
    }

    if (media && media.error && media.error.message) {
      parts.push(media.error.message);
    }

    return parts.join(" · ");
  }

  function getDecodeErrorMessage(media) {
    return `${text("decodeError")} ${getSourceFormatSummary(media)}`;
  }

  function updateDiscoveryCount() {
    const selectedCount = discoveredVideos.filter(function (candidate) {
      return candidate.selected;
    }).length;
    discoveryCount.textContent = discoveredVideos.length
      ? `${text("selectedCount")} ${selectedCount} / ${discoveredVideos.length} ${text("candidateCount")}`
      : `0 ${text("candidateCount")}`;
    addDiscoveredButton.disabled = selectedCount === 0 || isExporting || isDownloadingOriginal;
  }

  function renderDiscoveredVideos() {
    discoveryList.innerHTML = "";
    discoveryPanel.hidden = discoveredVideos.length === 0;

    discoveredVideos.forEach(function (candidate, index) {
      const card = document.createElement("label");
      card.className = "video-candidate-card";

      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.checked = candidate.selected;
      checkbox.addEventListener("change", function () {
        candidate.selected = checkbox.checked;
        updateDiscoveryCount();
      });

      const copyBlock = document.createElement("span");
      copyBlock.className = "video-candidate-copy";
      const title = document.createElement("strong");
      title.textContent = candidate.label || `${text("videoCandidate")} ${index + 1}`;
      const url = document.createElement("span");
      url.textContent = candidate.url;
      copyBlock.append(title, url);

      const badge = document.createElement("span");
      badge.className = "video-candidate-badge";
      badge.textContent = candidate.source || text("pageVideo");

      card.append(checkbox, copyBlock, badge);
      discoveryList.append(card);
    });

    updateDiscoveryCount();
  }

  function renderDiscoveryFailure(message, tip) {
    discoveredVideos = [];
    discoveryPanel.hidden = false;
    discoveryList.innerHTML = "";
    discoveryCount.textContent = `0 ${text("candidateCount")}`;
    addDiscoveredButton.disabled = true;

    const card = document.createElement("div");
    card.className = "video-failure-card";
    const title = document.createElement("strong");
    title.textContent = text("failureTitle");
    const body = document.createElement("span");
    body.textContent = message;
    const hint = document.createElement("small");
    hint.textContent = tip;
    card.append(title, body, hint);
    discoveryList.append(card);
  }

  function renderVideoQueue() {
    queueList.innerHTML = "";
    queuePanel.hidden = queuedVideos.length === 0;
    queueCount.textContent = `${queuedVideos.length} ${text("queueCount")}`;

    queuedVideos.forEach(function (item, index) {
      const card = document.createElement("div");
      card.className = "video-queue-card";
      card.classList.toggle("is-active", item.id === activeQueueId);

      const copyBlock = document.createElement("div");
      copyBlock.className = "video-queue-copy";
      const title = document.createElement("strong");
      title.textContent = item.label || `${text("videoCandidate")} ${index + 1}`;
      const url = document.createElement("span");
      url.textContent = item.url;
      copyBlock.append(title, url);

      const button = document.createElement("button");
      button.className = "video-secondary-button";
      button.type = "button";
      button.textContent = text("operateVideo");
      button.disabled = isExporting || isDownloadingOriginal;
      button.addEventListener("click", function () {
        activateQueuedVideo(item.id);
      });

      card.append(copyBlock, button);
      queueList.append(card);
    });
  }

  function queueSelectedVideos() {
    const selected = discoveredVideos.filter(function (candidate) {
      return candidate.selected;
    });

    selected.forEach(function (candidate) {
      const exists = queuedVideos.some(function (item) {
        return item.url === candidate.url;
      });
      if (!exists) {
        queuedVideos.push({
          id: `queue-${Math.random().toString(16).slice(2)}-${Date.now()}`,
          url: candidate.url,
          label: candidate.label,
        });
      }
    });

    renderVideoQueue();
    if (!activeQueueId && queuedVideos.length) {
      activateQueuedVideo(queuedVideos[0].id);
    }
  }

  function activateQueuedVideo(id) {
    const item = queuedVideos.find(function (candidate) {
      return candidate.id === id;
    });
    if (!item) {
      return;
    }

    activeQueueId = item.id;
    renderVideoQueue();
    loadRemotePreview(item.url, item.label);
  }

  function getMediaRecorderFormats() {
    if (!window.MediaRecorder) {
      return [];
    }

    return [
      { key: "formatWebmVp9", mime: "video/webm;codecs=vp9,opus", ext: "webm" },
      { key: "formatWebmVp8", mime: "video/webm;codecs=vp8,opus", ext: "webm" },
      { key: "formatWebm", mime: "video/webm", ext: "webm" },
      { key: "formatMp4H264", mime: "video/mp4;codecs=avc1.42E01E,mp4a.40.2", ext: "mp4" },
      { key: "formatMp4", mime: "video/mp4", ext: "mp4" },
    ].filter(function (format) {
      return MediaRecorder.isTypeSupported(format.mime);
    });
  }

  function renderFormatOptions() {
    supportedFormats = getMediaRecorderFormats();
    formatSelect.innerHTML = "";

    if (!window.MediaRecorder) {
      const option = document.createElement("option");
      option.value = "";
      option.textContent = text("unsupportedExport");
      formatSelect.append(option);
      return;
    }

    if (!supportedFormats.length) {
      const option = document.createElement("option");
      option.value = "";
      option.textContent = text("noFormat");
      formatSelect.append(option);
      return;
    }

    const autoOption = document.createElement("option");
    autoOption.value = "auto";
    autoOption.textContent = text("formatAuto");
    formatSelect.append(autoOption);

    supportedFormats.forEach(function (format) {
      const option = document.createElement("option");
      option.value = format.mime;
      option.textContent = text(format.key);
      formatSelect.append(option);
    });
  }

  function getSelectedFormat() {
    if (!supportedFormats.length) {
      return null;
    }

    if (formatSelect.value && formatSelect.value !== "auto") {
      return supportedFormats.find(function (format) {
        return format.mime === formatSelect.value;
      }) || supportedFormats[0];
    }

    return supportedFormats[0];
  }

  function applyTranslations() {
    document.querySelectorAll("[data-video-text]").forEach(function (node) {
      const key = node.dataset.videoText;
      if (text(key)) {
        node.textContent = text(key);
      }
    });
    urlInput.setAttribute("placeholder", text("urlPlaceholder"));
    document.title = text("metaTitle");
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute("content", text("metaDescription"));
    }
    setPlayIcon(!video.paused);
    renderFormatOptions();
    renderRegionControls();
    updateFileSummary();
    updatePathSummary();
    renderDiscoveredVideos();
    renderVideoQueue();
  }

  function setControlsEnabled(enabled) {
    const busy = isExporting || isDownloadingOriginal;
    addRegionButton.disabled = !enabled || busy;
    Object.keys(regionInputs).forEach(function (key) {
      regionInputs[key].disabled = !enabled || !getActiveRegion() || busy;
    });
    strengthControl.disabled = !enabled || busy;
    formatSelect.disabled = !enabled || !supportedFormats.length || busy;
    fpsSelect.disabled = !enabled || busy;
    audioToggle.disabled = !enabled || busy;
    exportButton.disabled = !enabled || !supportedFormats.length || busy;
    previewUrlButton.disabled = busy;
    urlInput.disabled = busy;
    addDiscoveredButton.disabled = busy || !discoveredVideos.some(function (candidate) {
      return candidate.selected;
    });
  }

  function updateFileSummary() {
    const label = fileSummary.querySelector("strong");
    if (!hasSource() || !video.videoWidth) {
      label.textContent = text("fileEmpty");
      fileMeta.textContent = "--";
      return;
    }

    label.textContent = sourceName || (file && file.name) || remoteUrl || text("fileEmpty");
    const sourceLabel = sourceMode === "remote" && !file ? text("remotePreview") : text("localSource");
    const sizeCopy = file ? ` · ${formatBytes(file.size)}` : "";
    fileMeta.textContent = `${sourceLabel} · ${text("sizeLabel")} ${video.videoWidth}x${video.videoHeight} · ${text("durationLabel")} ${formatTime(video.duration)}${sizeCopy}`;
  }

  function updatePathSummary() {
    if (!hasSource()) {
      pathSummary.hidden = true;
      sourcePath.textContent = "--";
      downloadPath.textContent = "--";
      return;
    }

    pathSummary.hidden = false;
    if (sourceMode === "remote") {
      sourcePath.textContent = remoteUrl;
      downloadPath.textContent = objectUrl
        ? `${text("tempBlobPath")}: ${objectUrl}`
        : text("downloadPending");
      return;
    }

    sourcePath.textContent = `${text("localSource")}: ${sourceName || (file && file.name) || "--"}`;
    downloadPath.textContent = objectUrl ? `${text("tempBlobPath")}: ${objectUrl}` : "--";
  }

  function normalizeRegion(region) {
    region.x = clamp(region.x, 0, 0.99);
    region.y = clamp(region.y, 0, 0.99);
    region.w = clamp(region.w, 0.01, 1 - region.x);
    region.h = clamp(region.h, 0.01, 1 - region.y);
  }

  function updateRegionInputs() {
    const region = getActiveRegion();
    const enabled = Boolean(file && region);

    Object.keys(regionInputs).forEach(function (key) {
      regionInputs[key].disabled = !enabled || isExporting;
    });

    if (!region) {
      return;
    }

    regionInputs.x.value = (region.x * 100).toFixed(1);
    regionInputs.y.value = (region.y * 100).toFixed(1);
    regionInputs.w.value = (region.w * 100).toFixed(1);
    regionInputs.h.value = (region.h * 100).toFixed(1);
  }

  function renderRegionControls() {
    regionList.innerHTML = "";

    if (!regions.length) {
      const empty = document.createElement("p");
      empty.className = "video-status";
      empty.textContent = text("emptyRegion");
      regionList.append(empty);
      updateRegionInputs();
      setControlsEnabled(hasSource());
      return;
    }

    regions.forEach(function (region, index) {
      const card = document.createElement("div");
      card.className = "video-region-card";
      card.classList.toggle("is-active", region.id === activeRegionId);

      const copyBlock = document.createElement("div");
      const title = document.createElement("strong");
      title.textContent = `${text("regionName")} ${index + 1}${region.id === activeRegionId ? ` · ${text("active")}` : ""}`;
      const meta = document.createElement("small");
      meta.textContent = `${Math.round(region.x * 100)}%, ${Math.round(region.y * 100)}% · ${Math.round(region.w * 100)}% x ${Math.round(region.h * 100)}%`;
      copyBlock.append(title, meta);

      const actions = document.createElement("div");
      const selectButton = document.createElement("button");
      selectButton.className = "video-secondary-button";
      selectButton.type = "button";
      selectButton.textContent = text("select");
      selectButton.disabled = isExporting;
      selectButton.addEventListener("click", function () {
        activeRegionId = region.id;
        renderRegionControls();
        drawPreview();
      });

      const deleteButton = document.createElement("button");
      deleteButton.className = "video-secondary-button";
      deleteButton.type = "button";
      deleteButton.textContent = text("delete");
      deleteButton.disabled = isExporting;
      deleteButton.addEventListener("click", function () {
        regions = regions.filter(function (item) {
          return item.id !== region.id;
        });
        activeRegionId = regions[0] ? regions[0].id : null;
        renderRegionControls();
        drawPreview();
      });
      actions.append(selectButton, deleteButton);
      card.append(copyBlock, actions);
      regionList.append(card);
    });

    updateRegionInputs();
    setControlsEnabled(hasSource());
  }

  function resizePreviewCanvas() {
    if (!video.videoWidth || !video.videoHeight) {
      return;
    }

    const maxPreviewWidth = 1280;
    const scale = Math.min(1, maxPreviewWidth / video.videoWidth);
    canvas.width = Math.max(1, Math.round(video.videoWidth * scale));
    canvas.height = Math.max(1, Math.round(video.videoHeight * scale));
    canvas.style.aspectRatio = `${video.videoWidth} / ${video.videoHeight}`;
  }

  function drawMosaic(context, x, y, width, height, strength) {
    const pixelSize = clamp(Math.round(strength), 2, 48);
    const mosaicWidth = Math.max(1, Math.ceil(width / pixelSize));
    const mosaicHeight = Math.max(1, Math.ceil(height / pixelSize));

    scratch.width = mosaicWidth;
    scratch.height = mosaicHeight;
    scratchContext.imageSmoothingEnabled = true;
    scratchContext.drawImage(context.canvas, x, y, width, height, 0, 0, mosaicWidth, mosaicHeight);

    context.save();
    context.imageSmoothingEnabled = false;
    context.drawImage(scratch, 0, 0, mosaicWidth, mosaicHeight, x, y, width, height);
    context.restore();
  }

  function drawBlur(context, x, y, width, height, strength) {
    scratch.width = Math.max(1, Math.round(width));
    scratch.height = Math.max(1, Math.round(height));
    scratchContext.clearRect(0, 0, scratch.width, scratch.height);
    scratchContext.drawImage(context.canvas, x, y, width, height, 0, 0, scratch.width, scratch.height);

    context.save();
    context.filter = `blur(${clamp(strength, 1, 40)}px)`;
    context.drawImage(scratch, x, y, width, height);
    context.restore();
  }

  function pickFillSource(canvasWidth, canvasHeight, x, y, width, height) {
    const candidates = [
      { area: x * height, sx: Math.max(0, x - width), sy: y, sw: Math.min(width, x), sh: height },
      { area: (canvasWidth - x - width) * height, sx: x + width, sy: y, sw: Math.min(width, canvasWidth - x - width), sh: height },
      { area: y * width, sx: x, sy: Math.max(0, y - height), sw: width, sh: Math.min(height, y) },
      { area: (canvasHeight - y - height) * width, sx: x, sy: y + height, sw: width, sh: Math.min(height, canvasHeight - y - height) },
    ].filter(function (candidate) {
      return candidate.sw > 1 && candidate.sh > 1 && candidate.area > 0;
    });

    candidates.sort(function (left, right) {
      return right.area - left.area;
    });

    return candidates[0] || null;
  }

  function drawFill(context, x, y, width, height, strength) {
    const source = pickFillSource(context.canvas.width, context.canvas.height, x, y, width, height);
    if (!source) {
      drawBlur(context, x, y, width, height, strength);
      return;
    }

    scratch.width = Math.max(1, Math.round(width));
    scratch.height = Math.max(1, Math.round(height));
    scratchContext.clearRect(0, 0, scratch.width, scratch.height);
    scratchContext.drawImage(
      context.canvas,
      source.sx,
      source.sy,
      source.sw,
      source.sh,
      0,
      0,
      scratch.width,
      scratch.height
    );

    context.save();
    context.filter = `blur(${clamp(Math.round(strength / 2), 1, 18)}px)`;
    context.drawImage(scratch, x, y, width, height);
    context.restore();
  }

  function applyRepairs(context, width, height) {
    const strength = Number(strengthControl.value);

    regions.forEach(function (region) {
      const x = Math.round(region.x * width);
      const y = Math.round(region.y * height);
      const regionWidth = Math.max(1, Math.round(region.w * width));
      const regionHeight = Math.max(1, Math.round(region.h * height));

      if (repairMode === "mosaic") {
        drawMosaic(context, x, y, regionWidth, regionHeight, strength);
      } else if (repairMode === "fill") {
        drawFill(context, x, y, regionWidth, regionHeight, strength);
      } else {
        drawBlur(context, x, y, regionWidth, regionHeight, strength);
      }
    });
  }

  function drawRegionOutlines(context, width, height) {
    regions.forEach(function (region, index) {
      const active = region.id === activeRegionId;
      const x = Math.round(region.x * width);
      const y = Math.round(region.y * height);
      const regionWidth = Math.max(1, Math.round(region.w * width));
      const regionHeight = Math.max(1, Math.round(region.h * height));

      context.save();
      context.strokeStyle = active ? "rgba(57, 197, 182, 0.96)" : "rgba(227, 163, 59, 0.82)";
      context.lineWidth = Math.max(2, Math.round(width / 420));
      context.setLineDash(active ? [] : [8, 6]);
      context.strokeRect(x, y, regionWidth, regionHeight);
      context.fillStyle = active ? "rgba(57, 197, 182, 0.92)" : "rgba(227, 163, 59, 0.86)";
      context.fillRect(x, Math.max(0, y - 26), 92, 24);
      context.fillStyle = "#06100f";
      context.font = "700 14px Segoe UI, Microsoft YaHei, sans-serif";
      context.fillText(`${text("regionName")} ${index + 1}`, x + 8, Math.max(16, y - 8));
      context.restore();
    });
  }

  function drawFrame(targetCanvas, sourceVideo, includeOutlines) {
    const context = targetCanvas.getContext("2d");
    context.clearRect(0, 0, targetCanvas.width, targetCanvas.height);
    try {
      context.drawImage(sourceVideo, 0, 0, targetCanvas.width, targetCanvas.height);
      applyRepairs(context, targetCanvas.width, targetCanvas.height);
    } catch (error) {
      previewEmpty.hidden = false;
      previewEmpty.textContent = text("canvasBlocked");
      return;
    }

    if (includeOutlines) {
      drawRegionOutlines(context, targetCanvas.width, targetCanvas.height);
    }
  }

  function drawPreview() {
    if (!video.videoWidth || !canvas.width) {
      return;
    }
    drawFrame(canvas, video, true);
  }

  function drawPreviewWhenFrameReady() {
    if (video.readyState >= 2) {
      drawPreview();
      return;
    }

    video.addEventListener("loadeddata", drawPreview, { once: true });
  }

  function requestPreviewFrame() {
    cancelAnimationFrame(renderHandle);

    function loop() {
      if (!video.paused && !video.ended) {
        currentTime.textContent = formatTime(video.currentTime);
        seekControl.value = video.currentTime.toString();
        drawPreview();
        renderHandle = requestAnimationFrame(loop);
      }
    }

    renderHandle = requestAnimationFrame(loop);
  }

  function resetPlaybackState() {
    cancelAnimationFrame(renderHandle);
    video.pause();
    setPlayIcon(false);
    currentTime.textContent = "0:00";
    duration.textContent = "0:00";
    seekControl.value = "0";
    seekControl.max = "0";
  }

  function prepareLoadedSource(options) {
    const settings = options || {};
    resizePreviewCanvas();
    if (settings.createDefaultRegion) {
      regions = [createDefaultRegion()];
      activeRegionId = regions[0].id;
    }
    seekControl.max = video.duration.toString();
    duration.textContent = formatTime(video.duration);
    previewEmpty.hidden = true;
    dropzone.classList.add("is-compact");
    setControlsEnabled(true);
    updateFileSummary();
    updatePathSummary();
    renderRegionControls();
    drawPreviewWhenFrameReady();
    setStatus(settings.statusMessage || "", settings.statusKind || "success");
  }

  function loadVideo(nextFile) {
    if (!isVideoFile(nextFile)) {
      setStatus(text("pickVideo"), "error");
      return;
    }

    clearObjectUrl();

    file = nextFile;
    sourceMode = "local";
    remoteUrl = "";
    sourceName = nextFile.name;
    activeQueueId = null;
    regions = [];
    activeRegionId = null;
    objectUrl = URL.createObjectURL(nextFile);
    dropzone.classList.remove("is-compact");
    previewShell.hidden = false;
    playerBar.hidden = false;
    previewEmpty.hidden = false;
    previewEmpty.textContent = text("previewEmpty");
    video.removeAttribute("crossorigin");
    video.src = objectUrl;
    video.muted = false;
    resetPlaybackState();
    setControlsEnabled(false);
    updateFileSummary();
    updatePathSummary();
    renderRegionControls();
    setStatus(text("loading"));

    video.onloadedmetadata = function () {
      prepareLoadedSource({
        createDefaultRegion: true,
        statusMessage: text("loaded"),
      });
    };

    video.onerror = function () {
      const message = getDecodeErrorMessage(video);
      const detail = `${message} ${text("failurePreviewTip")}`;
      previewEmpty.hidden = false;
      previewEmpty.textContent = detail;
      setControlsEnabled(false);
      setStatus(detail, "error");
    };
  }

  function loadRemotePreview(url, label) {
    clearObjectUrl();
    file = null;
    sourceMode = "remote";
    remoteUrl = url;
    sourceName = label || getUrlFileName(url);
    regions = [];
    activeRegionId = null;
    dropzone.classList.remove("is-compact");
    previewShell.hidden = false;
    playerBar.hidden = false;
    previewEmpty.hidden = false;
    previewEmpty.textContent = text("previewEmpty");
    video.removeAttribute("crossorigin");
    video.src = url;
    video.muted = false;
    resetPlaybackState();
    setControlsEnabled(false);
    updateFileSummary();
    updatePathSummary();
    renderRegionControls();
    setStatus(text("previewLoading"));

    video.onloadedmetadata = function () {
      prepareLoadedSource({
        createDefaultRegion: false,
        statusMessage: text("remoteLoaded"),
      });

      const previewTime = Number.isFinite(video.duration) && video.duration > 0.3 ? 0.1 : 0;
      if (previewTime > 0) {
        video.currentTime = previewTime;
      }
    };

    video.onerror = function () {
      const message = getDecodeErrorMessage(video);
      const detail = `${message} ${text("failurePreviewTip")}`;
      previewEmpty.hidden = false;
      previewEmpty.textContent = detail;
      setControlsEnabled(false);
      setStatus(detail, "error");
    };
  }

  async function ensureProcessingResource() {
    if (sourceMode === "local" && file && objectUrl) {
      return true;
    }

    if (sourceMode !== "remote" || !remoteUrl) {
      setStatus(text("pickVideo"), "error");
      return false;
    }

    if (file && objectUrl) {
      return true;
    }

    isDownloadingOriginal = true;
    setControlsEnabled(false);
    exportProgress.hidden = false;
    exportProgress.removeAttribute("value");
    setStatus(`${text("downloadOriginal")} ${remoteUrl}`);

    try {
      const response = await fetch(remoteUrl, { mode: "cors" });
      if (!response.ok) {
        throw new Error(`${text("downloadBlocked")} (${response.status})`);
      }

      const blob = await response.blob();
      file = new File([blob], sourceName || getUrlFileName(remoteUrl), {
        type: blob.type || "video/mp4",
      });
      clearObjectUrl();
      objectUrl = URL.createObjectURL(file);

      const current = video.currentTime || 0;
      video.removeAttribute("crossorigin");
      video.src = objectUrl;
      await waitForMetadata(video);
      video.currentTime = Math.min(current, Math.max(0, video.duration - 0.05));
      resizePreviewCanvas();
      updateFileSummary();
      updatePathSummary();
      setStatus(text("downloadReady"), "success");
      drawPreviewWhenFrameReady();
      return true;
    } catch (error) {
      setStatus(`${error.message || text("downloadBlocked")} ${text("failureDownloadTip")}`, "error");
      return false;
    } finally {
      isDownloadingOriginal = false;
      exportProgress.hidden = true;
      exportProgress.value = 0;
      setControlsEnabled(hasSource());
    }
  }

  async function scanAddressForVideos(address) {
    if (isDouyinUrl(address)) {
      await resolveDouyinVideo(address);
      return;
    }

    if (isWechatArticleUrl(address)) {
      await resolveWechatVideo(address);
      return;
    }

    const addressUrl = extractFirstHttpUrl(address) || address;
    let parsed;

    try {
      parsed = new URL(addressUrl);
    } catch (error) {
      setStatus(text("pickUrl"), "error");
      renderDiscoveryFailure(text("pickUrl"), text("failureInputTip"));
      return;
    }

    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      setStatus(text("unsupportedUrl"), "error");
      renderDiscoveryFailure(text("unsupportedUrl"), text("failureInputTip"));
      return;
    }

    discoveredVideos = [];
    renderDiscoveredVideos();
    setStatus(text("scanningPage"));

    if (isLikelyVideoUrl(parsed.href)) {
      discoveredVideos = [createCandidate(parsed.href, getUrlFileName(parsed.href), text("directVideo"))];
      renderDiscoveredVideos();
      setStatus(`${text("scanFound")}：1`, "success");
      return;
    }

    try {
      const response = await fetch(parsed.href, { mode: "cors" });
      if (!response.ok) {
        throw new Error(`${text("scanBlocked")} (${response.status})`);
      }

      const html = await response.text();
      discoveredVideos = extractVideoCandidatesFromHtml(html, parsed.href);
      renderDiscoveredVideos();

      if (!discoveredVideos.length) {
        setStatus(text("scanEmpty"), "error");
        renderDiscoveryFailure(text("scanEmpty"), text("failureScanTip"));
        return;
      }

      setStatus(`${text("scanFound")}：${discoveredVideos.length}`, "success");
    } catch (error) {
      const message = error.message || text("scanBlocked");
      setStatus(message, "error");
      renderDiscoveryFailure(message, text("failureScanTip"));
    }
  }

  async function resolveDouyinVideo(shareText) {
    const shareUrl = extractFirstHttpUrl(shareText);
    if (!shareUrl) {
      setStatus(text("pickUrl"), "error");
      renderDiscoveryFailure(text("pickUrl"), text("failureInputTip"));
      return;
    }

    discoveredVideos = [];
    renderDiscoveredVideos();
    setStatus(text("resolvingDouyin"));

    try {
      const response = await fetch(getDouyinResolverEndpoint(), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ shareText: shareText }),
      });

      let payload = null;
      try {
        payload = await response.json();
      } catch (error) {
        payload = null;
      }

      if (!response.ok || !payload || payload.status !== "success") {
        const message = payload && payload.error ? payload.error : `${text("douyinBlocked")} (${response.status})`;
        throw new Error(message);
      }

      const candidateUrl = payload.proxy_url || payload.download_url;
      if (!candidateUrl) {
        throw new Error(text("douyinBlocked"));
      }

      discoveredVideos = [createCandidate(
        candidateUrl,
        payload.title || payload.video_id || getUrlFileName(candidateUrl),
        text("douyinSource")
      )];
      renderDiscoveredVideos();
      setStatus(`${text("douyinResolved")}：${payload.video_id || ""}`, "success");
    } catch (error) {
      const message = error && error.message ? error.message : text("douyinUnavailable");
      setStatus(message, "error");
      renderDiscoveryFailure(message, text("douyinUnavailable"));
    }
  }

  async function resolveWechatVideo(shareText) {
    const shareUrl = extractFirstHttpUrl(shareText);
    if (!shareUrl) {
      setStatus(text("pickUrl"), "error");
      renderDiscoveryFailure(text("pickUrl"), text("failureInputTip"));
      return;
    }

    discoveredVideos = [];
    renderDiscoveredVideos();
    setStatus(text("resolvingWechat"));

    try {
      const response = await fetch(getWechatResolverEndpoint(), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ shareText: shareText }),
      });

      let payload = null;
      try {
        payload = await response.json();
      } catch (error) {
        payload = null;
      }

      if (!response.ok || !payload || payload.status !== "success") {
        const message = payload && payload.error ? payload.error : `${text("wechatBlocked")} (${response.status})`;
        throw new Error(message);
      }

      const candidates = Array.isArray(payload.candidates) ? payload.candidates : [];
      discoveredVideos = candidates.map(function (candidate, index) {
        return createCandidate(
          candidate.proxy_url || candidate.download_url || candidate.url,
          candidate.title || candidate.video_id || `${text("wechatSource")} ${index + 1}`,
          candidate.source || text("wechatSource")
        );
      }).filter(function (candidate) {
        return Boolean(candidate.url);
      });

      if (!discoveredVideos.length && (payload.proxy_url || payload.download_url)) {
        discoveredVideos = [createCandidate(
          payload.proxy_url || payload.download_url,
          payload.title || payload.video_id || text("wechatSource"),
          text("wechatSource")
        )];
      }

      if (!discoveredVideos.length) {
        throw new Error(text("wechatBlocked"));
      }

      renderDiscoveredVideos();
      setStatus(`${text("wechatResolved")}：${discoveredVideos.length}`, "success");
    } catch (error) {
      const message = error && error.message ? error.message : text("wechatUnavailable");
      setStatus(message, "error");
      renderDiscoveryFailure(message, text("wechatUnavailable"));
    }
  }

  function getCanvasPoint(event) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: clamp((event.clientX - rect.left) / rect.width, 0, 1),
      y: clamp((event.clientY - rect.top) / rect.height, 0, 1),
    };
  }

  function updateActiveRegionFromInputs() {
    const region = getActiveRegion();
    if (!region) {
      return;
    }

    region.x = Number(regionInputs.x.value) / 100;
    region.y = Number(regionInputs.y.value) / 100;
    region.w = Number(regionInputs.w.value) / 100;
    region.h = Number(regionInputs.h.value) / 100;
    normalizeRegion(region);
    updateRegionInputs();
    renderRegionControls();
    drawPreview();
  }

  function downloadBlob(blob, name) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = name;
    document.body.append(link);
    link.click();
    link.remove();
    window.setTimeout(function () {
      URL.revokeObjectURL(url);
    }, 1000);
  }

  function attachAudioTrack(stream, processingVideo) {
    if (!audioToggle.checked) {
      return null;
    }

    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) {
      return null;
    }

    try {
      const audioContext = new AudioContext();
      const source = audioContext.createMediaElementSource(processingVideo);
      const destination = audioContext.createMediaStreamDestination();
      source.connect(destination);
      destination.stream.getAudioTracks().forEach(function (track) {
        stream.addTrack(track);
      });
      return audioContext;
    } catch (error) {
      setStatus(text("audioFallback"));
      return null;
    }
  }

  async function waitForMetadata(media) {
    if (media.readyState >= 1) {
      return;
    }

    await new Promise(function (resolve, reject) {
      media.addEventListener("loadedmetadata", resolve, { once: true });
      media.addEventListener("error", function () {
        reject(new Error(getDecodeErrorMessage(media)));
      }, { once: true });
    });
  }

  async function exportVideo() {
    if (!(await ensureProcessingResource())) {
      return;
    }

    const format = getSelectedFormat();
    if (!file || !format) {
      setStatus(text("noFormat"), "error");
      return;
    }

    const processingVideo = document.createElement("video");
    const exportCanvas = document.createElement("canvas");
    const fps = Number(fpsSelect.value) || 30;
    const chunks = [];
    let audioContext = null;
    let recorder = null;
    let stopped = false;

    isExporting = true;
    setControlsEnabled(false);
    exportProgress.hidden = false;
    exportProgress.value = 0;
    setStatus(`${text("exporting")} 0%`);

    try {
      video.pause();
      setPlayIcon(false);
      processingVideo.src = objectUrl;
      processingVideo.preload = "auto";
      processingVideo.playsInline = true;
      await waitForMetadata(processingVideo);

      exportCanvas.width = processingVideo.videoWidth;
      exportCanvas.height = processingVideo.videoHeight;
      const stream = exportCanvas.captureStream(fps);
      audioContext = attachAudioTrack(stream, processingVideo);
      recorder = new MediaRecorder(stream, { mimeType: format.mime });

      const finished = new Promise(function (resolve, reject) {
        recorder.addEventListener("dataavailable", function (event) {
          if (event.data && event.data.size > 0) {
            chunks.push(event.data);
          }
        });
        recorder.addEventListener("stop", resolve);
        recorder.addEventListener("error", function (event) {
          reject(event.error || new Error(text("exportFailed")));
        });
      });

      function renderExportFrame() {
        drawFrame(exportCanvas, processingVideo, false);
        const progress = processingVideo.duration
          ? clamp(processingVideo.currentTime / processingVideo.duration, 0, 1)
          : 0;
        exportProgress.value = progress;
        setStatus(`${text("exporting")} ${Math.round(progress * 100)}%`);

        if (!stopped && !processingVideo.ended) {
          if (processingVideo.requestVideoFrameCallback) {
            processingVideo.requestVideoFrameCallback(renderExportFrame);
          } else {
            requestAnimationFrame(renderExportFrame);
          }
        }
      }

      processingVideo.addEventListener("ended", function () {
        stopped = true;
        drawFrame(exportCanvas, processingVideo, false);
        if (recorder && recorder.state !== "inactive") {
          recorder.stop();
        }
      }, { once: true });

      recorder.start(1000);
      drawFrame(exportCanvas, processingVideo, false);
      renderExportFrame();

      if (audioContext && audioContext.state === "suspended") {
        await audioContext.resume();
      }
      await processingVideo.play();
      await finished;

      stream.getTracks().forEach(function (track) {
        track.stop();
      });
      if (audioContext) {
        await audioContext.close();
      }

      const blob = new Blob(chunks, { type: recorder.mimeType || format.mime });
      const baseName = file.name.replace(/\.[^.]+$/, "") || "video";
      downloadBlob(blob, `${baseName}-watermark-removed.${format.ext}`);
      exportProgress.value = 1;
      setStatus(`${text("exported")}${formatBytes(blob.size)}`, "success");
    } catch (error) {
      if (recorder && recorder.state !== "inactive") {
        recorder.stop();
      }
      if (audioContext) {
        await audioContext.close().catch(function () {
          return undefined;
        });
      }
      setStatus(error.message || text("exportFailed"), "error");
    } finally {
      processingVideo.pause();
      processingVideo.removeAttribute("src");
      processingVideo.load();
      isExporting = false;
      setControlsEnabled(hasSource() && Boolean(supportedFormats.length));
      window.setTimeout(function () {
        if (!isExporting) {
          exportProgress.hidden = true;
        }
      }, 900);
    }
  }

  input.addEventListener("change", function (event) {
    const nextFile = event.target.files && event.target.files[0];
    if (nextFile) {
      loadVideo(nextFile);
    }
  });

  urlForm.addEventListener("submit", function (event) {
    event.preventDefault();
    const value = urlInput.value.trim();

    scanAddressForVideos(value);
  });

  addDiscoveredButton.addEventListener("click", queueSelectedVideos);

  ["dragenter", "dragover"].forEach(function (eventName) {
    dropzone.addEventListener(eventName, function (event) {
      event.preventDefault();
      dropzone.classList.add("is-dragging");
    });
  });

  ["dragleave", "drop"].forEach(function (eventName) {
    dropzone.addEventListener(eventName, function (event) {
      event.preventDefault();
      dropzone.classList.remove("is-dragging");
    });
  });

  dropzone.addEventListener("drop", function (event) {
    const nextFile = event.dataTransfer.files && event.dataTransfer.files[0];
    if (nextFile) {
      loadVideo(nextFile);
    }
  });

  playToggle.addEventListener("click", async function () {
    if (!hasSource()) {
      return;
    }

    if (video.paused) {
      setPlayIcon(true);
      await video.play().catch(function (error) {
        setStatus(error.message, "error");
      });
      requestPreviewFrame();
      return;
    }

    video.pause();
    setPlayIcon(false);
    drawPreview();
  });

  video.addEventListener("timeupdate", function () {
    currentTime.textContent = formatTime(video.currentTime);
    seekControl.value = video.currentTime.toString();
  });

  video.addEventListener("ended", function () {
    setPlayIcon(false);
    drawPreview();
  });

  seekControl.addEventListener("input", function () {
    video.currentTime = Number(seekControl.value);
    currentTime.textContent = formatTime(video.currentTime);
    drawPreview();
  });

  addRegionButton.addEventListener("click", function () {
    ensureProcessingResource().then(function (ready) {
      if (!ready) {
        return;
      }

      const region = createDefaultRegion();
      regions.push(region);
      activeRegionId = region.id;
      renderRegionControls();
      drawPreview();
    });
  });

  Object.keys(regionInputs).forEach(function (key) {
    regionInputs[key].addEventListener("change", updateActiveRegionFromInputs);
    regionInputs[key].addEventListener("input", updateActiveRegionFromInputs);
  });

  modeButtons.forEach(function (button) {
    button.addEventListener("click", function () {
      repairMode = button.dataset.mode;
      modeButtons.forEach(function (candidate) {
        candidate.classList.toggle("is-active", candidate === button);
      });
      drawPreview();
    });
  });

  strengthControl.addEventListener("input", function () {
    strengthValue.textContent = strengthControl.value;
    drawPreview();
  });

  canvas.addEventListener("pointerdown", async function (event) {
    if (!hasSource() || isExporting || isDownloadingOriginal) {
      return;
    }

    const point = getCanvasPoint(event);
    if (!(await ensureProcessingResource())) {
      return;
    }

    let region = getActiveRegion();
    if (!region) {
      region = createDefaultRegion();
      regions.push(region);
      activeRegionId = region.id;
    }

    dragging = {
      region: region,
      startX: point.x,
      startY: point.y,
    };
    region.x = point.x;
    region.y = point.y;
    region.w = 0.01;
    region.h = 0.01;
    try {
      canvas.setPointerCapture(event.pointerId);
    } catch (error) {
      dragging = null;
    }
    renderRegionControls();
    drawPreview();
  });

  canvas.addEventListener("pointermove", function (event) {
    if (!dragging) {
      return;
    }

    const point = getCanvasPoint(event);
    const region = dragging.region;
    region.x = Math.min(dragging.startX, point.x);
    region.y = Math.min(dragging.startY, point.y);
    region.w = Math.abs(point.x - dragging.startX);
    region.h = Math.abs(point.y - dragging.startY);
    normalizeRegion(region);
    updateRegionInputs();
    renderRegionControls();
    drawPreview();
  });

  canvas.addEventListener("pointerup", function (event) {
    if (!dragging) {
      return;
    }

    const region = dragging.region;
    if (region.w < 0.015 || region.h < 0.015) {
      region.w = 0.18;
      region.h = 0.1;
      normalizeRegion(region);
    }

    dragging = null;
    try {
      canvas.releasePointerCapture(event.pointerId);
    } catch (error) {
      // Pointer capture may already be gone after a delayed remote download.
    }
    renderRegionControls();
    drawPreview();
  });

  canvas.addEventListener("pointercancel", function () {
    dragging = null;
  });

  exportButton.addEventListener("click", exportVideo);
  window.addEventListener("resize", drawPreview);
  window.addEventListener("wk:language-change", applyTranslations);
  window.addEventListener("beforeunload", function () {
    clearObjectUrl();
  });

  renderFormatOptions();
  renderRegionControls();
  setControlsEnabled(false);
  setPlayIcon(false);
  applyTranslations();

  const initialSource = new URLSearchParams(window.location.search).get("source");
  if (initialSource) {
    urlInput.value = initialSource;
    scanAddressForVideos(initialSource);
  }
})();
