# 股票实时反弹信号监听方案

## 1. 目标

构建一个实时监听单只或多只股票的信号系统，用于判断股票是否从下跌或回调状态进入反弹阶段。

系统不直接输出绝对买卖建议，而是输出可解释的信号状态：

- `NO_SIGNAL`：无有效反弹信号
- `WATCH`：进入观察区，可能止跌
- `REBOUND_WARNING`：反弹预警，买盘开始回流
- `REBOUND_CONFIRMED`：反弹确认，结构和量价均已确认
- `INVALIDATED`：信号失效，跌破关键位置

核心原则：

- 不猜最低点，只捕获止跌后的确认信号
- 不依赖单个指标，使用价格结构、成交量、动量、市场环境综合判断
- 每个信号都必须给出触发原因、关键价位、失效价位和风险收益比

## 2. 整体架构

```text
行情数据源
  -> 实时行情接入
  -> K线聚合器
  -> 指标计算器
  -> 价格结构识别
  -> 反弹状态机
  -> 信号打分器
  -> 风控过滤器
  -> 告警推送 / 前端面板 / 日志存储
```

模块职责：

- 行情数据源：接入 tick、quote、trade 或分钟 K 线数据
- K线聚合器：将实时行情聚合为 `1m`、`5m`、`15m` K线
- 指标计算器：计算 EMA、VWAP、RSI、ATR、成交量均线等指标
- 价格结构识别：识别前低、反抽高点、回踩低点、突破点
- 反弹状态机：维护当前股票所处阶段
- 信号打分器：对反弹质量进行量化评分
- 风控过滤器：过滤风险收益比不合格、波动异常或市场环境过差的信号
- 告警推送：输出结构化信号，支持日志、消息、页面或 Webhook

## 3. 数据源选择

不同市场的数据源选择不同。

美股可以优先考虑：

- Alpaca Market Data
- Polygon / Massive
- Finnhub
- Interactive Brokers

A股可以优先考虑：

- 券商行情接口
- 付费实时行情源
- Tushare
- AKShare

说明：

- 实盘级实时监听应优先使用稳定、低延迟、有授权的数据源
- Tushare、AKShare 更适合研究、低频轮询、历史回测或原型验证
- 如果后续要做自动交易，行情源和交易通道必须统一考虑延迟、权限和合规问题

## 4. 核心判断逻辑

反弹信号分 5 层判断。

### 4.1 下跌背景确认

只有股票先处于下跌、回调或杀跌状态时，才需要判断反弹。

示例条件：

```text
最近 N 根K线处于 lower low / lower high
当前价格低于 EMA20
当前价格低于 VWAP
当日跌幅大于 1%
从日内高点回落幅度大于 1.5 * ATR
```

如果没有下跌背景，系统不进入反弹识别流程。

### 4.2 卖压衰竭

卖压衰竭用于判断是否已经“跌不动”。

示例条件：

```text
价格创新低，但 RSI 没有创新低
最近 3-5 根K线不再连续放量下跌
出现长下影线
成交量放大，但价格没有继续有效下破
下跌K线实体变短
```

卖压衰竭只代表风险释放，不代表反弹已经成立。

### 4.3 结构止跌

结构止跌是反弹判断里最重要的一层。

理想结构：

```text
L0 = 第一次低点
H1 = 第一次反抽高点
L1 = 第二次回踩低点

如果 L1 > L0，说明低点抬高
如果价格继续突破 H1，说明反弹结构增强
```

判断规则：

```text
出现 L1 > L0：进入 WATCH 或 REBOUND_WARNING
突破 H1：进入 REBOUND_CONFIRMED 的候选状态
跌破 L0：信号失效
```

### 4.4 买盘确认

买盘确认用于判断是否有资金重新进场。

示例条件：

```text
价格重新站上 EMA9
价格重新站上 EMA20
价格重新站上 VWAP
突破最近 10-20 根K线高点
上涨K线成交量大于最近20根均量 * 1.2
突破K线成交量大于最近20根均量 * 1.5
```

如果只有价格上涨但成交量没有配合，信号降级。

### 4.5 大盘和板块过滤

个股反弹最好不要逆着大盘和板块硬做。

过滤条件：

```text
指数没有继续破位
所属板块同步反弹
同板块龙头没有继续杀跌
市场上涨家数改善
高 beta 股票不再集体下跌
```

