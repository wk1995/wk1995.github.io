from pathlib import Path
import unittest


WORKFLOW = Path(".github/workflows/refresh-trending.yml")


class RefreshTrendingWorkflowTest(unittest.TestCase):
    def test_opens_pull_request_instead_of_pushing_to_main(self):
        workflow = WORKFLOW.read_text(encoding="utf-8")

        self.assertIn("pull-requests: write", workflow)
        self.assertIn("peter-evans/create-pull-request@", workflow)
        self.assertNotIn("git push", workflow)
        self.assertNotIn("actions/deploy-pages@", workflow)


if __name__ == "__main__":
    unittest.main()
