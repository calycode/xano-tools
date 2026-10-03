/**
 * content-kit — one document model, rendered to more than one target.
 *
 * The chat renders the model to Preact VNodes and the blog renders it to static HTML, so the
 * same code, diagrams, images, and links look the same in both. Everything here is free of app
 * imports: it knows about Markdoc, Prism, and nothing about this application, so it can be
 * lifted out as a standalone package later.
 *
 * The Preact adapter is on `./preact`, so a consumer that only wants HTML never pulls Preact in.
 */
export type { InferLanguageSource } from './language.js';
export { inferLanguage, languageDisplayName } from './language.js';
export { resolveGrammar, tokenize } from './prism.js';
export { sanitizeImageUrl, sanitizeUrl } from './url.js';
export type { Content } from './model.js';
export { parse, toRenderable } from './model.js';
/** What `toRenderable` produces and `renderToPreact` consumes — the tree that crosses the seam. */
export type { RenderableTreeNodes } from '@markdoc/markdoc';
export type { AlertType, ContentConfig } from './schema.js';
export { ALERT_TYPES, FENCE_ATTRIBUTES, createContentConfig, transformFence } from './schema.js';
export type { HtmlComponent, HtmlComponents } from './html.js';
export { renderToHtml, tokensToTags } from './html.js';
export { defaultHtmlComponents } from './html-defaults.js';
export type { ZoomPan } from './zoom-pan.js';
export { IDENTITY, MAX_SCALE, MIN_SCALE, ZOOM_STEP, clampScale, panBy, reset, toPercent, toTransform, zoomByWheel, zoomIn, zoomOut, } from './zoom-pan.js';
//# sourceMappingURL=index.d.ts.map