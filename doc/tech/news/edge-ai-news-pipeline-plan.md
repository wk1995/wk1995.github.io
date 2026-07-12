# 端侧 AI 资讯抓取与自动成文专项方案

## 1. 目标

本方案是端侧 AI 方向的专项方案，基于 [通用资讯抓取与自动成文方案](general-news-draft-pipeline-plan.md) 实现。通用方案负责关键词检索、多来源抓取、去重、评分、来源注释和 Markdown 草稿生成；本方案只定义端侧 AI 的主题边界、关键词扩展、来源优先级、评分权重和文章模板。

目标不是生成泛泛的 AI 新闻摘要，而是持续沉淀与端侧 AI 有关的有效信息：

- Android AI。
- On-device AI。
- 小模型、本地模型、模型压缩。
- 端侧推理、边缘推理。
- AI Agent 与移动端。
- 端云协同。
- 手机、IoT、车机、可穿戴、PC 上的 AI 能力。
- 相关 SDK、框架、芯片、系统 API、开源仓库。

## 2. 与通用方案的关系

端侧 AI 专项方案不重复实现抓取流水线，而是复用通用方案：

```text
通用资讯抓取与自动成文方案
  -> 关键词输入
  -> 多来源抓取
  -> 去重与评分
  -> 来源注释
  -> Markdown 草稿生成

端侧 AI 专项方案
  -> 端侧 AI 主题池
  -> 端侧 AI 关键词扩展
  -> 端侧 AI 来源优先级
  -> 端侧 AI 评分权重
  -> 端侧 AI 文章模板
```

因此，脚本入口仍建议使用通用脚本：

```bash
node scripts/news/build-news-draft.mjs \
  --topic-config content/blog/topics/edge-ai-news.json \
  --range 7d \
  --mode weekly
```

第一版同样优先本地手动运行，不启用自动定时。先通过本地脚本观察来源质量、关键词召回和生成文章质量，再考虑 Codex 定时任务或 GitHub Actions。P1 可增加 GitHub Actions `workflow_dispatch` 手动触发，用来远程生成端侧 AI 草稿 PR。

## 3. 使用场景

端侧 AI 周报：

```text
每周定时任务
  -> 读取端侧 AI 主题池
  -> 抓取最近 7 天资讯
  -> 去重和评分
  -> 生成 Markdown 周报草稿
  -> 保存到 content/blog/drafts/
  -> 人工 review 后发布
```

端侧 AI 专题：

```text
关键词：Android on-device LLM, MediaPipe, Gemini Nano
时间范围：最近 30 天
输出类型：专题综述
```

GitHub 仓库雷达：

```text
关键词：on-device-ai, llama.cpp android, mnn llm, onnxruntime mobile
时间范围：最近 14 天
输出类型：GitHub 项目雷达
```

## 4. 专项主题池

端侧 AI 主题池建议放在：

```text
content/blog/topics/edge-ai-news.json
```

示例：

```json
[
  {
    "name": "Android 端侧 AI",
    "keywords": ["Android AI", "on-device AI", "Gemini Nano", "MediaPipe", "ML Kit"],
    "expandedKeywords": ["Android on-device model", "Android local inference", "mobile AI SDK"],
    "tags": ["Android", "AI", "On-device"],
    "mode": "weekly",
    "cadence": "weekly"
  },
  {
    "name": "本地大模型与移动推理",
    "keywords": ["local LLM", "mobile LLM", "llama.cpp android", "MNN LLM", "ONNX Runtime mobile"],
    "expandedKeywords": ["on-device LLM", "edge inference", "mobile inference"],
    "tags": ["LLM", "Mobile", "Inference"],
    "mode": "weekly",
    "cadence": "weekly"
  }
]
```

## 5. 专项来源优先级

优先来源：

