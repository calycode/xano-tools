import type { ContentComponents } from '../render.js';
/**
 * The rich Preact components: the same component names, with the features the lean defaults
 * deliberately leave out — a copy button on code, and a rendered, pan/zoomable Mermaid diagram.
 *
 * This is a separate entry point (`content-kit/preact/rich`) because it pulls in
 * `beautiful-mermaid` and `DOMPurify`. A consumer that only wants the lean core never pays for
 * them; a consumer that opts in gets them without touching the schema.
 *
 * Usage:
 *
 *     import { renderToPreact } from '@calycode/content-kit/preact';
 *     import { richPreactComponents } from '@calycode/content-kit/preact/rich';
 *
 *     renderToPreact(tree, richPreactComponents);
 */
export declare function RichCodeBlock(props: {
    code?: string;
    language?: string;
    displayName?: string;
}): import("preact").JSX.Element;
export declare function RichMermaid(props: {
    chart?: string;
}): import("preact").JSX.Element;
/** The lean defaults, with the featureful code block and diagram swapped in. */
export declare const richPreactComponents: ContentComponents;
//# sourceMappingURL=index.d.ts.map