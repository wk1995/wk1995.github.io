(function () {
  const slots = Array.from(document.querySelectorAll("[data-github-auth-slot]"));
  const pageRoots = Array.from(document.querySelectorAll("[data-github-feedback-page]"));
  if (!slots.length && !pageRoots.length) {
    return;
  }

  const AUTH_STORAGE_KEY = "wk1995-github-auth-state";
  const AUTH_CALLBACK_SOURCE = "wk1995-github-auth-callback";
  const AUTH_DIALOG_ID = "github-auth-dialog";
  const GITHUB_USER_API = "https://api.github.com/user";

  const copy = {
    zh: {
      login: "GitHub 登录",
      logout: "退出",
      feedback: "反馈",
      feedbackTitle: "提交反馈",
      feedbackBody: "使用 GitHub 账号把 Bug 或 Idea 同步到仓库 Issue。",
      feedbackType: "反馈类型",
      feedbackBug: "Bug",
      feedbackIdea: "Idea",
      feedbackTitleLabel: "标题",
      feedbackTitlePlaceholder: "例如：聊天页设置抽屉在移动端遮挡输入区",
      feedbackDetailLabel: "详细说明",
      feedbackDetailPlaceholder: "描述问题复现步骤、期望行为，或者你的功能想法。",
      feedbackSubmit: "提交到 Issue",
      close: "关闭",
      cancel: "取消",
      profile: "打开 GitHub 主页",
      configTitle: "需要补充 GitHub OAuth 配置",
      configBody: "这个站点已经接入了 GitHub 登录 UI，但 GitHub Pages 不能安全保存 client secret。请先在 assets/github-auth-config.js 里填写 clientId 和 exchangeUrl，再继续登录。",
      configStepsTitle: "exchangeUrl 需要提供：",
      configStepOne: "接收 code、codeVerifier、redirectUri、clientId",
      configStepTwo: "服务端使用 GitHub OAuth app 的 client secret 调用 access_token 交换接口",
      configStepThree: "返回 access_token、scope、token_type JSON",
      loginPendingTitle: "等待 GitHub 授权",
      loginPendingBody: "GitHub 授权窗口已经打开。授权完成后，这里会自动继续。",
      loginBlockedTitle: "浏览器拦截了登录窗口",
      loginBlockedBody: "请允许当前页面弹出 GitHub 登录窗口后重试。",
      loginFailedTitle: "GitHub 登录失败",
      loginClosed: "GitHub 授权窗口已关闭。",
      loginStateMismatch: "GitHub 回调状态不匹配，请重新登录。",
      loginCodeMissing: "GitHub 回调缺少授权 code。",
      loginCryptoMissing: "当前浏览器不支持 PKCE 登录流程。",
      loginExchangeFailed: "GitHub token 交换失败",
      loginUserFailed: "无法读取当前 GitHub 用户信息。",
      loginSuccessTitle: "登录成功",
      loginSuccessBody: "现在你可以通过 GitHub 账号提交 Bug 或 Idea 反馈。",
      logoutSuccessTitle: "已退出登录",
      logoutSuccessBody: "当前页面已经回到游客状态。",
      feedbackValidationTitle: "请补全反馈内容",
      feedbackValidationBody: "标题和详细说明都不能为空。",
      feedbackSubmitTitle: "正在提交反馈",
      feedbackSubmitBody: "正在把反馈同步到 GitHub Issues。",
      feedbackSuccessTitle: "反馈已创建",
      feedbackSuccessBody: "Issue 已经创建成功，你可以直接打开查看。",
      feedbackOpenIssue: "打开 Issue",
      feedbackFailedTitle: "提交反馈失败",
      feedbackAuthExpired: "GitHub 登录状态已失效，请重新登录后再提交反馈。",
      feedbackPageStatusLabel: "GitHub 连接",
      feedbackPageStatusTitle: "连接 GitHub 账号",
      feedbackPageGuestBody: "登录后，反馈会直接创建到仓库公开 Issue。",
      feedbackPageSignedInBody: "当前已经连接 GitHub，提交后会在仓库中创建公开 Issue。",
      feedbackPageSignedInAs: "当前账号",
      feedbackPageFormTitle: "反馈内容",
      feedbackPageFormReady: "描述问题现象、复现步骤，或者告诉我你希望新增的能力。",
      feedbackPageFormLocked: "请先登录 GitHub，再填写反馈并同步到仓库 Issue。",
      feedbackPagePublicNote: "仓库 Issue 默认公开可见，请不要提交敏感信息。",
      feedbackPageSuccessBody: "反馈已经同步到仓库，你可以直接打开 Issue 查看。",
      modalClose: "关闭对话框"
    },
    en: {
      login: "GitHub Login",
      logout: "Logout",
      feedback: "Feedback",
      feedbackTitle: "Submit feedback",
      feedbackBody: "Use your GitHub account to sync a bug or idea into repository issues.",
      feedbackType: "Feedback type",
      feedbackBug: "Bug",
      feedbackIdea: "Idea",
      feedbackTitleLabel: "Title",
      feedbackTitlePlaceholder: "For example: The settings drawer overlaps the composer on mobile",
      feedbackDetailLabel: "Details",
      feedbackDetailPlaceholder: "Describe repro steps, expected behavior, or your product idea.",
      feedbackSubmit: "Create issue",
      close: "Close",
      cancel: "Cancel",
      profile: "Open GitHub profile",
      configTitle: "GitHub OAuth config is required",
      configBody: "The GitHub login UI is wired up, but GitHub Pages cannot safely store a client secret. Fill clientId and exchangeUrl in assets/github-auth-config.js before signing in.",
      configStepsTitle: "The exchangeUrl endpoint should:",
      configStepOne: "Accept code, codeVerifier, redirectUri, and clientId",
      configStepTwo: "Use the GitHub OAuth app client secret on the server to exchange the code for an access token",
      configStepThree: "Return JSON with access_token, scope, and token_type",
      loginPendingTitle: "Waiting for GitHub authorization",
      loginPendingBody: "The GitHub authorization window is open. This page will continue automatically after approval.",
      loginBlockedTitle: "The login window was blocked",
      loginBlockedBody: "Allow popups for this page, then try GitHub login again.",
      loginFailedTitle: "GitHub login failed",
      loginClosed: "The GitHub authorization window was closed.",
      loginStateMismatch: "The GitHub callback state did not match. Please try again.",
      loginCodeMissing: "The GitHub callback did not include an authorization code.",
      loginCryptoMissing: "This browser does not support the PKCE login flow.",
      loginExchangeFailed: "Failed to exchange the GitHub authorization code.",
      loginUserFailed: "Failed to fetch the authenticated GitHub user.",
      loginSuccessTitle: "Signed in",
      loginSuccessBody: "You can now submit bugs and ideas through your GitHub account.",
      logoutSuccessTitle: "Signed out",
      logoutSuccessBody: "The page has returned to guest mode.",
      feedbackValidationTitle: "Complete the feedback form",
      feedbackValidationBody: "Both the title and details are required.",
      feedbackSubmitTitle: "Submitting feedback",
      feedbackSubmitBody: "Syncing your feedback into GitHub issues.",
      feedbackSuccessTitle: "Feedback created",
      feedbackSuccessBody: "The issue has been created successfully.",
      feedbackOpenIssue: "Open issue",
      feedbackFailedTitle: "Feedback submission failed",
      feedbackAuthExpired: "Your GitHub login has expired. Sign in again before submitting feedback.",
      feedbackPageStatusLabel: "GitHub",
      feedbackPageStatusTitle: "Connect your GitHub account",
      feedbackPageGuestBody: "Sign in first, then your feedback will be created as a public repository issue.",
      feedbackPageSignedInBody: "GitHub is connected. Submitting this form will create a public issue in the repository.",
      feedbackPageSignedInAs: "Signed in as",
      feedbackPageFormTitle: "Feedback details",
      feedbackPageFormReady: "Describe the bug, repro steps, or the capability you want to add.",
      feedbackPageFormLocked: "Sign in with GitHub before filling out the form and syncing it into repository issues.",
      feedbackPagePublicNote: "Repository issues are public by default. Do not submit sensitive information.",
      feedbackPageSuccessBody: "Your feedback has been synced to the repository. You can open the issue directly.",
      modalClose: "Close dialog"
    }
  };

  const state = {
    auth: loadAuthState(),
    busy: false,
    dialog: null,
    shell: null,
    pendingLogin: null,
    pageFeedback: {
      draft: initialFeedbackDraft(),
      submitting: false,
      error: "",
      successHref: ""
    }
  };

  const config = normalizeConfig(window.WKGitHubAuthConfig || {});

  function normalizeConfig(raw) {
    const scopes = Array.isArray(raw.scopes) ? raw.scopes.filter(Boolean) : [];
    return {
      clientId: typeof raw.clientId === "string" ? raw.clientId.trim() : "",
      exchangeUrl: typeof raw.exchangeUrl === "string" ? raw.exchangeUrl.trim() : "",
      owner: typeof raw.owner === "string" && raw.owner.trim() ? raw.owner.trim() : "wk1995",
      repo: typeof raw.repo === "string" && raw.repo.trim() ? raw.repo.trim() : "wk1995.github.io",
      scopes: scopes.length ? scopes : ["public_repo", "read:user"]
    };
  }

  function lang() {
    return window.WKSite && typeof window.WKSite.getLanguage === "function"
      ? window.WKSite.getLanguage()
      : (document.documentElement.lang || "").indexOf("zh") === 0
        ? "zh"
        : "en";
  }

  function t(key) {
    return (copy[lang()] && copy[lang()][key]) || copy.zh[key] || key;
  }

  function loadAuthState() {
    try {
      const raw = JSON.parse(localStorage.getItem(AUTH_STORAGE_KEY) || "{}");
      return {
        token: typeof raw.token === "string" ? raw.token : "",
        scope: typeof raw.scope === "string" ? raw.scope : "",
        tokenType: typeof raw.tokenType === "string" ? raw.tokenType : "bearer",
        checkedAt: Number(raw.checkedAt) || 0,
        user: normalizeUser(raw.user || null)
      };
    } catch (error) {
      return emptyAuthState();
    }
  }

  function emptyAuthState() {
    return {
      token: "",
      scope: "",
      tokenType: "bearer",
      checkedAt: 0,
      user: null
    };
  }

  function normalizeUser(user) {
    if (!user || typeof user !== "object") {
      return null;
    }
    if (!user.id || !user.login) {
      return null;
    }
    return {
      id: user.id,
      login: String(user.login),
      name: typeof user.name === "string" ? user.name : "",
      avatarUrl: typeof user.avatarUrl === "string"
        ? user.avatarUrl
        : typeof user.avatar_url === "string"
          ? user.avatar_url
          : "",
      htmlUrl: typeof user.htmlUrl === "string"
        ? user.htmlUrl
        : typeof user.html_url === "string"
          ? user.html_url
          : "https://github.com/" + user.login
    };
  }

  function saveAuthState() {
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(state.auth));
  }

  function clearAuthState() {
    state.auth = emptyAuthState();
    localStorage.removeItem(AUTH_STORAGE_KEY);
    emitAuthChange();
    renderAll();
  }

  function emitAuthChange() {
    window.dispatchEvent(new CustomEvent("wk:github-auth-change", {
      detail: {
        authenticated: isAuthenticated(),
        user: state.auth.user
      }
    }));
  }

  function isAuthenticated() {
    return Boolean(state.auth.token && state.auth.user && state.auth.user.id);
  }

  function callbackUrl() {
    return new URL("/auth/callback/", window.location.origin).toString();
  }

  function feedbackSourceUrl() {
    if (document.body && document.body.dataset.page === "feedbackPage" && document.referrer) {
      try {
        const referrer = new URL(document.referrer);
        if (referrer.origin === window.location.origin) {
          return referrer.toString();
        }
      } catch (error) {
        // Ignore invalid referrers and fall back to the current page.
      }
    }
    return window.location.href;
  }

  function toBase64Url(bytes) {
    let value = "";
    bytes.forEach(function (part) {
      value += String.fromCharCode(part);
    });
    return btoa(value).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
  }

  async function createPkcePair() {
    if (!window.crypto || !window.crypto.getRandomValues || !window.crypto.subtle || !window.TextEncoder) {
      throw new Error(t("loginCryptoMissing"));
    }

    const verifierBytes = new Uint8Array(32);
    window.crypto.getRandomValues(verifierBytes);
    const verifier = toBase64Url(verifierBytes);
    const challengeBuffer = await window.crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier));
    const challenge = toBase64Url(new Uint8Array(challengeBuffer));

    return { verifier: verifier, challenge: challenge };
  }

  function randomState() {
    const value = new Uint8Array(18);
    window.crypto.getRandomValues(value);
    return toBase64Url(value);
  }

  function issueEndpoint() {
    return "https://api.github.com/repos/" + encodeURIComponent(config.owner) + "/" + encodeURIComponent(config.repo) + "/issues";
  }

  function authHeaders(token) {
    return {
      "Accept": "application/vnd.github+json",
      "Authorization": "Bearer " + token
    };
  }

  async function fetchCurrentUser(token) {
    const response = await fetch(GITHUB_USER_API, {
      headers: authHeaders(token)
    });

    if (!response.ok) {
      const error = await parseError(response);
      const message = error ? t("loginUserFailed") + " " + error : t("loginUserFailed");
      const err = new Error(message);
      err.status = response.status;
      throw err;
    }

    return normalizeUser(await response.json());
  }

  async function parseError(response) {
    try {
      const data = await response.json();
      if (data && typeof data.error_description === "string" && data.error_description) {
        return data.error_description;
      }
      if (data && typeof data.message === "string" && data.message) {
        return data.message;
      }
      if (data && typeof data.error === "string" && data.error) {
        return data.error;
      }
    } catch (error) {
      return "";
    }
    return "";
  }

  async function exchangeCode(payload) {
    const url = new URL(config.exchangeUrl, window.location.origin).toString();
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const error = await parseError(response);
      const message = error ? t("loginExchangeFailed") + " " + error : t("loginExchangeFailed");
      const err = new Error(message);
      err.status = response.status;
      throw err;
    }

    const data = await response.json();
    if (!data || typeof data.access_token !== "string" || !data.access_token) {
      throw new Error(t("loginExchangeFailed"));
    }

    return {
      accessToken: data.access_token,
      scope: typeof data.scope === "string" ? data.scope : "",
      tokenType: typeof data.token_type === "string" ? data.token_type : "bearer"
    };
  }

  function openPopup() {
    return window.open("", "wk1995_github_login", "popup=yes,width=560,height=760");
  }

  function popupPromise(popup, expectedState) {
    return new Promise(function (resolve, reject) {
      function cleanup() {
        window.removeEventListener("message", onMessage);
        window.clearInterval(intervalId);
        if (state.pendingLogin && state.pendingLogin.cleanup === cleanup) {
          state.pendingLogin = null;
        }
      }

      function finishError(error) {
        cleanup();
        reject(error);
      }

      function onMessage(event) {
        if (event.origin !== window.location.origin) {
          return;
        }

        const data = event.data || {};
        if (data.source !== AUTH_CALLBACK_SOURCE) {
          return;
        }

        if (popup && !popup.closed) {
          popup.close();
        }

        if (data.error) {
          finishError(new Error(data.error_description || data.error));
          return;
        }

        if (!data.state || data.state !== expectedState) {
          finishError(new Error(t("loginStateMismatch")));
          return;
        }

        if (!data.code) {
          finishError(new Error(t("loginCodeMissing")));
          return;
        }

        cleanup();
        resolve(data.code);
      }

      const intervalId = window.setInterval(function () {
        if (popup && popup.closed) {
          finishError(new Error(t("loginClosed")));
        }
      }, 500);

      state.pendingLogin = {
        popup: popup,
        cleanup: cleanup,
        reject: reject
      };

      window.addEventListener("message", onMessage);
    });
  }

  function cancelPendingLogin() {
    if (!state.pendingLogin) {
      return;
    }

    const pending = state.pendingLogin;
    if (pending.popup && !pending.popup.closed) {
      pending.popup.close();
    }
    if (typeof pending.cleanup === "function") {
      pending.cleanup();
    }
    if (typeof pending.reject === "function") {
      const error = new Error(t("loginClosed"));
      error.isCancelled = true;
      pending.reject(error);
    }
  }

  async function startLogin() {
    if (state.busy) {
      return;
    }

    if (!config.clientId || !config.exchangeUrl) {
      openConfigDialog();
      return;
    }

    const popup = openPopup();
    if (!popup) {
      openMessageDialog({
        title: t("loginBlockedTitle"),
        body: t("loginBlockedBody")
      });
      return;
    }

    state.busy = true;
    openLoginPendingDialog();
    renderAll();

    try {
      const pkce = await createPkcePair();
      const redirectUri = callbackUrl();
      const stateValue = randomState();
      const query = new URLSearchParams({
        client_id: config.clientId,
        redirect_uri: redirectUri,
        scope: config.scopes.join(" "),
        state: stateValue,
        code_challenge: pkce.challenge,
        code_challenge_method: "S256",
        prompt: "select_account"
      });

      popup.location = "https://github.com/login/oauth/authorize?" + query.toString();
      const code = await popupPromise(popup, stateValue);
      const token = await exchangeCode({
        clientId: config.clientId,
        code: code,
        codeVerifier: pkce.verifier,
        redirectUri: redirectUri
      });
      const user = await fetchCurrentUser(token.accessToken);

      state.auth = {
        token: token.accessToken,
        scope: token.scope,
        tokenType: token.tokenType,
        checkedAt: Date.now(),
        user: user
      };
      saveAuthState();
      emitAuthChange();
      openMessageDialog({
        title: t("loginSuccessTitle"),
        body: t("loginSuccessBody")
      });
    } catch (error) {
      if (!error || !error.isCancelled) {
        openMessageDialog({
          title: t("loginFailedTitle"),
          body: error && error.message ? error.message : t("loginExchangeFailed")
        });
      }
    } finally {
      state.busy = false;
      renderAll();
    }
  }

  function logout() {
    cancelPendingLogin();
    clearAuthState();
    openMessageDialog({
      title: t("logoutSuccessTitle"),
      body: t("logoutSuccessBody")
    });
  }

  function initialFeedbackDraft() {
    return {
      type: "bug",
      title: "",
      details: ""
    };
  }

  function openFeedbackDialog() {
    state.dialog = {
      type: "feedback",
      draft: initialFeedbackDraft(),
      submitting: false,
      error: ""
    };
    renderDialog();
  }

  function openConfigDialog() {
    state.dialog = {
      type: "config"
    };
    renderDialog();
  }

  function openLoginPendingDialog() {
    state.dialog = {
      type: "login"
    };
    renderDialog();
  }

  function openMessageDialog(options) {
    state.dialog = {
      type: "message",
      title: options.title,
      body: options.body,
      href: options.href || ""
    };
    renderDialog();
  }

  function closeDialog() {
    if (state.dialog && state.dialog.type === "login" && state.pendingLogin) {
      cancelPendingLogin();
    }
    state.dialog = null;
    renderDialog();
  }

  function createElement(tag, className, text) {
    const element = document.createElement(tag);
    if (className) {
      element.className = className;
    }
    if (typeof text === "string") {
      element.textContent = text;
    }
    return element;
  }

  function ensureDialogShell() {
    if (state.shell) {
      return state.shell;
    }

    const overlay = createElement("div", "github-auth-overlay");
    const modal = createElement("div", "github-auth-modal");
    overlay.hidden = true;
    modal.hidden = true;
    modal.id = AUTH_DIALOG_ID;
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");
    modal.setAttribute("aria-labelledby", "github-auth-dialog-title");

    const card = createElement("div", "github-auth-card");
    const head = createElement("div", "github-auth-card-head");
    const headCopy = createElement("div", "github-auth-card-copy");
    const title = createElement("h2", "github-auth-card-title");
    title.id = "github-auth-dialog-title";
    const subtitle = createElement("p", "github-auth-card-subtitle");
    const closeButton = createElement("button", "github-auth-icon-button");
    closeButton.type = "button";
    closeButton.setAttribute("aria-label", t("modalClose"));
    closeButton.innerHTML = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3.72 3.72a.75.75 0 0 1 1.06 0L8 6.94l3.22-3.22a.75.75 0 1 1 1.06 1.06L9.06 8l3.22 3.22a.75.75 0 1 1-1.06 1.06L8 9.06l-3.22 3.22a.75.75 0 1 1-1.06-1.06L6.94 8 3.72 4.78a.75.75 0 0 1 0-1.06Z"></path></svg>';
    closeButton.addEventListener("click", closeDialog);
    headCopy.append(title, subtitle);
    head.append(headCopy, closeButton);

    const body = createElement("div", "github-auth-card-body");

    card.append(head, body);
    modal.appendChild(card);
    document.body.append(overlay, modal);

    overlay.addEventListener("click", closeDialog);
    window.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && state.dialog) {
        closeDialog();
      }
    });

    state.shell = {
      overlay: overlay,
      modal: modal,
      title: title,
      subtitle: subtitle,
      body: body,
      closeButton: closeButton
    };

    return state.shell;
  }

  function buildList(items) {
    const list = createElement("ol", "github-auth-list");
    items.forEach(function (item) {
      list.appendChild(createElement("li", "", item));
    });
    return list;
  }

  function buildActionRow() {
    return createElement("div", "github-auth-actions");
  }

  function buildSecondaryButton(text, handler) {
    const button = createElement("button", "github-auth-button github-auth-button-secondary", text);
    button.type = "button";
    button.addEventListener("click", handler);
    return button;
  }

  function buildPrimaryButton(text, handler) {
    const button = createElement("button", "github-auth-button github-auth-button-primary", text);
    button.type = "button";
    button.addEventListener("click", handler);
    return button;
  }

  function renderDialog() {
    const dialog = state.dialog;

    if (!dialog) {
      if (!state.shell) {
        return;
      }
      const shell = state.shell;
      shell.overlay.hidden = true;
      shell.modal.hidden = true;
      document.body.classList.remove("github-auth-modal-open");
      return;
    }

    const shell = ensureDialogShell();
    shell.overlay.hidden = false;
    shell.modal.hidden = false;
    document.body.classList.add("github-auth-modal-open");
    shell.closeButton.setAttribute("aria-label", t("modalClose"));
    shell.body.innerHTML = "";

    if (dialog.type === "config") {
      shell.title.textContent = t("configTitle");
      shell.subtitle.textContent = t("configBody");
      shell.body.appendChild(buildList([
        t("configStepOne"),
        t("configStepTwo"),
        t("configStepThree")
      ]));
      const actions = buildActionRow();
      actions.appendChild(buildSecondaryButton(t("close"), closeDialog));
      shell.body.appendChild(actions);
      return;
    }

    if (dialog.type === "login") {
      shell.title.textContent = t("loginPendingTitle");
      shell.subtitle.textContent = t("loginPendingBody");
      const actions = buildActionRow();
      actions.appendChild(buildSecondaryButton(t("cancel"), function () {
        cancelPendingLogin();
        closeDialog();
      }));
      shell.body.appendChild(actions);
      return;
    }

    if (dialog.type === "feedback") {
      shell.title.textContent = t("feedbackTitle");
      shell.subtitle.textContent = t("feedbackBody");

      const draft = dialog.draft || initialFeedbackDraft();
      const form = createElement("form", "github-auth-form");
      form.addEventListener("submit", function (event) {
        event.preventDefault();
        submitFeedback();
      });

      const typeLabel = createElement("label", "github-auth-field");
      typeLabel.appendChild(createElement("span", "github-auth-field-label", t("feedbackType")));
      const typeSelect = document.createElement("select");
      typeSelect.className = "github-auth-select";
      [
        { value: "bug", label: t("feedbackBug") },
        { value: "idea", label: t("feedbackIdea") }
      ].forEach(function (item) {
        const option = document.createElement("option");
        option.value = item.value;
        option.textContent = item.label;
        option.selected = draft.type === item.value;
        typeSelect.appendChild(option);
      });
      typeSelect.addEventListener("change", function () {
        dialog.draft.type = typeSelect.value;
      });
      typeLabel.appendChild(typeSelect);

      const titleLabel = createElement("label", "github-auth-field");
      titleLabel.appendChild(createElement("span", "github-auth-field-label", t("feedbackTitleLabel")));
      const titleInput = document.createElement("input");
      titleInput.className = "github-auth-input";
      titleInput.type = "text";
      titleInput.value = draft.title;
      titleInput.placeholder = t("feedbackTitlePlaceholder");
      titleInput.addEventListener("input", function () {
        dialog.draft.title = titleInput.value;
      });
      titleLabel.appendChild(titleInput);

      const detailLabel = createElement("label", "github-auth-field");
      detailLabel.appendChild(createElement("span", "github-auth-field-label", t("feedbackDetailLabel")));
      const detailInput = document.createElement("textarea");
      detailInput.className = "github-auth-textarea";
      detailInput.rows = 7;
      detailInput.value = draft.details;
      detailInput.placeholder = t("feedbackDetailPlaceholder");
      detailInput.addEventListener("input", function () {
        dialog.draft.details = detailInput.value;
      });
      detailLabel.appendChild(detailInput);

      form.append(typeLabel, titleLabel, detailLabel);

      if (dialog.error) {
        form.appendChild(createElement("p", "github-auth-error", dialog.error));
      }

      const actions = buildActionRow();
      const cancel = buildSecondaryButton(t("cancel"), closeDialog);
      const submit = buildPrimaryButton(t("feedbackSubmit"), function () {
        form.requestSubmit();
      });
      submit.disabled = Boolean(dialog.submitting);
      cancel.disabled = Boolean(dialog.submitting);
      actions.append(cancel, submit);
      form.appendChild(actions);

      shell.body.appendChild(form);
      return;
    }

    shell.title.textContent = dialog.title || "";
    shell.subtitle.textContent = dialog.body || "";
    const actions = buildActionRow();
    if (dialog.href) {
      const link = createElement("a", "github-auth-button github-auth-button-primary", t("feedbackOpenIssue"));
      link.href = dialog.href;
      link.target = "_blank";
      link.rel = "noopener";
      actions.appendChild(link);
    }
    actions.appendChild(buildSecondaryButton(t("close"), closeDialog));
    shell.body.appendChild(actions);
  }

  function buildIssueTitle(type, title) {
    return "[" + (type === "idea" ? "Idea" : "Bug") + "] " + title.trim();
  }

  function buildIssueBody(draft) {
    const lines = [
      "## Type",
      draft.type === "idea" ? "Idea" : "Bug",
      "",
      "## Reporter",
      state.auth.user ? "@" + state.auth.user.login : "Unknown",
      "",
      "## Source Page",
      feedbackSourceUrl(),
      "",
      "## Submitted At",
      new Date().toISOString(),
      "",
      "## Details",
      draft.details.trim()
    ];
    return lines.join("\n");
  }

  async function createIssue(draft) {
    const response = await fetch(issueEndpoint(), {
      method: "POST",
      headers: Object.assign({}, authHeaders(state.auth.token), {
        "Content-Type": "application/json"
      }),
      body: JSON.stringify({
        title: buildIssueTitle(draft.type, draft.title),
        body: buildIssueBody(draft)
      })
    });

    if (response.status === 401) {
      clearAuthState();
      throw new Error(t("feedbackAuthExpired"));
    }

    if (!response.ok) {
      const error = await parseError(response);
      throw new Error(error || t("feedbackFailedTitle"));
    }

    return response.json();
  }

  async function submitFeedback() {
    if (!isAuthenticated()) {
      openMessageDialog({
        title: t("feedbackFailedTitle"),
        body: t("feedbackAuthExpired")
      });
      return;
    }

    const dialog = state.dialog;
    if (!dialog || dialog.type !== "feedback") {
      return;
    }

    const draft = dialog.draft || initialFeedbackDraft();
    if (!draft.title.trim() || !draft.details.trim()) {
      dialog.error = t("feedbackValidationBody");
      renderDialog();
      return;
    }

    dialog.submitting = true;
    dialog.error = "";
    renderDialog();

    try {
      const data = await createIssue(draft);
      openMessageDialog({
        title: t("feedbackSuccessTitle"),
        body: t("feedbackSuccessBody"),
        href: typeof data.html_url === "string" ? data.html_url : ""
      });
    } catch (error) {
      dialog.submitting = false;
      dialog.error = error && error.message ? error.message : t("feedbackFailedTitle");
      renderDialog();
    }
  }

  async function submitPageFeedback() {
    if (!isAuthenticated()) {
      openMessageDialog({
        title: t("feedbackFailedTitle"),
        body: t("feedbackAuthExpired")
      });
      return;
    }

    const draft = state.pageFeedback.draft;
    if (!draft.title.trim() || !draft.details.trim()) {
      state.pageFeedback.error = t("feedbackValidationBody");
      renderAll();
      return;
    }

    state.pageFeedback.submitting = true;
    state.pageFeedback.error = "";
    state.pageFeedback.successHref = "";
    renderAll();

    try {
      const data = await createIssue(draft);
      state.pageFeedback.draft = initialFeedbackDraft();
      state.pageFeedback.submitting = false;
      state.pageFeedback.error = "";
      state.pageFeedback.successHref = typeof data.html_url === "string" ? data.html_url : "";
      renderAll();
    } catch (error) {
      state.pageFeedback.submitting = false;
      state.pageFeedback.error = error && error.message ? error.message : t("feedbackFailedTitle");
      renderAll();
    }
  }

  function buildSlotButton(text, className, handler) {
    const button = createElement("button", className, text);
    button.type = "button";
    button.disabled = state.busy;
    button.addEventListener("click", handler);
    return button;
  }

  function buildProfileLink() {
    const profile = createElement("a", "github-auth-profile");
    profile.href = state.auth.user.htmlUrl;
    profile.target = "_blank";
    profile.rel = "noopener";
    profile.setAttribute("aria-label", t("profile"));

    if (state.auth.user.avatarUrl) {
      const avatar = document.createElement("img");
      avatar.src = state.auth.user.avatarUrl;
      avatar.alt = state.auth.user.login;
      profile.appendChild(avatar);
    } else {
      profile.appendChild(createElement("span", "github-auth-avatar-fallback", state.auth.user.login.slice(0, 1).toUpperCase()));
    }

    profile.appendChild(createElement("span", "github-auth-profile-name", state.auth.user.login));
    return profile;
  }

  function renderSlot(slot) {
    slot.innerHTML = "";
    const actions = createElement("div", "github-auth-actions-inline");

    if (!isAuthenticated()) {
      actions.appendChild(buildSlotButton(
        t("login"),
        "github-auth-button github-auth-button-primary github-auth-slot-button",
        startLogin
      ));
      slot.appendChild(actions);
      return;
    }

    actions.appendChild(buildProfileLink());
    actions.appendChild(buildSlotButton(
      t("logout"),
      "github-auth-button github-auth-button-ghost github-auth-slot-button",
      logout
    ));
    slot.appendChild(actions);
  }

  function renderFeedbackPage(root) {
    root.innerHTML = "";

    const shell = createElement("div", "feedback-page-shell");

    const statusPanel = createElement("section", "feedback-page-panel feedback-page-status");
    const statusCopy = createElement("div", "feedback-page-status-copy");
    statusCopy.appendChild(createElement("span", "feedback-page-kicker", t("feedbackPageStatusLabel")));
    statusCopy.appendChild(createElement("h2", "feedback-page-title", t("feedbackPageStatusTitle")));
    statusCopy.appendChild(createElement(
      "p",
      "feedback-page-copy",
      isAuthenticated() ? t("feedbackPageSignedInBody") : t("feedbackPageGuestBody")
    ));
    if (isAuthenticated()) {
      statusCopy.appendChild(createElement(
        "p",
        "feedback-page-note",
        t("feedbackPageSignedInAs") + " @" + state.auth.user.login
      ));
    }
    statusCopy.appendChild(createElement("p", "feedback-page-note", t("feedbackPagePublicNote")));

    const statusActions = createElement("div", "feedback-page-actions");
    if (isAuthenticated()) {
      statusActions.appendChild(buildProfileLink());
      statusActions.appendChild(buildSecondaryButton(t("logout"), logout));
    } else {
      statusActions.appendChild(buildPrimaryButton(t("login"), startLogin));
    }

    statusPanel.append(statusCopy, statusActions);
    shell.appendChild(statusPanel);

    const formPanel = createElement("section", "feedback-page-panel");
    formPanel.appendChild(createElement("span", "feedback-page-kicker", t("feedback")));
    formPanel.appendChild(createElement("h2", "feedback-page-title", t("feedbackPageFormTitle")));
    formPanel.appendChild(createElement(
      "p",
      "feedback-page-copy",
      isAuthenticated() ? t("feedbackPageFormReady") : t("feedbackPageFormLocked")
    ));

    if (isAuthenticated() && state.pageFeedback.successHref) {
      const success = createElement("div", "feedback-page-success");
      success.appendChild(createElement("strong", "", t("feedbackSuccessTitle")));
      success.appendChild(createElement("p", "", t("feedbackPageSuccessBody")));
      const successActions = createElement("div", "feedback-page-actions");
      const issueLink = createElement("a", "github-auth-button github-auth-button-primary", t("feedbackOpenIssue"));
      issueLink.href = state.pageFeedback.successHref;
      issueLink.target = "_blank";
      issueLink.rel = "noopener";
      successActions.appendChild(issueLink);
      success.appendChild(successActions);
      formPanel.appendChild(success);
    }

    if (!isAuthenticated()) {
      shell.appendChild(formPanel);
      root.appendChild(shell);
      return;
    }

    const draft = state.pageFeedback.draft;
    const form = createElement("form", "github-auth-form");
    form.addEventListener("submit", function (event) {
      event.preventDefault();
      submitPageFeedback();
    });

    const typeLabel = createElement("label", "github-auth-field");
    typeLabel.appendChild(createElement("span", "github-auth-field-label", t("feedbackType")));
    const typeSelect = document.createElement("select");
    typeSelect.className = "github-auth-select";
    [
      { value: "bug", label: t("feedbackBug") },
      { value: "idea", label: t("feedbackIdea") }
    ].forEach(function (item) {
      const option = document.createElement("option");
      option.value = item.value;
      option.textContent = item.label;
      option.selected = draft.type === item.value;
      typeSelect.appendChild(option);
    });
    typeSelect.addEventListener("change", function () {
      state.pageFeedback.draft.type = typeSelect.value;
    });
    typeLabel.appendChild(typeSelect);

    const titleLabel = createElement("label", "github-auth-field");
    titleLabel.appendChild(createElement("span", "github-auth-field-label", t("feedbackTitleLabel")));
    const titleInput = document.createElement("input");
    titleInput.className = "github-auth-input";
    titleInput.type = "text";
    titleInput.value = draft.title;
    titleInput.placeholder = t("feedbackTitlePlaceholder");
    titleInput.addEventListener("input", function () {
      state.pageFeedback.draft.title = titleInput.value;
    });
    titleLabel.appendChild(titleInput);

    const detailLabel = createElement("label", "github-auth-field");
    detailLabel.appendChild(createElement("span", "github-auth-field-label", t("feedbackDetailLabel")));
    const detailInput = document.createElement("textarea");
    detailInput.className = "github-auth-textarea";
    detailInput.rows = 8;
    detailInput.value = draft.details;
    detailInput.placeholder = t("feedbackDetailPlaceholder");
    detailInput.addEventListener("input", function () {
      state.pageFeedback.draft.details = detailInput.value;
    });
    detailLabel.appendChild(detailInput);

    form.append(typeLabel, titleLabel, detailLabel);

    if (state.pageFeedback.error) {
      form.appendChild(createElement("p", "github-auth-error", state.pageFeedback.error));
    }

    const actions = buildActionRow();
    const submit = buildPrimaryButton(t("feedbackSubmit"), function () {
      form.requestSubmit();
    });
    submit.disabled = Boolean(state.pageFeedback.submitting);
    actions.appendChild(submit);
    form.appendChild(actions);
    formPanel.appendChild(form);

    shell.appendChild(formPanel);
    root.appendChild(shell);
  }

  function renderAll() {
    slots.forEach(renderSlot);
    pageRoots.forEach(renderFeedbackPage);
    renderDialog();
  }

  async function refreshSession() {
    if (!isAuthenticated()) {
      emitAuthChange();
      renderAll();
      return;
    }

    try {
      const user = await fetchCurrentUser(state.auth.token);
      state.auth.user = user;
      state.auth.checkedAt = Date.now();
      saveAuthState();
      emitAuthChange();
    } catch (error) {
      if (error && error.status === 401) {
        clearAuthState();
        return;
      }
    }

    renderAll();
  }

  renderAll();
  refreshSession();
  window.addEventListener("wk:language-change", renderAll);
})();
