/**
 * URL safety for rendered content.
 *
 * Markdoc escapes text and attribute values, but it does not police URL schemes — a
 * `[click](javascript:…)` in a message would render a live `javascript:` href. So every link and
 * image the model produces is passed through here first.
 */
/** A link that is safe to follow, or the fallback. */
export declare function sanitizeUrl(url: string | undefined, fallback?: string): string;
/** An image that is safe to load, or the fallback. Allows inline data images, and only those. */
export declare function sanitizeImageUrl(url: string | undefined, fallback?: string): string;
//# sourceMappingURL=url.d.ts.map