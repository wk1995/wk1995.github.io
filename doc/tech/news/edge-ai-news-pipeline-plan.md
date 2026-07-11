# 端侧 AI 资讯抓取与自动成文方案

## 1. 目标

建设一套面向端侧 AI 方向的资讯抓取与自动成文流水线。它可以按固定主题自动收集指定时间范围内的新闻、热点、论文、产品动态和 GitHub 仓库，也可以接受临时关键词输入，整理成一篇可人工 review 的 Markdown 草稿，最终进入本站 blog 和微信公众号分发流程。

目标不是生成泛泛的 AI 新闻摘要，而是持续沉淀与端侧 AI 有关的有效信息：

- Android AI。
- On-device AI。
- 小模型、本地模型、模型压缩。
- 端侧推理、边缘推理。
- AI Agent 与移动端。
- 端云协同。
- 手机、IoT、车机、可穿戴、PC 上的 AI 能力。
- 相关 SDK、框架、芯片、系统 API、开源仓库。

## 2. 使用场景

### 2.1 定时资讯文章

每周自动生成一篇端侧 AI 周报草稿。

```text
每周定时任务
  -> 读取默认主题池
  -> 抓取最近 7 天资讯
  -> 去重和评分
  -> 生成 Markdown 周报草稿
  -> 保存到 content/blog/drafts/
  -> 人工 review 后发布
```

### 2.2 指定关键词研究

手动输入关键词和时间范围，生成专题文章草稿。

示例：

```text
关键词：Android on-device LLM, MediaPipe, Gemini Nano
时间范围：最近 30 天
输出类型：专题综述
```

### 2.3 GitHub 仓库雷达

按主题抓取 GitHub 仓库、release、star 增长和 README 摘要，整理成工具/项目观察文章。

示例：

```text
关键词：on-device-ai, llama.cpp android, mnn llm, onnxruntime mobile
时间范围：最近 14 天
输出类型：GitHub 项目雷达
```

## 3. 输入参数

脚本建议支持命令行参数。

```bash
node scripts/news/build-edge-ai-news.mjs \
  --keywords "on-device AI, Android AI, local LLM" \
  --from 2026-07-01 \
  --to 2026-07-11 \
  --mode weekly \
  --limit 30
```

参数设计：

- `--keywords`：关键词列表，逗号分隔。
- `--from`：开始日期。
- `--to`：结束日期。
- `--range`：相对时间范围，例如 `7d`、`14d`、`30d`。如果配置了 `from/to`，优先使用显式日期。
- `--mode`：输出模式，例如 `weekly`、`topic`、`github-radar`。
- `--limit`：每类来源最大保留数量。
- `--output`：输出目录，默认 `content/blog/drafts/`。
- `--publish-status`：默认 `draft`，不建议自动发布。
- `--language`：输出语言，默认 `zh-CN`。

## 4. 默认主题池

主题池建议放在：

```text
content/blog/topics/edge-ai-news.json
```

示例：

```json
[
  {
    "name": "Android 端侧 AI",
    "keywords": ["Android AI", "on-device AI", "Gemini Nano", "MediaPipe", "ML Kit"],
    "tags": ["Android", "AI", "On-device"],
    "cadence": "weekly"
  },
  {
    "name": "本地大模型与移动推理",
    "keywords": ["local LLM", "mobile LLM", "llama.cpp android", "MNN LLM", "ONNX Runtime mobile"],
    "tags": ["LLM", "Mobile", "Inference"],
    "cadence": "weekly"
  }
]
```

## 5. 数据来源

### 5.1 新闻与官网动态

优先来源：

- 官方博客。
- 开发者文档。
- 产品 release note。
- 可信科技媒体。
- 公司工程博客。

重点站点类型：

- Google / Android Developers。
- Apple Developer。
- Qualcomm / MediaTek / Arm。
- Microsoft / ONNX Runtime。
- TensorFlow / MediaPipe。
- Hugging Face。
- 主要 AI 公司官方博客。

### 5.2 GitHub

抓取内容：

- 仓库名称。
- 描述。
- README 摘要。
- star / fork。
- 最近 release。
- 最近更新时间。
- 主要语言。
- 与关键词的匹配原因。

数据来源：

- GitHub Search API。
- GitHub Trending 页面。
- 仓库 releases。
- 仓库 topics。

### 5.3 社区热点

可选来源：

- Hacker News。
- Reddit。
- X / Twitter。
- YouTube。
- 技术社区文章。
- 掘金、知乎、CSDN 等中文技术平台。

社区来源不直接作为事实依据，需要标记为“社区讨论”或“趋势信号”。

### 5.4 论文与模型

可选来源：

- arXiv。
- Hugging Face Papers。
- Hugging Face Models。
- Papers with Code。

重点关注：

- 小模型。
- 多模态端侧模型。
- 量化、蒸馏、剪枝。
- 手机/边缘设备部署。

## 6. 抓取流程

```text
读取参数 / 主题池
  -> 扩展关键词
  -> 多来源搜索
  -> 拉取详情页 / README / release
  -> 结构化解析
  -> 去重
  -> 相关性评分
  -> 分组归类
  -> 生成摘要
  -> 生成 Markdown 草稿
  -> 写入 content/blog/drafts/
```

关键词扩展示例：

```text
端侧 AI
  -> on-device AI
  -> edge AI
  -> local AI
  -> mobile AI
  -> Android AI
  -> on-device LLM
  -> local LLM
```

