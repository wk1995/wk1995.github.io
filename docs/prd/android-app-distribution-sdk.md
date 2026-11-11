# Android App Distribution SDK PRD

| 项目 | 内容 |
| --- | --- |
| 文档状态 | Draft / 待评审 |
| PRD 版本 | 0.3 |
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

目标架构中，当前项目不再长期保存和管理各 App 的 APK，而是收敛为 App Registry：维护公开目录、版本与分发元数据，并将公开 APK 引导到对应 App 仓库的 GitHub Release Asset。Android SDK 的 AAR 发布到 Maven Central 或 GitHub Packages，不与 APK 分发混用。Private App 不进入公开清单，其元数据与下载需要由认证网关按权限返回。

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
- 公开 App 的 GitHub Release Asset 查询与下载；SDK 通过清单中的分发描述获取地址，不硬编码 GitHub URL 规则。
- 当前仓库内既有 APK 路径的迁移期兼容读取。

### 4.2 SDK 1.0.0 范围外

- 安装 APK、申请“安装未知应用”权限或静默安装。
- AAB 安装；AAB 可以作为记录返回，但下载 API 默认只选择 APK。
- iOS、HarmonyOS、Windows、macOS 等非 Android 记录。
- App 记录、README、版本或安装包的上传、创建、更新和删除。
- 用户账号、登录、权限管理、灰度发布、渠道分流和推送通知。
- Private App 的登录、授权和下载网关接入；1.0.0 仅预留分发抽象，不向客户端暴露 Private GitHub 凭据。
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
            "sha256": "df07ed04a89d7b7bb8b279be52ccc73133e52e4b9de0eff1e85fc3579c93d188",
            "distribution": {
              "provider": "github-release",
              "visibility": "public",
              "repository": "owner/repository",
              "tag": "v0.0.1",
              "asset": "app-release.apk",
              "url": "https://github.com/owner/repository/releases/download/v0.0.1/app-release.apk"
            }
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
- 公开 App 优先使用 `distribution` 描述 GitHub Release；迁移期本地相对路径仍基于清单 URL 解析。
- SDK 只使用清单返回的 URL 或统一下载端点，不自行拼接 GitHub Release 地址。
- `visibility = private` 的记录不得进入公开 manifest；Private App 只能由认证 API 在授权后返回。
- `sizeBytes` 使用整数；现有 `size` 展示字段可在兼容期保留。

### 5.4 Artifact 分发规则

- APK 使用对应 App 仓库的 GitHub Releases，不使用 GitHub Packages。
- Android SDK 的 AAR 使用 Maven Central 或 GitHub Packages，不放入 App Release Asset。
- 公开 App 可以在公开 manifest 中提供 Release 页面、公开 Asset URL 和完整性元数据。
- Private App 的仓库名、版本元数据和真实下载地址默认都视为受保护信息，不进入 GitHub Pages、公开仓库或公开 manifest。
- Private App 下载由服务端 GitHub App 凭据或私有对象存储凭据完成；GitHub PAT、installation token 和对象存储密钥不得写入 SDK、宿主 App 或网页。
- SDK 面向统一的分发模型，不将 GitHub、R2 或 S3 类型暴露为宿主必须处理的分支。

## 6. 功能需求

### FR-01 初始化

宿主应能通过配置对象初始化单例客户端：

- `manifestUrl`：必填，正式环境建议为 `https://wk1995.github.io/apps/packages/manifest.json`。
- `cacheTtl`：默认 15 分钟。
- `maxStale`：默认 24 小时。
- `requireChecksum`：正式构建默认 `true`。
- `downloadDirectory`：默认使用宿主 App 专属外部文件目录。
- `logger`：可选，SDK 默认不输出包含完整 URL 查询参数的日志。

