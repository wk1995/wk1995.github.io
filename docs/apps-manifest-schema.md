# App 清单（manifest.json）数据模型

`apps/packages/manifest.json` 是「个人 App 列表」页面（`apps/index.html`）与
`/api/apps` 接口的共同数据源。本文档描述其完整字段，重点说明可选的
**betaqr 分发渠道**块（参照 <https://www.betaqr.com.cn/docs> 设计）。

> 约定：本文档描述**数据模型与接口字段**。任何向 betaqr.com.cn 发起的线上请求
> （取应用信息、检测更新、持续集成上传等）都由服务端代理接口负责，本仓库的
> manifest 与静态页面**不持有任何密钥**。

---

## 顶层字段

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `schemaVersion` | number | 清单 schema 版本，当前为 `2` |
| `version` | number | 同 `schemaVersion`，兼容旧字段 |
| `versionName` | string | 发布展示名，如 `main-20260630150829` |
| `versionNumber` | string | 发布版本号，`yyyyMMddHHmmss` |
| `release` | object | `{ versionName, versionNumber }` |
| `updatedAt` | string | 清单级更新日期 `YYYY-MM-DD` |
| `basePath` | string | 安装包根路径，默认 `packages/` |
| `basePaths` | object | 各平台根路径映射 |
| `apps` | array | App 列表（见下） |
| `platforms` | object | 平台 → 该平台下 app `id` 数组，由写接口自动重算 |

---

## App 条目字段

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `id` | string | 是 | `平台/slug`，如 `android/cn.wk.android.body.os` |
| `slug` | string | 否 | 短名，缺省取 `id` 的 `/` 后部分 |
| `name` | string | 是* | 展示名；通过接口写入时必填，生成脚本可推断 |
| `platform` | string | 否 | 平台展示名，缺省由 `platformId` 推导 |
| `platformId` | string | 否 | 平台键：`android`/`ios`/`harmony`/`windows`/`macos`/`linux`/`web`/`other` |
| `description` | string | 否 | 简介 |
| `readme` | string | 否 | README 文本 |
| `readmeFile` | string | 否 | README 相对路径 |
| `latest` | object | 否 | 最新版本（含 `version`/`basePath`/`file`/`files`/`updatedAt`） |
| `versions` | array | 否 | 历史版本列表 |
| `hasHistory` | boolean | 否 | 是否有多版本 |
| `updatedAt` | string | 否 | 该 App 更新日期 |
| `betaqr` | object | 否 | **betaqr 分发渠道块（见下）** |

> 通过 `/api/apps` 写入时：`POST`/`PUT` 要求 `id` + `name`；`platformId` 缺省从
> `id` 前缀推断；`updatedAt` 自动刷新为今天。

---

## betaqr 分发渠道块

每条 App 可携带一个可选的 `betaqr` 对象，记录其在 betaqr.com.cn 的分发信息。
**仅作为数据模型，不发任何请求。**

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | string | betaqr 应用 id，可在「应用管理 → 基本信息」查看 |
| `short` | string | 应用短链接（上传时随机生成，可改）；仅含字母、数字、`_`、`-` |
| `tokenRef` | string | **逻辑键名**，指向服务端密钥配置中的 `api_token`（见安全说明） |
| `enabled` | boolean | 是否启用 betaqr 作为该 App 的分发渠道，默认 `true` |

示例：

```json
{
  "id": "android/cn.wk.android.body.os",
  "name": "Cn.Wk.Android.Body.Os",
  "platformId": "android",
  "betaqr": {
    "id": "AbC123Def456",
    "short": "bodyos",
    "tokenRef": "wk-default",
    "enabled": true
  }
}
```

### 安全说明（重要）

- **`api_token` 是密钥，绝不放进 `manifest.json`，也不进任何前端代码。**
- `api_token` 统一存放在**服务端**配置（约定文件 `.betaqr-env.json`，不入库），
  结构如 `{ "wk-default": "<API_TOKEN>" }`。
- `betaqr.tokenRef` 仅记录「用哪个密钥」的逻辑键，后续代理接口据此解析真实
  `api_token`，再代 App 向 betaqr 发起检测更新 / 取安装页等请求。
- 写接口（`/api/apps` 的 POST/PUT/PATCH）对 `betaqr` 做字段级校验：未知字段、
  非法 `short`、非布尔 `enabled` 等均会被拒绝。

### 字段校验规则（服务端）

- `betaqr` 必须是对象；`null` 表示清空（PATCH/PUT 时）。
- 仅允许 `id` / `short` / `tokenRef` / `enabled` 四个字段，其他字段报错。
- `short` 匹配 `^[A-Za-z0-9_-]+$`。
- `enabled` 必须是布尔。

### 与生成脚本的关系

`scripts/generate_app_manifest.py` 按文件系统重建 manifest 时，会按 `id` 从旧
manifest 继承已有的 `betaqr` 块，因此通过 `/api/apps` 写入的 betaqr 信息不会被
重新生成覆盖清空。

---

## 短链接 → 安装页

当 `betaqr.short` 存在时，betaqr 安装页地址为：

```
https://www.betaqr.com.cn/<short>
```

该地址自带 betaqr 生成的扫码下载二维码，后续前端 / 代理接口可据此为 App 卡片
追加「betaqr 扫码下载」入口（不在本文档范围内）。
