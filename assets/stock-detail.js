(function () {
  const API_URL = "https://push2.eastmoney.com/api/qt/clist/get";
  const BOARD_TYPES = {
    industry: "m:90+t:2",
    concept: "m:90+t:3",
  };
  const BOARD_FIELD_LIST = [
    "f12",
    "f14",
    "f62",
    "f66",
    "f69",
    "f72",
    "f75",
    "f78",
    "f81",
    "f84",
    "f87",
    "f124",
    "f184",
    "f204",
    "f205",
    "f2",
    "f3",
    "f4",
    "f20",
  ].join(",");
  const COMPONENT_FIELD_LIST = [
    "f12",
    "f14",
    "f2",
    "f3",
    "f4",
    "f5",
    "f6",
    "f20",
    "f62",
    "f184",
    "f124",
  ].join(",");

  const text = {
    zh: {
      locale: "zh-CN",
      pageTitle: "板块详情",
      back: "返回资金看板",
      eastmoney: "东方财富",
      industrySector: "行业板块详情",
      conceptSector: "概念板块详情",
      unknownSector: "板块详情",
      changePercent: "涨跌幅",
      netMain: "主力净流入",
      netRatio: "主力净占比",
      leader: "领涨股",
      stocksCount: "成分股",
      flowLabel: "资金结构",
      flowTitle: "分级资金流向",
      constituentsLabel: "成分股",
      constituentsTitle: "板块内表现",
      gainers: "涨幅",
      inflow: "流入",
      outflow: "流出",
      aiLabel: "AI 分析",
      aiTitle: "当前板块研判",
      runAi: "分析当前板块",
      analyzing: "AI 正在分析当前板块...",
      aiReady: "AI 分析已生成。",
      aiNeedSetup: "请先在 AI Chat 中配置模型和 API Key。",
      aiNoData: "当前板块数据不足，暂时无法分析。",
      aiFailed: "AI 分析失败：",
      aiEmpty: "模型没有返回有效内容。",
      newsLabel: "相关新闻",
      newsTitle: "板块消息",
      refreshNews: "刷新",
      newsLoading: "正在读取相关新闻...",
      newsEmpty: "暂无匹配新闻。",
      sourceFailed: "部分新闻源暂时不可用。",
      loading: "正在读取板块数据...",
      loadFailed: "板块数据暂时不可用，请稍后刷新。",
      updatedPrefix: "更新时间",
      unknownTime: "未知",
      amountSuffix: "亿",
      noData: "暂无数据",
      price: "现价",
      turnover: "成交额",
      disclaimer: "行情与新闻来自公开接口，AI 内容仅用于辅助梳理，不构成投资建议。",
      superLarge: "超大单",
      large: "大单",
      medium: "中单",
      small: "小单",
      modelMissing: "未配置模型",
      modelReady: "已连接",
      configureAi: "打开 AI Chat 配置",
    },
    en: {
      locale: "en-US",
      pageTitle: "Sector Detail",
      back: "Back to flow board",
      eastmoney: "Eastmoney",
      industrySector: "Industry sector detail",
      conceptSector: "Concept sector detail",
      unknownSector: "Sector detail",
      changePercent: "Change",
      netMain: "Main net inflow",
      netRatio: "Main net ratio",
      leader: "Leader",
      stocksCount: "Stocks",
      flowLabel: "Flow Structure",
      flowTitle: "Tiered capital flow",
      constituentsLabel: "Constituents",
      constituentsTitle: "Sector performance",
      gainers: "Gainers",
      inflow: "Inflow",
      outflow: "Outflow",
      aiLabel: "AI Analysis",
      aiTitle: "Current sector view",
      runAi: "Analyze sector",
      analyzing: "AI is analyzing this sector...",
      aiReady: "AI analysis is ready.",
      aiNeedSetup: "Configure a model and API key in AI Chat first.",
      aiNoData: "There is not enough sector data to analyze.",
      aiFailed: "AI analysis failed: ",
      aiEmpty: "The model returned no usable content.",
      newsLabel: "Related News",
      newsTitle: "Sector news",
      refreshNews: "Refresh",
      newsLoading: "Loading related news...",
      newsEmpty: "No matching news yet.",
      sourceFailed: "Some news sources are temporarily unavailable.",
      loading: "Loading sector data...",
      loadFailed: "Sector data is temporarily unavailable. Try again later.",
      updatedPrefix: "Updated",
      unknownTime: "Unknown",
      amountSuffix: "B",
      noData: "No data",
      price: "Price",
      turnover: "Turnover",
      disclaimer: "Quotes and news come from public endpoints. AI output is for information only, not investment advice.",
      superLarge: "Super large",
      large: "Large",
      medium: "Medium",
      small: "Small",
      modelMissing: "No model",
      modelReady: "Connected",
      configureAi: "Open AI Chat settings",
    },
  };

  const refs = {};
  const state = {
    query: parseQuery(),
    sector: null,
    components: {
      total: 0,
      gainers: [],
      inflow: [],
      outflow: [],
    },
    activeComponentList: "gainers",
    activeSourceIds: [],
    news: [],
    loading: false,
    newsLoading: false,
    aiBusy: false,
  };

  function parseQuery() {
    const params = new URLSearchParams(window.location.search);
    const type = BOARD_TYPES[params.get("type")] ? params.get("type") : "industry";
    return {
      type: type,
      code: String(params.get("code") || "").trim().toUpperCase(),
      name: String(params.get("name") || "").trim(),
    };
  }

  function language() {
    return window.WKSite && typeof window.WKSite.getLanguage === "function"
      ? window.WKSite.getLanguage()
      : "zh";
  }

  function t(key) {
    const lang = language();
    return (text[lang] && text[lang][key]) || text.zh[key] || key;
  }

  function applyStaticText() {
    document.querySelectorAll("[data-stock-detail-text]").forEach(function (node) {
      const key = node.dataset.stockDetailText;
      node.textContent = t(key);
    });
    updateDocumentMeta();
    syncAiState();
  }

  function updateDocumentMeta() {
    const name = currentSectorName();
    document.title = (name ? name + " · " : "") + t("pageTitle") + " · WK1995";
    const description = document.querySelector('meta[name="description"]');
    if (description) {
      description.setAttribute("content", (name ? name + " " : "") + t("pageTitle"));
    }
  }

  function currentSectorName() {
    return (state.sector && state.sector.name) || state.query.name || state.query.code || "";
  }

  function currentSectorContext() {
    return {
      sectorCode: state.query.code,
      sectorName: currentSectorName(),
      sectorType: state.query.type,
      language: language(),
    };
  }

  function sectorTypeLabel() {
    if (state.query.type === "concept") {
      return t("conceptSector");
    }
    if (state.query.type === "industry") {
      return t("industrySector");
    }
    return t("unknownSector");
  }

  function formatAmount(value, options) {
    const amount = Number(value);
    if (!Number.isFinite(amount)) {
      return "--";
    }
    const precision = options && options.compact ? 1 : 2;
    const absYi = Math.abs(amount) / 100000000;
    const sign = amount > 0 ? "+" : amount < 0 ? "-" : "";
    return sign + absYi.toFixed(precision) + t("amountSuffix");
  }

  function formatUnsignedAmount(value) {
    const amount = Number(value);
    if (!Number.isFinite(amount)) {
      return "--";
    }
    return (amount / 100000000).toFixed(2) + t("amountSuffix");
  }

  function formatPercent(value) {
    const number = Number(value);
    if (!Number.isFinite(number)) {
      return "--";
    }
    return (number > 0 ? "+" : "") + number.toFixed(2) + "%";
  }

  function formatPrice(value) {
    const number = Number(value);
    if (!Number.isFinite(number)) {
      return "--";
    }
    return number.toFixed(2);
  }

  function formatTime(seconds) {
    const timestamp = Number(seconds);
    if (!Number.isFinite(timestamp) || timestamp <= 0) {
      return t("unknownTime");
    }
    return new Intl.DateTimeFormat(t("locale"), {
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Asia/Shanghai",
    }).format(new Date(timestamp * 1000));
  }

  function normalizeBoardItem(item) {
    return {
      code: item.f12,
      name: item.f14,
      netMain: Number(item.f62),
      superLarge: Number(item.f66),
      large: Number(item.f72),
      medium: Number(item.f78),
      small: Number(item.f84),
      netRatio: Number(item.f184),
      leaderName: item.f204 || "",
      leaderCode: item.f205 || "",
      price: Number(item.f2),
      changePercent: Number(item.f3),
      change: Number(item.f4),
      totalValue: Number(item.f20),
      updatedAt: Number(item.f124),
    };
  }

  function normalizeComponentItem(item) {
    return {
      code: item.f12,
      name: item.f14,
      price: Number(item.f2),
      changePercent: Number(item.f3),
      change: Number(item.f4),
      volume: Number(item.f5),
      turnover: Number(item.f6),
      totalValue: Number(item.f20),
      netMain: Number(item.f62),
      netRatio: Number(item.f184),
      updatedAt: Number(item.f124),
    };
  }

  function boardEndpoint(boardType, order) {
    const params = new URLSearchParams({
      fid: "f62",
      po: order,
      pz: "600",
      pn: "1",
      np: "1",
      fltt: "2",
      invt: "2",
      fs: BOARD_TYPES[boardType] || BOARD_TYPES.industry,
      fields: BOARD_FIELD_LIST,
    });
    return API_URL + "?" + params.toString();
  }

  function componentEndpoint(fid, order) {
    const params = new URLSearchParams({
      fid: fid,
      po: order,
      pz: "20",
      pn: "1",
      np: "1",
      fltt: "2",
      invt: "2",
      fs: "b:" + state.query.code,
      fields: COMPONENT_FIELD_LIST,
    });
    return API_URL + "?" + params.toString();
  }

  async function fetchJson(url) {
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) {
      throw new Error("HTTP " + response.status);
    }
    return response.json();
  }

  async function fetchBoardItems(boardType, order) {
    const payload = await fetchJson(boardEndpoint(boardType, order));
    const rows = payload && payload.data && Array.isArray(payload.data.diff)
      ? payload.data.diff
      : [];
    return rows.map(normalizeBoardItem);
  }

  async function fetchSectorSnapshot() {
    const primary = await fetchBoardItems(state.query.type, "1");
    let found = primary.find(function (item) { return item.code === state.query.code; });
    if (found) {
      return found;
    }

    const fallbackType = state.query.type === "concept" ? "industry" : "concept";
    const fallback = await fetchBoardItems(fallbackType, "1").catch(function () { return []; });
    found = fallback.find(function (item) { return item.code === state.query.code; });
    if (found) {
      state.query.type = fallbackType;
      return found;
    }

    return {
      code: state.query.code,
      name: state.query.name || state.query.code,
      netMain: NaN,
      superLarge: NaN,
      large: NaN,
      medium: NaN,
      small: NaN,
      netRatio: NaN,
      leaderName: "",
      leaderCode: "",
      price: NaN,
      changePercent: NaN,
      change: NaN,
      updatedAt: 0,
    };
  }

  async function fetchComponentList(fid, order) {
    const payload = await fetchJson(componentEndpoint(fid, order));
    const rows = payload && payload.data && Array.isArray(payload.data.diff)
      ? payload.data.diff
      : [];
    return {
      total: payload && payload.data ? Number(payload.data.total) : rows.length,
      items: rows.map(normalizeComponentItem),
    };
  }

  async function fetchComponents() {
    if (!state.query.code) {
      return {
        total: 0,
        gainers: [],
        inflow: [],
        outflow: [],
      };
    }
    const results = await Promise.all([
      fetchComponentList("f3", "1"),
      fetchComponentList("f62", "1"),
      fetchComponentList("f62", "0"),
    ]);
    return {
      total: Math.max(results[0].total || 0, results[1].total || 0, results[2].total || 0),
      gainers: results[0].items,
      inflow: results[1].items,
      outflow: results[2].items,
    };
  }

  function setSignedClass(element, value) {
    const number = Number(value);
    element.classList.toggle("is-up", Number.isFinite(number) && number > 0);
    element.classList.toggle("is-down", Number.isFinite(number) && number < 0);
  }

  function renderSector() {
    const sector = state.sector || {};
    const name = currentSectorName() || "--";
    refs.sectorType.textContent = sectorTypeLabel();
    refs.sectorName.textContent = name;
    refs.sectorCode.textContent = sector.code || state.query.code || "--";
    refs.sectorUpdated.textContent = t("updatedPrefix") + " " + formatTime(sector.updatedAt);
    refs.eastmoney.href = state.query.code
      ? "https://quote.eastmoney.com/bk/" + state.query.code + ".html"
      : "#";
    refs.eastmoney.hidden = !state.query.code;
    refs.change.textContent = formatPercent(sector.changePercent);
    setSignedClass(refs.change, sector.changePercent);
    setSignedClass(refs.detailScore, sector.changePercent);
    refs.netMain.textContent = formatAmount(sector.netMain);
    refs.netRatio.textContent = formatPercent(sector.netRatio);
    refs.leader.textContent = sector.leaderName || "--";
    refs.stockCount.textContent = state.components.total ? String(state.components.total) : "--";
    renderFlowBars();
    updateDocumentMeta();
  }

  function renderFlowBars() {
    const sector = state.sector || {};
    const rows = [
      { key: "superLarge", value: sector.superLarge },
      { key: "large", value: sector.large },
      { key: "medium", value: sector.medium },
      { key: "small", value: sector.small },
    ];
    const maxAbs = Math.max.apply(null, rows.map(function (item) {
      const value = Number(item.value);
      return Number.isFinite(value) ? Math.abs(value) : 0;
    }).concat([1]));

    refs.flowBars.innerHTML = "";
    rows.forEach(function (item) {
      const value = Number(item.value);
      const valid = Number.isFinite(value);
      const row = document.createElement("div");
      row.className = "stock-flow-bar-row";
      row.classList.toggle("is-up", valid && value > 0);
      row.classList.toggle("is-down", valid && value < 0);

      const label = document.createElement("span");
      label.className = "stock-flow-bar-label";
      label.textContent = t(item.key);

      const track = document.createElement("span");
      track.className = "stock-flow-bar-track";
      const fill = document.createElement("span");
      fill.className = "stock-flow-bar-fill";
      fill.style.setProperty("--bar-width", valid ? Math.max(3, Math.round(Math.abs(value) / maxAbs * 100)) + "%" : "0%");
      track.appendChild(fill);

      const amount = document.createElement("strong");
      amount.textContent = valid ? formatAmount(value) : "--";
      row.append(label, track, amount);
      refs.flowBars.appendChild(row);
    });
  }

  function renderComponents() {
    const items = state.components[state.activeComponentList] || [];
    refs.componentList.innerHTML = "";
    if (!items.length) {
      refs.componentList.appendChild(emptyNode(t("noData")));
      return;
    }
    const fragment = document.createDocumentFragment();
    items.slice(0, 12).forEach(function (item, index) {
      fragment.appendChild(componentRow(item, index));
    });
    refs.componentList.appendChild(fragment);
  }

  function componentRow(item, index) {
    const row = document.createElement("a");
    row.className = "stock-component-row";
    row.href = "https://so.eastmoney.com/web/s?keyword=" + encodeURIComponent(item.code || item.name || "");
    row.target = "_blank";
    row.rel = "noopener";

    const rank = document.createElement("span");
    rank.className = "stock-rank-index";
    rank.textContent = "#" + String(index + 1).padStart(2, "0");

    const name = document.createElement("span");
    name.className = "stock-component-name";
    const title = document.createElement("strong");
    title.textContent = item.name || "--";
    const code = document.createElement("span");
    code.textContent = item.code || "--";
    name.append(title, code);

    const price = metricCell(t("price"), formatPrice(item.price));
    const change = metricCell(t("changePercent"), formatPercent(item.changePercent), item.changePercent);
    const flow = metricCell(t("netMain"), formatAmount(item.netMain, { compact: true }), item.netMain);
    const turnover = metricCell(t("turnover"), formatUnsignedAmount(item.turnover));

    row.append(rank, name, price, change, flow, turnover);
    return row;
  }

  function metricCell(label, value, signedValue) {
    const cell = document.createElement("span");
    cell.className = "stock-component-metric";
    if (signedValue !== undefined) {
      setSignedClass(cell, signedValue);
    }
    const caption = document.createElement("span");
    caption.textContent = label;
    const strong = document.createElement("strong");
    strong.textContent = value;
    cell.append(caption, strong);
    return cell;
  }

  function emptyNode(message) {
    const empty = document.createElement("div");
    empty.className = "stock-detail-empty";
    empty.textContent = message;
    return empty;
  }

  function loadingNode(message) {
    const loading = document.createElement("div");
    loading.className = "stock-loading";
    loading.textContent = message;
    return loading;
  }

  function setLoading(isLoading) {
    state.loading = isLoading;
    if (isLoading) {
      refs.componentList.innerHTML = "";
      refs.componentList.appendChild(loadingNode(t("loading")));
    }
  }

  async function loadSectorData() {
    setLoading(true);
    try {
      state.sector = await fetchSectorSnapshot();
      state.components = await fetchComponents();
      renderSector();
      renderComponents();
    } catch (error) {
      refs.componentList.innerHTML = "";
      refs.componentList.appendChild(emptyNode(t("loadFailed")));
      renderSector();
    } finally {
      setLoading(false);
    }
  }

  function newsConfig() {
    const config = window.WKStockNewsConfig || {};
    const sources = Array.isArray(config.sources) ? config.sources.filter(function (source) {
      return source && source.id && source.type;
    }) : [];
    return {
      maxItems: Number(config.maxItems) > 0 ? Number(config.maxItems) : 12,
      defaultSourceIds: Array.isArray(config.defaultSourceIds) ? config.defaultSourceIds : sources.map(function (source) { return source.id; }),
      sources: sources,
    };
  }

  function activeSources() {
    const config = newsConfig();
    if (!state.activeSourceIds.length) {
      state.activeSourceIds = config.defaultSourceIds.filter(function (id) {
        return config.sources.some(function (source) { return source.id === id; });
      });
      if (!state.activeSourceIds.length && config.sources[0]) {
        state.activeSourceIds = [config.sources[0].id];
      }
    }
    return config.sources.filter(function (source) {
      return state.activeSourceIds.indexOf(source.id) !== -1;
    });
  }

  function renderSourceFilters() {
    const config = newsConfig();
    refs.newsSources.innerHTML = "";
    if (!config.sources.length) {
      return;
    }
    activeSources();
    config.sources.forEach(function (source) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "stock-news-source";
      button.classList.toggle("is-active", state.activeSourceIds.indexOf(source.id) !== -1);
      button.textContent = source.label || source.id;
      button.addEventListener("click", function () {
        const index = state.activeSourceIds.indexOf(source.id);
        if (index === -1) {
          state.activeSourceIds.push(source.id);
        } else if (state.activeSourceIds.length > 1) {
          state.activeSourceIds.splice(index, 1);
        }
        renderSourceFilters();
        loadNews();
      });
      refs.newsSources.appendChild(button);
    });
  }

  function interpolateUrl(template, callbackName) {
    const context = currentSectorContext();
    return String(template || "").replace(/\{\{([a-zA-Z]+)\}\}/g, function (match, key) {
      const value = key === "callback" ? callbackName : context[key] || "";
      return encodeURIComponent(value);
    });
  }

  function sourceUrl(source, callbackName) {
    if (typeof source.buildUrl === "function") {
      return source.buildUrl(currentSectorContext(), callbackName);
    }
    return interpolateUrl(source.url || "", callbackName);
  }

  function parseSourceItems(source, payload) {
    const rows = typeof source.parse === "function" ? source.parse(payload, currentSectorContext()) : payload;
    return (Array.isArray(rows) ? rows : []).map(function (item) {
      return normalizeNewsItem(item, source);
    }).filter(function (item) {
      return item.title;
    });
  }

  function normalizeNewsItem(item, source) {
    const sourceName = item.source || item.mediaName || item.media || source.label || source.id;
    return {
      id: item.id || item.url || item.title,
      title: stripHtml(item.title || ""),
      summary: stripHtml(item.summary || item.content || item.description || ""),
      source: sourceName,
      publishedAt: item.publishedAt || item.date || item.time || "",
      url: item.url || item.link || "",
      sourceId: source.id,
    };
  }

  function stripHtml(value) {
    return String(value || "")
      .replace(/<[^>]+>/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function loadJsonp(url, callbackName) {
    return new Promise(function (resolve, reject) {
      const script = document.createElement("script");
      const timeout = window.setTimeout(function () {
        cleanup();
        reject(new Error("JSONP timeout"));
      }, 12000);

      function cleanup() {
        window.clearTimeout(timeout);
        if (script.parentNode) {
          script.parentNode.removeChild(script);
        }
        try {
          delete window[callbackName];
        } catch (error) {
          window[callbackName] = undefined;
        }
      }

      window[callbackName] = function (payload) {
        cleanup();
        resolve(payload);
      };
      script.onerror = function () {
        cleanup();
        reject(new Error("JSONP failed"));
      };
      script.src = url;
      document.head.appendChild(script);
    });
  }

  function parseRss(textValue) {
    const doc = new DOMParser().parseFromString(textValue, "text/xml");
    return Array.from(doc.querySelectorAll("item, entry")).map(function (item) {
      const title = item.querySelector("title");
      const link = item.querySelector("link");
      const summary = item.querySelector("description, summary, content");
      const date = item.querySelector("pubDate, published, updated");
      return {
        title: title ? title.textContent : "",
        summary: summary ? summary.textContent : "",
        publishedAt: date ? date.textContent : "",
        url: link ? (link.getAttribute("href") || link.textContent) : "",
      };
    });
  }

  async function fetchSourceNews(source) {
    if (source.type === "jsonp") {
      const callbackName = "__wkStockNews" + Date.now() + Math.random().toString(16).slice(2);
      const payload = await loadJsonp(sourceUrl(source, callbackName), callbackName);
      return parseSourceItems(source, payload);
    }
    const response = await fetch(sourceUrl(source, ""), { cache: "no-store" });
    if (!response.ok) {
      throw new Error("HTTP " + response.status);
    }
    if (source.type === "rss") {
      return parseSourceItems(source, parseRss(await response.text()));
    }
    return parseSourceItems(source, await response.json());
  }

  function dedupeNews(items) {
    const seen = new Set();
    return items.filter(function (item) {
      const key = item.id || item.url || item.title;
      if (!key || seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  function newsTimeValue(item) {
    const value = Date.parse(item.publishedAt);
    return Number.isFinite(value) ? value : 0;
  }

  async function loadNews() {
    const sources = activeSources();
    if (!sources.length || !currentSectorName()) {
      refs.newsList.innerHTML = "";
      refs.newsList.appendChild(emptyNode(t("newsEmpty")));
      return;
    }
    state.newsLoading = true;
    refs.newsRefresh.disabled = true;
    refs.newsList.innerHTML = "";
    refs.newsList.appendChild(loadingNode(t("newsLoading")));
    let failed = false;
    try {
      const results = await Promise.all(sources.map(function (source) {
        return fetchSourceNews(source).catch(function () {
          failed = true;
          return [];
        });
      }));
      const config = newsConfig();
      state.news = dedupeNews([].concat.apply([], results))
        .sort(function (a, b) { return newsTimeValue(b) - newsTimeValue(a); })
        .slice(0, config.maxItems);
      renderNews(failed);
    } finally {
      state.newsLoading = false;
      refs.newsRefresh.disabled = false;
    }
  }

  function renderNews(failed) {
    refs.newsList.innerHTML = "";
    if (failed) {
      const warning = document.createElement("div");
      warning.className = "stock-news-warning";
      warning.textContent = t("sourceFailed");
      refs.newsList.appendChild(warning);
    }
    if (!state.news.length) {
      refs.newsList.appendChild(emptyNode(t("newsEmpty")));
      return;
    }
    const fragment = document.createDocumentFragment();
    state.news.forEach(function (item) {
      fragment.appendChild(newsItemNode(item));
    });
    refs.newsList.appendChild(fragment);
  }

  function newsItemNode(item) {
    const node = document.createElement(item.url ? "a" : "article");
    node.className = "stock-news-item";
    if (item.url) {
      node.href = item.url;
      node.target = "_blank";
      node.rel = "noopener";
    }

    const meta = document.createElement("span");
    meta.className = "stock-news-meta";
    meta.textContent = [item.source, item.publishedAt].filter(Boolean).join(" · ");

    const title = document.createElement("strong");
    title.textContent = item.title;

    const summary = document.createElement("span");
    summary.className = "stock-news-summary";
    summary.textContent = item.summary || "";

    node.append(meta, title);
    if (item.summary) {
      node.appendChild(summary);
    }
    return node;
  }

  function modelConfig() {
    const catalog = window.WKModelCatalog;
    if (!catalog || typeof catalog.loadConfig !== "function") {
      return null;
    }
    const config = catalog.loadConfig();
    const modelId = config.selectedModel;
    const meta = catalog.modelMeta(modelId, config.customModels);
    const key = modelId && config.keys ? config.keys[modelId] : "";
    return {
      catalog: catalog,
      config: config,
      modelId: modelId,
      meta: meta,
      key: key,
    };
  }

  function syncAiState() {
    if (!refs.aiModel || !refs.aiRun) {
      return;
    }
    const model = modelConfig();
    const ready = Boolean(model && model.modelId && model.key && model.meta);
    refs.aiModel.textContent = ready
      ? model.catalog.labelForModel(model.meta, language()) + " · " + t("modelReady")
      : t("modelMissing");
    refs.aiRun.disabled = state.aiBusy || !ready;
    if (!ready) {
      refs.aiStatus.innerHTML = "";
      const span = document.createElement("span");
      span.textContent = t("aiNeedSetup") + " ";
      const link = document.createElement("a");
      link.href = "../../chat/";
      link.textContent = t("configureAi");
      refs.aiStatus.append(span, link);
    } else if (!state.aiBusy && !refs.aiResult.textContent.trim()) {
      refs.aiStatus.textContent = "";
    }
  }

  function requestModelName(model) {
    return model.meta && model.meta.custom ? model.meta.model : model.modelId;
  }

  function endpointUrl(baseUrl, suffix) {
    const trimmed = String(baseUrl || "").trim().replace(/\/+$/, "");
    return trimmed.toLowerCase().endsWith(suffix) ? trimmed : trimmed + suffix;
  }

  function isAnthropicModel(model) {
    return Boolean(model.meta && model.meta.custom && model.meta.type === "anthropic");
  }

  function requestApiUrl(model) {
    if (model.meta && model.meta.custom) {
      return isAnthropicModel(model)
        ? endpointUrl(model.meta.baseUrl, "/messages")
        : endpointUrl(model.meta.baseUrl, "/chat/completions");
    }
    return model.catalog.providerMeta(model.meta.provider).apiUrl;
  }

  function requestHeaders(model) {
    if (isAnthropicModel(model)) {
      return {
        "Content-Type": "application/json",
        "x-api-key": model.key,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true",
      };
    }
    return {
      "Content-Type": "application/json",
      Authorization: "Bearer " + model.key,
    };
  }

  function buildAiPrompt() {
    const payload = {
      sector: state.sector,
      components: {
        gainers: state.components.gainers.slice(0, 8),
        inflow: state.components.inflow.slice(0, 8),
        outflow: state.components.outflow.slice(0, 8),
      },
      news: state.news.slice(0, 8),
    };
    if (language() === "en") {
      return [
        "Analyze this A-share sector using only the public quote and news context below.",
        "Return concise sections: current state, capital flow structure, news catalysts, risks, and watchlist.",
        "Do not provide personalized investment advice.",
        JSON.stringify(payload, null, 2),
      ].join("\n\n");
    }
    return [
      "你是 A 股板块研究助手。请只基于下面的公开行情、成分股和新闻上下文分析当前板块。",
      "输出需要包含：当前状态、资金结构、消息催化、主要风险、后续观察清单。",
      "不要给出个性化买卖建议，也不要编造未提供的数据。",
      JSON.stringify(payload, null, 2),
    ].join("\n\n");
  }

  function aiSystemPrompt() {
    return language() === "en"
      ? "You are a careful market research assistant. Be concise, factual, and risk-aware."
      : "你是谨慎的市场研究助手，回答要简洁、基于事实，并明确风险。";
  }

  function modelProviderId(model) {
    return model.meta && model.meta.provider ? model.meta.provider : "";
  }

  function buildAiBody(model) {
    const prompt = buildAiPrompt();
    if (isAnthropicModel(model)) {
      return {
        model: requestModelName(model),
        system: aiSystemPrompt(),
        messages: [{ role: "user", content: prompt }],
        max_tokens: 2048,
      };
    }
    const body = {
      model: requestModelName(model),
      messages: [
        { role: "system", content: aiSystemPrompt() },
        { role: "user", content: prompt },
      ],
      stream: false,
    };
    if (modelProviderId(model) === "zhipu" && model.meta && model.meta.thinking) {
      body.thinking = { type: "enabled" };
    }
    return body;
  }

  function responseErrorMessage(payload, fallback) {
    if (payload && payload.error) {
      if (typeof payload.error.message === "string" && payload.error.message.trim()) {
        return payload.error.message.trim();
      }
      if (typeof payload.error.type === "string" && payload.error.type.trim()) {
        return payload.error.type.trim();
      }
      return JSON.stringify(payload.error);
    }
    return fallback || "Unknown error";
  }

  async function readErrorResponse(response) {
    const fallback = response && response.statusText ? response.statusText : "Unknown error";
    try {
      const raw = await response.text();
      if (!raw) {
        return fallback;
      }
      try {
        return responseErrorMessage(JSON.parse(raw), fallback);
      } catch (error) {
        return raw.trim() || fallback;
      }
    } catch (error) {
      return fallback;
    }
  }

  function responseContent(payload) {
    if (payload && Array.isArray(payload.content)) {
      return payload.content.map(function (item) {
        return item && typeof item.text === "string" ? item.text : "";
      }).join("\n").trim();
    }
    const choice = payload && Array.isArray(payload.choices) ? payload.choices[0] : null;
    const message = choice && choice.message ? choice.message : null;
    return message && typeof message.content === "string" ? message.content.trim() : "";
  }

  async function runAiAnalysis() {
    const model = modelConfig();
    if (!model || !model.modelId || !model.key || !model.meta) {
      syncAiState();
      return;
    }
    if (!state.sector) {
      refs.aiStatus.textContent = t("aiNoData");
      return;
    }
    state.aiBusy = true;
    refs.aiRun.disabled = true;
    refs.aiStatus.textContent = t("analyzing");
    refs.aiResult.textContent = "";
    try {
      const response = await fetch(requestApiUrl(model), {
        method: "POST",
        headers: requestHeaders(model),
        body: JSON.stringify(buildAiBody(model)),
      });
      if (!response.ok) {
        throw new Error(await readErrorResponse(response));
      }
      const content = responseContent(await response.json());
      if (!content) {
        throw new Error(t("aiEmpty"));
      }
      refs.aiStatus.textContent = t("aiReady");
      refs.aiResult.textContent = content;
    } catch (error) {
      refs.aiStatus.textContent = t("aiFailed") + (error && error.message ? error.message : "Unknown error");
    } finally {
      state.aiBusy = false;
      syncAiState();
    }
  }

  function bind() {
    document.querySelectorAll("[data-component-list]").forEach(function (button) {
      button.addEventListener("click", function () {
        state.activeComponentList = button.dataset.componentList || "gainers";
        document.querySelectorAll("[data-component-list]").forEach(function (item) {
          item.classList.toggle("is-active", item === button);
        });
        renderComponents();
      });
    });
    refs.newsRefresh.addEventListener("click", loadNews);
    refs.aiRun.addEventListener("click", runAiAnalysis);
    window.addEventListener("wk:language-change", function () {
      applyStaticText();
      renderSector();
      renderComponents();
      renderNews(false);
    });
  }

  function initRefs() {
    refs.sectorType = document.getElementById("sector-type-label");
    refs.sectorName = document.getElementById("sector-name");
    refs.sectorCode = document.getElementById("sector-code");
    refs.sectorUpdated = document.getElementById("sector-updated");
    refs.eastmoney = document.getElementById("sector-eastmoney-link");
    refs.detailScore = document.querySelector(".stock-detail-score");
    refs.change = document.getElementById("sector-change");
    refs.netMain = document.getElementById("sector-net-main");
    refs.netRatio = document.getElementById("sector-net-ratio");
    refs.leader = document.getElementById("sector-leader");
    refs.stockCount = document.getElementById("sector-stock-count");
    refs.flowBars = document.getElementById("sector-flow-bars");
    refs.componentList = document.getElementById("sector-component-list");
    refs.aiModel = document.getElementById("sector-ai-model");
    refs.aiRun = document.getElementById("sector-ai-run");
    refs.aiStatus = document.getElementById("sector-ai-status");
    refs.aiResult = document.getElementById("sector-ai-result");
    refs.newsSources = document.getElementById("sector-news-sources");
    refs.newsRefresh = document.getElementById("sector-news-refresh");
    refs.newsList = document.getElementById("sector-news-list");
  }

  function init() {
    initRefs();
    applyStaticText();
    renderSourceFilters();
    state.sector = {
      code: state.query.code,
      name: state.query.name || state.query.code,
      updatedAt: 0,
    };
    renderSector();
    bind();
    loadSectorData();
    loadNews();
  }

  init();
})();
