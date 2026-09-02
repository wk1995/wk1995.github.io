# Android App Distribution SDK PRD

| 项目 | 内容 |
| --- | --- |
| 文档状态 | Draft / 待评审 |
| PRD 版本 | 0.1 |
| 创建日期 | 2026-09-02 |
| 目标版本 | SDK 1.0.0 |
| 目标平台 | Android，`minSdk 24` |
| 交付形态 | 可供其他 Android App 依赖的 AAR / Maven artifact |

## 1. 背景

当前站点已经具备一套静态 App 分发能力：

- `apps/packages/manifest.json` 保存各平台 App、版本和安装包记录。
- App 列表页读取完整清单后展示、搜索和按平台筛选。
- App 详情页通过完整 App ID（例如 `android/com.wk.car.manger`）在清单中查找记录。
- 安装包下载地址由发布记录中的 `basePath` 与 `file` 拼接，或者直接使用 `url`。
- `scripts/generate_app_manifest.py` 根据安装包目录生成 schema v2 清单。

其他 Android App 目前只能自行请求和解析这份 JSON，容易重复实现清单兼容、缓存、更新比较、下载状态管理和文件校验。需要将上述能力封装成稳定的 Android SDK API。

### 1.1 本 PRD 对“更新信息”的定义

本期将“更新信息”定义为：调用方提供本地 `versionCode`，SDK 返回是否存在更新以及最新版本、变更说明、安装包等元数据。

本期不包含远程创建或修改 App 记录的管理 API。如果“更新信息”原意是编辑服务端 App 数据，需要另立发布管理 API 需求。

## 2. 产品目标

SDK 1.0.0 为接入方提供四项核心能力：

1. 获取已发布的 Android App 列表。
2. 通过 App ID 获取完整 App 记录和历史版本。
3. 根据本地 `versionCode` 获取可判定、可解释的更新信息。
4. 下载指定 App 的最新或指定版本 APK，并提供进度、取消、失败重试和完整性校验。

### 2.1 成功标准

- 新 App 在不自行解析 JSON 的情况下，于 30 分钟内完成 SDK 接入并获取列表。
- 同一份清单中，SDK 列表和现有网页展示的 Android App 集合一致。
- 更新判断只使用数值型 `versionCode`，不会通过字符串排序误判版本。
- 下载成功时文件 SHA-256 校验通过；校验失败时不向调用方返回可用文件。
- 缓存命中时，列表或详情 API 在典型设备上的响应时间不超过 100 ms。

## 3. 用户与使用场景

### 3.1 目标用户

- 需要展示 WK App 分发列表的 Android App 开发者。
- 需要为自身或指定 App 检测新版本的 Android App 开发者。
- 需要在 App 内触发安装包下载并展示进度的开发者。

### 3.2 核心场景

1. 分发中心 App 打开页面，调用 SDK 获取 Android App 列表。
2. 用户点击列表项，宿主通过 App ID 获取详情和历史版本。
3. 宿主启动或用户主动检查时，传入已安装 `versionCode` 获取更新信息。
4. 用户确认下载后，宿主订阅下载状态并在完成时获得本地 APK URI。

## 4. 范围

### 4.1 SDK 1.0.0 范围内

- Android library 模块及稳定的 Kotlin API。
- Android App 列表、单条详情、更新检查、APK 下载。
- schema v2 清单的列表、详情和下载兼容读取。
- schema v3 清单的完整能力，包括可靠更新比较和 SHA-256 校验。
- 内存与磁盘清单缓存、强制刷新、过期缓存降级。
- 协程 `suspend` API 与下载状态 `Flow`。
- Java 可调用的必要入口。
- 明确的错误模型、日志回调和单元测试。

### 4.2 SDK 1.0.0 范围外

- 安装 APK、申请“安装未知应用”权限或静默安装。
- AAB 安装；AAB 可以作为记录返回，但下载 API 默认只选择 APK。
- iOS、HarmonyOS、Windows、macOS 等非 Android 记录。
- App 记录、README、版本或安装包的上传、创建、更新和删除。
- 用户账号、登录、权限管理、灰度发布、渠道分流和推送通知。
- 宿主 App 的更新弹窗、列表页、详情页等 UI。
- 后台定时检查；调度时机由宿主 App 决定。

## 5. 数据与标识约定

### 5.1 App ID

- 唯一标识格式固定为 `android/{applicationId}`，例如 `android/com.wk.car.manger`。
- App ID 大小写敏感，SDK 不进行模糊匹配。
- `applicationId` 作为独立字段返回，便于宿主展示和与本机包信息比对。
- 同一清单内 App ID 不得重复；重复时整份清单视为数据异常，避免返回不确定记录。

