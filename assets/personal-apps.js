(function () {
  const text = {
    zh: {
      eyebrow: "Personal Apps",
      title: "个人 App 列表",
      intro: "workflow 生成的安装包放入 apps/packages 后，页面会按清单生成下载入口和二维码。",
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
      noResults: "没有匹配的 App",
      noResultsBody: "换一个关键词试试。",
    },
    en: {
      eyebrow: "Personal Apps",
      title: "Personal app list",
      intro: "When workflow-generated packages are placed in apps/packages, this page reads the manifest and creates download QR codes.",
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
      noResults: "No matching apps",
      noResultsBody: "Try another keyword.",
    },
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

  function normalizeApps(raw) {
    return (Array.isArray(raw) ? raw : [])
      .map(function (item, index) {
        const name = typeof item.name === "string" ? item.name.trim() : "";
        const file = typeof item.file === "string" ? item.file.trim() : "";
        const url = typeof item.url === "string" ? item.url.trim() : "";
        if (!name || (!file && !url)) {
          return null;
        }
        return {
          id: typeof item.id === "string" && item.id.trim() ? item.id.trim() : "app-" + index,
          name: name,
          version: typeof item.version === "string" ? item.version.trim() : "",
          platform: typeof item.platform === "string" ? item.platform.trim() : "",
          file: file,
          url: url,
          description: typeof item.description === "string" ? item.description.trim() : "",
          updatedAt: typeof item.updatedAt === "string" ? item.updatedAt.trim() : "",
          size: typeof item.size === "string" ? item.size.trim() : "",
        };
      })
      .filter(Boolean);
  }

  function normalizeManifest(raw) {
    const basePath = typeof raw.basePath === "string" && raw.basePath.trim()
      ? raw.basePath.trim()
      : "packages/";
    return {
      version: raw.version || 1,
      updatedAt: typeof raw.updatedAt === "string" ? raw.updatedAt.trim() : "",
      basePath: basePath,
      apps: normalizeApps(raw.apps),
    };
  }

  function appDownloadUrl(app) {
    if (app.url) {
      return new URL(app.url, window.location.href).href;
    }
    const base = new URL(state.manifest.basePath || "packages/", window.location.href);
    return new URL(app.file, base).href;
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
      app.description,
      app.file,
      app.url,
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

    mark.textContent = appInitial(app);
    heading.textContent = app.name;
    meta.textContent = [app.platform, app.version].filter(Boolean).join(" · ");
    description.textContent = app.description || url;
    if (app.platform) {
      chips.appendChild(createChip(t("platform") + " · " + app.platform));
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
    return card;
  }

  function renderSource() {
    refs.source.innerHTML = "";
    const title = document.createElement("span");
    const strong = document.createElement("strong");
    const detail = document.createElement("small");
    title.textContent = t("sourceTitle");
    strong.textContent = t("sourceBody");
    detail.textContent = state.manifest.updatedAt ? t("updated") + " · " + state.manifest.updatedAt : "";
    refs.source.appendChild(title);
    refs.source.appendChild(strong);
    if (detail.textContent) {
      refs.source.appendChild(detail);
    }
  }

  function renderApps() {
    const apps = state.manifest.apps.filter(matchesFilter);
    refs.grid.innerHTML = "";
    refs.count.textContent = String(apps.length);
    if (!state.manifest.apps.length) {
      refs.grid.appendChild(createEmptyState("emptyTitle", "emptyBody"));
      return;
    }
    if (!apps.length) {
      refs.grid.appendChild(createEmptyState("noResults", "noResultsBody"));
      return;
    }
    apps.forEach(function (app) {
      refs.grid.appendChild(createAppCard(app));
    });
  }

  function renderStatus() {
    refs.status.textContent = state.error || "";
    refs.status.className = "catalog-status" + (state.error ? " is-error" : "");
  }

  function render() {
    applyStaticText();
    renderSource();
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
    window.addEventListener("wk:language-change", render);
  }

  function collect() {
    refs.search = document.getElementById("app-search");
    refs.source = document.getElementById("app-source");
    refs.grid = document.getElementById("app-grid");
    refs.count = document.getElementById("app-count");
    refs.status = document.getElementById("app-status");
  }

  function init() {
    collect();
    bind();
    render();
    loadManifest();
  }

  init();
})();
