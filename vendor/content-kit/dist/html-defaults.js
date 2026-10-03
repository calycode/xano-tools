import Markdoc from '@markdoc/markdoc';
import { tokenize } from './prism.js';
import { tokensToTags } from './prism-tags.js';
/**
 * The default HTML components: what a consumer gets when it hands `renderToHtml` nothing.
 *
 * They are deliberately clean and minimal — semantic elements, stable `ck-*` hook classes, and
 * utility classes over the design tokens the Tailwind preset defines. No script tags, no diagram
 * library, no copy-button wiring: this is markup a static page can render as-is. A consumer with
 * its own article markup (like the blog in this repo) overrides any of these by passing its own
 * map; the renderer merges it over these rather than replacing them.
 */
/** One tint per alert kind, over the token palette the preset ships. */
const ALERT_CLASS = {
    note: 'ck-alert--note border-sky-500/50 bg-sky-500/10',
    tip: 'ck-alert--tip border-emerald-500/50 bg-emerald-500/10',
    important: 'ck-alert--important border-violet-500/50 bg-violet-500/10',
    warning: 'ck-alert--warning border-amber-500/50 bg-amber-500/10',
    caution: 'ck-alert--caution border-destructive/50 bg-destructive/10',
};
export const defaultHtmlComponents = {
    CodeBlock(attributes) {
        const code = String(attributes.code ?? '');
        const language = String(attributes.language ?? '');
        const label = String(attributes.label ?? '');
        const tokens = tokenize(code, language);
        return new Markdoc.Tag('div', { class: 'ck-code my-2 min-w-0 max-w-full overflow-hidden rounded-md border border-border bg-background' }, [
            new Markdoc.Tag('pre', { class: 'ck-code__pre m-0 overflow-auto p-3 text-xs leading-relaxed' }, [
                new Markdoc.Tag('code', { class: label ? `ck-code__code language-${label}` : 'ck-code__code' }, tokens ? tokensToTags(tokens) : [code]),
            ]),
        ]);
    },
    Mermaid(attributes) {
        // The default does not render the diagram — that needs a library the lean core does not
        // carry. It emits the source in a recognizable block; the `content-kit/preact/rich` entry
        // or a consumer component is where a real diagram appears.
        return new Markdoc.Tag('div', {
            class: 'ck-mermaid my-2 overflow-hidden rounded-md border border-border bg-muted',
            'data-ck-mermaid': '',
        }, [
            new Markdoc.Tag('pre', { class: 'ck-mermaid__source m-0 overflow-auto p-3 text-xs leading-relaxed' }, [String(attributes.chart ?? '')]),
        ]);
    },
    ImagePreview(attributes) {
        const alt = String(attributes.alt ?? '');
        const title = String(attributes.title ?? '');
        return new Markdoc.Tag('figure', { class: 'ck-figure my-2' }, [
            new Markdoc.Tag('img', {
                src: String(attributes.src ?? ''),
                alt,
                title,
                loading: 'lazy',
                class: 'ck-figure__img max-w-full rounded-md border border-border',
            }),
            ...(alt
                ? [
                    new Markdoc.Tag('figcaption', { class: 'ck-figure__caption mt-1 text-xs text-muted-foreground' }, [alt]),
                ]
                : []),
        ]);
    },
    Alert(attributes, children) {
        const type = String(attributes.type ?? 'note');
        const title = String(attributes.title ?? '');
        const content = String(attributes.content ?? '');
        return new Markdoc.Tag('aside', {
            class: `ck-alert ck-alert--${type} my-2 rounded-md border px-3 py-2 text-sm ${ALERT_CLASS[type] ?? ALERT_CLASS.note}`,
            'data-ck-alert': type,
        }, [
            ...(title
                ? [
                    new Markdoc.Tag('div', { class: 'ck-alert__title mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground' }, [title]),
                ]
                : []),
            new Markdoc.Tag('div', { class: 'ck-alert__body whitespace-pre-wrap' }, content ? [content] : children),
        ]);
    },
};
//# sourceMappingURL=html-defaults.js.map