(function () {
  const STORAGE_KEY = "wk1995-stock-watchlist-v1";

  const text = {
    zh: {
      title: "自选股票",
      eyebrow: "WATCHLIST",
      intro: "自选数据保存在当前浏览器本地，下次打开会自动恢复，行情刷新来自东方财富公开接口。",
      flowBoard: "资金看板",
      searchLabel: "搜索股票",
      search: "搜索",
      searching: "搜索中",
      add: "添加",
      added: "已添加",
      remove: "移除",
      detail: "详情",
      analyze: "分析",
      count: "自选数量",
      upDown: "上涨 / 下跌",
      topGainer: "最强表现",
      mainFlow: "主力净流入",
      listLabel: "LIST",
      listTitle: "自选列表",
      refresh: "刷新",
      refreshing: "刷新中",
      updated: "更新时间",
      empty: "还没有自选股票，先搜索代码或名称添加。",
      noResult: "没有找到匹配股票。",
      loadFailed: "部分行情加载失败，请稍后重试。",
      aiLabel: "AI 分析",
      aiTitle: "自选组合研判",
      runAi: "分析自选组合",
      analyzing: "AI 正在分析自选组合...",
      aiReady: "AI 分析已生成。",
      aiNeedSetup: "请先在 AI Chat 中配置模型和 API Key。",
      configureAi: "打开 AI Chat 配置",
      aiNoData: "请先添加自选股票。",
      aiFailed: "AI 分析失败：",
      modelMissing: "未配置模型",
      modelReady: "已连接",
      price: "现价",
      change: "涨跌幅",
      turnover: "成交额",
      industry: "行业",
      disclaimer: "自选股票和 AI 内容仅用于信息整理，不构成投资建议。",
    },
    en: {
      title: "Watchlist",
      eyebrow: "WATCHLIST",
      intro: "Your watchlist is saved in this browser and restored the next time you open it. Quotes refresh from Eastmoney public endpoints.",
      flowBoard: "Flow board",
      searchLabel: "Search stock",
      search: "Search",
      searching: "Searching",
      add: "Add",
      added: "Added",
      remove: "Remove",
      detail: "Detail",
      analyze: "Analyze",
      count: "Stocks",
      upDown: "Up / Down",
      topGainer: "Top gainer",
      mainFlow: "Main net flow",
      listLabel: "LIST",
      listTitle: "Watchlist",
      refresh: "Refresh",
      refreshing: "Refreshing",
      updated: "Updated",
      empty: "No stocks yet. Search by code or name to add one.",
      noResult: "No matching stock.",
      loadFailed: "Some quotes failed to load. Try again later.",
      aiLabel: "AI Analysis",
      aiTitle: "Watchlist view",
      runAi: "Analyze watchlist",
      analyzing: "AI is analyzing the watchlist...",
      aiReady: "AI analysis is ready.",
      aiNeedSetup: "Configure a model and API key in AI Chat first.",
      configureAi: "Open AI Chat settings",
      aiNoData: "Add stocks first.",
      aiFailed: "AI analysis failed: ",
      modelMissing: "No model",
      modelReady: "Connected",
      price: "Price",
      change: "Change",
      turnover: "Turnover",
      industry: "Industry",
      disclaimer: "Watchlist and AI output are for information only, not investment advice.",
    },
  };

  const refs = {};
  const state = {
    watchlist: [],
    quotes: [],
    loading: false,
    searching: false,
    aiBusy: false,
  };

  function language() {
    return window.WKStock && typeof window.WKStock.language === "function" ? window.WKStock.language() : "zh";
  }

  function t(key) {
    const lang = language();
    return (text[lang] && text[lang][key]) || text.zh[key] || key;
  }

  function applyText() {
    document.querySelectorAll("[data-watch-text]").forEach(function (node) {
      node.textContent = t(node.dataset.watchText);
    });
    refs.searchInput.placeholder = language() === "en"
      ? "Enter stock code or name, e.g. 600519 / Kweichow Moutai"
      : "输入股票代码或名称，例如 600519 / 贵州茅台";
    document.title = t("title") + " · WK1995";
    syncAiState();
  }

  function loadWatchlist() {
    try {
      const rows = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      state.watchlist = Array.isArray(rows) ? rows.filter(function (item) {
        return item && item.code && item.name;
      }) : [];
    } catch (error) {
      state.watchlist = [];
    }
  }

  function saveWatchlist() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.watchlist));
  }

  function stockKey(item) {
    return (item.market || window.WKStock.inferMarket(item.code)) + "." + item.code;
  }

  function isAdded(item) {
    return state.watchlist.some(function (stock) { return stockKey(stock) === stockKey(item); });
  }

  function detailUrl(item) {
    const params = new URLSearchParams({
      code: item.code || "",
      name: item.name || "",
      market: item.market || window.WKStock.inferMarket(item.code),
      quoteId: item.quoteId || stockKey(item),
    });
    return "../stock-detail/index.html?" + params.toString();
  }

  function addStock(item) {
    if (isAdded(item)) {
      return;
    }
    state.watchlist.push({
      code: item.code,
      name: item.name,
      market: item.market || window.WKStock.inferMarket(item.code),
      quoteId: item.quoteId || stockKey(item),
      addedAt: Date.now(),
    });
    saveWatchlist();
    renderSearchResults([]);
    refreshQuotes();
  }

  function removeStock(item) {
    state.watchlist = state.watchlist.filter(function (stock) {
      return stockKey(stock) !== stockKey(item);
    });
    state.quotes = state.quotes.filter(function (quote) {
      return stockKey(quote) !== stockKey(item);
    });
    saveWatchlist();
    renderAll();
  }

  async function search(event) {
    event.preventDefault();
    const keyword = refs.searchInput.value.trim();
    if (!keyword || state.searching) {
      return;
    }
    state.searching = true;
    refs.searchSubmit.disabled = true;
    refs.searchSubmit.textContent = t("searching");
    refs.searchResults.innerHTML = "";
    try {
      const results = await window.WKStock.searchStocks(keyword);
      renderSearchResults(results);
    } catch (error) {
      renderSearchResults([]);
    } finally {
      state.searching = false;
      refs.searchSubmit.disabled = false;
      refs.searchSubmit.textContent = t("search");
    }
  }

  function renderSearchResults(results) {
    refs.searchResults.innerHTML = "";
    if (!results.length) {
      if (refs.searchInput.value.trim()) {
        const empty = document.createElement("div");
        empty.className = "stock-detail-empty";
        empty.textContent = t("noResult");
        refs.searchResults.appendChild(empty);
      }
      return;
    }
    results.forEach(function (item) {
      const row = document.createElement("div");
      row.className = "stock-search-result";

      const title = document.createElement("span");
      title.className = "stock-search-title";
      const strong = document.createElement("strong");
      strong.textContent = item.name;
      const meta = document.createElement("span");
      meta.textContent = [item.code, item.securityTypeName].filter(Boolean).join(" · ");
      title.append(strong, meta);

      const button = document.createElement("button");
      button.type = "button";
      button.className = "stock-mini-button";
      button.textContent = isAdded(item) ? t("added") : t("add");
      button.disabled = isAdded(item);
      button.addEventListener("click", function () { addStock(item); });

      row.append(title, button);
      refs.searchResults.appendChild(row);
    });
  }

  function setLoading(value) {
    state.loading = value;
    refs.refresh.disabled = value;
    refs.refresh.textContent = value ? t("refreshing") : t("refresh");
  }

  async function refreshQuotes() {
    if (!state.watchlist.length) {
      state.quotes = [];
      renderAll();
      return;
    }
    setLoading(true);
    try {
      const results = await Promise.all(state.watchlist.map(function (item) {
        return window.WKStock.fetchQuote(item).catch(function () {
          return {
            code: item.code,
            name: item.name,
            market: item.market,
            quoteId: item.quoteId,
            failed: true,
          };
        });
      }));
      state.quotes = results;
      renderAll();
    } finally {
      setLoading(false);
    }
  }

  function renderAll() {
    renderSummary();
    renderList();
    syncAiState();
  }

  function signedClass(node, value) {
    const number = Number(value);
    node.classList.toggle("is-up", Number.isFinite(number) && number > 0);
    node.classList.toggle("is-down", Number.isFinite(number) && number < 0);
  }

  function validQuotes() {
    return state.quotes.filter(function (item) { return !item.failed; });
  }

  function renderSummary() {
    const quotes = validQuotes();
    const up = quotes.filter(function (item) { return item.changePercent > 0; }).length;
    const down = quotes.filter(function (item) { return item.changePercent < 0; }).length;
    const top = quotes.slice().sort(function (a, b) {
      return Number(b.changePercent || 0) - Number(a.changePercent || 0);
    })[0];
    const main = quotes.reduce(function (sum, item) {
      const value = Number(item.superLargeNet || 0) + Number(item.largeNet || 0);
      return sum + (Number.isFinite(value) ? value : 0);
    }, 0);
    refs.count.textContent = String(state.watchlist.length);
    refs.upDown.textContent = up + " / " + down;
    refs.topGainer.textContent = top ? top.name + " " + window.WKStock.formatPercent(top.changePercent) : "--";
    refs.mainFlow.textContent = quotes.length ? window.WKStock.formatAmount(main) : "--";
    refs.updated.textContent = t("updated") + " " + (quotes[0] ? window.WKStock.formatTime(quotes[0].updatedAt) : "--");
  }

  function renderList() {
    refs.list.innerHTML = "";
    if (!state.watchlist.length) {
      const empty = document.createElement("div");
      empty.className = "stock-detail-empty";
      empty.textContent = t("empty");
      refs.list.appendChild(empty);
      return;
    }
    state.watchlist.forEach(function (stock) {
      const quote = state.quotes.find(function (item) { return stockKey(item) === stockKey(stock); }) || stock;
      refs.list.appendChild(rowNode(stock, quote));
    });
  }

  function rowNode(stock, quote) {
    const row = document.createElement("article");
    row.className = "stock-watch-row";

    const name = document.createElement("div");
    name.className = "stock-component-name";
    const title = document.createElement("strong");
    title.textContent = quote.name || stock.name;
    const code = document.createElement("span");
    code.textContent = stockKey(quote);
    name.append(title, code);

    const price = metric(t("price"), window.WKStock.formatNumber(quote.price, 2));
    const change = metric(t("change"), window.WKStock.formatPercent(quote.changePercent), quote.changePercent);
    const turnover = metric(t("turnover"), window.WKStock.formatAmount(quote.turnover, { compact: true }));
    const industry = metric(t("industry"), quote.industry || "--");

    const actions = document.createElement("div");
    actions.className = "stock-watch-row-actions";
    const detail = document.createElement("a");
    detail.className = "stock-mini-button";
    detail.href = detailUrl(quote);
    detail.textContent = t("detail");
    const analyze = document.createElement("button");
    analyze.type = "button";
    analyze.className = "stock-mini-button";
    analyze.textContent = t("analyze");
    analyze.addEventListener("click", function () { runAi(quote); });
    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "stock-mini-button danger";
    remove.textContent = t("remove");
    remove.addEventListener("click", function () { removeStock(stock); });
    actions.append(detail, analyze, remove);

    row.append(name, price, change, turnover, industry, actions);
    return row;
  }

  function metric(label, value, signedValue) {
    const cell = document.createElement("span");
    cell.className = "stock-component-metric";
    if (signedValue !== undefined) {
      signedClass(cell, signedValue);
    }
    const caption = document.createElement("span");
    caption.textContent = label;
    const strong = document.createElement("strong");
    strong.textContent = value || "--";
    cell.append(caption, strong);
    return cell;
  }

  function syncAiState() {
    const ready = window.WKStock.aiReady();
    refs.aiModel.textContent = ready ? window.WKStock.modelLabel() + " · " + t("modelReady") : t("modelMissing");
    refs.aiRun.disabled = state.aiBusy || !ready || !state.watchlist.length;
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

  function revealAiPanel() {
    if (refs.aiPanel && typeof refs.aiPanel.scrollIntoView === "function") {
      refs.aiPanel.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  function aiPrompt(target) {
    const stocks = target ? [target] : validQuotes();
    return [
      "你是 A 股自选股研究助手。请只基于下面的公开行情数据分析，不要编造未提供的数据。",
      target ? "任务：分析这只自选股票。" : "任务：分析这个自选股组合。",
      "输出包含：整体状态、强弱分化、资金变化、主要风险、下一步观察清单。不要给出个性化买卖建议。",
      JSON.stringify({ stocks: stocks }, null, 2),
    ].join("\n\n");
  }

  async function runAi(target) {
    revealAiPanel();
    if (!target && !validQuotes().length) {
      setAiStatus(t("aiNoData"), "runtime");
      return;
    }
    state.aiBusy = true;
    refs.aiRun.disabled = true;
    setAiStatus(t("analyzing"), "runtime");
    refs.aiResult.textContent = "";
    try {
      refs.aiResult.textContent = await window.WKStock.runAi({
        prompt: aiPrompt(target),
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

  function bind() {
    refs.searchForm.addEventListener("submit", search);
    refs.refresh.addEventListener("click", refreshQuotes);
    refs.aiRun.addEventListener("click", function () { runAi(null); });
    window.addEventListener("wk:language-change", function () {
      applyText();
      renderSearchResults([]);
      renderAll();
    });
  }

  function initRefs() {
    refs.searchForm = document.getElementById("watch-search-form");
    refs.searchInput = document.getElementById("watch-search-input");
    refs.searchSubmit = document.getElementById("watch-search-submit");
    refs.searchResults = document.getElementById("watch-search-results");
    refs.count = document.getElementById("watch-count");
    refs.upDown = document.getElementById("watch-up-down");
    refs.topGainer = document.getElementById("watch-top-gainer");
    refs.mainFlow = document.getElementById("watch-main-flow");
    refs.updated = document.getElementById("watch-updated");
    refs.refresh = document.getElementById("watch-refresh");
    refs.list = document.getElementById("watch-list");
    refs.aiModel = document.getElementById("watch-ai-model");
    refs.aiRun = document.getElementById("watch-ai-run");
    refs.aiStatus = document.getElementById("watch-ai-status");
    refs.aiResult = document.getElementById("watch-ai-result");
    refs.aiPanel = document.querySelector(".stock-ai-panel");
  }

  initRefs();
  loadWatchlist();
  applyText();
  bind();
  refreshQuotes();
})();
