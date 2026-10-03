import type { RenderableTreeNodes } from '@markdoc/markdoc';
import type { ComponentType, VNode } from 'preact';
/**
 * Draws a renderable tree as Preact VNodes.
 *
 * Markdoc's React renderer takes the runtime as an argument and imports React only as a type, so
 * passing Preact here produces real VNodes with no DOM and no HTML string. Component tags are
 * resolved from `components` by name, which is why a target that wants different markup supplies
 * different components rather than a different schema.
 */
/**
 * The components a target supplies for the schema's component tags. Props are left open because
 * each component reads only the attributes its own tag carries.
 */
export type ContentComponents = Record<string, ComponentType<any>>;
/**
 * Draws the tree as VNodes. `components` is optional and merged over `defaultPreactComponents`,
 * so a consumer can pass nothing for the standard rendering, or pass only the components it wants
 * to change.
 */
export declare function renderToPreact(tree: RenderableTreeNodes, components?: ContentComponents): VNode | null;
//# sourceMappingURL=render.d.ts.map