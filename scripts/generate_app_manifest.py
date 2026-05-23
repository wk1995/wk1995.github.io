import json
import re
import subprocess
from datetime import datetime, timezone
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
PACKAGES_DIR = ROOT / "apps" / "packages"
MANIFEST_PATH = PACKAGES_DIR / "manifest.json"

PLATFORMS = {
    "android": {
        "label": "Android",
        "extensions": {".apk", ".aab"},
        "order": [".apk", ".aab"],
    },
    "ios": {
        "label": "iOS",
        "extensions": {".ipa"},
        "order": [".ipa"],
    },
    "harmony": {
        "label": "HarmonyOS",
        "extensions": {".hap", ".app"},
        "order": [".hap", ".app"],
    },
    "windows": {
        "label": "Windows",
        "extensions": {".exe", ".msi", ".msix", ".appx"},
        "order": [".exe", ".msi", ".msix", ".appx"],
    },
    "macos": {
        "label": "macOS",
        "extensions": {".dmg", ".pkg"},
        "order": [".dmg", ".pkg"],
    },
    "linux": {
        "label": "Linux",
        "extensions": {".deb", ".rpm", ".appimage"},
        "order": [".deb", ".rpm", ".appimage"],
    },
    "web": {
        "label": "Web",
        "extensions": {".zip", ".html"},
        "order": [".zip", ".html"],
    },
    "other": {
        "label": "Other",
        "extensions": set(),
        "order": [],
    },
}


def posix(path: Path) -> str:
    return path.as_posix()


def iso_from_timestamp(timestamp: float) -> str:
    return datetime.fromtimestamp(timestamp, timezone.utc).date().isoformat()


def git_date(path: Path) -> str:
    try:
        result = subprocess.run(
            ["git", "log", "-1", "--format=%cI", "--", str(path.relative_to(ROOT))],
            cwd=ROOT,
            check=False,
            capture_output=True,
            text=True,
        )
    except OSError:
        result = None
    value = result.stdout.strip() if result else ""
    if value:
        return value[:10]
    return iso_from_timestamp(path.stat().st_mtime)


def human_size(size: int) -> str:
    if size < 1024:
        return f"{size} B"
    if size < 1024 * 1024:
        value = size / 1024
        return f"{value:.1f}".rstrip("0").rstrip(".") + " KB"
    value = size / (1024 * 1024)
    return f"{value:.1f}".rstrip("0").rstrip(".") + " MB"


def slug(value: str) -> str:
    result = re.sub(r"[^a-zA-Z0-9._-]+", "-", value.strip()).strip("-").lower()
    return result or "app"


def display_name(value: str) -> str:
    return re.sub(r"[-_]+", " ", value).strip().title() or value


def version_key(value: str):
    parts = re.split(r"([0-9]+)", value.lower())
    return [int(part) if part.isdigit() else part for part in parts]


def read_text_file(path: Path) -> str:
    for encoding in ("utf-8", "utf-8-sig", "gb18030"):
        try:
            return path.read_text(encoding=encoding).strip()
        except UnicodeDecodeError:
            continue
    return path.read_text(errors="ignore").strip()


def find_readme(directory: Path):
    candidates = [item for item in directory.iterdir() if item.is_file() and item.name.lower().startswith("readme")]
    if not candidates:
        return None
    candidates.sort(key=lambda item: (item.name.lower() not in {"readme.md", "readme.txt"}, item.name.lower()))
    return candidates[0]


def summary_from_readme(content: str) -> str:
    lines = [line.strip() for line in content.splitlines()]
    for line in lines:
        if not line or line.startswith("#") or line.startswith("```"):
            continue
        return re.sub(r"[*_`>#-]+", "", line).strip()[:140]
    return ""


