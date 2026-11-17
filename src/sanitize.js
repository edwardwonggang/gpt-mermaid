/* 职责：清理 Mermaid 源码指令与输出 SVG，保证浏览器内渲染不加载外部资源。 */

const DIRECTIVE_RE = /%%\{[\s\S]*?\}%%/g;
const INIT_RE = /^%%\{\s*(?:init|initialize)\s*:\s*(\{[\s\S]*\})\s*\}%%$/i;
const SECURITY_RE = /["']?securityLevel["']?\s*:/i;
const SVG_NS = "http://www.w3.org/2000/svg";
const XLINK_NS = "http://www.w3.org/1999/xlink";
const XML_NS = "http://www.w3.org/XML/1998/namespace";
const FRONTMATTER_RE = /^---[^\S\r\n]*(?:#[^\r\n]*)?\r?\n([\s\S]*?)^---[^\S\r\n]*(?:#[^\r\n]*)?(?=\r?\n|$)/m;
const FRONTMATTER_KEYS = new Set(["title", "displayMode"]);
const STYLE_GROUP_RULES = new Set(["media", "supports", "container", "layer", "scope", "starting-style"]);

const SVG_TAGS = new Set((
  "svg g a path defs symbol desc title text tspan textPath rect line polyline polygon circle ellipse marker pattern " +
  "linearGradient radialGradient stop clipPath mask filter feBlend feColorMatrix feComponentTransfer feComposite " +
  "feConvolveMatrix feDiffuseLighting feDisplacementMap feDistantLight feDropShadow feFlood feFuncA feFuncB feFuncG " +
  "feFuncR feGaussianBlur feMerge feMergeNode feMorphology feOffset fePointLight feSpecularLighting feSpotLight " +
  "feTile feTurbulence style image use switch"
).split(" "));
const DENY_TAGS = new Set(["script", "iframe", "object", "embed", "form", "input", "button", "textarea", "foreignObject", "image", "animate", "animateMotion", "animateTransform", "set"]);

function safeURL(value) {
  const url = String(value || "").trim();
  return /^#[\w:.-]+$/.test(url)
    || /^data:image\/(?:png|jpeg|gif|webp);base64,[a-z0-9+/=\s]+$/i.test(url);
}

function safeCSS(value) {
  const css = String(value || "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "");
  if (/[\\<]/.test(css) || /@(?:import|namespace)|expression\s*\(|(?:-moz-binding|behavior)\s*:|(?:image-set|paint)\s*\(/i.test(css)) return "";
  for (const match of css.matchAll(/url\s*\(\s*(['"]?)(.*?)\1\s*\)/gi)) {
    if (!safeURL(match[2])) return "";
  }
  const stripped = css.replace(/url\s*\(\s*(['"]?)(.*?)\1\s*\)/gi, "");
  return /url\s*\(/i.test(stripped) ? "" : css;
}

function safeInitDirective(directive) {
  const match = directive.match(INIT_RE);
  if (!match) return "";
  try {
    const parsed = JSON.parse((match[1] || "").replaceAll("'", '"'));
    const sequenceColor = parsed?.themeVariables?.sequenceNumberColor;
    const validColor = typeof sequenceColor === "string" && /^#(?:[a-f0-9]{3}|(?:[a-f0-9]{2}){2,4})$/i.test(sequenceColor)
      ? sequenceColor : undefined;
    const themeCSS = typeof parsed?.themeCSS === "string" ? safeCSS(parsed.themeCSS) : "";
    if (!validColor && !themeCSS) return "";
    return `%%{init: ${JSON.stringify({
      theme: "base",
      ...(validColor ? { themeVariables: { sequenceNumberColor: validColor } } : {}),
      ...(themeCSS ? { themeCSS } : {}),
    })}}%%`;
  } catch {
    return "";
  }
}

function frontmatterKey(line, indent) {
  const text = line.slice(indent);
  let quote = "";
  let escaped = false;
  for (let index = 0; index < text.length; index++) {
    const char = text[index];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (quote && char === "\\") {
      escaped = true;
      continue;
    }
    if (quote) {
      if (char === quote) quote = "";
      continue;
    }
    if (char === '"' || char === "'") {
      quote = char;
      continue;
    }
    if (char === ":") return text.slice(0, index).trim();
  }
  return "";
}

function allowedFrontmatterKey(key) {
  return FRONTMATTER_KEYS.has(key)
    || /^"(?:title|displayMode)"$/.test(key)
    || /^'(?:title|displayMode)'$/.test(key);
}

function sanitizeFrontmatterContent(content) {
  const eol = content.includes("\r\n") ? "\r\n" : "\n";
  const trimmed = content.trim();
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    try {
      const parsed = JSON.parse(trimmed);
      const kept = [];
      if (typeof parsed.title === "string" || typeof parsed.title === "number") {
        kept.push(`title: ${JSON.stringify(String(parsed.title))}`);
      }
      if (typeof parsed.displayMode === "string" || typeof parsed.displayMode === "number") {
        kept.push(`displayMode: ${JSON.stringify(String(parsed.displayMode))}`);
      }
      return kept.length ? `---${eol}${kept.join(eol)}${eol}---` : "";
    } catch {
      // Invalid JSON frontmatter is dropped rather than partially interpreted.
    }
  }
  const lines = content.replace(/\r?\n$/, "").split(/\r?\n/);
  const rootIndent = Math.min(...lines
    .filter((line) => line.trim() && !line.trimStart().startsWith("#"))
    .map((line) => line.match(/^\s*/)[0].length));
  if (!Number.isFinite(rootIndent)) return "";
  const kept = [];
  let keepBlock = false;
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      if (keepBlock) kept.push(line);
      continue;
    }
    if (trimmed.startsWith("#")) {
      if (keepBlock) kept.push(line);
      continue;
    }
    const indent = line.match(/^\s*/)[0].length;
    if (indent <= rootIndent) {
      keepBlock = allowedFrontmatterKey(frontmatterKey(line, indent));
    }
    if (keepBlock) kept.push(line);
  }
  while (kept.length && !kept.at(-1).trim()) kept.pop();
  return kept.length ? `---${eol}${kept.join(eol)}${eol}---` : "";
}

function splitFrontmatter(source) {
  const bom = source.startsWith("\uFEFF") ? "\uFEFF" : "";
  const text = bom ? source.slice(1) : source;
  const match = text.match(FRONTMATTER_RE);
  if (!match || match.index !== 0) return { bom, frontmatter: "", body: text };
  const frontmatter = sanitizeFrontmatterContent(match[1] || "");
  return { bom, frontmatter, body: text.slice(match[0].length) };
}

function splitMermaidStatements(line) {
  const statements = [];
  let start = 0;
  let quote = "";
  let escaped = false;
  let parentheses = 0;
  let brackets = 0;
  let braces = 0;
  for (let index = 0; index < line.length; index++) {
    const char = line[index];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (quote && char === "\\") {
      escaped = true;
      continue;
    }
    if (quote) {
      if (char === quote) quote = "";
      continue;
    }
    if (char === '"' || char === "'" || char === "`") {
      quote = char;
      continue;
    }
    if (char === "(") parentheses++;
    else if (char === ")") parentheses = Math.max(0, parentheses - 1);
    else if (char === "[") brackets++;
    else if (char === "]") brackets = Math.max(0, brackets - 1);
    else if (char === "{") braces++;
    else if (char === "}") braces = Math.max(0, braces - 1);
    else if (char === "%" && line[index + 1] === "%" && !parentheses && !brackets && !braces) break;
    else if (char === ";" && !parentheses && !brackets && !braces) {
      statements.push(line.slice(start, index));
      start = index + 1;
    }
  }
  statements.push(line.slice(start));
  return statements;
}

function stripClickStatements(source) {
  return source.split(/(\r\n|\n|\r)/).map((part) => {
    if (!part || part === "\n" || part === "\r\n" || part === "\r" || part.trimStart().startsWith("%%")) return part;
    const statements = splitMermaidStatements(part);
    if (!statements.some((statement) => /^\s*click\b/i.test(statement))) return part;
    return statements.filter((statement) => !/^\s*click\b/i.test(statement)).join(";");
  }).join("");
}

function removeAttribute(node, attribute) {
  if (attribute.namespaceURI && typeof node.removeAttributeNS === "function") {
    node.removeAttributeNS(attribute.namespaceURI, attribute.localName);
  } else {
    node.removeAttribute(attribute.name);
  }
}

function splitSelectorList(selectors) {
  const result = [];
  let start = 0;
  let quote = "";
  let escaped = false;
  let parentheses = 0;
  let brackets = 0;
  for (let index = 0; index < selectors.length; index++) {
    const char = selectors[index];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (quote && char === "\\") {
      escaped = true;
      continue;
    }
    if (quote) {
      if (char === quote) quote = "";
      continue;
    }
    if (char === '"' || char === "'") {
      quote = char;
      continue;
    }
    if (char === "(") parentheses++;
    else if (char === ")") parentheses = Math.max(0, parentheses - 1);
    else if (char === "[") brackets++;
    else if (char === "]") brackets = Math.max(0, brackets - 1);
    else if (char === "," && !parentheses && !brackets) {
      result.push(selectors.slice(start, index));
      start = index + 1;
    }
  }
  result.push(selectors.slice(start));
  return result;
}

function matchingBrace(css, open) {
  let depth = 0;
  let quote = "";
  let escaped = false;
  for (let index = open; index < css.length; index++) {
    const char = css[index];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (quote && char === "\\") {
      escaped = true;
      continue;
    }
    if (quote) {
      if (char === quote) quote = "";
      continue;
    }
    if (char === '"' || char === "'") {
      quote = char;
      continue;
    }
    if (char === "{") depth++;
    else if (char === "}" && --depth === 0) return index;
  }
  return -1;
}

function nextRuleBoundary(css, start) {
  let quote = "";
  let escaped = false;
  let parentheses = 0;
  let brackets = 0;
  for (let index = start; index < css.length; index++) {
    const char = css[index];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (quote && char === "\\") {
      escaped = true;
      continue;
    }
    if (quote) {
      if (char === quote) quote = "";
      continue;
    }
    if (char === '"' || char === "'") {
      quote = char;
      continue;
    }
    if (char === "(") parentheses++;
    else if (char === ")") parentheses = Math.max(0, parentheses - 1);
    else if (char === "[") brackets++;
    else if (char === "]") brackets = Math.max(0, brackets - 1);
    else if (!parentheses && !brackets && (char === "{" || char === ";")) return { index, char };
  }
  return null;
}

function hasDeclarationsBlock(body) {
  let quote = "";
  let escaped = false;
  for (const char of body) {
    if (escaped) {
      escaped = false;
      continue;
    }
    if (quote && char === "\\") {
      escaped = true;
      continue;
    }
    if (quote) {
      if (char === quote) quote = "";
      continue;
    }
    if (char === '"' || char === "'") quote = char;
    else if (char === "{") return true;
  }
  return false;
}

function scopedSelector(selector, scopeId) {
  const value = selector.trim();
  if (!value) return "";
  const prefix = `#${scopeId}`;
  if (value.startsWith(prefix) && !/^[\w-]/.test(value.slice(prefix.length))) return value;
  return `${prefix} ${value}`;
}

function scopeStyleCSS(css, scopeId) {
  let output = "";
  let index = 0;
  while (index < css.length) {
    while (index < css.length && /[\s;]/.test(css[index])) index++;
    if (index >= css.length || css[index] === "}") break;
    if (css[index] === "@") {
      const boundary = nextRuleBoundary(css, index);
      if (!boundary) break;
      if (boundary.char === ";") {
        index = boundary.index + 1;
        continue;
      }
      const close = matchingBrace(css, boundary.index);
      if (close < 0) break;
      const prelude = css.slice(index, boundary.index).trim();
      const name = prelude.match(/^@([\w-]+)/)?.[1]?.toLowerCase() || "";
      if (STYLE_GROUP_RULES.has(name)) {
        const inner = scopeStyleCSS(css.slice(boundary.index + 1, close), scopeId);
        if (inner) output += `${prelude}{${inner}}`;
      }
      index = close + 1;
      continue;
    }
    const boundary = nextRuleBoundary(css, index);
    if (!boundary || boundary.char !== "{") break;
    const close = matchingBrace(css, boundary.index);
    if (close < 0) break;
    const body = css.slice(boundary.index + 1, close);
    if (!hasDeclarationsBlock(body)) {
      const selectors = splitSelectorList(css.slice(index, boundary.index))
        .map((selector) => scopedSelector(selector, scopeId))
        .filter(Boolean);
      if (selectors.length) output += `${selectors.join(",")}{${body}}`;
    }
    index = close + 1;
  }
  return output;
}

function safeStyleScopeId(value) {
  const id = String(value || "");
  return /^[A-Za-z_][A-Za-z0-9_-]*$/.test(id) ? id : "";
}

export function sanitizeMermaidSource(source) {
  const { bom, frontmatter, body } = splitFrontmatter(String(source || ""));
  let blocked = false;
  const stripped = body.replace(DIRECTIVE_RE, (directive) => {
    if (SECURITY_RE.test(directive)) {
      blocked = true;
      return "";
    }
    return safeInitDirective(directive);
  });
  if (blocked) return null;
  const cleaned = `${bom}${frontmatter}${stripClickStatements(stripped)}`.trim();
  return cleaned || null;
}

export function sanitizeSvgMarkup(markup) {
  if (typeof DOMParser !== "function" || typeof XMLSerializer !== "function") {
    throw new Error("gpt-mermaid: DOMParser/XMLSerializer is required");
  }
  const doc = new DOMParser().parseFromString(String(markup || ""), "image/svg+xml");
  const root = doc.documentElement;
  if (doc.querySelector("parsererror") || root?.localName !== "svg") {
    throw new Error("gpt-mermaid: renderer returned invalid SVG");
  }
  const styleScopeId = safeStyleScopeId(root.getAttribute("id"));
  for (const node of [root, ...root.querySelectorAll("*")]) {
    if (node.namespaceURI !== SVG_NS || DENY_TAGS.has(node.localName) || !SVG_TAGS.has(node.localName)) {
      node.remove();
      continue;
    }
    for (const attribute of [...node.attributes]) {
      const name = attribute.name;
      const localName = attribute.localName || name.split(":").pop();
      const value = attribute.value;
      if (/^on/i.test(localName) || localName === "srcset" || localName === "ping"
          || (localName === "base" && attribute.namespaceURI === XML_NS)) {
        removeAttribute(node, attribute);
        continue;
      }
      if (localName === "href" || name.endsWith(":href")) {
        if ((attribute.namespaceURI && attribute.namespaceURI !== XLINK_NS) || !safeURL(value)) {
          removeAttribute(node, attribute);
        }
        continue;
      }
      if (localName === "src" && (attribute.namespaceURI || !safeURL(value))) {
        removeAttribute(node, attribute);
        continue;
      }
      if (localName === "style") {
        if (attribute.namespaceURI) {
          removeAttribute(node, attribute);
          continue;
        }
        const safe = safeCSS(value);
        if (safe) node.setAttribute("style", safe);
        else removeAttribute(node, attribute);
        continue;
      }
      if (/url\s*\(/i.test(value) && !safeCSS(value)) removeAttribute(node, attribute);
    }
    if (node.localName === "style") {
      const safe = safeCSS(node.textContent);
      const scoped = safe && styleScopeId ? scopeStyleCSS(safe, styleScopeId) : "";
      if (scoped) node.textContent = scoped;
      else node.remove();
    }
  }
  return new XMLSerializer().serializeToString(root);
}

export function svgSize(markup) {
  const doc = new DOMParser().parseFromString(String(markup || ""), "image/svg+xml");
  const root = doc.documentElement;
  const viewBox = (root.getAttribute("viewBox") || "").trim().split(/[ ,]+/).map(Number);
  const positive = (value, fallback) => Number.isFinite(value) && value > 0 ? Math.min(100000, value) : fallback;
  const width = positive(viewBox.length === 4 ? viewBox[2] : Number(root.getAttribute("width")), 800);
  const height = positive(viewBox.length === 4 ? viewBox[3] : Number(root.getAttribute("height")), 500);
  return { width, height };
}
