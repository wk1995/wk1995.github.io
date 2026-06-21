---
name: publish-wk1995-github-io
description: Create or update GitHub Actions workflows that publish build artifacts to wk1995.github.io / wk1995/wk1995.github.io, with artifact paths selected by application type such as Android APK, Windows desktop, macOS desktop, or Linux desktop.
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
- Keep an existing workflow filename if the repository already has one and the
  user asks to update that workflow.

Create `.github/workflows/` if it does not exist.

## Source Workflow Contract

The source repository should have a successful release/build workflow that
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

## Secret Naming

Every new publish workflow must use an app-specific secret name:

```text
PUBLISH_APP_FROM_<APP_NAME>_TO_GITHUB_IO
```

Normalize `<APP_NAME>` as uppercase snake case. Examples:

- `PUBLISH_APP_FROM_ADB_PILOT_TO_GITHUB_IO`
- `PUBLISH_APP_FROM_BODYOS_TO_GITHUB_IO`

Do not reuse `PUBLISH_APP_FROM_BODYOS_TO_GITHUB_IO` for unrelated projects.

## Secret Value Requirements

The secret value must be a GitHub Personal Access Token that can write to the
target repository `wk1995/wk1995.github.io`.

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

When creating a new workflow, add a validation step before checking out the
target repository:

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

When finishing a task that creates or changes a publish workflow, explicitly
tell the user:

- The exact secret name they must create.
- That the secret value must be the fine-grained Personal Access Token created
  with the permissions above.
- The exact target publish paths used by the workflow.

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

## Templates

Available starter templates:

- `assets/publish-apk-artifact.yml`: Android APK-oriented starter workflow.
- `assets/publish-desktop-artifact.yml`: Windows/macOS desktop starter workflow.

Templates are starting points. Adapt source-side artifact names, metadata files,
app name, and secret name to match the current repository. Keep the target
repository and publish directory rules from this skill.

## Validation

After writing or updating the workflow:

- Check YAML syntax and indentation.
- Confirm the workflow contains `repository: wk1995/wk1995.github.io`.
- Confirm it references the app-specific secret name.
- Confirm the secret name matches `PUBLISH_APP_FROM_<APP_NAME>_TO_GITHUB_IO`.
- Confirm the workflow has a token validation step before checking out the
  target repository.
- Confirm the workflow trigger includes `workflow_run` for `Build Release` and
  `workflow_dispatch`, unless the user explicitly requested a different source
  workflow.
- Confirm the publish paths match the program type:
  - Android: `apps/packages/android/<packageName>/<version>`.
  - Windows: `apps/packages/window/<appName>/<version>/<systemos>`.
  - macOS: `apps/packages/mac/<appName>/<version>/<systemos>`.
  - Linux: `apps/packages/linux/<appName>/<version>/<systemos>`.
- Confirm every publish step fails with a clear error if the resolved target
  publish directory does not already exist in `target-site`.
- Confirm the final response names the required secret and describes the
  required secret value permissions.
