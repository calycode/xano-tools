import type { RenderableTreeNode } from '@markdoc/markdoc';
import type { Token } from 'prismjs';
/**
 * Prism tokens as Markdoc tags, so highlighted code can be rendered to HTML rather than to an HTML
 * string. The counterpart of the Preact adapter's `HighlightedCode`, over the same tokens.
 *
 * This lives in its own module so both `html.ts` and the default HTML components can import it
 * without a cycle: `html.ts` imports the defaults, so the defaults must not import `html.ts` at
 * runtime — only for types.
 */
export declare function tokensToTags(tokens: readonly (string | Token)[]): RenderableTreeNode[];
//# sourceMappingURL=prism-tags.d.ts.map