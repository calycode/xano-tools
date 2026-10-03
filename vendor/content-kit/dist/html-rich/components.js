import Markdoc from '@markdoc/markdoc';
import { tokenize } from '../prism.js';
import { tokensToTags } from '../prism-tags.js';
import { registerEnhancer, registerMermaid } from './assets.js';
/**
 * The rich HTML components: the article's own markup for each component the shared schema
 * produces — `md-code-wrap`, `data-enhance`, and the hooks the client enhancer looks for.
 *
 * They are separate from `defaultHtmlComponents` because they carry article opinion: a header bar
 * with a copy button, a terminal chrome, a `data-enhance` contract. The enhancer
 * (`rich-enhance.js`) is what makes the terminal animate and the diagram draw; these components
 * only lay out the hooks it needs.
 */
/** Markup the article must not highlight, because templating syntax would be mangled by Prism. */
const NO_HIGHLIGHT_LANGUAGES = new Set(['xml', 'html', 'markup']);
function createCodeBlock(raw, displayName, codeClass, children) {
    return new Markdoc.Tag('div', { class: 'md-code-wrap' }, [
        new Markdoc.Tag('div', { class: 'md-code-header' }, [
            new Markdoc.Tag('span', { class: 'md-code-lang' }, [displayName]),
            new Markdoc.Tag('button', { class: 'md-code-copy', 'data-copy': 'next', 'aria-label': 'Copy code' }, []),
        ]),
        new Markdoc.Tag('pre', { class: codeClass ? `md-code ${codeClass}` : 'md-code' }, [
            new Markdoc.Tag('code', codeClass ? { class: codeClass } : {}, children ?? [raw]),
        ]),
    ]);
}
/** The terminal chrome: traffic-light dots, a title, an optional replay button, and the transcript. */
export function createTerminal(raw, anim) {
    return new Markdoc.Tag('div', { class: 'md-term-wrap', 'data-enhance': 'term', 'data-anim': String(anim) }, [
        new Markdoc.Tag('div', { class: 'md-term-header' }, [
            new Markdoc.Tag('div', { class: 'md-term-dots' }, [
                new Markdoc.Tag('span', { class: 'md-dot md-dot--red' }, []),
                new Markdoc.Tag('span', { class: 'md-dot md-dot--yellow' }, []),
                new Markdoc.Tag('span', { class: 'md-dot md-dot--green' }, []),
            ]),
            new Markdoc.Tag('span', { class: 'md-term-title' }, ['bash']),
            ...(anim
                ? [new Markdoc.Tag('button', { class: 'md-term-replay', 'data-replay': 'term' }, [])]
                : []),
        ]),
        new Markdoc.Tag('pre', { class: 'md-term' }, [
            new Markdoc.Tag('code', { class: 'language-bash' }, [raw]),
        ]),
    ]);
}
export function richHtmlComponents(ctx) {
    return {
        CodeBlock(attributes) {
            const raw = String(attributes.code ?? '');
            const language = String(attributes.language ?? '');
            const label = String(attributes.label ?? '');
            const displayName = String(attributes.displayName ?? 'Code');
            const codeClass = label ? `language-${label}` : undefined;
            registerEnhancer(ctx);
            if (NO_HIGHLIGHT_LANGUAGES.has(language) && /{[{%#]/.test(raw)) {
                return createCodeBlock(raw, displayName, codeClass);
            }
            const tokens = tokenize(raw, language);
            return createCodeBlock(raw, displayName, codeClass, tokens ? tokensToTags(tokens) : undefined);
        },
        Mermaid(attributes) {
            registerEnhancer(ctx);
            registerMermaid(ctx);
            return new Markdoc.Tag('div', { class: 'md-mermaid', 'data-enhance': 'mermaid' }, [
                String(attributes.chart ?? ''),
            ]);
        },
        ImagePreview(attributes) {
            registerEnhancer(ctx);
            const alt = String(attributes.alt ?? '');
            const title = String(attributes.title ?? '');
            return new Markdoc.Tag('figure', { class: 'md-img-wrap', 'data-enhance': 'zoom' }, [
                new Markdoc.Tag('img', {
                    src: String(attributes.src ?? ''),
                    alt,
                    title,
                    loading: 'lazy',
                    class: 'md-img',
                }),
                ...(alt ? [new Markdoc.Tag('figcaption', { class: 'md-img-caption' }, [alt])] : []),
            ]);
        },
        Alert(attributes, children) {
            const type = String(attributes.type ?? 'note');
            const title = String(attributes.title ?? '');
            const content = String(attributes.content ?? '');
            return new Markdoc.Tag('aside', { class: `md-alert md-alert--${type}`, 'data-alert-type': type }, [
                ...(title ? [new Markdoc.Tag('div', { class: 'md-alert__title' }, [title])] : []),
                new Markdoc.Tag('div', { class: 'md-alert__body' }, content ? [content] : children),
            ]);
        },
        Terminal(attributes) {
            registerEnhancer(ctx);
            return createTerminal(String(attributes.content ?? ''), Boolean(attributes.anim));
        },
    };
}
//# sourceMappingURL=components.js.map