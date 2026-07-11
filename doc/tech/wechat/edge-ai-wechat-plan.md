# 端侧 AI 微信公众号方案

## 1. 目标

建设一个聚焦端侧 AI 的微信公众号，用于承载个人技术品牌、行业观察、工程实践和产品思考。公众号不做泛 AI 资讯号，而是聚焦 AI 如何落到真实设备、真实 App 和真实用户体验中。

核心定位：

> 关注 AI 在手机、IoT、车机、可穿戴、PC、边缘设备上的落地实践，记录模型压缩、端侧推理、Android AI、AI Agent、端云协同和产品化经验。

## 2. 账号定位

建议名称方向：

- 端侧 AI 实践笔记
- Android AI 实践
- 端侧智能实验室
- On-device AI Notes

推荐主名称：

```text
端侧 AI 实践笔记
```

简介建议：

```text
专注端侧 AI 与 Android AI 实践，记录小模型部署、端云协同和 AI App 产品化。
```

更完整版本：

```text
记录端侧 AI、Android AI、小模型部署与 AI 产品化实践。关注模型如何跑进手机、设备和真实应用，而不只停留在云端 Demo。
```

## 3. 目标读者

主要读者分三类：

- 移动端 / Android / 客户端工程师：关注模型集成、性能优化、包体控制、端侧推理和工程落地。
- AI 应用开发者 / Agent 开发者：关注 AI 能力如何从 Web / 云端进入移动端和本地设备。
- 技术产品 / 创业者 / 独立开发者：关注哪些端侧 AI 能力可以产品化，哪些方向值得投入。

## 4. 内容边界

重点覆盖：

- Android 端侧 AI。
- 小模型、本地模型、模型量化。
- LLM on device。
- AI Agent 与移动端结合。
- 端云协同架构。
- AI App 产品设计。
- 多模态端侧能力。
- 边缘计算、隐私计算。
- AI 工程化和部署实践。

避免方向：

- 纯热点搬运。
- 只讲模型参数和排行榜。
- 纯 Prompt 教程。
- 没有工程或产品落点的泛 AI 评论。

## 5. 栏目设计

### 5.1 端侧 AI 周报

定位：每周整理端侧 AI、移动 AI、小模型、芯片、Android / Apple / Google / 高通 / MediaTek / OpenAI 等相关动态。

内容结构：

- 本周重点变化。
- 值得关注的产品 / SDK / 模型。
- 对端侧 AI 落地的影响。
- 个人判断。

### 5.2 Android AI 实战

定位：工程教程和实践复盘。

选题示例：

- Android 集成本地模型的基本路线。
- ONNX Runtime / TensorFlow Lite / MediaPipe 怎么选。
- 端侧语音识别方案。
- CameraX + 视觉模型的实时处理链路。
- 如何做端侧 AI 性能 profiling。

### 5.3 模型落地笔记

定位：模型压缩、部署和性能权衡。

选题示例：

- 量化是什么，INT8 / INT4 怎么理解。
- LoRA / 蒸馏 / 剪枝对端侧部署有什么意义。
- 小模型和大模型的端云协同方案。
- 模型大小、速度、效果如何权衡。

### 5.4 AI 产品观察

定位：从产品和体验角度看端侧 AI。

选题示例：

- 什么样的 AI 功能适合放在端侧。
- 本地 AI 的隐私优势怎么转成产品卖点。
- 移动端 AI 助手的交互模式。
- AI App 不应该只做聊天框。

### 5.5 个人实验室

定位：记录个人项目、Demo、Codex 自动生成文章、GitHub Pages blog、Android App、AI 工具链实验。

内容来源：

- 本仓库 blog 长文。
- Android Demo。
- Codex 生成草稿。
- GitHub 项目实验。
- 模型部署验证记录。

## 6. 前 20 篇选题

