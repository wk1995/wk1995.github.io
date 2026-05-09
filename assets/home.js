(function () {
  const trendingList = document.getElementById("trending-list");
  const trendingUpdated = document.getElementById("trending-updated");
  const trendingPeriod = document.getElementById("trending-period");
  const searchForm = document.getElementById("site-search-form");
  const searchInput = document.getElementById("site-search-input");
  const searchStatus = document.getElementById("site-search-status");

  if (!trendingList || !trendingUpdated || !trendingPeriod) {
    return;
  }

  const STORAGE_KEYS = {
    savedTrending: "wk1995-saved-trending",
  };

  const copy = {
    zh: {
      locale: "zh-CN",
      unknown: "未知",
      noDescription: "GitHub Trending 未提供项目描述。",
      metricStars: "累计 Star",
      metricToday: "今日新增",
      metricForks: "Fork",
      openRepo: "打开仓库",
      unavailable: "GitHub 热门项目暂时不可用",
      noItems: "数据文件存在，但没有可展示的仓库。",
      openTrending: "直接打开 GitHub Trending",
      localMissing: "本地直接打开文件时未找到预生成数据，请确认 data/trending.js 已加载。",
      syncFailed: "自动同步数据失败，稍后再试。",
      summaryPrefix: "GitHub Trending · ",
      growthLabel: "今日热度",
      save: "收藏",
      saved: "已收藏",
      searchFound: "找到 {count} 个结果，已定位到第一个。",
      searchNone: "没有找到匹配内容。",
      searchCleared: "已清除搜索高亮。",
    },
    en: {
      locale: "en-US",
      unknown: "Unknown",
      noDescription: "GitHub Trending did not provide a repository description.",
      metricStars: "Stars",
      metricToday: "Today",
      metricForks: "Forks",
      openRepo: "Open repository",
      unavailable: "GitHub trending is temporarily unavailable",
      noItems: "The data file exists, but there are no repositories to display.",
      openTrending: "Open GitHub Trending",
      localMissing: "Pre-generated data was not found when opening this file locally. Make sure data/trending.js is loaded.",
      syncFailed: "Automatic sync failed. Please try again later.",
      summaryPrefix: "GitHub Trending · ",
      growthLabel: "Momentum today",
      save: "Save",
      saved: "Saved",
      searchFound: "Found {count} matches and jumped to the first one.",
      searchNone: "No matching content was found.",
      searchCleared: "Search highlights cleared.",
    },
  };

  const motionTargets = [];
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let observer = null;
  let currentSearchQuery = "";
  let state = {
    mode: "idle",
    data: null,
    errorKey: null,
  };

  function getLanguage() {
    if (window.WKSite && typeof window.WKSite.getLanguage === "function") {
      return window.WKSite.getLanguage();
    }
    return document.documentElement.lang.startsWith("zh") ? "zh" : "en";
  }

  function getCopy() {
    return copy[getLanguage()] || copy.zh;
  }

  function getSavedRepos() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEYS.savedTrending) || "[]");
      return new Set(Array.isArray(saved) ? saved : []);
    } catch (error) {
      return new Set();
    }
  }

  function setSavedRepos(savedRepos) {
    try {
      localStorage.setItem(STORAGE_KEYS.savedTrending, JSON.stringify(Array.from(savedRepos)));
    } catch (error) {
      // Ignore storage failures and keep the in-memory state working.
    }
  }

  function formatNumber(value) {
    const currentCopy = getCopy();
    if (typeof value !== "number") {
      return "--";
    }
    return new Intl.NumberFormat(currentCopy.locale).format(value);
  }

  function formatDate(value) {
    const currentCopy = getCopy();
    if (!value) {
      return currentCopy.unknown;
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return currentCopy.unknown;
    }

    return new Intl.DateTimeFormat(currentCopy.locale, {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Asia/Shanghai",
    }).format(date);
  }

  function formatScore(value) {
    if (typeof value !== "number" || Number.isNaN(value)) {
      return "--";
    }
    return value % 1 === 0 ? String(value) : value.toFixed(1);
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

  function getDescription(item) {
    const currentCopy = getCopy();
    const language = getLanguage();

    if (item.descriptions && item.descriptions[language]) {
      return item.descriptions[language];
    }

    return item.description || currentCopy.noDescription;
  }

  function getLanguageSlug(language) {
    const normalized = String(language || "unknown")
      .trim()
      .toLowerCase()
      .replace(/\+/g, "p")
      .replace(/#/g, "sharp")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

    if (!normalized) {
      return "unknown";
    }

    if (normalized === "ts") {
      return "typescript";
    }

    return normalized;
  }

  function createSparkline(item) {
    const sparkline = document.createElement("div");
    sparkline.className = "trend-sparkline";
    sparkline.setAttribute("aria-hidden", "true");

    const seed =
      (Number(item.stars_today) || 0) +
      (Number(item.forks_total) || 0) +
      (Number(item.rank) || 0) * 17;
    const values = Array.from({ length: 6 }, function (_, index) {
      const raw = 34 + ((seed + index * 19) % 52);
      return index === 5 ? Math.min(raw + 10, 98) : raw;
    });

    values.forEach(function (value) {
      const bar = document.createElement("span");
      bar.className = "trend-sparkline-bar";
      bar.style.height = value + "%";
      sparkline.appendChild(bar);
    });

    return sparkline;
  }

  function updateSaveButton(button, repo, savedRepos) {
    const currentCopy = getCopy();
    const isSaved = savedRepos.has(repo);

    button.classList.toggle("is-saved", isSaved);
    button.textContent = isSaved ? currentCopy.saved : currentCopy.save;
    button.setAttribute("aria-pressed", isSaved ? "true" : "false");
  }

  function createSaveButton(item) {
    const button = document.createElement("button");
    button.className = "trend-save-button";
    button.type = "button";

    updateSaveButton(button, item.repo, getSavedRepos());

    button.addEventListener("click", function () {
      const savedRepos = getSavedRepos();
      if (savedRepos.has(item.repo)) {
        savedRepos.delete(item.repo);
      } else {
        savedRepos.add(item.repo);
      }
      setSavedRepos(savedRepos);
      updateSaveButton(button, item.repo, savedRepos);
    });

    return button;
  }

  function createCard(item) {
    const currentCopy = getCopy();
    const article = document.createElement("article");
    article.className = "card trend-card search-card";

    const top = document.createElement("div");
    top.className = "trend-card-top";

    const topLeft = document.createElement("div");
    topLeft.className = "trend-card-top-left";

    const rank = document.createElement("span");
    rank.className = "trend-rank";
    rank.textContent = "#" + item.rank;

    const language = document.createElement("span");
    const languageName = item.language || currentCopy.unknown;
    language.className = "trend-language trend-language--" + getLanguageSlug(languageName);
    language.textContent = languageName;

    topLeft.append(rank, language);

    const saveButton = createSaveButton(item);
    top.append(topLeft, saveButton);

    const body = document.createElement("div");
    body.className = "trend-card-body";

    const repoCopy = document.createElement("div");
    repoCopy.className = "trend-repo-copy";

    const title = document.createElement("h3");
    const link = document.createElement("a");
    link.href = item.url;
    link.target = "_blank";
    link.rel = "noopener";
    link.textContent = item.repo;
    title.appendChild(link);

    const description = document.createElement("p");
    description.textContent = getDescription(item);

    repoCopy.append(title, description);

    const metrics = document.createElement("div");
    metrics.className = "trend-metrics";
    metrics.append(
      createMetric(currentCopy.metricStars, formatNumber(item.stars_total)),
      createMetric(currentCopy.metricToday, "+" + formatNumber(item.stars_today)),
      createMetric(currentCopy.metricForks, formatNumber(item.forks_total))
    );

    const footer = document.createElement("div");
    footer.className = "trend-card-footer";

    const growth = document.createElement("span");
    growth.className = "trend-growth";
    growth.textContent = currentCopy.growthLabel + " +" + formatNumber(item.stars_today);

    const footerLink = document.createElement("a");
    footerLink.className = "trend-link";
    footerLink.href = item.url;
    footerLink.target = "_blank";
    footerLink.rel = "noopener";
    footerLink.textContent = currentCopy.openRepo;

    footer.append(growth, footerLink);
    body.append(repoCopy, createSparkline(item), metrics, footer);
    article.append(top, body);

    return article;
  }

  function renderEmpty(messageKey) {
    const currentCopy = getCopy();
    state = {
      mode: "empty",
      data: null,
      errorKey: messageKey,
    };

    trendingUpdated.textContent = currentCopy.unknown;
    trendingPeriod.textContent = currentCopy.summaryPrefix + "DAILY";
    trendingList.innerHTML = "";

    const empty = document.createElement("article");
    empty.className = "card trend-card trend-card-empty";

    const title = document.createElement("h3");
    title.textContent = currentCopy.unavailable;

    const description = document.createElement("p");
    description.textContent = currentCopy[messageKey] || currentCopy.noItems;

    const link = document.createElement("a");
    link.className = "trend-link";
    link.href = "https://github.com/trending";
    link.target = "_blank";
    link.rel = "noopener";
    link.textContent = currentCopy.openTrending;

    empty.append(title, description, link);
    trendingList.appendChild(empty);
  }

  function renderTrending(data) {
    const currentCopy = getCopy();
    if (!data || !Array.isArray(data.items) || data.items.length === 0) {
      renderEmpty("noItems");
      return;
    }

    state = {
      mode: "data",
      data: data,
      errorKey: null,
    };

    trendingUpdated.textContent = formatDate(data.generated_at);
    trendingPeriod.textContent =
      currentCopy.summaryPrefix + String(data.since || "daily").toUpperCase();

    trendingList.innerHTML = "";
    const fragment = document.createDocumentFragment();
    data.items.slice(0, 6).forEach(function (item) {
      fragment.appendChild(createCard(item));
    });
    trendingList.appendChild(fragment);

    if (currentSearchQuery) {
      runSearch(currentSearchQuery, { scroll: false });
    }
  }

  async function loadFallback() {
    if (window.location.protocol === "file:") {
      renderEmpty("localMissing");
      return;
    }

    try {
      const response = await fetch("data/trending.json", { cache: "no-store" });
      if (!response.ok) {
        throw new Error("Unable to fetch trending.json");
      }
      renderTrending(await response.json());
    } catch (error) {
      renderEmpty("syncFailed");
    }
  }

  function rerender() {
    if (state.mode === "data" && state.data) {
      renderTrending(state.data);
      return;
    }

    if (state.mode === "empty" && state.errorKey) {
      renderEmpty(state.errorKey);
    }
  }

  function setSearchStatus(message) {
    if (!searchStatus) {
      return;
    }
    searchStatus.textContent = message || "";
  }

  function clearSearchHighlights() {
    document.querySelectorAll(".is-search-hit").forEach(function (node) {
      node.classList.remove("is-search-hit");
    });
  }

  function normalizeSearchValue(value) {
    return String(value || "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, " ");
  }

  function runSearch(query, options) {
    const currentCopy = getCopy();
    const settings = options || {};
    const normalizedQuery = normalizeSearchValue(query);

    currentSearchQuery = normalizedQuery;
    clearSearchHighlights();

    if (!normalizedQuery) {
      if (!settings.silent) {
        setSearchStatus("");
      }
      return [];
    }

    const cards = Array.from(document.querySelectorAll(".search-card"));
    const matches = cards.filter(function (card) {
      return normalizeSearchValue(card.textContent).includes(normalizedQuery);
    });

    matches.forEach(function (card) {
      card.classList.add("is-search-hit");
    });

    if (!matches.length) {
      if (!settings.silent) {
        setSearchStatus(currentCopy.searchNone);
      }
      return [];
    }

    if (settings.scroll !== false) {
      matches[0].scrollIntoView({
        behavior: reducedMotion ? "auto" : "smooth",
        block: "center",
      });
    }

    if (!settings.silent) {
      setSearchStatus(currentCopy.searchFound.replace("{count}", String(matches.length)));
    }

    return matches;
  }

  function initSearch() {
    if (!searchForm || !searchInput) {
      return;
    }

    searchForm.addEventListener("submit", function (event) {
      event.preventDefault();
      runSearch(searchInput.value);
    });

    searchInput.addEventListener("input", function () {
      if (searchInput.value.trim()) {
        return;
      }

      clearSearchHighlights();
      currentSearchQuery = "";
      setSearchStatus("");
    });

    searchInput.addEventListener("keydown", function (event) {
      if (event.key === "Escape") {
        searchInput.value = "";
        clearSearchHighlights();
        currentSearchQuery = "";
        setSearchStatus(getCopy().searchCleared);
      }
    });
  }

  function animateNumber(node, target, formatValue) {
    if (!node || node.dataset.animated === "true") {
      return;
    }

    node.dataset.animated = "true";

    if (reducedMotion) {
      node.textContent = formatValue(target);
      return;
    }

    const startedAt = performance.now();
    const duration = 1100;

    function tick(now) {
      const progress = Math.min((now - startedAt) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      node.textContent = formatValue(target * eased);
      if (progress < 1) {
        requestAnimationFrame(tick);
      } else {
        node.textContent = formatValue(target);
      }
    }

    requestAnimationFrame(tick);
  }

  function animateMeter(node, target) {
    if (!node || node.dataset.animated === "true") {
      return;
    }

    node.dataset.animated = "true";

    if (reducedMotion) {
      node.style.width = target + "%";
      return;
    }

    requestAnimationFrame(function () {
      node.style.transition = "width 1s cubic-bezier(0.22, 1, 0.36, 1)";
      node.style.width = target + "%";
    });
  }

  function startMotionFor(node) {
    if (!node) {
      return;
    }

    if (node.dataset.countTo) {
      const target = Number(node.dataset.countTo);
      const suffix = node.dataset.countSuffix || "";
      animateNumber(node, target, function (value) {
        return Math.round(value).toLocaleString(getCopy().locale) + suffix;
      });
      return;
    }

    if (node.dataset.scoreTarget) {
      const target = Number(node.dataset.scoreTarget);
      animateNumber(node, target, function (value) {
        return formatScore(Math.round(value * 10) / 10);
      });
      return;
    }

    if (node.dataset.meterTarget) {
      animateMeter(node, Number(node.dataset.meterTarget));
    }
  }

  function initMotion() {
    motionTargets.push.apply(
      motionTargets,
      Array.from(document.querySelectorAll("[data-count-to], [data-score-target], [data-meter-target]"))
    );

    if (!motionTargets.length) {
      return;
    }

    if (!("IntersectionObserver" in window) || reducedMotion) {
      motionTargets.forEach(startMotionFor);
      return;
    }

    observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) {
            return;
          }
          startMotionFor(entry.target);
          observer.unobserve(entry.target);
        });
      },
      {
        threshold: 0.35,
      }
    );

    motionTargets.forEach(function (node) {
      observer.observe(node);
    });
  }

  function initScrollState() {
    function syncScrollState() {
      document.body.classList.toggle("is-scrolled", window.scrollY > 12);
    }

    syncScrollState();
    window.addEventListener("scroll", syncScrollState, { passive: true });
  }

  initSearch();
  initMotion();
  initScrollState();

  window.addEventListener("wk:language-change", function () {
    rerender();
    if (currentSearchQuery) {
      runSearch(currentSearchQuery, { scroll: false, silent: false });
    }
  });

  if (window.__TRENDING_DATA__) {
    renderTrending(window.__TRENDING_DATA__);
  } else {
    loadFallback();
  }
})();
