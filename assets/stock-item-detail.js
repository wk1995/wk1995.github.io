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
      klineLabel: "DAILY K",
      klineTitle: "日线 K 线",
      indicatorDetailLabel: "指标说明",
      backToTabs: "返回详情",
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
      latestClose: "最新收盘",
      ma5: "MA5",
      ma10: "MA10",
      ma20: "MA20",
      volumeMa5: "量 MA5",
      volumeMa10: "量 MA10",
      macd: "MACD",
      rsi14: "RSI14",
      kdj: "KDJ",
      noKline: "暂无日线数据。",
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
      klineLabel: "DAILY K",
      klineTitle: "Daily candlestick",
      indicatorDetailLabel: "Indicator",
      backToTabs: "Back to detail",
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
      latestClose: "Latest close",
      ma5: "MA5",
      ma10: "MA10",
      ma20: "MA20",
      volumeMa5: "Vol MA5",
      volumeMa10: "Vol MA10",
      macd: "MACD",
      rsi14: "RSI14",
      kdj: "KDJ",
      noKline: "No daily K-line data.",
      disclaimer: "Quotes, flow, and news come from public endpoints. AI output is for information only, not investment advice.",
    },
  };

  const refs = {};
  const state = {
    query: parseQuery(),
    quote: null,
    flows: [],
    klines: [],
    news: [],
    activeTab: "consult",
    activeIndicator: "",
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
        window.WKStock.fetchDailyKlines(state.quote, 120).catch(function () { return []; }),
      ]);
      state.flows = results[0];
      state.news = results[1];
      state.klines = results[2];
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
    refs.klineLegend.innerHTML = "";
    refs.indicatorGrid.innerHTML = "";
    state.activeIndicator = "";
    renderIndicatorSelection(null);
  }

  function renderError() {
    refs.newsList.innerHTML = "";
    refs.newsList.appendChild(emptyNode(t("loadFailed")));
    state.activeIndicator = "";
    renderIndicatorSelection(null);
  }

  function renderAll() {
    renderHero();
    renderKline();
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

  function movingAverage(rows, key, period) {
    const values = [];
    let sum = 0;
    rows.forEach(function (row, index) {
      const value = Number(row[key]);
      sum += Number.isFinite(value) ? value : 0;
      if (index >= period) {
        const old = Number(rows[index - period][key]);
        sum -= Number.isFinite(old) ? old : 0;
      }
      values.push(index >= period - 1 ? sum / period : NaN);
    });
    return values;
  }

  function ema(values, period) {
    const result = [];
    const alpha = 2 / (period + 1);
    let previous = NaN;
    values.forEach(function (value) {
      const number = Number(value);
      if (!Number.isFinite(number)) {
        result.push(previous);
        return;
      }
      previous = Number.isFinite(previous) ? number * alpha + previous * (1 - alpha) : number;
      result.push(previous);
    });
    return result;
  }

  function latestIndicators() {
    const rows = state.klines;
    const closes = rows.map(function (row) { return row.close; });
    const ma5 = movingAverage(rows, "close", 5);
    const ma10 = movingAverage(rows, "close", 10);
    const ma20 = movingAverage(rows, "close", 20);
    const volumeMa5 = movingAverage(rows, "volume", 5);
    const volumeMa10 = movingAverage(rows, "volume", 10);
    const ema12 = ema(closes, 12);
    const ema26 = ema(closes, 26);
    const dif = closes.map(function (_, index) { return ema12[index] - ema26[index]; });
    const dea = ema(dif, 9);
    const macd = dif.map(function (value, index) { return (value - dea[index]) * 2; });
    const rsi = rsiValue(rows, 14);
    const kdj = kdjValue(rows, 9);
    const last = rows[rows.length - 1] || {};
    return {
      last: last,
      ma5: lastValue(ma5),
      ma10: lastValue(ma10),
      ma20: lastValue(ma20),
      volumeMa5: lastValue(volumeMa5),
      volumeMa10: lastValue(volumeMa10),
      dif: lastValue(dif),
      dea: lastValue(dea),
      macd: lastValue(macd),
      rsi14: rsi,
      kdj: kdj,
      maSeries: {
        ma5: ma5,
        ma10: ma10,
        ma20: ma20,
        volumeMa5: volumeMa5,
        volumeMa10: volumeMa10,
      },
    };
  }

  function latestIndicatorsForAi() {
    const indicators = latestIndicators();
    return {
      latestClose: indicators.last.close,
      ma5: indicators.ma5,
      ma10: indicators.ma10,
      ma20: indicators.ma20,
      volume: indicators.last.volume,
      volumeMa5: indicators.volumeMa5,
      volumeMa10: indicators.volumeMa10,
      macd: {
        dif: indicators.dif,
        dea: indicators.dea,
        macd: indicators.macd,
      },
      rsi14: indicators.rsi14,
      kdj: indicators.kdj,
      amplitude: indicators.last.amplitude,
      turnoverRate: indicators.last.turnoverRate,
    };
  }

  function lastValue(values) {
    for (let index = values.length - 1; index >= 0; index -= 1) {
      if (Number.isFinite(values[index])) {
        return values[index];
      }
    }
    return NaN;
  }

  function rsiValue(rows, period) {
    if (rows.length <= period) {
      return NaN;
    }
    let gain = 0;
    let loss = 0;
    const start = Math.max(1, rows.length - period);
    for (let index = start; index < rows.length; index += 1) {
      const change = Number(rows[index].close) - Number(rows[index - 1].close);
      if (change > 0) {
        gain += change;
      } else {
        loss += Math.abs(change);
      }
    }
    if (loss === 0) {
      return 100;
    }
    return 100 - 100 / (1 + gain / loss);
  }

  function kdjValue(rows, period) {
    let k = 50;
    let d = 50;
    rows.forEach(function (row, index) {
      const start = Math.max(0, index - period + 1);
      const windowRows = rows.slice(start, index + 1);
      const low = Math.min.apply(null, windowRows.map(function (item) { return Number(item.low); }));
      const high = Math.max.apply(null, windowRows.map(function (item) { return Number(item.high); }));
      const rsv = high === low ? 50 : (Number(row.close) - low) / (high - low) * 100;
      k = k * 2 / 3 + rsv / 3;
      d = d * 2 / 3 + k / 3;
    });
    return {
      k: k,
      d: d,
      j: 3 * k - 2 * d,
    };
  }

  function renderKline() {
    const indicators = latestIndicators();
    renderKlineLegend();
    renderIndicatorGrid(indicators);
    drawKlineChart(indicators);
  }

  function renderKlineLegend() {
    refs.klineLegend.innerHTML = "";
    [
      ["MA5", "ma5"],
      ["MA10", "ma10"],
      ["MA20", "ma20"],
      [language() === "en" ? "Volume" : "成交量", "volume"],
    ].forEach(function (item) {
      const chip = document.createElement("span");
      chip.className = "stock-kline-chip " + item[1];
      chip.textContent = item[0];
      refs.klineLegend.appendChild(chip);
    });
  }

  function renderIndicatorGrid(indicators) {
    refs.indicatorGrid.innerHTML = "";
    if (!state.klines.length) {
      state.activeIndicator = "";
      refs.indicatorGrid.appendChild(emptyNode(t("noKline")));
      renderIndicatorSelection(indicators);
      return;
    }
    const rows = indicatorRows(indicators);
    rows.forEach(function (row) {
      const card = document.createElement("button");
      card.type = "button";
      card.className = "stock-indicator-card";
      card.dataset.indicatorKey = row.key;
      card.setAttribute("aria-pressed", state.activeIndicator === row.key ? "true" : "false");
      const label = document.createElement("span");
      label.textContent = row.label;
      const value = document.createElement("strong");
      value.textContent = row.value;
      card.append(label, value);
      card.addEventListener("click", function () { setActiveIndicator(row.key); });
      refs.indicatorGrid.appendChild(card);
    });
    renderIndicatorSelection(indicators);
  }

  function indicatorRows(indicators) {
    const kdj = indicators.kdj || {};
    return [
      { key: "latestClose", label: t("latestClose"), value: window.WKStock.formatNumber(indicators.last.close, 2) },
      { key: "ma5", label: t("ma5"), value: window.WKStock.formatNumber(indicators.ma5, 2) },
      { key: "ma10", label: t("ma10"), value: window.WKStock.formatNumber(indicators.ma10, 2) },
      { key: "ma20", label: t("ma20"), value: window.WKStock.formatNumber(indicators.ma20, 2) },
      { key: "volume", label: t("volume"), value: window.WKStock.formatNumber(indicators.last.volume, 0) },
      { key: "volumeMa5", label: t("volumeMa5"), value: window.WKStock.formatNumber(indicators.volumeMa5, 0) },
      { key: "volumeMa10", label: t("volumeMa10"), value: window.WKStock.formatNumber(indicators.volumeMa10, 0) },
      {
        key: "macd",
        label: t("macd"),
        value: [
          window.WKStock.formatNumber(indicators.dif, 2),
          window.WKStock.formatNumber(indicators.dea, 2),
          window.WKStock.formatNumber(indicators.macd, 2),
        ].join(" / "),
      },
      { key: "rsi14", label: t("rsi14"), value: window.WKStock.formatNumber(indicators.rsi14, 2) },
      {
        key: "kdj",
        label: t("kdj"),
        value: [
          window.WKStock.formatNumber(kdj.k, 2),
          window.WKStock.formatNumber(kdj.d, 2),
          window.WKStock.formatNumber(kdj.j, 2),
        ].join(" / "),
      },
      { key: "amplitude", label: t("amplitude"), value: plainPercent(indicators.last.amplitude) },
      { key: "turnoverRate", label: t("turnoverRate"), value: plainPercent(indicators.last.turnoverRate) },
    ];
  }

  function indicatorDefinitions(indicators) {
    const rows = {};
    indicatorRows(indicators).forEach(function (row) {
      rows[row.key] = row;
    });
    function detail(key, zh, en) {
      const row = rows[key] || { label: key, value: "--" };
      const copy = language() === "en" ? en : zh;
      return {
        title: row.label,
        value: row.value,
        purpose: copy[0],
        use: copy[1],
        risk: copy[2],
      };
    }
    return {
      latestClose: detail("latestClose", [
        "作用：反映最近一个交易日市场接受的成交价格基准，是均线和其他指标的参照点。",
        "用法：可和均线、前高前低、成交量一起观察短线强弱。",
        "注意：单日收盘价不能单独说明趋势，需要结合连续走势。",
      ], [
        "Role: Shows the latest accepted closing price and anchors the other indicators.",
        "Use: Compare it with moving averages, prior highs/lows, and volume to read short-term strength.",
        "Note: One close does not define a trend on its own.",
      ]),
      ma5: detail("ma5", [
        "作用：5 日均线反映一周左右的短线平均持仓成本。",
        "用法：价格站上或跌破 MA5，可辅助判断短线动能是否转强或转弱。",
        "注意：短周期均线对噪音很敏感，震荡行情里容易频繁失真。",
      ], [
        "Role: MA5 reflects the short-term average cost over roughly one trading week.",
        "Use: Price above or below MA5 helps read near-term momentum shifts.",
        "Note: Short averages are noisy and can flip often in range-bound markets.",
      ]),
      ma10: detail("ma10", [
        "作用：10 日均线反映约两周的交易成本，兼顾短线和小波段趋势。",
        "用法：可观察价格是否沿 MA10 运行，以及 MA5 和 MA10 的相对位置。",
        "注意：震荡市会反复穿越，单独使用容易产生假信号。",
      ], [
        "Role: MA10 reflects about two trading weeks of cost and bridges short-term and swing views.",
        "Use: Watch whether price respects MA10 and how MA5 sits against it.",
        "Note: Range-bound markets can create repeated false crosses.",
      ]),
      ma20: detail("ma20", [
        "作用：20 日均线常作为月线级别趋势参考，反映中期交易成本。",
        "用法：可用于观察中期趋势方向，以及价格回踩时的支撑或压力。",
        "注意：均线天然滞后，拐点出现后才会逐步反映。",
      ], [
        "Role: MA20 is a common monthly trend proxy and reflects medium-term cost.",
        "Use: Use it to read trend direction and possible support or resistance.",
        "Note: Moving averages lag and confirm turns after price has already moved.",
      ]),
      volume: detail("volume", [
        "作用：成交量反映市场交易活跃度和资金参与程度。",
        "用法：放量上涨、缩量回调、放量下跌等组合能帮助判断价格动作的可信度。",
        "注意：量能必须结合价格位置、消息和换手率分析，孤立看容易误判。",
      ], [
        "Role: Volume shows trading activity and participation.",
        "Use: Volume expansion or contraction helps judge whether a price move is supported.",
        "Note: Read it with price location, news, and turnover rate.",
      ]),
      volumeMa5: detail("volumeMa5", [
        "作用：量 MA5 平滑最近一周成交量，帮助识别当前量能是否突然放大。",
        "用法：当单日成交量明显高于量 MA5，说明短线交易活跃度提升。",
        "注意：突发消息或节假日前后会扭曲短期均量。",
      ], [
        "Role: Vol MA5 smooths about one week of volume to reveal short-term activity changes.",
        "Use: Current volume well above Vol MA5 suggests rising short-term participation.",
        "Note: News shocks and holiday effects can distort this measure.",
      ]),
      volumeMa10: detail("volumeMa10", [
        "作用：量 MA10 平滑约两周成交量，比量 MA5 更稳定。",
        "用法：可用来确认当前放量或缩量是否具备连续性。",
        "注意：它比单日量能更慢，可能滞后于资金快速变化。",
      ], [
        "Role: Vol MA10 smooths about two weeks of volume and is steadier than Vol MA5.",
        "Use: It helps confirm whether expansion or contraction is persistent.",
        "Note: It reacts slower than single-day volume.",
      ]),
      macd: detail("macd", [
        "作用：MACD 通过 DIF、DEA 和柱体衡量趋势动能与多空强弱。",
        "用法：金叉、死叉、柱体放大收缩和背离常用于观察趋势变化。",
        "注意：震荡行情中 MACD 容易钝化或反复给出无效信号。",
      ], [
        "Role: MACD uses DIF, DEA, and the histogram to measure trend momentum.",
        "Use: Crosses, histogram changes, and divergences help track trend shifts.",
        "Note: MACD can whipsaw in sideways markets.",
      ]),
      rsi14: detail("rsi14", [
        "作用：RSI14 衡量最近 14 个交易日上涨和下跌力量的相对强弱。",
        "用法：高位提示可能过热，低位提示可能超卖，也可观察背离。",
        "注意：强趋势中 RSI 可能长时间停留在高位或低位。",
      ], [
        "Role: RSI14 compares recent up and down strength over 14 trading days.",
        "Use: High readings can flag overheating, low readings can flag oversold pressure, and divergences matter.",
        "Note: In strong trends RSI can stay elevated or depressed for a long time.",
      ]),
      kdj: detail("kdj", [
        "作用：KDJ 对价格在近期高低区间中的位置更敏感，适合观察短线节奏。",
        "用法：K、D、J 的交叉和高低位可辅助判断短线拐点。",
        "注意：该指标灵敏度高，假信号也多，需要结合趋势和成交量过滤。",
      ], [
        "Role: KDJ is sensitive to where price sits inside its recent range.",
        "Use: K/D/J crosses and extreme zones can help read short-term turns.",
        "Note: It is sensitive and needs trend and volume filters.",
      ]),
      amplitude: detail("amplitude", [
        "作用：振幅反映当日最高价和最低价之间的波动范围。",
        "用法：大振幅通常意味着分歧或活跃度提高，应结合收盘位置判断强弱。",
        "注意：振幅大不等于方向明确，可能只是盘中剧烈震荡。",
      ], [
        "Role: Amplitude shows the intraday range between high and low.",
        "Use: Large amplitude often means greater activity or disagreement; read it with the close location.",
        "Note: A wide range does not guarantee a clear direction.",
      ]),
      turnoverRate: detail("turnoverRate", [
        "作用：换手率反映流通筹码在当日被交易的比例。",
        "用法：高换手说明交易活跃或分歧较大，低换手说明关注度或流动性较弱。",
        "注意：不同市值和行业的常态换手差异很大，不适合直接横向比较。",
      ], [
        "Role: Turnover rate shows how much of the float changed hands.",
        "Use: High turnover points to active trading or stronger disagreement; low turnover points to weaker activity.",
        "Note: Normal turnover varies a lot by market cap and sector.",
      ]),
    };
  }

  function setActiveIndicator(key) {
    state.activeIndicator = key && state.activeIndicator !== key ? key : "";
    renderIndicatorSelection(state.klines.length ? latestIndicators() : null);
  }

  function renderIndicatorSelection(indicators) {
    const definitions = indicators ? indicatorDefinitions(indicators) : {};
    const detail = definitions[state.activeIndicator];
    document.querySelectorAll("[data-indicator-key]").forEach(function (button) {
      const active = button.dataset.indicatorKey === state.activeIndicator && !!detail;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", active ? "true" : "false");
    });
    if (!detail) {
      state.activeIndicator = "";
      refs.indicatorDetail.hidden = true;
      refs.tabsPanel.hidden = false;
      return;
    }
    refs.tabsPanel.hidden = true;
    refs.indicatorDetail.hidden = false;
    refs.indicatorDetailTitle.textContent = detail.title;
    refs.indicatorDetailValue.textContent = detail.value;
    refs.indicatorDetailPurpose.textContent = detail.purpose;
    refs.indicatorDetailUse.textContent = detail.use;
    refs.indicatorDetailRisk.textContent = detail.risk;
  }

  function drawKlineChart(indicators) {
    const canvas = refs.klineCanvas;
    const wrap = refs.klineCanvasWrap;
    if (!canvas || !wrap) {
      return;
    }
    const width = Math.max(Math.floor(wrap.clientWidth), 320);
    const height = Math.max(Math.floor(canvas.clientHeight || 420), 360);
    const ratio = window.devicePixelRatio || 1;
    canvas.width = Math.floor(width * ratio);
    canvas.height = Math.floor(height * ratio);
    canvas.style.width = width + "px";
    canvas.style.height = height + "px";
    const ctx = canvas.getContext("2d");
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.clearRect(0, 0, width, height);

    const styles = getComputedStyle(document.documentElement);
    const textColor = styles.getPropertyValue("--stock-muted").trim() || "#a9b0ba";
    const gridColor = styles.getPropertyValue("--stock-border").trim() || "rgba(255,255,255,0.12)";
    const upColor = styles.getPropertyValue("--stock-red").trim() || "#f04455";
    const downColor = styles.getPropertyValue("--stock-green").trim() || "#31c76a";
    const goldColor = styles.getPropertyValue("--stock-gold").trim() || "#e2b556";
    const blueColor = styles.getPropertyValue("--stock-blue").trim() || "#6da8ff";
    const ma20Color = "#d37cff";

    if (!state.klines.length) {
      drawEmptyChart(ctx, width, height, textColor);
      return;
    }

    const rows = state.klines.slice(-90);
    const startIndex = state.klines.length - rows.length;
    const ma = indicators.maSeries;
    const ma5 = ma.ma5.slice(startIndex);
    const ma10 = ma.ma10.slice(startIndex);
    const ma20 = ma.ma20.slice(startIndex);
    const volumeMa5 = ma.volumeMa5.slice(startIndex);
    const volumeMa10 = ma.volumeMa10.slice(startIndex);
    const pad = { left: 54, right: 14, top: 16, bottom: 24 };
    const priceHeight = Math.floor(height * 0.64);
    const volumeTop = pad.top + priceHeight + 28;
    const volumeHeight = height - volumeTop - pad.bottom;
    const chartWidth = width - pad.left - pad.right;
    const step = chartWidth / rows.length;
    const candleWidth = Math.max(3, Math.min(9, step * 0.58));
    const prices = rows.reduce(function (list, row, index) {
      list.push(row.high, row.low);
      [ma5[index], ma10[index], ma20[index]].forEach(function (value) {
        if (Number.isFinite(value)) {
          list.push(value);
        }
      });
      return list;
    }, []);
    let minPrice = Math.min.apply(null, prices);
    let maxPrice = Math.max.apply(null, prices);
    if (!Number.isFinite(minPrice) || !Number.isFinite(maxPrice) || minPrice === maxPrice) {
      minPrice = 0;
      maxPrice = 1;
    }
    const pricePadding = (maxPrice - minPrice) * 0.08;
    minPrice -= pricePadding;
    maxPrice += pricePadding;
    const maxVolume = Math.max.apply(null, rows.map(function (row, index) {
      return Math.max(Number(row.volume) || 0, Number(volumeMa5[index]) || 0, Number(volumeMa10[index]) || 0);
    }).concat([1]));

    function x(index) {
      return pad.left + index * step + step / 2;
    }
    function priceY(value) {
      return pad.top + (maxPrice - value) / (maxPrice - minPrice) * priceHeight;
    }
    function volumeY(value) {
      return volumeTop + volumeHeight - value / maxVolume * volumeHeight;
    }

    drawGrid(ctx, width, pad, priceHeight, volumeTop, volumeHeight, minPrice, maxPrice, maxVolume, textColor, gridColor);
    rows.forEach(function (row, index) {
      const color = row.close >= row.open ? upColor : downColor;
      const center = x(index);
      ctx.strokeStyle = color;
      ctx.fillStyle = color;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(center, priceY(row.high));
      ctx.lineTo(center, priceY(row.low));
      ctx.stroke();
      const openY = priceY(row.open);
      const closeY = priceY(row.close);
      const bodyTop = Math.min(openY, closeY);
      const bodyHeight = Math.max(1, Math.abs(closeY - openY));
      ctx.fillRect(center - candleWidth / 2, bodyTop, candleWidth, bodyHeight);
      ctx.globalAlpha = 0.7;
      ctx.fillRect(center - candleWidth / 2, volumeY(row.volume), candleWidth, volumeTop + volumeHeight - volumeY(row.volume));
      ctx.globalAlpha = 1;
    });

    drawLine(ctx, rows, ma5, x, priceY, upColor);
    drawLine(ctx, rows, ma10, x, priceY, goldColor);
    drawLine(ctx, rows, ma20, x, priceY, ma20Color);
    drawLine(ctx, rows, volumeMa5, x, volumeY, blueColor);
    drawLine(ctx, rows, volumeMa10, x, volumeY, goldColor);
    drawDateLabels(ctx, rows, x, height, textColor);
  }

  function drawEmptyChart(ctx, width, height, color) {
    ctx.fillStyle = color;
    ctx.font = "14px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(t("noKline"), width / 2, height / 2);
  }

  function drawGrid(ctx, width, pad, priceHeight, volumeTop, volumeHeight, minPrice, maxPrice, maxVolume, textColor, gridColor) {
    ctx.strokeStyle = gridColor;
    ctx.fillStyle = textColor;
    ctx.lineWidth = 1;
    ctx.font = "11px sans-serif";
    ctx.textAlign = "left";
    for (let index = 0; index <= 4; index += 1) {
      const y = pad.top + priceHeight / 4 * index;
      ctx.beginPath();
      ctx.moveTo(pad.left, y);
      ctx.lineTo(width - pad.right, y);
      ctx.stroke();
      const price = maxPrice - (maxPrice - minPrice) / 4 * index;
      ctx.fillText(window.WKStock.formatNumber(price, 2), 6, y + 4);
    }
    [volumeTop, volumeTop + volumeHeight].forEach(function (y) {
      ctx.beginPath();
      ctx.moveTo(pad.left, y);
      ctx.lineTo(width - pad.right, y);
      ctx.stroke();
    });
    ctx.fillText(window.WKStock.formatNumber(maxVolume, 0), 6, volumeTop + 4);
  }

  function drawLine(ctx, rows, values, x, y, color) {
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    let started = false;
    values.forEach(function (value, index) {
      if (!Number.isFinite(value)) {
        return;
      }
      if (!started) {
        ctx.moveTo(x(index), y(value));
        started = true;
      } else {
        ctx.lineTo(x(index), y(value));
      }
    });
    if (started) {
      ctx.stroke();
    }
  }

  function drawDateLabels(ctx, rows, x, height, textColor) {
    const points = [0, Math.floor(rows.length / 2), rows.length - 1];
    ctx.fillStyle = textColor;
    ctx.font = "11px sans-serif";
    ctx.textAlign = "center";
    points.forEach(function (index) {
      const row = rows[index];
      if (row) {
        ctx.fillText(row.date.slice(5), x(index), height - 7);
      }
    });
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
        indicators: latestIndicatorsForAi(),
        klines: state.klines.slice(-30),
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
    refs.indicatorClear.addEventListener("click", function () { setActiveIndicator(""); });
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
    refs.klineLegend = document.getElementById("stock-kline-legend");
    refs.klineCanvas = document.getElementById("stock-kline-canvas");
    refs.klineCanvasWrap = document.querySelector(".stock-kline-canvas-wrap");
    refs.indicatorGrid = document.getElementById("stock-indicator-grid");
    refs.tabsPanel = document.getElementById("stock-item-tabs-panel");
    refs.indicatorDetail = document.getElementById("stock-indicator-detail");
    refs.indicatorDetailTitle = document.getElementById("stock-indicator-detail-title");
    refs.indicatorDetailValue = document.getElementById("stock-indicator-detail-value");
    refs.indicatorDetailPurpose = document.getElementById("stock-indicator-detail-purpose");
    refs.indicatorDetailUse = document.getElementById("stock-indicator-detail-use");
    refs.indicatorDetailRisk = document.getElementById("stock-indicator-detail-risk");
    refs.indicatorClear = document.getElementById("stock-indicator-clear");
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

  window.addEventListener("resize", function () {
    if (state.klines.length) {
      drawKlineChart(latestIndicators());
    }
  });
})();
