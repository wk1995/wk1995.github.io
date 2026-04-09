(function () {
  const trendingList = document.getElementById("trending-list");
  const trendingUpdated = document.getElementById("trending-updated");
  const trendingPeriod = document.getElementById("trending-period");

  if (!trendingList || !trendingUpdated || !trendingPeriod) {
    return;
  }

  function formatNumber(value) {
    if (typeof value !== "number") {
      return "--";
    }
    return new Intl.NumberFormat("zh-CN").format(value);
  }

  function formatDate(value) {
    if (!value) {
      return "未知";
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return "未知";
    }

    return new Intl.DateTimeFormat("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Asia/Shanghai",
    }).format(date);
  }

  function createMetric(label, value) {
    const item = document.createElement("div");
    item.className = "trend-metric";

    const metricLabel = document.createElement("span");
    metricLabel.className = "trend-metric-label";
    metricLabel.textContent = label;

    const metricValue = document.createElement("strong");
    metricValue.className = "trend-metric-value";
    metricValue.textContent = value;

    item.append(metricLabel, metricValue);
    return item;
  }

  function createCard(item) {
    const article = document.createElement("article");
    article.className = "card trend-card";

    const top = document.createElement("div");
    top.className = "trend-card-top";

    const rank = document.createElement("span");
    rank.className = "trend-rank";
    rank.textContent = "#" + item.rank;

    const tag = document.createElement("span");
    tag.className = "trend-badge";
    tag.textContent = item.language || "Trending";

    top.append(rank, tag);

    const title = document.createElement("h3");
    const link = document.createElement("a");
    link.href = item.url;
    link.target = "_blank";
    link.rel = "noopener";
    link.textContent = item.repo;
    title.appendChild(link);

    const description = document.createElement("p");
    description.textContent =
      item.description || "GitHub Trending 未提供项目描述。";

    const metrics = document.createElement("div");
    metrics.className = "trend-metrics";
    metrics.append(
      createMetric("累计 Star", formatNumber(item.stars_total)),
      createMetric("今日新增", "+" + formatNumber(item.stars_today)),
      createMetric("Fork", formatNumber(item.forks_total))
    );

    const footer = document.createElement("a");
    footer.className = "trend-link";
    footer.href = item.url;
    footer.target = "_blank";
    footer.rel = "noopener";
    footer.textContent = "打开仓库";

    article.append(top, title, description, metrics, footer);
    return article;
  }

  function renderEmpty(message) {
    trendingList.innerHTML = "";

    const empty = document.createElement("article");
    empty.className = "card trend-card trend-card-empty";

    const title = document.createElement("h3");
    title.textContent = "GitHub 热门项目暂时不可用";

    const description = document.createElement("p");
    description.textContent = message;

    const link = document.createElement("a");
    link.className = "trend-link";
    link.href = "https://github.com/trending";
    link.target = "_blank";
    link.rel = "noopener";
    link.textContent = "直接打开 GitHub Trending";

    empty.append(title, description, link);
    trendingList.appendChild(empty);
  }

  function renderTrending(data) {
    if (!data || !Array.isArray(data.items) || data.items.length === 0) {
      renderEmpty("数据文件存在，但没有可展示的仓库。");
      return;
    }

    trendingUpdated.textContent = formatDate(data.generated_at);
    trendingPeriod.textContent =
      "GitHub Trending · " + String(data.since || "daily").toUpperCase();

    trendingList.innerHTML = "";
    const fragment = document.createDocumentFragment();
    data.items.slice(0, 6).forEach((item) => {
      fragment.appendChild(createCard(item));
    });
    trendingList.appendChild(fragment);
  }

  async function loadFallback() {
    if (window.location.protocol === "file:") {
      renderEmpty("本地直接打开文件时未找到预生成数据，请确认 data/trending.js 已加载。");
      return;
    }

    try {
      const response = await fetch("data/trending.json", { cache: "no-store" });
      if (!response.ok) {
        throw new Error("Unable to fetch trending.json");
      }
      renderTrending(await response.json());
    } catch (error) {
      renderEmpty("自动同步数据失败，稍后再试。");
    }
  }

  if (window.__TRENDING_DATA__) {
    renderTrending(window.__TRENDING_DATA__);
  } else {
    loadFallback();
  }
})();
