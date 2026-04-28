(function () {
  const CONFIG_KEY = "wk1995-ai-chat-config";
  const STATE_KEY = "wk1995-ai-chat-page-state";
  const UI_KEY = "wk1995-ai-chat-page-ui";
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
      metaTitle: "AI Chat 工作台 · WK1995",
      metaDescription: "仿应用工作区样式的 AI Chat 页面，用于管理聊天记录、对话和模型参数。",
      home: "返回首页",
      historyEyebrow: "History",
      historyTitle: "聊天记录",
      chatEyebrow: "Conversation",
      settingsEyebrow: "Settings",
      settingsTitle: "参数设置",
      settingsHelper: "选择模型并保存当前浏览器的 API Key。",
      modelLabel: "模型选择",
      keyLabel: "DeepSeek API Key",
      keyPlaceholder: "粘贴当前模型对应的 API Key",
      saveKey: "保存 Key",
      clearKey: "删除当前 Key",
      settingsNote: "模型与 Key 只保存在当前浏览器本地，不会提交到仓库。",
      savedModelsTitle: "已保存模型",
      composerHint: "Enter 发送，Shift + Enter 换行",
      clearConversation: "清空当前对话",
      send: "发送",
      resend: "保存并重发",
      newChat: "开启新对话",
      untitled: "新对话",
      emptyTitle: "开始一轮新的 AI 对话",
      emptyBody: "把 AI、Android、博客规划或 GitHub 首页优化的问题直接抛给我。",
      starterTitle: "可以从这些问题开始",
      placeholderReady: "给 WK1995 的 AI 助手发送消息",
      placeholderMissing: "先完成右侧设置，再开始聊天",
      ready: "已连接",
      missing: "待配置 Key",
      modelRequired: "未选择模型",
      selectModel: "请选择模型",
      statusReady: "当前模型已就绪，可以直接开始。",
      statusNeedSetup: "先为当前模型填写并保存 API Key。",
      statusSelectModel: "先选择一个可用模型，再保存对应的 API Key。",
      statusSaved: "当前模型的 Key 已保存到本地。",
      statusCleared: "当前模型的 Key 已删除。",
      statusMessage: "请先输入要发送的内容。",
      statusSending: "正在请求 DeepSeek...",
      statusLoaded: "已加载当前模型保存的本地 Key。",
      statusMissing: "当前模型还没有保存 Key。",
      statusDraft: "已把示例问题放进输入框。",
      statusCopied: "已复制当前消息文案。",
      statusRegenerated: "正在重新生成回复...",
      statusEditing: "正在编辑这条用户消息，发送后会重建后续回复。",
      statusEditCancelled: "已取消编辑。",
      you: "你",
      ai: "AI",
      userAvatar: "WK",
      aiAvatar: "AI",
      thinking: "正在思考...",
      failed: "请求失败：",
      invalid: "模型返回了空内容，请检查模型和 Key 是否有效。",
      prompt: "你是 WK1995 网站里的 AI 助手。请使用简洁、直接、专业的语气回答，优先给出可执行建议。",
      legacy: "兼容模型",
      openSettings: "打开设置面板",
      closeSettings: "关闭设置面板",
      setupTitle: "开始对话前先完成设置",
      setupBodyAll: "请选择一个模型，并为当前模型保存 DeepSeek API Key。",
      setupBodyKey: "当前模型还没有保存 API Key，请先在这里完成设置。",
      historyGroupToday: "今天",
      historyGroupWeek: "7 天内",
      historyGroupMonth: "30 天内",
      thoughtSection: "已思考",
      answerSection: "正式答复",
      replyTiming: "回复",
      answerAt: "回答于",
      editedMark: "已编辑",
      copyAction: "复制文案",
      editAction: "编辑消息",
      regenerateAction: "重新生成",
      scrollToBottom: "回到底部",
      editingTitle: "正在编辑用户消息",
      editingDescription: "保存后会从这条用户消息重新生成后续回复。",
      cancelEdit: "取消编辑",
      userRole: "用户消息",
      assistantRole: "助手回复",
    },
    en: {
      metaTitle: "AI Chat Workspace · WK1995",
      metaDescription: "An app-style AI chat workspace for history, conversation, and model settings.",
      home: "Back home",
      historyEyebrow: "History",
      historyTitle: "Chat History",
      chatEyebrow: "Conversation",
      settingsEyebrow: "Settings",
      settingsTitle: "Model Settings",
      settingsHelper: "Choose a model and save the API key in this browser.",
      modelLabel: "Model",
      keyLabel: "DeepSeek API Key",
      keyPlaceholder: "Paste the API key for the selected model",
      saveKey: "Save key",
      clearKey: "Delete current key",
      settingsNote: "Model choices and API keys stay only in this browser and are never committed.",
      savedModelsTitle: "Saved models",
      composerHint: "Enter to send, Shift + Enter for a new line",
      clearConversation: "Clear current chat",
      send: "Send",
      resend: "Save and resend",
      newChat: "New chat",
      untitled: "New chat",
      emptyTitle: "Start a fresh AI conversation",
      emptyBody: "Ask about AI, Android, blog structure, or how to sharpen this GitHub homepage.",
      starterTitle: "Try one of these prompts",
      placeholderReady: "Send a message to WK1995's AI assistant",
      placeholderMissing: "Finish the right-side setup before chatting",
      ready: "Connected",
      missing: "Key required",
      modelRequired: "Model required",
      selectModel: "Select a model",
      statusReady: "The current model is ready.",
      statusNeedSetup: "Save an API key for the current model before chatting.",
      statusSelectModel: "Choose a model first, then save the corresponding API key.",
      statusSaved: "The current model key has been saved locally.",
      statusCleared: "The current model key has been removed.",
      statusMessage: "Type a message before sending.",
      statusSending: "Calling DeepSeek...",
      statusLoaded: "Loaded the saved key for the current model.",
      statusMissing: "No key has been saved for this model yet.",
      statusDraft: "A starter prompt has been placed in the composer.",
      statusCopied: "Copied the current message text.",
      statusRegenerated: "Regenerating the reply...",
      statusEditing: "Editing this user message. Sending will rebuild the downstream reply.",
      statusEditCancelled: "Editing cancelled.",
      you: "You",
      ai: "AI",
      userAvatar: "WK",
      aiAvatar: "AI",
      thinking: "Thinking...",
      failed: "Request failed:",
      invalid: "The model returned an empty response. Check whether the selected model and key are valid.",
      prompt: "You are the AI assistant inside WK1995's website. Reply with a concise, direct, and professional tone, and prioritize actionable suggestions.",
      legacy: "Legacy model",
      openSettings: "Open settings panel",
      closeSettings: "Close settings panel",
      setupTitle: "Complete setup before starting",
      setupBodyAll: "Choose a model and save the corresponding DeepSeek API key first.",
      setupBodyKey: "The current model does not have a saved API key yet. Finish the setup here first.",
      historyGroupToday: "Today",
      historyGroupWeek: "Last 7 days",
      historyGroupMonth: "Last 30 days",
      thoughtSection: "Thought process",
      answerSection: "Answer",
      replyTiming: "Reply",
      answerAt: "Answered at",
      editedMark: "Edited",
      copyAction: "Copy message",
      editAction: "Edit message",
      regenerateAction: "Regenerate reply",
      scrollToBottom: "Scroll to bottom",
      editingTitle: "Editing a user message",
      editingDescription: "Saving will regenerate the downstream reply from this message.",
      cancelEdit: "Cancel edit",
      userRole: "User message",
      assistantRole: "Assistant reply",
    },
  };

  const refs = {};
  const state = {
    config: loadConfig(),
    conversations: [],
    activeId: "",
    busy: false,
    status: { type: "", key: "", raw: "" },
    ui: loadUi(),
    editingMessageId: "",
    scrollPinned: true,
  };

  function lang() {
    return window.WKSite && typeof window.WKSite.getLanguage === "function"
      ? window.WKSite.getLanguage()
      : "zh";
  }

  function t(key) {
    return (copy[lang()] && copy[lang()][key]) || copy.zh[key] || key;
  }

  function starters() {
    return STARTERS[lang()] || STARTERS.zh;
  }

  function icon(name) {
    const icons = {
      copy: '<path d="M3.75 2A1.75 1.75 0 0 0 2 3.75v7.5C2 12.216 2.784 13 3.75 13h5.5A1.75 1.75 0 0 0 11 11.25v-7.5A1.75 1.75 0 0 0 9.25 2h-5.5Zm7.5 2a1.75 1.75 0 0 1 1.75 1.75v5.5a1.75 1.75 0 0 1-1.75 1.75H11v-1.5h.25a.25.25 0 0 0 .25-.25v-5.5a.25.25 0 0 0-.25-.25H11V4h.25Z"></path>',
      edit: '<path d="M11.013 1.427a1.75 1.75 0 0 1 2.475 2.475l-7.63 7.63a2.25 2.25 0 0 1-.921.55l-2.19.626a.75.75 0 0 1-.928-.928l.626-2.19a2.25 2.25 0 0 1 .55-.921l7.63-7.63ZM10.5 3.06 3.9 9.66a.75.75 0 0 0-.184.307l-.347 1.215 1.215-.347a.75.75 0 0 0 .307-.184l6.6-6.6-1-.99Z"></path>',
      refresh: '<path d="M8 2.25A5.75 5.75 0 0 1 13.61 7h.89a.75.75 0 0 1 0 1.5h-2.25A.75.75 0 0 1 11.5 7V4.75a.75.75 0 0 1 1.5 0v1.05A4.25 4.25 0 1 0 8 12.25a4.22 4.22 0 0 0 3.128-1.374.75.75 0 1 1 1.102 1.018A5.72 5.72 0 0 1 8 13.75a5.75 5.75 0 1 1 0-11.5Z"></path>',
      clock: '<path d="M8 1.5a6.5 6.5 0 1 1 0 13 6.5 6.5 0 0 1 0-13Zm0 1.5a5 5 0 1 0 0 10A5 5 0 0 0 8 3Zm.75 1.5a.75.75 0 0 0-1.5 0V8c0 .199.079.39.22.53l2 2a.75.75 0 0 0 1.06-1.06L8.75 7.69V4.5Z"></path>',
    };
    return icons[name] || "";
  }

  function modelMeta(id) {
    return MODELS.find(function (item) { return item.id === id; });
  }

  function label(id) {
    const meta = modelMeta(id);
    const base = meta ? (meta.labels[lang()] || meta.labels.zh) : id;
    return meta && meta.legacy ? base + " - " + t("legacy") : base;
  }

  function now() {
    return Date.now();
  }

  function uid() {
    return "chat_" + now() + "_" + Math.random().toString(16).slice(2, 8);
  }

  function loadJson(key) {
    try {
      return JSON.parse(localStorage.getItem(key) || "{}");
    } catch (error) {
      return {};
    }
  }

  function normalizeMessage(message) {
    return {
      id: message && message.id ? message.id : uid(),
      role: message && message.role === "assistant" ? "assistant" : "user",
      content: message && typeof message.content === "string" ? message.content : "",
      reasoning: message && typeof message.reasoning === "string" ? message.reasoning : "",
      pending: Boolean(message && message.pending),
      timestamp: message && message.timestamp ? message.timestamp : now(),
      editedAt: message && message.editedAt ? message.editedAt : 0,
      thinkingMs: message && Number(message.thinkingMs) > 0 ? Number(message.thinkingMs) : 0,
      answerMs: message && Number(message.answerMs) > 0 ? Number(message.answerMs) : 0,
      totalMs: message && Number(message.totalMs) > 0 ? Number(message.totalMs) : 0,
    };
  }

  function loadConfig() {
    const raw = loadJson(CONFIG_KEY);
    const keys = {};
    Object.keys(raw.keys || {}).forEach(function (id) {
      const value = typeof raw.keys[id] === "string" ? raw.keys[id].trim() : "";
      if (value && modelMeta(id)) {
        keys[id] = value;
      }
    });
    return {
      selectedModel: modelMeta(raw.selectedModel) ? raw.selectedModel : (Object.keys(keys)[0] || ""),
      keys: keys,
    };
  }

  function saveConfig() {
    localStorage.setItem(CONFIG_KEY, JSON.stringify(state.config));
  }

  function loadUi() {
    const raw = loadJson(UI_KEY);
    return {
      settingsOpen: Boolean(raw.settingsOpen),
    };
  }

  function saveUi() {
    localStorage.setItem(UI_KEY, JSON.stringify(state.ui));
  }

  function selectedModel() {
    return modelMeta(state.config.selectedModel) ? state.config.selectedModel : "";
  }

  function keyForModel(id) {
    const target = id || selectedModel();
    return target ? state.config.keys[target] || "" : "";
  }

  function needsSetup() {
    return !selectedModel() || !keyForModel();
  }

  function statusKey() {
    if (!selectedModel()) {
      return "statusSelectModel";
    }
    return keyForModel() ? "statusReady" : "statusNeedSetup";
  }

  function savedModels() {
    return Object.keys(state.config.keys).filter(function (id) {
      return state.config.keys[id] && modelMeta(id);
    });
  }

  function formatTime(value) {
    return new Intl.DateTimeFormat(lang() === "zh" ? "zh-CN" : "en-US", {
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value));
  }

  function shortTime(value) {
    return new Intl.DateTimeFormat(lang() === "zh" ? "zh-CN" : "en-US", {
      month: "numeric",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value));
  }

  function monthLabel(value) {
    return new Intl.DateTimeFormat(lang() === "zh" ? "zh-CN" : "en-US", {
      year: "numeric",
      month: "2-digit",
    }).format(new Date(value));
  }

  function formatDuration(value) {
    const seconds = Math.max(value || 0, 80) / 1000;
    const fixed = seconds >= 10 ? seconds.toFixed(0) : seconds.toFixed(1);
    return lang() === "zh" ? fixed + " 秒" : fixed + "s";
  }

  function reasoningLabel(message) {
    return lang() === "zh"
      ? t("thoughtSection") + "（用时 " + formatDuration(message.thinkingMs || message.totalMs) + "）"
      : t("thoughtSection") + " (" + formatDuration(message.thinkingMs || message.totalMs) + ")";
  }

  function replyMetrics(message) {
    return [
      t("answerAt") + " " + formatTime(message.timestamp),
      t("thoughtSection") + " " + formatDuration(message.thinkingMs || message.totalMs),
      t("replyTiming") + " " + formatDuration(message.answerMs || message.totalMs),
    ];
  }

  function splitDurations(totalMs, reasoning, content) {
    const safeTotal = Math.max(totalMs || 0, 240);
    if (reasoning && reasoning.trim()) {
      const reasoningWeight = Math.max(reasoning.trim().length, 36);
      const answerWeight = Math.max((content || "").trim().length, 18);
      const thinkingMs = Math.round((safeTotal * reasoningWeight) / (reasoningWeight + answerWeight));
      return {
        totalMs: safeTotal,
        thinkingMs: Math.max(thinkingMs, 180),
        answerMs: Math.max(safeTotal - thinkingMs, 160),
      };
    }
    const answerMs = Math.max(Math.min(Math.round(Math.max((content || "").length, 18) * 18), Math.round(safeTotal * 0.38)), 180);
    return {
      totalMs: safeTotal,
      thinkingMs: Math.max(safeTotal - answerMs, 180),
      answerMs: answerMs,
    };
  }

  function conversationTitle(item) {
    return item.title || t("untitled");
  }

  function conversationPreview(item) {
    const visible = item.messages.filter(function (message) {
      return typeof message.content === "string" && message.content.trim() && !message.pending;
    });
    if (!visible.length) {
      return t("emptyBody");
    }
    return visible[visible.length - 1].content.trim().replace(/\s+/g, " ").slice(0, 88);
  }

  function maskKey(value) {
    if (!value) {
      return t("missing");
    }
    if (value.length <= 8) {
      return value;
    }
    return value.slice(0, 4) + "..." + value.slice(-4);
  }

  function activeConversation() {
    return state.conversations.find(function (item) { return item.id === state.activeId; }) || state.conversations[0];
  }

  function activeEditingMessage() {
    if (!state.editingMessageId) {
      return null;
    }
    return activeConversation().messages.find(function (message) {
      return message.id === state.editingMessageId && message.role === "user";
    }) || null;
  }

  function findMessageIndex(conversation, messageId) {
    return conversation.messages.findIndex(function (message) {
      return message.id === messageId;
    });
  }

  function previousUserIndex(messages, assistantIndex) {
    for (let index = assistantIndex - 1; index >= 0; index -= 1) {
      if (messages[index].role === "user") {
        return index;
      }
    }
    return -1;
  }

  function saveState() {
    localStorage.setItem(STATE_KEY, JSON.stringify({
      activeId: state.activeId,
      conversations: state.conversations,
    }));
  }

  function setStatus(type, key, raw) {
    state.status = { type: type || "", key: key || "", raw: raw || "" };
    renderStatus();
  }

  function setDraft(text) {
    refs.input.value = text;
    resizeInput();
    refs.input.focus();
    refs.input.setSelectionRange(refs.input.value.length, refs.input.value.length);
  }

  function cancelEditing(skipStatus) {
    state.editingMessageId = "";
    renderComposerState();
    if (!skipStatus) {
      setStatus("", "statusEditCancelled");
    }
  }

  function blankConversation() {
    return {
      id: uid(),
      title: "",
      createdAt: now(),
      updatedAt: now(),
      messages: [],
    };
  }

  function resizeInput() {
    refs.input.style.height = "0px";
    refs.input.style.height = Math.min(Math.max(refs.input.scrollHeight, 64), 220) + "px";
  }

  function isNearBottom() {
    const threshold = 96;
    const distance = refs.messages.scrollHeight - refs.messages.scrollTop - refs.messages.clientHeight;
    return distance <= threshold;
  }

  function syncScrollButton() {
    const conversation = activeConversation();
    refs.scrollToBottom.hidden = state.scrollPinned || !conversation.messages.length;
  }

  function scrollMessagesToBottom(behavior) {
    if (typeof refs.messages.scrollTo === "function") {
      refs.messages.scrollTo({
        top: refs.messages.scrollHeight,
        behavior: behavior || "auto",
      });
    } else {
      refs.messages.scrollTop = refs.messages.scrollHeight;
    }
    state.scrollPinned = true;
    syncScrollButton();
  }

  function handleMessageScroll() {
    state.scrollPinned = isNearBottom();
    syncScrollButton();
  }

  function initState() {
    const raw = loadJson(STATE_KEY);
    const items = Array.isArray(raw.conversations) ? raw.conversations : [];
    state.conversations = items
      .filter(function (item) {
        return item && item.id && Array.isArray(item.messages);
      })
      .map(function (item) {
        return {
          id: item.id,
          title: typeof item.title === "string" ? item.title : "",
          createdAt: item.createdAt || now(),
          updatedAt: item.updatedAt || now(),
          messages: item.messages.map(normalizeMessage),
        };
      });
    if (!state.conversations.length) {
      state.conversations = [blankConversation()];
    }
    state.activeId = state.conversations.some(function (item) {
      return item.id === raw.activeId;
    }) ? raw.activeId : state.conversations[0].id;
    if (needsSetup()) {
      state.ui.settingsOpen = true;
    }
  }

  function historyGroupLabel(value) {
    const age = now() - value;
    const day = 24 * 60 * 60 * 1000;
    if (age < day) {
      return t("historyGroupToday");
    }
    if (age < 7 * day) {
      return t("historyGroupWeek");
    }
    if (age < 30 * day) {
      return t("historyGroupMonth");
    }
    return monthLabel(value);
  }

  function setupBody() {
    return selectedModel() ? t("setupBodyKey") : t("setupBodyAll");
  }

  function setSettingsOpen(open) {
    state.ui.settingsOpen = open;
    saveUi();
    syncSettingsPanel();
  }

  function openSettings(focusTarget) {
    setSettingsOpen(true);
    if (focusTarget === "model") {
      refs.modelSelect.focus();
    } else if (focusTarget === "key") {
      refs.keyInput.focus();
    }
  }

  function closeSettings() {
    setSettingsOpen(false);
  }

  function applyStaticText() {
    document.title = t("metaTitle");
    const meta = document.querySelector('meta[name="description"]');
    if (meta) {
      meta.setAttribute("content", t("metaDescription"));
    }
    document.querySelectorAll("[data-chat-text]").forEach(function (node) {
      const key = node.dataset.chatText;
      node.textContent = t(key);
    });
    document.querySelectorAll("[data-chat-link='home']").forEach(function (node) {
      node.textContent = t("home");
    });
    document.querySelectorAll("[data-chat-aria]").forEach(function (node) {
      const key = node.dataset.chatAria;
      node.setAttribute("aria-label", t(key));
      node.setAttribute("title", t(key));
    });
    refs.keyInput.setAttribute("placeholder", t("keyPlaceholder"));
    refs.input.setAttribute("placeholder", needsSetup() ? t("placeholderMissing") : t("placeholderReady"));
    refs.editingTitle.textContent = t("editingTitle");
    refs.editingDescription.textContent = t("editingDescription");
    refs.cancelEdit.textContent = t("cancelEdit");
  }

  function renderModelSelect() {
    refs.modelSelect.innerHTML = "";
    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = t("selectModel");
    refs.modelSelect.appendChild(placeholder);
    MODELS.forEach(function (model) {
      const option = document.createElement("option");
      option.value = model.id;
      option.textContent = label(model.id);
      refs.modelSelect.appendChild(option);
    });
    refs.modelSelect.value = selectedModel();
    refs.keyInput.value = keyForModel();
  }

  function renderSetupBanner() {
    const required = needsSetup();
    refs.setupBanner.hidden = !required;
    if (!required) {
      refs.setupBanner.innerHTML = "";
      return;
    }
    refs.setupBanner.innerHTML = "<strong>" + t("setupTitle") + "</strong><p>" + setupBody() + "</p>";
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
      button.className = "chat-saved-model-item" + (id === selectedModel() ? " is-active" : "");
      title.textContent = label(id);
      detail.textContent = maskKey(state.config.keys[id]);
      button.appendChild(title);
      button.appendChild(detail);
      button.addEventListener("click", function () {
        state.config.selectedModel = id;
        saveConfig();
        renderAll();
        setStatus(keyForModel() ? "success" : "error", keyForModel() ? "statusLoaded" : "statusMissing");
        refs.keyInput.focus();
        refs.keyInput.select();
      });
      refs.savedList.appendChild(button);
    });
  }

  function renderHistory() {
    refs.history.innerHTML = "";
    let currentGroup = "";
    state.conversations
      .slice()
      .sort(function (a, b) { return b.updatedAt - a.updatedAt; })
      .forEach(function (item) {
        const labelGroup = historyGroupLabel(item.updatedAt);
        if (labelGroup !== currentGroup) {
          currentGroup = labelGroup;
          const group = document.createElement("section");
          const heading = document.createElement("h3");
          group.className = "chat-history-group";
          heading.className = "chat-history-heading";
          heading.textContent = labelGroup;
          group.appendChild(heading);
          refs.history.appendChild(group);
        }
        const container = refs.history.lastElementChild;
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
        button.addEventListener("click", function () {
          state.activeId = item.id;
          state.scrollPinned = true;
          cancelEditing(true);
          saveState();
          renderAll();
        });
        container.appendChild(button);
      });
  }

  function renderRichText(container, text) {
    container.innerHTML = "";
    const source = typeof text === "string" ? text.replace(/\r\n?/g, "\n").trim() : "";
    if (!source) {
      return;
    }
    renderMarkdownBlocks(container, source);
  }

  function safeLink(raw) {
    const input = (raw || "").trim();
    if (!input) {
      return "";
    }
    try {
      const target = new URL(input, window.location.href);
      if (["http:", "https:", "mailto:", "tel:"].indexOf(target.protocol) === -1) {
        return "";
      }
      return target.href;
    } catch (error) {
      return "";
    }
  }

  function appendInlineNodes(target, text) {
    const source = String(text || "");
    const pattern = /(\[([^\]]+)\]\(([^)\s]+)(?:\s+"([^"]*)")?\))|(`([^`]+)`)|(\*\*([^*]+)\*\*)|(~~([^~]+)~~)|(\*([^*]+)\*)|(_([^_]+)_)/g;
    let lastIndex = 0;
    let match = pattern.exec(source);
    while (match) {
      if (match.index > lastIndex) {
        target.appendChild(document.createTextNode(source.slice(lastIndex, match.index)));
      }
      if (match[1]) {
        const href = safeLink(match[3]);
        if (href) {
          const link = document.createElement("a");
          link.href = href;
          link.target = "_blank";
          link.rel = "noopener noreferrer";
          if (match[4]) {
            link.title = match[4];
          }
          appendInlineNodes(link, match[2]);
          target.appendChild(link);
        } else {
          target.appendChild(document.createTextNode(match[0]));
        }
      } else if (match[5]) {
        const code = document.createElement("code");
        code.textContent = match[6];
        target.appendChild(code);
      } else if (match[7]) {
        const strong = document.createElement("strong");
        appendInlineNodes(strong, match[8]);
        target.appendChild(strong);
      } else if (match[9]) {
        const strike = document.createElement("del");
        appendInlineNodes(strike, match[10]);
        target.appendChild(strike);
      } else if (match[11]) {
        const emphasis = document.createElement("em");
        appendInlineNodes(emphasis, match[12]);
        target.appendChild(emphasis);
      } else if (match[13]) {
        const emphasis = document.createElement("em");
        appendInlineNodes(emphasis, match[14]);
        target.appendChild(emphasis);
      }
      lastIndex = pattern.lastIndex;
      match = pattern.exec(source);
    }
    if (lastIndex < source.length) {
      target.appendChild(document.createTextNode(source.slice(lastIndex)));
    }
  }

  function appendInlineLines(target, text) {
    const lines = String(text || "").split("\n");
    lines.forEach(function (line, index) {
      if (index > 0) {
        target.appendChild(document.createElement("br"));
      }
      appendInlineNodes(target, line);
    });
  }

  function createParagraph(text) {
    const paragraph = document.createElement("p");
    appendInlineLines(paragraph, text);
    return paragraph;
  }

  function parseTableRow(line) {
    const normalized = line.trim().replace(/^\|/, "").replace(/\|$/, "");
    return normalized.split("|").map(function (cell) {
      return cell.trim();
    });
  }

  function isTableSeparator(line) {
    const cells = parseTableRow(line);
    return cells.length > 0 && cells.every(function (cell) {
      return /^:?-{3,}:?$/.test(cell);
    });
  }

  function buildList(lines, ordered) {
    const list = document.createElement(ordered ? "ol" : "ul");
    lines.forEach(function (line) {
      const item = document.createElement("li");
      const text = ordered
        ? line.replace(/^\s*\d+\.\s+/, "")
        : line.replace(/^\s*[-*•]\s+/, "");
      appendInlineLines(item, text);
      list.appendChild(item);
    });
    return list;
  }

  function buildCodeBlock(lines, language) {
    const pre = document.createElement("pre");
    const code = document.createElement("code");
    if (language) {
      code.dataset.language = language;
    }
    code.textContent = lines.join("\n");
    pre.appendChild(code);
    return pre;
  }

  function buildTable(lines) {
    const table = document.createElement("table");
    const thead = document.createElement("thead");
    const tbody = document.createElement("tbody");
    const headers = parseTableRow(lines[0]);
    const aligns = parseTableRow(lines[1]).map(function (cell) {
      if (/^:-+:$/.test(cell)) {
        return "center";
      }
      if (/^-+:$/.test(cell)) {
        return "right";
      }
      if (/^:-+$/.test(cell)) {
        return "left";
      }
      return "";
    });
    const headRow = document.createElement("tr");
    headers.forEach(function (cell, index) {
      const th = document.createElement("th");
      if (aligns[index]) {
        th.style.textAlign = aligns[index];
      }
      appendInlineLines(th, cell);
      headRow.appendChild(th);
    });
    thead.appendChild(headRow);
    lines.slice(2).forEach(function (line) {
      const row = document.createElement("tr");
      parseTableRow(line).forEach(function (cell, index) {
        const td = document.createElement("td");
        if (aligns[index]) {
          td.style.textAlign = aligns[index];
        }
        appendInlineLines(td, cell);
        row.appendChild(td);
      });
      tbody.appendChild(row);
    });
    table.appendChild(thead);
    table.appendChild(tbody);
    return table;
  }

  function renderMarkdownBlocks(container, source) {
    const lines = source.split("\n");
    let index = 0;
    while (index < lines.length) {
      const line = lines[index];
      if (!line.trim()) {
        index += 1;
        continue;
      }

      const codeMatch = line.match(/^\s*```([\w-]+)?\s*$/);
      if (codeMatch) {
        const language = codeMatch[1] || "";
        const codeLines = [];
        index += 1;
        while (index < lines.length && !/^\s*```\s*$/.test(lines[index])) {
          codeLines.push(lines[index]);
          index += 1;
        }
        if (index < lines.length) {
          index += 1;
        }
        container.appendChild(buildCodeBlock(codeLines, language));
        continue;
      }

      if (/^\s*(?:---|\*\*\*|___)\s*$/.test(line)) {
        container.appendChild(document.createElement("hr"));
        index += 1;
        continue;
      }

      const headingMatch = line.match(/^\s*(#{1,6})\s+(.*)$/);
      if (headingMatch) {
        const level = Math.min(headingMatch[1].length, 6);
        const heading = document.createElement("h" + level);
        appendInlineLines(heading, headingMatch[2].trim());
        container.appendChild(heading);
        index += 1;
        continue;
      }

      if (/^\s*>\s?/.test(line)) {
        const quoteLines = [];
        while (index < lines.length && /^\s*>\s?/.test(lines[index])) {
          quoteLines.push(lines[index].replace(/^\s*>\s?/, ""));
          index += 1;
        }
        const blockquote = document.createElement("blockquote");
        renderMarkdownBlocks(blockquote, quoteLines.join("\n"));
        container.appendChild(blockquote);
        continue;
      }

      if (index + 1 < lines.length && /\|/.test(line) && isTableSeparator(lines[index + 1])) {
        const tableLines = [line, lines[index + 1]];
        index += 2;
        while (index < lines.length && /\|/.test(lines[index]) && lines[index].trim()) {
          tableLines.push(lines[index]);
          index += 1;
        }
        container.appendChild(buildTable(tableLines));
        continue;
      }

      if (/^\s*[-*•]\s+/.test(line)) {
        const listLines = [];
        while (index < lines.length && /^\s*[-*•]\s+/.test(lines[index])) {
          listLines.push(lines[index]);
          index += 1;
        }
        container.appendChild(buildList(listLines, false));
        continue;
      }

      if (/^\s*\d+\.\s+/.test(line)) {
        const listLines = [];
        while (index < lines.length && /^\s*\d+\.\s+/.test(lines[index])) {
          listLines.push(lines[index]);
          index += 1;
        }
        container.appendChild(buildList(listLines, true));
        continue;
      }

      const paragraphLines = [];
      while (index < lines.length && lines[index].trim()) {
        if (
          /^\s*```/.test(lines[index]) ||
          /^\s*(#{1,6})\s+/.test(lines[index]) ||
          /^\s*(?:---|\*\*\*|___)\s*$/.test(lines[index]) ||
          /^\s*>\s?/.test(lines[index]) ||
          /^\s*[-*•]\s+/.test(lines[index]) ||
          /^\s*\d+\.\s+/.test(lines[index]) ||
          (index + 1 < lines.length && /\|/.test(lines[index]) && isTableSeparator(lines[index + 1]))
        ) {
          break;
        }
        paragraphLines.push(lines[index]);
        index += 1;
      }
      container.appendChild(createParagraph(paragraphLines.join("\n")));
    }
  }

  function createActionButton(kind, labelText) {
    const button = document.createElement("button");
    const sr = document.createElement("span");
    button.type = "button";
    button.className = "chat-message-action";
    button.setAttribute("aria-label", labelText);
    button.setAttribute("title", labelText);
    button.innerHTML = '<svg viewBox="0 0 16 16" aria-hidden="true">' + icon(kind) + "</svg>";
    sr.className = "sr-only";
    sr.textContent = labelText;
    button.appendChild(sr);
    return button;
  }

  function copyText(value) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(value);
    }
    return new Promise(function (resolve) {
      const area = document.createElement("textarea");
      area.value = value;
      document.body.appendChild(area);
      area.select();
      document.execCommand("copy");
      document.body.removeChild(area);
      resolve();
    });
  }

  function messageCopyPayload(message) {
    if (message.role === "assistant" && message.reasoning) {
      return t("thoughtSection") + ":\n" + message.reasoning.trim() + "\n\n" + t("ai") + ":\n" + message.content.trim();
    }
    return message.content.trim();
  }

  function renderMessage(message, index, messages) {
    const article = document.createElement("article");
    const shell = document.createElement("div");
    const avatar = document.createElement("div");
    const body = document.createElement("div");
    const header = document.createElement("div");
    const name = document.createElement("strong");
    const meta = document.createElement("span");
    const bubble = document.createElement("div");
    const content = document.createElement("div");
    const footer = document.createElement("div");
    const answerBlock = document.createElement("div");

    article.className = "chat-message";
    article.dataset.role = message.role;
    shell.className = "chat-message-shell";
    avatar.className = "chat-message-avatar";
    body.className = "chat-message-card";
    header.className = "chat-message-head";
    bubble.className = "chat-message-bubble";
    content.className = "chat-rich-text";
    footer.className = "chat-message-footer";
    answerBlock.className = "chat-answer-block";

    avatar.textContent = message.role === "user" ? t("userAvatar") : t("aiAvatar");
    avatar.setAttribute("aria-label", message.role === "user" ? t("userRole") : t("assistantRole"));

    name.textContent = message.role === "user" ? t("you") : t("ai");
    meta.textContent = formatTime(message.timestamp) + (message.role === "user" && message.editedAt ? " · " + t("editedMark") : "");
    header.appendChild(name);
    header.appendChild(meta);
    body.appendChild(header);

    if (message.role === "assistant" && message.reasoning && !message.pending) {
      const reasoning = document.createElement("details");
      const summary = document.createElement("summary");
      const reasoningBody = document.createElement("div");
      const reasoningContent = document.createElement("div");
      reasoning.className = "chat-reasoning";
      summary.textContent = reasoningLabel(message);
      reasoningContent.className = "chat-rich-text chat-rich-text--reasoning";
      renderRichText(reasoningContent, message.reasoning);
      reasoningBody.className = "chat-reasoning-body";
      reasoningBody.appendChild(reasoningContent);
      reasoning.appendChild(summary);
      reasoning.appendChild(reasoningBody);
      reasoning.open = true;
      body.appendChild(reasoning);
    }

    if (message.pending) {
      content.innerHTML = "<p>" + t("thinking") + "</p>";
      bubble.classList.add("is-pending");
    } else {
      renderRichText(content, message.content);
    }

    bubble.appendChild(content);

    if (message.role === "assistant" && !message.pending) {
      const answerLabel = document.createElement("div");
      answerLabel.className = "chat-answer-label";
      answerLabel.textContent = t("answerSection");
      answerBlock.appendChild(answerLabel);
      answerBlock.appendChild(bubble);
      body.appendChild(answerBlock);
    } else {
      body.appendChild(bubble);
    }

    if (message.role === "user" && !message.pending) {
      const copyButton = createActionButton("copy", t("copyAction"));
      const editButton = createActionButton("edit", t("editAction"));
      copyButton.addEventListener("click", function () {
        copyText(messageCopyPayload(message)).then(function () {
          setStatus("success", "statusCopied");
        });
      });
      editButton.addEventListener("click", function () {
        state.editingMessageId = message.id;
        setDraft(message.content);
        renderComposerState();
        setStatus("success", "statusEditing");
      });
      footer.appendChild(copyButton);
      footer.appendChild(editButton);
    }

    if (message.role === "assistant" && !message.pending) {
      const metrics = document.createElement("div");
      const copyButton = createActionButton("copy", t("copyAction"));
      metrics.className = "chat-message-metrics";
      replyMetrics(message).forEach(function (item) {
        const chip = document.createElement("span");
        chip.className = "chat-message-metric";
        chip.innerHTML = '<svg viewBox="0 0 16 16" aria-hidden="true">' + icon("clock") + '</svg><span>' + item + "</span>";
        metrics.appendChild(chip);
      });
      copyButton.addEventListener("click", function () {
        copyText(messageCopyPayload(message)).then(function () {
          setStatus("success", "statusCopied");
        });
      });
      footer.appendChild(copyButton);
      if (index === messages.length - 1) {
        const regenerateButton = createActionButton("refresh", t("regenerateAction"));
        regenerateButton.addEventListener("click", function () {
          regenerateReply(message.id);
        });
        footer.appendChild(regenerateButton);
      }
      footer.appendChild(metrics);
    }

    if (footer.childNodes.length) {
      body.appendChild(footer);
    }

    shell.appendChild(avatar);
    shell.appendChild(body);
    article.appendChild(shell);
    return article;
  }

  function renderConversation() {
    const conversation = activeConversation();
    const preserveScrollTop = state.scrollPinned ? null : refs.messages.scrollTop;
    refs.title.textContent = conversationTitle(conversation);
    refs.modelChip.textContent = selectedModel() ? label(selectedModel()) : t("selectModel");
    refs.connectionChip.textContent = !selectedModel() ? t("modelRequired") : (keyForModel() ? t("ready") : t("missing"));
    refs.openSettings.classList.toggle("has-alert", needsSetup());
    refs.messages.innerHTML = "";
    refs.messages.classList.toggle("is-empty", !conversation.messages.length);
    if (!conversation.messages.length) {
      const empty = document.createElement("div");
      empty.className = "chat-empty-state";
      empty.innerHTML =
        '<div class="chat-empty-mark">AI</div>' +
        "<strong>" + t("emptyTitle") + "</strong>" +
        "<p>" + t("emptyBody") + "</p>" +
        '<span class="chat-empty-label">' + t("starterTitle") + "</span>" +
        '<div class="chat-starter-grid"></div>';
      const grid = empty.querySelector(".chat-starter-grid");
      starters().forEach(function (item) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "chat-starter-button";
        button.textContent = item[0];
        button.addEventListener("click", function () {
          setDraft(item[1]);
          setStatus("success", "statusDraft");
        });
        grid.appendChild(button);
      });
      refs.messages.appendChild(empty);
      state.scrollPinned = true;
      syncScrollButton();
      return;
    }
    conversation.messages.forEach(function (message, index) {
      refs.messages.appendChild(renderMessage(message, index, conversation.messages));
    });
    if (state.scrollPinned) {
      scrollMessagesToBottom();
    } else if (preserveScrollTop !== null) {
      refs.messages.scrollTop = preserveScrollTop;
      state.scrollPinned = isNearBottom();
      syncScrollButton();
    }
  }

  function renderStatus() {
    refs.status.className = "chat-main-status";
    if (state.status.type) {
      refs.status.classList.add("is-" + state.status.type);
    }
    refs.status.textContent = state.status.raw || t(state.status.key || statusKey());
  }

  function renderComposerState() {
    const editing = activeEditingMessage();
    refs.editingBanner.hidden = !editing;
    refs.send.textContent = editing ? t("resend") : t("send");
    refs.cancelEdit.hidden = !editing;
  }

  function syncSettingsPanel() {
    const open = state.ui.settingsOpen;
    document.body.classList.toggle("chat-settings-open", open);
    refs.drawer.setAttribute("aria-hidden", open ? "false" : "true");
    refs.openSettings.setAttribute("aria-expanded", open ? "true" : "false");
  }

  function renderAll() {
    applyStaticText();
    renderModelSelect();
    renderSetupBanner();
    renderSavedModels();
    renderHistory();
    renderConversation();
    renderStatus();
    renderComposerState();
    resizeInput();
    syncSettingsPanel();
  }

  function touchConversation(item) {
    item.updatedAt = now();
    saveState();
  }

  function ensureConversationTitle(item, text) {
    if (!item.title && text) {
      item.title = text.trim().slice(0, 28);
    }
  }

  function createPendingAssistant() {
    return normalizeMessage({
      id: uid(),
      role: "assistant",
      content: "",
      reasoning: "",
      pending: true,
      timestamp: now(),
    });
  }

  function requestMessages() {
    return [{ role: "system", content: t("prompt") }].concat(
      activeConversation().messages
        .filter(function (item) {
          return (item.role === "user" || item.role === "assistant") && !item.pending;
        })
        .map(function (item) {
          return { role: item.role, content: item.content };
        })
    );
  }

  function responseReasoning(payload) {
    const choice = payload && payload.choices && payload.choices[0];
    const message = choice && choice.message;
    if (!message) {
      return "";
    }
    return typeof message.reasoning_content === "string" && message.reasoning_content.trim()
      ? message.reasoning_content.trim()
      : "";
  }

  function responseContent(payload) {
    const choice = payload && payload.choices && payload.choices[0];
    const message = choice && choice.message;
    if (!message) {
      return "";
    }
    if (typeof message.content === "string" && message.content.trim()) {
      return message.content.trim();
    }
    return "";
  }

  async function runAssistantReply(statusMessageKey) {
    const conversation = activeConversation();
    const pending = createPendingAssistant();
    const startedAt = now();
    state.scrollPinned = true;
    conversation.messages.push(pending);
    touchConversation(conversation);
    renderAll();
    state.busy = true;
    syncBusy();
    setStatus("success", statusMessageKey || "statusSending");
    try {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + keyForModel(),
        },
        body: JSON.stringify({
          model: selectedModel(),
          messages: requestMessages(),
          stream: false,
        }),
      });
      const payload = await response.json().catch(function () { return null; });
      if (!response.ok) {
        const message = payload && payload.error && (payload.error.message || payload.error.type || JSON.stringify(payload.error));
        throw new Error(message || response.statusText || "Unknown error");
      }
      const reasoning = responseReasoning(payload);
      const content = responseContent(payload) || reasoning;
      if (!content) {
        throw new Error(t("invalid"));
      }
      const durations = splitDurations(now() - startedAt, reasoning, content);
      const pendingIndex = findMessageIndex(conversation, pending.id);
      if (pendingIndex !== -1) {
        conversation.messages[pendingIndex] = normalizeMessage({
          id: pending.id,
          role: "assistant",
          content: content,
          reasoning: content === reasoning ? "" : reasoning,
          pending: false,
          timestamp: now(),
          thinkingMs: durations.thinkingMs,
          answerMs: durations.answerMs,
          totalMs: durations.totalMs,
        });
      }
      touchConversation(conversation);
      renderAll();
      setStatus("success", "statusReady");
    } catch (error) {
      const pendingIndex = findMessageIndex(conversation, pending.id);
      if (pendingIndex !== -1) {
        conversation.messages.splice(pendingIndex, 1);
      }
      touchConversation(conversation);
      renderAll();
      setStatus("error", "", t("failed") + " " + error.message);
    } finally {
      state.busy = false;
      syncBusy();
    }
  }

  async function sendMessage() {
    const text = refs.input.value.trim();
    const editing = activeEditingMessage();
    if (!text) {
      setStatus("error", "statusMessage");
      return;
    }
    if (!selectedModel()) {
      openSettings("model");
      setStatus("error", "statusSelectModel");
      return;
    }
    if (!keyForModel()) {
      openSettings("key");
      setStatus("error", "statusNeedSetup");
      return;
    }
    refs.input.value = "";
    resizeInput();
    state.scrollPinned = true;
    if (editing) {
      const conversation = activeConversation();
      const editIndex = findMessageIndex(conversation, editing.id);
      if (editIndex === -1) {
        cancelEditing(true);
        return;
      }
      conversation.messages[editIndex] = normalizeMessage({
        ...conversation.messages[editIndex],
        content: text,
        timestamp: now(),
        editedAt: now(),
      });
      conversation.messages = conversation.messages.slice(0, editIndex + 1);
      if (editIndex === 0) {
        conversation.title = text.trim().slice(0, 28);
      }
      touchConversation(conversation);
      cancelEditing(true);
      renderAll();
      await runAssistantReply("statusSending");
      return;
    }
    const conversation = activeConversation();
    const userMessage = normalizeMessage({
      role: "user",
      content: text,
      pending: false,
      timestamp: now(),
    });
    ensureConversationTitle(conversation, text);
    conversation.messages.push(userMessage);
    touchConversation(conversation);
    renderAll();
    await runAssistantReply("statusSending");
  }

  async function regenerateReply(messageId) {
    if (state.busy) {
      return;
    }
    if (!selectedModel()) {
      openSettings("model");
      setStatus("error", "statusSelectModel");
      return;
    }
    if (!keyForModel()) {
      openSettings("key");
      setStatus("error", "statusNeedSetup");
      return;
    }
    const conversation = activeConversation();
    const assistantIndex = findMessageIndex(conversation, messageId);
    if (assistantIndex === -1 || conversation.messages[assistantIndex].role !== "assistant") {
      return;
    }
    if (previousUserIndex(conversation.messages, assistantIndex) === -1) {
      return;
    }
    state.scrollPinned = true;
    conversation.messages = conversation.messages.slice(0, assistantIndex);
    touchConversation(conversation);
    renderAll();
    await runAssistantReply("statusRegenerated");
  }

  function syncBusy() {
    refs.send.disabled = state.busy;
    refs.newChat.disabled = state.busy;
    refs.clearChat.disabled = state.busy;
    refs.cancelEdit.disabled = state.busy;
    refs.input.disabled = state.busy;
    refs.modelSelect.disabled = state.busy;
    refs.keyInput.disabled = state.busy;
    refs.saveKey.disabled = state.busy;
    refs.clearKey.disabled = state.busy;
  }

  function createConversation() {
    const item = blankConversation();
    state.conversations.unshift(item);
    state.activeId = item.id;
    state.scrollPinned = true;
    cancelEditing(true);
    saveState();
    renderAll();
    refs.input.focus();
  }

  function clearConversation() {
    const conversation = activeConversation();
    conversation.title = "";
    conversation.messages = [];
    state.scrollPinned = true;
    cancelEditing(true);
    touchConversation(conversation);
    renderAll();
    setStatus("", "", "");
  }

  function saveKey() {
    const model = refs.modelSelect.value;
    const value = refs.keyInput.value.trim();
    if (!model) {
      openSettings("model");
      setStatus("error", "statusSelectModel");
      return;
    }
    if (!value) {
      openSettings("key");
      setStatus("error", "statusNeedSetup");
      return;
    }
    state.config.selectedModel = model;
    state.config.keys[model] = value;
    saveConfig();
    renderAll();
    setStatus("success", "statusSaved");
  }

  function clearKey() {
    const model = refs.modelSelect.value;
    if (!model) {
      setStatus("error", "statusSelectModel");
      return;
    }
    delete state.config.keys[model];
    saveConfig();
    state.ui.settingsOpen = true;
    saveUi();
    renderAll();
    setStatus("success", "statusCleared");
  }

  function bind() {
    refs.newChat.addEventListener("click", createConversation);
    refs.clearChat.addEventListener("click", clearConversation);
    refs.send.addEventListener("click", sendMessage);
    refs.cancelEdit.addEventListener("click", function () {
      cancelEditing();
    });
    refs.saveKey.addEventListener("click", saveKey);
    refs.clearKey.addEventListener("click", clearKey);
    refs.scrollToBottom.addEventListener("click", function () {
      scrollMessagesToBottom("smooth");
    });
    refs.openSettings.addEventListener("click", function () {
      openSettings();
    });
    refs.closeSettings.addEventListener("click", closeSettings);
    refs.backdrop.addEventListener("click", closeSettings);
    refs.modelSelect.addEventListener("change", function () {
      state.config.selectedModel = refs.modelSelect.value;
      saveConfig();
      if (!selectedModel() || !keyForModel()) {
        state.ui.settingsOpen = true;
        saveUi();
      }
      renderAll();
      if (!selectedModel()) {
        setStatus("error", "statusSelectModel");
      } else {
        setStatus(keyForModel() ? "success" : "error", keyForModel() ? "statusLoaded" : "statusMissing");
      }
    });
    refs.input.addEventListener("input", resizeInput);
    refs.messages.addEventListener("scroll", handleMessageScroll);
    refs.input.addEventListener("keydown", function (event) {
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        sendMessage();
      }
    });
    window.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && state.ui.settingsOpen) {
        closeSettings();
      }
    });
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
    refs.scrollToBottom = document.getElementById("scroll-to-bottom");
    refs.input = document.getElementById("message-input");
    refs.editingBanner = document.getElementById("editing-banner");
    refs.editingTitle = document.getElementById("editing-title");
    refs.editingDescription = document.getElementById("editing-description");
    refs.cancelEdit = document.getElementById("cancel-edit");
    refs.clearChat = document.getElementById("clear-conversation");
    refs.send = document.getElementById("send-message");
    refs.modelSelect = document.getElementById("model-select");
    refs.keyInput = document.getElementById("api-key-input");
    refs.saveKey = document.getElementById("save-key");
    refs.clearKey = document.getElementById("clear-key");
    refs.savedCount = document.getElementById("saved-model-count");
    refs.savedList = document.getElementById("saved-model-list");
    refs.openSettings = document.getElementById("open-settings");
    refs.closeSettings = document.getElementById("close-settings");
    refs.drawer = document.getElementById("settings-drawer");
    refs.backdrop = document.getElementById("settings-backdrop");
    refs.setupBanner = document.getElementById("setup-banner");
  }

  initState();
  collect();
  bind();
  renderAll();
  syncBusy();
})();
