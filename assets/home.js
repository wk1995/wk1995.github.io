(function () {
  const trendingList = document.getElementById("trending-list");
  const trendingUpdated = document.getElementById("trending-updated");
  const trendingPeriod = document.getElementById("trending-period");
  const homePostList = document.getElementById("home-post-list");

  if (!trendingList || !trendingUpdated || !trendingPeriod) {
    return;
  }

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
      postLoading: "加载文章",
      postUnavailable: "博客文章暂时不可用",
      postEmpty: "暂时没有可展示在首页的文章。",
      postFailed: "首页文章加载失败，稍后再试。",
      postRead: "阅读全文",
      postComments: "评论",
      postLikes: "点赞",
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
      postLoading: "Loading posts",
      postUnavailable: "Blog posts are temporarily unavailable",
      postEmpty: "No homepage posts are available yet.",
      postFailed: "Unable to load homepage posts.",
      postRead: "Read article",
      postComments: "Comments",
      postLikes: "Reactions",
    },
  };

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

  function formatPostDate(value) {
    return String(value || "").replaceAll("-", ".");
  }

  function escapeHtml(value) {
    return String(value || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
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

  function createCard(item) {
    const currentCopy = getCopy();
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
    description.textContent = getDescription(item);

    const metrics = document.createElement("div");
    metrics.className = "trend-metrics";
    metrics.append(
      createMetric(currentCopy.metricStars, formatNumber(item.stars_total)),
      createMetric(currentCopy.metricToday, "+" + formatNumber(item.stars_today)),
      createMetric(currentCopy.metricForks, formatNumber(item.forks_total))
    );

    const footer = document.createElement("a");
    footer.className = "trend-link";
    footer.href = item.url;
    footer.target = "_blank";
    footer.rel = "noopener";
    footer.textContent = currentCopy.openRepo;

    article.append(top, title, description, metrics, footer);
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
  }

  function createHomePostCard(post) {
    const currentCopy = getCopy();
    const article = document.createElement("article");
    article.className = "card home-post-card";
    const badges = [];

    if (post.comments && post.comments.enabled) {
      badges.push(currentCopy.postComments);
    }
    if (post.likes && post.likes.enabled) {
      badges.push(currentCopy.postLikes);
    }

    article.innerHTML = `
      <div>
        <div class="home-post-meta">
          <time datetime="${escapeHtml(post.date)}">${escapeHtml(formatPostDate(post.date))}</time>
          ${badges.map((badge) => `<span>${escapeHtml(badge)}</span>`).join("")}
        </div>
        <h3><a href="${escapeHtml(post.url)}">${escapeHtml(post.title)}</a></h3>
        <p>${escapeHtml(post.summary)}</p>
        <div class="home-post-tags">
          ${(post.tags || []).slice(0, 3).map((tag) => `<span class="home-post-tag">${escapeHtml(tag)}</span>`).join("")}
        </div>
      </div>
      <a class="home-post-link" href="${escapeHtml(post.url)}">${escapeHtml(currentCopy.postRead)} →</a>
    `;

    return article;
  }

  function renderHomePostEmpty(message) {
    if (!homePostList) return;
    const currentCopy = getCopy();
    const allPosts = window.WKSite?.message?.("homePosts.all") || "查看全部博客";

    homePostList.innerHTML = `
      <article class="card home-post-card">
        <div class="home-post-meta"><span>${escapeHtml(currentCopy.postLoading)}</span></div>
        <h3>${escapeHtml(currentCopy.postUnavailable)}</h3>
        <p>${escapeHtml(message)}</p>
        <a class="home-post-link" href="/blog/">${escapeHtml(allPosts)} →</a>
      </article>
    `;
  }

  function renderHomePosts(posts) {
    if (!homePostList) return;
    if (!Array.isArray(posts) || posts.length === 0) {
      renderHomePostEmpty(getCopy().postEmpty);
      return;
    }

    homePostList.innerHTML = "";
    const fragment = document.createDocumentFragment();
    posts.slice(0, 3).forEach(function (post) {
      fragment.appendChild(createHomePostCard(post));
    });
    homePostList.appendChild(fragment);
  }

  let homePosts = null;

  async function loadHomePosts() {
    if (!homePostList) return;
    try {
      const response = await fetch("blog/posts/home.json", { cache: "no-store" });
      if (!response.ok) {
        throw new Error("Unable to fetch home.json");
      }
      homePosts = await response.json();
      renderHomePosts(homePosts);
    } catch (error) {
      renderHomePostEmpty(getCopy().postFailed);
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
    if (homePosts) {
      renderHomePosts(homePosts);
    }
  }

  window.addEventListener("wk:language-change", rerender);

  if (window.__TRENDING_DATA__) {
    renderTrending(window.__TRENDING_DATA__);
  } else {
    loadFallback();
  }

  loadHomePosts();
})();
