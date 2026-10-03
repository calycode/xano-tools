import { jsx as _jsx, jsxs as _jsxs } from "preact/jsx-runtime";
import { useState } from 'preact/hooks';
import { HighlightedCode } from './highlighted-code.js';
import { ZoomPanViewer } from './zoom-pan-viewer.js';
/**
 * The default Preact components: what a consumer gets when it hands `renderToPreact` nothing.
 *
 * They are deliberately lean. No clipboard wiring, no diagram library, no third-party icons — so
 * importing the Preact adapter pulls in nothing beyond Preact, Markdoc and Prism. The
 * `content-kit/preact/rich` entry point overrides these with the featureful versions for a
 * consumer that wants them.
 *
 * Every component reads only the attributes its own tag carries, namespaced with `ck-*` hook
 * classes and styled with the utility classes the Tailwind preset's tokens drive.
 */
const ALERT_CLASS = {
    note: 'border-sky-500/50 bg-sky-500/10',
    tip: 'border-emerald-500/50 bg-emerald-500/10',
    important: 'border-violet-500/50 bg-violet-500/10',
    warning: 'border-amber-500/50 bg-amber-500/10',
    caution: 'border-destructive/50 bg-destructive/10',
};
export function CodeBlock(props) {
    const code = props.code ?? '';
    return (_jsxs("div", { class: 'ck-code my-2 min-w-0 max-w-full overflow-hidden rounded-md border border-border bg-background', children: [_jsx("div", { class: 'ck-code__header border-b border-border px-2 py-1 text-xs text-muted-foreground', children: props.displayName ?? 'Code' }), _jsx("pre", { class: 'ck-code__pre m-0 overflow-auto p-3 text-xs leading-relaxed', children: _jsx("code", { children: _jsx(HighlightedCode, { code: code, language: props.language }) }) })] }));
}
export function Mermaid(props) {
    // A real diagram needs a library the lean core does not carry. The default shows the source;
    // `content-kit/preact/rich` replaces this with a rendered, pan/zoomable diagram.
    return (_jsxs("div", { class: 'ck-mermaid my-2 overflow-hidden rounded-md border border-border bg-muted', children: [_jsx("div", { class: 'ck-mermaid__header border-b border-border px-2 py-1 text-xs text-muted-foreground', children: "Diagram" }), _jsx("pre", { class: 'ck-mermaid__source m-0 overflow-auto p-3 text-xs leading-relaxed', children: _jsx("code", { children: props.chart ?? '' }) })] }));
}
export function ImagePreview(props) {
    const [failed, setFailed] = useState(false);
    if (!props.src)
        return null;
    if (failed) {
        return (_jsx("div", { class: 'ck-figure__error my-2 rounded-md border border-dashed border-border px-3 py-4 text-xs text-muted-foreground', children: props.alt ? `Could not load image: ${props.alt}` : 'Could not load image.' }));
    }
    return (_jsx("figure", { class: 'ck-figure my-2 h-72 overflow-hidden rounded-md border border-border', children: _jsx(ZoomPanViewer, { class: 'relative h-full w-full overflow-hidden', contentClass: 'flex h-full w-full items-center justify-center', label: props.alt ? `Image: ${props.alt}` : 'Image', children: _jsx("img", { src: props.src, alt: props.alt ?? '', draggable: false, class: 'ck-figure__img h-full w-full select-none object-contain', onError: () => setFailed(true) }) }) }));
}
export function Alert(props) {
    const type = props.type ?? 'note';
    return (_jsxs("div", { class: `ck-alert ck-alert--${type} my-2 rounded-md border px-3 py-2 text-sm ${ALERT_CLASS[type] ?? ALERT_CLASS.note}`, children: [_jsx("div", { class: 'ck-alert__title mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground', children: props.title || type }), _jsx("div", { class: 'ck-alert__body whitespace-pre-wrap', children: props.content ?? props.children })] }));
}
/** The map `renderToPreact` falls back to when a consumer supplies none. */
export const defaultPreactComponents = {
    CodeBlock,
    Mermaid,
    ImagePreview,
    Alert,
};
//# sourceMappingURL=default-components.js.map