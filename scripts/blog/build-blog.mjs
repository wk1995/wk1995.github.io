import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";

const rootDir = process.cwd();
const postsDir = path.join(rootDir, "content", "blog", "posts");
const outputDir = path.join(rootDir, "blog", "posts");
const templateDir = path.join(rootDir, "scripts", "blog", "templates");

const topbarHtml = `
<div class="site-topbar">
  <a class="brand-link" href="https://github.com/wk1995" target="_blank" rel="noopener" data-i18n-aria="brand.aria" aria-label="打开 WK1995 的 GitHub 主页">
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path d="M8 0C3.58 0 0 3.58 0 8a8 8 0 0 0 5.47 7.59c.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.5-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.01.08-2.1 0 0 .67-.21 2.2.82a7.56 7.56 0 0 1 4 0c1.53-1.04 2.2-.82 2.2-.82.44 1.09.16 1.9.08 2.1.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8 8 0 0 0 16 8c0-4.42-3.58-8-8-8Z"></path>
    </svg>
  </a>
  <div class="topbar-right">
    <div class="control-row">
      <a class="github-auth-button github-auth-button-secondary" href="https://github.com/wk1995/wk1995.github.io/issues/new" data-feedback-entry>反馈</a>
      <label class="control-group" for="language-select">
        <span class="control-label" id="language-label" data-i18n="controls.language">语言</span>
        <select class="language-select" id="language-select" aria-label="语言">
          <option value="zh">简体中文</option>
          <option value="en">English</option>
        </select>
      </label>
      <div class="control-group">
        <span class="control-label" id="theme-caption" data-i18n="controls.theme">主题</span>
        <button class="theme-toggle" id="theme-toggle" type="button" aria-label="切换主题">
          <svg viewBox="0 0 16 16" aria-hidden="true">
            <path id="theme-icon" d="M9.598 1.591a.75.75 0 0 1 .287.857 6.998 6.998 0 0 0 8.442 8.442.75.75 0 0 1 .857.287.75.75 0 0 1-.131.94A8.5 8.5 0 1 1 8.658.722a.75.75 0 0 1 .94-.131Z"></path>
          </svg>
          <span id="theme-label" data-i18n="controls.theme.dark">暗色</span>
        </button>
      </div>
    </div>
  </div>
</div>`;

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function slugify(value) {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function formatDate(date) {
  return String(date).replaceAll("-", ".");
}

async function collectMarkdownFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...await collectMarkdownFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith(".md")) {
      files.push(fullPath);
    }
  }
  return files;
}

function parseScalar(value) {
  const trimmed = value.trim();
  if (trimmed === "true") return true;
  if (trimmed === "false") return false;
  if (trimmed === '""' || trimmed === "''") return "";
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function parseFrontmatter(markdown, filePath) {
  const match = markdown.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) {
    throw new Error(`${filePath} 缺少 YAML frontmatter`);
  }

  const data = {};
  const lines = match[1].split(/\r?\n/);
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];
    const pair = line.match(/^([A-Za-z0-9_-]+):(?:\s*(.*))?$/);
    if (!pair) {
      index += 1;
      continue;
    }

    const key = pair[1];
    const value = pair[2] ?? "";

    if (value !== "") {
      data[key] = parseScalar(value);
      index += 1;
      continue;
    }

    const next = lines[index + 1] ?? "";
    if (/^\s+-\s+/.test(next)) {
      const list = [];
      index += 1;
      while (index < lines.length && /^\s+-\s+/.test(lines[index])) {
        list.push(parseScalar(lines[index].replace(/^\s+-\s+/, "")));
        index += 1;
      }
      data[key] = list;
      continue;
    }

    if (/^\s+[A-Za-z0-9_-]+:/.test(next)) {
      const { value: objectValue, nextIndex } = parseIndentedObject(lines, index + 1, 2);
      data[key] = objectValue;
      index = nextIndex;
      continue;
    }

    data[key] = "";
    index += 1;
  }

  return { data, body: match[2].trim() };
}

