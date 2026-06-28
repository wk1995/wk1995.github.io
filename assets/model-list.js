(function () {
  const catalog = window.WKModelCatalog;
  if (!catalog) {
    return;
  }

  const text = {
    zh: {
      eyebrow: "Model Catalog",
      title: "模型选择工作台",
      intro: "按运行位置、能力和密钥状态筛选模型，选择后会写入 Chat 的本地配置。",
      chatAction: "进入 Chat",
      searchLabel: "搜索模型",
      searchPlaceholder: "DeepSeek / GLM / 本地",
      builtInTitle: "内置大模型",
      customTitle: "自定义模型",
      currentTitle: "当前模型",
      currentEmpty: "尚未选择模型",
      selected: "当前使用",
      choose: "设为当前",
      chooseBack: "设为当前",
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
      deploymentFilter: "运行位置",
      capabilityFilter: "能力",
      filterAll: "全部",
      cloud: "云端",
      offline: "离线",
      cloudDetail: "由服务商接口处理，需要网络和 API Key。",
      offlineDetail: "指向本机或内网 Base URL，可用于本地推理服务。",
      totalModels: "可选模型",
      cloudModels: "云端",
      offlineModels: "离线",
      readyModels: "已配置",
      matchSuffix: "匹配",
      apiKeyLabel: "密钥",
      locationLabel: "位置",
      capabilityLabel: "能力",
      scoreLabel: "观察值",
      endpointLabel: "接口",
      customHint: "自定义模型可在 Chat 设置中维护；本机或内网地址会标为离线。",
    },
    en: {
      eyebrow: "Model Catalog",
      title: "Model selection workbench",
      intro: "Filter models by runtime, capability, and key state. The selected model is saved into Chat's local config.",
      chatAction: "Open Chat",
      searchLabel: "Search models",
      searchPlaceholder: "DeepSeek / GLM / local",
      builtInTitle: "Built-in models",
      customTitle: "Custom models",
      currentTitle: "Current model",
      currentEmpty: "No model selected",
      selected: "Current",
      choose: "Set current",
      chooseBack: "Set current",
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
      deploymentFilter: "Runtime",
      capabilityFilter: "Capability",
      filterAll: "All",
      cloud: "Cloud",
      offline: "Offline",
      cloudDetail: "Runs through a provider endpoint and requires network plus an API key.",
      offlineDetail: "Targets localhost or private-network Base URL for local inference.",
      totalModels: "Available",
      cloudModels: "Cloud",
      offlineModels: "Offline",
      readyModels: "Configured",
      matchSuffix: "matched",
      apiKeyLabel: "Key",
      locationLabel: "Location",
      capabilityLabel: "Capability",
      scoreLabel: "Signal",
      endpointLabel: "Endpoint",
      customHint: "Custom models can be managed in Chat settings; localhost and private-network URLs are marked offline.",
    },
  };

  const refs = {};
  const query = new URLSearchParams(window.location.search);
  const fromChat = query.get("from") === "chat";
  const state = {
    storage: catalog.loadStorageConfig(),
    config: null,
    filter: "",
    deployment: "all",
    capability: "all",
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

  function localEndpointHost(hostname) {
    if (!hostname) {
      return false;
    }
    const host = hostname.toLowerCase();
    if (host === "localhost" || host === "127.0.0.1" || host === "::1" || host.endsWith(".local")) {
      return true;
    }
    const match = host.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
    if (!match) {
      return false;
    }
    const first = Number(match[1]);
    const second = Number(match[2]);
    return first === 10
      || (first === 172 && second >= 16 && second <= 31)
      || (first === 192 && second === 168);
  }

  function deploymentForModel(model) {
    if (model.custom) {
      try {
        return localEndpointHost(new URL(model.baseUrl).hostname) ? "offline" : "cloud";
      } catch (error) {
        return "cloud";
      }
    }
    return model.deployment === "offline" ? "offline" : "cloud";
  }

  function deploymentLabel(model) {
    return t(deploymentForModel(model));
  }

  function deploymentDetail(model) {
    return deploymentForModel(model) === "offline" ? t("offlineDetail") : t("cloudDetail");
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

  function allModels() {
    return allBuiltInModels().concat(customModels());
  }

  function getModelById(id) {
    return catalog.modelMeta(id, customModels());
  }

  function hasKey(id) {
    return Boolean(state.config.keys && state.config.keys[id]);
  }

  function capabilityForModel(model) {
    if (model.vision) {
      return "vision";
    }
    if (model.thinking) {
      return "reasoning";
    }
    return "text";
  }

  function matchesCapability(model) {
    if (state.capability === "all") {
      return true;
    }
    if (state.capability === "vision") {
      return Boolean(model.vision);
    }
    if (state.capability === "reasoning") {
      return Boolean(model.thinking);
    }
    return !model.vision;
  }

  function matchesActiveFilters(model) {
    const deployment = deploymentForModel(model);
    return (state.deployment === "all" || state.deployment === deployment) && matchesCapability(model);
  }

  function matchesFilter(model) {
    const value = state.filter.trim().toLowerCase();
    if (!value) {
      return matchesActiveFilters(model);
    }
    const haystack = [
      model.id,
      label(model),
      providerName(model),
      deploymentLabel(model),
      deploymentDetail(model),
      modelSummary(model),
      modelChips(model).join(" "),
      modelStrengths(model).join(" "),
    ].join(" ").toLowerCase();
    return matchesActiveFilters(model) && haystack.indexOf(value) !== -1;
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
    void goChat;
  }

  function createChip(labelText) {
    const chip = document.createElement("span");
    chip.className = "catalog-chip";
    chip.textContent = labelText;
    return chip;
  }

  function createMetaItem(termText, valueText, modifier) {
    const item = document.createElement("div");
    const term = document.createElement("dt");
    const value = document.createElement("dd");
    item.className = "model-meta-item" + (modifier ? " " + modifier : "");
    term.textContent = termText;
    value.textContent = valueText;
    item.appendChild(term);
    item.appendChild(value);
    return item;
  }

  function createModelCard(model, options) {
    const card = document.createElement("article");
    const head = document.createElement("div");
    const mark = document.createElement("span");
    const title = document.createElement("div");
    const heading = document.createElement("h3");
    const provider = document.createElement("p");
    const deployment = document.createElement("span");
    const summary = document.createElement("p");
    const meta = document.createElement("dl");
    const chips = document.createElement("div");
    const strengths = document.createElement("div");
    const actions = document.createElement("div");
    const choose = document.createElement("button");
    const active = state.config.selectedModel === model.id;
    const modelDeployment = deploymentForModel(model);

    card.className = "model-card model-card--" + modelDeployment + (active ? " is-active" : "");
    head.className = "model-card-head";
    mark.className = "model-mark";
    title.className = "model-title";
    deployment.className = "model-deployment model-deployment--" + modelDeployment;
    summary.className = "model-summary";
    meta.className = "model-meta";
    chips.className = "catalog-chip-row";
    strengths.className = "catalog-chip-row";
    actions.className = "catalog-action-row";
    choose.className = "catalog-action";
    choose.type = "button";

    mark.textContent = modelInitial(model);
    heading.textContent = label(model);
    provider.textContent = t("endpointLabel") + " · " + providerName(model);
    deployment.textContent = deploymentLabel(model);
    summary.textContent = modelSummary(model);
    choose.textContent = fromChat ? t("chooseBack") : t("choose");
    meta.appendChild(createMetaItem(t("locationLabel"), deploymentDetail(model), "model-meta-item--wide"));
    meta.appendChild(createMetaItem(t("apiKeyLabel"), hasKey(model.id) ? t("hasKey") : t("noKey"), hasKey(model.id) ? "is-ready" : ""));
    meta.appendChild(createMetaItem(t("capabilityLabel"), t(capabilityForModel(model))));
    if (typeof model.score === "number") {
      meta.appendChild(createMetaItem(t("scoreLabel"), String(model.score)));
    }

    modelChips(model).forEach(function (item) {
      chips.appendChild(createChip(item));
    });
    modelStrengths(model).forEach(function (item) {
      strengths.appendChild(createChip(item));
    });
    choose.addEventListener("click", function () {
      saveSelection(model.id, fromChat);
    });

    title.appendChild(heading);
    title.appendChild(provider);
    head.appendChild(mark);
    head.appendChild(title);
    head.appendChild(deployment);
    if (active) {
      const badge = document.createElement("span");
      badge.className = "catalog-badge";
      badge.textContent = t("selected");
      head.appendChild(badge);
    }
    actions.appendChild(choose);
    card.appendChild(head);
    card.appendChild(summary);
    card.appendChild(meta);
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

  function renderStats() {
    const models = allModels();
    const visible = models.filter(matchesFilter);
    const stats = [
      { label: t("totalModels"), value: visible.length + " / " + models.length, detail: t("matchSuffix") },
      { label: t("cloudModels"), value: models.filter(function (model) { return deploymentForModel(model) === "cloud"; }).length, detail: t("cloudDetail") },
      { label: t("offlineModels"), value: models.filter(function (model) { return deploymentForModel(model) === "offline"; }).length, detail: t("offlineDetail") },
      { label: t("readyModels"), value: models.filter(function (model) { return hasKey(model.id); }).length, detail: t("hasKey") },
    ];
    refs.stats.innerHTML = "";
    stats.forEach(function (item) {
      const card = document.createElement("div");
      const labelNode = document.createElement("span");
      const valueNode = document.createElement("strong");
      const detailNode = document.createElement("small");
      card.className = "model-stat";
      labelNode.textContent = item.label;
      valueNode.textContent = String(item.value);
      detailNode.textContent = item.detail;
      card.appendChild(labelNode);
      card.appendChild(valueNode);
      card.appendChild(detailNode);
      refs.stats.appendChild(card);
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
    detail.textContent = current ? deploymentLabel(current) + " · " + providerName(current) + " · " + modelChips(current).join(" / ") : "";
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
    renderStats();
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

  function updatePressed(container, value, attribute) {
    Array.prototype.forEach.call(container.querySelectorAll("button"), function (button) {
      button.setAttribute("aria-pressed", button.getAttribute(attribute) === value ? "true" : "false");
    });
  }

  function bind() {
    refs.search.addEventListener("input", function (event) {
      state.filter = event.target.value;
      render();
    });
    refs.deploymentFilter.addEventListener("click", function (event) {
      const target = event.target.closest("button[data-model-deployment]");
      if (!target) {
        return;
      }
      state.deployment = target.dataset.modelDeployment || "all";
      updatePressed(refs.deploymentFilter, state.deployment, "data-model-deployment");
      render();
    });
    refs.capabilityFilter.addEventListener("click", function (event) {
      const target = event.target.closest("button[data-model-capability]");
      if (!target) {
        return;
      }
      state.capability = target.dataset.modelCapability || "all";
      updatePressed(refs.capabilityFilter, state.capability, "data-model-capability");
      render();
    });
    window.addEventListener("wk:language-change", render);
  }

  function collect() {
    refs.search = document.getElementById("model-search");
    refs.current = document.getElementById("model-current");
    refs.stats = document.getElementById("model-stats");
    refs.deploymentFilter = document.getElementById("model-deployment-filter");
    refs.capabilityFilter = document.getElementById("model-capability-filter");
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
