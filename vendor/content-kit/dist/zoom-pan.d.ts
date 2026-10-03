/**
 * Zoom and pan arithmetic, on its own.
 *
 * The chat had two copies of this — one for images, one for Mermaid — that differed only in the
 * markup wrapped around them. The maths lives here, free of Preact and of the DOM, so the
 * behaviour is testable without rendering anything; `./preact/zoom-pan-viewer` is the thin
 * surface over it, and `./preact` is where the component lives.
 */
export declare const MIN_SCALE = 0.25;
export declare const MAX_SCALE = 5;
/** One wheel notch. The buttons move two notches, as they always have. */
export declare const ZOOM_STEP = 0.15;
export type ZoomPan = {
    /** Scale factor; 1 is fit. */
    scale: number;
    /** Pan offset in pixels from centre. */
    x: number;
    y: number;
};
export declare const IDENTITY: ZoomPan;
export declare function clampScale(scale: number): number;
/** A wheel notch: scrolling down zooms out, up zooms in. */
export declare function zoomByWheel(state: ZoomPan, deltaY: number): ZoomPan;
export declare function zoomIn(state: ZoomPan): ZoomPan;
export declare function zoomOut(state: ZoomPan): ZoomPan;
export declare function panBy(state: ZoomPan, dx: number, dy: number): ZoomPan;
export declare function reset(): ZoomPan;
/** The scale as the percentage the viewer shows. */
export declare function toPercent(state: ZoomPan): number;
/** The CSS transform that realises the state, anchored at the centre. */
export declare function toTransform(state: ZoomPan): string;
//# sourceMappingURL=zoom-pan.d.ts.map