1. 为什么我认为端侧 AI 会成为下一阶段 AI 应用的关键
2. 端侧 AI、边缘 AI、本地 AI 到底有什么区别
3. Android 开发者如何入门端侧 AI
4. 一篇文章讲清楚 TensorFlow Lite、ONNX Runtime、MediaPipe
5. 手机上跑大模型，真正难点在哪里
6. 端侧 AI 的 5 个典型场景：拍照、语音、输入法、助手、自动化
7. 端云协同不是妥协，而是产品架构
8. 小模型为什么重新重要起来
9. 端侧 AI 的隐私价值如何表达给用户
10. Android AI App 的技术架构草图
11. 模型量化入门：从 FP32 到 INT8
12. 如何评估一个模型是否适合放到手机上
13. CameraX + AI 视觉能力可以做什么
14. 语音转文字在端侧落地有哪些坑
15. AI Agent 在手机上应该怎么设计
16. 本地知识库 + 移动端 AI 的可能性
17. AI 助手为什么不应该只有聊天界面
18. 端侧 AI 对 App 包体、功耗、发热的影响
19. 从 Android 工程师视角看 AI Native App
20. 我的端侧 AI 实验计划

## 7. 更新节奏

推荐节奏：

```text
每周 2 篇
```

建议安排：

- 周二：端侧 AI 观察 / 行业分析。
- 周五：Android AI 实战 / 技术笔记。

启动阶段不建议日更，优先保证每篇文章有观点、有结构、有工程落点。

## 8. 内容风格

风格原则：

- 少讲“AI 将改变世界”，多讲“这个能力怎么跑起来”。
- 少追热点参数，多看端侧体验、成本、隐私、延迟和功耗。
- 概念要讲清楚，但最终要落到工程、产品和真实设备。
- 每篇文章尽量包含架构图、流程图、对比表或实践清单。

推荐人设：

```text
Android 工程师 + AI 实践者，关注 AI 如何从云端能力变成真实设备上的产品能力。
```

## 9. 与本站 Blog 联动

公众号不单独孤立运营，而是和当前 GitHub Pages blog 形成内容闭环。所有公众号长文都应在本站保留一份 Markdown 内容源，本站作为主版本、索引页和长期归档；微信公众号作为分发渠道。

核心原则：

- 文章先进入本站内容系统，再分发到公众号。
- 本站保留完整长文、代码、图表、参考链接和后续更新。
- 公众号版本可做适合移动阅读的改写，但必须在 frontmatter 中记录与本站文章的关联。
- 站内详情页展示“也发布于微信公众号”的渠道链接。
- 公众号文章末尾放站内原文链接，方便读者回到长期归档版本。

推荐流程：

```text
Codex 定时生成草稿
  -> content/blog/drafts/
  -> 人工 review
  -> 发布到 GitHub Pages blog
  -> 改写成公众号版本
  -> 发布到微信公众号
  -> 在文章 frontmatter 里记录 wechat 渠道状态
```

站内目录建议：

```text
content/
  blog/
    posts/
      2026/
        2026-07-11-edge-ai-wechat-start.md
    drafts/
      2026-07-edge-ai-topic-draft.md
```

站内 URL 示例：

```text
/blog/posts/2026/edge-ai-wechat-start/
```

站内文章 frontmatter 中记录公众号发布状态：

```yaml
channels:
  canonical: "site"
  published:
    - platform: "site"
      url: "/blog/posts/2026/example/"
      status: "published"
      publishedAt: "2026-07-11"
    - platform: "wechat"
      url: ""
      status: "pending"
```

发布后回写：

```yaml
    - platform: "wechat"
      url: "https://mp.weixin.qq.com/s/example"
      status: "published"
      publishedAt: "2026-07-12"
```

站内详情页展示规则：

- 如果 `channels.published` 中存在 `platform: "wechat"` 且 `status: "published"`，在文章尾部“发布渠道”区域显示微信公众号链接。
- 如果公众号暂未发布，则前台不展示，仅作为后台状态。
- 如果公众号版本和站内版本存在差异，站内版本仍作为 `canonical: "site"`。
- 如果某篇文章只适合公众号短文，也应在站内保留摘要型归档，正文可说明“完整互动版本发布于公众号”。

博客列表和首页关联：

- 公众号文章进入 `content/blog/posts/` 后，自动进入站内 `/blog/` 列表。
- 需要重点推广的公众号文章可配置 `featured: true` 和 `homeRank`，进入首页文章区。
- 首页文章卡片仍统一链接到站内详情页，而不是直接跳公众号。
- 站内详情页再展示公众号渠道链接，保持本站作为内容入口。

公众号文章末尾建议加：

```text
本文同步归档于个人站：
https://wk1995.github.io/blog/posts/{year}/{slug}/

站内版本会持续更新代码、参考资料和后续实验记录。
```

## 10. 发布工作流

### 10.1 标准文章流程

