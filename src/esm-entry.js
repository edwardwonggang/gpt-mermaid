import { createGPTMermaid } from "./factory.js";

const baseUrl = new URL(".", import.meta.url).href;
const api = createGPTMermaid(globalThis, baseUrl);
export default api;
export const version = api.version;
export const presets = api.presets;
export const configure = api.configure;
export const renderSvg = api.renderSvg;
export const sanitizeSource = api.sanitizeSource;
export const sanitizeSvg = api.sanitizeSvg;
export const mount = api.mount;
export const render = api.render;
export const renderAll = api.renderAll;
export const autoRender = api.autoRender;
export const destroy = api.destroy;
