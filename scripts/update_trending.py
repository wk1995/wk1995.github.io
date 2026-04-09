import argparse
import json
import re
import sys
from datetime import datetime, timezone
from html import unescape
from pathlib import Path
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


ARTICLE_RE = re.compile(r'<article class="Box-row">(.*?)</article>', re.S)
REPO_RE = re.compile(r'<h2[^>]*>.*?href="/([^"/]+/[^"/]+)"', re.S)
DESCRIPTION_RE = re.compile(
    r'<p[^>]*class="[^"]*col-9[^"]*color-fg-muted[^"]*"[^>]*>(.*?)</p>',
    re.S,
)
LANGUAGE_RE = re.compile(
    r'<span[^>]*itemprop="programmingLanguage"[^>]*>(.*?)</span>',
    re.S,
)
STARS_RE = re.compile(
    r'href="/[^"]+/stargazers"[^>]*>.*?</svg>\s*([\d,]+)\s*</a>',
    re.S,
)
FORKS_RE = re.compile(
    r'href="/[^"]+/forks"[^>]*>.*?</svg>\s*([\d,]+)\s*</a>',
    re.S,
)
TODAY_RE = re.compile(r'([\d,]+)\s+stars today')


def clean_text(value: str | None) -> str | None:
    if not value:
        return None
    text = re.sub(r"<[^>]+>", " ", unescape(value))
    text = re.sub(r"\s+", " ", text).strip()
    return text or None


def parse_number(value: str | None) -> int | None:
    if not value:
        return None
    return int(value.replace(",", "").strip())


def parse_article(block: str, rank: int) -> dict[str, Any] | None:
    repo_match = REPO_RE.search(block)
    if not repo_match:
        return None

    repo = repo_match.group(1).strip()
    owner, name = repo.split("/", 1)
    description_match = DESCRIPTION_RE.search(block)
    language_match = LANGUAGE_RE.search(block)
    stars_match = STARS_RE.search(block)
    forks_match = FORKS_RE.search(block)
    today_match = TODAY_RE.search(block)

    description = clean_text(
        description_match.group(1) if description_match else None
    )
    language = clean_text(
        language_match.group(1) if language_match else None
    )
    stars_total = parse_number(stars_match.group(1) if stars_match else None)
    forks_total = parse_number(forks_match.group(1) if forks_match else None)
    stars_today = parse_number(today_match.group(1) if today_match else None)

    return {
        "rank": rank,
        "repo": repo,
        "owner": owner,
        "name": name,
        "url": f"https://github.com/{repo}",
        "description": description,
        "language": language,
        "stars_total": stars_total,
        "forks_total": forks_total,
        "stars_today": stars_today,
    }


def fetch_html(url: str) -> str:
    request = Request(
        url,
        headers={
            "User-Agent": (
                "Mozilla/5.0 (compatible; wk1995.github.io trending bot/1.0)"
            )
        },
    )
    with urlopen(request, timeout=30) as response:
        return response.read().decode("utf-8")


def build_payload(html: str, source_url: str, since: str, limit: int) -> dict[str, Any]:
    articles = ARTICLE_RE.findall(html)
    items: list[dict[str, Any]] = []

    for block in articles:
        parsed = parse_article(block, len(items) + 1)
        if parsed:
            items.append(parsed)
        if len(items) >= limit:
            break

    if not items:
        raise ValueError("No trending repositories were parsed from the GitHub page.")

    return {
        "source": source_url,
        "since": since,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "items": items,
    }


def write_outputs(payload: dict[str, Any], output_dir: Path) -> None:
    output_dir.mkdir(parents=True, exist_ok=True)

    json_text = json.dumps(payload, ensure_ascii=False, indent=2) + "\n"
    js_text = "window.__TRENDING_DATA__ = " + json_text + ";\n"

    (output_dir / "trending.json").write_text(json_text, encoding="utf-8")
    (output_dir / "trending.js").write_text(js_text, encoding="utf-8")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Fetch GitHub Trending and generate local data files."
    )
    parser.add_argument("--since", default="daily", choices=["daily", "weekly", "monthly"])
    parser.add_argument("--limit", type=int, default=6)
    parser.add_argument("--output-dir", default="data")
    parser.add_argument("--html-file", help="Use a local GitHub Trending HTML file for testing.")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    source_url = f"https://github.com/trending?since={args.since}"

    try:
        if args.html_file:
            html = Path(args.html_file).read_text(encoding="utf-8")
        else:
            html = fetch_html(source_url)
        payload = build_payload(html, source_url, args.since, args.limit)
        write_outputs(payload, Path(args.output_dir))
    except (OSError, HTTPError, URLError, ValueError) as exc:
        print(f"Failed to update trending data: {exc}", file=sys.stderr)
        return 1

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
