/* 职责：清理 Mermaid 源码指令与输出 SVG，保证浏览器内渲染不加载外部资源。 */

const DIRECTIVE_RE = /%%\{[\s\S]*?\}%%/g;
const INIT_RE = /^%%\{\s*(?:init|initialize)\s*:\s*(\{[\s\S]*\})\s*\}%%$/i;
const SECURITY_RE = /["']?securityLevel["']?\s*:/i;
const CLICK_RE = /^\s*click\s+.*$/gim;
const SVG_NS = "http://www.w3.org/2000/svg";

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

export function sanitizeMermaidSource(source) {
  let blocked = false;
  const stripped = String(source || "").replace(DIRECTIVE_RE, (directive) => {
    if (SECURITY_RE.test(directive)) {
      blocked = true;
      return "";
    }
    return safeInitDirective(directive);
  });
  if (blocked) return null;
  const cleaned = stripped.replace(CLICK_RE, "").trim();
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
  for (const node of [root, ...root.querySelectorAll("*")]) {
    if (node.namespaceURI !== SVG_NS || DENY_TAGS.has(node.localName) || !SVG_TAGS.has(node.localName)) {
      node.remove();
      continue;
    }
    for (const attribute of [...node.attributes]) {
      const name = attribute.name;
      const value = attribute.value;
      if (/^on/i.test(name) || name === "srcset" || name === "xml:base") {
        node.removeAttribute(name);
        continue;
      }
      if (["href", "xlink:href", "src"].includes(name) && !safeURL(value)) {
        node.removeAttribute(name);
        continue;
      }
      if (name === "style") {
        const safe = safeCSS(value);
        if (safe) node.setAttribute("style", safe);
        else node.removeAttribute("style");
        continue;
      }
      if (/url\s*\(/i.test(value) && !safeCSS(value)) node.removeAttribute(name);
    }
    if (node.localName === "style") {
      const safe = safeCSS(node.textContent);
      if (safe) node.textContent = safe;
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
