(function () {
  const supportedPlatforms = ["Windows", "macOS", "Android", "iOS"];

  function byId(id) {
    return document.getElementById(id);
  }

  function text(id, value) {
    const node = byId(id);
    if (node) {
      node.textContent = value;
    }
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
    const cores = navigator.hardwareConcurrency ? `${navigator.hardwareConcurrency} cores` : "cores unavailable";
    const memory = navigator.deviceMemory ? `${navigator.deviceMemory} GB memory` : "memory unavailable";
    const network = navigator.onLine ? "online" : "offline";
    return `${cores} / ${memory} / ${network}`;
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
  window.addEventListener("resize", render);
})();
