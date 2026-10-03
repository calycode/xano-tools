import { Fragment as _Fragment, jsx as _jsx } from "preact/jsx-runtime";
import { tokenize } from '../prism.js';
/**
 * Code, highlighted, as components rather than as an HTML string.
 *
 * Prism can hand back either, and the string form is what forces a `dangerouslySetInnerHTML` sink
 * into the renderer. Tokenizing instead means the same highlighted code is reachable from both
 * adapters — here as VNodes, in the blog as Markdoc tags — with nothing injected anywhere.
 */
export function HighlightedCode({ code, language }) {
    const tokens = tokenize(code, language);
    if (!tokens)
        return _jsx(_Fragment, { children: code });
    return _jsx(_Fragment, { children: tokens.map((token, index) => toNode(token, index)) });
}
function toNode(token, key) {
    if (typeof token === 'string')
        return token;
    const children = Array.isArray(token.content)
        ? token.content.map((child, index) => toNode(child, index))
        : String(token.content);
    return (_jsx("span", { class: `token ${token.type}`, children: children }, key));
}
//# sourceMappingURL=highlighted-code.js.map