# Blog 技术方案

## 1. 背景与目标

当前仓库是根目录静态站点，`blog/` 下已有手写 HTML 列表页和详情页。后续 blog 希望承载自己写的文章，也可以通过 AI 辅助生成感兴趣主题的文章，并通过 Codex 定时任务提交到仓库后自动发布。

本方案目标：

- 支持任意主题文章，不限定 AI / Android，但每篇文章必须配置标签，方便筛选。
- Blog 页面分为列表页和详情页。
- 列表页支持模糊搜索、标签筛选、基础排序。
- 文章源文件支持 Markdown，降低后续写作和 AI 生成成本。
- 提供文章模板机制，后续可切换不同详情页版式。
- 支持 Codex 定时生成文章，提交到仓库内容目录，触发 GitHub Actions 构建并发布。
- 保持 GitHub Pages 静态部署，不引入运行时服务依赖。

## 2. 总体架构

推荐采用“内容源 Markdown + 构建产物 HTML/JSON”的静态生成方式。

```text
Markdown 文章源
  -> 构建脚本解析 frontmatter 和正文
  -> 生成文章索引 JSON
  -> 生成 blog 列表页数据
  -> 按模板生成详情页 HTML
  -> GitHub Actions 发布到 GitHub Pages
```

核心原则：

- 写作源文件放在独立内容目录，不直接手写详情页 HTML。
- `blog/index.html` 作为列表应用入口，通过 JSON 数据渲染列表、标签和搜索结果。
- 每篇文章生成一个稳定 URL，例如 `/blog/posts/2026/ai-agent-notes/`。
- 搜索在浏览器端完成，数据来自构建产出的 `blog/posts/index.json`。
- AI 生成只负责产出 Markdown 草稿或待发布文章，不直接改页面代码。

## 3. 建议目录结构

```text
content/
  blog/
    drafts/
      2026-06-article-draft.md
    posts/
      2026/
        2026-06-23-ai-agent-notes.md

blog/
  index.html
  posts/
    index.json
    2026/
      ai-agent-notes/
        index.html

assets/
  blog.css
  blog.js

scripts/
  blog/
    build-blog.mjs
    validate-posts.mjs
    templates/
      default.html
      note.html
      longform.html

.github/
  workflows/
    deploy-pages.yml
    ai-blog-generate.yml
```

目录说明：

- `content/blog/posts/`：正式发布文章源文件，进入构建和发布。
- `content/blog/drafts/`：草稿区，不进入线上构建，适合 Codex 生成后人工确认。
- `scripts/blog/build-blog.mjs`：读取 Markdown，生成详情页和索引 JSON。
- `scripts/blog/templates/`：详情页模板，文章通过 frontmatter 选择模板。
- `blog/posts/index.json`：列表页和搜索使用的文章元数据。

## 4. Markdown 文章格式

每篇文章使用 Markdown + YAML frontmatter。

```markdown
---
title: "AI Agent 的个人知识管理实验"
slug: "ai-agent-knowledge-notes"
date: "2026-06-23"
updated: "2026-06-23"
status: "published"
summary: "记录一次用 AI Agent 整理个人知识库的实验过程。"
tags:
  - AI
  - Agent
  - Knowledge
template: "note"
cover: ""
source: "human"
channels:
  canonical: "site"
  published:
    - platform: "site"
      url: "/blog/posts/2026/ai-agent-knowledge-notes/"
      status: "published"
      publishedAt: "2026-06-23"
    - platform: "wechat"
      url: ""
      status: "draft"
    - platform: "juejin"
      url: ""
      status: "pending"
---

# AI Agent 的个人知识管理实验

正文内容...
```

字段约定：

- `title`：必填，列表页和详情页标题。
- `slug`：必填，同一年内唯一，用于生成 URL。
- `date`：必填，发布日期。
- `updated`：可选，更新日期。
- `status`：必填，`draft` 或 `published`。只有 `published` 进入线上构建。
- `summary`：必填，列表摘要和搜索结果摘要。
- `tags`：必填，至少 1 个标签。
- `template`：可选，默认 `default`。
- `cover`：可选，封面图路径。
- `source`：可选，建议为 `human`、`ai-assisted` 或 `ai-generated`。
- `channels`：可选，多平台发布渠道元数据，用于记录文章是否同步到站外平台。

## 5. 多平台发布标志

Blog 文章可能会同步发布到微信公众号、掘金、知乎、CSDN、Medium、LinkedIn 等平台。为避免多平台链接和状态混乱，建议从一开始在 frontmatter 中维护发布渠道元数据。

字段示例：

```yaml
channels:
  canonical: "site"
  published:
    - platform: "site"
      url: "/blog/posts/2026/ai-agent-knowledge-notes/"
      status: "published"
      publishedAt: "2026-06-23"
    - platform: "wechat"
      url: ""
      status: "draft"
    - platform: "zhihu"
      url: "https://zhuanlan.zhihu.com/p/example"
      status: "published"
      publishedAt: "2026-06-24"
```

