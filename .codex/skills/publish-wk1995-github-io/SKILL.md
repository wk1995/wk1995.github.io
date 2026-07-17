---
name: publish-wk1995-github-io
description: Create or update GitHub Actions workflows that publish build artifacts or blog articles to wk1995.github.io / wk1995/wk1995.github.io, with targets selected by content type such as Android APK, desktop packages, or Markdown blog posts.
---

# Publish wk1995.github.io

## Applicability Check

Use this skill only when the requested publish target is exactly
`wk1995.github.io` or `wk1995/wk1995.github.io`.

If the prompt asks to publish to any other domain, repository, hosting provider,
or package registry, stop using this skill and handle that request with the
appropriate workflow.

## Target Repository

The target repository is fixed:

```text
wk1995/wk1995.github.io
```

Do not replace this repository unless the user explicitly changes the publish
target away from this skill.

## Workflow Location

When creating or updating a publish workflow, write it under:

```text
.github/workflows/
```

Use a workflow name that matches the artifact type, for example:

- `publish-apk-artifact.yml` for Android APK artifacts.
- `publish-desktop-artifact.yml` for Windows/macOS/Linux desktop artifacts.
- `publish-blog-article.yml` for Markdown blog article publishing.
- Keep an existing workflow filename if the repository already has one and the
  user asks to update that workflow.

Create `.github/workflows/` if it does not exist.

## Publish Type Selection

Choose the publish workflow by requested content type:

- Android APK: use the Android artifact workflow and package directory rules.
- Windows/macOS/Linux desktop packages: use the desktop artifact workflow and
  package directory rules.
- Blog article or Markdown post: use the blog article workflow and dispatch
  rules.

Do not mix application package copying and blog article dispatch in one
workflow unless the user explicitly asks for a combined release workflow.

## Source Workflow Contract

For software artifacts, the source repository should have a successful release/build workflow that
uploads artifacts before the publish workflow runs.

Default contract:

- A workflow named `Build Release` exists.
- The publish workflow is triggered by `workflow_run` for `Build Release`.
- The publish workflow also supports `workflow_dispatch` with an optional
  `run_id` input for manually republishing a previous successful run.
- The publish workflow downloads non-expired artifacts from the selected build
  run.

If the source workflow has a different name, artifact prefix, version file, or
metadata layout, adapt the source-side lookup only. Keep the target repository
fixed as `wk1995/wk1995.github.io`.

For blog articles, the source repository should produce or store Markdown files
that already include the required blog frontmatter. The generated source
workflow should either:

- run on `workflow_dispatch` with an `article_path` input, or
- run on push for the source repository's article directory and dispatch every
  changed Markdown file.

Blog article workflows publish by sending a `repository_dispatch` event to
`wk1995/wk1995.github.io` with event type:

```text
blog-post-publish
```

The target repository must have a receiver workflow that handles this event and
writes the Markdown into `content/blog/posts/` or `content/blog/drafts/`.

## Secret Naming

Every new application artifact publish workflow must use an app-specific secret
name:

```text
PUBLISH_APP_FROM_<APP_NAME>_TO_GITHUB_IO
```

Normalize `<APP_NAME>` as uppercase snake case. Examples:

- `PUBLISH_APP_FROM_ADB_PILOT_TO_GITHUB_IO`
- `PUBLISH_APP_FROM_BODYOS_TO_GITHUB_IO`

Do not reuse `PUBLISH_APP_FROM_BODYOS_TO_GITHUB_IO` for unrelated projects.

Every new blog article publish workflow must use a source-specific secret name:

```text
PUBLISH_BLOG_FROM_<SOURCE_NAME>_TO_GITHUB_IO
```

Normalize `<SOURCE_NAME>` as uppercase snake case. Examples:

- `PUBLISH_BLOG_FROM_EDGE_AI_NOTES_TO_GITHUB_IO`
- `PUBLISH_BLOG_FROM_ANDROID_LAB_TO_GITHUB_IO`

Do not reuse one source repository's blog publish secret for unrelated source
repositories.

## Secret Value Requirements

