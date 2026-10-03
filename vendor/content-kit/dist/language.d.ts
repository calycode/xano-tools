/**
 * The single language vocabulary shared by every rendered surface.
 *
 * Four implementations used to answer "what language is this?" differently: the chat resolved
 * fence aliases and then guessed from the code, tool output guessed again on its own, and file
 * previews mapped extensions — each with its own idea of what "unknown" meant (`undefined` in
 * some, the string `'text'` in others). This module owns the one answer.
 *
 * It is deliberately grammar-free. Whether a language can actually be highlighted is Prism's
 * question, asked in ./prism — so inference stays pure, and testable without a highlighter.
 */
export type InferLanguageSource = {
    /** The fence label, as the author wrote it — `ts`, `sh`, `c++`. */
    language?: string | undefined;
    /** A file name, for content that arrives as a file. */
    filename?: string | undefined;
    /** The content itself, when nothing else says. */
    code?: string | undefined;
};
/** Resolves a label to the id a grammar is registered under. Unknown labels pass through. */
export declare function resolveLanguageAlias(language?: string): string | undefined;
/**
 * Infers the language of a piece of content, most trustworthy signal first: what the author
 * labelled it, then its file name, then the content itself. Returns `undefined` when nothing
 * says — an unknown language is a real answer, not the string `'text'`.
 */
export declare function inferLanguage(source: InferLanguageSource): string | undefined;
/** How to name a language in a code-block header, e.g. `js` and `javascript` both give `JavaScript`. */
export declare function languageDisplayName(language?: string, fallback?: string): string;
//# sourceMappingURL=language.d.ts.map