1.0.0 的 `manifestUrl` 只用于公开 App。后续 Private App 接入时新增认证 Registry 配置，不复用公开 manifest URL 传递凭据。

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
- `AuthenticationRequired`、`AccessDenied`、`DownloadGrantExpired`；1.0.0 可以定义稳定错误码，但不会主动完成 Private App 登录。
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
- SDK、网页和公开 manifest 中不得包含访问 Private GitHub Repo 的 PAT、GitHub App token 或其他长期凭据。
- Private App 的短期下载授权应限定 App、版本、用户或设备、有效期和单次使用策略；过期后必须重新授权。

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

### AC-07 Artifact 来源抽象

- 公开 App 从 GitHub Release Asset 下载时，宿主不需要了解 GitHub Release URL 拼接规则。
- 将测试清单中的下载 provider 替换为兼容的统一下载端点后，宿主调用代码无需修改。
- 公开 manifest 中不存在 Private App 记录、Private Repo 地址或访问令牌。

## 10. 交付物

- Android SDK library 模块与公开 API 文档。
- schema v3 清单定义和 v2 到 v3 兼容说明。
- 更新后的 `generate_app_manifest.py`，可写入 Android 版本元数据、字节数和 SHA-256。
- SDK 单元测试、下载集成测试和清单生成器测试。
- 最小示例 App，演示列表、详情、更新检查和下载进度。
- Maven 发布说明、依赖坐标、版本策略和变更日志。
- 既有仓库内 APK 向各 App GitHub Releases 迁移的清单和回滚方案。
- Private App 认证下载网关的后续技术方案；若 Private App 纳入 1.0.0，则必须在开发前补充为正式范围。

## 11. 建议迭代计划

### M1：数据契约

- 确认 schema v3。
- 增加公开 GitHub Release 与未来认证下载端点的分发抽象。
- 改造清单生成器并补齐现有 Android 安装包元数据。
- 明确既有 APK 的 Release 迁移映射。
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
| SDK 仓库边界 | SDK 独立仓库优先，当前仓库继续提供 App Registry | 若保留在当前静态站点仓库，需要隔离 Gradle 工程、CI 和发布版本 |
| 后台下载保证 | 1.0.0 默认保证进程内下载 | 若要求退出宿主后继续下载，需要引入 WorkManager 并定义通知策略 |
| APK 存储位置 | 公开 APK 迁移至对应 App 仓库的 GitHub Releases | 迁移前需要验证历史版本、Release Tag、Asset URL 和 SHA-256 映射 |
| GitHub Packages 用途 | 仅用于 SDK/AAR 等依赖制品 | GitHub Packages 不适合作为普通用户的 APK 下载入口 |
| Private App | 使用认证下载网关或私有对象存储签名 URL | 静态 GitHub Pages 无法执行鉴权，Private Repo Token 不能下发到客户端 |
| Private App 版本范围 | 默认不纳入 SDK 1.0.0 | 若首版必须支持，需要新增身份、权限、审计、网关可用性和运维要求 |

## 13. 当前项目差距与优化要求

本节记录截至 2026-09-02 的仓库现状，并将 SDK 上线前需要完成的项目优化按优先级拆分。P0 未完成前，SDK 可以开发列表和详情能力，但不能对外承诺可靠的更新判断与安装包完整性校验。

### 13.1 当前差距

