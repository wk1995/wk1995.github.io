(function () {
  const text = {
    zh: {
      eyebrow: "Personal Apps",
      title: "个人 App 列表",
      intro: "workflow 生成的安装包按平台放入 apps/packages，页面会自动按 Android、iOS、Harmony、Windows、macOS 等平台生成下载入口和二维码。",
      packageDir: "安装包目录",
      searchLabel: "搜索 App",
      searchPlaceholder: "App 名称 / 平台 / 版本",
      listTitle: "App 安装包",
      sourceTitle: "清单来源",
      sourceBody: "apps/packages/manifest.json",
      emptyTitle: "暂无安装包",
      emptyBody: "把安装包放到 apps/packages，并在 manifest.json 中登记后会自动出现在这里。",
      loadFailed: "安装包清单读取失败。",
      download: "下载安装包",
      qrLabel: "扫码下载",
      updated: "更新",
      version: "版本",
      platform: "平台",
      allPlatforms: "全部平台",
      platformAndroid: "Android",
      platformIos: "iOS",
      platformHarmony: "HarmonyOS",
      platformWindows: "Windows",
      platformMacos: "macOS",
      platformLinux: "Linux",
      platformWeb: "Web",
      platformOther: "其他平台",
      noResults: "没有匹配的 App",
      noResultsBody: "换一个关键词试试。",
      details: "查看详情",
      historyVersions: "历史版本",
      latestVersion: "最新版本",
      installFiles: "安装包",
      pageVersion: "页面版本",
    },
    en: {
      eyebrow: "Personal Apps",
      title: "Personal app list",
      intro: "Place workflow-generated packages under apps/packages by platform. This page groups Android, iOS, Harmony, Windows, macOS, and other packages with download QR codes.",
      packageDir: "Package directory",
      searchLabel: "Search apps",
      searchPlaceholder: "App name / platform / version",
      listTitle: "App packages",
      sourceTitle: "Manifest",
      sourceBody: "apps/packages/manifest.json",
      emptyTitle: "No packages yet",
      emptyBody: "Place packages in apps/packages and register them in manifest.json to show them here.",
      loadFailed: "Failed to read the app manifest.",
      download: "Download package",
      qrLabel: "Scan to download",
      updated: "Updated",
      version: "Version",
      platform: "Platform",
      allPlatforms: "All platforms",
      platformAndroid: "Android",
      platformIos: "iOS",
      platformHarmony: "HarmonyOS",
      platformWindows: "Windows",
      platformMacos: "macOS",
      platformLinux: "Linux",
      platformWeb: "Web",
      platformOther: "Other",
      noResults: "No matching apps",
      noResultsBody: "Try another keyword.",
      details: "Details",
      historyVersions: "Version history",
      latestVersion: "Latest",
      installFiles: "Packages",
      pageVersion: "Page version",
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
    iphone: "ios",
    ipad: "ios",
    ipa: "ios",
    harmony: "harmony",
    harmonyos: "harmony",
    hongmeng: "harmony",
    ohos: "harmony",
    hap: "harmony",
    windows: "windows",
    window: "windows",
    win: "windows",
    win32: "windows",
    win64: "windows",
    mac: "macos",
    macos: "macos",
    osx: "macos",
    darwin: "macos",
    linux: "linux",
    web: "web",
    h5: "web",
    other: "other",
  };

  const QR_LEVELS = [
    null,
    { version: 1, size: 21, dataCodewords: 19, eccCodewords: 7, byteCapacity: 17, alignment: [] },
    { version: 2, size: 25, dataCodewords: 34, eccCodewords: 10, byteCapacity: 32, alignment: [6, 18] },
    { version: 3, size: 29, dataCodewords: 55, eccCodewords: 15, byteCapacity: 53, alignment: [6, 22] },
    { version: 4, size: 33, dataCodewords: 80, eccCodewords: 20, byteCapacity: 78, alignment: [6, 26] },
    { version: 5, size: 37, dataCodewords: 108, eccCodewords: 26, byteCapacity: 106, alignment: [6, 30] },
  ];

  const refs = {};
  const state = {
    manifest: { basePath: "packages/", apps: [] },
    filter: "",
    platform: "all",
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
    if (extension) {
      const byExtension = PLATFORMS.find(function (item) {
        return item.extensions.indexOf(extension) !== -1;
      });
      if (byExtension) {
        return byExtension.id;
      }
    }
    const segments = clean.split(/[\\/]/).filter(Boolean);
    for (let i = 0; i < segments.length; i += 1) {
      const platform = normalizePlatform(segments[i]);
      if (platform) {
        return platform;
      }
    }
    return "";
  }

  function selectedPlatformFromUrl() {
    const params = new URLSearchParams(window.location.search);
    const platform = normalizePlatform(params.get("platform"));
    return platform || "all";
  }

  function updatePlatformUrl(platform) {
    const params = new URLSearchParams(window.location.search);
    if (platform && platform !== "all") {
      params.set("platform", platform);
    } else {
      params.delete("platform");
    }
    const next = window.location.pathname + (params.toString() ? "?" + params.toString() : "");
    window.history.replaceState({}, "", next);
  }

  function applyStaticText() {
    document.querySelectorAll("[data-app-text]").forEach(function (node) {
      node.textContent = t(node.dataset.appText);
    });
    refs.search.setAttribute("placeholder", t("searchPlaceholder"));
    document.title = t("title") + " · WK1995";
    const description = document.querySelector('meta[name="description"]');
    if (description) {
      description.setAttribute("content", t("intro"));
    }
  }

  function normalizeFiles(rawFiles) {
    return (Array.isArray(rawFiles) ? rawFiles : [])
      .map(function (item) {
        if (typeof item === "string") {
          return { file: item, type: item.split(".").pop() || "file", size: "", updatedAt: "" };
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
      files.push({
        file: file,
        url: url,
        type: typeof item.type === "string" ? item.type.trim() : (file.split(".").pop() || "file"),
        size: typeof item.size === "string" ? item.size.trim() : "",
        updatedAt: typeof item.updatedAt === "string" ? item.updatedAt.trim() : "",
      });
    }
    if (!files.length) {
      return null;
    }
    const basePath = typeof item.basePath === "string" && item.basePath.trim()
      ? item.basePath.trim()
      : context.basePath;
    return {
      version: typeof item.version === "string" && item.version.trim() ? item.version.trim() : fallbackVersion || "latest",
      basePath: basePath,
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

  function normalizeAppItem(item, index, context) {
    const source = item || {};
    const sourceId = typeof source.id === "string" && source.id.trim() ? source.id.trim() : "";
    const declaredPlatform = normalizePlatform(source.platform);
    const inferredPlatform = platformFromFile(source.file || source.url || sourceId);
    const platformId = declaredPlatform || context.platform || inferredPlatform || "other";
    const meta = platformMeta(platformId);
    const basePath = typeof source.basePath === "string" && source.basePath.trim()
      ? source.basePath.trim()
      : context.basePath || meta.defaultBasePath;
    const releases = normalizeReleases(source, { basePath: basePath });
    const latest = normalizeRelease(source.latest, { basePath: basePath }, "latest") || releases[releases.length - 1] || null;
    const name = typeof source.name === "string" && source.name.trim()
      ? source.name.trim()
      : sourceId.split("/").pop() || "";
    if (!name || !latest) {
      return null;
    }
    return {
      id: sourceId || platformId + "-app-" + index,
      slug: typeof source.slug === "string" ? source.slug.trim() : "",
      name: name,
      version: latest.version || "",
      platform: platformLabel(platformId),
      platformId: platformId,
      basePath: basePath,
      file: latest.file || "",
      url: latest.url || "",
      latest: latest,
      versions: releases.length ? releases : [latest],
      hasHistory: Boolean(source.hasHistory) || releases.length > 1,
      readme: typeof source.readme === "string" ? source.readme : "",
      readmeFile: typeof source.readmeFile === "string" ? source.readmeFile : "",
      description: typeof source.description === "string" ? source.description.trim() : "",
      updatedAt: typeof source.updatedAt === "string" ? source.updatedAt.trim() : latest.updatedAt || "",
      size: latest.files && latest.files[0] ? latest.files[0].size : "",
      architecture: typeof source.architecture === "string" ? source.architecture.trim() : "",
      channel: typeof source.channel === "string" ? source.channel.trim() : "",
    };
  }

  function normalizeApps(raw, context) {
    return (Array.isArray(raw) ? raw : [])
      .map(function (item, index) {
        return normalizeAppItem(item, index, context || {});
      })
      .filter(Boolean);
  }

  function normalizePlatformGroups(rawPlatforms, basePaths) {
    const grouped = [];
    Object.keys(rawPlatforms || {}).forEach(function (key) {
      const platform = normalizePlatform(key) || "other";
      const value = rawPlatforms[key];
      if (Array.isArray(value) && value.every(function (item) { return typeof item === "string"; })) {
        return;
      }
      const platformBasePath = basePaths[platform] || platformMeta(platform).defaultBasePath;
      if (Array.isArray(value)) {
        grouped.push.apply(grouped, normalizeApps(value, { platform: platform, basePath: platformBasePath }));
        return;
      }
      if (value && typeof value === "object") {
        const groupBasePath = typeof value.basePath === "string" && value.basePath.trim()
          ? value.basePath.trim()
          : platformBasePath;
        grouped.push.apply(grouped, normalizeApps(value.apps, { platform: platform, basePath: groupBasePath }));
      }
    });
    return grouped;
  }

  function normalizeManifest(raw) {
    const basePath = typeof raw.basePath === "string" && raw.basePath.trim()
      ? raw.basePath.trim()
      : "packages/";
    const basePaths = {};
    PLATFORMS.forEach(function (platform) {
      basePaths[platform.id] = platform.defaultBasePath;
    });
    Object.keys(raw.basePaths || {}).forEach(function (key) {
      const platform = normalizePlatform(key);
      const value = raw.basePaths[key];
      if (platform && typeof value === "string" && value.trim()) {
        basePaths[platform] = value.trim();
      }
    });
    const flatApps = normalizeApps(raw.apps, { basePath: basePath });
    const groupedApps = normalizePlatformGroups(raw.platforms, basePaths);
    const release = raw.release && typeof raw.release === "object" ? raw.release : {};
    const versionName = typeof raw.versionName === "string" && raw.versionName.trim()
      ? raw.versionName.trim()
      : (typeof release.versionName === "string" ? release.versionName.trim() : "");
    const versionNumber = typeof raw.versionNumber === "string" && raw.versionNumber.trim()
      ? raw.versionNumber.trim()
      : (typeof release.versionNumber === "string" ? release.versionNumber.trim() : "");
    return {
      schemaVersion: raw.schemaVersion || raw.version || 1,
      version: raw.version || 1,
      versionName: versionName,
      versionNumber: versionNumber,
      updatedAt: typeof raw.updatedAt === "string" ? raw.updatedAt.trim() : "",
      basePath: basePath,
      basePaths: basePaths,
      apps: flatApps.concat(groupedApps),
    };
  }

  function appDownloadUrl(app) {
    const release = app.latest || app;
    if (release.url) {
      return new URL(release.url, window.location.href).href;
    }
    const base = new URL(release.basePath || app.basePath || state.manifest.basePath || "packages/", window.location.href);
    return new URL(release.file || app.file, base).href;
  }

  function appDetailUrl(app) {
    return "detail/?id=" + encodeURIComponent(app.id);
  }

  function appInitial(app) {
    return app.name.replace(/^[^a-zA-Z0-9\u4e00-\u9fa5]+/, "").slice(0, 1).toUpperCase() || "A";
  }

  function matchesFilter(app) {
    const value = state.filter.trim().toLowerCase();
    if (!value) {
      return true;
    }
    return [
      app.name,
      app.version,
      app.platform,
      app.platformId,
      app.description,
      app.architecture,
      app.channel,
      app.file,
      app.url,
      app.readme,
      (app.versions || []).map(function (release) {
        return [
          release.version,
          release.file,
          release.url,
          (release.files || []).map(function (file) { return file.file || file.url || ""; }).join(" "),
        ].join(" ");
      }).join(" "),
    ].join(" ").toLowerCase().indexOf(value) !== -1;
  }

  function makeByteData(textValue) {
    return Array.from(new TextEncoder().encode(textValue));
  }

  function appendBits(buffer, value, length) {
    for (let i = length - 1; i >= 0; i -= 1) {
      buffer.push((value >>> i) & 1);
    }
  }

  function chooseQrLevel(byteLength) {
    for (let i = 1; i < QR_LEVELS.length; i += 1) {
      if (byteLength <= QR_LEVELS[i].byteCapacity) {
        return QR_LEVELS[i];
      }
    }
    return QR_LEVELS[QR_LEVELS.length - 1];
  }

  function createDataCodewords(bytes, level) {
    const bits = [];
    appendBits(bits, 0x4, 4);
    appendBits(bits, bytes.length, 8);
    bytes.forEach(function (value) {
      appendBits(bits, value, 8);
    });
    const capacityBits = level.dataCodewords * 8;
    appendBits(bits, 0, Math.min(4, capacityBits - bits.length));
    while (bits.length % 8 !== 0) {
      bits.push(0);
    }
    const codewords = [];
    for (let i = 0; i < bits.length; i += 8) {
      let value = 0;
      for (let j = 0; j < 8; j += 1) {
        value = (value << 1) | bits[i + j];
      }
      codewords.push(value);
    }
    for (let pad = 0; codewords.length < level.dataCodewords; pad += 1) {
      codewords.push(pad % 2 === 0 ? 0xec : 0x11);
    }
    return codewords;
  }

  const gf = (function () {
    const exp = new Array(512);
    const log = new Array(256);
    let value = 1;
    for (let i = 0; i < 255; i += 1) {
      exp[i] = value;
      log[value] = i;
      value <<= 1;
      if (value & 0x100) {
        value ^= 0x11d;
      }
    }
    for (let i = 255; i < 512; i += 1) {
      exp[i] = exp[i - 255];
    }
    return {
      multiply: function (a, b) {
        return a && b ? exp[log[a] + log[b]] : 0;
      },
      exp: exp,
    };
  })();

  function reedSolomonGenerator(degree) {
    let poly = [1];
    for (let i = 0; i < degree; i += 1) {
      const next = new Array(poly.length + 1).fill(0);
      for (let j = 0; j < poly.length; j += 1) {
        next[j] ^= poly[j];
        next[j + 1] ^= gf.multiply(poly[j], gf.exp[i]);
      }
      poly = next;
    }
    return poly;
  }

  function reedSolomonRemainder(data, degree) {
    const generator = reedSolomonGenerator(degree);
    const result = new Array(degree).fill(0);
    data.forEach(function (value) {
      const factor = value ^ result.shift();
      result.push(0);
      for (let i = 0; i < degree; i += 1) {
        result[i] ^= gf.multiply(generator[i + 1], factor);
      }
    });
    return result;
  }

  function makeMatrix(codewords, level) {
    const size = level.size;
    const modules = Array.from({ length: size }, function () { return new Array(size).fill(false); });
    const isFunction = Array.from({ length: size }, function () { return new Array(size).fill(false); });

    function setModule(x, y, dark, functional) {
      if (x < 0 || y < 0 || x >= size || y >= size) {
        return;
      }
      modules[y][x] = Boolean(dark);
      if (functional !== false) {
        isFunction[y][x] = true;
      }
    }

    function drawFinder(left, top) {
      for (let y = -1; y <= 7; y += 1) {
        for (let x = -1; x <= 7; x += 1) {
          const xx = left + x;
          const yy = top + y;
          const inPattern = x >= 0 && x <= 6 && y >= 0 && y <= 6;
          const dark = inPattern && (x === 0 || x === 6 || y === 0 || y === 6 || (x >= 2 && x <= 4 && y >= 2 && y <= 4));
          setModule(xx, yy, dark, true);
        }
      }
    }

    function drawAlignment(cx, cy) {
      if (isFunction[cy] && isFunction[cy][cx]) {
        return;
      }
      for (let y = -2; y <= 2; y += 1) {
        for (let x = -2; x <= 2; x += 1) {
          const distance = Math.max(Math.abs(x), Math.abs(y));
          setModule(cx + x, cy + y, distance === 2 || distance === 0, true);
        }
      }
    }

    function reserveFormat() {
      for (let i = 0; i <= 8; i += 1) {
        if (i !== 6) {
          setModule(8, i, false, true);
          setModule(i, 8, false, true);
        }
      }
      for (let i = 0; i < 8; i += 1) {
        setModule(size - 1 - i, 8, false, true);
        setModule(8, size - 1 - i, false, true);
      }
    }

    drawFinder(0, 0);
    drawFinder(size - 7, 0);
    drawFinder(0, size - 7);
    level.alignment.forEach(function (x) {
      level.alignment.forEach(function (y) {
        drawAlignment(x, y);
      });
    });
    for (let i = 8; i < size - 8; i += 1) {
      const dark = i % 2 === 0;
      if (!isFunction[6][i]) {
        setModule(i, 6, dark, true);
      }
      if (!isFunction[i][6]) {
        setModule(6, i, dark, true);
      }
    }
    setModule(8, size - 8, true, true);
    reserveFormat();

    const bits = [];
    codewords.forEach(function (value) {
      appendBits(bits, value, 8);
    });
    let bitIndex = 0;
    let upward = true;
    for (let right = size - 1; right >= 1; right -= 2) {
      if (right === 6) {
        right -= 1;
      }
      for (let vertical = 0; vertical < size; vertical += 1) {
        const y = upward ? size - 1 - vertical : vertical;
        for (let offset = 0; offset < 2; offset += 1) {
          const x = right - offset;
          if (!isFunction[y][x]) {
            let dark = bitIndex < bits.length ? bits[bitIndex] === 1 : false;
            if ((x + y) % 2 === 0) {
              dark = !dark;
            }
            setModule(x, y, dark, false);
            bitIndex += 1;
          }
        }
      }
      upward = !upward;
    }
    drawFormatBits(modules, isFunction, size, 0);
    return modules;
  }

  function drawFormatBits(modules, isFunction, size, mask) {
    const data = (1 << 3) | mask;
    let remainder = data << 10;
    for (let i = 14; i >= 10; i -= 1) {
      if ((remainder >>> i) & 1) {
        remainder ^= 0x537 << (i - 10);
      }
    }
    const bits = ((data << 10) | remainder) ^ 0x5412;

    function bit(index) {
      return ((bits >>> index) & 1) !== 0;
    }

    function set(x, y, dark) {
      modules[y][x] = dark;
      isFunction[y][x] = true;
    }

    for (let i = 0; i <= 5; i += 1) {
      set(8, i, bit(i));
    }
    set(8, 7, bit(6));
    set(8, 8, bit(7));
    set(7, 8, bit(8));
    for (let i = 9; i < 15; i += 1) {
      set(14 - i, 8, bit(i));
    }
    for (let i = 0; i < 8; i += 1) {
      set(size - 1 - i, 8, bit(i));
    }
    for (let i = 8; i < 15; i += 1) {
      set(8, size - 15 + i, bit(i));
    }
    set(8, size - 8, true);
  }

  function qrSvg(value) {
    const bytes = makeByteData(value);
    const level = chooseQrLevel(bytes.length);
    if (bytes.length > level.byteCapacity) {
      throw new Error("QR payload too long");
    }
    const data = createDataCodewords(bytes, level);
    const codewords = data.concat(reedSolomonRemainder(data, level.eccCodewords));
    const modules = makeMatrix(codewords, level);
    const border = 4;
    const unitSize = modules.length + border * 2;
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    const background = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    const commands = [];
    modules.forEach(function (row, y) {
      row.forEach(function (dark, x) {
        if (dark) {
          commands.push("M" + (x + border) + "," + (y + border) + "h1v1h-1z");
        }
      });
    });
    svg.setAttribute("viewBox", "0 0 " + unitSize + " " + unitSize);
    svg.setAttribute("role", "img");
    svg.setAttribute("aria-label", t("qrLabel"));
    svg.setAttribute("shape-rendering", "crispEdges");
    background.setAttribute("width", String(unitSize));
    background.setAttribute("height", String(unitSize));
    background.setAttribute("fill", "#fff");
    path.setAttribute("d", commands.join(""));
    path.setAttribute("fill", "#111");
    svg.appendChild(background);
    svg.appendChild(path);
    return svg;
  }

  function createChip(label) {
    const chip = document.createElement("span");
    chip.className = "catalog-chip";
    chip.textContent = label;
    return chip;
  }

  function createEmptyState(titleKey, bodyKey) {
    const empty = document.createElement("div");
    const title = document.createElement("strong");
    const body = document.createElement("span");
    empty.className = "catalog-empty";
    title.textContent = t(titleKey);
    body.textContent = t(bodyKey);
    empty.appendChild(title);
    empty.appendChild(body);
    return empty;
  }

  function manifestVersionText() {
    if (!state.manifest.versionName && !state.manifest.versionNumber) {
      return "";
    }
    if (state.manifest.versionName && state.manifest.versionNumber && state.manifest.versionName !== state.manifest.versionNumber) {
      return state.manifest.versionName + " · " + state.manifest.versionNumber;
    }
    return state.manifest.versionName || state.manifest.versionNumber;
  }

  function createAppCard(app) {
    const url = appDownloadUrl(app);
    const card = document.createElement("article");
    const head = document.createElement("div");
    const mark = document.createElement("span");
    const title = document.createElement("div");
    const heading = document.createElement("h3");
    const meta = document.createElement("p");
    const description = document.createElement("p");
    const chips = document.createElement("div");
    const download = document.createElement("div");
    const qr = document.createElement("div");
    const downloadText = document.createElement("div");
    const qrLabel = document.createElement("span");
    const link = document.createElement("a");
    const detailLink = document.createElement("a");
    const actions = document.createElement("div");

    card.className = "app-card";
    head.className = "app-card-head";
    mark.className = "app-mark";
    title.className = "app-title";
    chips.className = "catalog-chip-row";
    download.className = "app-download";
    qr.className = "app-qr";
    link.className = "app-download-link";
    link.href = url;
    link.textContent = t("download");
    link.download = app.file || "";
    detailLink.className = "catalog-secondary-action";
    detailLink.href = appDetailUrl(app);
    detailLink.textContent = t("details");
    actions.className = "catalog-action-row";

    mark.textContent = appInitial(app);
    heading.textContent = app.name;
    meta.textContent = [platformLabel(app.platformId), app.version].filter(Boolean).join(" · ");
    description.textContent = app.description || url;
    if (app.platformId) {
      chips.appendChild(createChip(t("platform") + " · " + platformLabel(app.platformId)));
    }
    if (app.version) {
      chips.appendChild(createChip(t("version") + " · " + app.version));
    }
    if (app.updatedAt) {
      chips.appendChild(createChip(t("updated") + " · " + app.updatedAt));
    }
    if (app.size) {
      chips.appendChild(createChip(app.size));
    }
    if (app.hasHistory) {
      chips.appendChild(createChip(t("historyVersions") + " · " + app.versions.length));
    } else if (app.version) {
      chips.appendChild(createChip(t("latestVersion") + " · " + app.version));
    }
    if (app.latest && app.latest.files && app.latest.files.length > 1) {
      chips.appendChild(createChip(t("installFiles") + " · " + app.latest.files.length));
    }
    if (app.architecture) {
      chips.appendChild(createChip(app.architecture));
    }
    if (app.channel) {
      chips.appendChild(createChip(app.channel));
    }

    try {
      qr.appendChild(qrSvg(url));
    } catch (error) {
      qr.textContent = "QR";
    }

    qrLabel.className = "catalog-card-label";
    qrLabel.textContent = t("qrLabel");
    downloadText.appendChild(qrLabel);
    downloadText.appendChild(document.createElement("br"));
    downloadText.appendChild(link);
    actions.appendChild(detailLink);

    title.appendChild(heading);
    if (meta.textContent) {
      title.appendChild(meta);
    }
    head.appendChild(mark);
    head.appendChild(title);
    download.appendChild(qr);
    download.appendChild(downloadText);
    card.appendChild(head);
    card.appendChild(description);
    if (chips.childNodes.length) {
      card.appendChild(chips);
    }
    card.appendChild(download);
    card.appendChild(actions);
    return card;
  }

  function renderSource() {
    refs.source.innerHTML = "";
    const title = document.createElement("span");
    const strong = document.createElement("strong");
    const detail = document.createElement("small");
    const detailItems = [];
    const versionText = manifestVersionText();
    title.textContent = t("sourceTitle");
    strong.textContent = t("sourceBody");
    if (state.manifest.updatedAt) {
      detailItems.push(t("updated") + " · " + state.manifest.updatedAt);
    }
    if (versionText) {
      detailItems.push(t("pageVersion") + " · " + versionText);
    }
    detail.textContent = detailItems.join(" / ");
    refs.source.appendChild(title);
    refs.source.appendChild(strong);
    if (detail.textContent) {
      refs.source.appendChild(detail);
    }
  }

  function appsForCurrentView() {
    return state.manifest.apps.filter(function (app) {
      const platformMatch = state.platform === "all" || app.platformId === state.platform;
      return platformMatch && matchesFilter(app);
    });
  }

  function platformCounts() {
    const counts = { all: 0 };
    PLATFORMS.forEach(function (platform) {
      counts[platform.id] = 0;
    });
    state.manifest.apps.forEach(function (app) {
      if (matchesFilter(app)) {
        counts.all += 1;
        counts[app.platformId] = (counts[app.platformId] || 0) + 1;
      }
    });
    return counts;
  }

  function platformHref(platform) {
    const params = new URLSearchParams(window.location.search);
    if (platform === "all") {
      params.delete("platform");
    } else {
      params.set("platform", platform);
    }
    return window.location.pathname + (params.toString() ? "?" + params.toString() : "");
  }

  function renderPlatformNav() {
    const counts = platformCounts();
    refs.platforms.innerHTML = "";
    [{ id: "all", label: t("allPlatforms") }].concat(PLATFORMS.map(function (platform) {
      return { id: platform.id, label: platformLabel(platform.id) };
    })).forEach(function (platform) {
      const link = document.createElement("a");
      const label = document.createElement("strong");
      const count = document.createElement("span");
      link.className = "catalog-platform-link" + (state.platform === platform.id ? " is-active" : "");
      link.href = platformHref(platform.id);
      label.textContent = platform.label;
      count.className = "catalog-platform-count";
      count.textContent = String(counts[platform.id] || 0);
      link.appendChild(label);
      link.appendChild(count);
      link.addEventListener("click", function (event) {
        event.preventDefault();
        state.platform = platform.id;
        updatePlatformUrl(platform.id);
        render();
      });
      refs.platforms.appendChild(link);
    });
  }

  function platformDescription(platformId, count) {
    if (lang() === "zh") {
      return platformLabel(platformId) + " · " + count + " 个安装包";
    }
    return platformLabel(platformId) + " · " + count + " " + (count === 1 ? "package" : "packages");
  }

  function createPlatformGroup(platformId, apps) {
    const group = document.createElement("section");
    const head = document.createElement("div");
    const copy = document.createElement("div");
    const heading = document.createElement("h3");
    const detail = document.createElement("p");
    const count = document.createElement("span");
    const grid = document.createElement("div");
    group.className = "app-platform-group";
    head.className = "app-platform-head";
    grid.className = "app-platform-grid";
    heading.textContent = platformLabel(platformId);
    detail.textContent = platformDescription(platformId, apps.length);
    count.className = "catalog-badge";
    count.textContent = String(apps.length);
    copy.appendChild(heading);
    copy.appendChild(detail);
    head.appendChild(copy);
    head.appendChild(count);
    apps.forEach(function (app) {
      grid.appendChild(createAppCard(app));
    });
    group.appendChild(head);
    group.appendChild(grid);
    return group;
  }

  function renderApps() {
    const apps = appsForCurrentView();
    refs.groups.innerHTML = "";
    refs.count.textContent = String(apps.length);
    if (!state.manifest.apps.length) {
      refs.groups.appendChild(createEmptyState("emptyTitle", "emptyBody"));
      return;
    }
    if (!apps.length) {
      refs.groups.appendChild(createEmptyState("noResults", "noResultsBody"));
      return;
    }
    PLATFORMS.forEach(function (platform) {
      const platformApps = apps.filter(function (app) {
        return app.platformId === platform.id;
      });
      if (platformApps.length) {
        refs.groups.appendChild(createPlatformGroup(platform.id, platformApps));
      }
    });
  }

  function renderStatus() {
    refs.status.textContent = state.error || "";
    refs.status.className = "catalog-status" + (state.error ? " is-error" : "");
  }

  function render() {
    applyStaticText();
    renderSource();
    renderPlatformNav();
    renderApps();
    renderStatus();
  }

  async function loadManifest() {
    try {
      const response = await fetch("packages/manifest.json", { cache: "no-store" });
      if (!response.ok) {
        throw new Error("HTTP " + response.status);
      }
      state.manifest = normalizeManifest(await response.json());
      state.error = "";
    } catch (error) {
      state.manifest = normalizeManifest({});
      state.error = t("loadFailed");
    }
    render();
  }

  function bind() {
    refs.search.addEventListener("input", function (event) {
      state.filter = event.target.value;
      render();
    });
    window.addEventListener("popstate", function () {
      state.platform = selectedPlatformFromUrl();
      render();
    });
    window.addEventListener("wk:language-change", render);
  }

  function collect() {
    refs.search = document.getElementById("app-search");
    refs.source = document.getElementById("app-source");
    refs.platforms = document.getElementById("app-platforms");
    refs.groups = document.getElementById("app-groups");
    refs.count = document.getElementById("app-count");
    refs.status = document.getElementById("app-status");
  }

  function init() {
    state.platform = selectedPlatformFromUrl();
    collect();
    bind();
    render();
    loadManifest();
  }

  init();
})();