function parseIndentedObject(lines, startIndex, indent) {
  const objectValue = {};
  let index = startIndex;

  while (index < lines.length) {
    const line = lines[index];
    if (!line.startsWith(" ".repeat(indent)) || line.trim() === "") break;

    const listPair = line.match(new RegExp(`^\\s{${indent}}([A-Za-z0-9_-]+):\\s*$`));
    const scalarPair = line.match(new RegExp(`^\\s{${indent}}([A-Za-z0-9_-]+):\\s*(.*)$`));

    if (listPair && /^\s+-\s+/.test(lines[index + 1] ?? "")) {
      const key = listPair[1];
      const list = [];
      index += 1;
      while (index < lines.length && lines[index].startsWith(" ".repeat(indent + 2) + "- ")) {
        const item = {};
        const first = lines[index].replace(new RegExp(`^\\s{${indent + 2}}-\\s+`), "");
        const firstPair = first.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
        if (firstPair) item[firstPair[1]] = parseScalar(firstPair[2]);
        index += 1;
        while (index < lines.length && lines[index].startsWith(" ".repeat(indent + 4))) {
          const itemPair = lines[index].match(new RegExp(`^\\s{${indent + 4}}([A-Za-z0-9_-]+):\\s*(.*)$`));
          if (itemPair) item[itemPair[1]] = parseScalar(itemPair[2]);
          index += 1;
        }
        list.push(item);
      }
      objectValue[key] = list;
      continue;
    }

    if (scalarPair) {
      objectValue[scalarPair[1]] = parseScalar(scalarPair[2] ?? "");
    }
    index += 1;
  }

  return { value: objectValue, nextIndex: index };
}

function renderInline(text) {
  let html = escapeHtml(text);
  html = html.replace(/`([^`]+)`/g, "<code>$1</code>");
  html = html.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
  return html;
}

function renderMarkdown(markdown) {
  const lines = markdown.split(/\r?\n/);
  const html = [];
  let paragraph = [];
  let list = [];
  let inCode = false;
  let code = [];

  function flushParagraph() {
    if (paragraph.length) {
      html.push(`<p>${renderInline(paragraph.join(" "))}</p>`);
      paragraph = [];
    }
  }

  function flushList() {
    if (list.length) {
      html.push(`<ul>${list.map((item) => `<li>${renderInline(item)}</li>`).join("")}</ul>`);
      list = [];
    }
  }

  for (const line of lines) {
    if (line.startsWith("```")) {
      if (inCode) {
        html.push(`<pre><code>${escapeHtml(code.join("\n"))}</code></pre>`);
        code = [];
        inCode = false;
      } else {
        flushParagraph();
        flushList();
        inCode = true;
      }
      continue;
    }

    if (inCode) {
      code.push(line);
      continue;
    }

    if (!line.trim()) {
      flushParagraph();
      flushList();
      continue;
    }

    const heading = line.match(/^(#{1,3})\s+(.+)$/);
    if (heading) {
      flushParagraph();
      flushList();
      const level = heading[1].length;
      const id = slugify(heading[2]);
      html.push(`<h${level} id="${escapeHtml(id)}">${renderInline(heading[2])}</h${level}>`);
      continue;
    }

    const bullet = line.match(/^[-*]\s+(.+)$/);
    if (bullet) {
      flushParagraph();
      list.push(bullet[1]);
      continue;
    }

    const numbered = line.match(/^\d+\.\s+(.+)$/);
    if (numbered) {
      flushParagraph();
      list.push(numbered[1]);
      continue;
    }

    const quote = line.match(/^>\s+(.+)$/);
    if (quote) {
      flushParagraph();
      flushList();
      html.push(`<blockquote>${renderInline(quote[1])}</blockquote>`);
      continue;
    }

    paragraph.push(line.trim());
  }

  flushParagraph();
  flushList();
  return html.join("\n");
}

