(function () {
  const ISSUE_URL = "https://github.com/wk1995/wk1995.github.io/issues/new";
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
      pageIntro: "这里是统一反馈入口。点击按钮会直接打开 GitHub 新建 Issue 页面，不需要在站点内登录。",
      openIssue: "打开 GitHub Issue",
      metaTitle: "反馈 | WK1995",
      metaDescription: "提交 Bug、Idea 或改进建议到 wk1995.github.io 的 GitHub Issues。"
    },
    en: {
      entry: "Feedback",
      backHome: "Back to home",
      pageTitle: "Submit feedback",
      pageIntro: "This is the dedicated feedback entry point. The button opens a new GitHub issue directly, with no site-level GitHub login required.",
      openIssue: "Open GitHub issue",
      metaTitle: "Feedback | WK1995",
      metaDescription: "Submit bugs, ideas, and improvements to GitHub Issues for wk1995.github.io."
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
      node.setAttribute("href", ISSUE_URL);
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