- Google / Android Developers。
- Apple Developer。
- Qualcomm / MediaTek / Arm。
- Microsoft / ONNX Runtime。
- TensorFlow / MediaPipe。
- Hugging Face。
- MNN、ncnn、llama.cpp、ONNX Runtime、ExecuTorch 等开源项目。
- 主要 AI 公司官方博客。

可选来源：

- Hacker News。
- Reddit。
- X / Twitter。
- YouTube。
- 掘金、知乎、CSDN 等中文技术平台。
- arXiv。
- Hugging Face Papers / Models。

社区来源不直接作为事实依据，需要标记为“社区讨论”或“趋势信号”。

## 6. 专项关键词扩展

英文关键词：

```text
on-device AI
edge AI
local AI
mobile AI
Android AI
on-device LLM
local LLM
mobile inference
edge inference
model quantization
AI on Android
```

中文关键词：

```text
端侧 AI
本地大模型
移动端推理
模型量化
端云协同
Android AI
边缘推理
小模型部署
```

## 7. 专项评分规则

在通用评分基础上，端侧 AI 文章使用专项评分覆盖通用评分权重。也就是说，评分流程、去重流程和字段结构复用通用方案，但各项分值和判断条件按本节执行。

- 主题相关性：40 分。
- 来源可信度：20 分。
- 时间新鲜度：15 分。
- 工程落地价值：15 分。
- 讨论热度：10 分。

专项评分细则：

- 主题相关性 40 分：
  - 标题直接命中端侧 AI / Android AI / on-device / mobile inference：15 分。
  - 正文或 README 明确涉及设备端运行、移动推理、本地模型：15 分。
  - 命中扩展关键词，例如 quantization、local LLM、edge inference：5 分。
  - 与 Android、手机、IoT、车机、可穿戴或 PC 本地能力直接相关：5 分。
- 来源可信度 20 分：
  - 官方文档 / 官方博客 / release note：20 分。
  - GitHub 仓库 / release / README：18 分。
  - 论文 / 模型卡 / benchmark：16 分。
  - 公司工程博客：14 分。
  - 技术媒体：10 分。
  - 社区讨论：6 分。
- 时间新鲜度 15 分：沿用通用方案。
- 工程落地价值 15 分：
  - 包含 SDK、API、代码、benchmark、设备适配或部署路径：15 分。
  - 包含产品能力但缺少工程细节：8 分。
  - 只有趋势讨论：3 分。
- 讨论热度 10 分：
  - GitHub 活跃、release 频繁或多社区讨论：10 分。
  - 单一来源讨论：5 分。
  - 无讨论信号：0 分。

高优先级内容：

- 明确涉及端侧部署、移动推理、Android / iOS / 边缘设备。
- 有代码、SDK、API、release、benchmark 或真实产品信息。
- 来自官方或一手项目仓库。
- 直接说明模型体积、推理速度、功耗、设备适配或部署方式。

低优先级内容：

- 泛 AI 观点文。
- 只讲云端大模型能力。
- 不涉及设备、运行时或真实产品。
- 标题党新闻。
- 无来源或事实不清的社区转述。

## 8. 专项来源注释要求

