import Markdoc from '@markdoc/markdoc';
import { sanitizeUrl } from './url.js';
/**
 * Turns bare URLs in text into links.
 *
 * Markdoc parses with markdown-it's `linkify` off and offers no way to turn it on, so
 * `https://example.com` stays plain text. This is done on the **renderable tree** rather than as
 * a pre-pass on the source, which is what makes it safe: by this point code fences have already
 * become component attributes, and links and inline code are already their own tags, so only
 * genuine prose text is ever rewritten.
 */
const BARE_URL = /\bhttps?:\/\/[^\s<>"'`]+/g;
/** A sentence's punctuation is not part of its URL. */
const TRAILING_PUNCTUATION = /[.,;:!?]+$/;
/** Tags whose text must be left exactly as written. */
const OPAQUE = new Set(['a', 'code', 'pre']);
/** The same tree, with any bare URL in its prose turned into a link. */
export function linkifyTree(node) {
    if (node === null || node === undefined)
        return node;
    if (Array.isArray(node))
        return node.map((child) => linkifyNode(child));
    return linkifyNode(node);
}
function linkifyNode(node) {
    if (typeof node === 'string')
        return node;
    const tag = node;
    if (tag?.$$mdtype !== 'Tag')
        return node;
    if (OPAQUE.has(tag.name))
        return tag;
    const children = [];
    for (const child of tag.children) {
        if (typeof child === 'string') {
            children.push(...splitText(child));
        }
        else {
            children.push(linkifyNode(child));
        }
    }
    return new Markdoc.Tag(tag.name, tag.attributes, children);
}
/** The text as it was, with each bare URL replaced by a link to it. */
function splitText(text) {
    const matches = [...text.matchAll(BARE_URL)];
    if (matches.length === 0)
        return [text];
    const parts = [];
    let cursor = 0;
    for (const match of matches) {
        const start = match.index ?? 0;
        const trailing = TRAILING_PUNCTUATION.exec(match[0])?.[0] ?? '';
        const url = match[0].slice(0, match[0].length - trailing.length);
        if (!url)
            continue;
        parts.push(text.slice(cursor, start));
        parts.push(new Markdoc.Tag('a', { href: sanitizeUrl(url), target: '_blank', rel: 'noopener noreferrer' }, [url]));
        parts.push(trailing);
        cursor = start + match[0].length;
    }
    parts.push(text.slice(cursor));
    return parts.filter((part) => part !== '');
}
//# sourceMappingURL=linkify.js.map