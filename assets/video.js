(function () {
  const input = document.getElementById("video-input");
  const dropzone = document.getElementById("video-dropzone");
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
      previewEmpty: "正在准备视频预览",
      fileLabel: "当前文件",
      fileEmpty: "尚未选择视频",
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
      loaded: "视频已载入。可拖拽画面框选水印区域。",
      decodeError: "当前浏览器无法解码这个视频格式或编码。",
      pickVideo: "请选择视频文件。",
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
      previewEmpty: "Preparing video preview",
      fileLabel: "Current file",
      fileEmpty: "No video selected",
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
      loaded: "Video loaded. Drag on the frame to mark a watermark region.",
      decodeError: "This browser cannot decode the selected video format or codec.",
      pickVideo: "Choose a video file.",
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
  let regions = [];
  let activeRegionId = null;
  let repairMode = "blur";
  let renderHandle = 0;
  let dragging = null;
  let supportedFormats = [];
  let isExporting = false;

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
    document.title = text("metaTitle");
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute("content", text("metaDescription"));
    }
    setPlayIcon(!video.paused);
    renderFormatOptions();
    renderRegionControls();
    updateFileSummary();
  }

  function setControlsEnabled(enabled) {
    addRegionButton.disabled = !enabled || isExporting;
    Object.keys(regionInputs).forEach(function (key) {
      regionInputs[key].disabled = !enabled || !getActiveRegion() || isExporting;
    });
    strengthControl.disabled = !enabled || isExporting;
    formatSelect.disabled = !enabled || !supportedFormats.length || isExporting;
    fpsSelect.disabled = !enabled || isExporting;
    audioToggle.disabled = !enabled || isExporting;
    exportButton.disabled = !enabled || !supportedFormats.length || isExporting;
  }

  function updateFileSummary() {
    const label = fileSummary.querySelector("strong");
    if (!file || !video.videoWidth) {
      label.textContent = text("fileEmpty");
      fileMeta.textContent = "--";
      return;
    }

    label.textContent = file.name;
    fileMeta.textContent = `${text("sizeLabel")} ${video.videoWidth}x${video.videoHeight} · ${text("durationLabel")} ${formatTime(video.duration)} · ${formatBytes(file.size)}`;
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
      setControlsEnabled(Boolean(file));
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
    setControlsEnabled(Boolean(file));
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
    context.drawImage(sourceVideo, 0, 0, targetCanvas.width, targetCanvas.height);
    applyRepairs(context, targetCanvas.width, targetCanvas.height);

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

  function loadVideo(nextFile) {
    if (!isVideoFile(nextFile)) {
      setStatus(text("pickVideo"), "error");
      return;
    }

    if (objectUrl) {
      URL.revokeObjectURL(objectUrl);
    }

    file = nextFile;
    regions = [];
    activeRegionId = null;
    objectUrl = URL.createObjectURL(nextFile);
    dropzone.classList.remove("is-compact");
    previewShell.hidden = false;
    playerBar.hidden = false;
    previewEmpty.hidden = false;
    video.src = objectUrl;
    video.muted = false;
    video.currentTime = 0;
    currentTime.textContent = "0:00";
    duration.textContent = "0:00";
    seekControl.value = "0";
    seekControl.max = "0";
    setControlsEnabled(false);
    updateFileSummary();
    renderRegionControls();
    setStatus(text("loading"));

    video.onloadedmetadata = function () {
      resizePreviewCanvas();
      regions = [createDefaultRegion()];
      activeRegionId = regions[0].id;
      seekControl.max = video.duration.toString();
      duration.textContent = formatTime(video.duration);
      previewEmpty.hidden = true;
      dropzone.classList.add("is-compact");
      setControlsEnabled(true);
      updateFileSummary();
      renderRegionControls();
      drawPreview();
      setStatus(text("loaded"), "success");
    };

    video.onerror = function () {
      previewEmpty.hidden = false;
      previewEmpty.textContent = text("decodeError");
      setControlsEnabled(false);
      setStatus(text("decodeError"), "error");
    };
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
        reject(new Error(text("decodeError")));
      }, { once: true });
    });
  }

  async function exportVideo() {
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
      processingVideo.crossOrigin = "anonymous";
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
      setControlsEnabled(Boolean(file && supportedFormats.length));
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
    if (!file) {
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
    const region = createDefaultRegion();
    regions.push(region);
    activeRegionId = region.id;
    renderRegionControls();
    drawPreview();
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

  canvas.addEventListener("pointerdown", function (event) {
    if (!file || isExporting) {
      return;
    }

    const point = getCanvasPoint(event);
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
    canvas.setPointerCapture(event.pointerId);
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
    canvas.releasePointerCapture(event.pointerId);
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
    if (objectUrl) {
      URL.revokeObjectURL(objectUrl);
    }
  });

  renderFormatOptions();
  renderRegionControls();
  setControlsEnabled(false);
  setPlayIcon(false);
  applyTranslations();
})();
