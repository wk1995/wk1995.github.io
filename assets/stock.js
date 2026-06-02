(function () {
  const STORAGE_KEY = "wk1995-stock-watchlist";
  const SEARCH_URL = "https://searchapi.eastmoney.com/api/suggest/get";
  const QUOTE_URL = "https://push2.eastmoney.com/api/qt/ulist.np/get";
  const TREND_URL = "https://push2his.eastmoney.com/api/qt/stock/trends2/get";

  const els = {
    form: document.getElementById("stock-search-form"),
    input: document.getElementById("stock-search-input"),
    results: document.getElementById("stock-search-results"),
    status: document.getElementById("stock-status"),
    watchTabs: document.getElementById("watch-tabs"),
    watchEmpty: document.getElementById("watch-empty"),
    watchCanvas: document.getElementById("stock-chart"),
    detailSection: document.getElementById("detail-section"),
    detailCode: document.getElementById("detail-code"),
    detailName: document.getElementById("detail-name"),
    favoriteToggle: document.getElementById("favorite-toggle"),
    quoteGrid: document.getElementById("quote-grid"),
    detailCanvas: document.getElementById("detail-chart"),
  };

  let watchlist = readWatchlist();
  let activeWatchSecid = watchlist[0]?.secid || "";
  let currentDetail = null;
  let searchTimer = 0;

  init();

  function init() {
    els.form.addEventListener("submit", (event) => {
      event.preventDefault();
      runSearch(els.input.value.trim());
    });

    els.input.addEventListener("input", () => {
      window.clearTimeout(searchTimer);
      searchTimer = window.setTimeout(() => runSearch(els.input.value.trim()), 240);
    });

    els.favoriteToggle.addEventListener("click", toggleCurrentFavorite);
    window.addEventListener("resize", redrawVisibleCharts);

    const params = new URLSearchParams(window.location.search);
    const secid = params.get("secid");
    const name = params.get("name");
    const code = params.get("code");
    renderWatchlist();

    if (secid && code) {
      openDetail({ secid, code, name: name || code }, false);
    } else if (activeWatchSecid) {
      loadWatchChart(activeWatchSecid);
    } else {
      clearCanvas(els.watchCanvas);
      els.watchEmpty.hidden = false;
    }
  }

  async function runSearch(keyword) {
    els.results.replaceChildren();
    if (!keyword) {
      setStatus("");
      return;
    }

    setStatus("正在搜索...");
    try {
      const url = new URL(SEARCH_URL);
      url.searchParams.set("input", keyword);
      url.searchParams.set("type", "14");
      url.searchParams.set("token", "0");
      const data = await fetchJsonp(url);
      const rows = data?.QuotationCodeTable?.Data || [];
      const stocks = rows
        .filter((item) => item.Classify === "AStock" && item.QuoteID && item.Code && item.Name)
        .slice(0, 12)
        .map(normalizeSearchItem);

      renderSearchResults(stocks);
      setStatus(stocks.length ? "" : "没有找到匹配的中国股票。");
    } catch (error) {
      setStatus("搜索暂时不可用，请稍后重试。");
    }
  }

  function renderSearchResults(stocks) {
    els.results.replaceChildren();
    stocks.forEach((stock) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "stock-result";
      button.setAttribute("role", "option");
      button.innerHTML = `<span>${escapeHtml(stock.name)}</span><span class="stock-result-code">${escapeHtml(stock.code)}</span>`;
      button.addEventListener("click", () => openDetail(stock, true));
      els.results.appendChild(button);
    });
  }

  async function openDetail(stock, pushUrl) {
    currentDetail = stock;
    els.results.replaceChildren();
    els.input.value = `${stock.name} ${stock.code}`;
    els.detailSection.hidden = false;
    els.detailCode.textContent = stock.code;
    els.detailName.textContent = stock.name;
    syncFavoriteButton();
    setStatus("正在加载行情...");

    if (pushUrl) {
      const url = new URL(window.location.href);
      url.searchParams.set("secid", stock.secid);
      url.searchParams.set("code", stock.code);
      url.searchParams.set("name", stock.name);
      window.history.pushState({}, "", url);
    }

    try {
      const [quote, trends] = await Promise.all([fetchQuote(stock.secid), fetchTrends(stock.secid)]);
      currentDetail = { ...stock, ...quote };
      renderQuote(currentDetail);
      drawTrendChart(els.detailCanvas, trends, currentDetail);
      setStatus("");
    } catch (error) {
      renderQuote(stock);
      clearCanvas(els.detailCanvas);
      setStatus("行情加载失败，请稍后刷新。");
    }
  }

  async function loadWatchChart(secid) {
    const stock = watchlist.find((item) => item.secid === secid);
    if (!stock) return;

    activeWatchSecid = secid;
    renderWatchlist();
    els.watchEmpty.hidden = true;

    try {
      const [quote, trends] = await Promise.all([fetchQuote(stock.secid), fetchTrends(stock.secid)]);
      drawTrendChart(els.watchCanvas, trends, { ...stock, ...quote });
    } catch (error) {
      clearCanvas(els.watchCanvas);
      els.watchEmpty.hidden = false;
      els.watchEmpty.textContent = "分时图加载失败，请稍后重试。";
    }
  }

  async function fetchQuote(secid) {
    const url = new URL(QUOTE_URL);
    url.searchParams.set("fltt", "2");
    url.searchParams.set("secids", secid);
    url.searchParams.set("fields", "f12,f14,f2,f3,f4,f5,f6,f15,f16,f17,f18");
    const data = await fetchJsonp(url);
    const row = data?.data?.diff?.[0];
    if (!row) throw new Error("Quote not found");
    return {
      code: row.f12,
      name: row.f14,
      price: row.f2,
      percent: row.f3,
      change: row.f4,
      volume: row.f5,
      amount: row.f6,
      high: row.f15,
      low: row.f16,
      open: row.f17,
      preClose: row.f18,
    };
  }

  async function fetchTrends(secid) {
    const url = new URL(TREND_URL);
    url.searchParams.set("secid", secid);
    url.searchParams.set("fields1", "f1,f2,f3,f4,f5,f6,f7,f8,f9,f10,f11");
    url.searchParams.set("fields2", "f51,f52,f53,f54,f55,f56,f57,f58");
    const data = await fetchJsonp(url);
    const rows = data?.data?.trends || [];
    if (!rows.length) throw new Error("Trends not found");
    return rows.map((row) => {
      const parts = row.split(",");
      return {
        time: parts[0],
        price: Number(parts[2]),
        volume: Number(parts[5]),
        avg: Number(parts[7]),
      };
    }).filter((item) => Number.isFinite(item.price));
  }

  function fetchJsonp(url) {
    return new Promise((resolve, reject) => {
      const callbackName = `wkStockCallback${Date.now()}${Math.floor(Math.random() * 100000)}`;
      const script = document.createElement("script");
      const timeout = window.setTimeout(() => {
        cleanup();
        reject(new Error("JSONP timeout"));
      }, 10000);

      url.searchParams.set("cb", callbackName);
      window[callbackName] = (data) => {
        cleanup();
        resolve(data);
      };
      script.onerror = () => {
        cleanup();
        reject(new Error("JSONP failed"));
      };
      script.src = url.toString();
      document.head.appendChild(script);

      function cleanup() {
        window.clearTimeout(timeout);
        delete window[callbackName];
        script.remove();
      }
    });
  }

  function renderQuote(stock) {
    const tone = getTone(stock.change || stock.percent);
    const items = [
      ["最新", formatPrice(stock.price), tone],
      ["涨跌幅", formatPercent(stock.percent), tone],
      ["涨跌额", formatSigned(stock.change), tone],
      ["今开", formatPrice(stock.open)],
      ["最高", formatPrice(stock.high)],
      ["最低", formatPrice(stock.low)],
      ["昨收", formatPrice(stock.preClose)],
      ["成交量", formatVolume(stock.volume)],
      ["成交额", formatAmount(stock.amount)],
    ];

    els.quoteGrid.replaceChildren();
    items.forEach(([label, value, itemTone]) => {
      const div = document.createElement("div");
      div.className = "stock-quote-item";
      div.innerHTML = `<span>${label}</span><strong class="${itemTone || ""}">${value}</strong>`;
      els.quoteGrid.appendChild(div);
    });
  }

  function drawTrendChart(canvas, rows, stock) {
    const context = canvas.getContext("2d");
    const rect = canvas.getBoundingClientRect();
    const ratio = window.devicePixelRatio || 1;
    canvas.width = Math.max(1, Math.floor(rect.width * ratio));
    canvas.height = Math.max(1, Math.floor(rect.height * ratio));
    context.setTransform(ratio, 0, 0, ratio, 0, 0);

    const width = rect.width;
    const height = rect.height;
    const padding = { top: 34, right: 22, bottom: 34, left: 52 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;
    const prices = rows.map((row) => row.price);
    const preClose = Number(stock.preClose) || prices[0];
    const maxDelta = Math.max(...prices.map((price) => Math.abs(price - preClose)), preClose * 0.004);
    const max = preClose + maxDelta;
    const min = preClose - maxDelta;

    context.clearRect(0, 0, width, height);
    context.fillStyle = "rgba(255,255,255,0.015)";
    context.fillRect(0, 0, width, height);

    context.strokeStyle = "rgba(229,236,242,0.12)";
    context.lineWidth = 1;
    for (let i = 0; i <= 4; i += 1) {
      const y = padding.top + (chartHeight / 4) * i;
      drawLine(context, padding.left, y, width - padding.right, y);
    }

    const zeroY = yFor(preClose);
    context.strokeStyle = "rgba(229,236,242,0.28)";
    drawLine(context, padding.left, zeroY, width - padding.right, zeroY);

    context.beginPath();
    rows.forEach((row, index) => {
      const x = padding.left + (chartWidth * index) / Math.max(1, rows.length - 1);
      const y = yFor(row.price);
      if (index === 0) context.moveTo(x, y);
      else context.lineTo(x, y);
    });
    context.strokeStyle = "rgba(75,180,255,0.95)";
    context.lineWidth = 2;
    context.stroke();

    const gradient = context.createLinearGradient(0, padding.top, 0, height - padding.bottom);
    gradient.addColorStop(0, "rgba(75,180,255,0.26)");
    gradient.addColorStop(1, "rgba(75,180,255,0)");
    context.lineTo(width - padding.right, height - padding.bottom);
    context.lineTo(padding.left, height - padding.bottom);
    context.closePath();
    context.fillStyle = gradient;
    context.fill();

    context.fillStyle = "rgba(238,245,248,0.92)";
    context.font = "600 15px Segoe UI, Microsoft YaHei, Arial";
    context.fillText(`${stock.name || ""} ${stock.code || ""}`, padding.left, 20);
    context.fillStyle = "rgba(149,166,178,0.9)";
    context.font = "12px Segoe UI, Microsoft YaHei, Arial";
    context.fillText(rows[0]?.time?.slice(0, 10) || "", width - padding.right - 82, 20);
    context.fillText(formatPrice(max), 8, padding.top + 4);
    context.fillText(formatPrice(preClose), 8, zeroY + 4);
    context.fillText(formatPrice(min), 8, height - padding.bottom);
    context.fillText("09:30", padding.left, height - 10);
    context.fillText("15:00", width - padding.right - 34, height - 10);

    function yFor(price) {
      return padding.top + ((max - price) / Math.max(0.01, max - min)) * chartHeight;
    }
  }

  function drawLine(context, x1, y1, x2, y2) {
    context.beginPath();
    context.moveTo(x1, y1);
    context.lineTo(x2, y2);
    context.stroke();
  }

  function clearCanvas(canvas) {
    const context = canvas.getContext("2d");
    context.clearRect(0, 0, canvas.width, canvas.height);
  }

  function renderWatchlist() {
    els.watchTabs.replaceChildren();
    watchlist.forEach((stock) => {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = `${stock.name} ${stock.code}`;
      button.setAttribute("aria-selected", stock.secid === activeWatchSecid ? "true" : "false");
      button.addEventListener("click", () => loadWatchChart(stock.secid));
      els.watchTabs.appendChild(button);
    });

    if (!watchlist.length) {
      els.watchEmpty.hidden = false;
      els.watchEmpty.textContent = "暂无自选股票，添加后显示分时图。";
    }
  }

  function toggleCurrentFavorite() {
    if (!currentDetail) return;
    const index = watchlist.findIndex((item) => item.secid === currentDetail.secid);
    if (index >= 0) {
      watchlist.splice(index, 1);
      if (activeWatchSecid === currentDetail.secid) activeWatchSecid = watchlist[0]?.secid || "";
    } else {
      watchlist.unshift({
        secid: currentDetail.secid,
        code: currentDetail.code,
        name: currentDetail.name,
      });
      activeWatchSecid = currentDetail.secid;
    }

    writeWatchlist();
    renderWatchlist();
    syncFavoriteButton();

    if (activeWatchSecid) loadWatchChart(activeWatchSecid);
    else {
      clearCanvas(els.watchCanvas);
      els.watchEmpty.hidden = false;
    }
  }

  function syncFavoriteButton() {
    const exists = currentDetail && watchlist.some((item) => item.secid === currentDetail.secid);
    els.favoriteToggle.textContent = exists ? "删除自选" : "添加自选";
  }

  function redrawVisibleCharts() {
    if (activeWatchSecid) loadWatchChart(activeWatchSecid);
    if (currentDetail) openDetail(currentDetail, false);
  }

  function normalizeSearchItem(item) {
    return {
      code: item.Code,
      name: item.Name,
      secid: item.QuoteID,
    };
  }

  function readWatchlist() {
    try {
      const value = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "[]");
      return Array.isArray(value) ? value.filter((item) => item.secid && item.code && item.name) : [];
    } catch (error) {
      return [];
    }
  }

  function writeWatchlist() {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(watchlist));
  }

  function setStatus(message) {
    els.status.textContent = message;
  }

  function formatPrice(value) {
    return Number.isFinite(Number(value)) ? Number(value).toFixed(2) : "--";
  }

  function formatSigned(value) {
    const number = Number(value);
    if (!Number.isFinite(number)) return "--";
    return `${number > 0 ? "+" : ""}${number.toFixed(2)}`;
  }

  function formatPercent(value) {
    const number = Number(value);
    if (!Number.isFinite(number)) return "--";
    return `${number > 0 ? "+" : ""}${number.toFixed(2)}%`;
  }

  function formatVolume(value) {
    const number = Number(value);
    if (!Number.isFinite(number)) return "--";
    if (number >= 100000000) return `${(number / 100000000).toFixed(2)}亿手`;
    if (number >= 10000) return `${(number / 10000).toFixed(2)}万手`;
    return `${number}手`;
  }

  function formatAmount(value) {
    const number = Number(value);
    if (!Number.isFinite(number)) return "--";
    if (number >= 100000000) return `${(number / 100000000).toFixed(2)}亿`;
    if (number >= 10000) return `${(number / 10000).toFixed(2)}万`;
    return number.toFixed(2);
  }

  function getTone(value) {
    const number = Number(value);
    if (number > 0) return "stock-up";
    if (number < 0) return "stock-down";
    return "stock-neutral";
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (char) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "\"": "&quot;",
      "'": "&#39;",
    })[char]);
  }
})();
