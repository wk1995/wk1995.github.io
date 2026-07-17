import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";

const rootDir = process.cwd();
const defaultOutputDir = path.join(rootDir, "content", "blog", "drafts");

function parseArgs(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith("--")) continue;
    const key = token.slice(2);
    const next = argv[index + 1];
    if (!next || next.startsWith("--")) {
      args[key] = true;
    } else {
      args[key] = next;
      index += 1;
    }
  }
  return args;
}

function splitList(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter(Boolean);
  return String(value)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function toShanghaiDate(date = new Date()) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(date);
}

function parseDate(value) {
  if (!value) return null;
  const parsed = new Date(`${value}T00:00:00+08:00`);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

function getDateRange(args) {
  const todayText = toShanghaiDate();
  const today = parseDate(todayText);
  const to = parseDate(args.to) || today;
  let from = parseDate(args.from);

  if (!from) {
    const range = String(args.range || "7d").match(/^(\d+)d$/i);
    const days = range ? Number(range[1]) : 7;
    from = new Date(to.getTime() - days * 24 * 60 * 60 * 1000);
  }

  return {
    from,
    to,
    fromText: toShanghaiDate(from),
    toText: toShanghaiDate(to),
    label: `${toShanghaiDate(from)} 至 ${toShanghaiDate(to)}`,
  };
}

async function readTopicConfig(configPath) {
  if (!configPath) return {};
  const absolutePath = path.isAbsolute(configPath) ? configPath : path.join(rootDir, configPath);
  const raw = await readFile(absolutePath, "utf8");
  const parsed = JSON.parse(raw);
  if (Array.isArray(parsed)) {
    return {
      name: parsed.map((item) => item.name).filter(Boolean).join(" / ") || "资讯草稿",
      keywords: [...new Set(parsed.flatMap((item) => item.keywords || []))],
      expandedKeywords: [...new Set(parsed.flatMap((item) => item.expandedKeywords || []))],
      tags: [...new Set(parsed.flatMap((item) => item.tags || []))],
      mode: parsed[0]?.mode || "weekly",
      sources: parsed.flatMap((item) => item.sources || []),
      topics: parsed,
    };
  }
  return parsed;
}

function mergeTopic(config, args) {
  const keywords = args.keywords ? splitList(args.keywords) : splitList(config.keywords);
  const expandedKeywords = splitList(config.expandedKeywords);
  const tags = splitList(config.tags);
  return {
    name: args.topic || config.name || "资讯草稿",
    description: config.description || "",
    keywords,
    expandedKeywords,
    tags: tags.length ? tags : ["News"],
    mode: args.mode || config.mode || "weekly",
    sources: config.sources || [],
    scoringProfile: config.scoringProfile || "general",
  };
}

function decodeXml(value = "") {
  return String(value)
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x2F;/g, "/")
    .trim();
}