The secret value must be a GitHub Personal Access Token that can write to or
dispatch events into the target repository `wk1995/wk1995.github.io`.

Recommended setup in GitHub:

1. Open GitHub.
2. Go to avatar -> Settings -> Developer settings -> Personal access tokens ->
   Fine-grained tokens -> Generate new token.
3. Use a Fine-grained token for smaller and safer permissions.
4. Repository access: select only the target repository
   `wk1995/wk1995.github.io`.
5. Permissions:
   - Contents: Read and write.
   - Pull requests: Read and write, only if the workflow needs to create PRs.

When creating a new application artifact workflow, add a validation step before
checking out the target repository:

```yaml
- name: Check target repository token
  env:
    TARGET_REPO_TOKEN: ${{ secrets.PUBLISH_APP_FROM_ADB_PILOT_TO_GITHUB_IO }}
  run: |
    set -euo pipefail
    if [ -z "$TARGET_REPO_TOKEN" ]; then
      echo "Missing secret PUBLISH_APP_FROM_ADB_PILOT_TO_GITHUB_IO. It must be a fine-grained token with Contents: Read and write on wk1995/wk1995.github.io." >&2
      exit 1
    fi
```

Then use the same secret to checkout the target repository:

```yaml
- uses: actions/checkout@v4
  with:
    repository: wk1995/wk1995.github.io
    token: ${{ secrets.PUBLISH_APP_FROM_ADB_PILOT_TO_GITHUB_IO }}
    path: target-site
```

Replace `PUBLISH_APP_FROM_ADB_PILOT_TO_GITHUB_IO` with the app-specific secret
for the current project.

When creating a new blog article workflow, add a validation step before sending
the dispatch request:

```yaml
- name: Check target repository token
  env:
    TARGET_REPO_TOKEN: ${{ secrets.PUBLISH_BLOG_FROM_EDGE_AI_NOTES_TO_GITHUB_IO }}
  run: |
    set -euo pipefail
    if [ -z "$TARGET_REPO_TOKEN" ]; then
      echo "Missing secret PUBLISH_BLOG_FROM_EDGE_AI_NOTES_TO_GITHUB_IO. It must be a fine-grained token that can trigger repository_dispatch on wk1995/wk1995.github.io." >&2
      exit 1
    fi
```

Replace `PUBLISH_BLOG_FROM_EDGE_AI_NOTES_TO_GITHUB_IO` with the
source-specific secret for the current repository.

When finishing a task that creates or changes a publish workflow, explicitly
tell the user:

- The exact secret name they must create.
- That the secret value must be the fine-grained Personal Access Token created
  with the permissions above.
- The exact target publish paths used by the workflow.
- For blog article workflows, the source article path pattern and whether the
  workflow publishes to `posts` or `drafts`.

## Publish Directory Rules

Choose the target directory by published program type.

The target publish directory must already exist in `wk1995/wk1995.github.io`.
Do not create publish directories in the publish workflow. After resolving the
exact target path and checking out `target-site`, validate the directory exists
before copying files. If the directory is missing, print a clear error that
includes the target path and fail the workflow with a non-zero exit code.

### Android APK

Use this path:

```text
apps/packages/android/<packageName>/<version>
```

Rules:

- `<packageName>` should be the Android `applicationId`.
- `<version>` should be the release version or a combined version such as
  `<versionCode>(<versionName>)` if the project already uses that format.
- Copy APK files, README if present, and optionally a manifest.

Example:

```text
apps/packages/android/com.example.app/42(1.2.3)
```

### Windows Desktop

Use this path:

```text
apps/packages/window/<appName>/<version>/<systemos>
```

Rules:

- `<appName>` should preserve the product name casing expected by the site, for
  example `adbPilot`.
- `<version>` should be the semantic app version without the leading `v`.
- `<systemos>` identifies the Windows architecture:
  - `32` for 32-bit builds.
  - `64` for 64-bit builds.

Example:

```text
apps/packages/window/adbPilot/0.0.2/64
```

### macOS Desktop

Use this path:

