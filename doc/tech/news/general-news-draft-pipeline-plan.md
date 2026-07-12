# 通用资讯抓取与自动成文方案

## 1. 目标

建设一套可复用的资讯抓取与自动成文流水线。它可以围绕任意主题，根据关键词和时间范围抓取新闻、热点、GitHub 仓库、论文、模型、产品动态和社区讨论，整理为一篇可人工 review 的 Markdown 草稿，最终进入本站 blog 和微信公众号发布流程。

本方案是基础能力方案，适用于任意主题文章。垂直主题，例如端侧 AI，应在本方案基础上通过主题池、关键词、来源优先级、评分权重和文章模板进行二次约束。

## 2. 使用场景

通用方案用于任意主题文章，例如：

- 技术周报。
- 产品观察。
- GitHub 项目雷达。
- 行业专题综述。
- 某个关键词最近 7 / 14 / 30 天动态整理。
- 某个公司、框架、模型、平台的阶段性观察。

示例：

```text
关键词：Rust desktop app, Tauri, local-first software
时间范围：最近 30 天
输出类型：专题综述
```

```text
关键词：GitHub Copilot, Codex, developer tools
时间范围：最近 7 天
输出类型：周报
```

## 3. 输入参数

脚本建议支持命令行参数：

```bash
node scripts/news/build-news-draft.mjs \
  --topic "开发者工具周报" \
  --keywords "GitHub Copilot, Codex, AI coding tools" \
  --range 7d \
  --mode weekly \
  --limit 30
```

参数设计：

- `--topic`：文章主题。
- `--topic-config`：主题配置文件路径。如果提供该参数，脚本优先读取配置文件中的 `name`、`keywords`、`expandedKeywords`、`tags`、`mode` 和 `sources`。
- `--keywords`：关键词列表，逗号分隔。
- `--from`：开始日期。
- `--to`：结束日期。
- `--range`：相对时间范围，例如 `7d`、`14d`、`30d`。如果配置了 `from/to`，优先使用显式日期。
- `--mode`：输出模式，例如 `weekly`、`topic`、`github-radar`、`research`。
- `--limit`：每类来源最大保留数量。
- `--sources`：启用的数据来源，例如 `web,github,rss,hf,arxiv`。
- `--output`：输出目录，默认 `content/blog/drafts/`。
- `--publish-status`：默认 `draft`，不建议自动发布。
- `--language`：输出语言，默认 `zh-CN`。

参数优先级：

1. `--topic-config` 优先级最高，适合固定主题池和专项方案。
2. 命令行显式传入的 `--topic`、`--keywords`、`--mode` 可以覆盖主题配置中的同名字段。
3. 如果同时提供 `--from/to` 和 `--range`，优先使用 `--from/to`。

时间范围约定：

- 第一版统一按 `Asia/Shanghai` 计算日期。
- `from` 为包含边界，`to` 为包含边界。
- `--range 7d` 表示从当前日期往前 7 天到当前日期结束。
- 无发布时间的内容默认降权，不进入高优先级列表；如果来源特别重要，可进入“待确认”分组。

## 4. 主题池

通用主题池建议放在：

```text
content/blog/topics/news-topics.json
```

示例：

```json
[
  {
    "name": "开发者工具",
    "keywords": ["AI coding tools", "Codex", "GitHub Copilot", "developer productivity"],
    "tags": ["Developer Tools", "AI", "Productivity"],
    "mode": "weekly",
    "cadence": "weekly"
  },
  {
    "name": "本地优先软件",
    "keywords": ["local-first software", "CRDT", "offline-first app"],
    "tags": ["Local-first", "Product"],
    "mode": "topic",
    "cadence": "monthly"
  }
]
```

## 5. 数据来源

通用来源分为五类：

- Web 新闻与官网动态：官方博客、release note、产品公告、可信媒体。
- GitHub：仓库、release、README、topics、star / fork、活跃度。
- 社区热点：Hacker News、Reddit、X / Twitter、YouTube、技术社区。
- 论文与模型：arXiv、Hugging Face Papers、Hugging Face Models、Papers with Code。
- RSS：官方博客、工程博客、技术媒体。

来源策略：

- 官方来源优先于媒体转述。
- GitHub 仓库优先读取 README、release 和最近更新时间。
- 社区热点只作为趋势信号，不直接作为事实依据。
- 论文和模型信息需要保留原始链接。

第一版数据来源范围：

- 第一版倾向本地脚本手动运行，不依赖 GitHub Actions 定时任务。
- P0 不强绑定搜索 API，优先实现 RSS、GitHub API、手工配置来源。
- Web 搜索作为可插拔 provider 预留接口，等确定具体服务后接入。
- 如果没有搜索 API，任意主题的覆盖范围取决于主题配置中的 RSS 和手工来源。

手工来源配置示例：