字段说明：

- `canonical`：主版本平台，默认建议为 `site`，表示个人站是文章的主版本。
- `published`：各平台发布记录列表。
- `platform`：平台标识，例如 `site`、`wechat`、`juejin`、`zhihu`、`csdn`、`medium`、`x`、`linkedin`。
- `url`：该平台文章地址。尚未发布时可为空。
- `status`：该平台发布状态。
- `publishedAt`：该平台实际发布时间，可选。

状态枚举：

- `draft`：未准备发布。
- `pending`：等待分发或等待人工发布。
- `published`：已发布。
- `failed`：分发失败。
- `skipped`：明确不发布到该平台。

页面展示建议：

- 列表页只展示文章来源 `source` 和核心标签，不展示完整渠道状态，避免信息过载。
- 详情页可以在文章头部或尾部展示“发布渠道”。
- 只有 `status: "published"` 且 `url` 非空的平台才显示为可点击链接。
- `canonical` 平台可以显示为“主版本”或 `Canonical` 标识。
- 未发布、失败、跳过的平台不在前台展示，只作为自动化和维护数据使用。

自动化用途：

- Codex 或后续分发脚本可以根据 `channels.published[].status` 判断哪些平台还未发布。
- 站外发布成功后，可以回写对应平台的 `url`、`status` 和 `publishedAt`。
- 如果未来支持自动同步，分发任务应只处理 `pending` 状态的平台。

## 6. 列表页设计

列表页路径保持为：

```text
/blog/
```

列表页能力：

- 显示文章标题、日期、摘要、标签、来源标识。
- 支持关键词模糊搜索，匹配范围包括标题、摘要、标签和正文提取文本。
- 支持标签筛选，可单选或多选。
- 支持按发布时间倒序展示。
- 支持空状态，例如“没有匹配的文章”。
- 支持 URL 参数，方便分享筛选结果：
  - `/blog/?q=agent`
  - `/blog/?tag=AI`
  - `/blog/?q=android&tag=AI`

浏览器端搜索数据来自：

```text
/blog/posts/index.json
```

索引 JSON 示例：

```json
[
  {
    "title": "AI Agent 的个人知识管理实验",
    "url": "/blog/posts/2026/ai-agent-knowledge-notes/",
    "date": "2026-06-23",
    "summary": "记录一次用 AI Agent 整理个人知识库的实验过程。",
    "tags": ["AI", "Agent", "Knowledge"],
    "template": "note",
    "source": "ai-assisted",
    "searchText": "ai agent 个人知识管理 实验 ..."
  }
]
```

第一阶段可以用轻量级本地模糊匹配：

- 对搜索词做小写、空格切分。
- 对 `title + summary + tags + searchText` 做包含匹配。
- 多关键词使用 AND 逻辑。

当文章数量明显增加后，再考虑引入 Fuse.js 生成更细的匹配分数。

## 7. 详情页与模板机制

详情页生成路径：

```text
/blog/posts/{year}/{slug}/
```

详情页基础结构：

- 顶部导航：返回首页、返回 Blog、语言/主题控制沿用站点现有能力。
- 文章头部：标题、日期、更新时间、标签、摘要、来源标识。
- 正文区域：Markdown 渲染出的 HTML。
- 文章尾部：发布渠道、上一篇/下一篇、返回列表、可选相关文章。

模板建议：

- `default`：通用技术文章模板。
- `note`：短笔记模板，适合想法、摘录、实验记录。
- `longform`：长文模板，适合目录、章节、引用块更丰富的文章。

模板切换方式：

```yaml
template: "note"
```

构建脚本根据 `template` 字段选择 `scripts/blog/templates/{template}.html`。如果模板不存在，则降级到 `default.html` 并在构建日志中给出警告。

## 8. 构建脚本方案

建议使用 Node.js 脚本，适合当前静态仓库，也便于 GitHub Actions 使用。

依赖建议：

- `gray-matter`：解析 frontmatter。
- `markdown-it`：Markdown 转 HTML。
- `markdown-it-anchor`：给标题生成锚点，可选。
- `sanitize-html`：控制生成 HTML 的安全边界，可选。

构建流程：

1. 扫描 `content/blog/posts/**/*.md`。
2. 解析 frontmatter，校验必填字段。
3. 过滤 `status !== "published"` 的文章。
4. Markdown 转 HTML。
5. 根据 `date` 和 `slug` 生成详情页目录。
6. 读取模板并注入文章数据。
7. 生成 `blog/posts/index.json`。
8. 过滤并规范化多平台发布渠道数据。
9. 可选：生成 `blog/sitemap.json` 或更新站点 sitemap。

校验规则：

