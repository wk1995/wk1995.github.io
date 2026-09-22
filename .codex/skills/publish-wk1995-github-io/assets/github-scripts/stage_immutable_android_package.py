#!/usr/bin/env python3

import shutil
import sys
import tempfile
from pathlib import Path

from release_contract import (
    append_output,
    contained_target,
    required_env,
    snapshot,
    validate_segment,
)


artifact_root = Path(required_env("ARTIFACT_ROOT")).resolve(strict=True)
target_site = Path(required_env("TARGET_REPOSITORY_ROOT")).resolve(strict=True)
package_name = validate_segment(
    "package name",
    required_env("PACKAGE_NAME"),
    r"[A-Za-z][A-Za-z0-9_]*(?:\.[A-Za-z][A-Za-z0-9_]*)+",
)
app_version = validate_segment(
    "app version",
    required_env("APP_VERSION"),
    r"[A-Za-z0-9][A-Za-z0-9._()+-]*",
)

platform_root = target_site / "apps/packages/android"
target_path = Path("apps/packages/android") / package_name / app_version
target_dir = target_site / target_path
contained_target(platform_root, target_dir, "Android platform")

apk_files = sorted(artifact_root.rglob("*.apk"))
manifest_files = sorted(artifact_root.rglob("release-manifest.json"))
if not apk_files or len(manifest_files) != 1:
    raise SystemExit("Android artifact must contain APK files and one release-manifest.json")

with tempfile.TemporaryDirectory() as temporary:
    staging = Path(temporary)
    for apk_file in apk_files:
        shutil.copy2(apk_file, staging / apk_file.name)
    shutil.copy2(manifest_files[0], staging / manifest_files[0].name)
    readme = next((path for path in artifact_root.rglob("README*") if path.is_file()), None)
    if readme:
        shutil.copy2(readme, staging / readme.name)

    if target_dir.exists() and any(target_dir.iterdir()):
        if snapshot(staging) != snapshot(target_dir):
            raise SystemExit(
                f"Version {app_version} already exists with different content; refusing to overwrite it"
            )
        print(
            f"Version {app_version} is already published with identical content.",
            file=sys.stderr,
        )
    else:
        target_dir.mkdir(parents=True, exist_ok=True)
        shutil.copytree(staging, target_dir, dirs_exist_ok=True)

append_output("target_path", target_path.as_posix())