| 领域 | 当前状态 | 对 SDK 的影响 |
| --- | --- | --- |
| 清单版本 | `generate_app_manifest.py` 固定输出 schema v2 | 缺少更新检查和完整性校验所需字段 |
| Android 版本元数据 | 正式清单没有独立的 `applicationId`、`versionCode`、`versionName` 和 `minSdk` | 只能展示目录版本字符串，不能安全比较更新或判断设备兼容性 |
| 文件元数据 | 正式清单只有展示字符串 `size`，没有 `sizeBytes` 和 `sha256` | 无法准确计算进度，也无法在下载完成后验证文件 |
| 发布元数据读取 | CarManger 已有 `release-artifact.properties` 和 `release-artifact.sha256`，生成器尚未读取 | 已存在的数据没有进入正式清单 |
| 历史包完整性 | 当前 7 个 Android APK 中，只有 CarManger 的 1 个版本同时具备 properties 和 SHA-256 | BodyOS 历史版本无法满足正式环境强制校验策略 |
| 目录结构 | BodyOS 同时存在包根目录 APK 和多个版本目录 APK；生成器在存在版本目录时忽略根目录发布 | 历史版本可能未进入清单，目录语义不一致 |
| App 展示信息 | 名称主要从目录名自动转换，例如包名可能被展示为标题化文本 | App 名称、包名和 applicationId 容易混淆，应改为显式元数据 |
| 清单测试 | 缺少针对生成器和正式清单的专用自动化测试 | 重复 ID、版本倒退、错误哈希或路径问题可能进入线上 |
| 发布工作流 | `update-app-manifest.yml` 仅支持手动触发，并在 `page` 分支生成后部署 | APK 发布和清单更新可能不同步，缺少发布前阻断校验 |
| Artifact 存储 | APK 直接提交在当前站点仓库 | App 版本生命周期与站点部署耦合，仓库体积会持续增长，也无法处理 Private App 授权 |
| SDK 工程 | 当前仓库以 GitHub Pages 和 App Registry 为目标，没有 Android SDK Gradle 工程 | 需要先确定仓库边界、模块结构、发布坐标和 CI |

### 13.2 P0：SDK 开工前的数据与发布基础

#### OPT-P0-01 升级清单到 schema v3

- 按 5.3 节为 Android App 和每条发布记录补充必需字段。
- 保留 schema v2 的 SDK 读取兼容，但新生成的正式清单统一输出 schema v3。
- `versionCode` 是版本排序和更新判断的唯一依据；禁止根据目录名或 `versionName` 推断。
- 现有 `version`、`size` 字段可在网页兼容期保留，待网页完成 v3 切换后再评估移除。

完成定义：正式清单中的每个可更新 Android App 均具有 `applicationId`，每个可下载 APK 均具有 `versionCode`、`versionName`、`sizeBytes` 和合法 SHA-256。

#### OPT-P0-02 改造清单生成器

- 以 Registry App 配置和公开 GitHub Release 元数据作为目标输入源，本地包目录仅作为迁移期输入。
- 从 `release-artifact.properties` 读取 `VERSION_CODE`、`VERSION_NAME`，并扩展读取 `APPLICATION_ID`、`MIN_SDK` 等字段。
- 从 `release-artifact.sha256` 读取每个安装包的校验和。
- 同步 GitHub Release 时记录 repository、Release ID、Tag、Asset ID、Asset URL 和发布时间，并处理分页、限流与短暂失败。
- 在 Android build tools 可用时，从 APK 反查 applicationId、versionCode、versionName 和 minSdk，与声明数据交叉校验。
- 直接使用文件字节数写入 `sizeBytes`，同时保留人类可读的 `size`。
- 校验 SHA-256 文件名与实际 APK 对应关系，不接受模糊匹配。
- 发布元数据缺失、APK 元数据不一致或校验和不匹配时，以非零退出码终止正式生成。
- 检测重复 App ID、重复 versionCode、版本倒退、空文件名和非法相对路径。

完成定义：生成器对同一输入结果可复现；修改 APK 内容、版本属性或 SHA-256 任一项后，校验测试能够稳定失败。

#### OPT-P0-03 迁移 APK 并统一发布元数据

- 为每个公开 App 确认对应的公开 GitHub 仓库，并用 GitHub Release 管理正式 APK。
- 将当前仓库内的历史 APK 迁移为对应版本的 Release Asset；迁移完成前保留旧地址，避免现有链接立即失效。
- 为 BodyOS 包根目录中的无版本目录 APK 确认真实版本后迁移，避免它继续被生成器忽略。
- 每个 Release 至少具有唯一 Tag、APK Asset、versionCode、versionName、applicationId、minSdk、SHA-256 和 Release Notes。
- 为现有 BodyOS 历史 APK 补齐真实元数据；无法可靠取得 versionCode 的历史包不得猜测，应标记为 `updateCheckSupported: false`，只允许详情展示，或不迁入正式更新清单。
- App 名称、描述等产品信息使用 Registry 显式元数据，不再只根据目录名自动标题化。
- 迁移期间本地包目录和 GitHub Release 不得被同时识别为两个版本；应通过稳定 release ID 去重。

