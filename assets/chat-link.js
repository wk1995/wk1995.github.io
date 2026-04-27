(function () {
  if (document.body.dataset.page === "chatPage") {
    return;
  }

  function currentLanguage() {
    if (window.WKSite && typeof window.WKSite.getLanguage === "function") {
      return window.WKSite.getLanguage();
    }

    return document.documentElement.lang.startsWith("zh") ? "zh" : "en";
  }

  function currentLabel() {
    return currentLanguage() === "zh"
      ? { text: "AI Chat", title: "打开 AI Chat 工作台" }
      : { text: "AI Chat", title: "Open AI Chat workspace" };
  }

  const link = document.createElement("a");
  link.className = "chat-launcher";
  link.href = "/chat/";
  link.innerHTML =
    '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M1.75 2A1.75 1.75 0 0 0 0 3.75v6.5C0 11.216.784 12 1.75 12h2.124l2.45 2.1a.75.75 0 0 0 1.226-.57V12h6.7A1.75 1.75 0 0 0 16 10.25v-6.5A1.75 1.75 0 0 0 14.25 2H1.75Zm1.5 3.25a.75.75 0 0 1 .75-.75h8a.75.75 0 0 1 0 1.5H4a.75.75 0 0 1-.75-.75Zm0 2.75A.75.75 0 0 1 4 7.25h5.5a.75.75 0 0 1 0 1.5H4A.75.75 0 0 1 3.25 8Z"></path></svg><span></span>';

  function applyLabel() {
    const label = currentLabel();
    const span = link.querySelector("span");
    if (span) {
      span.textContent = label.text;
    }
    link.setAttribute("aria-label", label.title);
    link.setAttribute("title", label.title);
  }

  applyLabel();
  window.addEventListener("wk:language-change", applyLabel);

  document.body.appendChild(link);
})();
