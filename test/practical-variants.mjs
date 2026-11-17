/* 职责：用未列在演示页中的常见结构、方向、字体和名称组合防止针对固定样例修补。 */
import assert from "node:assert/strict";
import { auditArrowContacts } from "./arrow-contacts.mjs";
import { auditDetailOverlaps } from "./detail-overlaps.mjs";

export async function verifyPracticalVariants(page, output) {
  const variants = await page.evaluate(async () => {
    const sources = [
      ["retry", `Entry["Receive request"] --> Valid{"Validate payload"}
Valid -->|valid| Queue["Persist and enqueue"]
Valid -->|invalid| Reject["Return validation error"]
Queue --> Work["Process job"]
Work -->|complete| Done(["Deliver result"])
Work -. retry .-> Delay["Backoff"]
Delay --> Work`],
      ["join", `Start(["Submit"]) --> Inventory["Reserve inventory"]
Start --> Payment["Authorize payment"]
Inventory --> Commit{"Ready to commit"}
Payment --> Commit
Commit -->|yes| Fulfil["Fulfil order"]
Commit -->|no| Compensate["Release reservations"]
Fulfil --> Done(["Close"])
Compensate --> Done`],
      ["parallel", `Client["Browser"] -->|request| API["Gateway"]
Client -. status .-> API
API -->|response| Client
API --> Store[("Events")]
Store --> Audit["Archive"]
API --> Audit`],
    ];
    const fixtures = [];
    for (const direction of ["LR", "RL", "TD", "BT"]) for (const [name, source] of sources) {
      fixtures.push({ id: `heldout-${name}-${direction}`, source: `flowchart ${direction}\n${source}`,
        fontFamily: direction === "RL" || direction === "BT" ? "Georgia, serif" : "Arial, sans-serif" });
    }
    fixtures.push(
      { id: "heldout-state-loop", source: `stateDiagram-v2
[*] --> Pending
Pending --> Running: accepted
Running --> Running: Waiting for external acknowledgement
Running --> Succeeded: finished
Running --> Pending: recover
Succeeded --> [*]`, fontFamily: "Georgia, serif" },
      { id: "heldout-state-bar", source: `stateDiagram-v2
direction LR
state Parallel <<fork>>
state Joined <<join>>
[*] --> Parallel
Parallel --> Fetch
Parallel --> Verify
Fetch --> Joined
Verify --> Joined
Joined --> [*]`, fontFamily: "Arial, sans-serif" },
    );
    const erSource = GPT_MERMAID_LAB_CASES.find(item => item.id === "stress-er-network")?.source;
    if (erSource) fixtures.push({ id: "heldout-er-renamed", fontFamily: "Arial, sans-serif",
      source: erSource.replace(/ENTITY_(\d+)/g, (_, number) => `Account_${37 - Number(number)}`) });
    window.__contactVariantRecords = [];
    const result = [];
    for (const fixture of fixtures) {
      const host = document.createElement("section");
      host.className = "sample"; host.dataset.sampleId = fixture.id;
      const target = document.createElement("div"); host.append(target);
      document.body.append(host);
      const record = await GPTMermaid.mount(target, fixture.source, { fontFamily: fixture.fontFamily });
      await new Promise((resolve) => {
        const done = () => ["ready", "error"].includes(record.figure.dataset.state);
        if (done()) return resolve();
        const observer = new MutationObserver(() => { if (done()) { observer.disconnect(); resolve(); } });
        observer.observe(record.figure, { attributes: true, attributeFilter: ["data-state"] });
      });
      window.__contactVariantRecords.push({ record, host });
      result.push({ id: fixture.id, state: record.figure.dataset.state, routing: record.result?.routing });
    }
    return result;
  });
  try {
    assert.equal(variants.length, 15, `实用变体数量变化：${variants.length}`);
    for (const variant of variants) {
      assert.equal(variant.state, "ready", `${variant.id} 应能正常渲染`);
      assert.equal(variant.routing.status, "clear", `${variant.id} 常见结构不应残留交叉`);
    }
    await auditArrowContacts(page, output);
    await auditDetailOverlaps(page, output);
  } finally {
    await page.evaluate(() => {
      for (const { record, host } of window.__contactVariantRecords || []) { record.destroy(); host.remove(); }
      delete window.__contactVariantRecords;
    });
  }
  return variants;
}
