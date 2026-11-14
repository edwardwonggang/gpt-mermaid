const { createGPTMermaid } = require("./factory.js");

const baseUrl = typeof __dirname === "string" ? `file://${__dirname}/` : "http://localhost/";
module.exports = createGPTMermaid(globalThis, baseUrl);
