/* 职责：纯 Node 验证 isFlowchart 对 YAML frontmatter 的识别边界。
 * 调用方：node --test；不依赖 DOM、浏览器或运行时 bundle。
 * 红线：frontmatter 之后的图种声明才决定分类，不能把普通非流程图误判为流程图。
 */
import assert from "node:assert/strict";
import test from "node:test";

import { isFlowchart } from "../src/render.js";

const cases = [
  {
    name: "title frontmatter 后识别 flowchart",
    source: "---\ntitle: 兼容性检查\n---\nflowchart LR\nA --> B",
    expected: true,
  },
  {
    name: "config frontmatter 后识别 graph",
    source: "---\nconfig:\n  layout: elk\n---\ngraph TD\nA --> B",
    expected: true,
  },
  {
    name: "config frontmatter 后识别 flowchart-elk",
    source: "---\nconfig:\n  layout: elk\n---\nflowchart-elk TD\nA --> B",
    expected: true,
  },
  {
    name: "普通 flowchart",
    source: "flowchart LR\nA --> B",
    expected: true,
  },
  {
    name: "普通 graph",
    source: "graph TD\nA --> B",
    expected: true,
  },
  {
    name: "空 frontmatter",
    source: "---\n---\nflowchart LR\nA --> B",
    expected: true,
  },
  {
    name: "CRLF frontmatter",
    source: "---\r\ntitle: test\r\n---\r\nflowchart LR\r\nA --> B",
    expected: true,
  },
  {
    name: "YAML 块标量中的缩进 --- 不提前闭合",
    source: "---\ntitle: |\n  ---\n---\nflowchart LR\nA --> B",
    expected: true,
  },
  {
    name: "未闭合 frontmatter 保持非流程图分类",
    source: "---\ntitle: test\nflowchart LR\nA --> B",
    expected: false,
  },
  {
    name: "%% 注释后普通 flowchart 仍可识别",
    source: "%% 说明\nflowchart LR\nA --> B",
    expected: true,
  },
  {
    name: "sequenceDiagram 不是流程图",
    source: "sequenceDiagram\nA->>B: ping",
    expected: false,
  },
  {
    name: "stateDiagram-v2 不是流程图",
    source: "stateDiagram-v2\n[*] --> Ready",
    expected: false,
  },
  {
    name: "classDiagram 不是流程图",
    source: "classDiagram\nclass Api",
    expected: false,
  },
  {
    name: "erDiagram 不是流程图",
    source: "erDiagram\nUSER ||--o{ ORDER : places",
    expected: false,
  },
  {
    name: "C4Context 不是流程图",
    source: "C4Context\nPerson(user, \"User\")",
    expected: false,
  },
  {
    name: "mindmap 不是流程图",
    source: "mindmap\n  root((Root))",
    expected: false,
  },
  {
    name: "frontmatter 后的 sequenceDiagram 仍不是流程图",
    source: "---\ntitle: test\n---\nsequenceDiagram\nA->>B: ping",
    expected: false,
  },
  {
    name: "frontmatter 标题含 flowchart 不会误判正文",
    source: "---\ntitle: flowchart guide\n---\nsequenceDiagram\nA->>B: ping",
    expected: false,
  },
];

for (const item of cases) {
  test(item.name, () => {
    assert.equal(isFlowchart(item.source), item.expected);
  });
}
