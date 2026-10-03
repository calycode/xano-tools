import type { RenderableTreeNode, RenderableTreeNodes } from '@markdoc/markdoc';
/**
 * The HTML adapter: the same renderable tree, drawn as markup.
 *
 * The tree is shared; only the markup is not. A component tag is resolved through the map a
 * target hands in — merged over the clean defaults in `./html-defaults` — which is the one place
 * the two targets genuinely differ, and naming it here keeps the difference visible rather than
 * hidden in a second parser.
 *
 * Markdoc's HTML renderer escapes text and attribute values, so nothing a document contains can
 * become markup. A component renderer is responsible for its own attributes, and the schema
 * already sanitizes every URL it puts in one.
 */
/** What a target supplies for one component tag: attributes in, markup out. */
export type HtmlComponent = (attributes: Record<string, unknown>, children: RenderableTreeNode[]) => RenderableTreeNode;
export type HtmlComponents = Record<string, HtmlComponent>;
/** Re-exported so a consumer can compose tokens themselves without a second import path. */
export { tokensToTags } from './prism-tags.js';
/**
 * Renders a tree to markup. `components` is optional and merged over the defaults, so a consumer
 * that wants the standard rendering — or only wants to replace a single component — passes
 * nothing, or passes just the overrides.
 */
export declare function renderToHtml(tree: RenderableTreeNodes, components?: HtmlComponents): string;
//# sourceMappingURL=html.d.ts.map