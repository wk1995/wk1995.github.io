#!/usr/bin/env python3

import json
import shutil
import tempfile
from pathlib import Path

from release_contract import (
    ALL_DESKTOP_EXTENSIONS,
    DESKTOP_EXTENSIONS,
    contained_target,
    load_json,
    required_env,
    snapshot,
    validate_segment,
)


artifact_root = Path(required_env("ARTIFACT_ROOT")).resolve(strict=True)
target_site = Path(required_env("TARGET_REPOSITORY_ROOT")).resolve(strict=True)
published_paths_file = Path(required_env("PUBLISHED_PATHS_FILE"))
manifest_file = next(iter(sorted(artifact_root.rglob("release-manifest.json"))), None)
if manifest_file is None:
    raise SystemExit("Desktop artifact contains no release-manifest.json")
manifest = load_json(manifest_file)
app_name = validate_segment(
    "app name", manifest.get("app_name"), r"[A-Za-z0-9][A-Za-z0-9._-]*"
)

payload_by_name = {}
for path in sorted(artifact_root.rglob("*")):
    if path.is_file() and path.suffix.lower() in ALL_DESKTOP_EXTENSIONS:
        if path.name in payload_by_name:
            raise SystemExit(f"Duplicate desktop payload basename: {path.name}")
        payload_by_name[path.name] = path

groups = {}
for entry in manifest.get("archive_files", []):
    platform = entry.get("platform")
    if platform not in DESKTOP_EXTENSIONS:
        raise SystemExit(f"Unsupported desktop platform: {platform}")
    version = validate_segment(
        "desktop version", entry.get("version"), r"[A-Za-z0-9][A-Za-z0-9._+-]*"
    )
    systemos = validate_segment(
        "desktop architecture",
        entry.get("systemos"),
        r"[A-Za-z0-9][A-Za-z0-9._-]*",
    )
    name = entry.get("name")
    if name not in payload_by_name:
        raise SystemExit(f"Desktop payload declared but not found: {name}")
    groups.setdefault((platform, version, systemos), []).append(entry)
if not groups:
    raise SystemExit("Desktop manifest contains no package groups")

readme = next((path for path in artifact_root.rglob("README*") if path.is_file()), None)
published_paths = []
for (platform, version, systemos), entries in sorted(groups.items()):
    platform_root = target_site / "apps/packages" / platform
    target_path = Path("apps/packages") / platform / app_name / version / systemos
    target_dir = target_site / target_path
    contained_target(platform_root, target_dir, f"{platform} platform")

    with tempfile.TemporaryDirectory() as temporary:
        staging = Path(temporary)
        for entry in entries:
            payload = payload_by_name[entry["name"]]
            shutil.copy2(payload, staging / payload.name)
        if readme:
            shutil.copy2(readme, staging / readme.name)
        local_manifest = {
            "app": app_name,
            "platform": platform,
            "version": version,
            "systemos": systemos,
            "sourceRunId": str(manifest["build_run_id"]),
            "files": sorted(entry["name"] for entry in entries),
        }
        (staging / "manifest.json").write_text(
            json.dumps(local_manifest, indent=2) + "\n", encoding="utf-8"
        )

        if target_dir.exists() and any(target_dir.iterdir()):
            if snapshot(staging) != snapshot(target_dir):
                raise SystemExit(
                    f"{target_path} already exists with different content; refusing to overwrite it"
                )
            print(f"{target_path} is already published with identical content.")
        else:
            target_dir.mkdir(parents=True, exist_ok=True)
            shutil.copytree(staging, target_dir, dirs_exist_ok=True)
    published_paths.append(target_path.as_posix())

published_paths_file.write_text("\n".join(published_paths) + "\n", encoding="utf-8")