完成定义：每个公开可下载 APK 都能映射到唯一 App ID、versionCode、GitHub Release 和 SHA-256；当前仓库不再是新增 APK 的主存储位置。

#### OPT-P0-04 增加清单验证器和测试

至少覆盖以下自动化测试：

- schema v2 兼容解析和 schema v3 完整解析。
- App ID 唯一，且 Android ID 满足 `android/{applicationId}`。
- 同一 App 的 versionCode 唯一并严格递增，latest 指向最大 versionCode。
- 本地迁移包或远端 Release Asset 存在，sizeBytes、SHA-256 与实际文件一致。
- APK 内 applicationId、versionCode、versionName、minSdk 与清单一致。
- 非法 schema、重复 ID、重复版本、路径穿越和危险文件名被拒绝。
- 当前网页与 SDK 对同一份清单得到一致的 Android App 集合。
- 正式清单至少满足第 9 节的固定验收样例。

完成定义：PR 和正式部署都会运行验证；任一关键校验失败时不能生成或发布清单。

#### OPT-P0-05 自动化 APK 到清单的发布链路

流水线顺序固定为：

```text
对应 App 仓库构建 APK
  → 校验 APK、签名、版本属性和 SHA-256
  → 创建不可覆盖的 GitHub Release 和 Asset
  → 通知或触发 App Registry 同步 Release 元数据
  → 生成 schema v3 公开清单
  → 运行生成器与正式清单测试
  → 提交或发布 page 内容
  → 部署 GitHub Pages
```

- 公开 App Release 发布成功后自动触发 Registry 同步，保留手动触发作为恢复手段。
- PR 阶段执行只读生成和差异检查，防止已提交清单与目录内容不一致。
- 正式 Release Tag 和 Asset 不可被同版本后续构建静默覆盖；冲突时发布失败。
- 生成和验证成功前不得部署 Pages。
- 清单发布应记录来源仓库、来源提交、Release ID 和生成时间，便于问题追踪。

完成定义：一次合规 GitHub Release 无需人工复制 APK 或编辑 manifest，并能自动更新线上列表；任一步失败时线上仍保留上一份有效清单。

### 13.3 P1：SDK 工程与运行能力

#### OPT-P1-01 确定仓库边界和发布坐标

- 推荐新建独立 SDK 仓库，当前仓库继续作为公开 App Registry 和网页入口。
- 推荐 Maven 坐标为 `io.github.wk1995:wk-app-distribution-sdk`，发布前确认 group、artifact 和所有权验证方式。
- 若 SDK 保留在当前仓库，应放入独立 Gradle 工程目录，并使用独立构建、测试和发布工作流，避免与 Pages 部署耦合。

完成定义：SDK 的源码位置、维护者、Maven 仓库、坐标和版本策略均有明确结论。

#### OPT-P1-02 建立最小分层

建议结构：

```text
sdk/
  api/          稳定公开接口、模型和错误码
  manifest/     schema v2/v3 DTO、解析、校验和 URL 解析
  cache/        内存缓存、磁盘缓存和条件请求元数据
  download/     下载任务、进度、取消、文件校验和 URI 交付
sample/         列表、详情、更新检查和下载示例
```

- 公开 API 不直接暴露 JSON DTO、OkHttp、Retrofit、WorkManager 等实现类型。
- 网络、缓存时钟、文件系统和下载执行器均可替换，便于离线测试。
- 控制依赖数量，并在每个 SDK 版本说明 AAR 与传递依赖的体积影响。

#### OPT-P1-03 完成网络与缓存基础