如果大盘或板块仍处于快速下跌状态，个股信号需要降级。

## 5. 状态机设计

```text
NORMAL
  -> PULLBACK
  -> SELLING_EXHAUSTION
  -> WATCH
  -> REBOUND_WARNING
  -> REBOUND_CONFIRMED
  -> INVALIDATED
```

状态说明：

- `NORMAL`：正常波动，没有明显下跌背景
- `PULLBACK`：进入回调或下跌
- `SELLING_EXHAUSTION`：卖压可能衰竭
- `WATCH`：出现初步止跌迹象
- `REBOUND_WARNING`：出现更高低点、站上短期均线或买盘回流
- `REBOUND_CONFIRMED`：突破关键反抽高点，且量价配合
- `INVALIDATED`：跌破前低或关键失效位

状态转换示例：

```text
NORMAL -> PULLBACK:
  价格低于 EMA20，且最近一段时间处于下跌结构

PULLBACK -> SELLING_EXHAUSTION:
  出现 RSI 背离、长下影线或放量不破低

SELLING_EXHAUSTION -> WATCH:
  不再创新低，且短期价格企稳

WATCH -> REBOUND_WARNING:
  出现 L1 > L0，或价格站上 EMA9

REBOUND_WARNING -> REBOUND_CONFIRMED:
  价格突破 H1，且成交量放大

任意状态 -> INVALIDATED:
  跌破 L0 或跌破预设止损位
```

## 6. 信号打分模型

使用 100 分制，避免单个指标误判。

```text
下跌背景确认：10分
卖压衰竭：20分
结构止跌：25分
突破确认：20分
量能配合：15分
市场环境：10分
```

信号等级：

```text
score < 50:
  NO_SIGNAL

50 <= score < 65:
  WATCH

65 <= score < 80:
  REBOUND_WARNING

score >= 80:
  REBOUND_CONFIRMED
```

风险收益比过滤：

```text
如果 reward / risk < 2:
  不输出 REBOUND_CONFIRMED
  最多输出 WATCH 或 REBOUND_WARNING
```

## 7. MVP 规则版本

第一版可以先实现一个简单但可解释的规则系统。

### 7.1 反弹预警

满足以下条件中的大部分时，输出 `REBOUND_WARNING`：

```text
最近30分钟跌幅大于 1.5 * ATR
最近10根1分钟K线没有继续创新低
RSI 从小于 30 回升到大于 35
当前价格站上 EMA9
最近一根阳线成交量大于20根均量 * 1.2
出现 L1 > L0 的更高低点
```

### 7.2 反弹确认

满足以下条件时，输出 `REBOUND_CONFIRMED`：

```text
出现 L1 > L0
价格突破 H1
价格站上 VWAP 或 EMA20
突破时成交量大于20根均量 * 1.5
止损位到目标位的风险收益比大于等于 1:2
大盘或板块没有继续破位
```

### 7.3 信号失效

满足以下任一条件时，输出 `INVALIDATED`：

```text
价格跌破 L0
价格跌破信号触发K线低点
价格重新跌破 VWAP 且无法收回
反弹后成交量持续萎缩，价格无法突破 H1
大盘或板块突然加速下跌
```

## 8. 实时监听流程

```text
1. 订阅目标股票实时行情
2. 将 tick 或 quote 聚合为 1m K线
3. 每根 1m K线收盘后计算指标
4. 每 5 根 1m K线聚合为 5m K线
5. 使用 1m 判断短线触发
6. 使用 5m 判断信号质量
7. 更新状态机
8. 计算信号分数
9. 通过风控过滤器
10. 输出提醒和日志
```

建议最小周期：

- `1m`：用于实时触发
- `5m`：用于过滤噪声
- `15m`：用于判断更大级别压力位和趋势

## 9. 告警内容格式

告警必须可解释，不能只输出一个“反弹”。

示例：

```json
{
  "symbol": "AAPL",
  "status": "REBOUND_WARNING",
  "score": 72,
  "timeframe": "1m + 5m",
  "price": 198.12,
  "trigger_reasons": [
    "RSI 从超卖区回升",
    "出现更高低点 L1 > L0",
    "价格重新站上 EMA9",
    "阳线成交量大于20根均量的1.2倍"
  ],
  "key_levels": {
    "breakout": 198.40,
    "invalid_below": 196.80,
    "target": 201.60
  },
  "risk_reward_ratio": 2.3
}
```

