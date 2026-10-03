import type { Node, RenderableTreeNodes } from '@markdoc/markdoc';
import { type ContentConfig } from './schema.js';
/**
 * The document model, and the step that turns it into something renderable.
 *
 * These two steps are separate on purpose: `toRenderable` is the one that costs anything on a
 * long document, so it is the one worth running in a worker. The tree it returns is plain data,
 * which is what lets it cross that boundary and be rendered on the other side.
 */
/** The one document model every adapter renders. */
export type Content = Node;
/** Parses Markdown/Markdoc into that model. */
export declare function parse(markdown: string): Content;
/** Parses and resolves a document into the renderable tree an adapter draws. */
export declare function toRenderable(markdown: string, config?: ContentConfig): RenderableTreeNodes;
//# sourceMappingURL=model.d.ts.map