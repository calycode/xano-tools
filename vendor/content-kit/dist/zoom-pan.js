/**
 * Zoom and pan arithmetic, on its own.
 *
 * The chat had two copies of this — one for images, one for Mermaid — that differed only in the
 * markup wrapped around them. The maths lives here, free of Preact and of the DOM, so the
 * behaviour is testable without rendering anything; `./preact/zoom-pan-viewer` is the thin
 * surface over it, and `./preact` is where the component lives.
 */
export const MIN_SCALE = 0.25;
export const MAX_SCALE = 5;
/** One wheel notch. The buttons move two notches, as they always have. */
export const ZOOM_STEP = 0.15;
export const IDENTITY = { scale: 1, x: 0, y: 0 };
export function clampScale(scale) {
    return Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale));
}
/** A wheel notch: scrolling down zooms out, up zooms in. */
export function zoomByWheel(state, deltaY) {
    return { ...state, scale: clampScale(state.scale + (deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP)) };
}
export function zoomIn(state) {
    return { ...state, scale: clampScale(state.scale + ZOOM_STEP * 2) };
}
export function zoomOut(state) {
    return { ...state, scale: clampScale(state.scale - ZOOM_STEP * 2) };
}
export function panBy(state, dx, dy) {
    return { ...state, x: state.x + dx, y: state.y + dy };
}
export function reset() {
    return IDENTITY;
}
/** The scale as the percentage the viewer shows. */
export function toPercent(state) {
    return Math.round(state.scale * 100);
}
/** The CSS transform that realises the state, anchored at the centre. */
export function toTransform(state) {
    return `translate(${state.x}px, ${state.y}px) scale(${state.scale})`;
}
//# sourceMappingURL=zoom-pan.js.map