```text
选题
  -> 写大纲
  -> 生成 / 撰写 blog Markdown
  -> 人工补充观点和案例
  -> 发布站内 blog
  -> 生成站内详情页和 blog 索引
  -> 改写公众号版本
  -> 添加头图、摘要、引导语
  -> 发布公众号
  -> 回写 channels.wechat 状态
```

### 10.2 公众号改写要求

站内 blog 更适合长期沉淀，公众号更适合阅读传播。改写时应注意：

- 开头更直接，前 3 段说明问题和价值。
- 小标题更短。
- 代码量减少，复杂代码放站内原文链接。
- 图表优先，长段落拆短。
- 结尾引导读者关注站内 blog、GitHub 或 Demo。
- 保留站内原文链接，形成公众号到网站的回流。

### 10.3 文章模板

```text
标题：一句话说明问题或判断

开头：
- 当前现象
- 为什么重要
- 本文会解决什么

正文：
- 背景
- 核心概念
- 工程方案
- 产品影响
- 实践建议

结尾：
- 总结判断
- 下一步实验
- 站内原文 / Demo / GitHub 链接
```

### 10.4 网站归档要求

每篇公众号文章在本站至少需要保留以下信息：

- 标题。
- 摘要。
- 发布时间。
- 标签。
- 栏目归属。
- 公众号发布状态。
- 公众号链接。
- 站内 canonical URL。

推荐 frontmatter：

```yaml
title: "端侧 AI 为什么重要"
slug: "why-on-device-ai-matters"
date: "2026-07-11"
status: "published"
summary: "从隐私、延迟、成本和体验四个角度解释端侧 AI 的价值。"
tags:
  - AI
  - On-device
  - Android
category: "AI 产品观察"
featured: true
homeRank: 20
channels:
  canonical: "site"
  published:
    - platform: "site"
      url: "/blog/posts/2026/why-on-device-ai-matters/"
      status: "published"
      publishedAt: "2026-07-11"
    - platform: "wechat"
      url: ""
      status: "pending"
```

## 11. 差异化

当前很多 AI 内容偏向：

- 大模型新闻。
- AI 工具推荐。
- Prompt 教程。
- 模型排行榜。
- 融资和产品发布。

本公众号差异化：

```text
不只看模型，而是关注 AI 如何进入真实设备、真实 App、真实用户体验。
```

核心壁垒：

- Android 工程背景。
- 端侧模型落地视角。
- 端云协同架构思维。
- 个人实验和真实 Demo。
- 站内 blog 长文沉淀。

## 12. 增长与分发

启动阶段：

- 每篇文章同步到 GitHub Pages blog。
- 文章结尾附站内原文链接。
- 可同步到掘金、知乎、CSDN。
- GitHub 项目 README 中加入公众号入口。

中期：

- 做端侧 AI 路线图合集。
- 做 Android AI Demo 系列。
- 把高质量文章整理成专题页。
- 建立“端侧 AI 入门”索引。

## 13. 变现与长期方向

早期不以变现为目标，优先积累可信内容和垂直读者。

后续方向：

- 端侧 AI 技术咨询。
- Android AI App 开发服务。
- 小模型部署方案。
- 课程 / 小册。
- 开源项目引流。
- AI App 产品实验。
- 企业端侧 AI PoC。

长期内容矩阵：

```text
微信公众号：观点和传播
GitHub Pages Blog：沉淀长文和技术方案
GitHub：代码和 Demo
Android App：真实产品实验
Codex 自动化：持续产出和整理
```

## 14. 阶段目标

### 第 1 个月

- 发布 8 篇文章。
- 明确 3 个固定栏目。
- 打通 GitHub Pages blog 与公众号同步流程。
- 做 1 个 Android AI Demo。
- 每篇文章先沉淀到 blog，再分发到公众号。

### 第 3 个月

- 累计 25 到 30 篇文章。
- 建立“端侧 AI 实践笔记”的关键词认知。
- 做出 2 到 3 个可展示 Demo。
- 形成一套端侧 AI 技术路线图。

## 15. 风险与应对

- 内容过泛：坚持端侧、Android、工程落地和产品化边界。
- 更新压力大：每周 2 篇即可，优先稳定。
- AI 草稿空泛：必须人工 review，补充个人判断、工程细节和真实限制。
- 公众号与 blog 重复劳动：通过 Markdown 源文件和 channels 元数据统一管理。
- 热点变化快：周报处理短期变化，长文沉淀长期方法论。
