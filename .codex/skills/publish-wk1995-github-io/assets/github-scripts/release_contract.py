#!/usr/bin/env python3

import hashlib
import json
import os
import re
from pathlib import Path


DESKTOP_EXTENSIONS = {
    "windows": {".exe", ".msi", ".msix", ".appx", ".zip"},
    "macos": {".dmg", ".pkg", ".zip"},
    "linux": {".deb", ".rpm", ".appimage", ".zip"},
}
ALL_DESKTOP_EXTENSIONS = set().union(*DESKTOP_EXTENSIONS.values())


def required_env(name: str) -> str:
    value = os.environ.get(name, "")
    if not value:
        raise SystemExit(f"Missing required environment variable: {name}")
    return value


def validate_segment(label: str, value: object, pattern: str) -> str:
    if (
        not isinstance(value, str)
        or value in {"", ".", ".."}
        or ".." in value
        or "/" in value
        or "\\" in value
        or not re.fullmatch(pattern, value)
    ):
        raise SystemExit(f"Unsafe {label} path segment: {value}")
    return value


def load_json(path: Path) -> dict:
    try:
        value = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as error:
        raise SystemExit(f"Unable to read release manifest: {error}") from error
    if not isinstance(value, dict):
        raise SystemExit("Release manifest root must be an object")
    return value


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def snapshot(root: Path) -> dict[str, str]:
    return {
        path.relative_to(root).as_posix(): sha256_file(path)
        for path in sorted(root.rglob("*"))
        if path.is_file()
    }


def contained_target(platform_root: Path, target_dir: Path, label: str) -> Path:
    resolved_root = platform_root.resolve(strict=True)
    resolved_target = target_dir.resolve(strict=False)
    if resolved_root not in resolved_target.parents:
        raise SystemExit(f"Resolved target escapes {label} root: {target_dir}")
    return resolved_target


def append_output(name: str, value: str) -> None:
    output = os.environ.get("GITHUB_OUTPUT", "")
    if output:
        with Path(output).open("a", encoding="utf-8") as stream:
            stream.write(f"{name}={value}\n")
