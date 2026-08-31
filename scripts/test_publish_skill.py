import hashlib
import importlib.util
import json
import os
from pathlib import Path
import re
import subprocess
import sys
import tempfile
import unittest


ROOT = Path(__file__).resolve().parents[1]
SKILL = ROOT / ".codex/skills/publish-wk1995-github-io"
ASSETS = SKILL / "assets"
HELPERS = ASSETS / "github-scripts"
VERIFY = HELPERS / "verify_release_artifact.py"
STAGE_ANDROID = HELPERS / "stage_immutable_android_package.py"
STAGE_DESKTOP = HELPERS / "stage_immutable_desktop_packages.py"
PUBLISH_WORKFLOWS = (
    ASSETS / "publish-apk-artifact.yml",
    ASSETS / "publish-desktop-artifact.yml",
)
ALL_WORKFLOWS = (ASSETS / "build-release-android.yml", *PUBLISH_WORKFLOWS)
SOURCE_SHA = "a" * 40


def digest(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def run_script(script: Path, env: dict[str, str], check: bool = True):
    result = subprocess.run(
        [sys.executable, str(script)],
        cwd=ROOT,
        env={**os.environ, **env},
        text=True,
        capture_output=True,
        check=False,
    )
    if check and result.returncode != 0:
        raise AssertionError(
            f"{script.name} failed\nstdout:\n{result.stdout}\nstderr:\n{result.stderr}"
        )
    return result


def common_manifest() -> dict:
    return {
        "schema_version": 1,
        "source_sha": SOURCE_SHA,
        "source_ref": "refs/heads/master",
        "source_event": "push",
        "build_run_id": 123,
    }


def verify_env(artifact: Path, manifest: Path, kind: str) -> dict[str, str]:
    return {
        "RELEASE_ARTIFACT_ROOT": str(artifact),
        "RELEASE_MANIFEST_FILE": str(manifest),
        "RELEASE_KIND": kind,
        "EXPECTED_RUN_ID": "123",
        "EXPECTED_SOURCE_SHA": SOURCE_SHA,
        "EXPECTED_SOURCE_REF": "refs/heads/master",
        "EXPECTED_SOURCE_EVENT": "push",
    }


class PublishSkillBehaviorTest(unittest.TestCase):
    def test_android_verification_and_immutable_staging(self):
        with tempfile.TemporaryDirectory() as temporary:
            workspace = Path(temporary)
            artifact = workspace / "artifact"
            target = workspace / "target"
            artifact.mkdir()
            (target / "apps/packages/android").mkdir(parents=True)
            apk = artifact / "example.apk"
            apk.write_bytes(b"signed-apk")
            manifest_data = {
                **common_manifest(),
                "package_name": "com.example.app",
                "app_version": "7(1.2.3)",
                "apk_files": [{"name": apk.name, "sha256": digest(apk)}],
            }
            manifest = artifact / "release-manifest.json"
            manifest.write_text(json.dumps(manifest_data), encoding="utf-8")
            run_script(VERIFY, verify_env(artifact, manifest, "android"))

            stage_env = {
                "ARTIFACT_ROOT": str(artifact),
                "TARGET_REPOSITORY_ROOT": str(target),
                "PACKAGE_NAME": "com.example.app",
                "APP_VERSION": "7(1.2.3)",
            }
            run_script(STAGE_ANDROID, stage_env)
            run_script(STAGE_ANDROID, stage_env)
            published = target / "apps/packages/android/com.example.app/7(1.2.3)/example.apk"
            self.assertEqual(published.read_bytes(), b"signed-apk")

            published.write_bytes(b"tampered")
            rejected = run_script(STAGE_ANDROID, stage_env, check=False)
            self.assertNotEqual(rejected.returncode, 0)
            self.assertIn("refusing to overwrite", rejected.stderr)

    def test_digest_mismatch_and_path_traversal_are_rejected(self):
        with tempfile.TemporaryDirectory() as temporary:
            artifact = Path(temporary)
            apk = artifact / "example.apk"
            apk.write_bytes(b"apk")
            manifest_data = {
                **common_manifest(),
                "package_name": "../escape",
                "app_version": "1(1.0)",
                "apk_files": [{"name": apk.name, "sha256": "0" * 64}],
            }
            manifest = artifact / "release-manifest.json"
            manifest.write_text(json.dumps(manifest_data), encoding="utf-8")
            rejected = run_script(
                VERIFY, verify_env(artifact, manifest, "android"), check=False
            )
            self.assertNotEqual(rejected.returncode, 0)

            manifest_data["package_name"] = "com.example.app"
            manifest.write_text(json.dumps(manifest_data), encoding="utf-8")
            rejected = run_script(
                VERIFY, verify_env(artifact, manifest, "android"), check=False
            )
            self.assertNotEqual(rejected.returncode, 0)
            self.assertIn("digest mismatch", rejected.stderr)

    def test_desktop_native_formats_and_immutable_staging(self):
        with tempfile.TemporaryDirectory() as temporary:
            workspace = Path(temporary)
            artifact = workspace / "artifact"
            target = workspace / "target"
            artifact.mkdir()
            for platform in ("windows", "macos", "linux"):
                (target / "apps/packages" / platform).mkdir(parents=True)

            packages = (
                ("tool.exe", "windows", "exe-x86_64", b"exe"),
                ("tool.msi", "windows", "msi-x86_64", b"msi"),
                ("tool.msix", "windows", "msix-x86_64", b"msix"),
                ("tool.appx", "windows", "appx-x86_64", b"appx"),
                ("tool-windows.zip", "windows", "zip-x86_64", b"windows-zip"),
                ("tool.dmg", "macos", "dmg-arm64", b"dmg"),
                ("tool.pkg", "macos", "pkg-arm64", b"pkg"),
                ("tool-macos.zip", "macos", "zip-arm64", b"macos-zip"),
                ("tool.deb", "linux", "deb-x86_64", b"deb"),
                ("tool.rpm", "linux", "rpm-x86_64", b"rpm"),
                ("tool.AppImage", "linux", "appimage-x86_64", b"appimage"),
                ("tool-linux.zip", "linux", "zip-x86_64", b"linux-zip"),
            )
            entries = []
            for name, platform, systemos, content in packages:
                path = artifact / name
                path.write_bytes(content)
                entries.append(
                    {
                        "name": name,
                        "sha256": digest(path),
                        "platform": platform,
                        "version": "1.2.3",
                        "systemos": systemos,
                    }
                )
            manifest_data = {
                **common_manifest(),
                "app_name": "ExampleDesktop",
                "archive_files": entries,
            }
            manifest = artifact / "release-manifest.json"
            manifest.write_text(json.dumps(manifest_data), encoding="utf-8")
            run_script(VERIFY, verify_env(artifact, manifest, "desktop"))

            paths_file = workspace / "published-paths.txt"
            stage_env = {
                "ARTIFACT_ROOT": str(artifact),
                "TARGET_REPOSITORY_ROOT": str(target),
                "PUBLISHED_PATHS_FILE": str(paths_file),
            }
            run_script(STAGE_DESKTOP, stage_env)
            run_script(STAGE_DESKTOP, stage_env)
            self.assertTrue(
                (target / "apps/packages/linux/ExampleDesktop/1.2.3/deb-x86_64/tool.deb").is_file()
            )
            self.assertTrue(
                (target / "apps/packages/macos/ExampleDesktop/1.2.3/dmg-arm64/tool.dmg").is_file()
            )

            published = target / "apps/packages/windows/ExampleDesktop/1.2.3/exe-x86_64/tool.exe"
            published.write_bytes(b"tampered")
            rejected = run_script(STAGE_DESKTOP, stage_env, check=False)
            self.assertNotEqual(rejected.returncode, 0)
            self.assertIn("refusing to overwrite", rejected.stderr)

    def test_desktop_extension_contract_matches_site_generator(self):
        contract_spec = importlib.util.spec_from_file_location(
            "release_contract", HELPERS / "release_contract.py"
        )
        contract = importlib.util.module_from_spec(contract_spec)
        contract_spec.loader.exec_module(contract)
        generator_spec = importlib.util.spec_from_file_location(
            "generate_app_manifest", ROOT / "scripts/generate_app_manifest.py"
        )
        generator = importlib.util.module_from_spec(generator_spec)
        generator_spec.loader.exec_module(generator)
        for platform, extensions in contract.DESKTOP_EXTENSIONS.items():
            self.assertEqual(extensions, generator.PLATFORMS[platform]["extensions"])

    def test_templates_use_shared_scripts_and_pinned_actions(self):
        for workflow in ALL_WORKFLOWS:
            text = workflow.read_text(encoding="utf-8")
            uses = re.findall(r"^\s*uses:\s*([^\s#]+)", text, flags=re.MULTILINE)
            self.assertTrue(uses)
            for action in uses:
                self.assertRegex(action, r"@[0-9a-f]{40}$")
        for workflow in PUBLISH_WORKFLOWS:
            text = workflow.read_text(encoding="utf-8")
            self.assertIn(".github/scripts/verify_release_artifact.py", text)
            self.assertNotIn("python3 - <<'PY'", text)
        build = (ASSETS / "build-release-android.yml").read_text(encoding="utf-8")
        self.assertIn(".github/scripts/sign_and_verify_apks.sh", build)
        self.assertIn(".github/scripts/stage_immutable_android_package.py", build)

    def test_skill_frontmatter_and_workflow_yaml(self):
        skill_text = (SKILL / "SKILL.md").read_text(encoding="utf-8")
        self.assertIn('version: "0.0.6"', skill_text)
        result = subprocess.run(
            [
                "ruby",
                "-e",
                'require "yaml"; ARGV.each { |path| YAML.parse_file(path) }',
                *(str(path) for path in ALL_WORKFLOWS),
            ],
            cwd=ROOT,
            text=True,
            capture_output=True,
            check=False,
        )
        self.assertEqual(result.returncode, 0, result.stderr)


if __name__ == "__main__":
    unittest.main()