function stripHtml(value = "") {
  return decodeXml(value)
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function escapeMarkdown(value = "") {
  return String(value).replace(/\[/g, "\\[").replace(/\]/g, "\\]");
}

function slugify(value) {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function hash(value) {
  return crypto.createHash("sha1").update(value).digest("hex").slice(0, 12);
}

async function fetchText(url, headers = {}) {
  const response = await fetch(url, {
    headers: {
      "user-agent": "wk1995-news-draft/1.0",
      ...headers,
    },
  });
  if (!response.ok) {
    throw new Error(`Fetch failed ${response.status}: ${url}`);
  }
  return response.text();
}

function pickXmlValue(block, names) {
  for (const name of names) {
    const match = block.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)<\\/${name}>`, "i"));
    if (match) return decodeXml(match[1]);
  }
  return "";
}

function pickXmlLink(block) {
  const atomLink = block.match(/<link[^>]+href=["']([^"']+)["'][^>]*>/i);
  if (atomLink) return decodeXml(atomLink[1]);
  return pickXmlValue(block, ["link", "guid"]);
}

function parseRssItems(xml, source) {
  const blocks = [...xml.matchAll(/<item[\s\S]*?<\/item>|<entry[\s\S]*?<\/entry>/gi)].map((match) => match[0]);
  return blocks.map((block) => {
    const title = pickXmlValue(block, ["title"]);
    const url = pickXmlLink(block);
    const publishedAt = pickXmlValue(block, ["pubDate", "published", "updated", "dc:date"]);
    const summary = stripHtml(pickXmlValue(block, ["description", "summary", "content:encoded", "content"]));
    return {
      id: hash(url || title),
      type: "news",
      title,
      url,
      source: source.name,
      sourceType: "official",
      citationLabel: source.name,
      publishedAt: normalizeDate(publishedAt),
      summary,
      rawSummary: summary,
    };
  }).filter((item) => item.title && item.url);
}

function normalizeDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return toShanghaiDate(date);
}

function isWithinRange(value, range) {
  if (!value) return true;
  const date = parseDate(value);
  if (!date) return true;
  return date.getTime() >= range.from.getTime() && date.getTime() <= range.to.getTime() + 24 * 60 * 60 * 1000 - 1;
}

async function collectRss(source, range) {
  try {
    const xml = await fetchText(source.url);
    return parseRssItems(xml, source).filter((item) => isWithinRange(item.publishedAt, range));
  } catch (error) {
    return [{
      id: hash(`${source.name}:${source.url}:error`),
      type: "source-error",
      title: `${source.name} 抓取失败`,
      url: source.url,
      source: source.name,
      sourceType: "official",
      citationLabel: source.name,
      publishedAt: "",
      summary: error.message,
      score: 0,
      reason: "RSS source failed.",
    }];
  }
}

async function collectGithub(source, topic, range, limit) {
  const query = source.query || topic.keywords.join(" ");
  const updated = `pushed:>=${range.fromText}`;
  const url = `https://api.github.com/search/repositories?q=${encodeURIComponent(`${query} ${updated}`)}&sort=updated&order=desc&per_page=${Math.min(limit, 20)}`;
  const headers = process.env.GITHUB_TOKEN ? { authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {};
  try {
    const raw = await fetchText(url, headers);
    const data = JSON.parse(raw);
    return (data.items || []).map((repo) => ({
      id: `github-${repo.full_name}`,
      type: "github",
      title: repo.full_name,
      repo: repo.full_name,
      url: repo.html_url,
      description: repo.description || "",
      language: repo.language || "",
      stars: repo.stargazers_count || 0,
      forks: repo.forks_count || 0,
      updatedAt: normalizeDate(repo.updated_at),
      publishedAt: normalizeDate(repo.updated_at),
      source: "GitHub",
      sourceType: "github",
      citationLabel: `GitHub ${repo.full_name}`,
      summary: repo.description || "GitHub repository matched the configured topic.",
    })).filter((item) => isWithinRange(item.updatedAt, range));
  } catch (error) {
    return [{
      id: hash(`github:${query}:error`),
      type: "source-error",
      title: `${source.name || "GitHub"} 抓取失败`,
      url: "https://github.com/search",
      source: source.name || "GitHub",
      sourceType: "github",
      citationLabel: source.name || "GitHub",
      publishedAt: "",
      summary: error.message,
      score: 0,
      reason: "GitHub source failed.",
    }];
  }
}

function collectSite(source) {
  return [{
    id: hash(`${source.name}:${source.url}`),
    type: "site",
    title: source.name,
    url: source.url,
    source: source.name,
    sourceType: "official",
    citationLabel: source.name,
    publishedAt: "",
    summary: source.summary || `${source.name} 是当前主题的手工配置来源，需要人工查看后补充判断。`,
  }];
}

function keywordScore(text, keywords, expandedKeywords, maxScore = 35) {
  const lower = text.toLowerCase();
  let score = 0;
  for (const keyword of keywords) {
    if (keyword && lower.includes(keyword.toLowerCase())) score += 10;
  }
  for (const keyword of expandedKeywords) {
    if (keyword && lower.includes(keyword.toLowerCase())) score += 5;
  }
  return Math.min(score, maxScore);
}

function sourceScore(sourceType, profile) {
  const edgeScores = {
    official: 20,
    github: 18,
    paper: 16,
    media: 10,
    community: 5,
  };
  const generalScores = {
    official: 20,
    github: 18,
    paper: 16,
    media: 12,
    community: 6,
  };
  const scores = profile === "edge-ai" ? edgeScores : generalScores;
  return scores[sourceType] ?? 8;
}

function freshnessScore(dateText, range) {
  if (!dateText) return 3;
  const date = parseDate(dateText);
  if (!date) return 3;
  const days = Math.max(0, Math.round((range.to.getTime() - date.getTime()) / (24 * 60 * 60 * 1000)));
  if (days <= 7) return 15;
  if (days <= 30) return 10;
  return 5;
}

function densityScore(item, profile) {
  const text = `${item.title} ${item.summary} ${item.description || ""}`.toLowerCase();
  const denseTerms = profile === "edge-ai"
    ? ["api", "sdk", "release", "benchmark", "model", "github", "code", "android", "inference", "quantization", "mobile", "device"]
    : ["api", "sdk", "release", "benchmark", "model", "github", "code", "android", "inference"];
  const hits = denseTerms.filter((term) => text.includes(term)).length;
  if (hits >= 3) return 15;
  if (hits >= 1) return 10;
  return 4;
}

function discussionScore(item) {
  if (item.type === "github" && item.stars >= 1000) return 10;
  if (item.type === "github" && item.stars >= 100) return 6;
  return 0;
}

function writingScore(item) {
  return item.summary && item.summary.length > 80 ? 5 : 2;
}

function scoreItem(item, topic, range) {
  const text = `${item.title} ${item.summary} ${item.description || ""}`;
  const isEdgeProfile = topic.scoringProfile === "edge-ai";
  const relevance = keywordScore(text, topic.keywords, topic.expandedKeywords, isEdgeProfile ? 40 : 35);
  const credibility = sourceScore(item.sourceType, topic.scoringProfile);
  const freshness = freshnessScore(item.publishedAt || item.updatedAt, range);
  const density = densityScore(item, topic.scoringProfile);
  const discussion = discussionScore(item);
  const writing = isEdgeProfile ? 0 : writingScore(item);
  const score = relevance + credibility + freshness + density + discussion + writing;
  return {
    ...item,
    score,
    reason: item.reason || `相关性 ${relevance}，可信度 ${credibility}，新鲜度 ${freshness}。`,
    keywords: topic.keywords,
    tags: topic.tags,
  };
}

function dedupeItems(items) {
  const seen = new Map();
  for (const item of items) {
    const key = item.type === "github" ? item.id : (item.url || item.title).toLowerCase();
    const previous = seen.get(key);
    if (!previous || (item.score || 0) > (previous.score || 0)) {
      seen.set(key, item);
    }
  }
  return [...seen.values()];
}

function assignSourceIds(items) {
  return items.map((item, index) => ({
    ...item,
    sourceId: `S${index + 1}`,
  }));
}

async function collectSources(topic, range, limit) {
  const enabledSources = topic.sources.length ? topic.sources : [];
  const groups = await Promise.all(enabledSources.map((source) => {
    if (source.type === "rss") return collectRss(source, range);
    if (source.type === "github") return collectGithub(source, topic, range, limit);
    if (source.type === "site") return Promise.resolve(collectSite(source));
    return Promise.resolve([]);
  }));
  return groups.flat();
}

function summarizeItem(item) {
  const summary = stripHtml(item.summary || item.description || "");
  if (!summary) return "该来源命中主题关键词，需要人工进一步确认。";
  return summary.length > 180 ? `${summary.slice(0, 177)}...` : summary;
}

function renderFrontmatter(topic, args, range, slug) {
  const today = toShanghaiDate();
  const title = args.title || `${topic.name}：${range.label}`;
  const summary = `整理 ${range.label} 内与 ${topic.name} 相关的新闻、项目和趋势。`;
  return `---\ntitle: "${title.replaceAll('"', '\\"')}"\nslug: "${slug}"\ndate: "${today}"\nstatus: "${args["publish-status"] || "draft"}"\nsummary: "${summary.replaceAll('"', '\\"')}"\ntags:\n${topic.tags.map((tag) => `  - ${tag}`).join("\n")}\nsource: "ai-assisted"\nchannels:\n  canonical: "site"\n  published:\n    - platform: "site"\n      status: "draft"\n    - platform: "wechat"\n      status: "pending"\n---`;
}

function renderArticle(topic, args, range, items) {
  const slug = slugify(`${topic.name}-${range.toText}`);
  const frontmatter = renderFrontmatter(topic, args, range, slug);
  const sorted = items
    .filter((item) => item.type !== "source-error")
    .sort((a, b) => b.score - a.score)
    .slice(0, Number(args.limit || 30));
  const errors = items.filter((item) => item.type === "source-error");
  const news = sorted.filter((item) => item.type !== "github").slice(0, 10);
  const repos = sorted.filter((item) => item.type === "github").slice(0, 8);

  const lines = [
    frontmatter,
    "",
    `# ${topic.name}：${range.label}`,
    "",
    "## 本期判断",
    "",
    sorted.length
      ? `本期共整理 ${sorted.length} 条候选来源。优先关注高可信来源、近期更新和具备工程落地价值的内容。${sorted[0] ? `其中最值得先看的来源是 ${sorted[0].title}。[${sorted[0].sourceId}]` : ""}`
      : "本期没有抓取到足够可靠的来源，需要补充关键词或来源配置。",
    "",
    "## 重要动态",
    "",
  ];

  if (news.length) {
    for (const item of news) {
      lines.push(`- **${escapeMarkdown(item.title)}**：${escapeMarkdown(summarizeItem(item))} [${item.sourceId}]`);
    }
  } else {
    lines.push("- 暂无可用新闻动态。");
  }

  lines.push("", "## GitHub 项目", "");
  if (repos.length) {
    for (const item of repos) {
      const metrics = `Stars ${item.stars ?? 0} / Forks ${item.forks ?? 0}${item.language ? ` / ${item.language}` : ""}`;
      lines.push(`- **${escapeMarkdown(item.repo || item.title)}**：${escapeMarkdown(item.summary)}（${metrics}）[${item.sourceId}]`);
    }
  } else {
    lines.push("- 暂无可用 GitHub 项目。");
  }

  lines.push("", "## 后续观察", "");
  lines.push("- 人工复核高分来源，确认是否值得进入正式文章。");
  lines.push("- 对缺少官方来源的社区信号保持谨慎。");
  lines.push("- 发布前补充个人判断、工程影响和产品视角。");

  if (errors.length) {
    lines.push("", "## 抓取异常", "");
    for (const error of errors) {
      lines.push(`- ${escapeMarkdown(error.title)}：${escapeMarkdown(error.summary)}`);
    }
  }

  lines.push("", "## 参考链接", "");
  for (const item of sorted) {
    const typeLabel = {
      official: "官方",
      github: "GitHub",
      paper: "论文",
      media: "媒体",
      community: "社区讨论",
    }[item.sourceType] || item.sourceType || "来源";
    lines.push(`- [${item.sourceId}] [${typeLabel}] ${escapeMarkdown(item.citationLabel || item.source || item.title)}: ${escapeMarkdown(item.title)}`);
    lines.push(`  ${item.url}`);
  }

  return {
    slug,
    content: `${lines.join("\n")}\n`,
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const config = await readTopicConfig(args["topic-config"]);
  const topic = mergeTopic(config, args);
  const range = getDateRange(args);
  const limit = Number(args.limit || 30);
  const outputDir = args.output ? path.resolve(rootDir, args.output) : defaultOutputDir;

  if (!topic.keywords.length && !topic.sources.length) {
    throw new Error("需要提供 --keywords 或 --topic-config sources。");
  }

  const collected = await collectSources(topic, range, limit);
  const scored = collected.map((item) => scoreItem(item, topic, range));
  const deduped = assignSourceIds(dedupeItems(scored).sort((a, b) => b.score - a.score));
  const article = renderArticle(topic, args, range, deduped);
  const fileName = `${range.toText}-${article.slug}.md`;
  await mkdir(outputDir, { recursive: true });
  const outputPath = path.join(outputDir, fileName);
  await writeFile(outputPath, article.content, "utf8");
  console.log(`News draft written: ${path.relative(rootDir, outputPath)}`);
  console.log(`Sources collected: ${deduped.length}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
