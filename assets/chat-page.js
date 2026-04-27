(function () {
  const CONFIG_KEY = "wk1995-ai-chat-config";
  const STATE_KEY = "wk1995-ai-chat-page-state";
  const API_URL = "https://api.deepseek.com/chat/completions";
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
      metaTitle: "AI Chat 工作台 · WK1995", metaDescription: "左中右三栏的 AI Chat 页面，用于管理聊天记录、对话和模型参数。", home: "返回首页",
      eyebrow: "AI Workspace", title: "AI Chat 工作台", subtitle: "左侧管理对话记录，中间专注对话，右侧统一维护模型和 Key。",
      historyEyebrow: "History", historyTitle: "聊天记录", chatEyebrow: "Conversation", settingsEyebrow: "Settings", settingsTitle: "参数设置",
      modelLabel: "模型选择", keyLabel: "DeepSeek API Key", saveKey: "保存 Key", clearKey: "删除当前 Key", settingsNote: "模型与 Key 只保存在当前浏览器本地，不会提交到仓库。", savedModelsTitle: "已保存模型",
      composerHint: "Enter 发送，Shift + Enter 换行", clearConversation: "清空当前对话", send: "发送", newChat: "新对话", untitled: "新对话",
      emptyTitle: "从这里开始一轮新的 AI 对话", emptyBody: "先在右侧确认模型和 Key，然后可以直接在中间区域持续对话。", starterTitle: "可以先试这些问题",
      placeholderReady: "输入你的问题，按 Enter 发送", placeholderMissing: "先在右侧完成模型设置，然后开始聊天",
      ready: "已连接", missing: "待配置 Key", statusReady: "当前模型已就绪，可以直接开始。", statusNeedSetup: "先配置当前模型的 Key，再开始聊天。", statusSaved: "当前模型的 Key 已保存到本地。", statusCleared: "当前模型的 Key 已删除。", statusMessage: "请先输入要发送的内容。", statusSending: "正在请求 DeepSeek...", statusLoaded: "已加载当前模型保存的本地 Key。", statusMissing: "当前模型还没有保存 Key。", statusDraft: "已把示例问题放进输入框。", you: "你", ai: "AI", thinking: "正在思考...", failed: "请求失败：", invalid: "模型返回了空内容，请检查模型和 Key 是否有效。", prompt: "你是 WK1995 网站里的 AI 助手。请使用简洁、直接、专业的语气回答，优先给出可执行建议。", legacy: "兼容模型",
    },
    en: {
      metaTitle: "AI Chat Workspace · WK1995", metaDescription: "A three-column AI chat page for history, conversation, and model settings.", home: "Back home",
      eyebrow: "AI Workspace", title: "AI Chat Workspace", subtitle: "History on the left, conversation in the center, model settings on the right.",
      historyEyebrow: "History", historyTitle: "Chat History", chatEyebrow: "Conversation", settingsEyebrow: "Settings", settingsTitle: "Model Settings",
      modelLabel: "Model", keyLabel: "DeepSeek API Key", saveKey: "Save key", clearKey: "Delete current key", settingsNote: "Model choices and API keys stay only in this browser and are never committed.", savedModelsTitle: "Saved models",
      composerHint: "Enter to send, Shift + Enter for a new line", clearConversation: "Clear current chat", send: "Send", newChat: "New chat", untitled: "New chat",
      emptyTitle: "Start a new AI conversation here", emptyBody: "Confirm the model and key on the right, then keep the conversation flowing in the center workspace.", starterTitle: "Try one of these prompts",
      placeholderReady: "Type your message and press Enter to send", placeholderMissing: "Finish model setup on the right before chatting",
      ready: "Connected", missing: "Key required", statusReady: "The current model is ready.", statusNeedSetup: "Add a key for the current model before chatting.", statusSaved: "The current model key has been saved locally.", statusCleared: "The current model key has been removed.", statusMessage: "Type a message before sending.", statusSending: "Calling DeepSeek...", statusLoaded: "Loaded the saved key for the current model.", statusMissing: "No key has been saved for this model yet.", statusDraft: "A starter prompt has been placed in the composer.", you: "You", ai: "AI", thinking: "Thinking...", failed: "Request failed:", invalid: "The model returned an empty response. Check whether the selected model and key are valid.", prompt: "You are the AI assistant inside WK1995's website. Reply with a concise, direct, and professional tone, and prioritize actionable suggestions.", legacy: "Legacy model",
    },
  };

  const refs = {};
  const state = { config: loadConfig(), conversations: [], activeId: "", busy: false, status: { type: "", key: "", raw: "" } };

  function lang() { return window.WKSite && typeof window.WKSite.getLanguage === "function" ? window.WKSite.getLanguage() : "zh"; }
  function t(key) { return (copy[lang()] && copy[lang()][key]) || copy.zh[key] || key; }
  function starters() { return STARTERS[lang()] || STARTERS.zh; }
  function modelMeta(id) { return MODELS.find(function (item) { return item.id === id; }); }
  function label(id) { const meta = modelMeta(id); const base = meta ? (meta.labels[lang()] || meta.labels.zh) : id; return meta && meta.legacy ? base + " - " + t("legacy") : base; }
  function now() { return Date.now(); }
  function uid() { return "chat_" + now() + "_" + Math.random().toString(16).slice(2, 8); }
  function statusKey() { return keyForModel() ? "statusReady" : "statusNeedSetup"; }
  function formatTime(value) { return new Intl.DateTimeFormat(lang() === "zh" ? "zh-CN" : "en-US", { hour: "2-digit", minute: "2-digit" }).format(new Date(value)); }
  function shortTime(value) { return new Intl.DateTimeFormat(lang() === "zh" ? "zh-CN" : "en-US", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(value)); }
  function loadJson(key) { try { return JSON.parse(localStorage.getItem(key) || "{}"); } catch (error) { return {}; } }
  function loadConfig() { const raw = loadJson(CONFIG_KEY); const keys = {}; Object.keys(raw.keys || {}).forEach(function (id) { const value = typeof raw.keys[id] === "string" ? raw.keys[id].trim() : ""; if (value && modelMeta(id)) { keys[id] = value; } }); return { selectedModel: modelMeta(raw.selectedModel) ? raw.selectedModel : (Object.keys(keys)[0] || MODELS[0].id), keys: keys }; }
  function saveConfig() { localStorage.setItem(CONFIG_KEY, JSON.stringify(state.config)); }
  function selectedModel() { return modelMeta(state.config.selectedModel) ? state.config.selectedModel : MODELS[0].id; }
  function keyForModel(id) { return state.config.keys[id || selectedModel()] || ""; }
  function savedModels() { return Object.keys(state.config.keys).filter(function (id) { return state.config.keys[id] && modelMeta(id); }); }
  function conversationTitle(item) { return item.title || t("untitled"); }
  function conversationPreview(item) {
    const visible = item.messages.filter(function (message) {
      return typeof message.content === "string" && message.content.trim() && !message.pending;
    });
    if (!visible.length) { return t("emptyBody"); }
    return visible[visible.length - 1].content.trim().replace(/\s+/g, " ").slice(0, 88);
  }
  function maskKey(value) {
    if (!value) { return t("missing"); }
    if (value.length <= 8) { return value; }
    return value.slice(0, 4) + "..." + value.slice(-4);
  }
  function activeConversation() { return state.conversations.find(function (item) { return item.id === state.activeId; }) || state.conversations[0]; }
  function saveState() { localStorage.setItem(STATE_KEY, JSON.stringify({ activeId: state.activeId, conversations: state.conversations })); }
  function setStatus(type, key, raw) { state.status = { type: type || "", key: key || "", raw: raw || "" }; renderStatus(); }
  function setDraft(text) { refs.input.value = text; resizeInput(); refs.input.focus(); refs.input.setSelectionRange(refs.input.value.length, refs.input.value.length); }
  function blankConversation() { return { id: uid(), title: "", createdAt: now(), updatedAt: now(), messages: [] }; }
  function resizeInput() { refs.input.style.height = "0px"; refs.input.style.height = Math.min(Math.max(refs.input.scrollHeight, 58), 220) + "px"; }

  function initState() {
    const raw = loadJson(STATE_KEY);
    const items = Array.isArray(raw.conversations) ? raw.conversations : [];
    state.conversations = items.filter(function (item) { return item && item.id && Array.isArray(item.messages); }).map(function (item) { return { id: item.id, title: typeof item.title === "string" ? item.title : "", createdAt: item.createdAt || now(), updatedAt: item.updatedAt || now(), messages: item.messages }; });
    if (!state.conversations.length) { state.conversations = [blankConversation()]; }
    state.activeId = state.conversations.some(function (item) { return item.id === raw.activeId; }) ? raw.activeId : state.conversations[0].id;
  }

  function applyStaticText() {
    document.title = t("metaTitle");
    const meta = document.querySelector('meta[name="description"]');
    if (meta) { meta.setAttribute("content", t("metaDescription")); }
    document.querySelectorAll("[data-chat-text]").forEach(function (node) { const key = node.dataset.chatText; node.textContent = t(key); });
    document.querySelectorAll("[data-chat-link='home']").forEach(function (node) { node.textContent = t("home"); });
    refs.input.placeholder = keyForModel() ? t("placeholderReady") : t("placeholderMissing");
  }

  function renderModelSelect() {
    refs.modelSelect.innerHTML = "";
    MODELS.forEach(function (model) { const option = document.createElement("option"); option.value = model.id; option.textContent = label(model.id); refs.modelSelect.appendChild(option); });
    refs.modelSelect.value = selectedModel();
    refs.keyInput.value = keyForModel();
  }

  function renderSavedModels() {
    const items = savedModels();
    refs.savedCount.textContent = String(items.length);
    refs.savedList.innerHTML = "";
    if (!items.length) {
      const empty = document.createElement("div");
      const title = document.createElement("strong");
      const detail = document.createElement("span");
      empty.className = "chat-saved-model-item";
      title.textContent = "DeepSeek";
      detail.textContent = t("missing");
      empty.appendChild(title);
      empty.appendChild(detail);
      refs.savedList.appendChild(empty);
      return;
    }
    items.forEach(function (id) {
      const button = document.createElement("button");
      const title = document.createElement("strong");
      const detail = document.createElement("span");
      button.type = "button";
      button.className = "chat-saved-model-item";
      title.textContent = label(id);
      detail.textContent = maskKey(state.config.keys[id]);
      button.appendChild(title);
      button.appendChild(detail);
      button.addEventListener("click", function () { state.config.selectedModel = id; saveConfig(); renderAll(); setStatus("success", "statusLoaded"); refs.keyInput.focus(); refs.keyInput.select(); });
      refs.savedList.appendChild(button);
    });
  }

  function renderHistory() {
    refs.history.innerHTML = "";
    state.conversations.slice().sort(function (a, b) { return b.updatedAt - a.updatedAt; }).forEach(function (item) {
      const button = document.createElement("button");
      const row = document.createElement("div");
      const title = document.createElement("strong");
      const time = document.createElement("span");
      const preview = document.createElement("p");
      button.type = "button";
      button.className = "chat-history-item" + (item.id === state.activeId ? " is-active" : "");
      row.className = "chat-history-row";
      title.textContent = conversationTitle(item);
      time.textContent = shortTime(item.updatedAt);
      preview.textContent = conversationPreview(item);
      row.appendChild(title);
      row.appendChild(time);
      button.appendChild(row);
      button.appendChild(preview);
      button.addEventListener("click", function () { state.activeId = item.id; saveState(); renderAll(); });
      refs.history.appendChild(button);
    });
  }

  function renderConversation() {
    const conversation = activeConversation();
    refs.title.textContent = conversationTitle(conversation);
    refs.modelChip.textContent = label(selectedModel());
    refs.connectionChip.textContent = keyForModel() ? t("ready") : t("missing");
    refs.messages.innerHTML = "";
    if (!conversation.messages.length) {
      const empty = document.createElement("div");
      empty.className = "chat-empty-state";
      empty.innerHTML = "<strong>" + t("emptyTitle") + "</strong><p>" + t("emptyBody") + "</p><span class=\"chat-empty-label\">" + t("starterTitle") + "</span><div class=\"chat-starter-grid\"></div>";
      const grid = empty.querySelector(".chat-starter-grid");
      starters().forEach(function (item) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "chat-starter-button";
        button.textContent = item[0];
        button.addEventListener("click", function () { setDraft(item[1]); setStatus("success", "statusDraft"); });
        grid.appendChild(button);
      });
      refs.messages.appendChild(empty);
      return;
    }
    conversation.messages.forEach(function (message) {
      const article = document.createElement("article");
      article.className = "chat-message";
      article.dataset.role = message.role;
      article.innerHTML = '<div class="chat-message-head"><span>' + (message.role === "user" ? t("you") : t("ai")) + '</span><span>' + formatTime(message.timestamp) + '</span></div><div class="chat-message-bubble"></div>';
      article.querySelector(".chat-message-bubble").textContent = message.pending ? t("thinking") : message.content;
      refs.messages.appendChild(article);
    });
    refs.messages.scrollTop = refs.messages.scrollHeight;
  }

  function renderStatus() {
    refs.status.className = "chat-main-status";
    if (state.status.type) { refs.status.classList.add("is-" + state.status.type); }
    refs.status.textContent = state.status.raw || t(state.status.key || statusKey());
  }

  function renderAll() { applyStaticText(); renderModelSelect(); renderSavedModels(); renderHistory(); renderConversation(); renderStatus(); resizeInput(); }

  function touchConversation(item) { item.updatedAt = now(); saveState(); }
  function ensureConversationTitle(item, text) { if (!item.title && text) { item.title = text.trim().slice(0, 28); } }
  function pushMessage(role, content, pending) { const conversation = activeConversation(); conversation.messages.push({ role: role, content: content, pending: Boolean(pending), timestamp: now() }); touchConversation(conversation); renderAll(); }
  function replacePending(content) { const conversation = activeConversation(); for (let i = conversation.messages.length - 1; i >= 0; i -= 1) { if (conversation.messages[i].role === "assistant") { conversation.messages[i].content = content; conversation.messages[i].pending = false; conversation.messages[i].timestamp = now(); break; } } touchConversation(conversation); renderAll(); }
  function requestMessages() { return [{ role: "system", content: t("prompt") }].concat(activeConversation().messages.filter(function (item) { return (item.role === "user" || item.role === "assistant") && !item.pending; }).map(function (item) { return { role: item.role, content: item.content }; })); }
  function responseText(payload) { const choice = payload && payload.choices && payload.choices[0]; const message = choice && choice.message; if (!message) { return ""; } if (typeof message.content === "string" && message.content.trim()) { return message.content.trim(); } if (typeof message.reasoning_content === "string" && message.reasoning_content.trim()) { return message.reasoning_content.trim(); } return ""; }

  async function sendMessage() {
    const text = refs.input.value.trim();
    if (!text) { setStatus("error", "statusMessage"); return; }
    if (!keyForModel()) { setStatus("error", "statusNeedSetup"); refs.keyInput.focus(); return; }
    refs.input.value = ""; resizeInput();
    const conversation = activeConversation();
    ensureConversationTitle(conversation, text);
    pushMessage("user", text, false);
    pushMessage("assistant", "", true);
    state.busy = true; syncBusy(); setStatus("success", "statusSending");
    try {
      const response = await fetch(API_URL, { method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer " + keyForModel() }, body: JSON.stringify({ model: selectedModel(), messages: requestMessages(), stream: false }) });
      const payload = await response.json().catch(function () { return null; });
      if (!response.ok) { const message = payload && payload.error && (payload.error.message || payload.error.type || JSON.stringify(payload.error)); throw new Error(message || response.statusText || "Unknown error"); }
      const content = responseText(payload);
      if (!content) { throw new Error(t("invalid")); }
      replacePending(content); setStatus("success", "statusReady");
    } catch (error) {
      replacePending(t("failed") + " " + error.message); setStatus("error", "", t("failed") + " " + error.message);
    } finally {
      state.busy = false; syncBusy();
    }
  }

  function syncBusy() { refs.send.disabled = state.busy; refs.newChat.disabled = state.busy; refs.clearChat.disabled = state.busy; refs.input.disabled = state.busy; refs.modelSelect.disabled = state.busy; refs.keyInput.disabled = state.busy; refs.saveKey.disabled = state.busy; refs.clearKey.disabled = state.busy; }
  function createConversation() { const item = blankConversation(); state.conversations.unshift(item); state.activeId = item.id; saveState(); renderAll(); refs.input.focus(); }
  function clearConversation() { const conversation = activeConversation(); conversation.title = ""; conversation.messages = []; touchConversation(conversation); renderAll(); setStatus("", "", ""); }
  function saveKey() { const value = refs.keyInput.value.trim(); if (!value) { setStatus("error", "statusNeedSetup"); refs.keyInput.focus(); return; } state.config.selectedModel = refs.modelSelect.value; state.config.keys[refs.modelSelect.value] = value; saveConfig(); renderAll(); setStatus("success", "statusSaved"); }
  function clearKey() { delete state.config.keys[refs.modelSelect.value]; saveConfig(); renderAll(); setStatus("success", "statusCleared"); }

  function bind() {
    refs.newChat.addEventListener("click", createConversation);
    refs.clearChat.addEventListener("click", clearConversation);
    refs.send.addEventListener("click", sendMessage);
    refs.saveKey.addEventListener("click", saveKey);
    refs.clearKey.addEventListener("click", clearKey);
    refs.modelSelect.addEventListener("change", function () { state.config.selectedModel = refs.modelSelect.value; saveConfig(); renderAll(); setStatus(keyForModel() ? "success" : "error", keyForModel() ? "statusLoaded" : "statusMissing"); });
    refs.input.addEventListener("input", resizeInput);
    refs.input.addEventListener("keydown", function (event) { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); sendMessage(); } });
    window.addEventListener("wk:language-change", renderAll);
  }

  function collect() {
    refs.history = document.getElementById("conversation-list");
    refs.newChat = document.getElementById("new-conversation");
    refs.title = document.getElementById("conversation-title");
    refs.modelChip = document.getElementById("active-model-chip");
    refs.connectionChip = document.getElementById("connection-chip");
    refs.status = document.getElementById("chat-status");
    refs.messages = document.getElementById("message-list");
    refs.input = document.getElementById("message-input");
    refs.clearChat = document.getElementById("clear-conversation");
    refs.send = document.getElementById("send-message");
    refs.modelSelect = document.getElementById("model-select");
    refs.keyInput = document.getElementById("api-key-input");
    refs.saveKey = document.getElementById("save-key");
    refs.clearKey = document.getElementById("clear-key");
    refs.savedCount = document.getElementById("saved-model-count");
    refs.savedList = document.getElementById("saved-model-list");
  }

  initState();
  collect();
  bind();
  renderAll();
  syncBusy();
})();