## 10. 数据结构建议

K线结构：

```json
{
  "symbol": "AAPL",
  "timeframe": "1m",
  "timestamp": "2026-06-25T09:31:00+08:00",
  "open": 197.2,
  "high": 198.3,
  "low": 196.8,
  "close": 198.1,
  "volume": 126000
}
```

信号结构：

```json
{
  "symbol": "AAPL",
  "state": "REBOUND_CONFIRMED",
  "score": 84,
  "entry_reference": 198.45,
  "stop_loss": 196.8,
  "target": 201.75,
  "risk_reward_ratio": 2.0,
  "created_at": "2026-06-25T09:45:00+08:00"
}
```

## 11. 伪代码

```python
def detect_rebound(symbol, bars_1m, bars_5m, market_context):
    score = 0
    reasons = []

    if is_downtrend(bars_5m):
        score += 10
        reasons.append("存在下跌背景")

    if has_selling_exhaustion(bars_1m):
        score += 20
        reasons.append("卖压衰竭")

    if has_higher_low_structure(bars_1m):
        score += 25
        reasons.append("出现更高低点")

    if breaks_recent_swing_high(bars_1m):
        score += 20
        reasons.append("突破反抽高点")

    if volume_confirms(bars_1m):
        score += 15
        reasons.append("量能配合")

    if market_context_is_ok(market_context):
        score += 10
        reasons.append("市场环境允许")

    risk_plan = calculate_risk_plan(bars_1m)
    if risk_plan.risk_reward_ratio < 2:
        score = min(score, 64)
        reasons.append("风险收益比不足，信号降级")

    if score >= 80:
        state = "REBOUND_CONFIRMED"
    elif score >= 65:
        state = "REBOUND_WARNING"
    elif score >= 50:
        state = "WATCH"
    else:
        state = "NO_SIGNAL"

    return {
        "symbol": symbol,
        "state": state,
        "score": score,
        "reasons": reasons,
        "risk_plan": risk_plan,
    }
```

## 12. 回测和验证

上线前必须做历史回放测试。

建议验证指标：

- 信号触发次数
- 触发后 5 分钟、15 分钟、30 分钟最大涨幅
- 触发后最大回撤
- 信号成功率
- 平均盈亏比
- 假信号比例
- 不同行情环境下的表现

回测场景：

- 单边下跌日
- V 型反转日
- 震荡日
- 高开低走日
- 低开高走日
- 大盘杀跌但个股抗跌
- 板块共振反弹

## 13. 落地步骤

第一阶段：原型验证

- 接入单只股票行情
- 聚合 1m 和 5m K线
- 实现 EMA、VWAP、RSI、ATR、成交量均线
- 实现 `WATCH`、`REBOUND_WARNING`、`REBOUND_CONFIRMED`
- 输出控制台日志或 JSON 文件

第二阶段：可视化和告警

- 增加前端面板
- 展示当前状态、分数、触发原因、关键价位
- 增加 Webhook、飞书、邮件或桌面通知
- 支持多股票监听

第三阶段：回测和参数优化

- 接入历史分钟数据
- 做历史回放
- 统计不同参数下的成功率和回撤
- 针对不同市场、行业、波动率分层优化参数

第四阶段：交易联动

- 增加模拟交易
- 增加仓位管理
- 增加最大亏损限制
- 增加人工确认机制
- 谨慎评估是否接入真实交易

## 14. 风险和限制

- 反弹信号不等于趋势反转
- 短周期信号噪声很大，必须使用更大周期过滤
- 数据源延迟会直接影响实时信号质量
- 成交量在不同市场、不同交易时段的含义不同
- 财报、公告、突发新闻会让技术信号失效
- 规则系统需要持续回测和迭代，不能一次写死

## 15. 推荐默认参数

```text
短线周期：1m
确认周期：5m
趋势过滤周期：15m
EMA短线：9
EMA中线：20
RSI周期：14
ATR周期：14
成交量均线：20
突破观察窗口：10-20根K线
最低风险收益比：2.0
预警分数：65
确认分数：80
```

## 16. 后续可扩展方向

- 增加盘口买卖盘强度
- 增加逐笔成交主动买卖识别
- 增加新闻和公告过滤
- 增加板块联动强度
- 增加机器学习模型辅助评分
- 增加多周期共振判断
- 增加信号复盘页面
- 增加参数自动优化
