from pathlib import Path
import unittest


REFRESH_WORKFLOW = Path(".github/workflows/refresh-trending.yml")
MANIFEST_WORKFLOW = Path(".github/workflows/update-app-manifest.yml")
PAGES_WORKFLOW = Path(".github/workflows/pages.yml")
PUBLISH_SKILL = Path(".codex/skills/publish-wk1995-github-io/SKILL.md")
PUBLISH_ASSETS = (
    Path(".codex/skills/publish-wk1995-github-io/assets/publish-apk-artifact.yml"),
    Path(".codex/skills/publish-wk1995-github-io/assets/publish-desktop-artifact.yml"),
)


class RefreshTrendingWorkflowTest(unittest.TestCase):
    def test_refresh_trending_updates_page_branch_without_touching_main(self):
        workflow = REFRESH_WORKFLOW.read_text(encoding="utf-8")

        self.assertIn("branches: [main]", workflow)
        self.assertIn("contents: write", workflow)
        self.assertIn("actions: write", workflow)
        self.assertIn("PAGE_BRANCH: page", workflow)
        self.assertIn("cancel-in-progress: false", workflow)
        merge_command = 'git merge origin/main -m "[home][mac-min] 同步 main 到 page"'
        self.assertIn(merge_command, workflow)
        self.assertLess(
            workflow.index('git config user.name "github-actions[bot]"'),
            workflow.index(merge_command),
        )
        self.assertIn("python scripts/update_trending.py --since daily --limit 6", workflow)
        self.assertIn("git push origin \"$PAGE_BRANCH\"", workflow)
        self.assertIn("gh workflow run update-app-manifest.yml --ref main", workflow)
        self.assertNotIn("git push --force", workflow)
        self.assertNotIn("pull-requests: write", workflow)
        self.assertNotIn("peter-evans/create-pull-request@", workflow)
        self.assertNotIn("actions/upload-pages-artifact@", workflow)
        self.assertNotIn("actions/deploy-pages@", workflow)

    def test_manifest_uses_page_content_but_deploys_from_allowed_main_ref(self):
        workflow = MANIFEST_WORKFLOW.read_text(encoding="utf-8")

        self.assertIn("on:\n  workflow_dispatch:", workflow)
        self.assertNotIn("push:", workflow)
        self.assertIn("if: github.ref_name == 'main'", workflow)
        self.assertIn("ref: page", workflow)
        self.assertIn("APP_MANIFEST_VERSION_NAME=page-", workflow)
        self.assertIn("python scripts/generate_app_manifest.py", workflow)
        self.assertIn("git push origin HEAD:page", workflow)
        self.assertIn("actions/upload-pages-artifact@", workflow)
        self.assertIn("actions/deploy-pages@", workflow)
        self.assertNotIn("TARGET_BRANCH", workflow)
        self.assertNotIn("APP_MANIFEST_VERSION_NAME=main-", workflow)

    def test_deployment_has_a_single_page_workflow(self):
        self.assertFalse(PAGES_WORKFLOW.exists())

    def test_publish_skill_keeps_packages_on_main_and_generated_files_on_page(self):
        skill = PUBLISH_SKILL.read_text(encoding="utf-8")

        self.assertIn("Publish package files to the fixed source branch", skill)
        self.assertIn("main", skill)
        self.assertIn("invoked from `main`", skill)
        self.assertIn("checks out `page`", skill)
        self.assertIn("Never copy or merge files generated on `page` back into `main`", skill)
        for asset_path in PUBLISH_ASSETS:
            asset = asset_path.read_text(encoding="utf-8")
            self.assertIn("repository: wk1995/wk1995.github.io", asset)
            self.assertIn("ref: main", asset)
            self.assertNotIn("ref: page", asset)


if __name__ == "__main__":
    unittest.main()