### 5.2 版本规则

- `versionCode`：非负整数，是更新比较的唯一依据。
- `versionName`：展示字符串，不参与更新排序。
- 当远端 `versionCode > currentVersionCode` 时为有更新。
- 当两者相等时为无更新。
- 当远端更小时为无更新，同时返回 `REMOTE_VERSION_OLDER` 诊断信息，不自动降级。
- schema v2 记录缺少 `versionCode` 时，列表、详情和下载仍可使用，但更新检查必须返回 `VersionMetadataMissing`，禁止根据 `1(0.0.1)` 等目录字符串猜测。

### 5.3 清单 schema v3 最小字段

现有 schema v2 保持可读，生成器需为 Android 发布记录补充以下字段：

```json
{
  "schemaVersion": 3,
  "apps": [
    {
      "id": "android/com.wk.car.manger",
      "applicationId": "com.wk.car.manger",
      "name": "CarManger",
      "platformId": "android",
      "description": "...",
      "latest": {
        "versionCode": 1,
        "versionName": "0.0.1",
        "releaseNotes": "...",
        "publishedAt": "2026-08-17T00:44:30+08:00",
        "minSdk": 24,
        "files": [
          {
            "file": "app-release.apk",
            "type": "apk",
            "sizeBytes": 48129638,
            "sha256": "df07ed04a89d7b7bb8b279be52ccc73133e52e4b9de0eff1e85fc3579c93d188"
          }
        ]
      },
      "versions": []
    }
  ]
}
```

要求：

- 生成器优先从 `release-artifact.properties` 读取 `VERSION_CODE`、`VERSION_NAME`，从 `release-artifact.sha256` 读取文件校验和。
- `versionCode`、`versionName` 和 SHA-256 必须与实际 APK 一致；发布流程在不一致时失败。
- SDK 将相对路径基于清单 URL 解析为 HTTPS 下载 URL，不依赖硬编码域名。
- `sizeBytes` 使用整数；现有 `size` 展示字段可在兼容期保留。

## 6. 功能需求

### FR-01 初始化

宿主应能通过配置对象初始化单例客户端：

- `manifestUrl`：必填，正式环境建议为 `https://wk1995.github.io/apps/packages/manifest.json`。
- `cacheTtl`：默认 15 分钟。
- `maxStale`：默认 24 小时。
- `requireChecksum`：正式构建默认 `true`。
- `downloadDirectory`：默认使用宿主 App 专属外部文件目录。
- `logger`：可选，SDK 默认不输出包含完整 URL 查询参数的日志。

同一进程重复使用等价配置初始化应为幂等操作；使用冲突配置重复初始化时返回明确错误。

### FR-02 获取 Android App 列表

SDK 提供异步列表 API：

```kotlin
suspend fun getAndroidApps(
    forceRefresh: Boolean = false
): WkResult<List<AndroidAppSummary>>
```

行为要求：

- 仅返回 `platformId == "android"` 且至少存在一个有效发布文件的记录。
- 保持清单顺序，SDK 不擅自按名称或版本排序。
- 默认优先读取未过期缓存；`forceRefresh = true` 时请求远端。
- 远端失败且存在未超过 `maxStale` 的缓存时返回缓存，并标记 `isStale = true`。
- 每条摘要至少包含 App ID、applicationId、名称、描述、最新版本、更新时间和首选 APK 信息。
- 返回不可变集合；调用方修改本地对象不影响 SDK 缓存。

### FR-03 通过 App ID 获取记录

```kotlin
suspend fun getAndroidApp(
    appId: String,
    forceRefresh: Boolean = false
): WkResult<AndroidAppRecord>
```

行为要求：

- 使用完整 App ID 精确查找。
- 返回摘要字段、README、最新发布和全部可用历史发布。
- 历史发布按清单顺序返回，并明确标记 `latest`。
- App 不存在时返回 `AppNotFound(appId)`，不返回 `null`。
- App ID 为空、格式错误或不是 `android/` 前缀时返回 `InvalidAppId`，不发起网络请求。

### FR-04 获取更新信息

```kotlin
suspend fun checkForUpdate(
    appId: String,
    currentVersionCode: Long,
    forceRefresh: Boolean = false
): WkResult<AndroidUpdateInfo>
```

`AndroidUpdateInfo` 至少包含：

- `appId`、`applicationId`。
- `currentVersionCode`。
- `updateAvailable`。
- `latestVersionCode`、`latestVersionName`。
- `releaseNotes`、`publishedAt`、`minSdk`。
- 首选 APK 的下载元数据。
- `manifestVersion` 与 `fromStaleCache`，便于宿主解释结果来源。

行为要求：