```json
{
  "name": "开发者工具",
  "sources": [
    {
      "type": "rss",
      "name": "GitHub Blog",
      "url": "https://github.blog/feed/"
    },
    {
      "type": "site",
      "name": "OpenAI Blog",
      "url": "https://openai.com/news/"
    }
  ]
}
```

## 6. 抓取流程

```text
读取命令参数 / 主题池
  -> 扩展关键词
  -> 多来源搜索
  -> 拉取详情页 / README / release / 摘要
  -> 结构化解析
  -> 去重
  -> 相关性评分
  -> 分组归类
  -> 生成事实摘要
  -> 生成 Markdown 草稿
  -> 写入 content/blog/drafts/
```

关键词扩展由主题配置决定，例如：

```json
{
  "name": "AI 编程工具",
  "keywords": ["AI coding", "Codex", "Copilot"],
  "expandedKeywords": ["developer tools", "agentic coding", "coding assistant"]
}
```

## 7. 中间数据结构

所有来源统一成一个结构，方便去重、评分和模板生成。

```json
{
  "id": "source-url-hash",
  "type": "news",
  "title": "Example title",
  "url": "https://example.com/article",
  "source": "Example Blog",
  "sourceType": "official",
  "sourceId": "S1",
  "citationLabel": "Example Blog",
  "publishedAt": "2026-07-10",
  "fetchedAt": "2026-07-11T08:00:00+08:00",
  "summary": "Short extracted summary",
  "keywords": ["AI coding", "developer tools"],
  "tags": ["AI", "Tools"],
  "score": 82,
  "reason": "Matches topic keywords and includes product release details.",
  "claims": [
    {
      "text": "The article describes a new developer tool release.",
      "sourceId": "S1"
    }
  ]
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
  "language": "TypeScript",
  "stars": 12000,
  "forks": 800,
  "updatedAt": "2026-07-09",
  "release": "v1.2.0",
  "summary": "README-based summary",
  "score": 88,
  "reason": "Recently updated and directly matches the topic.",
  "sourceId": "S2",
  "citationLabel": "GitHub owner/name"
}
```

## 8. 去重与评分

去重规则：

- URL 完全相同则合并。
- 标题高度相似则合并。
- 同一个 GitHub repo 多次出现则合并。
- 同一事件被多个媒体报道时，优先保留官方来源。
- 同一来源重复采集时，保留发布时间最新的一条。

通用评分维度，满分 100：

- 主题相关性：35 分。
- 来源可信度：20 分。
- 时间新鲜度：15 分。
- 信息密度：15 分。
- 讨论热度：10 分。
- 可写作价值：5 分。

评分细则：

- 主题相关性 35 分：
  - 标题命中核心关键词：15 分。
  - 正文 / README 命中核心关键词：10 分。
  - 命中扩展关键词或同义词：5 分。
  - 与主题应用场景直接相关：5 分。
- 来源可信度 20 分：
  - 官方博客 / 官方文档 / release note：20 分。
  - GitHub 仓库 / release / README：18 分。
  - 论文 / 模型卡 / 项目主页：16 分。
  - 可信媒体 / 工程博客：12 分。
  - 社区讨论：6 分。
- 时间新鲜度 15 分：
  - 时间范围内 7 天以内：15 分。
  - 8 到 30 天：10 分。
  - 超过 30 天但仍与主题强相关：5 分。
  - 无发布时间：3 分。
- 信息密度 15 分：
  - 包含 API、release、数据、代码、benchmark 或明确案例：15 分。
  - 有具体产品 / 项目变化：10 分。
  - 只有观点、缺少细节：4 分。
- 讨论热度 10 分：
  - GitHub star / issue / release 活跃，或社区多源讨论：10 分。
  - 单一社区讨论：5 分。
  - 无讨论信号：0 分。
- 可写作价值 5 分：
  - 能形成明确判断或行动建议：5 分。
  - 只能作为参考链接：1 到 2 分。

低优先级内容：

- 标题党。
- 无明确来源。
- 内容过短或无法验证。
- 与关键词只有弱相关。
- 纯观点但没有事实支撑。

## 9. 来源注释要求

自动生成的文章必须注释来源。所有新闻、数据、产品动态、GitHub 仓库信息、论文结论和社区观点，都需要能追溯到原始链接。

来源注释原则：

- 关键事实必须带来源链接。
- 官方来源优先，例如官网博客、release note、开发者文档、GitHub 仓库。
- 媒体报道可作为补充，但不替代官方来源。
- 社区讨论必须标记为“社区讨论”或“趋势信号”，不能当作已确认事实。
- GitHub 仓库信息需要链接到仓库、release 或 README。
- 论文和模型需要链接到 arXiv、Hugging Face、论文主页或模型页。
- 文章末尾必须有“参考链接”章节。

正文注释方式建议：

```markdown
某公司发布了新的开发者工具能力。[S1]
```

第一版统一使用编号来源 `[S1]`，便于 review 和后续公众号改写。脚注风格可作为后续增强：

