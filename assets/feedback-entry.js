(function () {
  const feedbackEntries = Array.from(document.querySelectorAll("[data-feedback-entry]"));
  const feedbackCopies = Array.from(document.querySelectorAll("[data-feedback-copy]"));

  if (!feedbackEntries.length && !feedbackCopies.length) {
    return;
  }

  const copy = {
    zh: {
      entry: "反馈",
      backHome: "返回首页",
      pageTitle: "提交反馈",
      pageIntro: "这里是统一反馈入口。登录 GitHub 后，你可以把 Bug、功能建议或体验改进直接同步到仓库 Issue。",
      metaTitle: "反馈 | WK1995",
      metaDescription: "提交 Bug、Idea 或改进建议，并同步到 wk1995.github.io 的 GitHub Issues。"
    },
    en: {
      entry: "Feedback",
      backHome: "Back to home",
      pageTitle: "Submit feedback",
      pageIntro: "This is the dedicated feedback entry point. Sign in with GitHub, then send bugs, feature ideas, or UX improvements straight into repository issues.",
      metaTitle: "Feedback | WK1995",
      metaDescription: "Submit bugs, ideas, and improvements, then sync them into GitHub Issues for wk1995.github.io."
    }
  };

  function lang() {
    return window.WKSite && typeof window.WKSite.getLanguage === "function"
      ? window.WKSite.getLanguage()
      : (document.documentElement.lang || "").indexOf("zh") === 0
        ? "zh"
        : "en";
  }

  function text(key) {
    const messages = copy[lang()] || copy.zh;
    return messages[key] || copy.zh[key] || key;
  }

  function apply() {
    feedbackEntries.forEach(function (node) {
      node.textContent = text("entry");
      node.setAttribute("aria-label", text("entry"));
      node.setAttribute("title", text("entry"));
    });

    feedbackCopies.forEach(function (node) {
      const key = node.dataset.feedbackCopy;
      if (!key) {
        return;
      }
      node.textContent = text(key);
    });

    if (document.body && document.body.dataset.page === "feedbackPage") {
      document.title = text("metaTitle");
      const metaDescription = document.querySelector('meta[name="description"]');
      if (metaDescription) {
        metaDescription.setAttribute("content", text("metaDescription"));
      }
    }
  }

  apply();
  window.addEventListener("wk:language-change", apply);
})();