- 只使用 `versionCode` 比较版本。
- 远端最新发布只有 AAB、没有 APK 时，可以返回有更新，但 `downloadable = false` 并给出原因。
- 远端 `minSdk` 高于当前设备 API Level 时，返回有更新但 `compatible = false`。
- SDK 不自行展示弹窗、不强制退出宿主、不自动下载。

### FR-05 下载安装包

```kotlin
fun downloadApk(
    appId: String,
    versionCode: Long? = null
): Flow<DownloadState>

suspend fun cancelDownload(downloadId: String): WkResult<Unit>
```

下载状态至少包括：

- `Queued(downloadId)`。
- `Downloading(downloadId, bytesDownloaded, totalBytes, progressPercent?)`。
- `Verifying(downloadId)`。
- `Completed(downloadId, contentUri, sha256, verified)`。
- `Failed(downloadId, error, canRetry)`。
- `Cancelled(downloadId)`。

行为要求：

- `versionCode == null` 时下载最新 APK；指定版本时精确选择对应 APK。
- 相同 URL、目标文件和校验和的进行中任务应复用同一个下载任务，避免重复占用流量。
- 支持取消；网络中断、磁盘空间不足、HTTP 非成功状态和校验失败需要区分错误。
- 已存在且 SHA-256 校验通过的文件可直接返回 `Completed`。
- 下载先写临时文件，校验通过后再原子移动为最终文件。
- `requireChecksum = true` 且清单缺少 SHA-256 时拒绝下载，并返回 `ChecksumMissing`。
- SHA-256 不匹配时删除临时文件并返回 `IntegrityCheckFailed`。
- 最终只返回 `content://` URI，不向调用方暴露不可共享的 `file://` URI。
- SDK 不触发安装 Intent。

### FR-06 刷新与缓存

- SDK 持久化最近一次成功清单、获取时间、清单版本、ETag 和 Last-Modified。
- 服务端支持时使用条件请求；收到 `304` 后只刷新缓存时间。
- 缓存写入必须原子化，进程在写入过程中退出不能破坏上一份可用缓存。
- SDK 升级或清单 schema 不兼容时清除不可解析缓存，并尝试重新请求。
- 可提供 `clearCache()`，但不得删除已经完成并交付给宿主的安装包。

### FR-07 错误模型

错误至少覆盖：

- `NetworkUnavailable`、`HttpError`、`Timeout`。
- `ManifestMalformed`、`UnsupportedSchema`、`DuplicateAppId`。
- `InvalidAppId`、`AppNotFound`、`ReleaseNotFound`。
- `VersionMetadataMissing`、`NoApkAvailable`、`IncompatibleDevice`。
- `ChecksumMissing`、`IntegrityCheckFailed`。
- `InsufficientStorage`、`FileSystemError`、`Cancelled`。

错误对象应包含稳定错误码、适合开发者阅读的消息和可选原始异常；不得把异常作为正常的“无更新”结果。

## 7. 建议的公开模型

```kotlin
data class AndroidAppSummary(
    val id: String,
    val applicationId: String,
    val name: String,
    val description: String?,
    val latestVersionCode: Long?,
    val latestVersionName: String?,
    val updatedAtEpochMillis: Long?,
    val preferredApk: AndroidArtifact?,
    val isStale: Boolean
)

data class AndroidAppRecord(
    val summary: AndroidAppSummary,
    val readme: String?,
    val latest: AndroidRelease,
    val versions: List<AndroidRelease>
)

data class AndroidArtifact(
    val type: AndroidArtifactType,
    val downloadUrl: String,
    val fileName: String,
    val sizeBytes: Long?,
    val sha256: String?
)
```

以上签名用于确定产品边界，最终包名和类型细节在技术设计阶段确认。公开模型不得直接暴露 JSON DTO 或网络库的可变类型。

## 8. 非功能需求

### 8.1 兼容性

- `minSdk 24`，以当前已发布 Android App 的最低版本为首期基线。
- 使用 Kotlin 编写，对 Java 提供可调用入口。
- SDK 不要求 `QUERY_ALL_PACKAGES`、存储广泛权限或安装权限。
- SDK manifest 仅合并必要的 `INTERNET` 权限声明；下载到 App 专属目录不额外申请存储权限。

### 8.2 性能与资源

- 缓存命中时列表/详情 P95 小于 100 ms。
- 正常网络下清单冷请求 P95 小于 3 秒；默认连接和读取超时均可配置。
- 清单请求并发合并，同一时间最多执行一个远端刷新。
- 解析和文件校验不得阻塞主线程。
- SDK 自身 release AAR 及新增依赖的体积影响需要在发布说明中量化。

### 8.3 安全与隐私

