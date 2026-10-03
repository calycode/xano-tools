import { type RichAsset } from './assets.js';
/**
 * A rich HTML article: the same document model the lean renderer draws, with the article's own
 * markup, plus the list of assets the page must load to make the terminal animate and the
 * diagram draw.
 *
 * This is the HTML counterpart of `@calycode/content-kit/preact/rich`. The consumer is expected
 * to serve the packaged `rich-enhance.js` and `rich.css` (see the package `assets/`), then load
 * the returned `assets` — styles first, scripts after the markup is in the DOM.
 */
export interface RichRenderOptions {
    /** Where the stylesheet is served from. Default: `/rich.css`. */
    stylesheetHref?: string;
    /** Where the client enhancer is served from. Default: `/rich-enhance.js`. */
    enhanceSrc?: string;
    /** Where the Mermaid library is loaded from. Default: the jsDelivr CDN. */
    mermaidSrc?: string;
}
export interface RichRenderResult {
    html: string;
    assets: RichAsset[];
}
export declare function renderRichHtml(content: string, options?: RichRenderOptions): RichRenderResult;
//# sourceMappingURL=render.d.ts.map