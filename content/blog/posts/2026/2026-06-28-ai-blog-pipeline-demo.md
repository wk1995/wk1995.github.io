---
title: "用 AI 和静态构建维护个人博客"
slug: "ai-blog-pipeline-demo"
date: "2026-06-28"
updated: "2026-06-28"
status: "published"
summary: "这是一篇 demo 文章，用来验证 Markdown 内容源、标签筛选、模糊搜索、详情页模板和多平台发布元数据。"
tags:
  - AI
  - Blog
  - Automation
template: "default"
cover: ""
source: "ai-assisted"
featured: true
homeRank: 10
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
      url: "/blog/posts/2026/ai-blog-pipeline-demo/"
      status: "published"
      publishedAt: "2026-06-28"
    - platform: "juejin"
      url: ""
      status: "pending"
    - platform: "zhihu"
      url: ""
      status: "draft"
---

# 用 AI 和静态构建维护个人博客

这篇文章是博客系统的第一篇 demo。它的重点不是内容本身，而是验证一条更舒服的写作链路：文章用 Markdown 保存，构建脚本负责生成静态详情页和列表索引，GitHub Pages 负责发布。

## 为什么先做内容源

手写 HTML 的好处是直观，但文章多起来之后会很难维护。每次新增文章都要复制页面、改标题、改摘要、改列表入口，还要小心链接和样式不要出错。

把 Markdown 作为内容源之后，写作会变成更自然的动作：

- 文章内容只关注标题、段落、列表和代码。
- 标签、摘要、来源和渠道状态放在 frontmatter 中。
- 构建脚本统一生成详情页、搜索索引和站内链接。
- 未来 AI 生成草稿时，也只需要输出一份规范 Markdown。

## 标签和搜索

每篇文章必须配置 tags。列表页读取 `blog/posts/index.json` 后，可以用标签快速筛选，也可以用关键词模糊搜索。第一版搜索不追求复杂评分，只要能覆盖标题、摘要、标签和正文提取文本，就足够日常使用。

比如这篇文章包含 `AI`、`Blog`、`Automation` 三个标签。搜索 `agent` 可能不会命中，但搜索 `markdown`、`静态`、`automation` 都应该能找到它。

## 多平台发布状态

文章不一定只停留在个人站，后续也可能同步到掘金、知乎或微信公众号。因此 demo 里加入了 `channels` 元数据：

```yaml
channels:
  canonical: "site"
  published:
    - platform: "site"
      status: "published"
    - platform: "juejin"
      status: "pending"
```

详情页只展示已经发布且有 URL 的渠道链接。那些待发布、草稿或跳过的平台，会留给自动化脚本和人工维护使用。

## 下一步

这个 demo 跑通之后，后面可以继续补三件事：

1. 把旧的手写 HTML 文章迁移成 Markdown。
2. 接入 Codex 定时任务，把草稿写入 `content/blog/drafts/`。
3. 配好 Giscus，让每篇文章拥有自己的评论区。

如果这条链路稳定，写 blog 就会轻很多：你负责判断和表达，系统负责重复劳动。