function validatePost(post, filePath) {
  const required = ["title", "slug", "date", "summary", "tags"];
  for (const key of required) {
    if (!post[key] || (Array.isArray(post[key]) && post[key].length === 0)) {
      throw new Error(`${filePath} 缺少必填字段 ${key}`);
    }
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(post.date)) {
    throw new Error(`${filePath} date 必须为 YYYY-MM-DD`);
  }
  if (!/^[a-z0-9-]+$/.test(post.slug)) {
    throw new Error(`${filePath} slug 只允许小写字母、数字和连字符`);
  }
}

function buildTagHtml(tags, prefix) {
  return tags.map((tag) => `<a class="blog-tag" href="${prefix}blog/?tag=${encodeURIComponent(tag)}">${escapeHtml(tag)}</a>`).join("");
}

function buildChannelsHtml(post) {
  const channels = post.channels?.published ?? [];
  const visible = channels.filter((channel) => channel.status === "published" && channel.url);
  if (!visible.length) return "";
  const links = visible.map((channel) => {
    const isCanonical = post.channels?.canonical === channel.platform;
    const label = isCanonical ? `${channel.platform} · 主版本` : channel.platform;
    return `<a href="${escapeHtml(channel.url)}">${escapeHtml(label)}</a>`;
  }).join("");
  return `<section class="blog-article-panel"><h2>发布渠道</h2><div class="blog-channel-list">${links}</div></section>`;
}

function buildLikesHtml(post) {
  const likesEnabled = post.likes?.enabled ?? post.comments?.enabled ?? false;
  if (!likesEnabled) return "";
  return `<section class="blog-article-panel blog-interactions" data-blog-likes data-provider="${escapeHtml(post.likes?.provider || "giscus-reactions")}">
    <div>
      <h2>互动</h2>
      <p data-blog-interaction-copy>点赞通过 GitHub Discussions reactions 承载；评论区配置 Giscus 后即可登录 GitHub 互动。</p>
    </div>
    <div class="blog-interaction-actions">
      <button type="button" data-blog-action="like">点赞</button>
      <button type="button" data-blog-action="comment">发表评论</button>
    </div>
  </section>`;
}

function buildCommentsHtml(post) {
  if (!post.comments?.enabled) return "";
  return `<section class="blog-article-panel blog-comments" id="blog-comments" data-blog-comments data-provider="${escapeHtml(post.comments.provider || "giscus")}">
    <h2>评论</h2>
    <div class="blog-comments-placeholder" data-blog-comments-status>评论区已预留。配置 <code>window.WK_BLOG_COMMENTS</code> 后，这里会加载 Giscus。</div>
  </section>`;
}

function fillTemplate(template, values) {
  return template.replace(/\{\{([A-Za-z0-9_]+)\}\}/g, (_, key) => values[key] ?? "");
}

