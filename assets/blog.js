(function () {
  const postList = document.querySelector("[data-blog-list]");
  const tagFilters = document.querySelector("[data-blog-tags]");
  const searchInput = document.querySelector("[data-blog-search]");
  const countNode = document.querySelector("[data-blog-count]");

  function normalize(value) {
    return String(value || "").trim().toLowerCase();
  }

  function formatDate(value) {
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

  function message(key, fallback) {
    return window.WKSite?.message?.(key) || fallback;
  }

  function createTagButton(tag, activeTag) {
    const button = document.createElement("button");
    button.className = "blog-filter-button";
    button.type = "button";
    button.textContent = tag;
    button.setAttribute("aria-pressed", String(tag === activeTag));
    button.addEventListener("click", () => {
      const params = new URLSearchParams(window.location.search);
      if (tag === activeTag) {
        params.delete("tag");
      } else {
        params.set("tag", tag);
      }
      updateUrl(params);
      renderCurrent();
    });
    return button;
  }

  function updateUrl(params) {
    const query = params.toString();
    const nextUrl = query ? `${window.location.pathname}?${query}` : window.location.pathname;
    window.history.replaceState({}, "", nextUrl);
  }

  function postMatches(post, query, tag) {
    const words = normalize(query).split(/\s+/).filter(Boolean);
    const haystack = normalize(`${post.title} ${post.summary} ${(post.tags || []).join(" ")} ${post.searchText}`);
    const tagMatch = !tag || (post.tags || []).includes(tag);
    return tagMatch && words.every((word) => haystack.includes(word));
  }

  function renderPosts(posts, query, tag) {
    if (!postList) return;
    const filtered = posts.filter((post) => postMatches(post, query, tag));
    if (countNode) {
      countNode.textContent = message("blog.count", "{visible} / {total} 篇文章")
        .replace("{visible}", filtered.length)
        .replace("{total}", posts.length);
    }
    if (!filtered.length) {
      postList.innerHTML = `<div class="blog-empty">${escapeHtml(message("blog.empty", "没有匹配的文章，换个关键词或标签试试。"))}</div>`;
      return;
    }

    postList.innerHTML = filtered.map((post) => `
      <article class="blog-card">
        <div class="blog-card-meta">
          <time datetime="${escapeHtml(post.date)}">${escapeHtml(formatDate(post.date))}</time>
          <span>${escapeHtml(post.source || "human")}</span>
        </div>
        <h2><a href="${escapeHtml(post.url)}">${escapeHtml(post.title)}</a></h2>
        <p>${escapeHtml(post.summary)}</p>
        <div class="blog-tags">
          ${(post.tags || []).map((item) => `<a class="blog-tag" href="/blog/?tag=${encodeURIComponent(item)}">${escapeHtml(item)}</a>`).join("")}
        </div>
        <a class="blog-read-more" href="${escapeHtml(post.url)}">${escapeHtml(message("blog.read", "阅读全文 →"))}</a>
      </article>
    `).join("");
  }

  function renderTags(posts, activeTag) {
    if (!tagFilters) return;
    const tags = [...new Set(posts.flatMap((post) => post.tags || []))].sort((a, b) => a.localeCompare(b));
    tagFilters.innerHTML = "";

    const all = document.createElement("button");
    all.className = "blog-filter-button";
    all.type = "button";
    all.textContent = message("blog.all", "全部");
    all.setAttribute("aria-pressed", String(!activeTag));
    all.addEventListener("click", () => {
      const params = new URLSearchParams(window.location.search);
      params.delete("tag");
      updateUrl(params);
      renderCurrent();
    });
    tagFilters.append(all, ...tags.map((tag) => createTagButton(tag, activeTag)));
  }

  let loadedPosts = [];

  function renderCurrent() {
    const params = new URLSearchParams(window.location.search);
    const query = params.get("q") || "";
    const tag = params.get("tag") || "";
    if (searchInput && searchInput.value !== query) {
      searchInput.value = query;
    }
    renderTags(loadedPosts, tag);
    renderPosts(loadedPosts, query, tag);
  }

  async function initIndex() {
    if (!postList) return;
    try {
      const response = await fetch("posts/index.json", { cache: "no-store" });
      loadedPosts = await response.json();
      renderCurrent();
      searchInput?.addEventListener("input", () => {
        const params = new URLSearchParams(window.location.search);
        const value = searchInput.value.trim();
        if (value) params.set("q", value);
        else params.delete("q");
        updateUrl(params);
        renderCurrent();
      });
    } catch (error) {
      postList.innerHTML = `<div class="blog-empty">${escapeHtml(message("blog.error", "文章索引加载失败，请稍后重试。"))}</div>`;
    }
  }

  function initComments() {
    const target = document.querySelector("[data-blog-comments]");
    const config = window.WK_BLOG_COMMENTS;
    if (!target || !config || target.dataset.provider !== "giscus") return;
    const script = document.createElement("script");
    script.src = "https://giscus.app/client.js";
    script.async = true;
    script.crossOrigin = "anonymous";
    Object.entries(config).forEach(([key, value]) => {
      script.setAttribute(`data-${key}`, value);
    });
    target.append(script);
  }

  function initArticleInteractions() {
    const comments = document.querySelector("[data-blog-comments]");
    const status = document.querySelector("[data-blog-comments-status]");
    const actions = document.querySelectorAll("[data-blog-action]");
    if (!actions.length) return;

    function showFallback(action) {
      if (!comments || !status) return;
      const isLike = action === "like";
      status.classList.add("is-active");
      status.innerHTML = isLike
        ? '点赞能力需要先配置 Giscus，并在 GitHub Discussions 中开启 reactions。当前只是静态预览入口，还没有连接真实讨论串。'
        : '评论能力需要先配置 Giscus。配置 <code>window.WK_BLOG_COMMENTS</code> 后，这里会加载 GitHub 登录评论区。';
      comments.scrollIntoView({ behavior: "smooth", block: "start" });
    }

    actions.forEach((actionButton) => {
      actionButton.addEventListener("click", () => {
        if (!window.WK_BLOG_COMMENTS) {
          showFallback(actionButton.dataset.blogAction);
          return;
        }
        comments?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    });
  }

  initIndex();
  initComments();
  initArticleInteractions();
  window.addEventListener("wk:language-change", renderCurrent);
})();
