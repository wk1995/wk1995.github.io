from pathlib import Path
import unittest


REFRESH_WORKFLOW = Path(".github/workflows/refresh-trending.yml")
PAGES_WORKFLOW = Path(".github/workflows/pages.yml")


class RefreshTrendingWorkflowTest(unittest.TestCase):
    def test_refresh_trending_updates_page_branch_without_touching_main(self):
        workflow = REFRESH_WORKFLOW.read_text(encoding="utf-8")

        self.assertIn("branches: [main]", workflow)
        self.assertIn("PAGE_BRANCH: page", workflow)
        self.assertIn("git merge --no-edit origin/main", workflow)
        self.assertIn("python scripts/update_trending.py --since daily --limit 6", workflow)
        self.assertIn("git push origin \"$PAGE_BRANCH\"", workflow)
        self.assertNotIn("git push --force", workflow)
        self.assertNotIn("pull-requests: write", workflow)
        self.assertNotIn("peter-evans/create-pull-request@", workflow)
        self.assertNotIn("actions/deploy-pages@", workflow)

    def test_pages_deploys_only_from_page_branch(self):
        workflow = PAGES_WORKFLOW.read_text(encoding="utf-8")

        self.assertIn("branches:\n      - page", workflow)
        self.assertNotIn("branches:\n      - main", workflow)


if __name__ == "__main__":
    unittest.main()
