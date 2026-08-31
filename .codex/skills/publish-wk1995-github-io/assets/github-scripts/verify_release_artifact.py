#!/usr/bin/env python3

import re
from pathlib import Path

from release_contract import (
    ALL_DESKTOP_EXTENSIONS,
    DESKTOP_EXTENSIONS,
    append_output,
    load_json,
    required_env,
    sha256_file,
    validate_segment,
)


artifact_root = Path(required_env("RELEASE_ARTIFACT_ROOT")).resolve(strict=True)
manifest_path = Path(required_env("RELEASE_MANIFEST_FILE")).resolve(strict=True)
release_kind = required_env("RELEASE_KIND")
manifest = load_json(manifest_path)

expected_run_id = required_env("EXPECTED_RUN_ID")
expected_source_sha = required_env("EXPECTED_SOURCE_SHA")
expected_source_ref = required_env("EXPECTED_SOURCE_REF")
expected_source_event = required_env("EXPECTED_SOURCE_EVENT")

if manifest.get("schema_version") != 1:
    raise SystemExit("Unsupported release manifest schema")
source_sha = manifest.get("source_sha")
source_ref = manifest.get("source_ref")
source_event = manifest.get("source_event")
build_run_id = str(manifest.get("build_run_id", ""))
if (
    not isinstance(source_sha, str)
    or not re.fullmatch(r"[0-9a-f]{40}", source_sha)
    or source_sha != expected_source_sha
    or source_ref != expected_source_ref
    or source_event != expected_source_event
    or source_event not in {"pull_request", "push", "workflow_dispatch"}
    or build_run_id != expected_run_id
    or not re.fullmatch(r"[1-9][0-9]*", build_run_id)
):
    raise SystemExit("Release manifest provenance validation failed")


def verify_files(declarations: object, allowed_extensions: set[str]) -> dict[str, Path]:
    if not isinstance(declarations, list) or not declarations:
        raise SystemExit("Release manifest contains no file declarations")
    expected: dict[str, str] = {}
    for item in declarations:
        if not isinstance(item, dict):
            raise SystemExit("Invalid release file declaration")
        name = item.get("name")
        digest = item.get("sha256")
        if not isinstance(name, str) or Path(name).name != name:
            raise SystemExit("Unsafe filename in release manifest")
        if Path(name).suffix.lower() not in allowed_extensions:
            raise SystemExit(f"Unsupported release file extension: {name}")
        if not isinstance(digest, str) or not re.fullmatch(r"[0-9a-f]{64}", digest):
            raise SystemExit("Invalid lowercase SHA-256 in release manifest")
        if name in expected:
            raise SystemExit("Duplicate filename in release manifest")
        expected[name] = digest

    actual: dict[str, Path] = {}
    unexpected = []
    for path in sorted(artifact_root.rglob("*")):
        if not path.is_file() or path.resolve() == manifest_path:
            continue
        if path.name.lower().startswith("readme"):
            continue
        if path.suffix.lower() not in allowed_extensions:
            unexpected.append(path.relative_to(artifact_root).as_posix())
            continue
        if path.name in actual:
            raise SystemExit(f"Duplicate release file basename: {path.name}")
        actual[path.name] = path
    if unexpected:
        raise SystemExit(f"Unexpected files in release artifact: {', '.join(unexpected)}")
    if set(actual) != set(expected):
        raise SystemExit("Release file set does not match release manifest")
    for name, path in actual.items():
        if sha256_file(path) != expected[name]:
            raise SystemExit(f"Release file digest mismatch: {name}")
    return actual


if release_kind == "android":
    package_name = validate_segment(
        "package name",
        manifest.get("package_name"),
        r"[A-Za-z][A-Za-z0-9_]*(?:\.[A-Za-z][A-Za-z0-9_]*)+",
    )
    app_version = validate_segment(
        "app version",
        manifest.get("app_version"),
        r"[A-Za-z0-9][A-Za-z0-9._()+-]*",
    )
    verify_files(manifest.get("apk_files"), {".apk"})
    append_output("package_name", package_name)
    append_output("app_version", app_version)
elif release_kind == "desktop":
    app_name = validate_segment(
        "app name", manifest.get("app_name"), r"[A-Za-z0-9][A-Za-z0-9._-]*"
    )
    entries = manifest.get("archive_files")
    verify_files(entries, ALL_DESKTOP_EXTENSIONS)
    for item in entries:
        platform = item.get("platform")
        if platform not in DESKTOP_EXTENSIONS:
            raise SystemExit(f"Unsupported desktop platform: {platform}")
        if Path(item["name"]).suffix.lower() not in DESKTOP_EXTENSIONS[platform]:
            raise SystemExit(
                f"{item['name']} is not supported for desktop platform {platform}"
            )
        validate_segment(
            "desktop version", item.get("version"), r"[A-Za-z0-9][A-Za-z0-9._+-]*"
        )
        validate_segment(
            "desktop architecture",
            item.get("systemos"),
            r"[A-Za-z0-9][A-Za-z0-9._-]*",
        )
    append_output("app_name", app_name)
else:
    raise SystemExit(f"Unsupported release kind: {release_kind}")
