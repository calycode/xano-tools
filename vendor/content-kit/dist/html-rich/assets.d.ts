/**
 * The assets a rich HTML article needs to come alive.
 *
 * The core HTML renderer is deliberately static: no scripts, no diagram library. A rich article
 * wants more — a client enhancer for terminal animation, Mermaid rendering, code copy and image
 * zoom — and that enhancer is a file the consumer serves, not something the renderer injects.
 * This module is the contract between the two: the renderer reports which assets a document
 * needs, and the consumer decides where they are served from and how they are loaded.
 */
export type RichAsset = {
    type: 'script';
    src: string;
    async?: boolean;
    defer?: boolean;
    key: string;
} | {
    type: 'style';
    href: string;
    key: string;
} | {
    type: 'inline-script';
    code: string;
    key: string;
};
export interface RichRenderContext {
    /** Assets collected while the document is transformed and rendered, keyed for de-duplication. */
    assets: Map<string, RichAsset>;
    /** Where the client enhancer (`rich-enhance.js`) is served from. */
    enhanceSrc: string;
    /** Where the Mermaid library is loaded from. */
    mermaidSrc: string;
}
/** Mermaid is loaded from a CDN by default; a consumer can vendor it and override. */
export declare const MERMAID_LIBRARY_SRC = "https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.min.js";
/** Where `renderRichHtml` expects the consumer to serve the packaged enhancer and stylesheet. */
export declare const RICH_ENHANCE_SRC = "/rich-enhance.js";
export declare const RICH_STYLESHEET_HREF = "/rich.css";
export declare function createRichContext(options?: {
    enhanceSrc?: string;
    mermaidSrc?: string;
}): RichRenderContext;
export declare function registerAsset(ctx: RichRenderContext, asset: RichAsset): void;
/** Registered once, the first time a component that the enhancer touches is rendered. */
export declare function registerEnhancer(ctx: RichRenderContext): void;
/** Only registered when a document actually contains a diagram. */
export declare function registerMermaid(ctx: RichRenderContext): void;
//# sourceMappingURL=assets.d.ts.map