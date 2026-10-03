import { jsx as _jsx, jsxs as _jsxs } from "preact/jsx-runtime";
import { useCallback, useEffect, useRef, useState } from 'preact/hooks';
import { IDENTITY, panBy, reset, toPercent, toTransform, zoomByWheel, zoomIn, zoomOut, } from '../zoom-pan.js';
/** How far an arrow key pans, in pixels. */
const PAN_STEP = 40;
const PAN_KEYS = {
    ArrowLeft: [-PAN_STEP, 0],
    ArrowRight: [PAN_STEP, 0],
    ArrowUp: [0, -PAN_STEP],
    ArrowDown: [0, PAN_STEP],
};
export function ZoomPanViewer({ children, contentClass, class: className, label = 'Zoomable content', }) {
    const [state, setState] = useState(IDENTITY);
    const isPanningRef = useRef(false);
    const lastPosRef = useRef({ x: 0, y: 0 });
    const containerRef = useRef(null);
    // A native listener, because a passive one cannot preventDefault and the page would scroll
    // behind the viewer.
    useEffect(() => {
        const element = containerRef.current;
        if (!element)
            return;
        const onWheel = (event) => {
            event.preventDefault();
            setState((previous) => zoomByWheel(previous, event.deltaY));
        };
        element.addEventListener('wheel', onWheel, { passive: false });
        return () => element.removeEventListener('wheel', onWheel);
    }, []);
    const handlePointerDown = useCallback((event) => {
        if (event.button !== 0)
            return;
        isPanningRef.current = true;
        lastPosRef.current = { x: event.clientX, y: event.clientY };
        containerRef.current?.setPointerCapture?.(event.pointerId);
    }, []);
    const handlePointerMove = useCallback((event) => {
        if (!isPanningRef.current)
            return;
        const dx = event.clientX - lastPosRef.current.x;
        const dy = event.clientY - lastPosRef.current.y;
        lastPosRef.current = { x: event.clientX, y: event.clientY };
        setState((previous) => panBy(previous, dx, dy));
    }, []);
    const handlePointerUp = useCallback(() => {
        isPanningRef.current = false;
    }, []);
    // Panning was pointer-only, which left the viewer unusable without a mouse. The zoom buttons
    // were already reachable by keyboard; the panning was the half that was not.
    const handleKeyDown = useCallback((event) => {
        const move = PAN_KEYS[event.key];
        if (!move)
            return;
        event.preventDefault();
        setState((previous) => panBy(previous, move[0], move[1]));
    }, []);
    return (_jsxs("div", { class: className ?? 'relative flex-1 min-h-0 overflow-hidden', children: [_jsxs("div", { class: 'absolute top-2 right-2 z-10 flex items-center gap-0.5 rounded-md bg-background/90 border border-border shadow-sm px-1 py-0.5', children: [_jsx(ControlButton, { label: 'Zoom out', onClick: () => setState(zoomOut), icon: ZoomOutIcon }), _jsxs("span", { class: 'text-[10px] font-mono text-muted-foreground min-w-[3ch] text-center tabular-nums', children: [toPercent(state), "%"] }), _jsx(ControlButton, { label: 'Zoom in', onClick: () => setState(zoomIn), icon: ZoomInIcon }), _jsx("div", { class: 'w-px h-4 bg-border mx-0.5' }), _jsx(ControlButton, { label: 'Reset view', onClick: () => setState(() => reset()), icon: ResetIcon })] }), _jsx("div", { ref: containerRef, role: 'group', "aria-label": label, tabIndex: 0, class: 'h-full w-full overflow-hidden cursor-grab active:cursor-grabbing flex items-center justify-center p-4 outline-none focus-visible:ring-2 focus-visible:ring-ring/40', onPointerDown: handlePointerDown, onPointerMove: handlePointerMove, onPointerUp: handlePointerUp, onPointerLeave: handlePointerUp, onKeyDown: handleKeyDown, children: _jsx("div", { class: contentClass, style: { transform: toTransform(state), transformOrigin: 'center center' }, children: children }) })] }));
}
function ControlButton({ label, onClick, icon: Icon }) {
    return (_jsx("button", { type: 'button', title: label, "aria-label": label, onClick: onClick, class: 'p-1 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground', children: _jsx(Icon, {}) }));
}
// The controls draw their own glyphs rather than importing an icon library, so the package stays
// self-contained enough to lift out on its own.
function ZoomOutIcon() {
    return (_jsxs("svg", { class: 'h-3.5 w-3.5', viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', "stroke-width": '2', "stroke-linecap": 'round', "stroke-linejoin": 'round', "aria-hidden": 'true', children: [_jsx("circle", { cx: '11', cy: '11', r: '8' }), _jsx("path", { d: 'm21 21-4.3-4.3M8 11h6' })] }));
}
function ZoomInIcon() {
    return (_jsxs("svg", { class: 'h-3.5 w-3.5', viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', "stroke-width": '2', "stroke-linecap": 'round', "stroke-linejoin": 'round', "aria-hidden": 'true', children: [_jsx("circle", { cx: '11', cy: '11', r: '8' }), _jsx("path", { d: 'm21 21-4.3-4.3M11 8v6M8 11h6' })] }));
}
function ResetIcon() {
    return (_jsxs("svg", { class: 'h-3.5 w-3.5', viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', "stroke-width": '2', "stroke-linecap": 'round', "stroke-linejoin": 'round', "aria-hidden": 'true', children: [_jsx("path", { d: 'M3 12a9 9 0 1 0 3-6.7L3 8' }), _jsx("path", { d: 'M3 3v5h5' })] }));
}
//# sourceMappingURL=zoom-pan-viewer.js.map