(function () {
  const LEGACY_CONFIG_KEY = "wk1995-ai-chat-config";
  const STORAGE_BOOTSTRAP_KEY = "wk1995-ai-chat-storage-bootstrap";
  const DEFAULT_STORAGE_PATHS = {
    chatList: "wk1995/cache/chat-list",
    chatRecords: "wk1995/cache/chat-records",
    modelApi: "wk1995/cache/model-api",
  };
  const CUSTOM_MODEL_PREFIX = "custom:";
  const CUSTOM_MODEL_TYPES = {
    openai: true,
    anthropic: true,
  };
  const PROVIDERS = {
    deepseek: {
      id: "deepseek",
      apiUrl: "https://api.deepseek.com/chat/completions",
      apiStyle: "openai",
      keyLabel: { zh: "DeepSeek", en: "DeepSeek" },
      company: { zh: "DeepSeek", en: "DeepSeek" },
    },
    zhipu: {
      id: "zhipu",
      apiUrl: "https://open.bigmodel.cn/api/paas/v4/chat/completions",
      apiStyle: "openai",
      keyLabel: { zh: "智谱", en: "Zhipu" },
      company: { zh: "智谱 AI", en: "Zhipu AI" },
    },
  };
  const MODELS = [
    {
      id: "deepseek-v4-flash",
      provider: "deepseek",
      labels: { zh: "DeepSeek V4 Flash", en: "DeepSeek V4 Flash" },
      summary: {
        zh: "轻量快速的日常对话与高频调用模型。",
        en: "A fast everyday model for frequent chat workloads.",
      },
      strengths: {
        zh: ["速度优先", "文本对话", "工具接入"],
        en: ["Speed first", "Text chat", "Tool-ready"],
      },
      context: "OpenAI-compatible chat completions",
      score: 92,
    },
    {
      id: "deepseek-v4-pro",
      provider: "deepseek",
      labels: { zh: "DeepSeek V4 Pro", en: "DeepSeek V4 Pro" },
      summary: {
        zh: "更适合复杂推理、代码协作和长任务拆解。",
        en: "Better suited to complex reasoning, coding, and task breakdown.",
      },
      strengths: {
        zh: ["推理", "代码", "Agent 工作流"],
        en: ["Reasoning", "Code", "Agent workflows"],
      },
      context: "OpenAI-compatible chat completions",
      thinking: true,
      score: 96,
    },
    {
      id: "deepseek-chat",
      provider: "deepseek",
      labels: { zh: "DeepSeek Chat", en: "DeepSeek Chat" },
      summary: {
        zh: "兼容旧配置的 DeepSeek 通用聊天模型。",
        en: "Legacy-compatible DeepSeek general chat model.",
      },
      strengths: {
        zh: ["通用聊天", "旧配置兼容", "稳定"],
        en: ["General chat", "Legacy config", "Stable"],
      },
      context: "OpenAI-compatible chat completions",
      legacy: true,
      score: 88,
    },
    {
      id: "deepseek-reasoner",
      provider: "deepseek",
      labels: { zh: "DeepSeek Reasoner", en: "DeepSeek Reasoner" },
      summary: {
        zh: "面向推理链路的 DeepSeek 旧模型入口。",
        en: "Legacy DeepSeek entry for reasoning-heavy tasks.",
      },
      strengths: {
        zh: ["推理", "旧配置兼容", "问题拆解"],
        en: ["Reasoning", "Legacy config", "Problem solving"],
      },
      context: "OpenAI-compatible chat completions",
      thinking: true,
      legacy: true,
      score: 90,
    },
    {
      id: "glm-4.6",
      provider: "zhipu",
      labels: { zh: "智谱 GLM-4.6", en: "Zhipu GLM-4.6" },
      summary: {
        zh: "中文表达、工具调用和企业集成路径清晰。",
        en: "Strong Chinese output, tool use, and enterprise integration fit.",
      },
      strengths: {
        zh: ["中文任务", "推理", "企业集成"],
        en: ["Chinese tasks", "Reasoning", "Enterprise integration"],
      },
      context: "BigModel chat completions",
      thinking: true,
      score: 94,
    },
    {
      id: "glm-4.6v",
      provider: "zhipu",
      labels: { zh: "智谱 GLM-4.6V", en: "Zhipu GLM-4.6V" },
      summary: {
        zh: "适合图文理解、产品截图分析和多模态对话。",
        en: "Useful for visual understanding, screenshot review, and multimodal chat.",
      },
      strengths: {
        zh: ["视觉理解", "推理", "多模态"],
        en: ["Vision", "Reasoning", "Multimodal"],
      },
      context: "BigModel vision chat completions",
      thinking: true,
      vision: true,
      score: 95,
    },
    {
      id: "glm-4.6v-flash",
      provider: "zhipu",
      labels: { zh: "智谱 GLM-4.6V-Flash", en: "Zhipu GLM-4.6V-Flash" },
      summary: {
        zh: "偏向轻量视觉任务和快速多模态反馈。",
        en: "Optimized for lighter vision work and fast multimodal feedback.",
      },
      strengths: {
        zh: ["快速视觉", "低延迟", "多模态"],
        en: ["Fast vision", "Low latency", "Multimodal"],
      },
      context: "BigModel vision chat completions",
      thinking: true,
      vision: true,
      score: 91,
    },
  ];

  function readJson(key) {
    try {
      return JSON.parse(localStorage.getItem(key) || "{}");
    } catch (error) {
      return {};
    }
  }

  function normalizeStoragePath(value, fallback) {
    const path = typeof value === "string" ? value.trim() : "";
    return path || fallback;
  }

  function normalizedStorageConfig(raw, fallback) {
    const base = fallback || DEFAULT_STORAGE_PATHS;
    return {
      chatList: normalizeStoragePath(raw && raw.chatList, base.chatList || DEFAULT_STORAGE_PATHS.chatList),
      chatRecords: normalizeStoragePath(raw && raw.chatRecords, base.chatRecords || DEFAULT_STORAGE_PATHS.chatRecords),
      modelApi: normalizeStoragePath(raw && raw.modelApi, base.modelApi || DEFAULT_STORAGE_PATHS.modelApi),
    };
  }

  function loadStorageConfig() {
    return normalizedStorageConfig(readJson(STORAGE_BOOTSTRAP_KEY));
  }

  function storageKey(moduleName, paths) {
    const source = paths || loadStorageConfig();
    return normalizeStoragePath(source[moduleName], DEFAULT_STORAGE_PATHS[moduleName]);
  }

  function normalizeCustomModelType(value) {
    return CUSTOM_MODEL_TYPES[value] ? value : "openai";
  }

  function customModelSeed(value) {
    return String(value || "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48) || "model";
  }

  function normalizeCustomModels(rawModels) {
    const seen = {};
    return (Array.isArray(rawModels) ? rawModels : [])
      .map(function (item) {
        const model = typeof item.model === "string" ? item.model.trim() : "";
        const baseUrl = typeof item.baseUrl === "string" ? item.baseUrl.trim() : "";
        if (!model || !baseUrl) {
          return null;
        }
        const type = normalizeCustomModelType(item.type);
        const baseId = typeof item.id === "string" && item.id.indexOf(CUSTOM_MODEL_PREFIX) === 0
          ? item.id
          : CUSTOM_MODEL_PREFIX + customModelSeed(type + "-" + model + "-" + baseUrl);
        let id = baseId;
        let index = 2;
        while (seen[id]) {
          id = baseId + "-" + index;
          index += 1;
        }
        seen[id] = true;
        return {
          id: id,
          custom: true,
          type: type,
          baseUrl: baseUrl,
          model: model,
        };
      })
      .filter(Boolean);
  }

  function customModelMeta(id, source) {
    const models = Array.isArray(source) ? source : [];
    return models.find(function (item) { return item.id === id; }) || null;
  }

  function modelMeta(id, customModels) {
    return MODELS.find(function (item) { return item.id === id; }) || customModelMeta(id, customModels);
  }

  function loadConfig(paths) {
    let raw = readJson(storageKey("modelApi", paths));
    if (!Object.keys(raw).length) {
      raw = readJson(LEGACY_CONFIG_KEY);
    }
    const customModels = normalizeCustomModels(raw.customModels);
    const keys = {};
    Object.keys(raw.keys || {}).forEach(function (id) {
      const entries = normalizeKeyEntries(raw.keys[id]);
      if (entries.length && modelMeta(id, customModels)) {
        keys[id] = entries;
      }
    });
    return {
      selectedModel: modelMeta(raw.selectedModel, customModels) ? raw.selectedModel : (Object.keys(keys)[0] || ""),
      keys: keys,
      customModels: customModels,
    };
  }

  function saveConfig(config, paths) {
    localStorage.setItem(storageKey("modelApi", paths), JSON.stringify({
      selectedModel: config && typeof config.selectedModel === "string" ? config.selectedModel : "",
      keys: normalizeKeys(config && config.keys),
      customModels: normalizeCustomModels(config && config.customModels),
    }));
  }

  function normalizeKeyEntries(value) {
    const rawItems = Array.isArray(value)
      ? value
      : typeof value === "string" && value.trim()
        ? [{ key: value }]
        : [];
    return rawItems
      .map(function (item, index) {
        const key = typeof item === "string"
          ? item.trim()
          : typeof item.key === "string"
            ? item.key.trim()
            : "";
        if (!key) {
          return null;
        }
        const priority = Number(item && item.priority);
        return {
          id: item && typeof item.id === "string" && item.id ? item.id : "key_" + Date.now() + "_" + index,
          label: item && typeof item.label === "string" ? item.label.trim() : "",
          key: key,
          priority: Number.isFinite(priority) ? priority : 50,
          createdAt: item && Number(item.createdAt) > 0 ? Number(item.createdAt) : Date.now() + index,
        };
      })
      .filter(Boolean)
      .sort(function (a, b) {
        return b.priority - a.priority || a.createdAt - b.createdAt;
      });
  }

  function normalizeKeys(rawKeys) {
    const keys = {};
    Object.keys(rawKeys || {}).forEach(function (id) {
      const entries = normalizeKeyEntries(rawKeys[id]);
      if (entries.length) {
        keys[id] = entries;
      }
    });
    return keys;
  }

  function providerMeta(providerId) {
    return PROVIDERS[providerId] || PROVIDERS.deepseek;
  }

  function labelForModel(model, language) {
    if (!model) {
      return "";
    }
    if (model.custom) {
      return model.model;
    }
    const lang = language === "en" ? "en" : "zh";
    return model.labels[lang] || model.labels.zh || model.id;
  }

  window.WKModelCatalog = {
    DEFAULT_STORAGE_PATHS: DEFAULT_STORAGE_PATHS,
    CUSTOM_MODEL_PREFIX: CUSTOM_MODEL_PREFIX,
    CUSTOM_MODEL_TYPES: CUSTOM_MODEL_TYPES,
    PROVIDERS: PROVIDERS,
    MODELS: MODELS,
    loadStorageConfig: loadStorageConfig,
    normalizedStorageConfig: normalizedStorageConfig,
    storageKey: storageKey,
    normalizeCustomModels: normalizeCustomModels,
    normalizeCustomModelType: normalizeCustomModelType,
    customModelSeed: customModelSeed,
    modelMeta: modelMeta,
    providerMeta: providerMeta,
    labelForModel: labelForModel,
    loadConfig: loadConfig,
    saveConfig: saveConfig,
    normalizeKeyEntries: normalizeKeyEntries,
    normalizeKeys: normalizeKeys,
  };
})();