端侧 AI 专项文章必须遵守 [通用方案的来源注释要求](general-news-draft-pipeline-plan.md#9-来源注释要求)，正文统一使用 `[S1]` 编号来源，并且优先使用官方来源和一手工程资料。

端侧 AI 来源优先级：

1. 官方文档 / 官方博客 / release note。
2. GitHub 仓库、release、README、issue。
3. 论文、模型卡、benchmark。
4. 公司工程博客。
5. 技术媒体。
6. 社区讨论。

端侧 AI 文章中以下内容必须带来源：

- 新 API / SDK / 系统能力。
- 模型参数、体积、速度、benchmark。
- GitHub star、release、活跃度。
- 芯片、NPU、设备支持信息。
- 公司产品发布。
- 论文结论或模型能力描述。

## 9. 专项文章模板

端侧 AI 周报模板：

```markdown
---
title: "端侧 AI 周报：{dateRange}"
slug: "edge-ai-weekly-{yyyy-mm-dd}"
date: "{today}"
status: "draft"
summary: "整理过去一周端侧 AI、Android AI、本地模型和相关开源项目动态。"
tags:
  - AI
  - On-device
  - Weekly
source: "ai-assisted"
channels:
  canonical: "site"
  published:
    - platform: "site"
      status: "draft"
    - platform: "wechat"
      status: "pending"
---

# 端侧 AI 周报：{dateRange}

## 本周判断

## 重要新闻

## GitHub 项目雷达

## 模型与论文

## 对 Android / 端侧产品的影响

## 值得继续跟踪

## 参考链接
```

端侧 AI 专题模板：

```markdown
# {topic} 最近 {range} 天观察

## 结论先行

## 背景

## 关键动态

## GitHub / 工具链

## 对 Android / 端侧产品的影响

## 工程落地建议

## 后续观察清单

## 参考链接
```

## 10. 与 Blog / 微信公众号联动

端侧 AI 专项文章沿用 [通用方案的 Blog / 微信公众号联动流程](general-news-draft-pipeline-plan.md#13-与-blog--微信公众号联动)。

推荐链路：

```text
生成 Markdown 草稿
  -> 人工 review
  -> 移动到 content/blog/posts/
  -> 执行 blog build
  -> 生成站内详情页
  -> 改写公众号版本
  -> 发布公众号
  -> 回写 channels.wechat
```

## 11. 自动化任务

端侧 AI 专项任务：

```text
每周一 09:00
  -> content/blog/topics/edge-ai-news.json
  -> 最近 7 天
  -> 生成端侧 AI 周报草稿
```

第一版运行方式：

```bash
node scripts/news/build-news-draft.mjs \
  --topic-config content/blog/topics/edge-ai-news.json \
  --range 7d \
  --mode weekly
```

Workflow 手动触发示例：

当前落地文件：
```text
.github/workflows/build-edge-ai-news-draft.yml
```

```yaml
on:
  workflow_dispatch:
    inputs:
      topic_config:
        default: "content/blog/topics/edge-ai-news.json"
      range:
        default: "7d"
      mode:
        default: "weekly"
```

如果后续放到 GitHub Actions，需要遵守通用方案的约束：

- 搜索 API key 使用 GitHub Secrets。
- 不直接自动发布。
- 默认创建 PR 或提交到草稿分支。
- 生成内容必须保留参考链接。
- PR 中需要能看到新增草稿引用的来源列表，方便 review。
- 默认主题配置为 `content/blog/topics/edge-ai-news.json`。

## 12. 风险与约束

- 端侧 AI 专项必须排除只讲云端大模型、但不涉及设备落地的内容。
- 未带来源的事实性表述不能自动进入正文。
- GitHub star 不等于项目质量，需要结合 README、release 和活跃度判断。
- 社区热点可能不准确，需要标注来源类型。
- 微信公众号发布前需要改写，不能直接搬运站内长文。

## 13. 第一阶段落地范围

P0：

- 新增端侧 AI 专项主题池 JSON。
- 复用通用脚本入口 `scripts/news/build-news-draft.mjs`。
- 支持端侧 AI 关键词扩展。
- 支持端侧 AI 来源优先级。
- 输出端侧 AI Markdown 草稿到 `content/blog/drafts/`。
- 输出文章必须包含“参考链接”章节。
- 正文引用统一使用 `[S1]` 编号来源。

P1：

- 端侧 AI 专项评分权重。
- 端侧 AI 周报模板。
- 端侧 AI 专题模板。
- GitHub 项目雷达模板。
- 支持 GitHub Actions `workflow_dispatch` 手动触发端侧 AI 草稿生成。

P2：

- Codex 定时生成端侧 AI 周报。
- GitHub Actions 定时生成端侧 AI 草稿 PR。
- Hugging Face / arXiv 来源。
- 公众号版本自动改写。
