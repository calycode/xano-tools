import Markdoc from '@markdoc/markdoc';
import { defaultHtmlComponents } from './html-defaults.js';
/** Re-exported so a consumer can compose tokens themselves without a second import path. */
export { tokensToTags } from './prism-tags.js';
/**
 * Renders a tree to markup. `components` is optional and merged over the defaults, so a consumer
 * that wants the standard rendering — or only wants to replace a single component — passes
 * nothing, or passes just the overrides.
 */
export function renderToHtml(tree, components) {
    const resolved = components ? { ...defaultHtmlComponents, ...components } : defaultHtmlComponents;
    return Markdoc.renderers.html(resolveComponents(tree, resolved)) ?? '';
}
function resolveComponents(node, components) {
    if (node === null || node === undefined)
        return node;
    if (Array.isArray(node))
        return node.map((child) => resolveNode(child, components));
    return resolveNode(node, components);
}
function resolveNode(node, components) {
    if (typeof node === 'string')
        return node;
    const tag = node;
    if (tag?.$$mdtype !== 'Tag')
        return node;
    const children = tag.children.map((child) => resolveNode(child, components));
    const render = isComponentName(tag.name) ? components[tag.name] : undefined;
    // An unresolved component is left alone rather than dropped, so a missing renderer shows up
    // as a literal element instead of silently losing the content.
    if (!render)
        return new Markdoc.Tag(tag.name, tag.attributes, children);
    return render(tag.attributes, children);
}
/** Markdoc's convention: an uppercase tag name is a component, a lowercase one is an element. */
function isComponentName(name) {
    const first = name[0];
    return first !== undefined && first === first.toUpperCase() && first !== first.toLowerCase();
}
//# sourceMappingURL=html.js.map