def install_files(directory: Path, platform: str):
    extensions = PLATFORMS[platform]["extensions"]
    order = PLATFORMS[platform]["order"]
    files = []
    for item in sorted(directory.iterdir(), key=lambda path: path.name.lower()):
        if not item.is_file() or item.name.startswith("."):
            continue
        suffix = item.suffix.lower()
        if extensions and suffix not in extensions:
            continue
        if not extensions and suffix in {".md", ".txt", ".json", ".html"}:
            continue
        stat = item.stat()
        files.append(
            {
                "file": item.name,
                "type": suffix.lstrip(".") or "file",
                "size": human_size(stat.st_size),
                "updatedAt": git_date(item),
            }
        )
    files.sort(
        key=lambda item: (
            order.index("." + item["type"]) if "." + item["type"] in order else len(order),
            item["file"].lower(),
        )
    )
    return files


def relative_base_path(directory: Path) -> str:
    relative = directory.relative_to(ROOT / "apps")
    return posix(relative) + "/"


def release_from_directory(directory: Path, platform: str, version: str):
    files = install_files(directory, platform)
    if not files:
        return None
    readme_path = find_readme(directory)
    readme = read_text_file(readme_path) if readme_path else ""
    latest_date = max(item["updatedAt"] for item in files if item.get("updatedAt"))
    return {
        "version": version,
        "basePath": relative_base_path(directory),
        "file": files[0]["file"],
        "files": files,
        "readme": readme,
        "readmeFile": posix(readme_path.relative_to(ROOT / "apps")) if readme_path else "",
        "updatedAt": latest_date,
    }


def package_record(platform: str, package_dir: Path):
    package_readme_path = find_readme(package_dir)
    package_readme = read_text_file(package_readme_path) if package_readme_path else ""
    direct_release = release_from_directory(package_dir, platform, "latest")
    version_releases = []
    for child in sorted(package_dir.iterdir(), key=lambda path: path.name.lower()):
        if not child.is_dir() or child.name.startswith("."):
            continue
        release = release_from_directory(child, platform, child.name)
        if release:
            version_releases.append(release)

    if version_releases:
        releases = sorted(version_releases, key=lambda item: version_key(item["version"]))
        has_history = True
    elif direct_release:
        releases = [direct_release]
        has_history = False
    else:
        return None

    latest = releases[-1]
    app_id = f"{platform}/{slug(package_dir.name)}"
    description = summary_from_readme(package_readme) or summary_from_readme(latest.get("readme", ""))
    return {
        "id": app_id,
        "slug": slug(package_dir.name),
        "name": display_name(package_dir.name),
        "platform": platform,
        "platformId": platform,
        "description": description,
        "readme": package_readme,
        "readmeFile": posix(package_readme_path.relative_to(ROOT / "apps")) if package_readme_path else "",
        "latest": latest,
        "versions": releases,
        "hasHistory": has_history,
        "updatedAt": latest.get("updatedAt", ""),
    }


def build_manifest():
    apps = []
    for platform in PLATFORMS:
        platform_dir = PACKAGES_DIR / platform
        platform_dir.mkdir(parents=True, exist_ok=True)
        for package_dir in sorted(platform_dir.iterdir(), key=lambda path: path.name.lower()):
            if not package_dir.is_dir() or package_dir.name.startswith("."):
                continue
            record = package_record(platform, package_dir)
            if record:
                apps.append(record)

    platform_groups = {platform: [] for platform in PLATFORMS}
    for app in apps:
        platform_groups[app["platformId"]].append(app["id"])

    updated_at = max((app["updatedAt"] for app in apps if app.get("updatedAt")), default="")
    return {
      "version": 2,
      "updatedAt": updated_at,
      "basePath": "packages/",
      "basePaths": {
          platform: f"packages/{platform}/" for platform in PLATFORMS
      },
      "apps": apps,
      "platforms": platform_groups,
    }


def main():
    manifest = build_manifest()
    MANIFEST_PATH.write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print(f"Wrote {MANIFEST_PATH} with {len(manifest['apps'])} apps.")


if __name__ == "__main__":
    main()