- 实现 15 分钟默认 TTL、24 小时默认 maxStale 和强制刷新。
- 支持 ETag、Last-Modified 与 304；服务端不支持时正常退化为完整请求。
- 合并同一进程内的并发清单刷新，最多保留一个网络请求。
- 缓存采用临时文件加原子替换，写入失败时保留上一份有效缓存。
- 记录 schema、清单版本、获取时间和数据是否来自过期缓存。

#### OPT-P1-04 完成安全下载链路

- 同一 URL、目标文件和 SHA-256 的下载任务去重。
- 提供进度 Flow、取消、可重试错误和清晰的最终状态。
- 下载到临时文件，校验 SHA-256 成功后原子移动。
- 校验失败、取消或不可恢复错误时删除临时文件。
- 区分网络、HTTP、空间不足、文件系统、缺少校验和与校验失败错误。
- 对外只交付 `content://` URI；SDK 不触发安装 Intent。
- 1.0.0 默认保证进程内下载；若确认需要退出宿主后继续下载，再以 WorkManager 实现持久任务和通知策略。

### 13.4 P2：发布质量与长期演进

#### OPT-P2-01 建立 SDK 发布工程

- 构建 release AAR、sources 和文档 artifact。
- 建立 Maven Central 或选定 Maven 仓库的自动发布流程。
- 使用语义化版本，并提供 CHANGELOG、迁移说明和依赖坐标。
- 增加 Kotlin API、Java 调用、二进制兼容和示例 App 冒烟测试。
- 每次发布记录最低 Android 版本、依赖体积和公开 API 变化。

#### OPT-P2-02 预留后续清单能力

1.0.0 不实现，但 schema 演进时应避免阻断以下能力：

- `minimumSupportedVersionCode` 强制更新策略。
- 渠道、ABI 和设备架构匹配。
- APK 签名证书摘要。
- 灰度比例和发布阶段。
- 废弃或撤回版本标记。
- 主下载地址与镜像地址。

### 13.5 推荐执行顺序

```text
schema v3 定稿
  → Registry 生成器与分发模型改造
  → 历史 APK 元数据补齐并迁移到 GitHub Releases
  → 清单验证与发布自动化
  → SDK 查询和缓存
  → 更新判断和安全下载
  → 示例 App、Maven 发布和真实宿主验收
```

不得以 SDK 内的字符串猜测或降级逻辑替代 P0 数据治理。P0 完成后再对外承诺更新检查和强制校验，可显著降低错误升级、下载损坏和历史数据不可追溯的风险。

## 14. App Registry 与 Private App 分发架构

### 14.1 项目职责边界

| 组件 | 职责 | 不负责 |
| --- | --- | --- |
| 当前项目 `wk1995.github.io` | 公开 App Registry、schema、Release 元数据同步、列表与详情页面、公开下载入口 | 长期保存新增 APK、管理 App 源码、保存 Private 凭据 |
| 各 App 仓库 | App 源码、构建、签名、Tag、GitHub Release、APK 和 Release Notes | SDK 公共 API、跨 App 目录 |
| Android SDK 仓库 | Kotlin/Java API、清单解析、缓存、更新判断、下载和 Maven 发布 | App APK、Registry 内容管理、服务端 GitHub Token |
| Private 下载网关 | 身份认证、权限判断、短期下载授权、Private GitHub Release 或对象存储访问、审计 | 在客户端保存长期凭据 |

目标关系：

```text
公开 App 仓库 ──GitHub Release──┐
                                ├── App Registry ── SDK ── 宿主 App
Private App 仓库 ──认证下载网关──┘
```

### 14.2 公开 App

- 对应 App 仓库必须为公开仓库，正式 APK 作为 GitHub Release Asset 发布。
- Registry 保存 App ID、仓库、Release ID、Tag、版本、Asset、SHA-256 和公开下载 URL。
- 网页可以跳转 Release 页面或直接下载公开 Asset。
- SDK 读取 Registry 返回的下载描述，不使用 GitHub API Token，也不自行推导 Release URL。
- App 仓库删除、撤回或替换 Release 时，Registry 同步任务必须检测并显式标记版本状态，不能继续返回失效链接。

