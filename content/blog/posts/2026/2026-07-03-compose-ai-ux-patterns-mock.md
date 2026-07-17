---
title: "Compose 里的 AI 体验模式：状态、反馈与可撤销"
slug: "compose-ai-ux-patterns-mock"
date: "2026-07-03"
updated: "2026-07-03"
status: "published"
previewOnly: true
summary: "模拟一篇偏交互设计的文章，用于检查筛选、摘要换行和代码块阅读体验。"
tags:
  - Compose
  - UX
  - Android
template: "default"
cover: ""
source: "human"
featured: false
homeRank: 0
comments:
  enabled: true
  provider: "giscus"
likes:
  enabled: true
  provider: "giscus-reactions"
channels:
  canonical: "site"
  published:
    - platform: "site"
      url: "/blog/posts/2026/compose-ai-ux-patterns-mock/"
      status: "published"
      publishedAt: "2026-07-03"
    - platform: "juejin"
      url: "https://example.com/mock-compose-ai-ux"
      status: "published"
      publishedAt: "2026-07-04"
---

# Compose 里的 AI 体验模式：状态、反馈与可撤销

AI 功能在移动端常常会进入不确定状态：正在理解、正在检索、正在生成、需要用户确认。Compose 很适合把这些状态做成可观察的界面层。

## 状态应该可见

用户不应该猜系统是否还在工作。加载、暂停、错误和可撤销状态都需要被界面明确表达。

```kotlin
sealed interface AssistantState {
    data object Idle : AssistantState
    data object Thinking : AssistantState
    data class DraftReady(val text: String) : AssistantState
}
```

## 可撤销比完美更重要

对于生成式能力，允许用户撤销、重写和保留原文，往往比追求一次性准确更能建立信任。
