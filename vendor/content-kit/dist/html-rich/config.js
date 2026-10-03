import Markdoc from '@markdoc/markdoc';
import { FENCE_ATTRIBUTES, createContentConfig, transformFence } from '../schema.js';
import { sanitizeUrl } from '../url.js';
import { registerEnhancer } from './assets.js';
/**
 * The rich article schema: the shared document model with the few nodes whose *article* markup
 * differs.
 *
 * The difference is deliberate and small. A terminal fence (` ```term {% anim=true %} `) is a
 * product vocabulary the shared schema does not know, so it is added here and resolves to a
 * `Terminal` component the rich renderer draws. Headings drop the transcript sizing the shared
 * default carries, and links carry the `data-preview-link` hook the enhancer reads. Everything
 * else — diagrams, alerts, highlighted code, images — is the shared logic, untouched.
 */
export function createRichConfig(ctx) {
    return createContentConfig({
        nodes: {
            heading: {
                attributes: { level: { type: Number } },
                transform(node, config) {
                    const { level } = node.transformAttributes(config);
                    return new Markdoc.Tag(`h${level}`, {}, node.transformChildren(config));
                },
            },
            fence: {
                attributes: {
                    ...FENCE_ATTRIBUTES,
                    anim: { type: Boolean, default: false },
                    process: { type: Boolean, render: false, default: false },
                },
                transform(node, config) {
                    if (node.attributes?.language === 'term') {
                        // A terminal is named as a component, and the adapter draws it — same seam as
                        // every other fence, so the enhancer asset is registered by the component.
                        return new Markdoc.Tag('Terminal', {
                            content: String(node.attributes?.content ?? ''),
                            anim: Boolean(node.attributes?.anim),
                        });
                    }
                    // A diagram, an alert, or highlighted code — all shared.
                    return transformFence(node, config);
                },
            },
            link: {
                attributes: {
                    href: { type: String },
                    title: { type: String, default: '' },
                },
                transform(node, config) {
                    const attrs = node.transformAttributes(config);
                    registerEnhancer(ctx);
                    return new Markdoc.Tag('a', {
                        href: sanitizeUrl(attrs.href),
                        title: attrs.title || undefined,
                        target: '_blank',
                        rel: 'noopener noreferrer',
                        class: 'md-link',
                        'data-preview-link': sanitizeUrl(attrs.href),
                    }, node.transformChildren(config));
                },
            },
        },
    });
}
//# sourceMappingURL=config.js.map