### 14.3 Private App

Private App 不能通过公开静态 manifest 安全分发，原因包括：

- Private GitHub Release Asset 需要经过身份认证。
- 将 GitHub PAT 或 installation token 写入 SDK、宿主 APK 或网页会导致凭据泄露。
- 即使只公开 Private Repo 地址、App 名称和版本，也可能泄露项目存在性与研发信息。

因此 Private App 使用以下流程：

```text
宿主 App 请求 App/版本
  → 认证网关验证用户或设备身份
  → 校验该身份对 App 和版本的访问权限
  → 网关使用服务端 GitHub App token 获取 Private Release
  → 网关代理下载，或生成对象存储短期签名 URL
  → SDK 下载并校验 SHA-256
```

要求：

- 优先使用 GitHub App installation token，不使用个人长期 PAT 作为生产凭据。
- 如果 APK 体积或流量使 GitHub 代理成本过高，使用 Cloudflare R2、S3 等私有对象存储和短期签名 URL。
- 下载授权必须短期有效，且至少绑定 App ID、versionCode 和授权主体。
- 网关只返回当前主体有权看到的 App；未授权 App 不得出现在公开清单或以 `403` 泄露其存在性，可按安全策略统一返回 `404`。
- 网关日志不得记录完整 token 或签名 URL，并应保留必要的授权结果、App、版本和请求时间审计信息。
- Private App 的缓存必须按授权主体隔离；退出登录或权限撤销后清除对应元数据与未交付的临时文件。

### 14.4 统一 Registry API

目标 API 对存储 provider 保持抽象：

```text
GET  /v1/apps
GET  /v1/apps/{appId}
GET  /v1/apps/{appId}/update?currentVersionCode={code}
POST /v1/apps/{appId}/releases/{versionCode}/download
```

- 公开 App 可以继续通过静态 manifest 提供列表和详情；下载描述可以直接返回公开 GitHub Release URL，也可以返回统一下载端点进行重定向。
- Private App 的四类请求都需要认证；下载接口在授权后返回短期 URL 或代理内容。
- SDK 的公开模型只表达 App、Release、Artifact 和 DownloadGrant，不要求宿主处理 GitHub、R2、S3 等 provider。
- 下载响应至少包含 URL 或 content、过期时间、sizeBytes 和 SHA-256。
- 1.0.0 继续使用公开 `manifestUrl`；引入 Private App 时以 Registry API 替换或扩展数据源，并保持现有 SDK 方法签名兼容。

### 14.5 GitHub Packages 的使用边界

- GitHub Packages 或 Maven Central 用于发布 `wk-app-distribution-sdk` AAR、sources 和文档 artifact。
- APK 不以 Maven dependency 的形式提供给普通用户，也不使用 GitHub Packages 代替 App Release 页面。
- GitHub Actions Artifacts 仅用于 CI 测试和临时验证，不能作为正式 APK 分发来源，因为其保留时间和访问方式不满足正式发布要求。

### 14.6 迁移策略

1. 为当前每个 App 确认源码仓库、公开性和目标 Release 仓库。
2. 为现有 APK 补齐真实版本元数据和 SHA-256。
3. 在对应 App 仓库创建历史 Release 并上传 Asset，记录旧路径到 Release Asset 的映射。
4. schema v3 同时输出旧本地地址和新 `distribution`，SDK 优先选择 GitHub Release。
5. 观察期内验证下载量、错误率、链接稳定性和回滚能力。
6. 确认无旧客户端依赖后，停止向当前仓库提交新增 APK；旧地址保留到约定的兼容截止日期。
7. Private App 不执行公开迁移，另行接入认证网关或私有对象存储。

完成定义：公开 App 的新增版本只需在对应仓库发布 GitHub Release 即可进入 Registry；Private App 的任何长期凭据和真实下载地址都不会进入公开仓库或客户端。
