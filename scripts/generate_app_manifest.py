import json
import os
import re
import subprocess
from datetime import datetime
from zoneinfo import ZoneInfo
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
PACKAGES_DIR = ROOT / "apps" / "packages"
MANIFEST_PATH = PACKAGES_DIR / "manifest.json"
VERSION_NUMBER_RE = re.compile(r"^\d{14}$")
DISPLAY_TIMEZONE = ZoneInfo("Asia/Shanghai")

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
    return datetime.fromtimestamp(timestamp, DISPLAY_TIMEZONE).date().isoformat()


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
        return datetime.fromisoformat(value).astimezone(DISPLAY_TIMEZONE).date().isoformat()
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


def env_flag(name: str) -> bool:
    return os.environ.get(name, "").strip().lower() in {"1", "true", "yes", "on"}


def existing_manifest() -> dict:
    if not MANIFEST_PATH.exists():
        return {}
    try:
        return json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return {}


def release_metadata(existing: dict) -> dict:
    version_number = os.environ.get("APP_MANIFEST_VERSION_NUMBER", "").strip()
    version_name = os.environ.get("APP_MANIFEST_VERSION_NAME", "").strip()

    if not version_number and env_flag("APP_MANIFEST_CREATE_VERSION"):
        version_number = datetime.now().strftime("%Y%m%d%H%M%S")

    if version_number:
        if not VERSION_NUMBER_RE.fullmatch(version_number):
            raise ValueError("APP_MANIFEST_VERSION_NUMBER must use yyyyMMddHHmmss format.")
        return {
            "versionName": version_name or f"release-{version_number}",
            "versionNumber": version_number,
        }

    if isinstance(existing.get("release"), dict):
        release = existing["release"]
        version_name = str(release.get("versionName", "")).strip()
        version_number = str(release.get("versionNumber", "")).strip()

    version_name = version_name or str(existing.get("versionName", "")).strip()
    version_number = version_number or str(existing.get("versionNumber", "")).strip()

    if version_number:
        return {
            "versionName": version_name or f"release-{version_number}",
            "versionNumber": version_number,
        }
    return {
        "versionName": "",
        "versionNumber": "",
    }


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
    release = release_metadata(existing_manifest())
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
      "schemaVersion": 2,
      "version": 2,
      "versionName": release["versionName"],
      "versionNumber": release["versionNumber"],
      "release": release,
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
