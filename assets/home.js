(function () {
  const searchForm = document.getElementById("site-search-form");
  const searchInput = document.getElementById("site-search-input");
  const searchStatus = document.getElementById("site-search-status");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const motionTargets = Array.from(document.querySelectorAll("[data-count-to], [data-score-target], [data-meter-target]"));
  let currentSearchQuery = "";

  const copy = {
    zh: {
      locale: "zh-CN",
      searchFound: "找到 {count} 个结果，已定位到第一个。",
      searchNone: "没有找到匹配内容。",
      searchCleared: "已清除搜索高亮。",
    },
    en: {
      locale: "en-US",
      searchFound: "Found {count} matches and jumped to the first one.",
      searchNone: "No matching content was found.",
      searchCleared: "Search highlights cleared.",
    },
  };

  function getLanguage() {
    if (window.WKSite && typeof window.WKSite.getLanguage === "function") {
      return window.WKSite.getLanguage();
    }
    return document.documentElement.lang.startsWith("zh") ? "zh" : "en";
  }

  function t(key) {
    const language = getLanguage();
    return (copy[language] || copy.zh)[key];
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
        setSearchStatus(t("searchNone"));
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
      setSearchStatus(t("searchFound").replace("{count}", String(matches.length)));
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
        setSearchStatus(t("searchCleared"));
      }
    });
  }

  function formatScore(value) {
    if (typeof value !== "number" || Number.isNaN(value)) {
      return "--";
    }
    return value % 1 === 0 ? String(value) : value.toFixed(1);
  }

  function animateNumber(node, target, formatter) {
    if (!node || node.dataset.animated === "true") {
      return;
    }

    node.dataset.animated = "true";

    if (reducedMotion) {
      node.textContent = formatter(target);
      return;
    }

    const startedAt = performance.now();
    const duration = 1100;

    function tick(now) {
      const progress = Math.min((now - startedAt) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      node.textContent = formatter(target * eased);
      if (progress < 1) {
        requestAnimationFrame(tick);
      } else {
        node.textContent = formatter(target);
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
        return Math.round(value).toLocaleString(t("locale")) + suffix;
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
    if (!motionTargets.length) {
      return;
    }

    if (!("IntersectionObserver" in window) || reducedMotion) {
      motionTargets.forEach(startMotionFor);
      return;
    }

    const observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) {
            return;
          }
          startMotionFor(entry.target);
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.35 }
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
    if (currentSearchQuery) {
      runSearch(currentSearchQuery, { scroll: false, silent: false });
    }
  });
})();
