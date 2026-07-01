(function () {
  const text = {
    zh: {
      pageTitle: "股票详情",
      back: "返回自选股票",
      eastmoney: "东方财富",
      price: "现价",
      turnover: "成交额",
      turnoverRate: "换手率",
      marketValue: "总市值",
      mainFlow: "主力净流入",
      consultTab: "咨询",
      profileTab: "公司介绍",
      flowTab: "资金",
      newsLabel: "相关新闻",
      newsTitle: "个股消息",
      refreshNews: "刷新",
      newsLoading: "正在读取个股消息...",
      newsEmpty: "暂无匹配消息。",
      aiLabel: "AI 分析",
      aiTitle: "单股研判",
      runAi: "分析当前股票",
      analyzing: "AI 正在分析当前股票...",
      aiReady: "AI 分析已生成。",
      aiNeedSetup: "请先在 AI Chat 中配置模型和 API Key。",
      configureAi: "打开 AI Chat 配置",
      aiNoData: "当前股票数据不足，暂时无法分析。",
      aiFailed: "AI 分析失败：",
      modelMissing: "未配置模型",
      modelReady: "已连接",
      updated: "更新时间",
      loading: "正在读取股票数据...",
      loadFailed: "股票数据暂时不可用，请稍后重试。",
      industry: "所属行业",
      region: "地区",
      concepts: "关联概念",
      open: "今开",
      high: "最高",
      low: "最低",
      prevClose: "昨收",
      volume: "成交量",
      volumeRatio: "量比",
      circulatingMarketValue: "流通市值",
      pe: "市盈率",
      pb: "市净率",
      amplitude: "振幅",
      innerOuter: "内盘 / 外盘",
      superLarge: "超大单",
      large: "大单",
      medium: "中单",
      small: "小单",
      date: "日期",
      close: "收盘",
      change: "涨跌幅",
      disclaimer: "行情、资金与新闻来自公开接口，AI 内容仅用于辅助梳理，不构成投资建议。",
    },
    en: {
      pageTitle: "Stock Detail",
      back: "Back to watchlist",
      eastmoney: "Eastmoney",
      price: "Price",
      turnover: "Turnover",
      turnoverRate: "Turnover rate",
      marketValue: "Market cap",
      mainFlow: "Main net flow",
      consultTab: "Consult",
      profileTab: "Company",
      flowTab: "Flow",
      newsLabel: "Related News",
      newsTitle: "Stock news",
      refreshNews: "Refresh",
      newsLoading: "Loading stock news...",
      newsEmpty: "No matching news yet.",
      aiLabel: "AI Analysis",
      aiTitle: "Single-stock view",
      runAi: "Analyze stock",
      analyzing: "AI is analyzing this stock...",
      aiReady: "AI analysis is ready.",
      aiNeedSetup: "Configure a model and API key in AI Chat first.",
      configureAi: "Open AI Chat settings",
      aiNoData: "There is not enough stock data to analyze.",
      aiFailed: "AI analysis failed: ",
      modelMissing: "No model",
      modelReady: "Connected",
      updated: "Updated",
      loading: "Loading stock data...",
      loadFailed: "Stock data is temporarily unavailable. Try again later.",
      industry: "Industry",
      region: "Region",
      concepts: "Concepts",
      open: "Open",
      high: "High",
      low: "Low",
      prevClose: "Prev close",
      volume: "Volume",
      volumeRatio: "Volume ratio",
      circulatingMarketValue: "Float cap",
      pe: "P/E",
      pb: "P/B",
      amplitude: "Amplitude",
      innerOuter: "Inner / outer",
      superLarge: "Super large",
      large: "Large",
      medium: "Medium",
      small: "Small",
      date: "Date",
      close: "Close",
      change: "Change",
      disclaimer: "Quotes, flow, and news come from public endpoints. AI output is for information only, not investment advice.",
    },
  };

  const refs = {};
  const state = {
    query: parseQuery(),
    quote: null,
    flows: [],
    news: [],
    activeTab: "consult",
    loading: false,
    aiBusy: false,
  };

  function language() {
    return window.WKStock && typeof window.WKStock.language === "function" ? window.WKStock.language() : "zh";
  }

  function t(key) {
    const lang = language();
    return (text[lang] && text[lang][key]) || text.zh[key] || key;
  }

  function parseQuery() {
    const params = new URLSearchParams(window.location.search);
    const code = String(params.get("code") || "").trim().toUpperCase();
    const market = String(params.get("market") || window.WKStock.inferMarket(code));
    return {
      code: code,
      name: String(params.get("name") || code).trim(),
      market: market,
      quoteId: String(params.get("quoteId") || (market + "." + code)).trim(),
    };
  }

  function applyText() {
    document.querySelectorAll("[data-stock-item-text]").forEach(function (node) {
      node.textContent = t(node.dataset.stockItemText);
    });
    document.title = ((state.quote && state.quote.name) || state.query.name || t("pageTitle")) + " · " + t("pageTitle") + " · WK1995";
    syncAiState();
  }

  function signedClass(node, value) {
    const number = Number(value);
    node.classList.toggle("is-up", Number.isFinite(number) && number > 0);
    node.classList.toggle("is-down", Number.isFinite(number) && number < 0);
  }

  function plainPercent(value) {
    const number = Number(value);
    return Number.isFinite(number) ? number.toFixed(2) + "%" : "--";
  }

  async function load() {
    state.loading = true;
    renderLoading();
    try {
      state.quote = await window.WKStock.fetchQuote(state.query);
      const results = await Promise.all([
        window.WKStock.fetchMoneyFlow(state.quote, 10).catch(function () { return []; }),
        window.WKStock.fetchNews(state.quote.name || state.query.name, 12).catch(function () { return []; }),
      ]);
      state.flows = results[0];
      state.news = results[1];
      renderAll();
    } catch (error) {
      renderError();
    } finally {
      state.loading = false;
    }
  }

  function renderLoading() {
    refs.newsList.innerHTML = "";
    refs.newsList.appendChild(emptyNode(t("loading")));
    refs.profileGrid.innerHTML = "";
    refs.flowBars.innerHTML = "";
    refs.flowHistory.innerHTML = "";
  }

  function renderError() {
    refs.newsList.innerHTML = "";
    refs.newsList.appendChild(emptyNode(t("loadFailed")));
  }

  function renderAll() {
    renderHero();
    renderProfile();
    renderFlow();
    renderNews();
    syncAiState();
  }

  function renderHero() {
    const quote = state.quote || {};
    refs.market.textContent = quote.market === "1" ? "沪市 A 股" : "深市 A 股";
    refs.name.textContent = quote.name || state.query.name || "--";
    refs.code.textContent = quote.quoteId || state.query.quoteId || "--";
    refs.updated.textContent = t("updated") + " " + window.WKStock.formatTime(quote.updatedAt);
    refs.eastmoney.href = quote.code ? "https://quote.eastmoney.com/" + (quote.market === "1" ? "sh" : "sz") + quote.code + ".html" : "#";
    refs.price.textContent = window.WKStock.formatNumber(quote.price, 2);
    refs.change.textContent = [
      window.WKStock.formatNumber(quote.change, 2),
      window.WKStock.formatPercent(quote.changePercent),
    ].join(" / ");
    signedClass(refs.score, quote.changePercent);
    refs.turnover.textContent = window.WKStock.formatAmount(quote.turnover);
    refs.turnoverRate.textContent = plainPercent(quote.turnoverRate);
    refs.marketValue.textContent = window.WKStock.formatAmount(quote.totalMarketValue);
    refs.mainFlow.textContent = window.WKStock.formatAmount(currentMainFlow());
    document.title = (quote.name || state.query.name || t("pageTitle")) + " · " + t("pageTitle") + " · WK1995";
  }

  function currentMainFlow() {
    const latest = state.flows[0];
    if (latest && Number.isFinite(Number(latest.mainNet))) {
      return latest.mainNet;
    }
    const quote = state.quote || {};
    return Number(quote.superLargeNet || 0) + Number(quote.largeNet || 0);
  }

  function renderProfile() {
    const quote = state.quote || {};
    const rows = [
      [t("industry"), quote.industry || "--"],
      [t("region"), quote.region || "--"],
      [t("open"), window.WKStock.formatNumber(quote.open, 2)],
      [t("high"), window.WKStock.formatNumber(quote.high, 2)],
      [t("low"), window.WKStock.formatNumber(quote.low, 2)],
      [t("prevClose"), window.WKStock.formatNumber(quote.previousClose, 2)],
      [t("volume"), window.WKStock.formatNumber(quote.volume, 0)],
      [t("volumeRatio"), window.WKStock.formatNumber(quote.volumeRatio, 2)],
      [t("turnover"), window.WKStock.formatAmount(quote.turnover)],
      [t("turnoverRate"), plainPercent(quote.turnoverRate)],
      [t("marketValue"), window.WKStock.formatAmount(quote.totalMarketValue)],
      [t("circulatingMarketValue"), window.WKStock.formatAmount(quote.circulatingMarketValue)],
      [t("pe"), window.WKStock.formatNumber(quote.pe, 2)],
      [t("pb"), window.WKStock.formatNumber(quote.pb, 2)],
      [t("amplitude"), plainPercent(quote.amplitude)],
      [t("innerOuter"), window.WKStock.formatNumber(quote.inner, 0) + " / " + window.WKStock.formatNumber(quote.outer, 0)],
    ];
    refs.profileGrid.innerHTML = "";
    rows.forEach(function (row) {
      const card = document.createElement("div");
      card.className = "stock-profile-card";
      const label = document.createElement("span");
      label.textContent = row[0];
      const value = document.createElement("strong");
      value.textContent = row[1];
      card.append(label, value);
      refs.profileGrid.appendChild(card);
    });

    refs.concepts.innerHTML = "";
    const concepts = Array.isArray(quote.concepts) ? quote.concepts : [];
    if (!concepts.length) {
      refs.concepts.appendChild(emptyNode(t("concepts") + " --"));
      return;
    }
    concepts.forEach(function (concept) {
      const chip = document.createElement("span");
      chip.textContent = concept;
      refs.concepts.appendChild(chip);
    });
  }

  function renderFlow() {
    renderFlowBars();
    renderFlowHistory();
  }

  function renderFlowBars() {
    const latest = state.flows[0] || {};
    const rows = [
      { key: "superLarge", value: latest.superLargeNet },
      { key: "large", value: latest.largeNet },
      { key: "medium", value: latest.mediumNet },
      { key: "small", value: latest.smallNet },
    ];
    const maxAbs = Math.max.apply(null, rows.map(function (row) {
      const value = Number(row.value);
      return Number.isFinite(value) ? Math.abs(value) : 0;
    }).concat([1]));
    refs.flowBars.innerHTML = "";
    rows.forEach(function (row) {
      const value = Number(row.value);
      const node = document.createElement("div");
      node.className = "stock-flow-bar-row";
      node.classList.toggle("is-up", Number.isFinite(value) && value > 0);
      node.classList.toggle("is-down", Number.isFinite(value) && value < 0);
      const label = document.createElement("span");
      label.className = "stock-flow-bar-label";
      label.textContent = t(row.key);
      const track = document.createElement("span");
      track.className = "stock-flow-bar-track";
      const fill = document.createElement("span");
      fill.className = "stock-flow-bar-fill";
      fill.style.setProperty("--bar-width", Number.isFinite(value) ? Math.max(3, Math.round(Math.abs(value) / maxAbs * 100)) + "%" : "0%");
      track.appendChild(fill);
      const amount = document.createElement("strong");
      amount.textContent = window.WKStock.formatAmount(value);
      node.append(label, track, amount);
      refs.flowBars.appendChild(node);
    });
  }

  function renderFlowHistory() {
    refs.flowHistory.innerHTML = "";
    if (!state.flows.length) {
      refs.flowHistory.appendChild(emptyNode(t("flowTab") + " --"));
      return;
    }
    const table = document.createElement("div");
    table.className = "stock-flow-table";
    table.append(flowTableRow([t("date"), t("mainFlow"), t("close"), t("change")], true));
    state.flows.forEach(function (item) {
      table.append(flowTableRow([
        item.date,
        window.WKStock.formatAmount(item.mainNet),
        window.WKStock.formatNumber(item.close, 2),
        window.WKStock.formatPercent(item.changePercent),
      ], false, item.mainNet));
    });
    refs.flowHistory.appendChild(table);
  }

  function flowTableRow(values, head, signedValue) {
    const row = document.createElement("div");
    row.className = head ? "stock-flow-table-row is-head" : "stock-flow-table-row";
    if (!head) {
      signedClass(row, signedValue);
    }
    values.forEach(function (value) {
      const cell = document.createElement(head ? "strong" : "span");
      cell.textContent = value || "--";
      row.appendChild(cell);
    });
    return row;
  }

  function renderNews() {
    refs.newsList.innerHTML = "";
    if (!state.news.length) {
      refs.newsList.appendChild(emptyNode(t("newsEmpty")));
      return;
    }
    state.news.forEach(function (item) {
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
      refs.newsList.appendChild(node);
    });
  }

  function emptyNode(message) {
    const node = document.createElement("div");
    node.className = "stock-detail-empty";
    node.textContent = message;
    return node;
  }

  async function refreshNews() {
    refs.newsRefresh.disabled = true;
    refs.newsList.innerHTML = "";
    refs.newsList.appendChild(emptyNode(t("newsLoading")));
    try {
      state.news = await window.WKStock.fetchNews((state.quote && state.quote.name) || state.query.name, 12);
      renderNews();
    } finally {
      refs.newsRefresh.disabled = false;
    }
  }

  function syncAiState() {
    const ready = window.WKStock.aiReady();
    refs.aiModel.textContent = ready ? window.WKStock.modelLabel() + " · " + t("modelReady") : t("modelMissing");
    refs.aiRun.disabled = state.aiBusy || !ready || !state.quote;
    if (!ready) {
      refs.aiStatus.innerHTML = "";
      refs.aiStatus.dataset.mode = "setup";
      const span = document.createElement("span");
      span.textContent = t("aiNeedSetup") + " ";
      const link = document.createElement("a");
      link.href = "../../chat/";
      link.textContent = t("configureAi");
      refs.aiStatus.append(span, link);
    } else if (refs.aiStatus.dataset.mode === "setup") {
      refs.aiStatus.textContent = "";
      refs.aiStatus.dataset.mode = "";
    }
  }

  function setAiStatus(message, mode) {
    refs.aiStatus.textContent = message || "";
    refs.aiStatus.dataset.mode = mode || "";
  }

  function aiPrompt() {
    return [
      "你是 A 股单股研究助手。请只基于下面的公开行情、资金流和新闻上下文分析当前股票。",
      "输出包含：当前状态、价格与成交、资金变化、消息催化、主要风险、后续观察清单。",
      "不要给出个性化买卖建议，也不要编造未提供的数据。",
      JSON.stringify({
        quote: state.quote,
        flows: state.flows,
        news: state.news.slice(0, 8),
      }, null, 2),
    ].join("\n\n");
  }

  async function runAi() {
    if (!state.quote) {
      setAiStatus(t("aiNoData"), "runtime");
      return;
    }
    state.aiBusy = true;
    refs.aiRun.disabled = true;
    setAiStatus(t("analyzing"), "runtime");
    refs.aiResult.textContent = "";
    try {
      refs.aiResult.textContent = await window.WKStock.runAi({
        prompt: aiPrompt(),
        system: "你是谨慎的股票研究助手，回答要简洁、基于事实，并明确风险。不要提供个性化投资建议。",
        maxTokens: 2048,
      });
      setAiStatus(t("aiReady"), "runtime");
    } catch (error) {
      setAiStatus(t("aiFailed") + (error && error.message ? error.message : "Unknown error"), "runtime");
    } finally {
      state.aiBusy = false;
      syncAiState();
    }
  }

  function setActiveTab(tabId) {
    state.activeTab = tabId;
    document.querySelectorAll("[data-stock-tab]").forEach(function (button) {
      button.classList.toggle("is-active", button.dataset.stockTab === tabId);
    });
    document.querySelectorAll(".stock-tab-panel").forEach(function (panel) {
      panel.classList.toggle("is-active", panel.id === "stock-tab-" + tabId);
    });
  }

  function bind() {
    document.querySelectorAll("[data-stock-tab]").forEach(function (button) {
      button.addEventListener("click", function () { setActiveTab(button.dataset.stockTab || "consult"); });
    });
    refs.newsRefresh.addEventListener("click", refreshNews);
    refs.aiRun.addEventListener("click", runAi);
    window.addEventListener("wk:language-change", function () {
      applyText();
      renderAll();
    });
  }

  function initRefs() {
    refs.market = document.getElementById("stock-item-market");
    refs.name = document.getElementById("stock-item-name");
    refs.code = document.getElementById("stock-item-code");
    refs.updated = document.getElementById("stock-item-updated");
    refs.eastmoney = document.getElementById("stock-eastmoney-link");
    refs.score = document.querySelector(".stock-detail-score");
    refs.price = document.getElementById("stock-item-price");
    refs.change = document.getElementById("stock-item-change");
    refs.turnover = document.getElementById("stock-item-turnover");
    refs.turnoverRate = document.getElementById("stock-item-turnover-rate");
    refs.marketValue = document.getElementById("stock-item-market-value");
    refs.mainFlow = document.getElementById("stock-item-main-flow");
    refs.newsRefresh = document.getElementById("stock-news-refresh");
    refs.newsList = document.getElementById("stock-news-list");
    refs.aiModel = document.getElementById("stock-ai-model");
    refs.aiRun = document.getElementById("stock-ai-run");
    refs.aiStatus = document.getElementById("stock-ai-status");
    refs.aiResult = document.getElementById("stock-ai-result");
    refs.profileGrid = document.getElementById("stock-profile-grid");
    refs.concepts = document.getElementById("stock-concept-list");
    refs.flowBars = document.getElementById("stock-flow-bars");
    refs.flowHistory = document.getElementById("stock-flow-history");
  }

  initRefs();
  applyText();
  bind();
  load();
})();
