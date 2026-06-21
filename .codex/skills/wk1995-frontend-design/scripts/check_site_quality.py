#!/usr/bin/env python3
"""Static quality checks for wk1995.github.io frontend edits."""

from __future__ import annotations

import argparse
import html.parser
import re
import sys
from dataclasses import dataclass
from pathlib import Path


SKIP_DIRS = {".git", ".idea", ".codex", "node_modules", ".venv", "__pycache__"}
HTML_SUFFIXES = {".html", ".htm"}
CSS_SUFFIXES = {".css"}
I18N_SOURCES = {
    "data-i18n": ("assets/site.js", "site translations"),
    "data-i18n-html": ("assets/site.js", "site translations"),
    "data-i18n-placeholder": ("assets/site.js", "site translations"),
    "data-i18n-aria": ("assets/site.js", "site translations"),
    "data-app-text": ("assets/personal-apps.js", "app catalog text"),
    "data-model-text": ("assets/model-list.js", "model catalog text"),
    "data-chat-text": ("assets/chat-page.js", "chat page text"),
    "data-chat-aria": ("assets/chat-page.js", "chat page aria text"),
}


@dataclass
class Finding:
    severity: str
    path: Path
    line: int
    message: str

    def format(self, root: Path) -> str:
        rel = self.path.relative_to(root)
        return f"{self.severity}: {rel}:{self.line}: {self.message}"


class SiteHTMLParser(html.parser.HTMLParser):
    def __init__(self, path: Path) -> None:
        super().__init__(convert_charrefs=True)
        self.path = path
        self.findings: list[Finding] = []
        self.ids: dict[str, int] = {}
        self.i18n_refs: list[tuple[str, str, int]] = []
        self.button_stack: list[dict[str, object]] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        line, _ = self.getpos()
        attr = {name.lower(): value or "" for name, value in attrs}

        element_id = attr.get("id", "").strip()
        if element_id:
            if element_id in self.ids:
                self.findings.append(
                    Finding("ERROR", self.path, line, f'duplicate id "{element_id}" also appears on line {self.ids[element_id]}')
                )
            else:
                self.ids[element_id] = line

        if tag == "img":
            if "alt" not in attr:
                self.findings.append(Finding("WARN", self.path, line, "image is missing alt text"))
            has_dimensions = ("width" in attr and "height" in attr) or "style" in attr or "class" in attr
            if not has_dimensions:
                self.findings.append(Finding("WARN", self.path, line, "image has no explicit dimensions or stable styling hook"))

        if tag in {"div", "span"} and any(name.startswith("on") for name in attr):
            self.findings.append(Finding("ERROR", self.path, line, f"<{tag}> uses inline interaction; prefer button or link"))

        if tag == "meta" and attr.get("name", "").lower() == "viewport":
            content = attr.get("content", "")
            if "user-scalable=no" in content or "maximum-scale=1" in content:
                self.findings.append(Finding("ERROR", self.path, line, "viewport disables user zoom"))

        for attr_name in I18N_SOURCES:
            key = attr.get(attr_name, "").strip()
            if key:
                self.i18n_refs.append((attr_name, key, line))

        if tag == "button":
            accessible = bool(attr.get("aria-label") or attr.get("data-chat-aria"))
            self.button_stack.append(
                {
                    "line": line,
                    "accessible": accessible,
                    "text": "",
                }
            )

    def handle_data(self, data: str) -> None:
        if self.button_stack:
            top = self.button_stack[-1]
            top["text"] = str(top["text"]) + data.strip()

    def handle_endtag(self, tag: str) -> None:
        if tag != "button" or not self.button_stack:
            return
        button = self.button_stack.pop()
        if not button["accessible"] and not str(button["text"]).strip():
            self.findings.append(Finding("WARN", self.path, int(button["line"]), "button has no visible text or accessible name"))


def iter_files(root: Path, suffixes: set[str]) -> list[Path]:
    files: list[Path] = []
    for path in root.rglob("*"):
        if any(part in SKIP_DIRS for part in path.parts):
            continue
        if path.is_file() and path.suffix.lower() in suffixes:
            files.append(path)
    return sorted(files)


def key_count(source: str, key: str) -> int:
    quoted = re.escape(key)
    if re.match(r"^[A-Za-z_$][\w$]*$", key):
        pattern = rf'(?:(["\']){quoted}\1|(?<![\w$]){quoted})\s*:'
    else:
        pattern = rf'(["\']){quoted}\1\s*:'
    return len(re.findall(pattern, source))


def check_html(root: Path) -> tuple[list[Finding], list[tuple[str, str, Path, int]]]:
    findings: list[Finding] = []
    refs: list[tuple[str, str, Path, int]] = []
    for path in iter_files(root, HTML_SUFFIXES):
        parser = SiteHTMLParser(path)
        try:
            parser.feed(path.read_text(encoding="utf-8"))
        except UnicodeDecodeError:
            findings.append(Finding("ERROR", path, 1, "file is not valid UTF-8"))
            continue
        findings.extend(parser.findings)
        refs.extend((attr, key, path, line) for attr, key, line in parser.i18n_refs)
    return findings, refs


def check_i18n(root: Path, refs: list[tuple[str, str, Path, int]]) -> list[Finding]:
    findings: list[Finding] = []
    source_cache: dict[str, str] = {}

    for attr, key, path, line in refs:
        source_path, label = I18N_SOURCES[attr]
        if source_path not in source_cache:
            full_path = root / source_path
            if not full_path.exists():
                source_cache[source_path] = ""
                findings.append(Finding("ERROR", path, line, f"{attr} expects {source_path}, but it does not exist"))
                continue
            source_cache[source_path] = full_path.read_text(encoding="utf-8")

        count = key_count(source_cache[source_path], key)
        if count == 0:
            findings.append(Finding("ERROR", path, line, f'{attr} key "{key}" is missing from {label}'))
        elif count == 1:
            findings.append(Finding("WARN", path, line, f'{attr} key "{key}" appears once in {label}; verify zh/en parity'))

    return findings


def check_css(root: Path) -> list[Finding]:
    findings: list[Finding] = []
    for path in iter_files(root, CSS_SUFFIXES):
        for line_number, line in enumerate(path.read_text(encoding="utf-8").splitlines(), start=1):
            compact = line.lower()
            if re.search(r"\btransition\s*:\s*all\b", compact):
                findings.append(Finding("WARN", path, line_number, "avoid transition: all; list changed properties explicitly"))
            if re.search(r"\boutline\s*:\s*none\b", compact):
                findings.append(Finding("WARN", path, line_number, "outline: none needs an equivalent :focus-visible style"))
    return findings


def main() -> int:
    parser = argparse.ArgumentParser(description="Run static frontend quality checks for wk1995.github.io.")
    parser.add_argument("--root", default=".", help="Repository root to inspect.")
    parser.add_argument("--strict", action="store_true", help="Exit non-zero on warnings as well as errors.")
    args = parser.parse_args()

    root = Path(args.root).resolve()
    html_findings, refs = check_html(root)
    findings = html_findings + check_i18n(root, refs) + check_css(root)
    findings.sort(key=lambda item: (item.severity != "ERROR", str(item.path), item.line, item.message))

    if findings:
        for finding in findings:
            print(finding.format(root))
    else:
        print("OK: no static frontend quality issues found")

    error_count = sum(1 for finding in findings if finding.severity == "ERROR")
    warn_count = sum(1 for finding in findings if finding.severity == "WARN")
    print(f"Summary: {error_count} error(s), {warn_count} warning(s)")

    if error_count or (args.strict and warn_count):
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
