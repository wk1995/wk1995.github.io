# Verification Commands

Use these commands from the repository root unless the user provides a different workspace.

## Static Skill Validation

```sh
PYTHONPATH=/Users/chengpeng/Library/Python/3.9/lib/python/site-packages python3 /Users/chengpeng/.codex/skills/.system/skill-creator/scripts/quick_validate.py .codex/skills/wk1995-frontend-design
```

If `PyYAML` is unavailable, use a temporary venv outside the repository:

```sh
python3 -m venv /tmp/wk1995-skill-validate-venv
/tmp/wk1995-skill-validate-venv/bin/python -m pip install PyYAML
/tmp/wk1995-skill-validate-venv/bin/python /Users/chengpeng/.codex/skills/.system/skill-creator/scripts/quick_validate.py .codex/skills/wk1995-frontend-design
```

## Site Quality Checks

Run after frontend edits:

```sh
python3 .codex/skills/wk1995-frontend-design/scripts/check_site_quality.py --root .
```

Use strict mode before larger releases:

```sh
python3 .codex/skills/wk1995-frontend-design/scripts/check_site_quality.py --root . --strict
```

## Local Preview

For most pages, opening the HTML file directly is enough. Use a local server when fetches or relative paths are involved:

```sh
python3 -m http.server 4173
```

Then inspect:

- `http://localhost:4173/`
- `http://localhost:4173/blog/`
- `http://localhost:4173/apps/`
- `http://localhost:4173/models/`
- `http://localhost:4173/chat/`
- `http://localhost:4173/feedback/`
- `http://localhost:4173/music/`

Check at 360px, 768px, and 1280px widths. Toggle light/dark theme and zh/en language when the page supports it.
