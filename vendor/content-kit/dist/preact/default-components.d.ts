import type { ComponentChildren } from 'preact';
import type { ContentComponents } from './render.js';
export declare function CodeBlock(props: {
    code?: string;
    language?: string;
    displayName?: string;
}): import("preact").JSX.Element;
export declare function Mermaid(props: {
    chart?: string;
}): import("preact").JSX.Element;
export declare function ImagePreview(props: {
    src?: string;
    alt?: string;
}): import("preact").JSX.Element | null;
export declare function Alert(props: {
    type?: string;
    title?: string;
    content?: string;
    children?: ComponentChildren;
}): import("preact").JSX.Element;
/** The map `renderToPreact` falls back to when a consumer supplies none. */
export declare const defaultPreactComponents: ContentComponents;
//# sourceMappingURL=default-components.d.ts.map