(function () {
  const catalog = window.WKModelCatalog;
  if (!catalog) {
    return;
  }

  const text = {
    zh: {
      eyebrow: "Model Catalog",
      title: "大模型列表",
      intro: "选择具体模型后会写入 Chat 的本地配置；公司与接口属性跟随模型，不需要单独选择。",
      chatAction: "进入 Chat",
      searchLabel: "搜索模型",
      searchPlaceholder: "DeepSeek / GLM / vision",
      builtInTitle: "内置大模型",
      customTitle: "自定义模型",
      currentTitle: "当前模型",
      currentEmpty: "尚未选择模型",
      selected: "当前使用",
      choose: "设为当前",
      chooseBack: "选中并返回 Chat",
      chatWith: "用它聊天",
      saved: "已选择：",
      noResults: "没有匹配的模型",
      noResultsBody: "换一个关键词试试。",
      provider: "接口",
      customProvider: "自定义接口",
      noKey: "未保存 API Key",
      hasKey: "已保存 API Key",
      legacy: "旧入口",
      vision: "视觉",
      reasoning: "推理",
      textOnly: "文本",
      customHint: "自定义模型可在 Chat 设置中维护。",
    },
    en: {
      eyebrow: "Model Catalog",
      title: "AI model list",
      intro: "Pick a concrete model for Chat. Provider and endpoint attributes travel with the selected model.",
      chatAction: "Open Chat",
      searchLabel: "Search models",
      searchPlaceholder: "DeepSeek / GLM / vision",
      builtInTitle: "Built-in models",
      customTitle: "Custom models",
      currentTitle: "Current model",
      currentEmpty: "No model selected",
      selected: "Current",
      choose: "Set current",
      chooseBack: "Select and return",
      chatWith: "Chat with it",
      saved: "Selected: ",
      noResults: "No matching models",
      noResultsBody: "Try another keyword.",
      provider: "Endpoint",
      customProvider: "Custom endpoint",
      noKey: "No API key",
      hasKey: "API key saved",
      legacy: "Legacy",
      vision: "Vision",
      reasoning: "Reasoning",
      textOnly: "Text",
      customHint: "Custom models can be managed in Chat settings.",
    },
  };

  const refs = {};
  const query = new URLSearchParams(window.location.search);
  const fromChat = query.get("from") === "chat";
  const state = {
    storage: catalog.loadStorageConfig(),
    config: null,
    filter: "",
  };

  function lang() {
    return window.WKSite && typeof window.WKSite.getLanguage === "function"
      ? window.WKSite.getLanguage()
      : "zh";
  }

  function t(key) {
    const language = lang();
    return (text[language] && text[language][key]) || text.zh[key] || key;
  }

  function label(model) {
    return catalog.labelForModel(model, lang());
  }

  function providerName(model) {
    if (model.custom) {
      return t("customProvider");
    }
    const provider = catalog.providerMeta(model.provider);
    return (provider.company && (provider.company[lang()] || provider.company.zh))
      || (provider.keyLabel && (provider.keyLabel[lang()] || provider.keyLabel.zh))
      || model.provider;
  }

  function customTypeLabel(type) {
    return type === "anthropic" ? "Anthropic" : "OpenAI";
  }

  function modelChips(model) {
    if (model.custom) {
      return [customTypeLabel(model.type), model.baseUrl];
    }
    const chips = [model.context || t("textOnly")];
    if (model.vision) {
      chips.push(t("vision"));
    }
    if (model.thinking) {
      chips.push(t("reasoning"));
    }
    if (model.legacy) {
      chips.push(t("legacy"));
    }
    return chips;
  }

  function modelSummary(model) {
    if (model.custom) {
      return t("customHint");
    }
    return (model.summary && (model.summary[lang()] || model.summary.zh)) || "";
  }

  function modelStrengths(model) {
    if (model.custom) {
      return [customTypeLabel(model.type)];
    }
    return (model.strengths && (model.strengths[lang()] || model.strengths.zh)) || [];
  }

  function modelInitial(model) {
    return label(model).replace(/^[^a-zA-Z0-9\u4e00-\u9fa5]+/, "").slice(0, 1).toUpperCase() || "M";
  }

  function allBuiltInModels() {
    return catalog.MODELS.slice();
  }

  function customModels() {
    return Array.isArray(state.config.customModels) ? state.config.customModels : [];
  }

  function getModelById(id) {
    return catalog.modelMeta(id, customModels());
  }

  function hasKey(id) {
    return Boolean(state.config.keys && state.config.keys[id]);
  }

  function matchesFilter(model) {
    const value = state.filter.trim().toLowerCase();
    if (!value) {
      return true;
    }
    const haystack = [
      model.id,
      label(model),
      providerName(model),
      modelSummary(model),
      modelChips(model).join(" "),
      modelStrengths(model).join(" "),
    ].join(" ").toLowerCase();
    return haystack.indexOf(value) !== -1;
  }

  function saveSelection(id, goChat) {
    if (!getModelById(id)) {
      return;
    }
    state.config.selectedModel = id;
    catalog.saveConfig(state.config, state.storage);
    render();
    refs.status.className = "catalog-status is-success";
    refs.status.textContent = t("saved") + label(getModelById(id));
    if (goChat) {
      window.location.href = "../chat/";
    }
  }

  function createChip(labelText) {
    const chip = document.createElement("span");
    chip.className = "catalog-chip";
    chip.textContent = labelText;
    return chip;
  }

  function createModelCard(model, options) {
    const card = document.createElement("article");
    const head = document.createElement("div");
    const mark = document.createElement("span");
    const title = document.createElement("div");
    const heading = document.createElement("h3");
    const provider = document.createElement("p");
    const summary = document.createElement("p");
    const chips = document.createElement("div");
    const strengths = document.createElement("div");
    const actions = document.createElement("div");
    const choose = document.createElement("button");
    const chat = document.createElement("button");
    const active = state.config.selectedModel === model.id;

    card.className = "model-card" + (active ? " is-active" : "");
    head.className = "model-card-head";
    mark.className = "model-mark";
    title.className = "model-title";
    chips.className = "catalog-chip-row";
    strengths.className = "catalog-chip-row";
    actions.className = "catalog-action-row";
    choose.className = "catalog-action";
    chat.className = "catalog-secondary-action";
    choose.type = "button";
    chat.type = "button";

    mark.textContent = modelInitial(model);
    heading.textContent = label(model);
    provider.textContent = t("provider") + " · " + providerName(model) + " · " + (hasKey(model.id) ? t("hasKey") : t("noKey"));
    summary.textContent = modelSummary(model);
    choose.textContent = fromChat ? t("chooseBack") : t("choose");
    chat.textContent = t("chatWith");

    modelChips(model).forEach(function (item) {
      chips.appendChild(createChip(item));
    });
    modelStrengths(model).forEach(function (item) {
      strengths.appendChild(createChip(item));
    });
    choose.addEventListener("click", function () {
      saveSelection(model.id, fromChat);
    });
    chat.addEventListener("click", function () {
      saveSelection(model.id, true);
    });

    title.appendChild(heading);
    title.appendChild(provider);
    head.appendChild(mark);
    head.appendChild(title);
    if (active) {
      const badge = document.createElement("span");
      badge.className = "catalog-badge";
      badge.textContent = t("selected");
      head.appendChild(badge);
    }
    actions.appendChild(choose);
    actions.appendChild(chat);
    card.appendChild(head);
    card.appendChild(summary);
    card.appendChild(chips);
    if (strengths.childNodes.length) {
      card.appendChild(strengths);
    }
    card.appendChild(actions);
    return card;
  }

  function createEmptyState() {
    const empty = document.createElement("div");
    const title = document.createElement("strong");
    const body = document.createElement("span");
    empty.className = "catalog-empty";
    title.textContent = t("noResults");
    body.textContent = t("noResultsBody");
    empty.appendChild(title);
    empty.appendChild(body);
    return empty;
  }

  function renderModelGroup(container, countRef, models) {
    const visible = models.filter(matchesFilter);
    container.innerHTML = "";
    countRef.textContent = String(visible.length);
    if (!visible.length) {
      container.appendChild(createEmptyState());
      return;
    }
    visible.forEach(function (model) {
      container.appendChild(createModelCard(model));
    });
  }

  function renderCurrent() {
    const current = getModelById(state.config.selectedModel);
    refs.current.innerHTML = "";
    const labelNode = document.createElement("span");
    const strong = document.createElement("strong");
    const detail = document.createElement("small");
    labelNode.textContent = t("currentTitle");
    strong.textContent = current ? label(current) : t("currentEmpty");
    detail.textContent = current ? providerName(current) + " · " + modelChips(current).join(" / ") : "";
    refs.current.appendChild(labelNode);
    refs.current.appendChild(strong);
    if (detail.textContent) {
      refs.current.appendChild(detail);
    }
  }

  function applyStaticText() {
    document.querySelectorAll("[data-model-text]").forEach(function (node) {
      node.textContent = t(node.dataset.modelText);
    });
    refs.search.setAttribute("placeholder", t("searchPlaceholder"));
    document.title = t("title") + " · WK1995";
    const description = document.querySelector('meta[name="description"]');
    if (description) {
      description.setAttribute("content", t("intro"));
    }
  }

  function render() {
    applyStaticText();
    renderCurrent();
    renderModelGroup(refs.grid, refs.count, allBuiltInModels());
    const custom = customModels();
    refs.customSection.hidden = !custom.length;
    if (custom.length) {
      renderModelGroup(refs.customGrid, refs.customCount, custom);
    }
    if (!refs.status.textContent) {
      refs.status.textContent = "";
    }
  }

  function bind() {
    refs.search.addEventListener("input", function (event) {
      state.filter = event.target.value;
      render();
    });
    window.addEventListener("wk:language-change", render);
  }

  function collect() {
    refs.search = document.getElementById("model-search");
    refs.current = document.getElementById("model-current");
    refs.grid = document.getElementById("model-grid");
    refs.count = document.getElementById("model-count");
    refs.customSection = document.getElementById("custom-model-section");
    refs.customGrid = document.getElementById("custom-model-grid");
    refs.customCount = document.getElementById("custom-model-count");
    refs.status = document.getElementById("model-status");
  }

  function init() {
    state.config = catalog.loadConfig(state.storage);
    collect();
    bind();
    render();
  }

  init();
})();
