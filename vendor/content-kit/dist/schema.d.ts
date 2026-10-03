import type { Config, Node, RenderableTreeNode } from '@markdoc/markdoc';
/** The alert kinds the fence and the tag both accept. */
export declare const ALERT_TYPES: readonly ["note", "tip", "important", "warning", "caution"];
export type AlertType = (typeof ALERT_TYPES)[number];
export type ContentConfig = Config;
/** The attributes a fence carries, shared so a target can extend the node without restating them. */
export declare const FENCE_ATTRIBUTES: {
    language: {
        type: StringConstructor;
    };
    content: {
        type: StringConstructor;
        render: boolean;
    };
};
/**
 * A code fence, resolved: a diagram, an alert, or a highlighted code block. Exported so a target
 * can add its own fence syntax and delegate the rest here rather than copying the logic.
 */
export declare function transformFence(node: Node, config: Config): RenderableTreeNode;
/**
 * The shared schema, optionally extended by a target that needs more. `overrides` are merged over
 * the shared nodes and tags, so a target can replace one without losing the rest.
 */
export declare function createContentConfig(overrides?: Partial<Config>): ContentConfig;
//# sourceMappingURL=schema.d.ts.map