---
name: wk-news-article-drafter
description: Draft sourced Markdown articles for wk1995.github.io from a topic and date range. Use when the user asks to collect news, GitHub repositories, RSS/site sources, or Edge AI updates for a specified time period and turn them into a blog-ready article of a requested length, with numbered citations such as [S1].
---

# WK News Article Drafter

## Overview

Use this skill to generate a sourced article draft for this repository's blog/news workflow. The workflow gathers topic data for a date range, creates a Markdown draft, then edits it to the user's requested length and angle.

## Repository Entry Points

- Draft script: `scripts/news/build-news-draft.mjs`
- General topic config: `content/blog/topics/news-topics.json`
- Edge AI topic config: `content/blog/topics/edge-ai-news.json`
- Draft output directory: `content/blog/drafts/`
- Blog publishing source: `content/blog/posts/`
- Blog build command: `npm run blog:build`
- Edge AI workflow: `.github/workflows/build-edge-ai-news-draft.yml`

## Workflow

1. Identify the topic, date range, and requested article length.
   - If the user says "端侧 AI", "Edge AI", "Android AI", "on-device AI", or similar, use `content/blog/topics/edge-ai-news.json`.
   - For general developer/tooling topics, use `content/blog/topics/news-topics.json`.
   - For another topic, create or update a topic config under `content/blog/topics/` before running the script.
2. Run the draft script locally unless the user explicitly asks to use GitHub Actions.
3. Inspect the generated Markdown.
   - Confirm frontmatter has `status: "draft"`.
   - Confirm the body uses numbered citations like `[S1]`.
   - Confirm `## 参考链接` exists and every important claim has a source.
4. Rewrite the draft to the requested length and shape.
   - Short: about 800-1200 Chinese characters, usually 3-5 sections.
   - Medium: about 1500-2500 Chinese characters, with clear sections and source-backed claims.
   - Long: about 3000-5000 Chinese characters, with analysis, project notes, and follow-up observations.
   - If the user gives an exact word/character count, prioritize that over the presets.
5. Keep the article as a draft unless the user asks to publish.
   - Do not move files into `content/blog/posts/` without an explicit publish/release instruction.
   - Do not remove citations during rewriting.

## Commands

Edge AI weekly draft:

```bash
node scripts/news/build-news-draft.mjs --topic-config content/blog/topics/edge-ai-news.json --range 7d --mode weekly
```

General topic draft:

```bash
node scripts/news/build-news-draft.mjs --topic-config content/blog/topics/news-topics.json --range 7d --mode weekly
```

Specific date range:

```bash
node scripts/news/build-news-draft.mjs --topic-config content/blog/topics/edge-ai-news.json --from 2026-07-01 --to 2026-07-12 --mode topic
```

Temporary keywords:

```bash
node scripts/news/build-news-draft.mjs --topic-config content/blog/topics/edge-ai-news.json --keywords "Gemini Nano, MediaPipe, Android AI" --range 30d --mode topic
```

Safe test output outside the repo:

```bash
node scripts/news/build-news-draft.mjs --topic-config content/blog/topics/edge-ai-news.json --range 7d --mode weekly --output "$env:TEMP/wk-news-drafts"
```

## Topic Config Pattern

Use this shape for new topics:

```json
{
  "name": "主题名称",
  "description": "主题边界说明",
  "keywords": ["core keyword"],
  "expandedKeywords": ["related keyword"],
  "tags": ["News"],
  "mode": "weekly",
  "cadence": "weekly",
  "sources": [
    {
      "type": "rss",
      "name": "Source Name",
      "url": "https://example.com/feed.xml"
    },
    {
      "type": "github",
      "name": "GitHub search",
      "query": "topic keyword"
    }
  ]
}
```

Use `scoringProfile: "edge-ai"` only for Edge AI/on-device AI topics.

## Article Requirements

- Keep source annotations in the body as `[S1]`, `[S2]`, etc.
- Prefer official sources, GitHub repositories, release notes, docs, papers, or model cards.
- Treat community discussion as a trend signal, not a confirmed fact.
- Summarize and analyze; do not copy long source passages.
- Keep the final draft in Markdown with blog frontmatter.
- Use `channels` metadata so site and WeChat publication status can be tracked.

## Validation

Before saying the article is ready:

```bash
node --check scripts/news/build-news-draft.mjs
```

For generated drafts, search for:

```bash
Select-String -Path content/blog/drafts/*.md -Pattern '\[S1\]|## 参考链接|status: "draft"'
```

If publishing to the site, run:

```bash
npm run blog:build
```