```text
apps/packages/mac/<appName>/<version>/<systemos>
```

Rules:

- `<appName>` should preserve the product name casing expected by the site, for
  example `adbPilot`.
- `<version>` should be the semantic app version without the leading `v`.
- `<systemos>` identifies the macOS chip or package architecture:
  - `arm64` for Apple Silicon.
  - `x86_64` for Intel.
  - `universal2` for universal packages, if produced.

Example:

```text
apps/packages/mac/adbPilot/0.0.2/arm64
```

### Linux Desktop

Use this path when the project publishes Linux desktop artifacts:

```text
apps/packages/linux/<appName>/<version>/<systemos>
```

Recommended `<systemos>` values include `x86_64`, `arm64`, `deb-x86_64`, or
`appimage-x86_64`, depending on the artifact format the project publishes.

### Blog Articles

Blog article source files must be Markdown with YAML frontmatter.

Publishable articles use this target content directory:

```text
content/blog/posts/<year>/<yyyy-mm-dd-slug>.md
```

Review drafts use this target content directory:

```text
content/blog/drafts/<yyyy-mm-dd-slug>.md
```

Rules:

- Source Markdown must include `title`, `slug`, `date`, `status`, `summary`,
  and `tags`.
- `date` must use `YYYY-MM-DD`.
- `slug` must use lowercase letters, numbers, and hyphens.
- Files sent to `posts` must use `status: "published"`.
- Files sent to `drafts` do not appear on the live blog until moved to
  `content/blog/posts/` and marked `status: "published"`.
- The target receiver builds `blog/posts/<year>/<slug>/index.html`,
  `blog/posts/index.json`, and `blog/posts/home.json`.

Blog article workflows should not edit `blog/posts/index.json`,
`blog/posts/home.json`, or generated article HTML directly. They should send
only Markdown content to the target receiver.

## Templates

Available starter templates:

- `assets/publish-apk-artifact.yml`: Android APK-oriented starter workflow.
- `assets/publish-desktop-artifact.yml`: Windows/macOS desktop starter workflow.
- `assets/publish-blog-article.yml`: Markdown blog article dispatch workflow
  for source repositories.

Templates are starting points. Adapt source-side artifact names, metadata files,
article paths, app/source name, and secret name to match the current
repository. Keep the target repository and publish directory rules from this
skill.

## Validation

After writing or updating the workflow:

- Check YAML syntax and indentation.
- For app artifact workflows, confirm the workflow contains
  `repository: wk1995/wk1995.github.io`.
- For blog article workflows, confirm the dispatch URL targets
  `https://api.github.com/repos/wk1995/wk1995.github.io/dispatches`.
- Confirm it references the publish-type-specific secret name.
- Confirm the secret name matches the publish type:
  - App artifacts: `PUBLISH_APP_FROM_<APP_NAME>_TO_GITHUB_IO`.
  - Blog articles: `PUBLISH_BLOG_FROM_<SOURCE_NAME>_TO_GITHUB_IO`.
- Confirm the workflow has a token validation step before checking out the
  target repository or before sending the repository dispatch request.
- For app artifact workflows, confirm the workflow trigger includes
  `workflow_run` for `Build Release` and `workflow_dispatch`, unless the user
  explicitly requested a different source workflow.
- For blog article workflows, confirm the workflow trigger includes
  `workflow_dispatch` and/or a push trigger for the source article path.
- Confirm the publish paths match the program type:
  - Android: `apps/packages/android/<packageName>/<version>`.
  - Windows: `apps/packages/window/<appName>/<version>/<systemos>`.
  - macOS: `apps/packages/mac/<appName>/<version>/<systemos>`.
  - Linux: `apps/packages/linux/<appName>/<version>/<systemos>`.
- Confirm the blog article dispatch sends `event_type: blog-post-publish` with
  base64-encoded Markdown content and target `posts` or `drafts`.
- Confirm every application artifact publish step fails with a clear error if the resolved target
  publish directory does not already exist in `target-site`.
- Confirm the final response names the required secret and describes the
  required secret value permissions.
