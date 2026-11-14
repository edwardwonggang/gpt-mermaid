# Security policy

## Supported versions

The latest published release receives security fixes.

## Reporting

Please do not open a public issue for a suspected vulnerability. Use GitHub's
private vulnerability reporting for this repository and include:

- affected version;
- a minimal HTML or JavaScript reproduction;
- whether the issue requires untrusted diagram source;
- browser and operating system;
- expected impact and any suggested mitigation.

## Rendering model

Mermaid source is untrusted input. The wrapper enforces `securityLevel: "strict"`,
strips `click` directives and inline `securityLevel` overrides, and applies an SVG
allowlist sanitizer before displaying the result. It does not load remote images
or external styles at runtime.

Consumers should still host the package and runtime from a trusted origin and
apply their normal CSP.
