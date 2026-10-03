import Markdoc from '@markdoc/markdoc';
/**
 * Prism tokens as Markdoc tags, so highlighted code can be rendered to HTML rather than to an HTML
 * string. The counterpart of the Preact adapter's `HighlightedCode`, over the same tokens.
 *
 * This lives in its own module so both `html.ts` and the default HTML components can import it
 * without a cycle: `html.ts` imports the defaults, so the defaults must not import `html.ts` at
 * runtime — only for types.
 */
export function tokensToTags(tokens) {
    return tokens.map((token) => {
        if (typeof token === 'string')
            return token;
        const children = typeof token.content === 'string'
            ? [token.content]
            : Array.isArray(token.content)
                ? tokensToTags(token.content)
                : tokensToTags([token.content]);
        return new Markdoc.Tag('span', { class: `token ${token.type}` }, children);
    });
}
//# sourceMappingURL=prism-tags.js.map