/**
 * The assets a rich HTML article needs to come alive.
 *
 * The core HTML renderer is deliberately static: no scripts, no diagram library. A rich article
 * wants more — a client enhancer for terminal animation, Mermaid rendering, code copy and image
 * zoom — and that enhancer is a file the consumer serves, not something the renderer injects.
 * This module is the contract between the two: the renderer reports which assets a document
 * needs, and the consumer decides where they are served from and how they are loaded.
 */
/** Mermaid is loaded from a CDN by default; a consumer can vendor it and override. */
export const MERMAID_LIBRARY_SRC = 'https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.min.js';
/** Where `renderRichHtml` expects the consumer to serve the packaged enhancer and stylesheet. */
export const RICH_ENHANCE_SRC = '/rich-enhance.js';
export const RICH_STYLESHEET_HREF = '/rich.css';
export function createRichContext(options = {}) {
    return {
        assets: new Map(),
        enhanceSrc: options.enhanceSrc ?? RICH_ENHANCE_SRC,
        mermaidSrc: options.mermaidSrc ?? MERMAID_LIBRARY_SRC,
    };
}
export function registerAsset(ctx, asset) {
    ctx.assets.set(asset.key, asset);
}
/** Registered once, the first time a component that the enhancer touches is rendered. */
export function registerEnhancer(ctx) {
    registerAsset(ctx, { type: 'script', key: 'rich-enhance', src: ctx.enhanceSrc, defer: true });
}
/** Only registered when a document actually contains a diagram. */
export function registerMermaid(ctx) {
    registerAsset(ctx, { type: 'script', key: 'rich-mermaid', src: ctx.mermaidSrc, defer: true });
}
//# sourceMappingURL=assets.js.map