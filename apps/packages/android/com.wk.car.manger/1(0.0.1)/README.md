# CarManger

CarManger 是一款本地优先的 Android 车辆管理应用，用于维护车辆资料，归档车辆 App 截图与支付凭证，并记录里程、行程、加油和用车消费。

> 应用 ID 与包名为 `com.wk.car.manger`。其中 `manger` 是既有兼容性命名；除非有明确的应用 ID 迁移方案，请勿直接修改。

## 已实现的功能

- 新增和更新车辆资料，包括名称、车牌、车型、购车日期、油箱容量、初始里程，以及选填且非空时唯一的 VIN。
- 维护多辆车辆，并在首页切换当前车辆。
- 新增、查看和编辑加油、单次行程及用车消费记录。
- 通过 ML Kit OCR 导入车辆状态、单次行程、加油凭证和消费凭证。
- 保存独立的 OCR 原始记录、图片、图片创建时间、识别字段、来源和关联业务数据，便于追溯。
- 管理 OCR 来源列表；支持自动推断、列表选择和手动维护来源。
- 查看、更新和删除 OCR 详情；图片支持单击全屏预览，返回后保留尚未保存的表单修改。
- 检测重复图片，覆盖前进行二次确认；删除数据同样需要二次确认。
- 同一条车辆 App 数据可使用两张截图，并校验两张图片的创建时间是否相近。
- 根据里程不变、油量或预计续航增加的相邻车辆状态，辅助判断是否发生加油。
- 记录有顺序的支付链，例如“高德地图 → 支付宝 → 余额”或“滴滴出行 → 微信 → 银行卡”。

## 首页指标语义

首页数据仅统计已关联到当前车辆的记录，购车日期不会过滤已经导入的数据。

| 指标 | 含义 |
| --- | --- |
| 累计总里程 | 最新一条有效车辆里程快照中的总里程，不进行求和 |
| 已记录行程合计 | 所有单次行程里程的总和 |
| 车辆 App 平均油耗 | 最新一条包含平均油耗的车辆 App 快照原始值，不对历史值再次求平均 |
| 最新油耗 | 按采集时间选择的最新车辆状态或单次行程油耗 |
| 每公里耗费 | 已记录费用相对于已记录行程合计的计算结果 |

“最近一次行驶时间”暂不展示；在后续引入可信的行程开始、结束时间模型后再实现。

## OCR 数据规则

- OCR 导入记录与里程、行程、加油、消费等业务表分开保存，通过 `source_import_id` 关联。
- 数据采集时间优先使用可编辑的识别时间或图片创建时间，不以点击保存的时间冒充行程时间。
- OCR 详情更新会在事务中重建关联业务记录，确保修改后的字段真正参与首页和统计。
- 覆盖重复数据前必须确认；删除 OCR 或其他业务数据前必须确认。
- 两张车辆 App 截图应属于同一次采集，时间差过大时需要用户检查。
- 来源名称由用户维护，不能写死为仅支持支付宝、微信或某几个应用。

## 技术栈

- Kotlin、Android XML Views、AppCompat、Material Components 3、ConstraintLayout
- Lifecycle ViewModel、Kotlin Coroutines Flow
- Room + KSP，用于本地持久化
- ML Kit 中文文本识别，用于 OCR 导入
- MPAndroidChart，用于统计图表
- Core library desugaring，用于 Java 时间 API 兼容

## 工程结构

```text
app/                              Application、启动入口、顶层导航与最终组装
core/
  database/                       Room 实体、DAO、迁移和数据库实现
  ui/                             Android UI 基类、主题和通用资源
feature/
  dashboard/ui-views/             首页与统计的 XML Views 实现
  vehicle/ui-views/               车辆档案的 XML Views 实现
  records/{api,domain,data,ui-views}/
                                    行程、里程、加油、消费和支付
  ocr/{api,domain,data,ui-views}/   OCR 导入、解析、存储和页面
  settings/{domain,data,ui-views}/ AI 配置、持久化与设置页
  support/ui-views/               崩溃日志和想法记录
```

模块清单以 [`settings.gradle.kts`](settings.gradle.kts) 为准。各层职责如下：

| 层 | 职责 | 依赖约束 |
| --- | --- | --- |
| `api` | 跨业务导航等稳定契约 | 不依赖具体 UI 实现 |
| `domain` | 业务模型、解析、校验和纯计算 | 纯 Kotlin，不依赖 Android、Room、ML Kit 或资源 ID |
| `data` | Repository、Room/ML Kit/本地存储适配 | 可依赖 `domain` 和基础设施，不依赖 UI |
| `ui-views` | Activity、ViewModel、Adapter 与 XML 资源 | 可替换的 Android UI 实现 |

整体依赖从外向内：`:app → ui/data → domain`。跨业务跳转使用目标业务的 `api` 契约，禁止 feature 的 `ui-views` 直接依赖另一个 feature 的 `ui-views`。并非每个业务都要机械创建四层；只有存在真实业务规则、数据实现或跨模块契约时才增加对应模块。

当前先建立物理编译边界，部分旧 ViewModel 仍直接使用 Room 类型，后续修改相关业务时再逐步收敛到 Repository。完整依赖规则和演进方式见 [模块化架构](doc/tech/modular-architecture.md)。

### Compose 与 KMP 演进

- Compose：为单个业务新增同级 `ui-compose`，复用其 `api/domain/data`，在 `:app` 切换装配；无需一次性重写全部页面。
- KMP：优先把无 Android 依赖的 `domain` 转为 shared source set，再为 Android 数据实现提供接口适配。
- Android 专属能力：Activity、XML、Room、ML Kit 和 Intent 契约继续留在 Android 模块或 source set，不进入共享业务代码。

## 环境要求

- JDK 17
- Android SDK Platform 36
- Android Studio（使用与 Android Gradle Plugin 8.11.2 兼容的版本）

当前配置：`minSdk 24`、`targetSdk 36`、`compileSdk 36`。

## 构建与测试

在仓库根目录执行：

```bash
./gradlew testDebugUnitTest assembleDebug
```

根任务会聚合各模块的 JVM 单元测试；新增测试应放在代码所属模块的 `src/test`，而不是统一放回 `:app`。

连接已启用调试的设备或模拟器后，可运行设备端测试：

```bash
./gradlew connectedDebugAndroidTest
```

Windows 环境可将 `./gradlew` 替换为 `gradlew.bat`。

## 本地数据与迁移

- Room 数据库名为 `car_db`，当前 schema version 为 1。
- 当前完整实体结构是新的 version 1 基线，不再注册历史迁移链。
- 已存在的 version 2 至 16 数据库无法降级到该基线；安装本版本前需先备份所需数据并清除旧应用数据或重新安装。
- 合入 `main` 的 PR 会校验 Room 版本：只能与 `main` 相同或恰好增加 1，版本回退或一次增加 2 及以上都会失败。
- 当前 `exportSchema = false`。后续修改实体或表结构时，仍必须提升版本并提供显式 Migration。

应用不依赖后端或账户体系，用户数据保存在设备本地。更详细的 OCR 设计资料见 [OCR PRD](doc/tech/ocr-prd.md) 与 [OCR 技术设计](doc/tech/ocr-technical-design.md)。

面向协作者的完整执行边界与数据不变量见 [AGENTS.md](AGENTS.md)。
