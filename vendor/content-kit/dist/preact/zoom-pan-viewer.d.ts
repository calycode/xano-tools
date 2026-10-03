import type { ComponentChildren, JSX } from 'preact';
/**
 * One zoom/pan surface, for anything that can sit inside it — an image, a rendered diagram, or
 * something not invented yet. The chat used to carry two copies of this that differed only in
 * their markup; both now render their content as children here.
 *
 * The arithmetic lives in `../zoom-pan` and is tested there, so this stays a thin adapter over
 * the DOM: it wires wheel and pointer events to those functions and renders the controls.
 */
export type ZoomPanViewerProps = {
    children: ComponentChildren;
    /** Applied to the transformed layer, for sizing the content it holds. */
    contentClass?: string;
    /** Applied to the outer element, for sizing the viewer itself. */
    class?: string;
    /** Names the region for a reader who cannot see it — an image's alt text, say. */
    label?: string;
};
export declare function ZoomPanViewer({ children, contentClass, class: className, label, }: ZoomPanViewerProps): JSX.Element;
//# sourceMappingURL=zoom-pan-viewer.d.ts.map