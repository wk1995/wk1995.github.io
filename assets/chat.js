(function () {
  const STORAGE_KEY = "wk1995-ai-chat-config";
  const DEEPSEEK_API_URL = "https://api.deepseek.com/chat/completions";
  const MODELS = [
    { id: "deepseek-v4-flash", labels: { zh: "DeepSeek V4 Flash", en: "DeepSeek V4 Flash" } },
    { id: "deepseek-v4-pro", labels: { zh: "DeepSeek V4 Pro", en: "DeepSeek V4 Pro" } },
    { id: "deepseek-chat", labels: { zh: "DeepSeek Chat", en: "DeepSeek Chat" }, legacy: true },
    { id: "deepseek-reasoner", labels: { zh: "DeepSeek Reasoner", en: "DeepSeek Reasoner" }, legacy: true },
  ];
  const STARTERS = {
    zh: [
      ["给我 3 个 AI x Android 首页选题", "请结合这个网站的定位，给我 3 个适合首页继续扩展的 AI x Android 主题方向。"],
      ["优化我的 GitHub 首页介绍", "请帮我优化这个 GitHub 首页的个人介绍文案，强调 AI 与 Android 的结合。"],
      ["推荐一个技术博客栏目结构", "请为一个聚焦 AI 和 Android 的个人博客，设计一个清晰的栏目结构。"],
    ],
    en: [
      ["Suggest 3 AI x Android homepage topics", "Based on this site's positioning, suggest 3 homepage expansion ideas focused on AI and Android."],
      ["Rewrite my GitHub profile intro", "Help me rewrite this GitHub homepage intro so it highlights the intersection of AI and Android."],
      ["Design a blog section structure", "Design a clear section structure for a personal blog focused on AI and Android."],
    ],
  };
  const copy = {
    zh: {
      launcher: "AI Chat", title: "AI 聊天助手", subtitle: "先聊天，再按需配置模型和 Key。",
      model: "模型", settings: "模型设置", settingsSub: "当前先支持 DeepSeek，API Key 只保存在当前浏览器本地。",
      key: "DeepSeek API Key", keyPlaceholder: "粘贴当前模型对应的 API Key", save: "保存 Key", clear: "删除当前 Key",
      saved: "已保存的模型 Key", savedBadge: "已保存", savedEmpty: "还没有保存任何 Key。", note: "切换模型时会自动读取对应的本地 Key。",
      ready: "已连接", missing: "待配置 Key", welcomeReady: "DeepSeek 已就绪", welcomeMissing: "DeepSeek 待配置",
      welcomeTitle: "可以直接拿它聊 AI、Android，或者这个站点本身",
      welcomeReadyBody: "主界面现在只保留状态、建议问题和输入框，配置被收进了单独设置层。",
      welcomeMissingBody: "不会再把整块配置表单一直顶在聊天区顶部；只有需要接入模型时，才会打开设置层。",
      current: "当前模型：", manage: "管理模型", setup: "配置 DeepSeek", setupTitle: "先完成 2 步设置，再开始聊天",
      setupBody: "选择模型并保存对应 Key。保存后会自动回到对话视图，后续切换模型也会直接读本地 Key。", open: "打开设置",
      starters: "可以先试这些问题", placeholderReady: "输入你的问题，按 Enter 发送", placeholderMissing: "先完成模型设置，然后开始聊天",
      hint: "Enter 发送，Shift + Enter 换行", send: "发送", newChat: "新对话", close: "关闭聊天", closeSettings: "关闭设置",
      statusReady: "当前模型已就绪，可以直接开始。", statusNeedSetup: "先配置当前模型的 Key，再开始聊天。", statusSaved: "当前模型的 Key 已保存到本地。", statusCleared: "当前模型的 Key 已删除。", statusModel: "请先选择一个模型。", statusKey: "请先填写当前模型对应的 API Key。", statusMessage: "请先输入要发送的内容。", statusSending: "正在请求 DeepSeek...", statusLoaded: "已加载当前模型保存的本地 Key。", statusMissing: "当前模型还没有保存 Key。", statusDraft: "已把示例问题放进输入框。",
      you: "你", ai: "AI", noteRole: "提示", thinking: "正在思考...", legacy: "兼容模型", failed: "请求失败：",
      invalid: "模型返回了空内容，请检查模型和 Key 是否有效。", prompt: "你是 WK1995 网站里的 AI 助手。请使用简洁、直接、专业的语气回答，优先给出可执行建议。",
    },
    en: {
      launcher: "AI Chat", title: "AI Chat Assistant", subtitle: "Chat first, configure models only when needed.",
      model: "Model", settings: "Model Settings", settingsSub: "DeepSeek is supported for now. API keys stay only in this browser.",
      key: "DeepSeek API Key", keyPlaceholder: "Paste the API key for the current model", save: "Save key", clear: "Delete current key",
      saved: "Saved model keys", savedBadge: "saved", savedEmpty: "No keys have been saved yet.", note: "Switching models automatically loads the matching local key.",
      ready: "Connected", missing: "Key required", welcomeReady: "DeepSeek is ready", welcomeMissing: "DeepSeek needs setup",
      welcomeTitle: "Use it to talk about AI, Android, or this site itself",
      welcomeReadyBody: "The main view now stays focused on status, starter prompts, and conversation.",
      welcomeMissingBody: "The large configuration form no longer blocks the top of the chat area. Settings open only when needed.",
      current: "Current model:", manage: "Manage models", setup: "Set up DeepSeek", setupTitle: "Complete 2 quick steps before chatting",
      setupBody: "Choose a model and save its API key. After that, the drawer returns to a normal chat-first flow.", open: "Open settings",
      starters: "Try one of these", placeholderReady: "Type your message and press Enter to send", placeholderMissing: "Finish model setup first, then start chatting",
      hint: "Enter to send, Shift + Enter for a new line", send: "Send", newChat: "New chat", close: "Close chat", closeSettings: "Close settings",
      statusReady: "The current model is ready.", statusNeedSetup: "Add a key for the current model before chatting.", statusSaved: "The current model key has been saved locally.", statusCleared: "The current model key has been removed.", statusModel: "Choose a model first.", statusKey: "Enter the API key for the current model first.", statusMessage: "Type a message before sending.", statusSending: "Calling DeepSeek...", statusLoaded: "Loaded the saved key for the current model.", statusMissing: "No key has been saved for this model yet.", statusDraft: "A starter prompt has been placed in the composer.",
      you: "You", ai: "AI", noteRole: "Note", thinking: "Thinking...", legacy: "Legacy model", failed: "Request failed:",
      invalid: "The model returned an empty response. Check whether the selected model and key are valid.", prompt: "You are the AI assistant inside WK1995's website. Reply with a concise, direct, and professional tone, and prioritize actionable suggestions.",
    },
  };

  const refs = {};
  const state = { config: normalizeConfig(loadConfig()), messages: [], busy: false, settingsOpen: false, status: { type: "", key: "", raw: "" } };

  function lang() { return window.WKSite && typeof window.WKSite.getLanguage === "function" ? window.WKSite.getLanguage() : (document.documentElement.lang.startsWith("zh") ? "zh" : "en"); }
  function t(key) { return (copy[lang()] && copy[lang()][key]) || copy.zh[key] || key; }
  function starters() { return STARTERS[lang()] || STARTERS.zh; }
  function getModelMeta(id) { return MODELS.find(function (item) { return item.id === id; }); }
  function loadConfig() { try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}"); } catch (error) { return {}; } }
  function normalizeConfig(config) {
    const raw = config && typeof config.keys === "object" ? config.keys : {};
    const keys = {};
    Object.keys(raw).forEach(function (id) {
      const value = typeof raw[id] === "string" ? raw[id].trim() : "";
      if (value && getModelMeta(id)) { keys[id] = value; }
    });
    return { selectedModel: getModelMeta(config && config.selectedModel) ? config.selectedModel : (Object.keys(keys)[0] || MODELS[0].id), keys: keys };
  }
  function saveConfig() { localStorage.setItem(STORAGE_KEY, JSON.stringify({ selectedModel: state.config.selectedModel, keys: state.config.keys })); }
  function selectedModel() { return getModelMeta(state.config.selectedModel) ? state.config.selectedModel : MODELS[0].id; }
  function savedModels() { return Object.keys(state.config.keys).filter(function (id) { return state.config.keys[id] && getModelMeta(id); }); }
  function modelKey(id) { return state.config.keys[id || selectedModel()] || ""; }
  function hasKey(id) { return Boolean(modelKey(id)); }
  function modelLabel(id) { const meta = getModelMeta(id); const base = meta ? ((meta.labels[lang()] || meta.labels.zh)) : id; return meta && meta.legacy ? base + " - " + t("legacy") : base; }
  function defaultStatus() { return hasKey() ? "statusReady" : "statusNeedSetup"; }
  function formatTime(ts) { return new Intl.DateTimeFormat(lang() === "zh" ? "zh-CN" : "en-US", { hour: "2-digit", minute: "2-digit" }).format(new Date(ts)); }

  function buildChatUI() {
    const launcher = document.createElement("button");
    launcher.className = "chat-launcher";
    launcher.type = "button";
    launcher.innerHTML = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M1.75 2A1.75 1.75 0 0 0 0 3.75v6.5C0 11.216.784 12 1.75 12h2.124l2.45 2.1a.75.75 0 0 0 1.226-.57V12h6.7A1.75 1.75 0 0 0 16 10.25v-6.5A1.75 1.75 0 0 0 14.25 2H1.75Zm1.5 3.25a.75.75 0 0 1 .75-.75h8a.75.75 0 0 1 0 1.5H4a.75.75 0 0 1-.75-.75Zm0 2.75A.75.75 0 0 1 4 7.25h5.5a.75.75 0 0 1 0 1.5H4A.75.75 0 0 1 3.25 8Z"></path></svg><span></span>';
    const overlay = document.createElement("div");
    overlay.className = "chat-overlay";
    const drawer = document.createElement("aside");
    drawer.className = "chat-drawer";
    drawer.innerHTML = '<div class="chat-header"><div class="chat-header-copy"><strong></strong><span></span></div><div class="chat-header-actions"><button class="chat-icon-button chat-settings-toggle" type="button"></button><button class="chat-icon-button chat-close" type="button"></button></div></div><div class="chat-toolbar"><label class="chat-toolbar-group" for="chat-toolbar-model"><span class="chat-toolbar-label"></span><select class="chat-select" id="chat-toolbar-model"></select></label><button class="chat-connection-chip" type="button"></button></div><div class="chat-body"></div><div class="chat-footer"><div class="chat-status" role="status" aria-live="polite"></div><div class="chat-composer"><textarea class="chat-textarea" rows="1"></textarea><div class="chat-footer-row"><span class="chat-footer-hint"></span><div class="chat-footer-actions"><button class="chat-subtle-button chat-new-chat" type="button"></button><button class="chat-send-button" type="button"></button></div></div></div></div><div class="chat-settings-layer" aria-hidden="true"><button class="chat-settings-scrim" type="button" tabindex="-1" aria-hidden="true"></button><section class="chat-settings-panel" aria-modal="true" role="dialog"><div class="chat-settings-head"><div class="chat-settings-copy"><strong></strong><span></span></div><button class="chat-icon-button chat-settings-close" type="button"></button></div><div class="chat-settings-body"><div class="chat-field"><label for="chat-settings-model"></label><select class="chat-select" id="chat-settings-model"></select></div><div class="chat-field"><label for="chat-settings-key"></label><input class="chat-input" id="chat-settings-key" type="password" autocomplete="off"></div><div class="chat-settings-actions"><button class="chat-primary-button chat-save-key" type="button"></button><button class="chat-subtle-button chat-clear-key" type="button"></button></div><div class="chat-saved"><div class="chat-saved-head"><span class="chat-saved-title"></span><strong class="chat-saved-count"></strong></div><div class="chat-saved-list"></div></div><p class="chat-config-note"></p></div></section></div>';
    document.body.append(launcher, overlay, drawer);
    refs.launcher = launcher; refs.launcherLabel = launcher.querySelector("span"); refs.overlay = overlay; refs.drawer = drawer;
    refs.headerTitle = drawer.querySelector(".chat-header-copy strong"); refs.headerSubtitle = drawer.querySelector(".chat-header-copy span");
    refs.settingsToggle = drawer.querySelector(".chat-settings-toggle"); refs.close = drawer.querySelector(".chat-close");
    refs.modelLabel = drawer.querySelector(".chat-toolbar-label"); refs.modelSelect = drawer.querySelector("#chat-toolbar-model"); refs.connection = drawer.querySelector(".chat-connection-chip");
    refs.body = drawer.querySelector(".chat-body"); refs.status = drawer.querySelector(".chat-status"); refs.textarea = drawer.querySelector(".chat-textarea"); refs.footerHint = drawer.querySelector(".chat-footer-hint");
    refs.newChat = drawer.querySelector(".chat-new-chat"); refs.send = drawer.querySelector(".chat-send-button");
    refs.settingsLayer = drawer.querySelector(".chat-settings-layer"); refs.settingsScrim = drawer.querySelector(".chat-settings-scrim"); refs.settingsClose = drawer.querySelector(".chat-settings-close");
    refs.settingsTitle = drawer.querySelector(".chat-settings-copy strong"); refs.settingsSubtitle = drawer.querySelector(".chat-settings-copy span");
    refs.settingsModelLabel = drawer.querySelector('label[for="chat-settings-model"]'); refs.settingsModel = drawer.querySelector("#chat-settings-model");
    refs.settingsKeyLabel = drawer.querySelector('label[for="chat-settings-key"]'); refs.settingsKey = drawer.querySelector("#chat-settings-key");
    refs.save = drawer.querySelector(".chat-save-key"); refs.clear = drawer.querySelector(".chat-clear-key"); refs.savedTitle = drawer.querySelector(".chat-saved-title"); refs.savedCount = drawer.querySelector(".chat-saved-count"); refs.savedList = drawer.querySelector(".chat-saved-list"); refs.note = drawer.querySelector(".chat-config-note");
    refs.settingsToggle.innerHTML = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M6.96 1.5a.75.75 0 0 1 .73-.5h.62a.75.75 0 0 1 .73.5l.3 1.18c.28.07.56.19.81.33l1.1-.63a.75.75 0 0 1 .88.1l.44.44a.75.75 0 0 1 .1.88l-.62 1.1c.14.25.25.52.33.8l1.18.31a.75.75 0 0 1 .5.73v.62a.75.75 0 0 1-.5.73l-1.18.3a3.7 3.7 0 0 1-.33.81l.62 1.1a.75.75 0 0 1-.1.88l-.44.44a.75.75 0 0 1-.88.1l-1.1-.62c-.25.14-.53.25-.8.33l-.31 1.18a.75.75 0 0 1-.73.5h-.62a.75.75 0 0 1-.73-.5l-.3-1.18a3.73 3.73 0 0 1-.81-.33l-1.1.62a.75.75 0 0 1-.88-.1l-.44-.44a.75.75 0 0 1-.1-.88l.63-1.1a3.7 3.7 0 0 1-.33-.81L1.5 8.81a.75.75 0 0 1-.5-.73v-.62a.75.75 0 0 1 .5-.73l1.18-.31c.08-.28.19-.55.33-.8l-.63-1.1a.75.75 0 0 1 .1-.88l.44-.44a.75.75 0 0 1 .88-.1l1.1.63c.25-.14.53-.26.81-.33l.3-1.18ZM8 10.25A2.25 2.25 0 1 0 8 5.75a2.25 2.25 0 0 0 0 4.5Z"></path></svg>';
    refs.close.innerHTML = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3.72 3.72a.75.75 0 0 1 1.06 0L8 6.94l3.22-3.22a.75.75 0 1 1 1.06 1.06L9.06 8l3.22 3.22a.75.75 0 1 1-1.06 1.06L8 9.06l-3.22 3.22a.75.75 0 1 1-1.06-1.06L6.94 8 3.72 4.78a.75.75 0 0 1 0-1.06Z"></path></svg>';
    refs.settingsClose.innerHTML = refs.close.innerHTML;
    refs.send.innerHTML = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M1.27 2.15a.75.75 0 0 1 .8-.12l11.5 5.25a.75.75 0 0 1 0 1.36L2.07 13.9a.75.75 0 0 1-1.06-.82l1.02-4.08a.75.75 0 0 1 .53-.53l4.44-1.11-4.44-1.11a.75.75 0 0 1-.53-.53L1.01 2.97a.75.75 0 0 1 .26-.82Z"></path></svg><span></span>';
  }

  function syncTextareaHeight() { refs.textarea.style.height = "0px"; refs.textarea.style.height = Math.min(Math.max(refs.textarea.scrollHeight, 56), 220) + "px"; }
  function syncKeyInput() { refs.settingsKey.value = modelKey(); }
  function setStatus(type, key, raw) { state.status = { type: type || "", key: key || "", raw: raw || "" }; renderStatus(); }
  function setDraft(text, focus) { refs.textarea.value = text; syncTextareaHeight(); if (focus) { refs.textarea.focus(); refs.textarea.setSelectionRange(refs.textarea.value.length, refs.textarea.value.length); } }

  function renderModelOptions() {
    [refs.modelSelect, refs.settingsModel].forEach(function (select) {
      select.innerHTML = "";
      MODELS.forEach(function (model) {
        const option = document.createElement("option");
        option.value = model.id;
        option.textContent = modelLabel(model.id);
        select.appendChild(option);
      });
      select.value = selectedModel();
    });
  }

  function renderSavedList() {
    const models = savedModels();
    refs.savedList.innerHTML = "";
    if (!models.length) {
      const empty = document.createElement("p");
      empty.className = "chat-saved-empty";
      empty.textContent = t("savedEmpty");
      refs.savedList.appendChild(empty);
      return;
    }
    models.forEach(function (id) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "chat-saved-chip" + (id === selectedModel() ? " is-current" : "");
      button.innerHTML = "<strong>" + modelLabel(id) + "</strong><span>" + t("savedBadge") + "</span>";
      button.addEventListener("click", function () { selectModel(id, true); refs.settingsKey.focus(); refs.settingsKey.select(); });
      refs.savedList.appendChild(button);
    });
  }

  function renderStatus() {
    refs.status.className = "chat-status";
    if (state.status.type) { refs.status.classList.add("is-" + state.status.type); }
    refs.status.textContent = state.status.raw || t(state.status.key || defaultStatus());
  }

  function renderText() {
    const ready = hasKey();
    refs.launcherLabel.textContent = t("launcher");
    refs.launcher.classList.toggle("is-ready", ready);
    refs.headerTitle.textContent = t("title"); refs.headerSubtitle.textContent = t("subtitle");
    refs.modelLabel.textContent = t("model"); refs.connection.className = "chat-connection-chip" + (ready ? " is-ready" : " is-missing");
    refs.connection.innerHTML = '<span class="chat-connection-dot"></span><span class="chat-connection-copy"><strong>DeepSeek</strong><span>' + t(ready ? "ready" : "missing") + "</span></span>";
    refs.settingsTitle.textContent = t("settings"); refs.settingsSubtitle.textContent = t("settingsSub"); refs.settingsModelLabel.textContent = t("model"); refs.settingsKeyLabel.textContent = t("key"); refs.settingsKey.placeholder = t("keyPlaceholder");
    refs.save.textContent = t("save"); refs.clear.textContent = t("clear"); refs.savedTitle.textContent = t("saved"); refs.savedCount.textContent = savedModels().length ? String(savedModels().length) : ""; refs.note.textContent = t("note");
    refs.textarea.placeholder = ready ? t("placeholderReady") : t("placeholderMissing"); refs.footerHint.textContent = t("hint"); refs.newChat.textContent = t("newChat"); refs.send.querySelector("span").textContent = t("send");
    refs.close.setAttribute("aria-label", t("close")); refs.close.setAttribute("title", t("close")); refs.settingsToggle.setAttribute("aria-label", t("open")); refs.settingsToggle.setAttribute("title", t("open")); refs.settingsClose.setAttribute("aria-label", t("closeSettings")); refs.settingsClose.setAttribute("title", t("closeSettings"));
    renderModelOptions(); renderSavedList(); renderBody(); renderStatus(); syncTextareaHeight();
  }

  function renderWelcome() {
    const ready = hasKey();
    const wrap = document.createElement("div");
    wrap.className = "chat-welcome";
    wrap.innerHTML = '<span class="chat-welcome-eyebrow">' + t(ready ? "welcomeReady" : "welcomeMissing") + '</span><h3>' + t("welcomeTitle") + '</h3><p>' + t(ready ? "welcomeReadyBody" : "welcomeMissingBody") + '</p><p class="chat-welcome-model">' + t("current") + " " + modelLabel(selectedModel()) + "</p>";
    const button = document.createElement("button");
    button.type = "button";
    button.className = ready ? "chat-subtle-button" : "chat-primary-button";
    button.textContent = t(ready ? "manage" : "setup");
    button.addEventListener("click", function () { openSettings(true); });
    const actions = document.createElement("div");
    actions.className = "chat-welcome-actions";
    actions.appendChild(button);
    wrap.appendChild(actions);
    refs.body.appendChild(wrap);
    if (!ready) {
      const setup = document.createElement("div");
      setup.className = "chat-setup-card";
      setup.innerHTML = "<strong>" + t("setupTitle") + "</strong><p>" + t("setupBody") + "</p>";
      const openButton = document.createElement("button");
      openButton.type = "button";
      openButton.className = "chat-subtle-button";
      openButton.textContent = t("open");
      openButton.addEventListener("click", function () { openSettings(true); });
      setup.appendChild(openButton);
      refs.body.appendChild(setup);
    }
  }

  function renderBody() { refs.body.innerHTML = ""; if (!state.messages.length) { renderWelcome(); renderStarters(); } else { renderMessages(); } }
  function renderStarters() {
    const section = document.createElement("section");
    section.className = "chat-starters";
    section.innerHTML = "<h4>" + t("starters") + "</h4>";
    const list = document.createElement("div");
    list.className = "chat-starter-list";
    starters().forEach(function (item) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "chat-starter-button";
      button.textContent = item[0];
      button.addEventListener("click", function () { setDraft(item[1], true); setStatus("success", "statusDraft"); });
      list.appendChild(button);
    });
    section.appendChild(list);
    refs.body.appendChild(section);
  }

  function renderMessages() {
    const list = document.createElement("div");
    list.className = "chat-message-list";
    state.messages.forEach(function (message) {
      const item = document.createElement("article");
      item.className = "chat-message";
      item.dataset.role = message.role;
      if (message.pending) { item.dataset.pending = "true"; }
      const role = message.role === "user" ? t("you") : (message.role === "assistant" ? t("ai") : t("noteRole"));
      item.innerHTML = '<div class="chat-message-head"><span>' + role + '</span><span>' + formatTime(message.timestamp) + '</span></div><div class="chat-message-bubble"></div>';
      item.querySelector(".chat-message-bubble").textContent = message.pending ? t("thinking") : message.content;
      list.appendChild(item);
    });
    refs.body.appendChild(list);
    refs.body.scrollTop = refs.body.scrollHeight;
  }

  function pushMessage(role, content, pending) { state.messages.push({ role: role, content: content, pending: Boolean(pending), timestamp: Date.now() }); renderBody(); }
  function replacePending(content) {
    for (let i = state.messages.length - 1; i >= 0; i -= 1) {
      if (state.messages[i].role === "assistant") { state.messages[i].content = content; state.messages[i].pending = false; state.messages[i].timestamp = Date.now(); break; }
    }
    renderBody();
  }

  function syncBusy() {
    refs.send.disabled = state.busy; refs.newChat.disabled = state.busy; refs.textarea.disabled = state.busy; refs.modelSelect.disabled = state.busy; refs.connection.disabled = state.busy; refs.settingsToggle.disabled = state.busy; refs.settingsModel.disabled = state.busy; refs.settingsKey.disabled = state.busy; refs.save.disabled = state.busy; refs.clear.disabled = state.busy;
  }

  function selectModel(id, announce) {
    if (!getModelMeta(id)) { return; }
    state.config.selectedModel = id;
    saveConfig();
    refs.modelSelect.value = id;
    refs.settingsModel.value = id;
    syncKeyInput();
    renderText();
    if (announce) { setStatus(hasKey(id) ? "success" : "error", hasKey(id) ? "statusLoaded" : "statusMissing"); }
  }

  function openSettings(focus) {
    state.settingsOpen = true;
    refs.settingsLayer.classList.add("is-open");
    refs.settingsLayer.setAttribute("aria-hidden", "false");
    syncKeyInput();
    if (focus) {
      requestAnimationFrame(function () { refs.settingsKey.focus(); refs.settingsKey.select(); });
    }
  }

  function closeSettings() { state.settingsOpen = false; refs.settingsLayer.classList.remove("is-open"); refs.settingsLayer.setAttribute("aria-hidden", "true"); }
  function openDrawer() { refs.overlay.classList.add("is-open"); refs.drawer.classList.add("is-open"); syncTextareaHeight(); refs.textarea.focus(); }
  function closeDrawer() { closeSettings(); refs.overlay.classList.remove("is-open"); refs.drawer.classList.remove("is-open"); }

  function saveCurrentKey() {
    const model = refs.settingsModel.value;
    const key = refs.settingsKey.value.trim();
    if (!model) { setStatus("error", "statusModel"); return; }
    if (!key) { setStatus("error", "statusKey"); refs.settingsKey.focus(); return; }
    state.config.selectedModel = model; state.config.keys[model] = key; saveConfig(); renderText(); setStatus("success", "statusSaved"); closeSettings(); refs.textarea.focus();
  }

  function clearCurrentKey() {
    const model = refs.settingsModel.value;
    if (!model) { setStatus("error", "statusModel"); return; }
    delete state.config.keys[model];
    saveConfig();
    syncKeyInput();
    renderText();
    setStatus("success", "statusCleared");
  }

  function requestMessages(userMessage) {
    const history = state.messages.filter(function (message) { return (message.role === "user" || message.role === "assistant") && !message.pending; }).map(function (message) { return { role: message.role, content: message.content }; });
    return [{ role: "system", content: t("prompt") }].concat(history, [{ role: "user", content: userMessage }]);
  }

  function responseText(payload) {
    const choice = payload && payload.choices && payload.choices[0];
    const message = choice && choice.message;
    if (!message) { return ""; }
    if (typeof message.content === "string" && message.content.trim()) { return message.content.trim(); }
    if (typeof message.reasoning_content === "string" && message.reasoning_content.trim()) { return message.reasoning_content.trim(); }
    return "";
  }

  async function sendMessage() {
    const text = refs.textarea.value.trim();
    if (!text) { setStatus("error", "statusMessage"); return; }
    if (!hasKey()) { setStatus("error", "statusNeedSetup"); openSettings(true); return; }
    refs.textarea.value = "";
    syncTextareaHeight();
    pushMessage("user", text, false);
    pushMessage("assistant", "", true);
    state.busy = true;
    syncBusy();
    setStatus("success", "statusSending");
    try {
      const response = await fetch(DEEPSEEK_API_URL, { method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer " + modelKey() }, body: JSON.stringify({ model: selectedModel(), messages: requestMessages(text), stream: false }) });
      const payload = await response.json().catch(function () { return null; });
      if (!response.ok) {
        const message = payload && payload.error && (payload.error.message || payload.error.type || JSON.stringify(payload.error));
        throw new Error(message || response.statusText || "Unknown error");
      }
      const content = responseText(payload);
      if (!content) { throw new Error(t("invalid")); }
      replacePending(content);
      setStatus("success", "statusReady");
    } catch (error) {
      replacePending(t("failed") + " " + error.message);
      setStatus("error", "", t("failed") + " " + error.message);
    } finally {
      state.busy = false;
      syncBusy();
    }
  }

  function resetChat() { if (state.busy) { return; } state.messages = []; renderBody(); setStatus("", "", ""); }

  function bindEvents() {
    refs.launcher.addEventListener("click", openDrawer);
    refs.overlay.addEventListener("click", closeDrawer);
    refs.close.addEventListener("click", closeDrawer);
    refs.settingsToggle.addEventListener("click", function () { openSettings(false); });
    refs.connection.addEventListener("click", function () { openSettings(true); });
    refs.settingsClose.addEventListener("click", closeSettings);
    refs.settingsScrim.addEventListener("click", closeSettings);
    refs.modelSelect.addEventListener("change", function () { selectModel(refs.modelSelect.value, true); });
    refs.settingsModel.addEventListener("change", function () { selectModel(refs.settingsModel.value, true); });
    refs.save.addEventListener("click", saveCurrentKey);
    refs.clear.addEventListener("click", clearCurrentKey);
    refs.send.addEventListener("click", sendMessage);
    refs.newChat.addEventListener("click", resetChat);
    refs.textarea.addEventListener("input", syncTextareaHeight);
    refs.textarea.addEventListener("keydown", function (event) { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); sendMessage(); } });
    window.addEventListener("wk:language-change", renderText);
    document.addEventListener("keydown", function (event) {
      if (event.key !== "Escape") { return; }
      if (state.settingsOpen) { closeSettings(); return; }
      if (refs.drawer.classList.contains("is-open")) { closeDrawer(); }
    });
  }

  function init() { buildChatUI(); bindEvents(); renderText(); selectModel(selectedModel(), false); syncBusy(); }
  init();
})();
