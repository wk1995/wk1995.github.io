(function () {
  const STORAGE_KEY = "wk1995-ai-chat-config";
  const PROVIDER_ID = "deepseek";
  const DEEPSEEK_API_URL = "https://api.deepseek.com/chat/completions";
  const MODELS = [
    { id: "deepseek-v4-flash", labels: { zh: "DeepSeek V4 Flash", en: "DeepSeek V4 Flash" } },
    { id: "deepseek-v4-pro", labels: { zh: "DeepSeek V4 Pro", en: "DeepSeek V4 Pro" } },
    { id: "deepseek-chat", labels: { zh: "DeepSeek Chat", en: "DeepSeek Chat" }, legacy: true },
    { id: "deepseek-reasoner", labels: { zh: "DeepSeek Reasoner", en: "DeepSeek Reasoner" }, legacy: true },
  ];

  const copy = {
    zh: {
      launcher: "AI 对话",
      title: "AI 聊天助手",
      subtitle: "右侧抽屉会直接调用你配置的 DeepSeek 模型。",
      providerLabel: "服务商",
      providerValue: "DeepSeek",
      modelLabel: "大模型",
      modelPlaceholder: "请选择模型",
      keyLabel: "API Key",
      keyPlaceholder: "输入当前模型对应的 DeepSeek API Key",
      saveButton: "保存配置",
      clearKeyButton: "清空当前 Key",
      savedSummaryEmpty: "当前浏览器还没有保存任何模型的 Key。",
      savedSummaryFilled: "已保存的模型 Key：",
      note: "配置仅保存在当前浏览器的本地存储中，不会提交到仓库。",
      statusModelRequired: "请先选择一个大模型。",
      statusKeyRequired: "请先填写当前模型对应的 API Key。",
      statusSaved: "当前模型的 Key 已保存到本地。",
      statusCleared: "当前模型的本地 Key 已清除。",
      statusMessageRequired: "请输入要发送的内容。",
      statusSending: "正在请求模型，请稍候…",
      statusReady: "配置完成，可以开始对话。",
      statusLoaded: "已载入当前模型保存的本地 Key。",
      statusMissingSavedKey: "当前模型没有本地保存的 Key，请先填写并保存。",
      emptyChat: "先选择模型并填写 API Key，然后就可以在这里直接测试 DeepSeek 对话。",
      footerLabel: "消息输入",
      footerPlaceholder: "输入你的问题，按 Enter 发送，Shift + Enter 换行。",
      sendButton: "发送",
      resetButton: "清空对话",
      close: "关闭聊天面板",
      userRole: "你",
      assistantRole: "AI",
      systemRole: "提示",
      thinking: "正在思考…",
      modelLegacy: "兼容模型",
      requestFailed: "请求失败：",
      invalidResponse: "模型返回了空响应，请检查所选模型和 Key 是否有效。",
      systemPrompt: "你是 WK1995 网站里的 AI 助手。请使用简洁、直接、专业的语气回答，优先给出可执行建议。",
    },
    en: {
      launcher: "AI Chat",
      title: "AI Chat Assistant",
      subtitle: "This drawer sends requests directly to the DeepSeek model you configure.",
      providerLabel: "Provider",
      providerValue: "DeepSeek",
      modelLabel: "Model",
      modelPlaceholder: "Choose a model",
      keyLabel: "API Key",
      keyPlaceholder: "Enter the DeepSeek API key for the selected model",
      saveButton: "Save config",
      clearKeyButton: "Clear current key",
      savedSummaryEmpty: "No model keys are stored in this browser yet.",
      savedSummaryFilled: "Saved model keys:",
      note: "Configuration is stored only in this browser local storage and is not committed to the repository.",
      statusModelRequired: "Choose a model first.",
      statusKeyRequired: "Enter the API key for the selected model first.",
      statusSaved: "The key for the current model has been saved locally.",
      statusCleared: "The local key for the current model has been removed.",
      statusMessageRequired: "Enter a message before sending.",
      statusSending: "Calling the model. Please wait…",
      statusReady: "Configuration is ready. You can start chatting now.",
      statusLoaded: "Loaded the saved key for this model.",
      statusMissingSavedKey: "No saved key exists for this model yet. Enter one and save it first.",
      emptyChat: "Choose a model and enter an API key first, then you can test DeepSeek directly here.",
      footerLabel: "Message",
      footerPlaceholder: "Type your question. Press Enter to send and Shift + Enter for a new line.",
      sendButton: "Send",
      resetButton: "Clear chat",
      close: "Close chat panel",
      userRole: "You",
      assistantRole: "AI",
      systemRole: "Note",
      thinking: "Thinking…",
      modelLegacy: "Legacy model",
      requestFailed: "Request failed:",
      invalidResponse: "The model returned an empty response. Check whether the selected model and key are valid.",
      systemPrompt: "You are the AI assistant inside WK1995's website. Reply with a concise, direct, and professional tone, and prioritize actionable suggestions.",
    },
  };

  const state = {
    config: loadConfig(),
    messages: [],
    busy: false,
    status: { type: "", raw: "", key: "" },
  };

  const refs = {};

  function getLanguage() {
    if (window.WKSite && typeof window.WKSite.getLanguage === "function") {
      return window.WKSite.getLanguage();
    }
    return document.documentElement.lang.startsWith("zh") ? "zh" : "en";
  }

  function t(key) {
    const language = getLanguage();
    return (copy[language] && copy[language][key]) || copy.zh[key] || key;
  }

  function loadConfig() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
      return {
        provider: PROVIDER_ID,
        selectedModel: typeof parsed.selectedModel === "string" ? parsed.selectedModel : "",
        keys: parsed.keys && typeof parsed.keys === "object" ? parsed.keys : {},
      };
    } catch (error) {
      return {
        provider: PROVIDER_ID,
        selectedModel: "",
        keys: {},
      };
    }
  }

  function saveConfig() {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        provider: PROVIDER_ID,
        selectedModel: state.config.selectedModel,
        keys: state.config.keys,
      })
    );
  }

  function getModelMeta(modelId) {
    return MODELS.find(function (model) {
      return model.id === modelId;
    });
  }

  function getModelLabel(modelId) {
    const model = getModelMeta(modelId);
    if (!model) {
      return modelId;
    }
    const language = getLanguage();
    const base = model.labels[language] || model.labels.zh;
    return model.legacy ? base + " · " + t("modelLegacy") : base;
  }

  function buildChatUI() {
    const launcher = document.createElement("button");
    launcher.className = "chat-launcher";
    launcher.type = "button";
    launcher.innerHTML =
      '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M1.75 2A1.75 1.75 0 0 0 0 3.75v6.5C0 11.216.784 12 1.75 12h2.124l2.45 2.1a.75.75 0 0 0 1.226-.57V12h6.7A1.75 1.75 0 0 0 16 10.25v-6.5A1.75 1.75 0 0 0 14.25 2H1.75Zm1.5 3.25a.75.75 0 0 1 .75-.75h8a.75.75 0 0 1 0 1.5H4a.75.75 0 0 1-.75-.75Zm0 2.75A.75.75 0 0 1 4 7.25h5.5a.75.75 0 0 1 0 1.5H4A.75.75 0 0 1 3.25 8Z"></path></svg><span></span>';

    const overlay = document.createElement("div");
    overlay.className = "chat-overlay";

    const drawer = document.createElement("aside");
    drawer.className = "chat-drawer";
    drawer.innerHTML =
      '<div class="chat-header">' +
        '<div class="chat-header-copy">' +
          "<strong></strong>" +
          "<span></span>" +
        "</div>" +
        '<button class="chat-close" type="button" aria-label="Close"></button>' +
      "</div>" +
      '<div class="chat-config">' +
        '<div class="chat-config-grid">' +
          '<div class="chat-field">' +
            "<label></label>" +
            '<div class="chat-provider-badge"></div>' +
          "</div>" +
          '<div class="chat-field">' +
            '<label for="chat-model-select"></label>' +
            '<select class="chat-select" id="chat-model-select"></select>' +
          "</div>" +
          '<div class="chat-field">' +
            '<label for="chat-api-key"></label>' +
            '<div class="chat-input-row">' +
              '<input class="chat-input" id="chat-api-key" type="password" autocomplete="off">' +
              '<button class="chat-config-button primary" type="button"></button>' +
            "</div>" +
          "</div>" +
          '<div class="chat-config-actions">' +
            '<button class="chat-config-button" type="button"></button>' +
          "</div>" +
          '<div class="chat-config-summary"></div>' +
          '<div class="chat-config-note"></div>' +
          '<div class="chat-status" role="status" aria-live="polite"></div>' +
        "</div>" +
      "</div>" +
      '<div class="chat-body"></div>' +
      '<div class="chat-footer">' +
        '<div class="chat-footer-top">' +
          "<span></span>" +
          '<button class="chat-reset-button" type="button" aria-label="Clear"></button>' +
        "</div>" +
        '<textarea class="chat-textarea" rows="5"></textarea>' +
        '<div class="chat-footer-actions">' +
          '<button class="chat-message-send" type="button"></button>' +
        "</div>" +
      "</div>";

    document.body.append(launcher, overlay, drawer);

    refs.launcher = launcher;
    refs.launcherLabel = launcher.querySelector("span");
    refs.overlay = overlay;
    refs.drawer = drawer;
    refs.headerTitle = drawer.querySelector(".chat-header-copy strong");
    refs.headerSubtitle = drawer.querySelector(".chat-header-copy span");
    refs.close = drawer.querySelector(".chat-close");
    refs.providerLabel = drawer.querySelector(".chat-field label");
    refs.providerBadge = drawer.querySelector(".chat-provider-badge");
    refs.modelLabel = drawer.querySelectorAll(".chat-field label")[1];
    refs.modelSelect = drawer.querySelector("#chat-model-select");
    refs.keyLabel = drawer.querySelectorAll(".chat-field label")[2];
    refs.keyInput = drawer.querySelector("#chat-api-key");
    refs.saveButton = drawer.querySelector(".chat-config-button.primary");
    refs.clearKeyButton = drawer.querySelectorAll(".chat-config-button")[1];
    refs.summary = drawer.querySelector(".chat-config-summary");
    refs.note = drawer.querySelector(".chat-config-note");
    refs.status = drawer.querySelector(".chat-status");
    refs.body = drawer.querySelector(".chat-body");
    refs.footerLabel = drawer.querySelector(".chat-footer-top span");
    refs.resetButton = drawer.querySelector(".chat-reset-button");
    refs.textarea = drawer.querySelector(".chat-textarea");
    refs.sendButton = drawer.querySelector(".chat-message-send");

    refs.close.innerHTML = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3.72 3.72a.75.75 0 0 1 1.06 0L8 6.94l3.22-3.22a.75.75 0 1 1 1.06 1.06L9.06 8l3.22 3.22a.75.75 0 1 1-1.06 1.06L8 9.06l-3.22 3.22a.75.75 0 1 1-1.06-1.06L6.94 8 3.72 4.78a.75.75 0 0 1 0-1.06Z"></path></svg>';
    refs.resetButton.innerHTML = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M7.25 1a.75.75 0 0 1 .75.75V2h.25A4.75 4.75 0 0 1 13 6.75v4.5A2.75 2.75 0 0 1 10.25 14h-4.5A2.75 2.75 0 0 1 3 11.25V6.75A4.75 4.75 0 0 1 7.75 2H8v-.25A.75.75 0 0 1 8.75 1h-1.5ZM4.5 6.75v4.5c0 .69.56 1.25 1.25 1.25h4.5c.69 0 1.25-.56 1.25-1.25v-4.5A3.25 3.25 0 0 0 8.25 3.5h-.5A3.25 3.25 0 0 0 4.5 6.75Zm2 1a.75.75 0 0 1 .75.75v2.75a.75.75 0 0 1-1.5 0V8.5a.75.75 0 0 1 .75-.75Zm3 0a.75.75 0 0 1 .75.75v2.75a.75.75 0 0 1-1.5 0V8.5a.75.75 0 0 1 .75-.75Z"></path></svg>';
    refs.saveButton.innerHTML = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M7.75 1a.75.75 0 0 1 .75.75V8h1.19a.75.75 0 0 1 .53 1.28l-2.47 2.47a.75.75 0 0 1-1.06 0L4.22 9.28A.75.75 0 0 1 4.75 8H6V1.75A.75.75 0 0 1 6.75 1h1Zm-5 10.25A.75.75 0 0 1 3.5 12h9a.75.75 0 0 1 0 1.5h-9a.75.75 0 0 1-.75-.75Z"></path></svg><span></span>';
    refs.clearKeyButton.innerHTML = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M6.5 1.75A1.75 1.75 0 0 0 4.75 3.5V4H2.5a.75.75 0 0 0 0 1.5h.56l.7 7.04A2 2 0 0 0 5.75 14.5h4.5a2 2 0 0 0 1.99-1.96l.7-7.04h.56a.75.75 0 0 0 0-1.5h-2.25v-.5A1.75 1.75 0 0 0 9.5 1.75h-3Zm3.25 2.25v-.5a.25.25 0 0 0-.25-.25h-3a.25.25 0 0 0-.25.25V4h3.5ZM6.25 7a.75.75 0 0 1 .75.75v3a.75.75 0 0 1-1.5 0v-3A.75.75 0 0 1 6.25 7Zm3.5.75a.75.75 0 0 0-1.5 0v3a.75.75 0 0 0 1.5 0v-3Z"></path></svg><span></span>';
    refs.sendButton.innerHTML = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M1.27 2.15a.75.75 0 0 1 .8-.12l11.5 5.25a.75.75 0 0 1 0 1.36L2.07 13.9a.75.75 0 0 1-1.06-.82l1.02-4.08a.75.75 0 0 1 .53-.53l4.44-1.11-4.44-1.11a.75.75 0 0 1-.53-.53L1.01 2.97a.75.75 0 0 1 .26-.82Z"></path></svg><span></span>';
  }

  function renderModelOptions() {
    const currentValue = state.config.selectedModel || "";
    refs.modelSelect.innerHTML = "";

    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = t("modelPlaceholder");
    refs.modelSelect.appendChild(placeholder);

    MODELS.forEach(function (model) {
      const option = document.createElement("option");
      option.value = model.id;
      option.textContent = getModelLabel(model.id);
      refs.modelSelect.appendChild(option);
    });

    refs.modelSelect.value = currentValue;
  }

  function renderSummary() {
    const keys = state.config.keys || {};
    const savedModels = Object.keys(keys).filter(function (modelId) {
      return Boolean(keys[modelId]);
    });

    if (savedModels.length === 0) {
      refs.summary.textContent = t("savedSummaryEmpty");
      return;
    }

    refs.summary.textContent =
      t("savedSummaryFilled") +
      " " +
      savedModels.map(getModelLabel).join(" / ");
  }

  function renderStatus() {
    refs.status.className = "chat-status";
    if (state.status.type) {
      refs.status.classList.add("is-" + state.status.type);
    }

    if (state.status.raw) {
      refs.status.textContent = state.status.raw;
      return;
    }

    refs.status.textContent = state.status.key ? t(state.status.key) : "";
  }

  function setStatus(type, key, raw) {
    state.status = {
      type: type || "",
      key: key || "",
      raw: raw || "",
    };
    renderStatus();
  }

  function renderMessages() {
    refs.body.innerHTML = "";

    if (state.messages.length === 0) {
      const empty = document.createElement("div");
      empty.className = "chat-empty";
      empty.textContent = t("emptyChat");
      refs.body.appendChild(empty);
      return;
    }

    state.messages.forEach(function (message) {
      const item = document.createElement("article");
      item.className = "chat-message";
      item.dataset.role = message.role;

      const head = document.createElement("div");
      head.className = "chat-message-head";

      const role = document.createElement("span");
      role.textContent =
        message.role === "user"
          ? t("userRole")
          : message.role === "assistant"
            ? t("assistantRole")
            : t("systemRole");

      const time = document.createElement("span");
      time.textContent = message.time;

      const bubble = document.createElement("div");
      bubble.className = "chat-message-bubble";
      bubble.textContent = message.content;

      head.append(role, time);
      item.append(head, bubble);
      refs.body.appendChild(item);
    });

    refs.body.scrollTop = refs.body.scrollHeight;
  }

  function formatTime() {
    return new Intl.DateTimeFormat(getLanguage() === "zh" ? "zh-CN" : "en-US", {
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date());
  }

  function pushMessage(role, content) {
    state.messages.push({
      role: role,
      content: content,
      time: formatTime(),
    });
    renderMessages();
  }

  function replaceLastAssistantMessage(content) {
    for (let index = state.messages.length - 1; index >= 0; index -= 1) {
      if (state.messages[index].role === "assistant") {
        state.messages[index].content = content;
        state.messages[index].time = formatTime();
        break;
      }
    }
    renderMessages();
  }

  function syncBusyState() {
    refs.sendButton.disabled = state.busy;
    refs.saveButton.disabled = state.busy;
    refs.clearKeyButton.disabled = state.busy;
    refs.modelSelect.disabled = state.busy;
    refs.keyInput.disabled = state.busy;
    refs.textarea.disabled = state.busy;
  }

  function applyModelSelection(loadSavedHint) {
    state.config.selectedModel = refs.modelSelect.value;
    saveConfig();

    const savedKey = state.config.keys[state.config.selectedModel] || "";
    refs.keyInput.value = savedKey;
    renderSummary();

    if (!state.config.selectedModel) {
      setStatus("error", "statusModelRequired");
      return;
    }

    if (savedKey) {
      if (loadSavedHint) {
        setStatus("success", "statusLoaded");
      }
    } else if (loadSavedHint) {
      setStatus("error", "statusMissingSavedKey");
    }
  }

  function persistCurrentKey() {
    const model = refs.modelSelect.value;
    const key = refs.keyInput.value.trim();

    if (!model) {
      setStatus("error", "statusModelRequired");
      return null;
    }

    if (!key) {
      setStatus("error", "statusKeyRequired");
      return null;
    }

    state.config.selectedModel = model;
    state.config.keys[model] = key;
    saveConfig();
    renderSummary();
    setStatus("success", "statusSaved");
    return { model: model, key: key };
  }

  function clearCurrentKey() {
    const model = refs.modelSelect.value;
    if (!model) {
      setStatus("error", "statusModelRequired");
      return;
    }

    delete state.config.keys[model];
    if (state.config.selectedModel === model) {
      state.config.selectedModel = model;
    }
    refs.keyInput.value = "";
    saveConfig();
    renderSummary();
    setStatus("success", "statusCleared");
  }

  function getEffectiveConfig() {
    const model = refs.modelSelect.value;
    const key = refs.keyInput.value.trim();

    if (!model) {
      setStatus("error", "statusModelRequired");
      return null;
    }

    if (!key) {
      setStatus("error", "statusKeyRequired");
      return null;
    }

    state.config.selectedModel = model;
    state.config.keys[model] = key;
    saveConfig();
    renderSummary();

    return { model: model, key: key };
  }

  function buildRequestMessages(userContent) {
    const history = state.messages
      .filter(function (message) {
        return message.role === "user" || message.role === "assistant";
      })
      .map(function (message) {
        return {
          role: message.role,
          content: message.content,
        };
      });

    return [
      { role: "system", content: t("systemPrompt") },
      ...history,
      { role: "user", content: userContent },
    ];
  }

  function extractResponseText(payload) {
    const choice = payload && payload.choices && payload.choices[0];
    const message = choice && choice.message;
    if (!message) {
      return "";
    }

    if (typeof message.content === "string" && message.content.trim()) {
      return message.content.trim();
    }

    if (typeof message.reasoning_content === "string" && message.reasoning_content.trim()) {
      return message.reasoning_content.trim();
    }

    return "";
  }

  async function sendMessage() {
    const config = getEffectiveConfig();
    if (!config) {
      return;
    }

    const userMessage = refs.textarea.value.trim();
    if (!userMessage) {
      setStatus("error", "statusMessageRequired");
      return;
    }

    refs.textarea.value = "";
    pushMessage("user", userMessage);
    pushMessage("assistant", t("thinking"));
    state.busy = true;
    syncBusyState();
    setStatus("success", "statusSending");

    try {
      const response = await fetch(DEEPSEEK_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + config.key,
        },
        body: JSON.stringify({
          model: config.model,
          messages: buildRequestMessages(userMessage),
          stream: false,
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        const message =
          payload &&
          payload.error &&
          (payload.error.message || payload.error.type || JSON.stringify(payload.error));
        throw new Error(message || response.statusText);
      }

      const assistantMessage = extractResponseText(payload);
      if (!assistantMessage) {
        throw new Error(t("invalidResponse"));
      }

      replaceLastAssistantMessage(assistantMessage);
      setStatus("success", "statusReady");
    } catch (error) {
      replaceLastAssistantMessage(t("requestFailed") + " " + error.message);
      setStatus("error", "", t("requestFailed") + " " + error.message);
    } finally {
      state.busy = false;
      syncBusyState();
    }
  }

  function resetChat() {
    state.messages = [];
    renderMessages();
  }

  function openDrawer() {
    refs.overlay.classList.add("is-open");
    refs.drawer.classList.add("is-open");
    refs.textarea.focus();
  }

  function closeDrawer() {
    refs.overlay.classList.remove("is-open");
    refs.drawer.classList.remove("is-open");
  }

  function renderStaticText() {
    refs.launcherLabel.textContent = t("launcher");
    refs.headerTitle.textContent = t("title");
    refs.headerSubtitle.textContent = t("subtitle");
    refs.providerLabel.textContent = t("providerLabel");
    refs.providerBadge.textContent = t("providerValue");
    refs.modelLabel.textContent = t("modelLabel");
    refs.keyLabel.textContent = t("keyLabel");
    refs.keyInput.placeholder = t("keyPlaceholder");
    refs.saveButton.lastElementChild.textContent = t("saveButton");
    refs.clearKeyButton.lastElementChild.textContent = t("clearKeyButton");
    refs.note.textContent = t("note");
    refs.footerLabel.textContent = t("footerLabel");
    refs.textarea.placeholder = t("footerPlaceholder");
    refs.sendButton.lastElementChild.textContent = t("sendButton");
    refs.close.setAttribute("aria-label", t("close"));
    refs.close.setAttribute("title", t("close"));
    refs.resetButton.setAttribute("aria-label", t("resetButton"));
    refs.resetButton.setAttribute("title", t("resetButton"));
    renderModelOptions();
    renderSummary();
    renderStatus();
    renderMessages();
  }

  function bindEvents() {
    refs.launcher.addEventListener("click", openDrawer);
    refs.overlay.addEventListener("click", closeDrawer);
    refs.close.addEventListener("click", closeDrawer);
    refs.modelSelect.addEventListener("change", function () {
      applyModelSelection(true);
    });
    refs.saveButton.addEventListener("click", function () {
      persistCurrentKey();
    });
    refs.clearKeyButton.addEventListener("click", function () {
      clearCurrentKey();
    });
    refs.sendButton.addEventListener("click", sendMessage);
    refs.resetButton.addEventListener("click", resetChat);
    refs.textarea.addEventListener("keydown", function (event) {
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        sendMessage();
      }
    });
    window.addEventListener("wk:language-change", renderStaticText);
    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && refs.drawer.classList.contains("is-open")) {
        closeDrawer();
      }
    });
  }

  function init() {
    buildChatUI();
    bindEvents();
    renderStaticText();

    if (state.config.selectedModel) {
      refs.modelSelect.value = state.config.selectedModel;
      refs.keyInput.value = state.config.keys[state.config.selectedModel] || "";
    }

    syncBusyState();
    renderMessages();
  }

  init();
})();
