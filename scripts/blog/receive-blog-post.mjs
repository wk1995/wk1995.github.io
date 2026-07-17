import { access, appendFile, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const rootDir = process.cwd();
const contentRoot = path.join(rootDir, "content", "blog");

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

function parseFrontmatter(markdown) {
  const match = markdown.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) {
    throw new Error("Incoming blog post must include YAML frontmatter.");
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

    data[key] = "";
    index += 1;
  }

  return data;
}

function requiredEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable ${name}.`);
  }
  return value;
}

function parseBoolean(value) {
  return String(value || "").toLowerCase() === "true";
}

function validateFileName(fileName) {
  if (!fileName.endsWith(".md")) {
    throw new Error("BLOG_POST_FILE_NAME must end with .md.");
  }
  if (fileName.includes("/") || fileName.includes("\\") || fileName.includes("..")) {
    throw new Error("BLOG_POST_FILE_NAME must be a plain file name, not a path.");
  }
}

async function fileExists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  const contentBase64 = requiredEnv("BLOG_POST_CONTENT_BASE64");
  const target = process.env.BLOG_POST_TARGET || "posts";
  const overwrite = parseBoolean(process.env.BLOG_POST_OVERWRITE);

  if (!["posts", "drafts"].includes(target)) {
    throw new Error('BLOG_POST_TARGET must be "posts" or "drafts".');
  }

  const markdown = Buffer.from(contentBase64, "base64").toString("utf8").trimEnd() + "\n";
  const data = parseFrontmatter(markdown);
  const required = ["title", "slug", "date", "status", "summary", "tags"];

  for (const key of required) {
    if (!data[key] || (Array.isArray(data[key]) && data[key].length === 0)) {
      throw new Error(`Incoming blog post is missing required frontmatter field: ${key}.`);
    }
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(data.date)) {
    throw new Error("Incoming blog post date must use YYYY-MM-DD.");
  }
  if (!/^[a-z0-9-]+$/.test(data.slug)) {
    throw new Error("Incoming blog post slug must use lowercase letters, numbers, and hyphens only.");
  }
  if (target === "posts" && data.status !== "published") {
    throw new Error('Posts published into content/blog/posts must use status: "published".');
  }

  const year = data.date.slice(0, 4);
  const fileName = process.env.BLOG_POST_FILE_NAME || `${data.date}-${data.slug}.md`;
  validateFileName(fileName);

  const outputDir = target === "posts"
    ? path.join(contentRoot, "posts", year)
    : path.join(contentRoot, "drafts");
  const outputPath = path.join(outputDir, fileName);

  if (!overwrite && await fileExists(outputPath)) {
    throw new Error(`Refusing to overwrite existing blog post: ${path.relative(rootDir, outputPath)}`);
  }

  await mkdir(outputDir, { recursive: true });
  await writeFile(outputPath, markdown, "utf8");

  const relativePath = path.relative(rootDir, outputPath).replaceAll(path.sep, "/");
  console.log(`Blog post written: ${relativePath}`);

  if (process.env.GITHUB_OUTPUT) {
    await appendFile(process.env.GITHUB_OUTPUT, `post_path=${relativePath}\n`, "utf8");
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
