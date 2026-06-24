(function () {
  const supportedPlatforms = ["Windows", "macOS", "Android", "iOS"];
  const monitorIntervalMs = 5000;

  function byId(id) {
    return document.getElementById(id);
  }

  function text(id, value) {
    const node = byId(id);
    if (node) {
      node.textContent = value;
    }
  }

  function meter(id, value) {
    const node = byId(id);
    if (node) {
      node.style.width = `${Math.max(0, Math.min(100, value))}%`;
    }
  }

  function formatBytes(bytes) {
    if (!Number.isFinite(bytes) || bytes <= 0) {
      return "不可用";
    }
    const units = ["B", "KB", "MB", "GB", "TB"];
    let value = bytes;
    let unitIndex = 0;
    while (value >= 1024 && unitIndex < units.length - 1) {
      value /= 1024;
      unitIndex += 1;
    }
    return `${value.toFixed(value >= 10 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
  }

  function getNavigatorData() {
    const ua = navigator.userAgent || "";
    const platform = navigator.userAgentData
      ? navigator.userAgentData.platform || ""
      : navigator.platform || "";
    const maxTouchPoints = navigator.maxTouchPoints || 0;

    return { ua, platform, maxTouchPoints };
  }

  function detectOS() {
    const { ua, platform, maxTouchPoints } = getNavigatorData();
    const source = `${platform} ${ua}`.toLowerCase();

    if (/android/.test(source)) {
      return "Android";
    }
    if (/iphone|ipad|ipod/.test(source)) {
      return "iOS";
    }
    if (/mac/.test(source) && maxTouchPoints > 1) {
      return "iOS";
    }
    if (/mac/.test(source)) {
      return "macOS";
    }
    if (/win/.test(source)) {
      return "Windows";
    }
    if (/linux/.test(source)) {
      return "Linux";
    }
    return "Unknown";
  }

  function detectBrowser() {
    const ua = navigator.userAgent || "";

    if (/Edg\//.test(ua)) {
      return "Microsoft Edge";
    }
    if (/OPR\//.test(ua)) {
      return "Opera";
    }
    if (/CriOS\//.test(ua)) {
      return "Chrome iOS";
    }
    if (/Chrome\//.test(ua)) {
      return "Chrome";
    }
    if (/FxiOS\//.test(ua)) {
      return "Firefox iOS";
    }
    if (/Firefox\//.test(ua)) {
      return "Firefox";
    }
    if (/Safari\//.test(ua)) {
      return "Safari";
    }
    return "Unknown";
  }

  function detectDevice(os) {
    const { ua, maxTouchPoints } = getNavigatorData();
    const isMobile = /mobile|iphone|ipod|android/i.test(ua);
    const isTablet = /ipad|tablet/i.test(ua) || (os === "iOS" && maxTouchPoints > 1 && !/iphone/i.test(ua));

    if (isTablet) {
      return "Tablet";
    }
    if (isMobile) {
      return "Mobile";
    }
    return maxTouchPoints > 0 ? "Touch desktop" : "Desktop";
  }

  function getRuntimeInfo() {
    const cores = navigator.hardwareConcurrency ? `${navigator.hardwareConcurrency} 核心` : "核心数不可用";
    const memory = navigator.deviceMemory ? `${navigator.deviceMemory} GB 内存` : "内存信息不可用";
    const network = navigator.onLine ? "在线" : "离线";
    return `${cores} / ${memory} / ${network}`;
  }

  function getGpuInfo() {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
    if (!gl) {
      return { title: "WebGL 不可用", detail: "浏览器没有暴露 GPU 渲染器信息。", level: 0 };
    }

    const debugInfo = gl.getExtension("WEBGL_debug_renderer_info");
    const vendor = debugInfo ? gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) : gl.getParameter(gl.VENDOR);
    const renderer = debugInfo ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);

    return {
      title: vendor || "GPU",
      detail: renderer || "浏览器隐藏了具体显卡型号。",
      level: debugInfo ? 86 : 48,
    };
  }

  function renderCpuMonitor() {
    const cores = navigator.hardwareConcurrency || 0;
    text("control-cpu-title", cores ? `${cores} 逻辑核心` : "不可用");
    text(
      "control-cpu-detail",
      cores
        ? "浏览器可读取逻辑核心数量；CPU 型号、温度、实时占用率需要 Windows 本地代理。"
        : "当前浏览器没有暴露 CPU 核心数量。"
    );
    meter("control-cpu-meter", cores ? Math.min(100, cores * 6.25) : 0);
  }

  function renderGpuMonitor() {
    const gpu = getGpuInfo();
    text("control-gpu-title", gpu.title);
    text("control-gpu-detail", gpu.detail);
    meter("control-gpu-meter", gpu.level);
  }

  function renderMemoryMonitor() {
    const memory = performance.memory;
    const deviceMemory = navigator.deviceMemory ? `${navigator.deviceMemory} GB` : "系统内存不可用";

    if (memory) {
      const used = memory.usedJSHeapSize;
      const limit = memory.jsHeapSizeLimit;
      const percent = limit ? (used / limit) * 100 : 0;
      text("control-memory-title", `${formatBytes(used)} JS Heap`);
      text("control-memory-detail", `JS Heap 上限 ${formatBytes(limit)}，设备内存 ${deviceMemory}。系统总内存和进程外占用需要本地代理。`);
      meter("control-memory-meter", percent);
      return;
    }

    text("control-memory-title", deviceMemory);
    text("control-memory-detail", "当前浏览器没有暴露 JS Heap 使用情况；系统级内存占用需要本地代理。");
    meter("control-memory-meter", navigator.deviceMemory ? 42 : 0);
  }

  async function renderDiskMonitor() {
    if (!navigator.storage || !navigator.storage.estimate) {
      text("control-disk-title", "不可用");
      text("control-disk-detail", "当前浏览器不支持 Storage Estimate API，无法估算站点存储配额。");
      meter("control-disk-meter", 0);
      return;
    }

    try {
      const estimate = await navigator.storage.estimate();
      const usage = estimate.usage || 0;
      const quota = estimate.quota || 0;
      const percent = quota ? (usage / quota) * 100 : 0;
      text("control-disk-title", `${formatBytes(usage)} / ${formatBytes(quota)}`);
      text("control-disk-detail", "这是当前站点的浏览器存储估算，不是 Windows 物理磁盘容量或分区信息。");
      meter("control-disk-meter", percent);
    } catch (error) {
      text("control-disk-title", "读取失败");
      text("control-disk-detail", "浏览器拒绝读取站点存储估算。");
      meter("control-disk-meter", 0);
    }
  }

  function renderNetworkMonitor() {
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    const online = navigator.onLine;
    const type = connection && connection.effectiveType ? connection.effectiveType.toUpperCase() : "未知类型";
    const downlink = connection && Number.isFinite(connection.downlink) ? `${connection.downlink} Mbps` : "带宽不可用";
    const rtt = connection && Number.isFinite(connection.rtt) ? `${connection.rtt} ms RTT` : "RTT 不可用";

    text("control-network-title", online ? "在线" : "离线");
    text("control-network-detail", `${type} / ${downlink} / ${rtt}`);
    meter("control-network-meter", online ? 78 : 8);
  }

  function renderSensorMonitor() {
    text("control-sensor-title", "需要本地代理");
    text("control-sensor-detail", "风扇转速、硬盘温度、SMART、物理磁盘读写和 CPU 占用率不能由普通 Web 页面直接读取。");
    meter("control-sensor-meter", 18);
  }

  async function renderMonitors() {
    renderCpuMonitor();
    renderGpuMonitor();
    renderMemoryMonitor();
    renderNetworkMonitor();
    renderSensorMonitor();
    await renderDiskMonitor();
  }

  function renderSupport(os) {
    document.querySelectorAll(".control-support-card").forEach((card) => {
      card.classList.toggle("is-current", card.dataset.platform === os);
    });
  }

  function render() {
    const os = detectOS();
    const browser = detectBrowser();
    const device = detectDevice(os);
    const supported = supportedPlatforms.includes(os);
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "unknown timezone";
    const language = navigator.language || "unknown language";
    const viewport = `${window.innerWidth} x ${window.innerHeight} / DPR ${window.devicePixelRatio || 1}`;

    text("control-current-badge", supported ? `${os} 已支持` : `${os} 未列入支持`);
    text("control-system-mark", os === "Unknown" ? "OS" : os.slice(0, 3));
    text("control-system-summary", `${device} device running ${os} with ${browser}.`);
    text("control-os", os);
    text("control-browser", browser);
    text("control-device", device);
    text("control-viewport", viewport);
    text("control-locale", `${language} / ${timezone}`);
    text("control-runtime", getRuntimeInfo());
    text(
      "control-status",
      supported
        ? `当前系统 ${os} 在支持环境内。`
        : `当前系统 ${os} 未列入 Windows、macOS、Android、iOS 支持范围。`
    );

    renderSupport(os);
  }

  render();
  renderMonitors();
  window.addEventListener("resize", render);
  window.addEventListener("online", renderNetworkMonitor);
  window.addEventListener("offline", renderNetworkMonitor);
  setInterval(renderMonitors, monitorIntervalMs);
})();
