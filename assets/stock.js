(function () {
  const API_URL = "https://push2.eastmoney.com/api/qt/clist/get";
  const BOARD_TYPES = {
    industry: "m:90+t:2",
    concept: "m:90+t:3",
  };
  const FIELD_LIST = [
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

  const text = {
    zh: {
      locale: "zh-CN",
      eyebrow: "A-SHARE FLOW",
      title: "A 股板块资金流向",
      intro: "追踪当日行业与概念板块主力资金净流入、净流出，资金单位按亿元展示。",
      marketLabel: "市场",
      industry: "行业板块",
      concept: "概念板块",
      watchlist: "自选股票",
      refresh: "刷新",
      refreshing: "刷新中",
      topInflow: "最大净流入",
      topOutflow: "最大净流出",
      flowSpread: "头部流向差",
      boardCount: "覆盖板块",
      mapLabel: "资金气泡图",
      legendInflow: "主力净流入",
      legendOutflow: "主力净流出",
      loading: "正在读取当日板块资金流向...",
      loadFailed: "资金流向数据暂时不可用，请稍后刷新。",
      inflowRank: "主力净流入排行",
      outflowRank: "主力净流出排行",
      leader: "领涨股",
      updatedPrefix: "更新时间",
      unknownTime: "未知",
      amountSuffix: "亿",
      mapTitleIndustry: "行业板块主力资金流向",
      mapTitleConcept: "概念板块主力资金流向",
      disclaimer: "数据来自东方财富公开行情接口，仅用于信息展示，不构成投资建议。交易日盘中数据会随行情刷新。",
    },
    en: {
      locale: "en-US",
      eyebrow: "A-SHARE FLOW",
      title: "A-share sector capital flow",
      intro: "Tracks today's main-force net inflow and outflow across A-share industry and concept sectors, shown in CNY 100M.",
      marketLabel: "Market",
      industry: "Industries",
      concept: "Concepts",
      watchlist: "Watchlist",
      refresh: "Refresh",
      refreshing: "Refreshing",
      topInflow: "Top inflow",
      topOutflow: "Top outflow",
      flowSpread: "Top spread",
      boardCount: "Sectors",
      mapLabel: "Flow bubble map",
      legendInflow: "Main net inflow",
      legendOutflow: "Main net outflow",
      loading: "Loading today's sector capital flow...",
      loadFailed: "Capital flow data is temporarily unavailable. Try refreshing later.",
      inflowRank: "Main net inflow ranking",
      outflowRank: "Main net outflow ranking",
      leader: "Leading stock",
      updatedPrefix: "Updated",
      unknownTime: "Unknown",
      amountSuffix: "B",
      mapTitleIndustry: "Industry sector main-force flow",
      mapTitleConcept: "Concept sector main-force flow",
      disclaimer: "Data is loaded from Eastmoney's public quote API for display only and is not investment advice. Intraday data changes during trading sessions.",
    },
  };

  const refs = {};
  const state = {
    boardType: "industry",
    data: null,
    loading: false,
  };

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
    document.querySelectorAll("[data-stock-text]").forEach(function (node) {
      const key = node.dataset.stockText;
      node.textContent = t(key);
    });
    document.title = t("title") + " · WK1995";
    const description = document.querySelector('meta[name="description"]');
    if (description) {
      description.setAttribute("content", t("intro"));
    }
    if (refs.refresh) {
      refs.refresh.textContent = state.loading ? t("refreshing") : t("refresh");
    }
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

  function formatPercent(value) {
    const number = Number(value);
    if (!Number.isFinite(number)) {
      return "--";
    }
    return (number > 0 ? "+" : "") + number.toFixed(2) + "%";
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

  function normalizeItem(item) {
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
      updatedAt: Number(item.f124),
    };
  }

  function uniqueByCode(items) {
    const seen = new Set();
    return items.filter(function (item) {
      if (!item || !item.code || seen.has(item.code)) {
        return false;
      }
      seen.add(item.code);
      return true;
    });
  }

  function endpoint(boardType, order) {
    const params = new URLSearchParams({
      fid: "f62",
      po: order,
      pz: "80",
      pn: "1",
      np: "1",
      fltt: "2",
      invt: "2",
      fs: BOARD_TYPES[boardType] || BOARD_TYPES.industry,
      fields: FIELD_LIST,
    });
    return API_URL + "?" + params.toString();
  }

  async function fetchBoard(boardType, order) {
    const response = await fetch(endpoint(boardType, order), { cache: "no-store" });
    if (!response.ok) {
      throw new Error("HTTP " + response.status);
    }
    const payload = await response.json();
    const rows = payload && payload.data && Array.isArray(payload.data.diff)
      ? payload.data.diff
      : [];
    return {
      total: payload && payload.data ? Number(payload.data.total) : 0,
      items: rows.map(normalizeItem).filter(function (item) {
        return Number.isFinite(item.netMain);
      }),
    };
  }

  function setLoading(isLoading) {
    state.loading = isLoading;
    if (refs.refresh) {
      refs.refresh.disabled = isLoading;
      refs.refresh.textContent = isLoading ? t("refreshing") : t("refresh");
    }
  }

  function renderLoading() {
    refs.bubbleBoard.innerHTML = "";
    const loading = document.createElement("div");
    loading.className = "stock-loading";
    loading.textContent = t("loading");
    refs.bubbleBoard.appendChild(loading);
  }

  function renderError() {
    refs.bubbleBoard.innerHTML = "";
    const error = document.createElement("div");
    error.className = "stock-error";
    error.textContent = t("loadFailed");
    refs.bubbleBoard.appendChild(error);
    refs.updated.textContent = t("updatedPrefix") + " --";
  }

  function metricName(item) {
    return item ? item.name + " " + formatAmount(item.netMain, { compact: true }) : "--";
  }

  function renderSummary(data) {
    const inflow = data.inflow[0];
    const outflow = data.outflow[0];
    refs.topInflow.textContent = metricName(inflow);
    refs.topOutflow.textContent = metricName(outflow);
    refs.flowSpread.textContent = inflow && outflow
      ? formatAmount(inflow.netMain - outflow.netMain, { compact: true })
      : "--";
    refs.boardCount.textContent = data.total ? String(data.total) : String(data.all.length);
    refs.updated.textContent = t("updatedPrefix") + " " + formatTime(data.updatedAt);
    refs.mapTitle.textContent = t(state.boardType === "concept" ? "mapTitleConcept" : "mapTitleIndustry");
  }

  function bubbleSize(item, maxAbs, index) {
    const normalized = maxAbs > 0 ? Math.sqrt(Math.abs(item.netMain) / maxAbs) : 0.5;
    const size = 58 + normalized * 78 - Math.min(index, 10) * 1.6;
    return Math.max(52, Math.min(138, Math.round(size)));
  }

  function sectorDetailUrl(item) {
    const params = new URLSearchParams({
      type: state.boardType,
      code: item.code || "",
      name: item.name || "",
    });
    return "detail/index.html?" + params.toString();
  }

  function createBubble(item, maxAbs, type, index) {
    const bubble = document.createElement("a");
    bubble.className = "stock-bubble " + type;
    bubble.href = sectorDetailUrl(item);
    bubble.style.setProperty("--bubble-size", bubbleSize(item, maxAbs, index) + "px");
    bubble.title = item.name + " " + formatAmount(item.netMain) + " / " + formatPercent(item.netRatio);

    const content = document.createElement("span");
    content.className = "stock-bubble-content";

    const name = document.createElement("span");
    name.className = "stock-bubble-name";
    name.textContent = item.name;

    const value = document.createElement("span");
    value.className = "stock-bubble-value";
    value.textContent = formatAmount(item.netMain, { compact: true });

    content.append(name, value);
    bubble.appendChild(content);
    return bubble;
  }

  function createBubbleRegion(items, type, maxAbs) {
    const region = document.createElement("div");
    region.className = "stock-bubble-region " + type;
    items.slice(0, 14).forEach(function (item, index) {
      region.appendChild(createBubble(item, maxAbs, type, index));
    });
    return region;
  }

  function renderBubbles(data) {
    const inflow = data.inflow.filter(function (item) { return item.netMain > 0; }).slice(0, 14);
    const outflow = data.outflow.filter(function (item) { return item.netMain < 0; }).slice(0, 14);
    const maxAbs = Math.max.apply(
      null,
      inflow.concat(outflow).map(function (item) { return Math.abs(item.netMain); }).concat([1])
    );

    refs.bubbleBoard.innerHTML = "";
    refs.bubbleBoard.append(
      createBubbleRegion(inflow, "inflow", maxAbs),
      createDivider(),
      createBubbleRegion(outflow, "outflow", maxAbs)
    );
  }

  function createDivider() {
    const divider = document.createElement("div");
    divider.className = "stock-bubble-divider";
    return divider;
  }

  function createRankRow(item, index, type) {
    const row = document.createElement("a");
    row.className = "stock-rank-row";
    row.href = sectorDetailUrl(item);

    const rank = document.createElement("span");
    rank.className = "stock-rank-index";
    rank.textContent = "#" + String(index + 1).padStart(2, "0");

    const name = document.createElement("span");
    name.className = "stock-rank-name";
    const title = document.createElement("strong");
    title.textContent = item.name;
    const detail = document.createElement("span");
    detail.textContent = t("leader") + " " + (item.leaderName || "--") + " · " + formatPercent(item.changePercent);
    name.append(title, detail);

    const value = document.createElement("span");
    value.className = "stock-rank-value " + type;
    value.textContent = formatAmount(item.netMain);

    row.append(rank, name, value);
    return row;
  }

  function renderRankList(element, items, type) {
    element.innerHTML = "";
    const fragment = document.createDocumentFragment();
    items.slice(0, 12).forEach(function (item, index) {
      fragment.appendChild(createRankRow(item, index, type));
    });
    element.appendChild(fragment);
  }

  function render(data) {
    state.data = data;
    renderSummary(data);
    renderBubbles(data);
    renderRankList(refs.inflowList, data.inflow, "inflow");
    renderRankList(refs.outflowList, data.outflow, "outflow");
  }

  async function load() {
    setLoading(true);
    renderLoading();
    try {
      const results = await Promise.all([
        fetchBoard(state.boardType, "1"),
        fetchBoard(state.boardType, "0"),
      ]);
      const inflow = results[0].items;
      const outflow = results[1].items;
      const all = uniqueByCode(inflow.concat(outflow));
      const updatedAt = Math.max.apply(
        null,
        all.map(function (item) { return item.updatedAt || 0; }).concat([0])
      );
      render({
        inflow: inflow,
        outflow: outflow,
        all: all,
        total: results[0].total || results[1].total || all.length,
        updatedAt: updatedAt,
      });
    } catch (error) {
      renderError();
    } finally {
      setLoading(false);
    }
  }

  function setBoardType(boardType) {
    state.boardType = BOARD_TYPES[boardType] ? boardType : "industry";
    document.querySelectorAll("[data-board-type]").forEach(function (button) {
      const active = button.dataset.boardType === state.boardType;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-selected", active ? "true" : "false");
    });
    load();
  }

  function bind() {
    document.querySelectorAll("[data-board-type]").forEach(function (button) {
      button.addEventListener("click", function () {
        if (button.dataset.boardType !== state.boardType) {
          setBoardType(button.dataset.boardType);
        }
      });
    });

    refs.refresh.addEventListener("click", load);
    window.addEventListener("wk:language-change", function () {
      applyStaticText();
      if (state.data) {
        render(state.data);
      }
    });
  }

  function initRefs() {
    refs.updated = document.getElementById("stock-updated");
    refs.refresh = document.getElementById("stock-refresh");
    refs.topInflow = document.getElementById("stock-top-inflow");
    refs.topOutflow = document.getElementById("stock-top-outflow");
    refs.flowSpread = document.getElementById("stock-flow-spread");
    refs.boardCount = document.getElementById("stock-board-count");
    refs.mapTitle = document.getElementById("stock-map-title");
    refs.bubbleBoard = document.getElementById("stock-bubble-board");
    refs.inflowList = document.getElementById("stock-inflow-list");
    refs.outflowList = document.getElementById("stock-outflow-list");
  }

  initRefs();
  applyStaticText();
  bind();
  load();
})();
