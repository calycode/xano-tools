import Markdoc from '@markdoc/markdoc';
import * as preact from 'preact';
import { defaultPreactComponents } from './default-components.js';
/**
 * Draws the tree as VNodes. `components` is optional and merged over `defaultPreactComponents`,
 * so a consumer can pass nothing for the standard rendering, or pass only the components it wants
 * to change.
 */
export function renderToPreact(tree, components) {
    if (tree === null || tree === undefined)
        return null;
    const resolved = components ? { ...defaultPreactComponents, ...components } : defaultPreactComponents;
    // Markdoc types this parameter as React's `createElement` overloads and its components as
    // React's `ComponentType`, neither of which Preact's are assignable to on paper. At runtime
    // the renderer only calls `createElement`, reads `Fragment`, and resolves component names, so
    // the casts are the honest description of what it actually needs.
    const runtime = preact;
    const options = { components: resolved };
    return Markdoc.renderers.react(tree, runtime, options);
}
//# sourceMappingURL=render.js.map