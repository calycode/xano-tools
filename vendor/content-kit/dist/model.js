import Markdoc from '@markdoc/markdoc';
import { linkifyTree } from './linkify.js';
import { createContentConfig } from './schema.js';
/** Parses Markdown/Markdoc into that model. */
export function parse(markdown) {
    return Markdoc.parse(markdown);
}
/** Parses and resolves a document into the renderable tree an adapter draws. */
export function toRenderable(markdown, config = createContentConfig()) {
    return linkifyTree(Markdoc.transform(Markdoc.parse(markdown), config));
}
//# sourceMappingURL=model.js.map