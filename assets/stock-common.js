(function () {
  const SUGGEST_URL = "https://searchapi.eastmoney.com/api/suggest/get";
  const QUOTE_URL = "https://push2.eastmoney.com/api/qt/stock/get";
  const FLOW_URL = "https://push2.eastmoney.com/api/qt/stock/fflow/daykline/get";
  const SUGGEST_TOKEN = "D43BF722C8E33BDC906FB84D85E326E8";
  const QUOTE_FIELDS = [
    "f43",
    "f44",
    "f45",
    "f46",
    "f47",
    "f48",
    "f49",
    "f50",
    "f57",
    "f58",
    "f59",
    "f60",
    "f86",
    "f107",
    "f116",
    "f117",
    "f127",
    "f128",
    "f129",
    "f135",
    "f136",
    "f137",
    "f138",
    "f139",
    "f140",
    "f141",
    "f142",
    "f143",
    "f152",
    "f162",
    "f167",
    "f168",
    "f169",
    "f170",
    "f171",
    "f173",
    "f174",
    "f175",
    "f184",
    "f292",
  ].join(",");
  const FLOW_FIELDS = "f51,f52,f53,f54,f55,f56,f57,f58,f59,f60,f61,f62,f63";

  function language() {
    return window.WKSite && typeof window.WKSite.getLanguage === "function"
      ? window.WKSite.getLanguage()
      : "zh";
  }

  function locale() {
    return language() === "en" ? "en-US" : "zh-CN";
  }

  function jsonp(url) {
    return new Promise(function (resolve, reject) {
      const callbackName = "__wkStockJsonp" + Date.now() + Math.random().toString(16).slice(2);
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
      script.src = url.replace("__CALLBACK__", encodeURIComponent(callbackName));
      document.head.appendChild(script);
    });
  }

  async function fetchJson(url) {
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) {
      throw new Error("HTTP " + response.status);
    }
    return response.json();
  }

  function inferMarket(code) {
    const value = String(code || "");
    if (/^(5|6|9)/.test(value)) {
      return "1";
    }
    return "0";
  }

  function securityId(stock) {
    const quoteId = stock && (stock.quoteId || stock.QuoteID);
    if (quoteId && /^\d+\.\w+/.test(String(quoteId))) {
      return String(quoteId);
    }
    const code = stock && (stock.code || stock.Code || stock.UnifiedCode);
    const market = stock && (stock.market || stock.MktNum || stock.MarketType);
    return (market || inferMarket(code)) + "." + String(code || "").trim().toUpperCase();
  }

  function normalizeSearchItem(item) {
    return {
      code: item.Code || item.UnifiedCode || "",
      name: item.Name || "",
      market: String(item.MktNum || item.MarketType || inferMarket(item.Code)),
      quoteId: item.QuoteID || (String(item.MktNum || inferMarket(item.Code)) + "." + item.Code),
      securityTypeName: item.SecurityTypeName || "",
      classify: item.Classify || "",
    };
  }

  async function searchStocks(keyword) {
    const value = String(keyword || "").trim();
    if (!value) {
      return [];
    }
    const params = new URLSearchParams({
      input: value,
      type: "14",
      token: SUGGEST_TOKEN,
      count: "8",
      cb: "__CALLBACK__",
    });
    const payload = await jsonp(SUGGEST_URL + "?" + params.toString());
    const rows = payload
      && payload.QuotationCodeTable
      && Array.isArray(payload.QuotationCodeTable.Data)
      ? payload.QuotationCodeTable.Data
      : [];
    return rows
      .map(normalizeSearchItem)
      .filter(function (item) { return item.code && item.name; });
  }

  function scaleNumber(value, digits) {
    const number = Number(value);
    if (!Number.isFinite(number) || number === -1) {
      return NaN;
    }
    const precision = Number.isFinite(Number(digits)) ? Number(digits) : 2;
    return number / Math.pow(10, precision);
  }

  function scalePercent(value) {
    const number = Number(value);
    if (!Number.isFinite(number) || number === -1) {
      return NaN;
    }
    return number / 100;
  }

  function normalizeQuote(payload, fallback) {
    const data = payload && payload.data ? payload.data : {};
    const digits = Number.isFinite(Number(data.f59)) ? Number(data.f59) : 2;
    const code = data.f57 || (fallback && fallback.code) || "";
    const market = String(data.f107 || (fallback && fallback.market) || inferMarket(code));
    return {
      code: code,
      name: data.f58 || (fallback && fallback.name) || code,
      market: market,
      quoteId: market + "." + code,
      price: scaleNumber(data.f43, digits),
      high: scaleNumber(data.f44, digits),
      low: scaleNumber(data.f45, digits),
      open: scaleNumber(data.f46, digits),
      previousClose: scaleNumber(data.f60, digits),
      change: scaleNumber(data.f169, digits),
      changePercent: scalePercent(data.f170),
      amplitude: scalePercent(data.f171),
      volume: Number(data.f47),
      turnover: Number(data.f48),
      volumeRatio: scalePercent(data.f50),
      updatedAt: Number(data.f86),
      totalMarketValue: Number(data.f116),
      circulatingMarketValue: Number(data.f117),
      industry: data.f127 || "",
      region: data.f128 || "",
      concepts: String(data.f129 || "").split(",").filter(Boolean),
      superLargeIn: Number(data.f135),
      superLargeOut: Number(data.f136),
      superLargeNet: Number(data.f137),
      largeIn: Number(data.f138),
      largeOut: Number(data.f139),
      largeNet: Number(data.f140),
      mediumIn: Number(data.f141),
      mediumOut: Number(data.f142),
      mediumNet: Number(data.f143),
      pe: scalePercent(data.f162),
      pb: scalePercent(data.f167),
      turnoverRate: scalePercent(data.f168),
      outer: Number(data.f174),
      inner: Number(data.f175),
      mainNetRatio: Number(data.f184),
      state: Number(data.f292),
    };
  }

  async function fetchQuote(stock) {
    const params = new URLSearchParams({
      secid: securityId(stock),
      fields: QUOTE_FIELDS,
    });
    const payload = await fetchJson(QUOTE_URL + "?" + params.toString());
    return normalizeQuote(payload, stock);
  }

  function normalizeFlowRow(row) {
    const parts = String(row || "").split(",");
    return {
      date: parts[0] || "",
      mainNet: Number(parts[1]),
      smallNet: Number(parts[2]),
      mediumNet: Number(parts[3]),
      largeNet: Number(parts[4]),
      superLargeNet: Number(parts[5]),
      mainRatio: Number(parts[6]),
      smallRatio: Number(parts[7]),
      mediumRatio: Number(parts[8]),
      largeRatio: Number(parts[9]),
      superLargeRatio: Number(parts[10]),
      close: Number(parts[11]),
      changePercent: Number(parts[12]),
    };
  }

  async function fetchMoneyFlow(stock, limit) {
    const params = new URLSearchParams({
      secid: securityId(stock),
      lmt: String(limit || 10),
      fields1: "f1,f2,f3,f7",
      fields2: FLOW_FIELDS,
    });
    const payload = await fetchJson(FLOW_URL + "?" + params.toString());
    const rows = payload && payload.data && Array.isArray(payload.data.klines)
      ? payload.data.klines
      : [];
    return rows.map(normalizeFlowRow);
  }

  function newsConfig() {
    const config = window.WKStockNewsConfig || {};
    return {
      maxItems: Number(config.maxItems) > 0 ? Number(config.maxItems) : 12,
      sources: Array.isArray(config.sources) ? config.sources : [],
    };
  }

  function normalizeNewsItem(item, source) {
    return {
      id: item.id || item.code || item.url || item.title,
      title: stripHtml(item.title || ""),
      summary: stripHtml(item.summary || item.content || item.description || ""),
      source: item.source || item.mediaName || item.media || source.label || source.id,
      publishedAt: item.publishedAt || item.date || item.time || "",
      url: item.url || item.link || "",
    };
  }

  function stripHtml(value) {
    return String(value || "")
      .replace(/<[^>]+>/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  async function fetchNews(keyword, limit) {
    const config = newsConfig();
    const source = config.sources[0];
    const value = String(keyword || "").trim();
    if (!source || !value) {
      return [];
    }
    const context = {
      sectorName: value,
      sectorCode: "",
      sectorType: "stock",
      language: language(),
    };
    const callbackName = "__wkStockNews" + Date.now() + Math.random().toString(16).slice(2);
    const url = typeof source.buildUrl === "function"
      ? source.buildUrl(context, callbackName)
      : String(source.url || "").replace("{{keyword}}", encodeURIComponent(value));
    const payload = source.type === "jsonp" ? await jsonp(url.replace(callbackName, "__CALLBACK__")) : await fetchJson(url);
    const rows = typeof source.parse === "function" ? source.parse(payload, context) : payload;
    return (Array.isArray(rows) ? rows : [])
      .map(function (item) { return normalizeNewsItem(item, source); })
      .filter(function (item) { return item.title; })
      .slice(0, limit || config.maxItems);
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

  function aiReady() {
    const model = modelConfig();
    return Boolean(model && model.modelId && model.key && model.meta);
  }

  function modelLabel() {
    const model = modelConfig();
    if (!model || !model.modelId || !model.meta) {
      return "";
    }
    return model.catalog.labelForModel(model.meta, language());
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

  function modelProviderId(model) {
    return model.meta && model.meta.provider ? model.meta.provider : "";
  }

  function buildAiBody(model, options) {
    const prompt = options && options.prompt ? options.prompt : "";
    const system = options && options.system ? options.system : "你是谨慎的市场研究助手，回答要简洁、基于事实，并明确风险。";
    if (isAnthropicModel(model)) {
      return {
        model: requestModelName(model),
        system: system,
        messages: [{ role: "user", content: prompt }],
        max_tokens: options && options.maxTokens ? options.maxTokens : 2048,
      };
    }
    const body = {
      model: requestModelName(model),
      messages: [
        { role: "system", content: system },
        { role: "user", content: prompt },
      ],
      stream: false,
    };
    if (modelProviderId(model) === "zhipu" && model.meta && model.meta.thinking) {
      body.thinking = { type: "enabled" };
    }
    return body;
  }

  async function readErrorResponse(response) {
    const fallback = response && response.statusText ? response.statusText : "Unknown error";
    try {
      const raw = await response.text();
      if (!raw) {
        return fallback;
      }
      try {
        const payload = JSON.parse(raw);
        if (payload && payload.error) {
          return payload.error.message || payload.error.type || JSON.stringify(payload.error);
        }
      } catch (error) {
        return raw.trim() || fallback;
      }
    } catch (error) {
      return fallback;
    }
    return fallback;
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

  async function runAi(options) {
    const model = modelConfig();
    if (!model || !model.modelId || !model.key || !model.meta) {
      throw new Error(language() === "en" ? "Configure a model and API key in AI Chat first." : "请先在 AI Chat 中配置模型和 API Key。");
    }
    const response = await fetch(requestApiUrl(model), {
      method: "POST",
      headers: requestHeaders(model),
      body: JSON.stringify(buildAiBody(model, options)),
    });
    if (!response.ok) {
      throw new Error(await readErrorResponse(response));
    }
    const content = responseContent(await response.json());
    if (!content) {
      throw new Error(language() === "en" ? "The model returned no usable content." : "模型没有返回有效内容。");
    }
    return content;
  }

  function formatNumber(value, digits) {
    const number = Number(value);
    if (!Number.isFinite(number)) {
      return "--";
    }
    return new Intl.NumberFormat(locale(), {
      maximumFractionDigits: digits === undefined ? 2 : digits,
      minimumFractionDigits: digits === undefined ? 0 : digits,
    }).format(number);
  }

  function formatPercent(value) {
    const number = Number(value);
    if (!Number.isFinite(number)) {
      return "--";
    }
    return (number > 0 ? "+" : "") + number.toFixed(2) + "%";
  }

  function formatAmount(value, options) {
    const number = Number(value);
    if (!Number.isFinite(number)) {
      return "--";
    }
    const abs = Math.abs(number);
    const sign = number > 0 ? "+" : number < 0 ? "-" : "";
    if (abs >= 100000000) {
      return sign + (abs / 100000000).toFixed(options && options.compact ? 1 : 2) + (language() === "en" ? "B" : "亿");
    }
    if (abs >= 10000) {
      return sign + (abs / 10000).toFixed(options && options.compact ? 1 : 2) + (language() === "en" ? "W" : "万");
    }
    return sign + formatNumber(abs, 0);
  }

  function formatTime(seconds) {
    const timestamp = Number(seconds);
    if (!Number.isFinite(timestamp) || timestamp <= 0) {
      return "--";
    }
    return new Intl.DateTimeFormat(locale(), {
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Asia/Shanghai",
    }).format(new Date(timestamp * 1000));
  }

  window.WKStock = {
    language: language,
    searchStocks: searchStocks,
    fetchQuote: fetchQuote,
    fetchMoneyFlow: fetchMoneyFlow,
    fetchNews: fetchNews,
    securityId: securityId,
    inferMarket: inferMarket,
    aiReady: aiReady,
    modelLabel: modelLabel,
    runAi: runAi,
    formatNumber: formatNumber,
    formatPercent: formatPercent,
    formatAmount: formatAmount,
    formatTime: formatTime,
  };
})();
