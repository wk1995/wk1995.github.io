# App package directory

Place generated app install packages in the platform directory under this folder and update `manifest.json`.

Recommended directory structure:

```text
apps/packages/
  android/
    demo-app/
      README.md
      demo-app.apk
    versioned-app/
      README.md
      1.0.0/
        versioned-app.apk
      1.1.0/
        versioned-app.apk
        versioned-app.aab
  ios/
    demo-app/
      demo-app.ipa
  manifest.json
```

There are two supported package layouts:

1. `platform/package-name/install-file`
   This app has no history versions. The list page shows that package directly.

2. `platform/package-name/version/install-file`
   This app has history versions. The list page shows the latest version only, and the detail page shows every version.

For Android, only `.apk` and `.aab` files are treated as install packages. A `README` file in the package directory is used as the project description on the app detail page.

Recommended manifest shape:

```json
{
  "version": 2,
  "updatedAt": "2026-05-22T00:00:00.000Z",
  "basePath": "packages/",
  "apps": [
    {
      "id": "android/demo-app",
      "name": "Demo App",
      "platform": "android",
      "readme": "# Demo App\n\nShort app description.",
      "latest": {
        "version": "1.1.0",
        "basePath": "packages/android/demo-app/1.1.0/",
        "file": "demo-app.apk",
        "files": [
          {
            "file": "demo-app.apk",
            "type": "apk",
            "size": "24.3 MB",
            "updatedAt": "2026-05-22"
          }
        ]
      },
      "versions": [
        {
          "version": "1.0.0",
          "basePath": "packages/android/demo-app/1.0.0/",
          "file": "demo-app.apk",
          "files": [
            {
              "file": "demo-app.apk",
              "type": "apk"
            }
          ]
        },
        {
          "version": "1.1.0",
          "basePath": "packages/android/demo-app/1.1.0/",
          "file": "demo-app.apk",
          "files": [
            {
              "file": "demo-app.apk",
              "type": "apk"
            }
          ]
        }
      ]
    }
  ]
}
```

The manifest can be generated from the directory structure:

```powershell
python scripts/generate_app_manifest.py
```

The app page still supports the old flat `apps` array:

```json
{
  "apps": [
      {
        "id": "demo-android",
        "name": "Demo App",
        "version": "1.0.0",
        "platform": "Android",
        "file": "demo-app-v1.0.0.apk",
        "description": "Short app description."
      }
  ]
}
```

Use `url` instead of `file` when a package is hosted elsewhere.