```markdown
某公司发布了新的开发者工具能力。[^tool-update]

[^tool-update]: 官方博客, https://example.com
```

参考链接结构：

```markdown
## 参考链接

- [S1] [官方] 官方博客: 标题
  https://example.com
- [S2] [GitHub] owner/repo: README / release
  https://github.com/owner/repo
- [S3] [社区讨论] Hacker News: 标题
  https://news.ycombinator.com/item?id=example
```

来源类型枚举：

- `official`：官方博客、官方文档、release note。
- `github`：GitHub 仓库、release、issue、discussion。
- `paper`：论文、模型卡、研究项目页。
- `media`：媒体报道或技术博客。
- `community`：Hacker News、Reddit、X、YouTube、论坛等。

中间数据结构需要保留来源类型：

```json
{
  "title": "Example title",
  "url": "https://example.com/article",
  "source": "Example Blog",
  "sourceType": "official",
  "sourceId": "S1",
  "citationLabel": "Example Blog",
  "publishedAt": "2026-07-10"
}
```

生成文章时，AI 只能基于已采集的结构化来源进行总结；如果某个判断没有来源支撑，需要标记为“推测”或移除。每个关键段落至少关联一个 `sourceId`，正文中使用 `[S1]`、`[S2]` 这类编号引用。

## 10. 输出文章结构

通用周报模板：

```markdown
---
title: "{topic} 周报：{dateRange}"
slug: "{topic-slug}-weekly-{yyyy-mm-dd}"
date: "{today}"
status: "draft"
summary: "整理 {dateRange} 内与 {topic} 相关的新闻、项目和趋势。"
tags:
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

# {topic} 周报：{dateRange}

## 本期判断

## 重要动态

## GitHub 项目

## 社区热点

## 后续观察

## 参考链接
```

通用专题模板：

```markdown
# {topic} 最近 {range} 天观察

## 结论先行

## 背景

## 关键动态

## 项目 / 工具 / 产品

## 风险与不确定性

## 后续观察清单

## 参考链接
```

## 11. 输出位置

默认输出到草稿目录：

```text
content/blog/drafts/
```

示例：

```text
content/blog/drafts/2026-07-11-ai-coding-weekly.md
```

不建议脚本直接写入 `content/blog/posts/`。发布前应人工 review。

## 12. 通用脚本结构

建议路径：

```text
scripts/news/build-news-draft.mjs
```

配套目录：

```text
scripts/news/
  build-news-draft.mjs
  providers/
    github.mjs
    web-search.mjs
    rss.mjs
    hugging-face.mjs
    arxiv.mjs
  prompts/
    weekly.md
    topic.md
    github-radar.md
  scoring/
    score-item.mjs
    dedupe.mjs
```

## 13. 第一版运行方式

第一版优先本地手动运行，不做自动定时。

推荐命令：

```bash
node scripts/news/build-news-draft.mjs \
  --topic-config content/blog/topics/news-topics.json \
  --range 7d \
  --mode weekly
```

本地运行的好处：

- 方便观察抓取质量。
- 方便调整关键词和来源。
- 避免搜索 API、GitHub Actions、公众号发布流程同时引入复杂度。
- 生成草稿后由人工 review，再决定是否发布。

## 14. 与 Blog / 微信公众号联动

生成后进入同一条内容链路：

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

## 15. 风险与约束

- 新闻内容可能存在版权限制，文章中只做摘要和链接，不大段复制原文。
- 未带来源的事实性表述不能自动进入正文。
- 社区热点可能不准确，需要标注来源类型。
- AI 自动总结可能出现事实错误，必须人工 review。
- 搜索结果可能受关键词偏差影响，需要维护主题池。
- GitHub star 不等于项目质量，需要结合 README、release 和活跃度判断。
- 微信公众号发布前需要改写，不能直接搬运站内长文。
- 通用主题过宽时容易生成空泛文章，需要明确主题边界和评分规则。
- 第一版没有搜索 API 时，覆盖范围有限，需要靠 RSS 和手工来源保证质量。

## 16. 第一阶段落地范围

P0：

- 新增通用主题池 JSON。
- 新增通用脚本入口 `scripts/news/build-news-draft.mjs`。
- 支持 `--topic-config` 参数。
- 支持关键词、时间范围、mode 参数。
- 支持 GitHub 仓库搜索。
- 支持 RSS / 手工配置来源。
- 输出 Markdown 草稿到 `content/blog/drafts/`。
- 输出文章必须包含“参考链接”章节。
- 正文引用统一使用 `[S1]` 编号来源。

P1：

- 接入搜索 API。
- 自动评分和去重。
- 生成参考链接列表。
- 支持脚注来源。
- 生成周报、专题、GitHub 雷达三种模板。

P2：

- Codex 定时任务。
- GitHub Actions 草稿 PR。
- Hugging Face / arXiv 来源。
- 公众号版本自动改写。
- 多主题批量生成草稿。