## 7. 数据结构

中间数据建议统一成 JSON。

```json
{
  "id": "source-url-hash",
  "type": "news",
  "title": "Example title",
  "url": "https://example.com/article",
  "source": "Google Developers Blog",
  "publishedAt": "2026-07-10",
  "fetchedAt": "2026-07-11T08:00:00+08:00",
  "summary": "Short extracted summary",
  "keywords": ["Android AI", "on-device AI"],
  "tags": ["Android", "AI"],
  "score": 82,
  "reason": "Mentions Android on-device model runtime and recent API update."
}
```

GitHub 仓库结构：

```json
{
  "id": "github-owner-repo",
  "type": "github",
  "repo": "owner/name",
  "url": "https://github.com/owner/name",
  "description": "Repository description",
  "language": "C++",
  "stars": 12000,
  "forks": 800,
  "updatedAt": "2026-07-09",
  "release": "v1.2.0",
  "summary": "README-based summary",
  "score": 88,
  "reason": "Supports mobile inference and Android build instructions."
}
```

## 8. 去重与评分

### 8.1 去重规则

- URL 完全相同则合并。
- 标题高度相似则合并。
- 同一个 GitHub repo 多次出现则合并。
- 同一公司同一 release 被多个媒体报道时，优先保留官方来源。

### 8.2 评分维度

满分 100。

- 主题相关性：40 分。
- 来源可信度：20 分。
- 时间新鲜度：15 分。
- 工程落地价值：15 分。
- 讨论热度：10 分。

高优先级内容：

- 明确涉及端侧部署、移动推理、Android / iOS / 边缘设备。
- 有代码、SDK、API、release、benchmark 或真实产品信息。
- 来自官方或一手项目仓库。

低优先级内容：

- 泛 AI 观点文。
- 只讲云端大模型能力。
- 标题党新闻。
- 无来源或事实不清的社区转述。

## 9. 生成文章结构

### 9.1 周报模板

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

## 值得继续跟踪

## 参考链接
```

### 9.2 专题综述模板

```markdown
# {topic} 最近 {range} 天观察

## 结论先行

## 背景

## 关键动态

## GitHub / 工具链

## 对 Android / 端侧产品的影响

## 后续观察清单

## 参考链接
```

## 10. 输出位置

默认输出到草稿目录：

```text
content/blog/drafts/
```

示例：

```text
content/blog/drafts/2026-07-11-edge-ai-weekly.md
```

不建议脚本直接写入 `content/blog/posts/`。发布前应人工 review。

## 11. 与 Blog / 微信公众号联动

生成草稿后进入现有内容链路：

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

站内文章作为主版本：

```yaml
channels:
  canonical: "site"
  published:
    - platform: "site"
      status: "published"
    - platform: "wechat"
      status: "pending"
```

公众号发布后回写：

```yaml
    - platform: "wechat"
      url: "https://mp.weixin.qq.com/s/example"
      status: "published"
      publishedAt: "2026-07-12"
```

## 12. 自动化任务

### 12.1 本地脚本

建议脚本路径：

```text
scripts/news/build-edge-ai-news.mjs
```

配套目录：

```text
scripts/news/
  build-edge-ai-news.mjs
  providers/
    github.mjs
    web-search.mjs
    rss.mjs
  prompts/
    weekly.md
    topic.md
```

### 12.2 Codex 定时任务

建议每周一上午生成草稿：

```text
每周一 09:00
  -> 最近 7 天
  -> 默认主题池
  -> 生成周报草稿
```

### 12.3 GitHub Actions

如果放到 GitHub Actions，需要注意：

- 搜索 API key 使用 GitHub Secrets。
- 不直接自动发布。
- 默认创建 PR 或提交到草稿分支。
- 避免使用不稳定或违规抓取来源。

## 13. 搜索工具与 API 选择

可选方案：

- GitHub API：仓库搜索、release、README。
- RSS：官方博客和技术媒体。
- 搜索 API：用于新闻和网页检索。
- Hugging Face API：模型、论文、数据集。
- arXiv API：论文搜索。

第一阶段建议：

```text
RSS + GitHub API + 手动关键词搜索
```

第二阶段再加入：

```text
搜索 API + Hugging Face + arXiv
```

## 14. 风险与约束

- 新闻内容可能存在版权限制，文章中只做摘要和链接，不大段复制原文。
- 社区热点可能不准确，需要标注来源类型。
- AI 自动总结可能出现事实错误，必须人工 review。
- 搜索结果可能受关键词偏差影响，需要维护主题池。
- GitHub star 不等于项目质量，需要结合 README、release 和活跃度判断。
- 微信公众号发布前需要改写，不能直接搬运站内长文。

## 15. 第一阶段落地范围

P0：

- 新增主题池 JSON。
- 新增本地脚本入口。
- 支持关键词、时间范围、mode 参数。
- 支持 GitHub 仓库搜索。
- 支持 RSS / 手工配置来源。
- 输出 Markdown 草稿到 `content/blog/drafts/`。

P1：

- 接入搜索 API。
- 自动评分和去重。
- 生成参考链接列表。
- 生成周报和专题两种模板。

P2：

- Codex 定时任务。
- GitHub Actions 草稿 PR。
- Hugging Face / arXiv 来源。
- 公众号版本自动改写。