- `title`、`slug`、`date`、`summary`、`tags` 必填。
- `tags` 至少包含一个非空字符串。
- `slug` 只允许小写字母、数字和连字符。
- 同一年内 `slug` 不可重复。
- `date` 必须是 `YYYY-MM-DD`。
- `template` 不存在时给警告，不阻断构建。
- `channels.canonical` 如未配置，默认使用 `site`。
- `channels.published[].status` 必须属于 `draft`、`pending`、`published`、`failed`、`skipped`。
- 详情页只渲染 `status: "published"` 且 `url` 非空的站外渠道链接。

## 9. AI 定时生成文章流程

目标是让 Codex 定时围绕感兴趣主题生成文章，并把 Markdown 文件提交到仓库目录中。

推荐先采用“生成草稿，人工确认发布”的流程：

```text
Codex 定时任务
  -> 选择主题或读取主题池
  -> 生成 Markdown 草稿
  -> 保存到 content/blog/drafts/
  -> 创建分支 / PR 或提交到指定分支
  -> 人工 review
  -> 移动到 content/blog/posts/
  -> 合并后触发部署
```

原因：

- Blog 是个人表达空间，AI 生成内容需要保留最终编辑权。
- 草稿区可以避免低质量或重复文章直接上线。
- 人工 review 时可以补充个人观点，让文章更像“自己写的文章”。

后续如果质量稳定，可以增加自动发布模式：

```yaml
status: "published"
source: "ai-assisted"
channels:
  canonical: "site"
  published:
    - platform: "site"
      status: "published"
    - platform: "juejin"
      status: "pending"
```

主题池可以放在：

```text
content/blog/topics.json
```

示例：

```json
[
  {
    "name": "AI Agent 工作流",
    "tags": ["AI", "Agent", "Productivity"],
    "cadence": "weekly"
  },
  {
    "name": "Android 工程实践",
    "tags": ["Android", "Engineering"],
    "cadence": "monthly"
  }
]
```

## 10. GitHub Actions 方案

建议保留当前 GitHub Pages 发布方式，在发布前增加 blog 构建步骤。

部署 workflow 关键步骤：

```yaml
- name: Install dependencies
  run: npm ci

- name: Build blog
  run: npm run blog:build

- name: Deploy GitHub Pages
  uses: actions/deploy-pages@v4
```

AI 生成 workflow 可以独立：

```text
.github/workflows/ai-blog-generate.yml
```

触发方式：

- `schedule`：定时生成，例如每周一次。
- `workflow_dispatch`：手动指定主题生成。

生成方式建议：

- 第一阶段由 Codex 自动化或本地任务完成，不把 API 密钥直接写入仓库。
- 如果使用 GitHub Actions 调模型，需要通过 GitHub Secrets 管理密钥。
- 生成结果默认提交到草稿目录，并创建 PR。

## 11. 迁移计划

第一阶段：方案和内容模型

- 新增本方案文档。
- 确定 `content/blog/posts/` 和 frontmatter 规范。
- 补充 1 篇示例 Markdown。

第二阶段：静态构建

- 新增 Node 构建脚本。
- 生成 `blog/posts/index.json`。
- 生成详情页 HTML。
- 接入现有部署 workflow。

第三阶段：列表页改造

- 改造 `blog/index.html`，改为读取 JSON 渲染。
- 增加搜索框、标签筛选、空状态。
- 保留主题切换和语言控制。

第四阶段：模板体系

- 抽出 `default`、`note` 模板。
- 支持 frontmatter 选择模板。
- 增加模板缺失降级策略。

第五阶段：AI 生成链路

- 新增主题池。
- 建立 Codex 定时任务生成草稿。
- 生成 PR，由人工确认后发布。
- 增加多平台发布状态回写机制。
- 观察质量后决定是否允许自动发布。

## 12. 风险与约束

- 搜索只在前端进行，文章数量很大时需要优化索引体积。
- AI 生成内容可能重复、空泛或事实不准确，必须保留人工 review 机制。
- 多平台发布可能出现内容版本不一致，需要以 `canonical` 字段明确主版本。
- 当前仓库部分中文内容可能存在编码显示问题，实施时需要统一使用 UTF-8。
- 详情页模板如果过多，会增加维护成本，第一阶段建议只实现 1 到 2 个模板。
- GitHub Pages 是静态托管，不适合实现服务端搜索或动态权限能力。

## 13. 推荐优先级

P0：

- Markdown 文章源目录。
- frontmatter 规范与校验。
- 多平台发布渠道元数据。
- 构建脚本生成详情页和索引 JSON。
- Blog 列表页搜索与标签筛选。

P1：

- 多模板详情页。
- 文章上一篇/下一篇。
- 主题池和 AI 草稿生成。
- 站外平台发布状态回写。

P2：

- Fuse.js 高级搜索。
- 相关文章推荐。
- 自动发布模式。
- RSS 或 sitemap。

