import test from "node:test";
import assert from "node:assert/strict";
import { sanitizeMermaidSource, sanitizeSvgMarkup } from "../src/sanitize.js";

const SVG_NS = "http://www.w3.org/2000/svg";
const XLINK_NS = "http://www.w3.org/1999/xlink";

function attribute(name, value, namespaceURI = null, localName = name.includes(":") ? name.split(":").pop() : name) {
  return { name, value, namespaceURI, localName };
}

function element(tagName, { namespaceURI = SVG_NS, attributes = [], text = "", children = [] } = {}) {
  const node = {
    tagName,
    localName: tagName.includes(":") ? tagName.split(":").pop() : tagName,
    namespaceURI,
    attributes: attributes.map((item) => attribute(item.name, item.value, item.namespaceURI, item.localName)),
    children: [],
    parentNode: null,
    textContent: text,
    remove() {
      if (!this.parentNode) return;
      this.parentNode.children = this.parentNode.children.filter((child) => child !== this);
      this.parentNode = null;
    },
    removeAttribute(name) {
      this.attributes = this.attributes.filter((item) => item.name !== name);
    },
    removeAttributeNS(namespaceURI, localName) {
      this.attributes = this.attributes.filter((item) =>
        item.namespaceURI !== namespaceURI || item.localName !== localName);
    },
    setAttribute(name, value) {
      const existing = this.attributes.find((item) => item.name === name && !item.namespaceURI);
      if (existing) existing.value = String(value);
      else this.attributes.push(attribute(name, String(value)));
    },
    getAttribute(name) {
      return this.attributes.find((item) => item.name === name)?.value ?? null;
    },
    querySelectorAll(selector) {
      if (selector !== "*") throw new Error(`unsupported selector: ${selector}`);
      const result = [];
      const visit = (parent) => {
        for (const child of parent.children) {
          result.push(child);
          visit(child);
        }
      };
      visit(this);
      return result;
    },
  };
  for (const child of children) {
    child.parentNode = node;
    node.children.push(child);
  }
  return node;
}

