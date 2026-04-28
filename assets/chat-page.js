(function () {
  const LEGACY_CONFIG_KEY = "wk1995-ai-chat-config";
  const LEGACY_STATE_KEY = "wk1995-ai-chat-page-state";
  const UI_KEY = "wk1995-ai-chat-page-ui";
  const STORAGE_BOOTSTRAP_KEY = "wk1995-ai-chat-storage-bootstrap";
  const DEFAULT_STORAGE_PATHS = {
    chatList: "wk1995/cache/chat-list",
    chatRecords: "wk1995/cache/chat-records",
    modelApi: "wk1995/cache/model-api",
  };
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
      storageSectionTitle: "缓存路径",
      storageListLabel: "聊天列表缓存路径",
      storageRecordsLabel: "聊天记录缓存路径",
      storageApiLabel: "大模型 API 缓存路径",
      storagePathPlaceholder: "输入浏览器本地缓存命名空间，例如 wk1995/cache/chat-list",
      storagePathNote: "这里的“路径”是浏览器本地缓存命名空间，不是真实磁盘目录。切换路径时会把当前数据写入新路径，旧路径数据会保留。",
      saveStoragePaths: "保存路径",
      resetStoragePaths: "恢复默认",
      storageSaved: "缓存路径已保存，当前数据已写入新的本地命名空间。",
      storageReset: "缓存路径已恢复默认值。",
      backupSectionTitle: "备份与恢复",
      exportBackup: "导出整包备份",
      importBackup: "恢复备份",
      backupNote: "备份文件会包含三组缓存路径，以及聊天列表、聊天记录和模型 API 配置，方便换设备恢复。",
      exportModule: "导出",
      backupImported: "备份已恢复到当前浏览器。",
      backupInvalid: "备份文件无效或格式不正确。",
      backupExported: "备份文件已导出。",
      moduleChatList: "聊天列表",
      moduleChatRecords: "聊天记录",
      moduleModelApi: "大模型 API",
      modelLabel: "模型选择",
      keyLabel: "DeepSeek API Key",
      keyPlaceholder: "粘贴当前模型对应的 API Key",
      saveKey: "保存 Key",
      clearKey: "删除当前 Key",
      settingsNote: "模型与 Key 只保存在当前浏览器本地，不会提交到仓库。",
      savedModelsTitle: "已保存模型",
      composerHint: "Enter 发送，Shift + Enter 换行",
      dropTitle: "松开以上传附件",
      dropBody: "支持拖拽文件、粘贴图片或使用附件按钮。",
      clearConversation: "清空当前对话",
      send: "发送",
      resend: "保存并重发",
      attachAction: "附件",
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
      downloadAction: "导出回复",
      saveAttachmentAction: "另存附件",
      removeAttachmentAction: "移除附件",
      scrollToBottom: "回到底部",
      editingTitle: "正在编辑用户消息",
      editingDescription: "保存后会从这条用户消息重新生成后续回复。",
      cancelEdit: "取消编辑",
      userRole: "用户消息",
      assistantRole: "助手回复",
      pickAttachments: "选择附件",
      attachmentCount: "个附件",
      attachmentHint: "支持图片、文本、音频、视频和常见文件。文本类附件会提取内容参与对话。",
      attachmentImageOnly: "图片已附加；当前 DeepSeek 直连版本会随消息保存并可下载，但只向模型发送图片元数据。",
      attachmentReady: "附件已加入当前消息。",
      attachmentRemoved: "已移除附件。",
      attachmentTooMany: "单条消息最多保留 6 个附件。",
      attachmentTooLarge: "附件过大，当前版本仅支持 2 MB 以内的单个附件。",
      attachmentUnsupported: "无法读取该附件，请换一个文件重试。",
      attachmentNone: "暂无附件",
      attachmentSection: "附件",
      attachmentKindImage: "图片",
      attachmentKindText: "文本",
      attachmentKindAudio: "音频",
      attachmentKindVideo: "视频",
      attachmentKindFile: "文件",
      exportSuccess: "已导出当前回复。",
      exportFailed: "导出失败，请重试。",
      multimodalNotice: "DeepSeek 当前公开 chat API 在此页面按文本对话发送；文本类附件会提取内容，其他附件保留预览、下载和元数据。",
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
      storageSectionTitle: "Cache Paths",
      storageListLabel: "Chat list cache path",
      storageRecordsLabel: "Chat record cache path",
      storageApiLabel: "Model API cache path",
      storagePathPlaceholder: "Enter a browser storage namespace, for example wk1995/cache/chat-list",
      storagePathNote: "This “path” is a browser storage namespace, not a real disk folder. Switching paths writes current data into the new namespace and keeps the old one untouched.",
      saveStoragePaths: "Save paths",
      resetStoragePaths: "Reset defaults",
      storageSaved: "Cache paths have been saved and the current data has been written to the new namespaces.",
      storageReset: "Cache paths have been reset to defaults.",
      backupSectionTitle: "Backup & Restore",
      exportBackup: "Export full backup",
      importBackup: "Restore backup",
      backupNote: "The backup file contains the three cache paths plus chat list, chat records, and model API settings for device migration.",
      exportModule: "Export",
      backupImported: "The backup has been restored in this browser.",
      backupInvalid: "The backup file is invalid or uses an unsupported format.",
      backupExported: "The backup file has been exported.",
      moduleChatList: "Chat list",
      moduleChatRecords: "Chat records",
      moduleModelApi: "Model API",
      modelLabel: "Model",
      keyLabel: "DeepSeek API Key",
      keyPlaceholder: "Paste the API key for the selected model",
      saveKey: "Save key",
      clearKey: "Delete current key",
      settingsNote: "Model choices and API keys stay only in this browser and are never committed.",
      savedModelsTitle: "Saved models",
      composerHint: "Enter to send, Shift + Enter for a new line",
      dropTitle: "Drop files to attach",
      dropBody: "Drag files here, paste images, or use the attachment button.",
      clearConversation: "Clear current chat",
      send: "Send",
      resend: "Save and resend",
      attachAction: "Attach",
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
      downloadAction: "Export reply",
      saveAttachmentAction: "Save attachment",
      removeAttachmentAction: "Remove attachment",
      scrollToBottom: "Scroll to bottom",
      editingTitle: "Editing a user message",
      editingDescription: "Saving will regenerate the downstream reply from this message.",
      cancelEdit: "Cancel edit",
      userRole: "User message",
      assistantRole: "Assistant reply",
      pickAttachments: "Pick attachments",
      attachmentCount: "attachments",
      attachmentHint: "Supports images, text, audio, video, and common files. Text-like attachments are extracted into the conversation.",
      attachmentImageOnly: "The image is attached and remains downloadable in chat, but this DeepSeek direct chat flow only sends image metadata to the model.",
      attachmentReady: "Attachment added to the current message.",
      attachmentRemoved: "Attachment removed.",
      attachmentTooMany: "A single message can keep up to 6 attachments.",
      attachmentTooLarge: "The file is too large. This version supports up to 2 MB per attachment.",
      attachmentUnsupported: "This attachment could not be read. Try another file.",
      attachmentNone: "No attachments yet",
      attachmentSection: "Attachments",
      attachmentKindImage: "Image",
      attachmentKindText: "Text",
      attachmentKindAudio: "Audio",
      attachmentKindVideo: "Video",
      attachmentKindFile: "File",
      exportSuccess: "The reply has been exported.",
      exportFailed: "Export failed. Try again.",
      multimodalNotice: "This page currently sends DeepSeek chat requests as text. Text-like attachments are extracted for the model; other attachments stay available as previews, downloads, and metadata.",
    },
  };

  const refs = {};
  const MAX_ATTACHMENTS = 6;
  const MAX_ATTACHMENT_BYTES = 2 * 1024 * 1024;
  const INLINE_ATTACHMENT_TEXT_LIMIT = 12000;
  const TEXT_FILE_EXTENSIONS = {
    txt: true,
    md: true,
    markdown: true,
    json: true,
    js: true,
    jsx: true,
    ts: true,
    tsx: true,
    java: true,
    kt: true,
    kts: true,
    xml: true,
    yml: true,
    yaml: true,
    csv: true,
    tsv: true,
    html: true,
    css: true,
    scss: true,
    less: true,
    sql: true,
    gradle: true,
    properties: true,
    log: true,
    py: true,
    rb: true,
    go: true,
    rs: true,
    c: true,
    cc: true,
    cpp: true,
    h: true,
    hpp: true,
    sh: true,
    bat: true,
    ps1: true,
    swift: true,
  };
  const initialStorage = loadStorageConfig();
  const state = {
    storage: initialStorage,
    config: loadConfig(initialStorage),
    conversations: [],
    activeId: "",
    busy: false,
    status: { type: "", key: "", raw: "" },
    ui: loadUi(),
    editingMessageId: "",
    composerAttachments: [],
    dragDepth: 0,
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
      attach: '<path d="M8.75 3.5a2.75 2.75 0 0 0-5.5 0v5.75a4 4 0 1 0 8 0V4.5a2 2 0 1 0-4 0v4.75a.75.75 0 0 0 1.5 0V5a.75.75 0 0 1 1.5 0v4.25a2.5 2.5 0 1 1-5 0V3.5a1.25 1.25 0 0 1 2.5 0v5.75a2.25 2.25 0 0 0 4.5 0V4.5a3.5 3.5 0 1 0-7 0v4.75a.75.75 0 0 0 1.5 0V3.5a2 2 0 0 1 4 0v5.75a.75.75 0 0 0 1.5 0V3.5a3.5 3.5 0 0 0-3.5-3.5Z"></path>',
      close: '<path d="M3.72 3.72a.75.75 0 0 1 1.06 0L8 6.94l3.22-3.22a.75.75 0 1 1 1.06 1.06L9.06 8l3.22 3.22a.75.75 0 1 1-1.06 1.06L8 9.06l-3.22 3.22a.75.75 0 1 1-1.06-1.06L6.94 8 3.72 4.78a.75.75 0 0 1 0-1.06Z"></path>',
      download: '<path d="M8 1.75a.75.75 0 0 1 .75.75v5.19l1.72-1.72a.75.75 0 0 1 1.06 1.06l-3 3a.75.75 0 0 1-1.06 0l-3-3a.75.75 0 1 1 1.06-1.06l1.72 1.72V2.5A.75.75 0 0 1 8 1.75Zm-4.25 9.5a.75.75 0 0 1 .75.75v.25c0 .138.112.25.25.25h6.5a.25.25 0 0 0 .25-.25V12a.75.75 0 0 1 1.5 0v.25A1.75 1.75 0 0 1 11.25 14h-6.5A1.75 1.75 0 0 1 3 12.25V12a.75.75 0 0 1 .75-.75Z"></path>',
      image: '<path d="M1.75 3.5A1.75 1.75 0 0 1 3.5 1.75h9A1.75 1.75 0 0 1 14.25 3.5v9a1.75 1.75 0 0 1-1.75 1.75h-9A1.75 1.75 0 0 1 1.75 12.5v-9Zm1.5 7.19 2.1-2.54a.75.75 0 0 1 1.14-.03l1.5 1.72 1.88-2.44a.75.75 0 0 1 1.18.03l1.7 2.13V3.5a.25.25 0 0 0-.25-.25h-9a.25.25 0 0 0-.25.25v7.19ZM11.8 12.75 9.3 9.62l-1.91 2.48a.75.75 0 0 1-1.15.02L4.79 10.4l-1.54 1.87a.25.25 0 0 0 .25.23h8.3Z"></path>',
      file: '<path d="M3.5 1.75A1.75 1.75 0 0 0 1.75 3.5v9A1.75 1.75 0 0 0 3.5 14.25h9a1.75 1.75 0 0 0 1.75-1.75V6.06a1.75 1.75 0 0 0-.513-1.237L9.427.513A1.75 1.75 0 0 0 8.19 0H3.5Zm4.25 1.56 3.94 3.94H9A1.25 1.25 0 0 1 7.75 6V3.31Z"></path>',
      audio: '<path d="M10.5 2.75a.75.75 0 0 1 .75.75v6.379a2.25 2.25 0 1 1-1.5-2.12V5.31l-4 1.143v4.43a2.25 2.25 0 1 1-1.5-2.12V4.94a.75.75 0 0 1 .544-.72l5.5-1.571a.75.75 0 0 1 .206-.029Z"></path>',
      video: '<path d="M2.75 3.25A1.5 1.5 0 0 1 4.25 1.75h4.5a1.5 1.5 0 0 1 1.5 1.5v1.34l2.086-1.192A1 1 0 0 1 13.75 4.27v7.46a1 1 0 0 1-1.414.872L10.25 11.41v1.34a1.5 1.5 0 0 1-1.5 1.5h-4.5a1.5 1.5 0 0 1-1.5-1.5v-9.5Z"></path>',
    };
    return icons[name] || "";
  }

  function fileExtension(name) {
    const value = String(name || "");
    const index = value.lastIndexOf(".");
    return index === -1 ? "" : value.slice(index + 1).toLowerCase();
  }

  function attachmentKind(type, name) {
    if ((type || "").indexOf("image/") === 0) {
      return "image";
    }
    if ((type || "").indexOf("audio/") === 0) {
      return "audio";
    }
    if ((type || "").indexOf("video/") === 0) {
      return "video";
    }
    if (isTextAttachment(type, name)) {
      return "text";
    }
    return "file";
  }

  function isTextAttachment(type, name) {
    const value = (type || "").toLowerCase();
    if (value.indexOf("text/") === 0) {
      return true;
    }
    if (value.indexOf("json") !== -1 || value.indexOf("xml") !== -1 || value.indexOf("javascript") !== -1) {
      return true;
    }
    return Boolean(TEXT_FILE_EXTENSIONS[fileExtension(name)]);
  }

  function formatBytes(bytes) {
    const value = Number(bytes) || 0;
    if (value < 1024) {
      return value + " B";
    }
    if (value < 1024 * 1024) {
      return (value / 1024).toFixed(1).replace(/\.0$/, "") + " KB";
    }
    return (value / (1024 * 1024)).toFixed(1).replace(/\.0$/, "") + " MB";
  }

  function attachmentKindLabel(kind) {
    return t(
      kind === "image"
        ? "attachmentKindImage"
        : kind === "text"
          ? "attachmentKindText"
          : kind === "audio"
            ? "attachmentKindAudio"
            : kind === "video"
              ? "attachmentKindVideo"
              : "attachmentKindFile"
    );
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

  function normalizeStoragePath(value, fallback) {
    const path = typeof value === "string" ? value.trim() : "";
    return path || fallback;
  }

  function storageKey(moduleName, paths) {
    const source = paths || state.storage;
    return normalizeStoragePath(source[moduleName], DEFAULT_STORAGE_PATHS[moduleName]);
  }

  function loadStorageConfig() {
    return normalizedStorageConfig(loadJson(STORAGE_BOOTSTRAP_KEY));
  }

  function saveStorageConfig() {
    localStorage.setItem(STORAGE_BOOTSTRAP_KEY, JSON.stringify(state.storage));
  }

  function readFileAsDataUrl(file) {
    return new Promise(function (resolve, reject) {
      const reader = new FileReader();
      reader.onload = function () {
        resolve(typeof reader.result === "string" ? reader.result : "");
      };
      reader.onerror = function () {
        reject(reader.error || new Error("Failed to read file"));
      };
      reader.readAsDataURL(file);
    });
  }

  function readFileAsText(file) {
    return new Promise(function (resolve, reject) {
      const reader = new FileReader();
      reader.onload = function () {
        resolve(typeof reader.result === "string" ? reader.result : "");
      };
      reader.onerror = function () {
        reject(reader.error || new Error("Failed to read file"));
      };
      reader.readAsText(file);
    });
  }

  function cloneAttachment(attachment) {
    return {
      id: attachment && attachment.id ? attachment.id : uid(),
      name: attachment && attachment.name ? attachment.name : "attachment",
      type: attachment && attachment.type ? attachment.type : "application/octet-stream",
      size: attachment && Number(attachment.size) >= 0 ? Number(attachment.size) : 0,
      kind: attachmentKind(attachment && attachment.type, attachment && attachment.name),
      dataUrl: attachment && typeof attachment.dataUrl === "string" ? attachment.dataUrl : "",
      textContent: attachment && typeof attachment.textContent === "string" ? attachment.textContent : "",
      source: attachment && attachment.source ? attachment.source : "upload",
    };
  }

  function normalizeMessage(message) {
    return {
      id: message && message.id ? message.id : uid(),
      role: message && message.role === "assistant" ? "assistant" : "user",
      content: message && typeof message.content === "string" ? message.content : "",
      reasoning: message && typeof message.reasoning === "string" ? message.reasoning : "",
      attachments: Array.isArray(message && message.attachments) ? message.attachments.map(cloneAttachment) : [],
      pending: Boolean(message && message.pending),
      timestamp: message && message.timestamp ? message.timestamp : now(),
      editedAt: message && message.editedAt ? message.editedAt : 0,
      thinkingMs: message && Number(message.thinkingMs) > 0 ? Number(message.thinkingMs) : 0,
      answerMs: message && Number(message.answerMs) > 0 ? Number(message.answerMs) : 0,
      totalMs: message && Number(message.totalMs) > 0 ? Number(message.totalMs) : 0,
    };
  }

  function loadConfig(paths) {
    let raw = loadJson(storageKey("modelApi", paths));
    if (!Object.keys(raw).length) {
      raw = loadJson(LEGACY_CONFIG_KEY);
    }
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
    localStorage.setItem(storageKey("modelApi"), JSON.stringify(state.config));
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

  function normalizedStorageConfig(raw, fallback) {
    const base = fallback || DEFAULT_STORAGE_PATHS;
    return {
      chatList: normalizeStoragePath(raw && raw.chatList, base.chatList || DEFAULT_STORAGE_PATHS.chatList),
      chatRecords: normalizeStoragePath(raw && raw.chatRecords, base.chatRecords || DEFAULT_STORAGE_PATHS.chatRecords),
      modelApi: normalizeStoragePath(raw && raw.modelApi, base.modelApi || DEFAULT_STORAGE_PATHS.modelApi),
    };
  }

  function moduleLabel(moduleName) {
    return t(
      moduleName === "chatList"
        ? "moduleChatList"
        : moduleName === "chatRecords"
          ? "moduleChatRecords"
          : "moduleModelApi"
    );
  }

  function exportJsonFile(fileName, payload) {
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  function persistAllData(paths) {
    localStorage.setItem(storageKey("modelApi", paths), JSON.stringify(state.config));
    localStorage.setItem(
      storageKey("chatList", paths),
      JSON.stringify(listPayloadFromConversations(state.conversations, state.activeId))
    );
    localStorage.setItem(
      storageKey("chatRecords", paths),
      JSON.stringify(recordPayloadFromConversations(state.conversations))
    );
  }

  function exportModuleBackup(moduleName) {
    const payload = {
      version: 1,
      exportedAt: new Date().toISOString(),
      module: moduleName,
      storage: { [moduleName]: storageKey(moduleName) },
      data: moduleName === "chatList"
        ? listPayloadFromConversations(state.conversations, state.activeId)
        : moduleName === "chatRecords"
          ? recordPayloadFromConversations(state.conversations)
          : state.config,
    };
    exportJsonFile(
      "wk1995-ai-chat-" + moduleName + "-backup.json",
      payload
    );
    setStatus("success", "backupExported");
  }

  function exportFullBackup() {
    exportJsonFile("wk1995-ai-chat-backup.json", {
      version: 1,
      exportedAt: new Date().toISOString(),
      storage: state.storage,
      modules: {
        chatList: listPayloadFromConversations(state.conversations, state.activeId),
        chatRecords: recordPayloadFromConversations(state.conversations),
        modelApi: state.config,
      },
    });
    setStatus("success", "backupExported");
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
      return !message.pending && (
        (typeof message.content === "string" && message.content.trim()) ||
        (Array.isArray(message.attachments) && message.attachments.length)
      );
    });
    if (!visible.length) {
      return t("emptyBody");
    }
    const latest = visible[visible.length - 1];
    if (typeof latest.content === "string" && latest.content.trim()) {
      return latest.content.trim().replace(/\s+/g, " ").slice(0, 88);
    }
    return "[" + t("attachmentSection") + "] " + latest.attachments.map(function (attachment) {
      return attachment.name;
    }).join(", ").slice(0, 88);
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

  async function fileToAttachment(file, source) {
    if (!file || typeof file.size !== "number") {
      throw new Error("attachmentUnsupported");
    }
    if (file.size > MAX_ATTACHMENT_BYTES) {
      throw new Error("attachmentTooLarge");
    }
    const kind = attachmentKind(file.type, file.name);
    const attachment = {
      id: uid(),
      name: file.name || "attachment",
      type: file.type || "application/octet-stream",
      size: file.size || 0,
      kind: kind,
      dataUrl: "",
      textContent: "",
      source: source || "upload",
    };
    if (kind === "text") {
      attachment.textContent = await readFileAsText(file);
    }
    attachment.dataUrl = await readFileAsDataUrl(file);
    return attachment;
  }

  function cloneAttachments(items) {
    return Array.isArray(items) ? items.map(cloneAttachment) : [];
  }

  function clearComposerAttachments(skipRender) {
    state.composerAttachments = [];
    if (refs.attachmentInput) {
      refs.attachmentInput.value = "";
    }
    if (!skipRender) {
      renderComposerState();
    }
  }

  function removeComposerAttachment(id) {
    state.composerAttachments = state.composerAttachments.filter(function (attachment) {
      return attachment.id !== id;
    });
    renderComposerState();
    setStatus("success", "attachmentRemoved");
  }

  function downloadDataUrl(name, dataUrl) {
    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = name || "download";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  function exportMessage(message) {
    const name = "reply-" + new Date(message.timestamp).toISOString().replace(/[:.]/g, "-") + ".md";
    const body = messageCopyPayload(message);
    const blob = new Blob([body], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  async function addComposerFiles(list, source) {
    const files = Array.from(list || []).filter(function (item) {
      return item && typeof item.name === "string";
    });
    if (!files.length) {
      return;
    }
    const nextTotal = state.composerAttachments.length + files.length;
    if (nextTotal > MAX_ATTACHMENTS) {
      setStatus("error", "attachmentTooMany");
      return;
    }
    const attachments = [];
    for (let index = 0; index < files.length; index += 1) {
      try {
        attachments.push(await fileToAttachment(files[index], source));
      } catch (error) {
        setStatus("error", error && error.message ? error.message : "attachmentUnsupported");
        return;
      }
    }
    state.composerAttachments = state.composerAttachments.concat(attachments);
    if (refs.attachmentInput) {
      refs.attachmentInput.value = "";
    }
    renderComposerState();
    const hasImageOnly = attachments.some(function (attachment) {
      return attachment.kind === "image";
    });
    setStatus("success", hasImageOnly ? "attachmentImageOnly" : "attachmentReady");
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

  function listPayloadFromConversations(conversations, activeId) {
    return {
      activeId: activeId || "",
      conversations: conversations.map(function (item) {
        return {
          id: item.id,
          title: item.title,
          createdAt: item.createdAt,
          updatedAt: item.updatedAt,
        };
      }),
    };
  }

  function recordPayloadFromConversations(conversations) {
    return {
      conversations: conversations.map(function (item) {
        return {
          id: item.id,
          messages: item.messages.map(normalizeMessage),
        };
      }),
    };
  }

  function loadConversationState(paths) {
    let listRaw = loadJson(storageKey("chatList", paths));
    let recordRaw = loadJson(storageKey("chatRecords", paths));
    const hasList = Array.isArray(listRaw.conversations);
    const hasRecords = Array.isArray(recordRaw.conversations);
    if (!hasList && !hasRecords) {
      const legacy = loadJson(LEGACY_STATE_KEY);
      const items = Array.isArray(legacy.conversations) ? legacy.conversations : [];
      return {
        activeId: typeof legacy.activeId === "string" ? legacy.activeId : "",
        conversations: items
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
          }),
      };
    }
    const metaMap = {};
    (Array.isArray(listRaw.conversations) ? listRaw.conversations : []).forEach(function (item) {
      if (item && item.id) {
        metaMap[item.id] = {
          id: item.id,
          title: typeof item.title === "string" ? item.title : "",
          createdAt: item.createdAt || now(),
          updatedAt: item.updatedAt || now(),
          messages: [],
        };
      }
    });
    (Array.isArray(recordRaw.conversations) ? recordRaw.conversations : []).forEach(function (item) {
      if (!item || !item.id || !Array.isArray(item.messages)) {
        return;
      }
      if (!metaMap[item.id]) {
        metaMap[item.id] = {
          id: item.id,
          title: "",
          createdAt: now(),
          updatedAt: now(),
          messages: [],
        };
      }
      metaMap[item.id].messages = item.messages.map(normalizeMessage);
    });
    const conversations = Object.keys(metaMap).map(function (id) {
      return metaMap[id];
    }).sort(function (a, b) {
      return b.updatedAt - a.updatedAt;
    });
    return {
      activeId: typeof listRaw.activeId === "string" ? listRaw.activeId : "",
      conversations: conversations,
    };
  }

  function applyConversationState(raw) {
    state.conversations = Array.isArray(raw && raw.conversations) ? raw.conversations : [];
    if (!state.conversations.length) {
      state.conversations = [blankConversation()];
    }
    state.activeId = state.conversations.some(function (item) {
      return item.id === raw.activeId;
    }) ? raw.activeId : state.conversations[0].id;
  }

  function saveState() {
    try {
      localStorage.setItem(
        storageKey("chatList"),
        JSON.stringify(listPayloadFromConversations(state.conversations, state.activeId))
      );
      localStorage.setItem(
        storageKey("chatRecords"),
        JSON.stringify(recordPayloadFromConversations(state.conversations))
      );
    } catch (error) {
      console.warn("Failed to persist chat state", error);
    }
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

  function setDropzoneActive(active) {
    refs.composerDropzone.hidden = !active;
    refs.composer.classList.toggle("is-dragging", active);
  }

  function extractFilesFromItems(items) {
    const files = [];
    Array.from(items || []).forEach(function (item) {
      if (item.kind === "file") {
        const file = item.getAsFile();
        if (file) {
          files.push(file);
        }
      }
    });
    return files;
  }

  function initState() {
    const raw = loadConversationState(state.storage);
    applyConversationState(raw);
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
    refs.storageChatList.setAttribute("placeholder", t("storagePathPlaceholder"));
    refs.storageChatRecords.setAttribute("placeholder", t("storagePathPlaceholder"));
    refs.storageModelApi.setAttribute("placeholder", t("storagePathPlaceholder"));
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
    const attachmentText = Array.isArray(message.attachments) && message.attachments.length
      ? "\n\n" + t("attachmentSection") + ":\n" + message.attachments.map(function (attachment, index) {
        return (index + 1) + ". " + attachment.name + " (" + attachmentKindLabel(attachment.kind) + ", " + formatBytes(attachment.size) + ")";
      }).join("\n")
      : "";
    if (message.role === "assistant" && message.reasoning) {
      return t("thoughtSection") + ":\n" + message.reasoning.trim() + "\n\n" + t("ai") + ":\n" + message.content.trim() + attachmentText;
    }
    return message.content.trim() + attachmentText;
  }

  function attachmentSummary(attachment) {
    return attachmentKindLabel(attachment.kind) + " · " + formatBytes(attachment.size);
  }

  function attachmentIcon(attachment) {
    return attachment.kind === "image"
      ? "image"
      : attachment.kind === "audio"
        ? "audio"
        : attachment.kind === "video"
          ? "video"
          : "file";
  }

  function renderAttachmentCollection(target, attachments, options) {
    if (!Array.isArray(attachments) || !attachments.length) {
      target.hidden = true;
      target.innerHTML = "";
      return;
    }
    const config = options || {};
    target.hidden = false;
    target.innerHTML = "";
    attachments.forEach(function (attachment) {
      const card = document.createElement("article");
      const header = document.createElement("div");
      const label = document.createElement("div");
      const title = document.createElement("strong");
      const meta = document.createElement("span");
      const actions = document.createElement("div");
      const preview = document.createElement("div");

      card.className = "chat-attachment-card" + (attachment.kind === "image" ? " is-image" : "");
      header.className = "chat-attachment-head";
      label.className = "chat-attachment-label";
      meta.className = "chat-attachment-meta";
      actions.className = "chat-attachment-actions";
      preview.className = "chat-attachment-preview";

      title.textContent = attachment.name;
      meta.textContent = attachmentSummary(attachment);
      label.innerHTML = '<span class="chat-attachment-icon" aria-hidden="true"><svg viewBox="0 0 16 16">' + icon(attachmentIcon(attachment)) + "</svg></span>";
      label.appendChild(title);
      label.appendChild(meta);

      if (attachment.kind === "image" && attachment.dataUrl) {
        const image = document.createElement("img");
        image.src = attachment.dataUrl;
        image.alt = attachment.name;
        preview.appendChild(image);
      } else if (attachment.kind === "text" && attachment.textContent) {
        const snippet = document.createElement("pre");
        snippet.textContent = attachment.textContent.slice(0, 320);
        preview.appendChild(snippet);
      } else {
        const hint = document.createElement("span");
        hint.textContent = attachmentKindLabel(attachment.kind);
        preview.appendChild(hint);
      }

      if (attachment.dataUrl) {
        const download = document.createElement("button");
        download.type = "button";
        download.className = "chat-attachment-action";
        download.innerHTML = '<svg viewBox="0 0 16 16" aria-hidden="true">' + icon("download") + '</svg><span>' + t("saveAttachmentAction") + "</span>";
        download.addEventListener("click", function () {
          downloadDataUrl(attachment.name, attachment.dataUrl);
        });
        actions.appendChild(download);
      }

      if (typeof config.onRemove === "function") {
        const remove = document.createElement("button");
        remove.type = "button";
        remove.className = "chat-attachment-action is-danger";
        remove.innerHTML = '<svg viewBox="0 0 16 16" aria-hidden="true">' + icon("close") + '</svg><span>' + t("removeAttachmentAction") + "</span>";
        remove.addEventListener("click", function () {
          config.onRemove(attachment.id);
        });
        actions.appendChild(remove);
      }

      header.appendChild(label);
      header.appendChild(actions);
      card.appendChild(header);
      card.appendChild(preview);
      target.appendChild(card);
    });
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
    const attachments = document.createElement("div");
    const hasContent = Boolean((message.content || "").trim()) || message.pending;

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
    attachments.className = "chat-message-attachments";

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

    renderAttachmentCollection(attachments, message.attachments || []);
    if (!attachments.hidden) {
      body.appendChild(attachments);
    }

    if (hasContent) {
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
        state.composerAttachments = cloneAttachments(message.attachments);
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
      const exportButton = createActionButton("download", t("downloadAction"));
      exportButton.addEventListener("click", function () {
        try {
          exportMessage(message);
          setStatus("success", "exportSuccess");
        } catch (error) {
          setStatus("error", "exportFailed");
        }
      });
      footer.appendChild(exportButton);
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
    renderAttachmentCollection(refs.composerAttachments, state.composerAttachments, {
      onRemove: removeComposerAttachment,
    });
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
    renderStorageSettings();
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

  function ensureConversationTitle(item, text, attachments) {
    if (!item.title && text) {
      item.title = text.trim().slice(0, 28);
      return;
    }
    if (!item.title && Array.isArray(attachments) && attachments.length) {
      item.title = attachments[0].name.slice(0, 28);
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

  function attachmentPromptSection(attachment, index) {
    const lines = [
      "[" + (index + 1) + "] " + attachment.name,
      "- type: " + attachment.type,
      "- size: " + formatBytes(attachment.size),
      "- kind: " + attachment.kind,
    ];
    if (attachment.kind === "text" && attachment.textContent) {
      lines.push("- extracted_text:");
      lines.push(attachment.textContent.slice(0, INLINE_ATTACHMENT_TEXT_LIMIT));
    } else if (attachment.kind === "image") {
      lines.push("- note: " + t("attachmentImageOnly"));
    } else {
      lines.push("- note: " + t("multimodalNotice"));
    }
    return lines.join("\n");
  }

  function composeUserMessageContent(message) {
    const base = (message.content || "").trim();
    if (!Array.isArray(message.attachments) || !message.attachments.length) {
      return base;
    }
    const sections = message.attachments.map(function (attachment, index) {
      return attachmentPromptSection(attachment, index);
    });
    return (base ? base + "\n\n" : "") + "[" + t("attachmentSection") + "]\n" + sections.join("\n\n");
  }

  function requestMessages() {
    return [{ role: "system", content: t("prompt") }].concat(
      activeConversation().messages
        .filter(function (item) {
          return (item.role === "user" || item.role === "assistant") && !item.pending;
        })
        .map(function (item) {
          return {
            role: item.role,
            content: item.role === "user" ? composeUserMessageContent(item) : item.content,
          };
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
    const draftAttachments = cloneAttachments(state.composerAttachments);
    if (!text) {
      if (!draftAttachments.length) {
        setStatus("error", "statusMessage");
        return;
      }
    }
    if (!text && !draftAttachments.length) {
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
        attachments: draftAttachments,
        timestamp: now(),
        editedAt: now(),
      });
      conversation.messages = conversation.messages.slice(0, editIndex + 1);
      if (editIndex === 0) {
        conversation.title = text.trim()
          ? text.trim().slice(0, 28)
          : (draftAttachments[0] ? draftAttachments[0].name.slice(0, 28) : "");
      }
      touchConversation(conversation);
      clearComposerAttachments(true);
      cancelEditing(true);
      renderAll();
      await runAssistantReply("statusSending");
      return;
    }
    const conversation = activeConversation();
    const userMessage = normalizeMessage({
      role: "user",
      content: text,
      attachments: draftAttachments,
      pending: false,
      timestamp: now(),
    });
    ensureConversationTitle(conversation, text, draftAttachments);
    conversation.messages.push(userMessage);
    touchConversation(conversation);
    clearComposerAttachments(true);
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
    refs.pickAttachments.disabled = state.busy;
    refs.attachmentInput.disabled = state.busy;
    refs.input.disabled = state.busy;
    refs.modelSelect.disabled = state.busy;
    refs.keyInput.disabled = state.busy;
    refs.saveKey.disabled = state.busy;
    refs.clearKey.disabled = state.busy;
    refs.storageChatList.disabled = state.busy;
    refs.storageChatRecords.disabled = state.busy;
    refs.storageModelApi.disabled = state.busy;
    refs.saveStoragePaths.disabled = state.busy;
    refs.resetStoragePaths.disabled = state.busy;
    refs.exportChatList.disabled = state.busy;
    refs.exportChatRecords.disabled = state.busy;
    refs.exportModelApi.disabled = state.busy;
    refs.exportBackup.disabled = state.busy;
    refs.importBackup.disabled = state.busy;
    refs.backupImportInput.disabled = state.busy;
  }

  function createConversation() {
    const item = blankConversation();
    state.conversations.unshift(item);
    state.activeId = item.id;
    state.scrollPinned = true;
    clearComposerAttachments(true);
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
    clearComposerAttachments(true);
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

  function currentStorageInputs() {
    return normalizedStorageConfig({
      chatList: refs.storageChatList.value,
      chatRecords: refs.storageChatRecords.value,
      modelApi: refs.storageModelApi.value,
    }, state.storage);
  }

  function renderStorageSettings() {
    refs.storageChatList.value = storageKey("chatList");
    refs.storageChatRecords.value = storageKey("chatRecords");
    refs.storageModelApi.value = storageKey("modelApi");
  }

  function saveStoragePaths() {
    const next = currentStorageInputs();
    persistAllData(next);
    state.storage = next;
    saveStorageConfig();
    state.config = loadConfig(state.storage);
    applyConversationState(loadConversationState(state.storage));
    renderAll();
    setStatus("success", "storageSaved");
  }

  function resetStoragePaths() {
    state.storage = normalizedStorageConfig(DEFAULT_STORAGE_PATHS, DEFAULT_STORAGE_PATHS);
    persistAllData(state.storage);
    saveStorageConfig();
    state.config = loadConfig(state.storage);
    applyConversationState(loadConversationState(state.storage));
    renderAll();
    setStatus("success", "storageReset");
  }

  async function importBackupFile(file) {
    try {
      const text = await readFileAsText(file);
      const payload = JSON.parse(text);
      if (!payload || typeof payload !== "object") {
        throw new Error("backupInvalid");
      }
      let nextStorage = state.storage;
      if (payload.storage && typeof payload.storage === "object") {
        nextStorage = normalizedStorageConfig(payload.storage, state.storage);
      }
      if (payload.modules && typeof payload.modules === "object") {
        if (payload.modules.modelApi) {
          localStorage.setItem(storageKey("modelApi", nextStorage), JSON.stringify(payload.modules.modelApi));
        }
        if (payload.modules.chatList) {
          localStorage.setItem(storageKey("chatList", nextStorage), JSON.stringify(payload.modules.chatList));
        }
        if (payload.modules.chatRecords) {
          localStorage.setItem(storageKey("chatRecords", nextStorage), JSON.stringify(payload.modules.chatRecords));
        }
      } else if (payload.module && payload.data) {
        if (payload.module === "modelApi") {
          localStorage.setItem(storageKey("modelApi", nextStorage), JSON.stringify(payload.data));
        } else if (payload.module === "chatList") {
          localStorage.setItem(storageKey("chatList", nextStorage), JSON.stringify(payload.data));
        } else if (payload.module === "chatRecords") {
          localStorage.setItem(storageKey("chatRecords", nextStorage), JSON.stringify(payload.data));
        } else {
          throw new Error("backupInvalid");
        }
      } else {
        throw new Error("backupInvalid");
      }
      state.storage = nextStorage;
      saveStorageConfig();
      state.config = loadConfig(state.storage);
      applyConversationState(loadConversationState(state.storage));
      clearComposerAttachments(true);
      cancelEditing(true);
      renderAll();
      setStatus("success", "backupImported");
    } catch (error) {
      setStatus("error", error && error.message ? error.message : "backupInvalid");
    } finally {
      refs.backupImportInput.value = "";
    }
  }

  function bind() {
    refs.newChat.addEventListener("click", createConversation);
    refs.clearChat.addEventListener("click", clearConversation);
    refs.send.addEventListener("click", sendMessage);
    refs.pickAttachments.addEventListener("click", function () {
      refs.attachmentInput.click();
    });
    refs.cancelEdit.addEventListener("click", function () {
      cancelEditing();
    });
    refs.attachmentInput.addEventListener("change", function (event) {
      addComposerFiles(event.target.files, "upload");
    });
    refs.saveKey.addEventListener("click", saveKey);
    refs.clearKey.addEventListener("click", clearKey);
    refs.saveStoragePaths.addEventListener("click", saveStoragePaths);
    refs.resetStoragePaths.addEventListener("click", resetStoragePaths);
    refs.exportChatList.addEventListener("click", function () {
      exportModuleBackup("chatList");
    });
    refs.exportChatRecords.addEventListener("click", function () {
      exportModuleBackup("chatRecords");
    });
    refs.exportModelApi.addEventListener("click", function () {
      exportModuleBackup("modelApi");
    });
    refs.exportBackup.addEventListener("click", exportFullBackup);
    refs.importBackup.addEventListener("click", function () {
      refs.backupImportInput.click();
    });
    refs.backupImportInput.addEventListener("change", function (event) {
      const file = event.target.files && event.target.files[0];
      if (file) {
        importBackupFile(file);
      }
    });
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
    refs.input.addEventListener("paste", function (event) {
      const files = extractFilesFromItems(event.clipboardData && event.clipboardData.items);
      if (files.length) {
        event.preventDefault();
        addComposerFiles(files, "paste");
      }
    });
    refs.messages.addEventListener("scroll", handleMessageScroll);
    refs.input.addEventListener("keydown", function (event) {
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        sendMessage();
      }
    });
    refs.composer.addEventListener("dragenter", function (event) {
      event.preventDefault();
      state.dragDepth += 1;
      setDropzoneActive(true);
    });
    refs.composer.addEventListener("dragover", function (event) {
      event.preventDefault();
      setDropzoneActive(true);
    });
    refs.composer.addEventListener("dragleave", function (event) {
      event.preventDefault();
      if (event.target === refs.composer || !refs.composer.contains(event.relatedTarget)) {
        state.dragDepth = Math.max(state.dragDepth - 1, 0);
      }
      if (!state.dragDepth) {
        setDropzoneActive(false);
      }
    });
    refs.composer.addEventListener("drop", function (event) {
      event.preventDefault();
      state.dragDepth = 0;
      setDropzoneActive(false);
      addComposerFiles(event.dataTransfer && event.dataTransfer.files, "drop");
    });
    window.addEventListener("dragover", function (event) {
      if (event.dataTransfer && Array.from(event.dataTransfer.types || []).indexOf("Files") !== -1) {
        event.preventDefault();
      }
    });
    window.addEventListener("drop", function (event) {
      if (!refs.composer.contains(event.target)) {
        event.preventDefault();
        state.dragDepth = 0;
        setDropzoneActive(false);
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
    refs.composer = document.querySelector(".chat-main-composer");
    refs.composerDropzone = document.getElementById("composer-dropzone");
    refs.composerAttachments = document.getElementById("composer-attachments");
    refs.input = document.getElementById("message-input");
    refs.attachmentInput = document.getElementById("attachment-input");
    refs.pickAttachments = document.getElementById("pick-attachments");
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
    refs.storageChatList = document.getElementById("storage-chat-list");
    refs.storageChatRecords = document.getElementById("storage-chat-records");
    refs.storageModelApi = document.getElementById("storage-model-api");
    refs.saveStoragePaths = document.getElementById("save-storage-paths");
    refs.resetStoragePaths = document.getElementById("reset-storage-paths");
    refs.exportChatList = document.getElementById("export-chat-list");
    refs.exportChatRecords = document.getElementById("export-chat-records");
    refs.exportModelApi = document.getElementById("export-model-api");
    refs.exportBackup = document.getElementById("export-backup");
    refs.importBackup = document.getElementById("import-backup");
    refs.backupImportInput = document.getElementById("backup-import-input");
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