async function build() {
  const files = await collectMarkdownFiles(postsDir);
  const posts = [];

  for (const file of files) {
    const markdown = await readFile(file, "utf8");
    const { data, body } = parseFrontmatter(markdown, file);
    if (data.status !== "published") continue;
    validatePost(data, file);
    const year = data.date.slice(0, 4);
    const url = `/blog/posts/${year}/${data.slug}/`;
    const html = renderMarkdown(body);
    const text = body.replace(/```[\s\S]*?```/g, " ").replace(/[#>*`\-[\]()]/g, " ");

    posts.push({
      ...data,
      year,
      url,
      html,
      searchText: `${data.title} ${data.summary} ${data.tags.join(" ")} ${text}`.replace(/\s+/g, " ").trim(),
    });
  }

  posts.sort((a, b) => b.date.localeCompare(a.date) || a.title.localeCompare(b.title));

  await rm(outputDir, { recursive: true, force: true });
  await mkdir(outputDir, { recursive: true });

  const templateCache = new Map();
  const slugKeys = new Set();

  for (const [index, post] of posts.entries()) {
    const slugKey = `${post.year}/${post.slug}`;
    if (slugKeys.has(slugKey)) {
      throw new Error(`重复 slug: ${slugKey}`);
    }
    slugKeys.add(slugKey);

    const templateName = post.template || "default";
    let template = templateCache.get(templateName);
    if (!template) {
      const templatePath = path.join(templateDir, `${templateName}.html`);
      try {
        template = await readFile(templatePath, "utf8");
      } catch {
        template = await readFile(path.join(templateDir, "default.html"), "utf8");
      }
      templateCache.set(templateName, template);
    }

    const previous = posts[index + 1];
    const next = posts[index - 1];
    const assetPrefix = "../../../../";
    const outputPostDir = path.join(outputDir, post.year, post.slug);

    await mkdir(outputPostDir, { recursive: true });
    await writeFile(path.join(outputPostDir, "index.html"), fillTemplate(template, {
      title: escapeHtml(post.title),
      summary: escapeHtml(post.summary),
      topbar: topbarHtml,
      assetPrefix,
      date: escapeHtml(post.date),
      displayDate: formatDate(post.date),
      updatedHtml: post.updated ? `<span>更新 ${escapeHtml(formatDate(post.updated))}</span>` : "",
      sourceLabel: escapeHtml(post.source || "human"),
      tagsHtml: buildTagHtml(post.tags, assetPrefix),
      content: post.html,
      channelsHtml: buildChannelsHtml(post),
      likesHtml: buildLikesHtml(post),
      commentsHtml: buildCommentsHtml(post),
      previousHtml: previous ? `<a href="${escapeHtml(previous.url)}"><span>上一篇</span>${escapeHtml(previous.title)}</a>` : "",
      nextHtml: next ? `<a href="${escapeHtml(next.url)}"><span>下一篇</span>${escapeHtml(next.title)}</a>` : "",
    }), "utf8");
  }

  const indexData = posts.map((post) => ({
    title: post.title,
    url: post.url,
    date: post.date,
    updated: post.updated || "",
    summary: post.summary,
    tags: post.tags,
    template: post.template || "default",
    source: post.source || "human",
    featured: Boolean(post.featured),
    homeRank: Number(post.homeRank || 0),
    channels: post.channels || { canonical: "site", published: [] },
    comments: post.comments || { enabled: false },
    likes: post.likes || { enabled: Boolean(post.comments?.enabled) },
    searchText: post.searchText,
  }));

  const homeData = [...posts]
    .sort((a, b) => {
      const featuredDelta = Number(Boolean(b.featured)) - Number(Boolean(a.featured));
      if (featuredDelta !== 0) return featuredDelta;
      if (a.featured && b.featured) {
        const rankDelta = Number(b.homeRank || 0) - Number(a.homeRank || 0);
        if (rankDelta !== 0) return rankDelta;
      }
      return b.date.localeCompare(a.date) || a.title.localeCompare(b.title);
    })
    .filter((post) => post.source !== "ai-generated" || post.featured)
    .slice(0, 3)
    .map((post) => ({
      title: post.title,
      url: post.url,
      date: post.date,
      summary: post.summary,
      tags: post.tags.slice(0, 3),
      source: post.source || "human",
      comments: post.comments || { enabled: false },
      likes: post.likes || { enabled: Boolean(post.comments?.enabled) },
    }));

  await writeFile(path.join(outputDir, "index.json"), `${JSON.stringify(indexData, null, 2)}\n`, "utf8");
  await writeFile(path.join(outputDir, "home.json"), `${JSON.stringify(homeData, null, 2)}\n`, "utf8");
  console.log(`Built ${posts.length} blog post(s).`);
}

build().catch((error) => {
  console.error(error);
  process.exit(1);
});