function escapeText(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function escapeAttribute(value) {
  return escapeText(value).replaceAll('"', "&quot;");
}

function serialize(node) {
  const attributes = node.attributes
    .map((item) => ` ${item.name}="${escapeAttribute(item.value)}"`)
    .join("");
  const text = node.textContent || "";
  if (!node.children.length && !text) return `<${node.tagName}${attributes}/>`;
  return `<${node.tagName}${attributes}>${escapeText(text)}${node.children.map(serialize).join("")}</${node.tagName}>`;
}

function sanitizeWithRoot(root) {
  const previousParser = globalThis.DOMParser;
  const previousSerializer = globalThis.XMLSerializer;
  globalThis.DOMParser = class {
    parseFromString() {
      return {
        documentElement: root,
        querySelector: () => null,
      };
    }
  };
  globalThis.XMLSerializer = class {
    serializeToString() {
      return serialize(root);
    }
  };
  try {
    return sanitizeSvgMarkup("<svg/>");
  } finally {
    if (previousParser === undefined) delete globalThis.DOMParser;
    else globalThis.DOMParser = previousParser;
    if (previousSerializer === undefined) delete globalThis.XMLSerializer;
    else globalThis.XMLSerializer = previousSerializer;
  }
}

function svgRoot({ id = "diagram", children = [] } = {}) {
  const attributes = [{ name: "xmlns", value: SVG_NS }];
  if (id) attributes.push({ name: "id", value: id });
  return element("svg", { attributes, children });
}

test("frontmatter keeps title/displayMode and removes config", () => {
  const cleaned = sanitizeMermaidSource(`---
title: |
  click A stays title text
displayMode: compact
config:
  htmlLabels: true
  flowchart:
    htmlLabels: true
base: &base
  config:
    htmlLabels: true
---
flowchart TD
A-->B`);
  assert.match(cleaned, /^---\ntitle: \|\n  click A stays title text\ndisplayMode: compact\n---/);
  assert.doesNotMatch(cleaned, /\nconfig:|\nbase:|htmlLabels:/);
  assert.match(cleaned, /flowchart TD\nA-->B/);
});

test("flow-style frontmatter cannot smuggle config", () => {
  const cleaned = sanitizeMermaidSource(`---
{title: Smuggled, config: {htmlLabels: true}}
---
flowchart TD
A-->B`);
  assert.doesNotMatch(cleaned, /\{title:|config:|htmlLabels:/);
  assert.match(cleaned, /^flowchart TD/m);
});

test("JSON frontmatter keeps safe metadata and drops config", () => {
  const cleaned = sanitizeMermaidSource(`---
{"title":"JSON title","displayMode":"compact","config":{"htmlLabels":true}}
---
flowchart TD
A-->B`);
  assert.match(cleaned, /^---\ntitle: "JSON title"\ndisplayMode: "compact"\n---/);
  assert.doesNotMatch(cleaned, /config|htmlLabels/);
  assert.match(cleaned, /^flowchart TD/m);
});

test("click statements are removed at line start and after semicolons", () => {
  const cleaned = sanitizeMermaidSource(`flowchart TD
A["semi; click A stays label"]-->B; click A "javascript:alert(1)"
click B "javascript:alert(2)"
C-->D; E-->F
G[unquoted; click A text]-->H`);
  assert.match(cleaned, /A\["semi; click A stays label"\]-->B/);
  assert.match(cleaned, /C-->D; E-->F/);
  assert.match(cleaned, /G\[unquoted; click A text\]-->H/);
  assert.doesNotMatch(cleaned, /(?:^|\n)\s*click\b/im);
  assert.doesNotMatch(cleaned, /;\s*click\s+[A-Z]\s+"/);
  assert.doesNotMatch(cleaned, /javascript:/);
});

test("init securityLevel remains blocked while safe init survives", () => {
  assert.equal(sanitizeMermaidSource(`%%{init: {"securityLevel":"loose"}}%%
flowchart TD
A-->B`), null);
  const cleaned = sanitizeMermaidSource(`%%{init: {"themeVariables":{"sequenceNumberColor":"#abc"}}}%%
flowchart TD
A-->B`);
  assert.match(cleaned, /%%\{init: .*"sequenceNumberColor":"#abc".*\}%%/);
});

test("SVG removes namespaced q:href, ping, external xlink:href and event handlers", () => {
  const href = element("a", {
    attributes: [
      { name: "q:href", value: "javascript:alert(1)", namespaceURI: XLINK_NS },
      { name: "xlink:href", value: "https://evil.invalid/x", namespaceURI: XLINK_NS },
      { name: "ping", value: "https://evil.invalid/ping" },
      { name: "onclick", value: "alert(1)" },
      { name: "href", value: "#safe" },
    ],
    children: [element("text", { text: "safe" })],
  });
  const out = sanitizeWithRoot(svgRoot({
    children: [
      href,
      element("use", {
        attributes: [{ name: "q:href", value: "https://evil.invalid/sprite.svg#x", namespaceURI: XLINK_NS }],
      }),
      element("use", {
        attributes: [{ name: "xlink:href", value: "#local", namespaceURI: XLINK_NS }],
      }),
    ],
  }));
  assert.doesNotMatch(out, /javascript:|evil\.invalid|ping=|onclick=/);
  assert.match(out, /href="#safe"/);
  assert.match(out, /xlink:href="#local"/);
  assert.doesNotMatch(out, /q:href=/);
});

test("SVG style is scoped to the root id and global at-rules are dropped", () => {
  const style = element("style", {
    text: `#outside{display:none}body{opacity:0}
@media (min-width: 1px){#outside{fill:red}}
@keyframes spin{from{opacity:0}to{opacity:1}}`,
  });
  const out = sanitizeWithRoot(svgRoot({ children: [style] }));
  assert.match(out, /#diagram #outside\{display:none\}/);
  assert.match(out, /#diagram body\{opacity:0\}/);
  assert.match(out, /@media \(min-width: 1px\)\{#diagram #outside\{fill:red\}\}/);
  assert.doesNotMatch(out, /@keyframes|(^|[}>])#outside\{/);
});

test("SVG style is removed when no safe root id exists", () => {
  const out = sanitizeWithRoot(svgRoot({
    id: "",
    children: [element("style", { text: "#outside{display:none}" })],
  }));
  assert.doesNotMatch(out, /<style|#outside/);
});

test("SVG removes denied executable tags and external URL-bearing attributes", () => {
  const out = sanitizeWithRoot(svgRoot({
    children: [
      element("script", { text: "alert(1)" }),
      element("foreignObject", { namespaceURI: "http://www.w3.org/1999/xhtml",
        children: [element("p", { text: "html" })] }),
      element("image", { attributes: [{ name: "href", value: "https://evil.invalid/a.png" }] }),
      element("rect", {
        attributes: [
          { name: "style", value: "fill:url(https://evil.invalid/fill.svg)" },
          { name: "src", value: "https://evil.invalid/src.svg" },
          { name: "onload", value: "alert(1)" },
        ],
      }),
      element("a", { attributes: [{ name: "href", value: "https://evil.invalid/link" }] }),
      element("use", { attributes: [{ name: "href", value: "#safe-symbol" }] }),
    ],
  }));
  assert.doesNotMatch(out, /<script|<foreignObject|<image|evil\.invalid|url\(|onload=|src=/i);
  assert.match(out, /href="#safe-symbol"/);
});
