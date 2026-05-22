# App package directory

Place generated app install packages in this directory and update `manifest.json`.

Expected manifest shape:

```json
{
  "version": 1,
  "updatedAt": "2026-05-22T00:00:00.000Z",
  "basePath": "packages/",
  "apps": [
    {
      "id": "demo-app",
      "name": "Demo App",
      "version": "1.0.0",
      "platform": "Android",
      "file": "demo-app-v1.0.0.apk",
      "description": "Short app description.",
      "updatedAt": "2026-05-22"
    }
  ]
}
```

`file` is resolved relative to `basePath`. Use `url` instead when the package is hosted elsewhere.
