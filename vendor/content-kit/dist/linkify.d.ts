import type { RenderableTreeNode } from '@markdoc/markdoc';
/** The same tree, with any bare URL in its prose turned into a link. */
export declare function linkifyTree(node: RenderableTreeNodes): RenderableTreeNodes;
type RenderableTreeNodes = RenderableTreeNode | RenderableTreeNode[] | null;
export {};
//# sourceMappingURL=linkify.d.ts.map