/* 职责：提供可搜索的确定性压力样例；调用方：compatibility.html。
 * 依赖：经典 script 环境的 window；不依赖运行时、不操作 DOM。
 * 红线：只提供数据，不能改变渲染配置；每个 ID 必须稳定且唯一。
 * 业务例保留旧 ID 供筛选与回归引用；替换拓扑时同步审查依赖该结构的断言。
 * 节点规模服务于可读的业务场景，不用重复长链或完全连接制造无意义压力。
 */
(function () {
  "use strict";
  const cases = [];
  const add = (id, type, title, complexity, source, tags = [], wide = false) => {
    cases.push({ id: `stress-${id}`, type, title, complexity, source: source.trim(), wide, tags });
  };
  const range = (count) => Array.from({ length: count }, (_, index) => index);
  const chain = (count, label = (i) => `步骤 ${i + 1}`) => [
    ...range(count).map((i) => `N${i}["${label(i)}"]`),
    ...range(count - 1).map((i) => `N${i} --> N${i + 1}`),
  ];
  const shapes = [
    (id, label) => `${id}["${label}"]`,
    (id, label) => `${id}("${label}")`,
    (id, label) => `${id}(["${label}"])`,
    (id, label) => `${id}[["${label}"]]`,
    (id, label) => `${id}[("${label}")]`,
    (id, label) => `${id}(("${label}"))`,
    (id, label) => `${id}{"${label}"}`,
    (id, label) => `${id}{{"${label}"}}`,
    (id, label) => `${id}[/"${label}"/]`,
    (id, label) => `${id}((("${label}")))`,
  ];
  const flow = (direction, key, title, complexity, lines, tags = []) => {
    const horizontal = direction === "LR" || direction === "RL";
    add(`flow-${direction.toLowerCase()}-${key}`, "flowchart", `${direction} · ${title}`,
      complexity, `flowchart ${direction}\n  ${lines.join("\n  ")}`,
      [direction, horizontal ? "横向" : "纵向", ...tags], horizontal || complexity === "压力");
  };

  // 业务例按拓扑职责区分：补偿、并行、事件汇聚、跨层、回边和多组件。
  // 轮廓、端点与既有故障夹具独立保留，不因替换业务例而丢失回归证据。
  flow("TD", "single", "单节点长标题", "简单", ['A["单个节点也应保持标题居中"]'], ["单节点", "1节点"]);
  flow("LR", "isolated", "六种孤立形状", "简单",
    shapes.slice(0, 6).map((shape, i) => shape(`I${i}`, `孤立 ${i + 1}`)), ["孤立", "6节点"]);
  flow("TD", "long-chain", "下单履约与支付失败补偿", "复杂", [
    'START["提交订单"] --> AUTH{"登录态有效？"}',
    'AUTH -->|否| LOGIN["登录后恢复订单"]', 'LOGIN --> AUTH',
    'AUTH -->|是| DEDUPE{"已有幂等订单？"}',
    'DEDUPE -->|是| EXIST["读取原订单"]', 'EXIST --> NOTICE["通知用户"]',
    'DEDUPE -->|否| STOCK["预占库存"]', 'STOCK --> PAY["发起支付"]',
    'PAY --> RESULT{"支付结果"}',
    'RESULT -->|成功| FULFILL["创建履约单"]', 'FULFILL --> SHIP["仓库发货"]',
    'SHIP --> COMPLETE(["确认收货"])', 'COMPLETE --> NOTICE',
    'RESULT -->|失败| RELEASE["释放预占库存"]', 'RELEASE --> CANCEL["关闭订单"]',
    'CANCEL --> NOTICE', 'RESULT -->|待确认| RECHECK["查询网关回执"]', 'RECHECK -. 更新 .-> RESULT',
  ], ["订单", "幂等", "重试", "补偿", "15节点", "边标签"]);
  flow("LR", "extreme-chain", "媒体发布的并行加工与审核返工", "复杂", [
    'UPLOAD["上传素材"] --> CHECK{"格式可处理？"}',
    'CHECK -->|否| REJECT["反馈拒绝原因"]', 'CHECK -->|是| STORE[("素材存储")]',
    'STORE --> SCAN["内容安全扫描"]', 'STORE --> TRANSCODE["视频转码"]',
    'STORE --> COVER["生成封面"]', 'STORE --> TEXT["提取字幕"]',
    'SCAN --> REVIEW{"审核与加工完成？"}', 'TRANSCODE --> REVIEW', 'COVER --> REVIEW', 'TEXT --> REVIEW',
    'REVIEW -->|通过| CDN["分发至边缘缓存"]', 'CDN --> PUBLISH["发布内容"]', 'PUBLISH --> NOTIFY["通知订阅者"]',
    'REVIEW -->|需修改| REEDIT["重新编辑素材"]', 'REEDIT -. 新版本 .-> STORE',
    'REVIEW -->|禁止发布| CLEANUP["删除临时产物"]', 'CLEANUP --> REJECT',
  ], ["媒体发布", "并行", "汇聚", "返工", "14节点"]);
  flow("LR", "fan-out", "工作台并行查询与推荐超时降级", "复杂", [
    'REQUEST["打开业务工作台"] --> AUTH{"会话有效？"}', 'AUTH -->|否| DENIED["提示重新登录"]',
    'AUTH -->|是| PROFILE["用户资料"]', 'AUTH --> ORDERS["近期订单"]',
    'AUTH --> STOCK["库存摘要"]', 'AUTH --> BILLING["账单摘要"]', 'AUTH --> RECOMMEND["个性化推荐"]',
    'PROFILE --> AGG["按截止时间汇总"]', 'ORDERS --> AGG', 'STOCK --> AGG', 'BILLING --> AGG',
    'RECOMMEND -->|正常| AGG', 'RECOMMEND -. 超时 .-> FALLBACK["使用默认推荐"]', 'FALLBACK --> AGG',
    'AGG --> VIEW["展示工作台"]', 'VIEW --> METRICS["记录分支耗时"]',
  ], ["工作台", "扇出", "扇入", "降级", "12节点"]);
  flow("TD", "fan-in", "多渠道工单归并与优先级分流", "复杂", [
    'WEB["网页表单"] --> NORMALIZE["统一消息格式"]', 'MAIL["客户邮件"] --> NORMALIZE',
    'PHONE["电话记录"] --> NORMALIZE', 'BOT["客服机器人"] --> NORMALIZE',
    'NORMALIZE --> DEDUPE["过滤重复消息"]', 'DEDUPE --> MATCH{"存在关联工单？"}',
    'MATCH -->|是| APPEND["追加到原工单"]', 'APPEND --> ACK["发送受理回执"]',
    'MATCH -->|否| CREATE["创建新工单"]', 'CREATE --> PRIORITY["计算处理优先级"]',
    'PRIORITY --> QUEUE["分派到值班队列"]', 'QUEUE --> ACK',
  ], ["客服", "多来源", "扇入", "去重", "12节点"]);
  flow("LR", "dense", "订单事件路由与消费者回执汇聚", "复杂", [
    'API["接收下单请求"] --> ORDER[("保存订单")]',
    'ORDER --> OUTBOX["写入待投递事件"]', 'OUTBOX --> BUS["发布订单事件"]',
    'BUS --> INVENTORY["库存消费者"]', 'BUS --> PAYMENT["支付消费者"]', 'BUS --> COUPON["优惠券消费者"]',
    'INVENTORY --> STOCK_ACK["库存回执"]', 'PAYMENT --> PAY_ACK["支付回执"]', 'COUPON --> COUPON_ACK["优惠券回执"]',
    'STOCK_ACK --> READY{"履约条件齐备？"}', 'PAY_ACK --> READY', 'COUPON_ACK --> READY',
    'READY -->|是| FULFILL["启动履约"]', 'FULFILL --> NOTIFY["发送订单通知"]', 'NOTIFY --> AUDIT["保存处理轨迹"]',
    'READY -->|回执缺失| WAIT["延迟核对与定向补投"]', 'WAIT -. 补投事件 .-> BUS',
  ], ["事件驱动", "稀疏跨层", "汇聚", "补投", "15节点"]);
  flow("TD", "feedback", "十二节点多级回边", "复杂", [
    ...chain(12), 'N10 -. 重新校验 .-> N2', 'N9 -->|回退| N4', 'N7 ==> N1',
    'N5 -.-> N3', 'N11 --> N0', 'N6 --> N6',
  ], ["回边", "自环", "12节点", "保留原布局"]);
  flow("TD", "nested", "三级嵌套子图与跨组边", "复杂", [
    'subgraph Outer["业务域"]', 'direction TB', 'A["外部入口"]',
    'subgraph Middle["处理域"]', 'direction LR', 'B["预处理"]',
    'subgraph Inner["核心域"]', 'C["校验"] --> D{"是否接受"}',
    'D --> E["计算"]', 'D --> F["拒绝"]', 'end', 'G["结果整理"]', 'end',
    'H["业务出口"]', 'end', 'A --> B', 'B --> C', 'E --> G', 'F --> G',
    'G --> H', 'X["外部通知"]', 'H --> X', 'X -. 重试 .-> A',
  ], ["嵌套子图", "跨组边", "9节点", "保留原布局"]);
  flow("LR", "components", "查询交互、日报与审批三个独立流程", "中等", [
    'CLIENT["业务客户端"] <-->|请求与回执| API["查询服务"]',
    'API --> DATABASE[("业务数据库")]', 'API -. 访问记录 .-> ACCESS_LOG["查询审计"]',
    'SCHEDULE["日报定时器"] --> DIGEST["生成业务摘要"]', 'DIGEST --> MAIL["发送邮件"]',
    'MAIL -. 失败 .-> RETRY["延迟重试"]', 'RETRY --> MAIL',
    'APPLICATION["申请单"] --> REVIEW{"审批结论"}',
    'REVIEW -->|通过| PUBLISH["生效并公示"]', 'REVIEW -->|退回| REJECT["反馈补充材料"]',
  ], ["多组件", "双向", "请求回执", "定时任务", "审批", "12节点", "保留原布局"]);
  flow("LR", "shapes", "十类轮廓串联折返", "复杂", [
    ...shapes.map((shape, i) => shape(`S${i}`, `形状 ${i + 1}`)),
    ...range(shapes.length - 1).map((i) => `S${i} --> S${i + 1}`),
  ], ["多形状", "真实轮廓", "10节点", "折返"]);
  flow("RL", "endpoints", "反向链与实虚粗线双头圈叉", "复杂", [
    'A["起点"] --> B["实线"]', 'B -.-> C["虚线"]', 'C ==> D["粗线"]',
    'D --- E["无箭头"]', 'E <--> F["双箭头"]', 'F o--o G["双圆点"]',
    'G x--x H["双叉"]', 'H --o I["圆点终端"]', 'I --x J["叉形终端"]',
  ], ["实线", "虚线", "粗线", "无头", "双头", "圈叉", "10节点", "反向"]);
  flow("TD", "labels", "合作方Webhook的中英文校验与重放", "复杂", [
    'CLIENT["Partner webhook<br/>接收合作方事件"] --> VERIFY{"Signature valid?<br/>签名是否有效"}',
    'VERIFY -->|No| REJECT["Reject request<br/>返回明确错误"]', 'VERIFY -->|Yes| DEDUPE{"event_id 已处理？"}',
    'DEDUPE -->|是| ACK["200 OK<br/>返回幂等回执"]', 'DEDUPE -->|否| VALIDATE{"Schema v2.0 valid?"}',
    'VALIDATE -->|否| INVALID["Invalid payload<br/>记录字段错误"]', 'INVALID --> REJECT',
    'VALIDATE -->|是| NORMALIZE["Normalize JSON<br/>统一币种与时间"]', 'NORMALIZE --> STORE[("Persist event<br/>保存原始事件")]',
    'STORE --> PROJECT["Update projection<br/>更新业务视图"]',
    'PROJECT -->|成功| ACK', 'PROJECT -. 可重试错误 .-> RETRY["Retry with backoff<br/>指数退避重放"]',
    'RETRY --> PROJECT', 'ACK --> AUDIT["Audit trail<br/>记录处理结果"]',
  ], ["长标签", "CJK", "英文换行", "多行", "中英文", "重放", "12节点"]);
  flow("LR", "long-identifiers", "英文数据契约校验与兼容迁移", "复杂", [
    'SOURCE["UPSTREAM_RESPONSE_TRANSFORMATION<br/>Receive partner export"] --> FORMAT{"CONTENT_TYPE_VALIDATION<br/>Supported format?"}',
    'FORMAT -->|No| REJECT["REJECT_UNSUPPORTED_CONTENT<br/>Return validation report"]',
    'FORMAT -->|Yes| DECODE["DECODE_PARTNER_PAYLOAD<br/>Read typed records"]',
    'DECODE --> VERSION{"SCHEMA_COMPATIBILITY_CHECK<br/>Current schema?"}',
    'VERSION -->|Legacy| MIGRATE["MIGRATE_LEGACY_RECORDS<br/>Map deprecated fields"]', 'MIGRATE --> MATCH',
    'VERSION -->|Current| MATCH{"BUSINESS_KEY_MATCH<br/>Known customer?"}',
    'MATCH -->|Yes| UPSERT["UPSERT_CUSTOMER_RECORD<br/>Commit validated fields"]',
    'MATCH -->|No| QUARANTINE["QUARANTINE_UNKNOWN_CUSTOMER<br/>Request manual mapping"]',
    'UPSERT --> REPORT["EXPORT_IMPORT_REPORT<br/>Summarize accepted and held records"]', 'QUARANTINE --> REPORT',
  ], ["长英文", "英文换行", "标识符", "兼容迁移", "10节点"]);
  flow("LR", "parallel-edges", "平行边与双向重试路径", "中等", [
    'A["请求方"] -->|同步请求| B["执行方"]', 'A -. 异步通知 .-> B',
    'B -->|同步返回| A', 'B -. 状态回执 .-> A',
    'A ==> C["缓存层"]', 'C --> B', 'B --> D["归档层"]', 'C --- D',
  ], ["平行边", "回边", "4节点"]);
  flow("LR", "grid", "仓储履约、物流追踪与客服补发", "复杂", [
    'ORDER["订单中心"]',
    'subgraph WAREHOUSE["仓储履约"]', 'direction TB',
    'STOCK{"主仓有货？"}', 'PICK["主仓拣货"]', 'TRANSFER["备仓调拨"]',
    'QUALITY{"质检通过？"}', 'REWORK["返工处理"]', 'PACK["打包与称重"]', 'end',
    'subgraph SHIPPING["物流协作"]', 'direction TB',
    'LABEL["生成运单"]', 'DISPATCH["发运交接"]', 'TRACK["轨迹聚合"]', 'EXCEPTION{"运输异常？"}', 'end',
    'SERVICE["客服处置"]', 'REISSUE["补发工单"]', 'DELIVERED(["签收完成"])', 'AUDIT["审计事件"]',
    'ORDER --> STOCK', 'STOCK -->|有货| PICK', 'STOCK -->|缺货| TRANSFER', 'TRANSFER --> PICK',
    'PICK --> QUALITY', 'QUALITY -->|失败| REWORK', 'REWORK --> PICK', 'QUALITY -->|通过| PACK',
    'PACK --> LABEL', 'LABEL --> DISPATCH', 'DISPATCH --> TRACK', 'TRACK --> EXCEPTION',
    'EXCEPTION -->|正常| DELIVERED', 'EXCEPTION -->|异常| SERVICE', 'SERVICE --> REISSUE',
    'REISSUE -. 补发 .-> STOCK', 'ORDER -.-> AUDIT', 'TRACK -.-> AUDIT', 'DELIVERED --> AUDIT',
  ], ["子图", "跨层", "仓储", "物流", "补发", "15节点", "保留原布局"]);
  flow("BT", "grouped", "告警归并、并行诊断与回滚复核", "复杂", [
    'ALERT["接收告警"] --> CLASSIFY["识别服务与等级"]', 'CLASSIFY --> DEDUPE{"已有同源事件？"}',
    'DEDUPE -->|是| LINK["关联既有事故"]', 'LINK --> OWNER["确定处置负责人"]', 'DEDUPE -->|否| OWNER',
    'OWNER --> METRICS["检查指标变化"]', 'OWNER --> TRACE["分析调用链"]',
    'METRICS --> DIAGNOSE["形成诊断结论"]', 'TRACE --> DIAGNOSE',
    'DIAGNOSE --> MITIGATE["执行恢复措施"]', 'MITIGATE --> VERIFY{"服务恢复？"}',
    'VERIFY -->|否| ROLLBACK["回滚并调整方案"]', 'ROLLBACK --> MITIGATE',
    'VERIFY -->|是| DOCUMENT["补充事故时间线"]', 'DOCUMENT --> CLOSE(["关闭事故"])',
  ], ["反向", "告警", "去重", "并行诊断", "回滚", "13节点"]);

  add("sequence-alt", "sequenceDiagram", "条件分支与多级返回", "中等", `sequenceDiagram
autonumber
actor U as 用户
participant A as 应用
participant D as 数据库
U->>A: 查询订单
alt 缓存命中
  A-->>U: 返回缓存
else 需要查询
  A->>D: 查询主键
  alt 记录存在
    D-->>A: 订单详情
  else 尚未创建
    D-->>A: 空结果
  end
  A-->>U: 返回查询结果
end`, ["alt", "嵌套", "序号"]);
  add("sequence-opt-loop", "sequenceDiagram", "可选步骤与重试循环", "中等", `sequenceDiagram
autonumber
participant C as 客户端
participant S as 服务端
opt 提供缓存标记
  C->>S: 校验版本
  S-->>C: 版本状态
end
loop 最多三次
  C->>S: 提交请求
  S-->>C: 处理结果
end
C->>S: 确认接收`, ["opt", "loop", "序号"]);
  add("sequence-par", "sequenceDiagram", "并行查询与嵌套循环", "复杂", `sequenceDiagram
autonumber
participant G as 网关
participant A as 用户服务
participant B as 订单服务
participant C as 库存服务
par 用户信息
  G->>A: 请求资料
  A-->>G: 用户资料
and 订单信息
  G->>B: 请求列表
  loop 每个订单
    B->>C: 查询库存
    C-->>B: 库存数量
  end
  B-->>G: 订单列表
end`, ["par", "loop", "并行"]);
  add("sequence-critical", "sequenceDiagram", "临界区与失败分支", "复杂", `sequenceDiagram
autonumber
participant A as 事务协调器
participant B as 资源服务
critical 申请并提交事务
  A->>B: 申请锁
  B-->>A: 返回锁
  A->>B: 提交变更
option 锁等待超时
  B-->>A: 稍后重试
option 版本已变化
  B-->>A: 重新读取
end`, ["critical", "option", "错误分支"]);
  add("sequence-break", "sequenceDiagram", "中断分支与后续消息", "中等", `sequenceDiagram
autonumber
actor U as 操作者
participant A as 应用服务
participant B as 审计服务
U->>A: 提交操作
break 会话已失效
  A-->>U: 要求重新登录
end
A->>B: 写入审计
B-->>A: 已记录
A-->>U: 操作完成`, ["break", "actor", "中断"]);
  add("sequence-actors", "sequenceDiagram", "多角色与各种消息端点", "复杂", `sequenceDiagram
autonumber
actor U as 最终用户
actor O as 运维人员
participant A as 前端应用
participant Q as 消息队列
U->>A: 打开页面
O->A: 查询状态
A-->O: 状态快照
A-)Q: 异步事件
Q--)A: 异步确认
A-xQ: 取消旧事件
Q--xA: 旧订阅已结束
A-->>U: 显示结果`, ["actor", "多端点", "异步"]);
  add("sequence-activation", "sequenceDiagram", "双层激活条与连续自调用", "端点回归", `sequenceDiagram
autonumber
participant C as 调用端
participant S as 执行服务
C->>+S: 开始请求
S->>+S: 内部递归一
S->>+S: 内部递归二
S-->>-S: 返回二
S-->>-S: 返回一
S->>S: 本地收尾
S-->>-C: 最终响应`, ["activation", "自调用", "序号居中"]);
  add("sequence-notes", "sequenceDiagram", "多行备注与长消息文字", "排版回归", `sequenceDiagram
participant A as API 调用方
participant B as UPSTREAM_RESPONSE_COORDINATOR
Note over A,B: 第一行说明<br/>第二行中英文 Mixed note
A->>B: submit_request_with_a_deliberately_long_identifier
Note right of B: 校验参数<br/>检查权限<br/>记录状态
B->>B: 内部操作<br/>保持自调用文字完整
B-->>A: 第一行响应<br/>第二行响应
Note left of A: 页面恢复就绪`, ["长英文", "多行", "notes"], true);
  add("sequence-long", "sequenceDiagram", "结账到履约的八方协作与失败补偿", "复杂", `sequenceDiagram
autonumber
actor C as 顾客
participant P as 结账页面
participant O as 订单服务
participant S as 库存服务
participant G as 支付网关
participant E as 事件总线
participant F as 履约服务
participant N as 通知服务
C->>P: 确认结账
P->>O: 提交幂等订单
O->>S: 预占库存
S-->>O: 预占成功
O->>G: 扣款请求
G-->>O: 支付结果
alt 支付成功
  O->>E: 发布已支付事件
  E-->>O: 已持久化
  par 启动履约
    E->>F: 创建发货任务
    F-->>E: 任务已接收
  and 发送通知
    E->>N: 发送支付成功通知
    N-->>E: 通知已受理
  end
  O-->>P: 返回订单号
  P-->>C: 显示待发货状态
else 支付失败
  O->>S: 释放预占库存
  S-->>O: 已释放
  O-->>P: 返回失败原因
  P-->>C: 保留购物车并提示重试
end`, ["8参与者", "18消息", "并行", "补偿", "两位序号", "序号居中"]);
  add("sequence-wide", "sequenceDiagram", "采购到货、票据核对与退货协作", "复杂", `sequenceDiagram
autonumber
actor R as 申请人
participant P as 采购门户
participant A as 审批服务
participant E as ERP
participant S as 供应商
participant W as 仓库
participant Q as 质检
participant F as 财务
participant C as 承运商
participant N as 通知服务
R->>P: 提交采购需求
P->>A: 发起预算审批
A-->>P: 审批通过
P->>E: 创建采购订单
E->>S: 发送采购单
S-->>E: 确认交期
par 实物到货
  S->>C: 交付货物
  C->>W: 入库交接
  W->>Q: 提交抽检
  Q-->>E: 回传验收结果
and 票据核对
  S->>F: 提交发票
  F-->>E: 金额与订单匹配
end
alt 验收通过
  E->>F: 发起结算
  F-->>S: 发送付款回执
  E->>N: 更新到货状态
  N-->>R: 通知领取
else 验收不通过
  E->>C: 创建退货运单
  C-->>S: 交回异常货物
end
E-->>P: 同步采购状态
P-->>R: 展示处理进度`, ["超宽", "10参与者", "跨越消息", "并行", "退货"], true);

  add("state-composite", "stateDiagram-v2", "嵌套状态与内部终态", "复杂", `stateDiagram-v2
[*] --> Idle
Idle --> Processing: 开始
state Processing {
  [*] --> Validate
  Validate --> Execute
  state Execute {
    [*] --> Prepare
    Prepare --> Commit
    Commit --> [*]
  }
  Execute --> Finish
  Finish --> [*]
}
Processing --> Idle: 重置
Processing --> [*]: 结束`, ["组合状态", "嵌套"]);
  add("state-parallel", "stateDiagram-v2", "并行状态区域与汇合", "复杂", `stateDiagram-v2
[*] --> Active
state Active {
  [*] --> Uploading
  Uploading --> Uploaded
  Uploaded --> [*]
  --
  [*] --> Validating
  Validating --> Validated
  Validated --> [*]
}
Active --> Complete
Complete --> [*]`, ["并行区域", "组合状态"]);
  add("state-choice", "stateDiagram-v2", "选择状态与条件回退", "中等", `stateDiagram-v2
state Decide <<choice>>
[*] --> Request
Request --> Decide
Decide --> Accept: 条件满足
Decide --> Retry: 需要重试
Decide --> Reject: 条件不符
Retry --> Request
Accept --> [*]
Reject --> [*]`, ["choice", "判断", "回边"]);
  add("state-fork-join", "stateDiagram-v2", "分叉并发与同步合并", "中等", `stateDiagram-v2
state Split <<fork>>
state Merge <<join>>
[*] --> Split
Split --> Download
Split --> Configure
Split --> Authenticate
Download --> Merge
Configure --> Merge
Authenticate --> Merge
Merge --> Ready
Ready --> [*]`, ["fork", "join", "真实轮廓"]);
  add("state-notes", "stateDiagram-v2", "中文状态别名与多行备注", "排版回归", `stateDiagram-v2
state "等待上游确认 WAIT_FOR_ACKNOWLEDGEMENT" as Waiting
state "处理响应并保存结果" as Processing
[*] --> Waiting
Waiting --> Processing: 收到确认
note right of Waiting
  等待期间保留当前请求
  超时后回到队列
end note
note left of Processing : 此处为持久化边界
Processing --> [*]`, ["notes", "CJK", "长标签"]);
  add("state-long", "stateDiagram-v2", "订单审批、支付补偿与售后退款", "复杂", `stateDiagram-v2
state "草稿" as Draft
state "待审批" as AwaitingApproval
state "已批准" as Approved
state "已锁库存" as Reserved
state "支付处理中" as Paying
state "已支付" as Paid
state "履约中" as Fulfilling
state "已签收" as Delivered
state "已取消" as Cancelled
state "释放资源中" as Compensating
state "退款处理中" as Refunding
state "已退款" as Refunded
[*] --> Draft
Draft --> AwaitingApproval: 提交
AwaitingApproval --> Draft: 补充材料
AwaitingApproval --> Approved: 批准
Approved --> Reserved: 锁定库存
Reserved --> Paying: 发起扣款
Paying --> Paid: 扣款成功
Paying --> Compensating: 扣款失败
Compensating --> Cancelled: 资源已释放
Paid --> Fulfilling: 下发履约
Fulfilling --> Delivered: 确认签收
Paid --> Refunding: 发货前取消
Delivered --> Refunding: 售后退货
Refunding --> Refunding: 等待渠道回执
Refunding --> Refunded: 退款成功
Draft --> Cancelled: 撤销
Delivered --> [*]
Cancelled --> [*]
Refunded --> [*]`, ["12状态", "审批回退", "支付补偿", "退款", "自环"]);

  add("class-members", "classDiagram", "属性方法与标题成员对齐", "排版回归", `classDiagram
class ApplicationConfiguration {
  +String environment
  +int retryBudget
  -String cachedFingerprint
  +load(String path) bool
  +validate() bool
  -normalize() void
}
class ConfigurationStore {
  +String baseDirectory
  +save(ApplicationConfiguration item) void
}
ConfigurationStore --> ApplicationConfiguration : stores`, ["成员", "长标题", "左对齐"]);
  add("class-generics", "classDiagram", "泛型集合与多层返回类型", "复杂", `classDiagram
class Repository~T~ {
  +List~T~ entries
  +findAll() List~T~
  +findById(String id) T
  +save(T item) bool
}
class Response~T~ {
  +int status
  +T data
}
class User {
  +String id
  +String displayName
}
Repository --> User : persists
Response --> User : carries`, ["泛型", "成员", "关系"]);
  add("class-relations", "classDiagram", "继承实现组合聚合依赖", "端点回归", `classDiagram
class BaseService
class OrderService
class ServiceContract {
  <<interface>>
  +execute() void
}
class Order
class LineItem
class Catalog
class Logger
BaseService <|-- OrderService
ServiceContract <|.. OrderService
Order "1" *-- "1..*" LineItem
Catalog "1" o-- "*" Order
OrderService ..> Logger : reports
OrderService --> Order : creates`, ["继承", "实现", "组合", "聚合", "依赖", "基数"]);
  add("class-namespaces", "classDiagram", "命名空间与跨模块依赖", "复杂", `classDiagram
namespace Domain {
  class Customer {
    +String id
    +String name
  }
  class PurchaseOrder {
    +String number
    +submit() void
  }
}
namespace Infrastructure {
  class SqlRepository
  class EventPublisher
}
Customer "1" --> "*" PurchaseOrder
SqlRepository ..> PurchaseOrder
PurchaseOrder ..> EventPublisher`, ["命名空间", "成员", "跨组关系"]);
  add("class-hierarchy", "classDiagram", "二十五类继承与依赖网", "压力",
    ["classDiagram", "direction LR", "class RootService",
      ...range(24).map((i) => `class Service${i}`),
      ...range(24).map((i) => `${i < 4 ? "RootService" : `Service${Math.floor(i / 4) - 1}`} <|-- Service${i}`),
      ...range(12).map((i) => `Service${i} ..> Service${i + 12} : uses`)].join("\n"),
    ["超宽", "25类", "继承树", "密集关系"], true);

  add("er-comments", "erDiagram", "主外键属性与中文注释", "排版回归", `erDiagram
ACCOUNT {
  int id PK "账号主键"
  string email UK "邮箱唯一"
  string display_name "中文显示名称"
  datetime created_at "创建时间"
}
SESSION {
  string id PK "会话标识"
  int account_id FK "所属账号"
  datetime expires_at "失效时间"
}
ACCOUNT ||--o{ SESSION : owns`, ["属性", "注释", "PK", "FK", "UK", "CJK"]);
  add("er-cardinalities", "erDiagram", "各种基数与识别关系端点", "端点回归", `erDiagram
PERSON ||--|| PROFILE : has
PERSON ||--o| PREFERENCE : configures
PERSON ||--|{ MEMBERSHIP : joins
TEAM }o--o{ PERSON : includes
TEAM ||..o{ PROJECT : hosts
PROJECT }|..|{ TAG : groups`, ["一对一", "零或一", "一或多", "多对多", "非识别"]);
  add("er-commerce", "erDiagram", "八实体订单模型与属性表", "复杂",
    ["erDiagram",
      ...["CUSTOMER", "ORDER", "ORDER_LINE", "PRODUCT", "CATEGORY", "PAYMENT", "SHIPMENT", "ADDRESS"].flatMap((name) =>
        [`${name} {`, '  int id PK "唯一标识"', '  string code UK "业务编码"',
          '  datetime created_at "创建时间"', "}"]),
      "CUSTOMER ||--o{ ORDER : places", "ORDER ||--|{ ORDER_LINE : contains",
      "PRODUCT ||--o{ ORDER_LINE : referenced", "CATEGORY ||--o{ PRODUCT : classifies",
      "ORDER ||--o{ PAYMENT : receives", "ORDER ||--o| SHIPMENT : produces",
      "CUSTOMER ||--o{ ADDRESS : saves", "ADDRESS ||--o{ SHIPMENT : destination"].join("\n"),
    ["属性", "8实体", "复杂关系"], true);
  add("er-wide-attributes", "erDiagram", "长实体标题与十五行属性", "压力",
    ["erDiagram", "UPSTREAM_RESPONSE_TRANSFORMATION_CONFIGURATION {",
      ...range(15).map((i) => `  string configuration_attribute_${i + 1} "配置属性第 ${i + 1} 项的详细说明"`),
      "}", "CONFIGURATION_REVISION {", '  int id PK "修订主键"', '  string fingerprint UK "内容指纹"', "}",
      "CONFIGURATION_REVISION ||--|| UPSTREAM_RESPONSE_TRANSFORMATION_CONFIGURATION : describes"].join("\n"),
    ["长标题", "长注释", "15属性", "左对齐"], true);
  add("er-network", "erDiagram", "十八实体长链与交叉关系", "压力",
    ["erDiagram", ...range(18).flatMap((i) => [`ENTITY_${i} {`, "  int id PK", "  string title", "}"]),
      ...range(17).map((i) => `ENTITY_${i} ||--o{ ENTITY_${i + 1} : links`),
      ...range(6).map((i) => `ENTITY_${i} }o..o{ ENTITY_${i + 12} : references`)].join("\n"),
    ["18实体", "属性", "长链", "交叉关系"], true);

  add("gantt-sections", "gantt", "三阶段计划与里程碑", "中等", `gantt
title 多阶段发布安排
dateFormat YYYY-MM-DD
axisFormat %m-%d
section 设计
方案确认 :done, a, 2026-01-05, 3d
接口设计 :done, b, after a, 4d
section 实现
核心开发 :active, c, after b, 7d
联调验收 :crit, d, after c, 4d
section 发布
发布完成 :milestone, m, after d, 0d`, ["CJK", "里程碑", "依赖"], true);
  add("gantt-long", "gantt", "四分组二十四任务计划", "压力",
    ["gantt", "title 多团队任务排程", "dateFormat YYYY-MM-DD", "axisFormat %m-%d",
      ...range(4).flatMap((group) => [
        `section 团队 ${group + 1}`,
        ...range(6).map((i) => `任务 ${group + 1}-${i + 1} :g${group}t${i}, ${i ? `after g${group}t${i - 1}` : "2026-02-02"}, ${i + 1}d`),
      ])].join("\n"), ["24任务", "多分组", "超长"], true);
  add("pie-small", "pie", "中英文分类及小数比例", "简单", `pie showData
title 资源用量分布
"文本 Text" : 42.5
"图像 Image" : 31.5
"音频 Audio" : 20
"其他 Other" : 6`, ["CJK", "小数", "图例"]);
  add("pie-many", "pie", "十二分类与长图例", "复杂",
    ["pie showData", "title 多服务请求分布",
      ...range(12).map((i) => `"第 ${i + 1} 个服务 Service ${i + 1}" : ${(i + 1) * 7}`)].join("\n"),
    ["12分类", "长图例"]);
  add("quadrant-corners", "quadrantChart", "象限边角与中文标签", "排版回归", `quadrantChart
title 方案评估分布
x-axis 低成本 --> 高成本
y-axis 低价值 --> 高价值
quadrant-1 优先评估
quadrant-2 立即执行
quadrant-3 后续观察
quadrant-4 降低投入
左下角: [0.08, 0.08]
左上角: [0.08, 0.92]
右上角: [0.92, 0.92]
右下角: [0.92, 0.08]
中央项目: [0.50, 0.50]`, ["边界标签", "CJK"]);
  add("quadrant-many", "quadrantChart", "十六项目二维分布", "复杂",
    ["quadrantChart", "title 项目投入与产出", "x-axis Low --> High", "y-axis Low --> High",
      "quadrant-1 Invest", "quadrant-2 Prioritize", "quadrant-3 Observe", "quadrant-4 Reduce",
      ...range(16).map((i) => `项目 ${i + 1}: [${0.14 + (i % 4) * 0.24}, ${0.14 + Math.floor(i / 4) * 0.24}]`)].join("\n"),
    ["16数据点", "CJK"]);
  add("xy-months", "xychart-beta", "十二个月柱线组合", "复杂", `xychart-beta
title "全年请求与完成量"
x-axis [Jan, Feb, Mar, Apr, May, Jun, Jul, Aug, Sep, Oct, Nov, Dec]
y-axis "Requests" 0 --> 140
bar [30, 42, 56, 52, 67, 80, 88, 91, 105, 116, 120, 135]
line [20, 31, 44, 48, 59, 72, 80, 84, 97, 109, 116, 129]`,
    ["12分类", "柱线组合"], true);
  add("xy-horizontal", "xychart-beta", "横向坐标与负值范围", "排版回归", `xychart-beta horizontal
title "区域增长率"
x-axis [North, South, East, West, Center]
y-axis "Growth" -40 --> 80
bar [-25, 45, 70, -10, 35]
line [-20, 35, 55, 0, 30]`, ["横向", "负值", "坐标"]);
  add("git-parallel", "gitGraph", "双功能分支与热修复", "复杂", `gitGraph
commit id: "initial"
branch featureA
commit id: "A1"
checkout main
branch featureB
commit id: "B1"
checkout main
commit id: "hotfix"
merge featureA id: "mergeA"
merge featureB id: "mergeB"
commit id: "release" tag: "v2.0"`, ["多分支", "合并", "标签"], true);
  add("git-long", "gitGraph", "纵向十八提交记录", "压力",
    ["gitGraph TB:", ...range(18).map((i) => `commit id: "revision-${String(i + 1).padStart(2, "0")}"${i % 6 === 5 ? ` tag: "v${i + 1}"` : ""}`)].join("\n"),
    ["纵向", "18提交", "超长"]);
  add("journey-scores", "journey", "全评分范围与多角色文字", "排版回归", `journey
title 完整评分旅程
section 进入
  查找入口: 1: 用户
  阅读说明: 2: 用户, 支持
section 操作
  提交表单: 3: 用户
  确认配置: 4: 用户, 管理员
section 完成
  查看结果: 5: 用户, 支持`, ["评分1到5", "CJK", "文字颜色"], true);
  add("journey-many", "journey", "四阶段二十任务旅程", "压力",
    ["journey", "title 跨团队协作旅程",
      ...range(4).flatMap((group) => [
        `section 阶段 ${group + 1}`,
        ...range(5).map((i) => `  任务 ${group + 1}-${i + 1}: ${i + 1}: 用户, ${group % 2 ? "管理员" : "支持"}`),
      ])].join("\n"), ["20任务", "文字颜色", "超宽"], true);
  add("mindmap-deep", "mindmap", "八层深度与中文节点", "压力",
    ["mindmap", "  root((系统知识))",
      ...range(8).map((i) => `${"  ".repeat(i + 2)}第 ${i + 1} 层知识节点`)].join("\n"),
    ["8层", "CJK", "深层"]);
  add("mindmap-wide", "mindmap", "十个主题与三十叶节点", "压力",
    ["mindmap", "  root((工作台))",
      ...range(10).flatMap((i) => [`    主题 ${i + 1}`,
        ...range(3).map((j) => `      ${i + 1}.${j + 1} 详细内容`)])].join("\n"),
    ["41节点", "超宽", "多分支"], true);
  add("timeline-sections", "timeline", "分时期事件与同年多事项", "复杂", `timeline
title 项目演进时间线
section 原型期
2024 : 需求确认 : 首次原型
2025 : 试点上线 : 反馈收集
section 扩展期
2026 : 多端接入 : 数据迁移 : 性能优化
2027 : 平台化部署 : 长期维护`, ["分组", "多事件", "CJK"], true);
  add("timeline-wide", "timeline", "十六阶段连续时间线", "压力",
    ["timeline", "title 连续交付阶段",
      ...range(16).map((i) => `阶段 ${i + 1} : 验证 ${i + 1} : 发布 ${i + 1}`)].join("\n"),
    ["16阶段", "超宽", "长标签"], true);
  add("requirement-links", "requirementDiagram", "多类需求与验证关系", "复杂", `requirementDiagram
requirement availability {
  id: R1
  text: "Service remains available"
  risk: high
  verifymethod: test
}
functionalRequirement retry {
  id: R2
  text: "Retry preserves request identity"
  risk: medium
  verifymethod: demonstration
}
element integrationTest {
  type: "test"
}
retry - derives -> availability
integrationTest - verifies -> retry`, ["功能需求", "验证", "派生"], true);
  add("requirement-chain", "requirementDiagram", "六需求追踪链与测试节点", "压力",
    ["requirementDiagram",
      ...range(6).flatMap((i) => [
        `requirement req${i} {`, `  id: R${i + 1}`, `  text: "Requirement ${i + 1} stays observable"`,
        "  risk: medium", "  verifymethod: inspection", "}",
      ]), "element audit {", '  type: "analysis"', "}",
      ...range(5).map((i) => `req${i} - traces -> req${i + 1}`),
      "audit - verifies -> req5"].join("\n"), ["6需求", "追踪", "长链"], true);

  add("sankey-basic", "sankey-beta", "来源与去向的三层流量", "中等", `sankey-beta
Web,Gateway,45
Mobile,Gateway,30
Script,Gateway,25
Gateway,Text Model,65
Gateway,Image Model,25
Gateway,Cache,10`, ["多来源", "加权流量"]);
  add("sankey-many", "sankey-beta", "八来源四处理器多流向", "复杂",
    ["sankey-beta",
      ...range(8).flatMap((i) => [`Source ${i + 1},Processor ${i % 4 + 1},${(i + 1) * 5}`,
        `Source ${i + 1},Processor ${(i + 1) % 4 + 1},${i + 2}`]),
      ...range(4).flatMap((i) => [`Processor ${i + 1},Output A,${(i + 1) * 8}`,
        `Processor ${i + 1},Output B,${(i + 1) * 6}`])].join("\n"),
    ["多源", "多终点", "24流向"], true);
  add("block-grid", "block-beta", "三列六节点块布局", "中等", `block-beta
columns 3
A["入口"] B["校验"] C["队列"]
D["数据库"] E["处理器"] F["输出"]
A --> B
B --> C
C --> E
D --> E
E --> F`, ["固定列", "CJK", "块布局"]);
  add("block-composite", "block-beta", "嵌套块与跨列节点", "复杂", `block-beta
columns 3
Head["Unified gateway"]:3
block:Left:2
  columns 2
  A["Worker A"] B["Worker B"]
  C["Cache"]:2
end
Store[("Database")]
Foot["Output"]:3
Head --> A
Head --> B
A --> C
B --> Store
C --> Foot
Store --> Foot`, ["嵌套", "跨列", "数据库"]);
  add("architecture-core", "architecture-beta", "云内服务数据库与存储", "中等", `architecture-beta
group core(cloud)[Core]
service api(server)[API] in core
service db(database)[Database] in core
service files(disk)[Files] in core
api:R -- L:db
api:B -- T:files`, ["内置图标", "分组", "端口"]);
  add("architecture-groups", "architecture-beta", "双区域服务连通", "复杂", `architecture-beta
group west(cloud)[West]
group east(cloud)[East]
service wa(server)[API West] in west
service wd(database)[Data West] in west
service ea(server)[API East] in east
service ed(database)[Data East] in east
wa:B -- T:wd
ea:B -- T:ed
wa:R -- L:ea
wd:R -- L:ed`, ["跨组", "双区域", "内置图标"], true);
  add("packet-header", "packet-beta", "三十二位包头与字段标签", "简单", `packet-beta
0-3: "Version"
4-7: "Type"
8-15: "Flags"
16-31: "Payload Length"`, ["位域", "32位", "短字段"]);
  add("packet-multirow", "packet-beta", "一百二十八位多行协议头", "复杂", `packet-beta
0-15: "Source Port"
16-31: "Destination Port"
32-63: "Sequence Number"
64-95: "Acknowledgement Number"
96-99: "Offset"
100-105: "Reserved"
106-111: "Flags"
112-127: "Window Size"`, ["位域", "128位", "多行", "长标签"]);
  add("radar-basic", "radar-beta", "六维能力与两组评分", "中等", `radar-beta
title 服务能力对比
axis speed["速度"], quality["质量"], cost["成本"], stability["稳定"], support["支持"], scale["扩展"]
curve a["方案甲"]{85, 90, 60, 80, 75, 95}
curve b["方案乙"]{70, 75, 90, 85, 90, 65}
max 100
min 0`, ["6维", "CJK", "图例"]);
  add("radar-many", "radar-beta", "八维四曲线雷达图", "复杂",
    ["radar-beta", "title 多方案横向对比",
      `axis ${range(8).map((i) => `a${i}["指标 ${i + 1}"]`).join(", ")}`,
      ...range(4).map((i) => `curve c${i}["方案 ${i + 1}"]{${range(8).map((j) => 35 + (i * 17 + j * 11) % 61).join(", ")}}`),
      "max 100", "min 0", "graticule polygon"].join("\n"), ["8维", "4曲线", "图例"]);
  add("treemap-nested", "treemap-beta", "三级分类矩形树图", "复杂", `treemap-beta
"服务"
  "计算"
    "文本": 45
    "图像": 25
  "存储"
    "数据库": 20
    "文件": 10
"基础设施"
  "网络": 18
  "监控": 12`, ["嵌套", "CJK", "比例"]);
  add("treemap-many", "treemap-beta", "六分类三十叶节点", "压力",
    ["treemap-beta", ...range(6).flatMap((group) => [
      `"分组 ${group + 1}"`,
      ...range(5).map((i) => `  "项目 ${group + 1}-${i + 1}": ${(group + 1) * (i + 2)}`),
    ])].join("\n"), ["30叶节点", "6分组", "密集标签"], true);
  add("c4-context", "C4Context", "用户与系统上下文", "中等", `C4Context
title 服务系统上下文
Person(user, "用户", "使用应用的人")
System(app, "业务应用", "处理业务请求")
System_Ext(mail, "邮件服务", "投递通知")
SystemDb(store, "业务数据库", "保存业务状态")
Rel(user, app, "提交操作", "HTTPS")
Rel(app, store, "读写数据", "SQL")
Rel(app, mail, "发送通知", "SMTP")`, ["用户", "外部系统", "数据库"], true);
  add("c4-boundary", "C4Context", "系统边界与双角色协作", "复杂", `C4Context
title 企业系统边界
Person(employee, "员工", "日常业务操作")
Person(admin, "管理员", "配置与维护")
System_Boundary(company, "企业系统") {
  System(portal, "业务门户", "统一入口")
  System(identity, "身份服务", "登录与授权")
  SystemDb(records, "业务记录", "长期保存")
}
System_Ext(partner, "合作方", "提供外部数据")
Rel(employee, portal, "使用")
Rel(admin, identity, "管理")
Rel(portal, identity, "验证身份")
Rel(portal, records, "读写")
Rel(portal, partner, "交换数据")`, ["系统边界", "多角色", "跨边界"], true);
  add("kanban-basic", "kanban", "三列任务看板", "简单", `kanban
todo[待办]
  design[确认接口设计]
  plan[编写回归计划]
doing[进行中]
  implement[实现渲染校准]
done[已完成]
  prepare[准备基础环境]`, ["三列", "CJK", "任务"]);
  add("kanban-many", "kanban", "五列三十项长标题任务", "压力",
    ["kanban", ...["待规划", "已就绪", "进行中", "待验收", "已完成"].flatMap((title, group) => [
      `column${group}[${title}]`,
      ...range(6).map((i) => `  task${group}_${i}[任务 ${group + 1}-${i + 1} 中英文 Mixed description]`),
    ])].join("\n"), ["30任务", "五列", "长标签", "超宽"], true);

  add("flow-transparent-long", "flowchart", "透明长框的近侧描边接触", "轮廓回归", `flowchart LR
A["来源节点"] --> B["UPSTREAM_RESPONSE_TRANSFORMATION_CONFIGURATION_VALIDATION_AND_COMMIT"]
B --> C["结果节点"]
style B fill:none,stroke:#243746,stroke-width:1px`,
    ["透明填充", "真实轮廓", "长英文", "超宽"], true);
  add("flow-hairline-tall", "flowchart", "透明高框与极细描边接触", "轮廓回归", `flowchart TD
A["顶部入口"] --> B["第一层<br/>第二层<br/>第三层<br/>第四层<br/>第五层<br/>第六层<br/>第七层<br/>第八层"]
B --> C["底部出口"]
style B fill:none,stroke:#243746,stroke-width:0.05px`,
    ["透明填充", "极细描边", "真实轮廓", "多行", "纵向"]);

  window.GPT_MERMAID_STRESS_CASES = cases;
}());
