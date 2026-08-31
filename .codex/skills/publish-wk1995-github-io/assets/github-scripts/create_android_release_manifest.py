#!/usr/bin/env python3

import json
import re
from pathlib import Path

from release_contract import required_env, sha256_file, validate_segment


artifact_dir = Path(required_env("SIGNED_ARTIFACT_DIR")).resolve(strict=True)
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
source_sha = required_env("SOURCE_SHA")
source_ref = required_env("SOURCE_REF")
source_event = required_env("SOURCE_EVENT")
build_run_id = required_env("BUILD_RUN_ID")
if not re.fullmatch(r"[0-9a-f]{40}", source_sha):
    raise SystemExit("Invalid source SHA")
if source_event not in {"pull_request", "push", "workflow_dispatch"}:
    raise SystemExit("Unsupported source event")
if not re.fullmatch(r"[1-9][0-9]*", build_run_id):
    raise SystemExit("Invalid build run ID")

apk_files = sorted(artifact_dir.glob("*.apk"))
if not apk_files:
    raise SystemExit("Signed artifact directory contains no APK")
manifest = {
    "schema_version": 1,
    "package_name": package_name,
    "app_version": app_version,
    "source_sha": source_sha,
    "source_ref": source_ref,
    "source_event": source_event,
    "build_run_id": int(build_run_id),
    "apk_files": [
        {"name": path.name, "sha256": sha256_file(path)} for path in apk_files
    ],
}
(artifact_dir / "release-manifest.json").write_text(
    json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
)