- 正式配置只接受 HTTPS 清单和下载地址；debug 环境允许由宿主显式放宽。
- 对清单中的相对路径进行规范化，禁止解析到清单站点之外的 `..` 路径。
- 校验 SHA-256 格式，拒绝路径穿越、空文件名和危险文件名。
- SDK 不采集设备标识、App 列表、下载历史或用户行为，不内置统计上报。
- 日志中不得记录令牌、Cookie 或带敏感查询参数的完整 URL。

### 8.4 可测试性

- 网络客户端、缓存时钟、文件系统和下载执行器可替换，支持离线单元测试。
- 清单兼容、版本比较、URL 解析、缓存降级和 SHA-256 校验必须有自动化测试。
- 核心模块行覆盖率目标不低于 80%，关键版本和完整性规则分支覆盖率 100%。

## 9. 验收标准

### AC-01 列表

给定当前正式清单，调用 `getAndroidApps()` 后只返回两条 Android 记录：`android/cn.wk.android.body.os` 与 `android/com.wk.car.manger`，且记录数和网页 Android 分类一致。

### AC-02 详情

给定 `android/com.wk.car.manger`，SDK 返回 App 描述、最新版本 `0.0.1`、`versionCode = 1` 和 APK 元数据；给定不存在的 ID 返回 `AppNotFound`。

### AC-03 更新判断

- 本地 `versionCode = 0`、远端 `versionCode = 1` 时，`updateAvailable = true`。
- 本地 `versionCode = 1` 时，`updateAvailable = false`。
- 本地 `versionCode = 2` 时，`updateAvailable = false` 且带远端版本较旧诊断。
- 清单没有 `versionCode` 时返回 `VersionMetadataMissing`，不按 `versionName` 比较。

### AC-04 下载与校验

- 下载 `android/com.wk.car.manger` 后，SDK 进入 `Verifying`，SHA-256 匹配后返回可读取的 `content://` URI。
- 人为修改安装包内容后，SDK 返回 `IntegrityCheckFailed`，临时文件被删除。
- 取消下载后最终状态为 `Cancelled`，不会返回部分文件。

### AC-05 缓存降级

有一份 24 小时内的成功缓存且网络断开时，列表和详情仍可返回，并明确标记为过期缓存；超过 `maxStale` 后返回网络错误。

### AC-06 权限

示例宿主接入 SDK 并完成列表、详情和下载后，不需要申请存储广泛权限、查询全部应用权限或安装权限。

## 10. 交付物

- Android SDK library 模块与公开 API 文档。
- schema v3 清单定义和 v2 到 v3 兼容说明。
- 更新后的 `generate_app_manifest.py`，可写入 Android 版本元数据、字节数和 SHA-256。
- SDK 单元测试、下载集成测试和清单生成器测试。
- 最小示例 App，演示列表、详情、更新检查和下载进度。
- Maven 发布说明、依赖坐标、版本策略和变更日志。

## 11. 建议迭代计划

### M1：数据契约

- 确认 schema v3。
- 改造清单生成器并补齐现有 Android 安装包元数据。
- 为正式清单增加校验测试。

### M2：查询能力

- 建立 SDK 模块、配置、网络、解析和缓存。
- 完成列表、App ID 详情、错误模型与 v2 兼容。

### M3：更新与下载

- 完成 `versionCode` 更新判断。
- 完成下载状态、取消、去重、临时文件和 SHA-256 校验。

### M4：发布准备

- 完成示例 App、Java 调用验证、性能与权限检查。
- 发布 1.0.0 并完成至少一个真实宿主 App 接入验收。

## 12. 风险与待确认项

| 项目 | 当前建议 | 风险/影响 |
| --- | --- | --- |
| “更新信息”的语义 | 定义为更新检查和新版本元数据 | 若实际需要远程编辑记录，需要增加鉴权和写 API，范围会显著扩大 |
| SDK 依赖坐标 | `io.github.wk1995:wk-app-distribution-sdk` | 发布前需确认 Maven Group 和 artifact 名称 |
| 校验和策略 | 正式环境默认强制 SHA-256 | 当前部分历史包没有校验和，需先补数据或仅允许详情展示 |
| 历史版本的 `versionCode` | 从发布元数据或 APK 解析后补齐 | 目录名不可靠，无法安全自动猜测 |
| 下载目录 | 默认 App 专属目录，宿主可选择公共 Downloads | 公共目录涉及更多系统版本差异和用户可见文件管理 |
| AAB | 可查询，不作为首选下载文件 | AAB 不能直接在普通设备上安装 |
| 强制更新 | 1.0.0 不支持 | 后续若需要，应增加 `minimumSupportedVersionCode` 和策略说明 |
