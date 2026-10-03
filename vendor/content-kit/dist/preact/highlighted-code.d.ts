/**
 * Code, highlighted, as components rather than as an HTML string.
 *
 * Prism can hand back either, and the string form is what forces a `dangerouslySetInnerHTML` sink
 * into the renderer. Tokenizing instead means the same highlighted code is reachable from both
 * adapters — here as VNodes, in the blog as Markdoc tags — with nothing injected anywhere.
 */
export declare function HighlightedCode({ code, language }: {
    code: string;
    language?: string;
}): import("preact").JSX.Element;
//# sourceMappingURL=highlighted-code.d.ts.map