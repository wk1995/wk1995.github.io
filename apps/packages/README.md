# App package directory

Place generated app install packages in the platform directory under this folder and update `manifest.json`.

Recommended directory structure:

```text
apps/packages/
  android/
  ios/
  harmony/
  windows/
  macos/
  linux/
  web/
  other/
  manifest.json
```

Recommended manifest shape:

```json
{
  "version": 1,
  "updatedAt": "2026-05-22T00:00:00.000Z",
  "basePath": "packages/",
  "basePaths": {
    "android": "packages/android/",
    "ios": "packages/ios/",
    "harmony": "packages/harmony/",
    "windows": "packages/windows/",
    "macos": "packages/macos/"
  },
  "platforms": {
    "android": [
      {
        "id": "demo-android",
        "name": "Demo App",
        "version": "1.0.0",
        "file": "demo-app-v1.0.0.apk",
        "description": "Short app description.",
        "updatedAt": "2026-05-22"
      }
    ],
    "ios": [],
    "harmony": [],
    "windows": [],
    "macos": []
  }
}
```

`file` is resolved relative to the platform `basePath`. Use `url` instead when the package is hosted elsewhere.

The app page also still supports the old flat `apps` array. It can infer platforms from common extensions such as `.apk`, `.aab`, `.ipa`, `.hap`, `.exe`, `.msi`, `.dmg`, `.pkg`, `.deb`, `.rpm`, and `.AppImage`.
