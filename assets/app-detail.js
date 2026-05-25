(function () {
  const text = {
    zh: {
      title: "App 详情",
      loading: "读取安装包清单中。",
      back: "返回列表",
      readmeTitle: "项目介绍",
      versionsTitle: "版本安装包",
      notFound: "没有找到这个 App。",
      noReadme: "这个 App 暂无 README 项目介绍。",
      download: "下载",
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
      versionsTitle: "Version packages",
      notFound: "This app was not found.",
      noReadme: "No README is available for this app yet.",
      download: "Download",
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

  function normalizeApp(item, index) {
    const source = item || {};
    const id = typeof source.id === "string" && source.id.trim() ? source.id.trim() : "";
    const platformId = normalizePlatform(source.platform) || normalizePlatform(source.platformId) || platformFromFile(source.file || id) || "other";
    const basePath = typeof source.basePath === "string" && source.basePath.trim()
      ? source.basePath.trim()
      : platformMeta(platformId).defaultBasePath;
    const versions = normalizeReleases(source, { basePath: basePath });
    const latest = normalizeRelease(source.latest, { basePath: basePath }, "latest") || versions[versions.length - 1] || null;
    const name = typeof source.name === "string" && source.name.trim() ? source.name.trim() : id.split("/").pop() || "App";
    if (!latest) {
      return null;
    }
    return {
      id: id || platformId + "-app-" + index,
      name: name,
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

  function renderVersion(release, app) {
    const card = document.createElement("article");
    const heading = document.createElement("h3");
    const meta = document.createElement("p");
    const list = document.createElement("div");
    card.className = "app-version-card";
    heading.textContent = release.version || "latest";
    meta.textContent = release.updatedAt ? t("updated") + " · " + release.updatedAt : "";
    list.className = "app-version-files";
    release.files.forEach(function (file) {
      const link = document.createElement("a");
      const detail = document.createElement("span");
      link.className = "app-version-file";
      link.href = fileUrl(app, release, file);
      link.download = file.file || "";
      link.textContent = file.file || file.url || t("download");
      detail.textContent = [
        file.type ? t("fileType") + " · " + file.type : "",
        file.size ? t("size") + " · " + file.size : "",
      ].filter(Boolean).join("  ");
      list.appendChild(link);
      if (detail.textContent) {
        list.appendChild(detail);
      }
    });
    card.appendChild(heading);
    if (meta.textContent) {
      card.appendChild(meta);
    }
    card.appendChild(list);
    return card;
  }

  function render() {
    refs.back.textContent = t("back");
    refs.readmeTitle.textContent = t("readmeTitle");
    refs.versionTitle.textContent = t("versionsTitle");
    if (!state.app) {
      document.title = t("title") + " · WK1995";
      refs.title.textContent = t("title");
      refs.summary.textContent = state.error || t("loading");
      refs.platform.textContent = "App Detail";
      refs.readme.innerHTML = "";
      refs.versionList.innerHTML = "";
      refs.versionCount.textContent = "0";
      refs.status.textContent = state.error || "";
      return;
    }
    document.title = state.app.name + " · " + t("title") + " · WK1995";
    refs.title.textContent = state.app.name;
    refs.summary.textContent = state.app.description || state.app.latest.file || "";
    refs.platform.textContent = platformLabel(state.app.platformId);
    renderMarkdown(state.app.readme || state.app.latest.readme || "");
    refs.versionList.innerHTML = "";
    refs.versionCount.textContent = String(state.app.versions.length);
    state.app.versions.slice().reverse().forEach(function (release) {
      refs.versionList.appendChild(renderVersion(release, state.app));
    });
    refs.status.textContent = "";
  }

  async function loadManifest() {
    try {
      const response = await fetch("../packages/manifest.json", { cache: "no-store" });
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
    refs.back = document.getElementById("app-detail-back");
    refs.readmeTitle = document.getElementById("app-readme-title");
    refs.readme = document.getElementById("app-readme");
    refs.versionTitle = document.getElementById("app-version-title");
    refs.versionCount = document.getElementById("app-version-count");
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
