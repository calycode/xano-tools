import { jsx as _jsx, jsxs as _jsxs } from "preact/jsx-runtime";
import { renderMermaidSVG, THEMES } from 'beautiful-mermaid';
import DOMPurify from 'dompurify';
import { useEffect, useState } from 'preact/hooks';
import { defaultPreactComponents } from '../default-components.js';
import { HighlightedCode } from '../highlighted-code.js';
import { ZoomPanViewer } from '../zoom-pan-viewer.js';
/**
 * The rich Preact components: the same component names, with the features the lean defaults
 * deliberately leave out — a copy button on code, and a rendered, pan/zoomable Mermaid diagram.
 *
 * This is a separate entry point (`content-kit/preact/rich`) because it pulls in
 * `beautiful-mermaid` and `DOMPurify`. A consumer that only wants the lean core never pays for
 * them; a consumer that opts in gets them without touching the schema.
 *
 * Usage:
 *
 *     import { renderToPreact } from '@calycode/content-kit/preact';
 *     import { richPreactComponents } from '@calycode/content-kit/preact/rich';
 *
 *     renderToPreact(tree, richPreactComponents);
 */
export function RichCodeBlock(props) {
    const code = props.code ?? '';
    const [copied, setCopied] = useState(false);
    const copy = async () => {
        try {
            await navigator.clipboard.writeText(code);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        }
        catch {
            // No clipboard access; the code is still on screen to select.
        }
    };
    return (_jsxs("div", { class: 'ck-code my-2 min-w-0 max-w-full overflow-hidden rounded-md border border-border bg-background', children: [_jsxs("div", { class: 'ck-code__header flex items-center justify-between border-b border-border px-2 py-1 text-xs text-muted-foreground', children: [_jsx("span", { children: props.displayName ?? 'Code' }), _jsx("button", { type: 'button', class: 'ck-code__copy hover:text-foreground', onClick: () => void copy(), children: copied ? 'Copied' : 'Copy' })] }), _jsx("pre", { class: 'ck-code__pre m-0 overflow-auto p-3 text-xs leading-relaxed', children: _jsx("code", { children: _jsx(HighlightedCode, { code: code, language: props.language }) }) })] }));
}
export function RichMermaid(props) {
    const chart = props.chart ?? '';
    const [svg, setSvg] = useState(null);
    const [failed, setFailed] = useState(false);
    useEffect(() => {
        if (!chart.trim()) {
            setFailed(true);
            return;
        }
        try {
            const dark = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
            const theme = (dark ? THEMES['github-dark'] : THEMES['github-light']) ?? {};
            const rendered = renderMermaidSVG(chart, { ...theme });
            // The SVG is generated markup, not Markdoc content, so it is sanitized before it is put
            // in the DOM.
            setSvg(DOMPurify.sanitize(rendered, { USE_PROFILES: { svg: true } }));
            setFailed(false);
        }
        catch {
            setFailed(true);
        }
    }, [chart]);
    return (_jsxs("div", { class: 'ck-mermaid my-2 overflow-hidden rounded-md border border-border', children: [_jsx("div", { class: 'ck-mermaid__header border-b border-border px-2 py-1 text-xs text-muted-foreground', children: "Diagram" }), failed || !svg ? (_jsx("pre", { class: 'ck-mermaid__source m-0 overflow-auto p-3 text-xs leading-relaxed', children: _jsx("code", { children: chart }) })) : (_jsx("div", { class: 'ck-mermaid__canvas h-72', children: _jsx(ZoomPanViewer, { class: 'relative h-full w-full overflow-hidden', contentClass: 'flex h-full w-full items-center justify-center [&>svg]:max-h-full [&>svg]:max-w-full', children: _jsx("div", { dangerouslySetInnerHTML: { __html: svg } }) }) }))] }));
}
/** The lean defaults, with the featureful code block and diagram swapped in. */
export const richPreactComponents = {
    ...defaultPreactComponents,
    CodeBlock: RichCodeBlock,
    Mermaid: RichMermaid,
};
//# sourceMappingURL=index.js.map