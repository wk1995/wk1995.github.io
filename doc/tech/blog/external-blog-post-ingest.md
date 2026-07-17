# External Blog Post Ingest

This repository supports a file-based blog publishing contract. Other
repositories do not need to change the site code when adding an article.

## Content Contract

Publishable Markdown articles belong in:

```text
content/blog/posts/<year>/<yyyy-mm-dd-slug>.md
```

Drafts that should not appear on the live blog belong in:

```text
content/blog/drafts/
```

The blog build reads `content/blog/posts/**/*.md`, keeps only posts with
`status: "published"`, and generates:

```text
blog/posts/<year>/<slug>/index.html
blog/posts/index.json
blog/posts/home.json
```

`blog/posts/index.json` powers the blog list, tag filters, and search. No page
code changes are needed for a new article when the Markdown follows the
frontmatter contract.

## Required Frontmatter

```markdown
---
title: "Article title"
slug: "article-slug"
date: "2026-07-17"
updated: "2026-07-17"
status: "published"
summary: "Short summary for list and search results."
tags:
  - AI
  - Blog
template: "default"
source: "human"
featured: false
homeRank: 0
comments:
  enabled: false
likes:
  enabled: false
channels:
  canonical: "site"
  published:
    - platform: "site"
      url: "/blog/posts/2026/article-slug/"
      status: "published"
      publishedAt: "2026-07-17"
---

# Article title

Article body...
```

Required fields are `title`, `slug`, `date`, `status`, `summary`, and `tags`.
`slug` must use lowercase letters, numbers, and hyphens. `date` must use
`YYYY-MM-DD`.

## Direct Git Publishing

An external repository can commit a Markdown file directly to the `page` branch
under `content/blog/posts/<year>/`. The existing Pages workflow will run the
blog build and deploy the updated site.

## Repository Dispatch Publishing

External repositories can also call the `Receive Blog Post` workflow with a
`repository_dispatch` event of type `blog-post-publish`.

Example source-repository workflow step:

```yaml
- name: Publish article to wk1995.github.io
  env:
    TARGET_TOKEN: ${{ secrets.WK1995_GITHUB_IO_TOKEN }}
    ARTICLE_PATH: content/output/my-article.md
  run: |
    CONTENT_BASE64="$(base64 -w 0 "$ARTICLE_PATH")"
    curl -fsSL -X POST \
      -H "Accept: application/vnd.github+json" \
      -H "Authorization: Bearer ${TARGET_TOKEN}" \
      https://api.github.com/repos/wk1995/wk1995.github.io/dispatches \
      -d @- <<JSON
    {
      "event_type": "blog-post-publish",
      "client_payload": {
        "content_base64": "${CONTENT_BASE64}",
        "target": "posts",
        "target_branch": "page",
        "overwrite": false
      }
    }
    JSON
```

The source repository should store the token in `WK1995_GITHUB_IO_TOKEN`. The
token must be allowed to trigger repository dispatch events for
`wk1995/wk1995.github.io`.

For review-only publishing, send `"target": "drafts"` instead. Drafts are
committed to `content/blog/drafts/` but are not shown on the live blog.
