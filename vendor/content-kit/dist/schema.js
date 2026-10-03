import Markdoc from '@markdoc/markdoc';
import { inferLanguage, languageDisplayName } from './language.js';
import { sanitizeImageUrl, sanitizeUrl } from './url.js';
/**
 * The one schema: how a document model's nodes become renderable tags.
 *
 * Everything interactive becomes a **component tag** — an uppercase name like `CodeBlock` or
 * `Mermaid` — which each adapter resolves its own way: the Preact adapter from the `components`
 * map it is handed, the HTML adapter from its own mapping. That is the one seam that cannot be
 * collapsed, and naming the components here is what keeps the two targets honest about it.
 *
 * Nothing here imports the app, and nothing here produces HTML, so there is no HTML to inject.
 */
/** Headings get a size per level, so a transcript reads like prose rather than a web page. */
const HEADING_CLASS = {
    1: 'text-xl font-semibold mt-4 mb-2 first:mt-0',
    2: 'text-lg font-semibold mt-4 mb-2',
    3: 'text-base font-semibold mt-3 mb-1.5',
    4: 'text-sm font-semibold mt-3 mb-1',
    5: 'text-sm font-semibold mt-2 mb-1',
    6: 'text-sm font-semibold mt-2 mb-1',
};
/** The alert kinds the fence and the tag both accept. */
export const ALERT_TYPES = ['note', 'tip', 'important', 'warning', 'caution'];
/** The attributes a fence carries, shared so a target can extend the node without restating them. */
export const FENCE_ATTRIBUTES = {
    language: { type: String },
    content: { type: String, render: false },
};
/**
 * A code fence, resolved: a diagram, an alert, or a highlighted code block. Exported so a target
 * can add its own fence syntax and delegate the rest here rather than copying the logic.
 */
export function transformFence(node, config) {
    const attrs = node.transformAttributes(config);
    // The fence body is declared `render: false`, so it is deliberately absent from the
    // transformed attributes and has to be read off the node itself.
    const code = node.attributes?.content ?? '';
    const language = attrs.language ?? '';
    if (language === 'mermaid') {
        return new Markdoc.Tag('Mermaid', { chart: code.trim() });
    }
    // `alert` fences are what transcripts already contain, so the fence form stays working
    // alongside the `{% alert %}` tag.
    if (language === 'alert') {
        const [first = '', ...rest] = code.split('\n');
        return new Markdoc.Tag('Alert', {
            type: normaliseAlertType(first.trim()),
            content: rest.join('\n').trim(),
        });
    }
    const resolved = inferLanguage({ language, code });
    return new Markdoc.Tag('CodeBlock', {
        code,
        language: resolved ?? '',
        // The label as written, for a target whose markup depends on it.
        label: language || resolved || '',
        displayName: languageDisplayName(language || resolved),
    });
}
/**
 * The shared schema, optionally extended by a target that needs more. `overrides` are merged over
 * the shared nodes and tags, so a target can replace one without losing the rest.
 */
export function createContentConfig(overrides = {}) {
    return {
        nodes: {
            heading: {
                attributes: {
                    level: { type: Number },
                },
                transform(node, config) {
                    const { level } = node.transformAttributes(config);
                    return new Markdoc.Tag(`h${level}`, { class: HEADING_CLASS[level] }, node.transformChildren(config));
                },
            },
            fence: {
                attributes: FENCE_ATTRIBUTES,
                transform: transformFence,
            },
            item: {
                transform(node, config) {
                    const children = node.transformChildren(config);
                    const checked = takeTaskMarker(children);
                    if (checked === undefined)
                        return new Markdoc.Tag('li', {}, children);
                    // `checked` is only present when true: the HTML renderer would emit
                    // `checked="false"`, which is truthy to a browser.
                    return new Markdoc.Tag('li', { class: 'flex items-start gap-2' }, [
                        new Markdoc.Tag('input', {
                            type: 'checkbox',
                            disabled: true,
                            class: 'mt-1',
                            ...(checked ? { checked: true } : {}),
                        }),
                        new Markdoc.Tag('span', {}, children),
                    ]);
                },
            },
            image: {
                attributes: {
                    src: { type: String },
                    alt: { type: String, default: '' },
                    title: { type: String, default: '' },
                },
                transform(node, config) {
                    const attrs = node.transformAttributes(config);
                    return new Markdoc.Tag('ImagePreview', {
                        src: sanitizeImageUrl(attrs.src),
                        alt: attrs.alt ?? '',
                        title: attrs.title ?? '',
                    });
                },
            },
            link: {
                attributes: {
                    href: { type: String },
                    title: { type: String, default: '' },
                },
                transform(node, config) {
                    const attrs = node.transformAttributes(config);
                    return new Markdoc.Tag('a', {
                        href: sanitizeUrl(attrs.href),
                        title: attrs.title || undefined,
                        target: '_blank',
                        rel: 'noopener noreferrer',
                    }, node.transformChildren(config));
                },
            },
            ...overrides.nodes,
        },
        tags: {
            alert: {
                attributes: {
                    type: { type: String, default: 'note' },
                    title: { type: String },
                },
                transform(node, config) {
                    const attrs = node.transformAttributes(config);
                    // Children go in the tag's own children, not in an attribute: the Preact adapter
                    // would have accepted them either way, but an attribute is not where content
                    // lives, and the HTML adapter reads children from the one place.
                    return new Markdoc.Tag('Alert', { type: normaliseAlertType(attrs.type), title: attrs.title }, node.transformChildren(config));
                },
            },
            ...overrides.tags,
        },
    };
}
/** An alert type we know, or the safest one — a fence author's typo should not render a blank box. */
function normaliseAlertType(type) {
    const candidate = (type ?? '').toLowerCase();
    return ALERT_TYPES.includes(candidate) ? candidate : 'note';
}
/** `- [x] done` — a GFM task list, which Markdoc has no token for and would render as literal text. */
const TASK_MARKER = /^\[([ xX])\]\s+/;
function isTag(node) {
    return node?.$$mdtype === 'Tag';
}
/** Replaces the text at `index` with the marker stripped, and reports whether it was ticked. */
function stripTaskMarker(children, index, text) {
    const match = TASK_MARKER.exec(text);
    if (!match)
        return undefined;
    children[index] = text.slice(match[0].length);
    return match[1]?.toLowerCase() === 'x';
}
/**
 * Removes a task marker from the start of an item, if there is one, and reports whether it was
 * ticked. Handles both forms Markdoc produces: the tight list, where the text sits directly in
 * the item, and the loose list, where it is wrapped in a paragraph.
 */
function takeTaskMarker(children) {
    const first = children[0];
    if (typeof first === 'string')
        return stripTaskMarker(children, 0, first);
    if (isTag(first) && first.name === 'p' && typeof first.children[0] === 'string') {
        return stripTaskMarker(first.children, 0, first.children[0]);
    }
    return undefined;
}
//# sourceMappingURL=schema.js.map