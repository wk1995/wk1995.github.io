(function () {
  const text = {
    zh: {
      title: "App 详情",
      loading: "读取安装包清单中。",
      back: "返回列表",
      readmeTitle: "项目介绍",
      readmeKicker: "About",
      versionsTitle: "版本动态",
      versionsKicker: "Release activity",
      notFound: "没有找到这个 App。",
      noReadme: "项目暂未提供 README，可从左侧版本动态中选择最新或历史安装包。",
      download: "下载",
      downloadLatest: "下载最新版本",
      latestVersion: "最新版本",
      latestBadge: "当前版本",
      releaseState: "持续发布",
      scanDownload: "扫码下载",
      packageName: "包名",
      platform: "平台",
      packageSize: "安装包大小",
      availableBuilds: "可用版本",
      buildUnit: " 个版本",
      distributionSummary: "{platform} 持续集成构建，可直接获取最新版本或选择历史安装包。",
      updated: "更新",
      size: "大小",
      fileType: "类型",
      platformAndroid: "Android",
      platformIos: "iOS",
      platformHarmony: "HarmonyOS",
      platformWindows: "Windows",
      platformMacos: "macOS",
      platformLinux: "Linux",
      platformWeb: "Web",
      platformOther: "其他平台",
    },
    en: {
      title: "App details",
      loading: "Reading the package manifest.",
      back: "Back to list",
      readmeTitle: "Project README",
      readmeKicker: "About",
      versionsTitle: "Release activity",
      versionsKicker: "Release activity",
      notFound: "This app was not found.",
      noReadme: "No README is available yet. Choose the latest or an earlier package from the release activity.",
      download: "Download",
      downloadLatest: "Download latest",
      latestVersion: "Latest release",
      latestBadge: "Current",
      releaseState: "Continuously published",
      scanDownload: "Scan to download",
      packageName: "Package",
      platform: "Platform",
      packageSize: "Package size",
      availableBuilds: "Available builds",
      buildUnit: " builds",
      distributionSummary: "Continuously delivered {platform} builds. Download the latest release or choose an earlier package.",
      updated: "Updated",
      size: "Size",
      fileType: "Type",
      platformAndroid: "Android",
      platformIos: "iOS",
      platformHarmony: "HarmonyOS",
      platformWindows: "Windows",
      platformMacos: "macOS",
      platformLinux: "Linux",
      platformWeb: "Web",
      platformOther: "Other",
    },
  };

  const PLATFORMS = [
    { id: "android", textKey: "platformAndroid", defaultBasePath: "packages/android/", extensions: ["apk", "aab"] },
    { id: "ios", textKey: "platformIos", defaultBasePath: "packages/ios/", extensions: ["ipa"] },
    { id: "harmony", textKey: "platformHarmony", defaultBasePath: "packages/harmony/", extensions: ["hap", "app"] },
    { id: "windows", textKey: "platformWindows", defaultBasePath: "packages/windows/", extensions: ["exe", "msi", "msix", "appx"] },
    { id: "macos", textKey: "platformMacos", defaultBasePath: "packages/macos/", extensions: ["dmg", "pkg"] },
    { id: "linux", textKey: "platformLinux", defaultBasePath: "packages/linux/", extensions: ["deb", "rpm", "appimage"] },
    { id: "web", textKey: "platformWeb", defaultBasePath: "packages/web/", extensions: ["html", "zip"] },
    { id: "other", textKey: "platformOther", defaultBasePath: "packages/other/", extensions: [] },
  ];
  const PLATFORM_ALIASES = {
    android: "android",
    apk: "android",
    aab: "android",
    ios: "ios",
    ipa: "ios",
    harmony: "harmony",
    harmonyos: "harmony",
    ohos: "harmony",
    hap: "harmony",
    windows: "windows",
    window: "windows",
    win: "windows",
    mac: "macos",
    macos: "macos",
    linux: "linux",
    web: "web",
    other: "other",
  };

  const refs = {};
  const state = {
    app: null,
    manifest: { apps: [] },
    error: "",
  };

  function lang() {
    return window.WKSite && typeof window.WKSite.getLanguage === "function"
      ? window.WKSite.getLanguage()
      : "zh";
  }

  function t(key) {
    const language = lang();
    return (text[language] && text[language][key]) || text.zh[key] || key;
  }

  function platformMeta(id) {
    return PLATFORMS.find(function (item) { return item.id === id; }) || PLATFORMS[PLATFORMS.length - 1];
  }

  function platformLabel(id) {
    return t(platformMeta(id).textKey);
  }

  function normalizePlatform(value) {
    const raw = String(value || "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "");
    return PLATFORM_ALIASES[raw] || "";
  }

  function platformFromFile(value) {
    const clean = String(value || "").split("?")[0].split("#")[0].toLowerCase();
    const match = clean.match(/\.([a-z0-9]+)$/);
    const extension = match ? match[1] : "";
    const byExtension = PLATFORMS.find(function (item) {
      return item.extensions.indexOf(extension) !== -1;
    });
    return byExtension ? byExtension.id : "";
  }

  function normalizeFiles(rawFiles) {
    return (Array.isArray(rawFiles) ? rawFiles : [])
      .map(function (item) {
        if (typeof item === "string") {
          return { file: item, url: "", type: item.split(".").pop() || "file", size: "", updatedAt: "" };
        }
        if (!item || typeof item !== "object") {
          return null;
        }
        const file = typeof item.file === "string" ? item.file.trim() : "";
        const url = typeof item.url === "string" ? item.url.trim() : "";
        if (!file && !url) {
          return null;
        }
        return {
          file: file,
          url: url,
          type: typeof item.type === "string" ? item.type.trim() : (file.split(".").pop() || "file"),
          size: typeof item.size === "string" ? item.size.trim() : "",
          updatedAt: typeof item.updatedAt === "string" ? item.updatedAt.trim() : "",
        };
      })
      .filter(Boolean);
  }

  function normalizeRelease(source, context, fallbackVersion) {
    const item = source || {};
    const files = normalizeFiles(item.files);
    const file = typeof item.file === "string" ? item.file.trim() : "";
    const url = typeof item.url === "string" ? item.url.trim() : "";
    if (!files.length && (file || url)) {
      files.push({ file: file, url: url, type: file.split(".").pop() || "file", size: item.size || "", updatedAt: item.updatedAt || "" });
    }
    if (!files.length) {
      return null;
    }
    return {
      version: typeof item.version === "string" && item.version.trim() ? item.version.trim() : fallbackVersion || "latest",
      basePath: typeof item.basePath === "string" && item.basePath.trim() ? item.basePath.trim() : context.basePath,
      file: file || files[0].file || "",
      url: url || files[0].url || "",
      files: files,
      readme: typeof item.readme === "string" ? item.readme : "",
      readmeFile: typeof item.readmeFile === "string" ? item.readmeFile : "",
      updatedAt: typeof item.updatedAt === "string" ? item.updatedAt.trim() : (files[0].updatedAt || ""),
    };
  }

  function normalizeReleases(source, context) {
    const releases = [];
    (Array.isArray(source.versions) ? source.versions : []).forEach(function (item, index) {
      const release = normalizeRelease(item, context, "v" + (index + 1));
      if (release) {
        releases.push(release);
      }
    });
    const latest = normalizeRelease(source.latest, context, "latest");
    if (latest && !releases.some(function (item) {
      return item.version === latest.version && item.basePath === latest.basePath && item.file === latest.file;
    })) {
      releases.push(latest);
    }
    const legacy = normalizeRelease(source, context, source.version || "latest");
    if (legacy && !releases.length) {
      releases.push(legacy);
    }
    return releases;
  }

  function productNameFromFile(value) {
    const fileName = String(value || "").split(/[\\/]/).pop().replace(/\.[^.]+$/, "");
    const platformBuild = fileName.match(/^(.+?)[-_ ](?:windows?|mac(?:os)?|linux)[-_ ]v?\d.*$/i);
    const match = platformBuild || fileName.match(/^(.+?)(?:[-_ ]v?\d[\d._-]*)$/i);
    return (match ? match[1] : fileName).replace(/[-_]+/g, " ").trim();
  }

  function normalizeApp(item, index) {
    const source = item || {};
    const id = typeof source.id === "string" && source.id.trim() ? source.id.trim() : "";
    const platformId = normalizePlatform(source.platform) || normalizePlatform(source.platformId) || platformFromFile(source.file || id) || "other";
    const basePath = typeof source.basePath === "string" && source.basePath.trim()
      ? source.basePath.trim()
      : platformMeta(platformId).defaultBasePath;
    const versions = normalizeReleases(source, { basePath: basePath });
    const latest = normalizeRelease(source.latest, { basePath: basePath }, "latest") || versions[versions.length - 1] || null;
    let name = typeof source.name === "string" && source.name.trim() ? source.name.trim() : id.split("/").pop() || "App";
    const packageName = id.split("/").pop() || "";
    const inferredProductName = productNameFromFile(latest && latest.file);
    if (name.toLowerCase() === packageName.toLowerCase() && inferredProductName) {
      name = inferredProductName;
    }
    if (!latest) {
      return null;
    }
    return {
      id: id || platformId + "-app-" + index,
      name: name,
      slug: typeof source.slug === "string" ? source.slug.trim() : "",
      platformId: platformId,
      description: typeof source.description === "string" ? source.description.trim() : "",
      readme: typeof source.readme === "string" ? source.readme : "",
      latest: latest,
      versions: versions.length ? versions : [latest],
    };
  }

  function normalizeManifest(raw) {
    return {
      apps: (Array.isArray(raw.apps) ? raw.apps : [])
        .map(normalizeApp)
        .filter(Boolean),
    };
  }

  function appRelativeBase(path) {
    const value = path || "packages/";
    if (/^(https?:)?\/\//.test(value) || value.charAt(0) === "/") {
      return new URL(value, window.location.href);
    }
    return new URL("../" + value.replace(/^\.\//, ""), window.location.href);
  }

  function fileUrl(app, release, file) {
    if (file.url) {
      return new URL(file.url, window.location.href).href;
    }
    const base = appRelativeBase(release.basePath || app.latest.basePath || "packages/");
    return new URL(file.file, base).href;
  }

  function cacheFreshUrl(path) {
    const url = new URL(path, window.location.href);
    url.searchParams.set("_", String(Date.now()));
    return url.href;
  }

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function inlineMarkdown(value) {
    return escapeHtml(value)
      .replace(/`([^`]+)`/g, "<code>$1</code>")
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  }

  function renderMarkdown(content) {
    const value = String(content || "").trim();
    if (!value) {
      refs.readme.innerHTML = "<p>" + t("noReadme") + "</p>";
      return;
    }
    const html = [];
    let listOpen = false;
    value.split(/\r?\n/).forEach(function (line) {
      const trimmed = line.trim();
      if (!trimmed) {
        if (listOpen) {
          html.push("</ul>");
          listOpen = false;
        }
        return;
      }
      const heading = trimmed.match(/^(#{1,3})\s+(.+)$/);
      if (heading) {
        if (listOpen) {
          html.push("</ul>");
          listOpen = false;
        }
        html.push("<h" + heading[1].length + ">" + inlineMarkdown(heading[2]) + "</h" + heading[1].length + ">");
        return;
      }
      const bullet = trimmed.match(/^[-*]\s+(.+)$/);
      if (bullet) {
        if (!listOpen) {
          html.push("<ul>");
          listOpen = true;
        }
        html.push("<li>" + inlineMarkdown(bullet[1]) + "</li>");
        return;
      }
      if (listOpen) {
        html.push("</ul>");
        listOpen = false;
      }
      html.push("<p>" + inlineMarkdown(trimmed) + "</p>");
    });
    if (listOpen) {
      html.push("</ul>");
    }
    refs.readme.innerHTML = html.join("");
  }

  function appInitial(app) {
    return app.name.replace(/^[^a-zA-Z0-9\u4e00-\u9fa5]+/, "").slice(0, 1).toUpperCase() || "A";
  }

  function appPackageName(app) {
    const parts = String(app.id || "").split("/").filter(Boolean);
    return parts.length ? parts[parts.length - 1] : app.slug || "—";
  }

  function latestFile(app) {
    return app && app.latest && app.latest.files ? app.latest.files[0] : null;
  }

  function renderVersion(release, app, isLatest) {
    const entry = document.createElement("article");
    const marker = document.createElement("span");
    const content = document.createElement("div");
    const head = document.createElement("div");
    const headingWrap = document.createElement("div");
    const heading = document.createElement("h3");
    const badge = document.createElement("span");
    const meta = document.createElement("p");
    const list = document.createElement("div");
    entry.className = "app-release-entry" + (isLatest ? " is-latest" : "");
    marker.className = "app-release-marker";
    content.className = "app-release-content";
    head.className = "app-release-entry-head";
    headingWrap.className = "app-release-heading";
    heading.textContent = release.version || "latest";
    badge.className = "app-release-current";
    badge.textContent = t("latestBadge");
    meta.textContent = release.updatedAt ? t("updated") + " · " + release.updatedAt : "";
    list.className = "app-release-files";

    headingWrap.appendChild(heading);
    if (isLatest) {
      headingWrap.appendChild(badge);
    }
    head.appendChild(headingWrap);
    if (meta.textContent) {
      head.appendChild(meta);
    }

    release.files.forEach(function (file) {
      const link = document.createElement("a");
      const type = document.createElement("span");
      const copy = document.createElement("span");
      const name = document.createElement("strong");
      const detail = document.createElement("small");
      const action = document.createElement("span");
      link.className = "app-release-file";
      link.href = fileUrl(app, release, file);
      link.download = file.file || "";
      type.className = "app-release-file-type";
      type.textContent = String(file.type || "file").slice(0, 4).toUpperCase();
      copy.className = "app-release-file-copy";
      name.textContent = file.file || file.url || t("download");
      detail.textContent = [
        file.type ? t("fileType") + " · " + file.type : "",
        file.size ? t("size") + " · " + file.size : "",
      ].filter(Boolean).join("  /  ");
      action.className = "app-release-file-action";
      action.textContent = "↓";
      copy.appendChild(name);
      if (detail.textContent) {
        copy.appendChild(detail);
      }
      link.appendChild(type);
      link.appendChild(copy);
      link.appendChild(action);
      list.appendChild(link);
    });

    content.appendChild(head);
    content.appendChild(list);
    entry.appendChild(marker);
    entry.appendChild(content);
    return entry;
  }

  function render() {
    refs.back.textContent = t("back");
    refs.readmeTitle.textContent = t("readmeTitle");
    refs.readmeKicker.textContent = t("readmeKicker");
    refs.versionTitle.textContent = t("versionsTitle");
    refs.versionKicker.textContent = t("versionsKicker");
    refs.latestLabel.textContent = t("latestVersion");
    refs.latestDownloadText.textContent = t("downloadLatest");
    refs.releaseState.textContent = t("releaseState");
    refs.packageLabel.textContent = t("packageName");
    refs.platformLabel.textContent = t("platform");
    refs.sizeLabel.textContent = t("packageSize");
    refs.buildsLabel.textContent = t("availableBuilds");
    refs.versionCountUnit.textContent = t("buildUnit");
    refs.latestQr.setAttribute("aria-label", t("scanDownload"));
    if (!state.app) {
      document.title = t("title") + " · WK1995";
      refs.title.textContent = t("title");
      refs.breadcrumbName.textContent = t("title");
      refs.summary.textContent = state.error || t("loading");
      refs.platform.textContent = "App Detail";
      refs.mark.textContent = "A";
      refs.latestTitle.textContent = "—";
      refs.latestMeta.textContent = "—";
      refs.latestDownload.removeAttribute("href");
      refs.latestQr.innerHTML = "";
      refs.versionChip.textContent = "Latest";
      refs.updatedChip.textContent = "—";
      refs.packageValue.textContent = "—";
      refs.platformValue.textContent = "—";
      refs.sizeValue.textContent = "—";
      refs.buildsValue.textContent = "0";
      refs.readme.innerHTML = "";
      refs.versionList.innerHTML = "";
      refs.versionCount.textContent = "0";
      refs.status.textContent = state.error || "";
      return;
    }
    document.title = state.app.name + " · " + t("title") + " · WK1995";
    refs.title.textContent = state.app.name;
    refs.breadcrumbName.textContent = state.app.name;
    refs.summary.textContent = state.app.description || t("distributionSummary").replace("{platform}", platformLabel(state.app.platformId));
    refs.platform.textContent = platformLabel(state.app.platformId);
    refs.mark.textContent = appInitial(state.app);
    refs.versionChip.textContent = state.app.latest.version || t("latestVersion");
    refs.updatedChip.textContent = state.app.latest.updatedAt ? t("updated") + " · " + state.app.latest.updatedAt : "—";
    refs.packageValue.textContent = appPackageName(state.app);
    refs.platformValue.textContent = platformLabel(state.app.platformId);
    refs.buildsValue.textContent = String(state.app.versions.length);

    const currentFile = latestFile(state.app);
    const currentDownloadUrl = currentFile ? fileUrl(state.app, state.app.latest, currentFile) : "";
    refs.latestTitle.textContent = state.app.latest.version || t("latestVersion");
    refs.latestMeta.textContent = [
      currentFile && (currentFile.file || currentFile.url),
      currentFile && currentFile.size,
    ].filter(Boolean).join(" · ") || "—";
    refs.sizeValue.textContent = currentFile && currentFile.size ? currentFile.size : "—";
    refs.latestDownload.href = currentDownloadUrl || "#";
    refs.latestDownload.download = currentFile && currentFile.file ? currentFile.file : "";
    refs.latestQr.innerHTML = "";
    if (currentDownloadUrl && window.WKAppsQR && typeof window.WKAppsQR.createSvg === "function") {
      try {
        refs.latestQr.appendChild(window.WKAppsQR.createSvg(currentDownloadUrl));
      } catch (error) {
        refs.latestQr.textContent = "QR";
      }
    }
    renderMarkdown(state.app.readme || state.app.latest.readme || "");
    refs.versionList.innerHTML = "";
    refs.versionCount.textContent = String(state.app.versions.length);
    const releases = state.app.versions.filter(function (release) {
      return !(
        release.version === state.app.latest.version &&
        release.basePath === state.app.latest.basePath &&
        release.file === state.app.latest.file
      );
    }).reverse();
    releases.unshift(state.app.latest);
    releases.forEach(function (release, index) {
      refs.versionList.appendChild(renderVersion(release, state.app, index === 0));
    });
    refs.status.textContent = "";
  }

  async function loadManifest() {
    try {
      const response = await fetch(cacheFreshUrl("../packages/manifest.json"), {
        cache: "no-store",
        headers: {
          "Cache-Control": "no-cache",
          "Pragma": "no-cache",
        },
      });
      if (!response.ok) {
        throw new Error("HTTP " + response.status);
      }
      state.manifest = normalizeManifest(await response.json());
      const id = new URLSearchParams(window.location.search).get("id") || "";
      state.app = state.manifest.apps.find(function (app) { return app.id === id; }) || null;
      state.error = state.app ? "" : t("notFound");
    } catch (error) {
      state.error = t("notFound");
    }
    render();
  }

  function collect() {
    refs.platform = document.getElementById("app-detail-platform");
    refs.title = document.getElementById("app-detail-title");
    refs.summary = document.getElementById("app-detail-summary");
    refs.back = document.querySelector("#app-detail-back span");
    refs.breadcrumbName = document.getElementById("app-detail-breadcrumb-name");
    refs.mark = document.getElementById("app-detail-mark");
    refs.releaseState = document.getElementById("app-detail-release-state");
    refs.versionChip = document.getElementById("app-detail-version-chip");
    refs.updatedChip = document.getElementById("app-detail-updated-chip");
    refs.latestLabel = document.getElementById("app-latest-label");
    refs.latestTitle = document.getElementById("app-latest-title");
    refs.latestMeta = document.getElementById("app-latest-meta");
    refs.latestQr = document.getElementById("app-latest-qr");
    refs.latestDownload = document.getElementById("app-latest-download");
    refs.latestDownloadText = refs.latestDownload.querySelector("span");
    refs.packageLabel = document.getElementById("app-fact-package-label");
    refs.packageValue = document.getElementById("app-fact-package");
    refs.platformLabel = document.getElementById("app-fact-platform-label");
    refs.platformValue = document.getElementById("app-fact-platform");
    refs.sizeLabel = document.getElementById("app-fact-size-label");
    refs.sizeValue = document.getElementById("app-fact-size");
    refs.buildsLabel = document.getElementById("app-fact-builds-label");
    refs.buildsValue = document.getElementById("app-fact-builds");
    refs.readmeTitle = document.getElementById("app-readme-title");
    refs.readmeKicker = document.getElementById("app-readme-kicker");
    refs.readme = document.getElementById("app-readme");
    refs.versionTitle = document.getElementById("app-version-title");
    refs.versionKicker = document.getElementById("app-version-kicker");
    refs.versionCount = document.getElementById("app-version-count");
    refs.versionCountUnit = document.getElementById("app-version-count-unit");
    refs.versionList = document.getElementById("app-version-list");
    refs.status = document.getElementById("app-detail-status");
  }

  function init() {
    collect();
    window.addEventListener("wk:language-change", render);
    render();
    loadManifest();
  }

  init();
})();
