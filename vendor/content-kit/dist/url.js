/**
 * URL safety for rendered content.
 *
 * Markdoc escapes text and attribute values, but it does not police URL schemes — a
 * `[click](javascript:…)` in a message would render a live `javascript:` href. So every link and
 * image the model produces is passed through here first.
 */
const SAFE_LINK_SCHEMES = new Set(['http:', 'https:', 'mailto:', 'tel:']);
const SAFE_IMAGE_SCHEMES = new Set(['http:', 'https:']);
function schemeOf(url) {
    try {
        // A relative URL resolves against a base and keeps its own scheme, so this reports the
        // scheme without rejecting relative paths.
        return new URL(url, 'https://localhost').protocol;
    }
    catch {
        return undefined;
    }
}
/** A link that is safe to follow, or the fallback. */
export function sanitizeUrl(url, fallback = '#') {
    if (!url)
        return fallback;
    const scheme = schemeOf(url);
    if (!scheme)
        return fallback;
    return SAFE_LINK_SCHEMES.has(scheme) ? url : fallback;
}
/** An image that is safe to load, or the fallback. Allows inline data images, and only those. */
export function sanitizeImageUrl(url, fallback = '') {
    if (!url)
        return fallback;
    const scheme = schemeOf(url);
    if (!scheme)
        return fallback;
    if (scheme === 'data:')
        return /^data:image\//i.test(url) ? url : fallback;
    return SAFE_IMAGE_SCHEMES.has(scheme) ? url : fallback;
}
//# sourceMappingURL=url.js.map