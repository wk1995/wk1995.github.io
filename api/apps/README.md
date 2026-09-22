# App 列表接口（`/api/apps`）

基于 `apps/packages/manifest.json` 的 App 列表**查询与更新**接口。数据源、前端渲染与生成脚本共用同一份 manifest。

## 运行本地服务

```bash
# 写操作需要 APPS_API_WRITE=1；读操作无需
APPS_API_WRITE=1 node scripts/video-resolver-server.cjs
# 默认端口 8024，可用 PORT=xxxx / HOST=127.0.0.1 覆盖
```

接口根路径：`http://127.0.0.1:8024/api/apps`

> `/api/apps` 仅由 Node 服务（`scripts/video-resolver-server.cjs`）提供，纯静态 GitHub Pages 不含该接口。

## 端点速查

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| `GET` | `/api/apps` | 列表，支持 `?platform=` / `?q=` 过滤 |
| `GET` | `/api/apps?id=` | 单条（404 若不存在） |
| `POST` | `/api/apps` | 更新已有条目，body 需 `id` + `name`；不存在返回 404 |
| `PUT` | `/api/apps?id=` | 替换可写字段，保留 `latest` / `versions` 等生成字段 |
| `PATCH` | `/api/apps?id=` | 局部合并；`betaqr` 按字段浅合并 |
| `DELETE` | `/api/apps?id=` | 删除 |

## 写保护

所有写操作需环境变量 `APPS_API_WRITE=1`，否则返回 `403`。这是为防止误写生产清单。

## 请求示例

```bash
# 列表（按平台过滤）
curl "http://127.0.0.1:8024/api/apps?platform=android"

# 单条
curl "http://127.0.0.1:8024/api/apps?id=android%2Fcn.wk.android.body.os"

# 更新已有条目，带 betaqr 分发渠道块
curl -X POST "http://127.0.0.1:8024/api/apps" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "android/cn.wk.android.body.os",
    "name": "Cn.Wk.Android.Body.Os",
    "platformId": "android",
    "betaqr": { "id": "AbC123Def456", "short": "bodyos", "tokenRef": "wk-default", "enabled": true }
  }'

# 局部合并：betaqr 按字段浅合并，不会清掉未提交的 id / tokenRef / enabled
curl -X PATCH "http://127.0.0.1:8024/api/apps?id=android%2Fcn.wk.android.body.os" \
  -H "Content-Type: application/json" \
  -d '{ "betaqr": { "short": "bodyos2" } }'

# 删除
curl -X DELETE "http://127.0.0.1:8024/api/apps?id=android%2Fcn.wk.android.body.os"
```

## 数据模型

App 条目关键字段：`id`（必填，`平台/slug`）、`name`（写入必填）、`platformId`、`description`、
`latest`、`versions`、`hasHistory`、`updatedAt`、`betaqr`。

### `betaqr` 分发渠道块（可选）

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | string | betaqr 应用 id（应用管理 → 基本信息） |
| `short` | string | 应用短链接；仅含字母、数字、`_`、`-` |
| `tokenRef` | string | 指向服务端密钥配置的逻辑键（对应 `api_token`） |
| `enabled` | boolean | 是否启用 betaqr 分发，默认 `true` |

**安全约定**：`api_token` 是密钥，绝不进 manifest，统一存放于服务端配置（约定 `.betaqr-env.json`，已写入 `.gitignore`）。
本接口只负责数据模型，不向 betaqr 发起任何请求。

## 错误码

| HTTP | 场景 |
| --- | --- |
| 400 | 请求体非 JSON / 缺 `id` 或 `name` / 字段校验失败（如 `betaqr.short` 非法）/ 安装包目录不存在 / 请求体超过 64KB |
| 403 | 写操作但未设置 `APPS_API_WRITE=1` |
| 404 | 按 `id` 取单条 / POST / PUT / PATCH / DELETE 时 `id` 不存在 |
| 405 | 不支持的方法 |
| 500 | 服务端异常 |

## 平台枚举

`android` · `ios` · `harmony` · `windows` · `macos` · `linux` · `web` · `other`

## 相关文档

- 开发者接口页（HTML）：`docs/api-apps.html`
- OpenAPI 规范（AI 可解析）：`openapi.json`
- manifest 数据模型：`docs/apps-manifest-schema.md`
- 实现：`index.js`（处理器）、`scripts/video-resolver-server.cjs`（`apiRoutes` 注册）
