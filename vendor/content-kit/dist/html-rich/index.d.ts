/**
 * content-kit/html/rich — the article's rich HTML rendering.
 *
 * The lean `@calycode/content-kit` entry renders a document with clean, minimal defaults. This
 * entry adds the article opinions the blog needs: `md-*` markup, a terminal fence, and the asset
 * contract for the client enhancer that animates the terminal, draws Mermaid diagrams, and wires
 * code copy and image zoom.
 *
 *     import { renderRichHtml } from '@calycode/content-kit/html/rich';
 *
 *     const { html, assets } = renderRichHtml(source);
 */
export type { RichAsset, RichRenderContext } from './assets.js';
export { MERMAID_LIBRARY_SRC, RICH_ENHANCE_SRC, RICH_STYLESHEET_HREF, createRichContext, registerAsset, registerEnhancer, registerMermaid, } from './assets.js';
export { createTerminal, richHtmlComponents } from './components.js';
export { createRichConfig } from './config.js';
export type { RichRenderOptions, RichRenderResult } from './render.js';
export { renderRichHtml } from './render.js';
//# sourceMappingURL=index.d.ts.map