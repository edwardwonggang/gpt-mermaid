/* 职责：提供可搜索的确定性压力样例；调用方：compatibility.html。
 * 依赖：经典 script 环境的 window；不依赖运行时、不操作 DOM。
 * 红线：只提供数据，不能改变渲染配置或旧样例；每个 ID 必须稳定且唯一。
 * 大图通过确定性循环生成，尺寸标签指结构意图，实际尺寸由渲染器决定。
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

  // 每种结构只保留一个代表；长链分别覆盖纵向换列与横向换行两个几何边界。
  // RL 用多端点链、BT 用连续分支组覆盖反向语义，不再把全部样例乘四。
  flow("TD", "single", "单节点长标题", "简单", ['A["单个节点也应保持标题居中"]'], ["单节点", "1节点"]);
  flow("LR", "isolated", "六种孤立形状", "简单",
    shapes.slice(0, 6).map((shape, i) => shape(`I${i}`, `孤立 ${i + 1}`)), ["孤立", "6节点"]);
  flow("TD", "long-chain", "四十节点纵向长链与边标签", "压力", [
    ...range(40).map((i) => `N${i}["步骤 ${i + 1}"]`),
    ...range(39).map((i) => `N${i} -->|交接 ${i + 1}| N${i + 1}`),
  ], ["链", "40节点", "超长", "折返", "换列", "边标签"]);
  flow("LR", "extreme-chain", "六十节点横向极长链", "压力",
    chain(60, (i) => `节点 ${String(i + 1).padStart(2, "0")}`),
    ["链", "60节点", "超宽", "折返", "换行"]);
  flow("LR", "fan-out", "十八路扇出再汇总", "复杂", [
    'S(["任务入口"])', 'T(["任务汇总"])',
    ...range(18).flatMap((i) => [`S --> B${i}["并发分支 ${i + 1}"]`, `B${i} --> T`]),
  ], ["扇出", "扇入", "20节点"]);
  flow("TD", "fan-in", "十八路来源与双出口", "复杂", [
    'D{"统一判定"}', 'Y["接收"]', 'N["退回"]',
    ...range(18).map((i) => `S${i}["来源 ${i + 1}"] --> D`),
    'D -->|通过| Y', 'D -. 复核 .-> N',
  ], ["扇入", "判断", "21节点"]);
  flow("LR", "dense", "三层完全交叉连接", "压力", [
    ...range(3).flatMap((layer) => range(6).map((i) => `L${layer}N${i}["第 ${layer + 1} 层 · ${i + 1}"]`)),
    ...range(2).flatMap((layer) => range(6).flatMap((from) =>
      range(6).map((to) => `L${layer}N${from} --> L${layer + 1}N${to}`))),
  ], ["密集交叉", "18节点", "72边"]);
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
  flow("LR", "components", "四个互不相连的组件", "中等",
    range(4).flatMap((group) => [
      ...range(5).map((i) => `G${group}N${i}["组件 ${group + 1} · 节点 ${i + 1}"]`),
      ...range(4).map((i) => `G${group}N${i} --> G${group}N${i + 1}`),
    ]), ["多组件", "20节点", "保留原布局"]);
  flow("LR", "shapes", "十类轮廓串联折返", "复杂", [
    ...shapes.map((shape, i) => shape(`S${i}`, `形状 ${i + 1}`)),
    ...range(shapes.length - 1).map((i) => `S${i} --> S${i + 1}`),
  ], ["多形状", "真实轮廓", "10节点", "折返"]);
  flow("RL", "endpoints", "反向链与实虚粗线双头圈叉", "复杂", [
    'A["起点"] --> B["实线"]', 'B -.-> C["虚线"]', 'C ==> D["粗线"]',
    'D --- E["无箭头"]', 'E <--> F["双箭头"]', 'F o--o G["双圆点"]',
    'G x--x H["双叉"]', 'H --o I["圆点终端"]', 'I --x J["叉形终端"]',
  ], ["实线", "虚线", "粗线", "无头", "双头", "圈叉", "10节点", "反向"]);
  flow("TD", "labels", "中英文标识符与多行标签", "复杂", chain(12, (i) => [
    "中文流程节点", "English operation", "request_id_v2_alpha_001",
    "中英文 Mixed label", "第一行<br/>第二行", "v2.0 / API : JSON",
  ][i % 6]), ["长标签", "CJK", "多行", "中英文", "12节点"]);
  flow("LR", "long-identifiers", "长英文标识符与文字不截断", "压力",
    chain(10, (i) => `UPSTREAM_RESPONSE_TRANSFORMATION_VALIDATION_STAGE_${String(i + 1).padStart(2, "0")}`),
    ["超宽", "长英文", "标识符", "10节点"]);
  flow("LR", "parallel-edges", "平行边与双向重试路径", "中等", [
    'A["请求方"] -->|同步请求| B["执行方"]', 'A -. 异步通知 .-> B',
    'B -->|同步返回| A', 'B -. 状态回执 .-> A',
    'A ==> C["缓存层"]', 'C --> B', 'B --> D["归档层"]', 'C --- D',
  ], ["平行边", "回边", "4节点"]);
  flow("LR", "grid", "六乘六网格交叉路由", "压力", [
    ...range(6).flatMap((row) => range(6).map((col) => `R${row}C${col}["${row + 1}行 ${col + 1}列"]`)),
    ...range(6).flatMap((row) => range(5).map((col) => `R${row}C${col} --> R${row}C${col + 1}`)),
    ...range(5).flatMap((row) => range(6).map((col) => `R${row}C${col} -.-> R${row + 1}C${col}`)),
  ], ["网格", "密集交叉", "36节点", "60边", "保留原布局"]);
  flow("BT", "grouped", "六段反向分支组连续流程", "压力",
    range(6).flatMap((group) => [
      `S${group}["阶段 ${group + 1} 入口"] -->|校验| A${group}["权限检查"]`,
      `S${group} -->|读取| B${group}["加载数据"]`,
      `A${group} --> J${group}["阶段 ${group + 1} 汇合"]`, `B${group} --> J${group}`,
      ...(group < 5 ? [`J${group} -->|继续| S${group + 1}`] : []),
    ]), ["连续分支组", "扇出", "扇入", "24节点", "反向", "折返", "换列"]);

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
  add("sequence-long", "sequenceDiagram", "六十条消息与两位序号", "压力",
    ["sequenceDiagram", "autonumber", "participant A as 请求端", "participant B as 响应端",
      ...range(30).flatMap((i) => [`A->>B: 第 ${i + 1} 次请求`, `B-->>A: 第 ${i + 1} 次返回`])].join("\n"),
    ["超长", "60消息", "序号居中"]);
  add("sequence-wide", "sequenceDiagram", "十二参与者横跨消息", "压力",
    ["sequenceDiagram", "autonumber",
      ...range(12).map((i) => `participant P${i} as 第 ${i + 1} 个处理节点`),
      ...range(11).map((i) => `P${i}->>P${i + 1}: 传递 ${i + 1}`),
      "P11-->>P0: 跨越全部参与者的最终回执",
      "P0->>P0: 本地确认"].join("\n"), ["超宽", "12参与者", "跨越消息"], true);

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
  add("state-long", "stateDiagram-v2", "三十状态连续转换", "压力",
    ["stateDiagram-v2", "[*] --> S0",
      ...range(30).map((i) => `state "状态 ${i + 1}" as S${i}`),
      ...range(29).map((i) => `S${i} --> S${i + 1}: 事件 ${i + 1}`),
      "S29 --> [*]"].join("\n"), ["超长", "30状态"]);

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
