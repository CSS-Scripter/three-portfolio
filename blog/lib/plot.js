// Small canvas drawing helpers shared by the figures.

export const TAU = Math.PI * 2;
export const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
export const degrees = (radians) => (radians * 180) / Math.PI;
export const radians = (deg) => (deg * Math.PI) / 180;

/** Signed number with a real minus sign, e.g. "−0.40". */
export function num(value, digits = 2) {
    const fixed = Math.abs(value) < 0.5 * 10 ** -digits ? 0 : value;
    return fixed.toFixed(digits).replace('-', '−');
}

export function deg(rad, digits = 0) {
    return `${num(degrees(rad), digits)}°`;
}

function stroke(ctx, { color, width = 1, alpha = 1, dash = null, cap = 'round' }) {
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.globalAlpha = alpha;
    ctx.lineCap = cap;
    ctx.lineJoin = 'round';
    ctx.setLineDash(dash ?? []);
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.setLineDash([]);
}

export function segment(ctx, x0, y0, x1, y1, style) {
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    stroke(ctx, style);
}

/** y = fn(x) in pixels, for x from x0 to x1. */
export function curve(ctx, x0, x1, fn, style, step = 1) {
    ctx.beginPath();
    for (let x = x0; x <= x1 + 0.001; x += step) {
        const y = fn(x);
        if (x === x0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    }
    stroke(ctx, style);
}

/** A curve given as a list of [x, y] points. */
export function path(ctx, points, style) {
    ctx.beginPath();
    points.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    stroke(ctx, style);
}

export function circle(ctx, x, y, r, style) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, TAU);
    stroke(ctx, style);
}

/** Arc from angle a0 to a1 in maths orientation (counter-clockwise, y up). */
export function arc(ctx, x, y, r, a0, a1, style) {
    ctx.beginPath();
    ctx.arc(x, y, r, -a0, -a1, a1 > a0);
    stroke(ctx, style);
}

export function dot(ctx, x, y, r, color, { ring = null } = {}) {
    if (ring) {
        ctx.beginPath();
        ctx.arc(x, y, r + 2, 0, TAU);
        ctx.fillStyle = ring;
        ctx.fill();
    }
    ctx.beginPath();
    ctx.arc(x, y, r, 0, TAU);
    ctx.fillStyle = color;
    ctx.fill();
}

export function arrow(ctx, x0, y0, x1, y1, style, head = 6) {
    segment(ctx, x0, y0, x1, y1, style);
    const angle = Math.atan2(y1 - y0, x1 - x0);
    if (Math.hypot(x1 - x0, y1 - y0) < head) return;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x1 - head * Math.cos(angle - 0.45), y1 - head * Math.sin(angle - 0.45));
    ctx.lineTo(x1 - head * Math.cos(angle + 0.45), y1 - head * Math.sin(angle + 0.45));
    ctx.closePath();
    ctx.fillStyle = style.color;
    ctx.globalAlpha = style.alpha ?? 1;
    ctx.fill();
    ctx.globalAlpha = 1;
}

/** Mono label, in a text colour (never a series colour). */
export function label(ctx, text, x, y, { color, font, size = 11, align = 'left', baseline = 'middle' }) {
    ctx.font = `${size}px ${font}`;
    ctx.fillStyle = color;
    ctx.textAlign = align;
    ctx.textBaseline = baseline;
    ctx.fillText(text, x, y);
}

/**
 * Maps time (seconds) and value (−range…range) to pixels inside a box.
 * @returns {{ left: number, right: number, top: number, bottom: number, mid: number, x: (t: number) => number, t: (x: number) => number, y: (v: number) => number }}
 */
export function waveBox({ left, right, top, bottom, duration, range = 1 }) {
    const mid = (top + bottom) / 2;
    const half = (bottom - top) / 2;
    return {
        left, right, top, bottom, mid, duration,
        x: (t) => left + (t / duration) * (right - left),
        t: (x) => ((x - left) / (right - left)) * duration,
        y: (v) => mid - (v / range) * half,
    };
}

/** Plots value = fn(t) across a wave box. */
export function wave(ctx, box, fn, style) {
    curve(ctx, box.left, box.right, (x) => box.y(fn(box.t(x))), style);
}

/** Zero line, dashed guides at ±1 and, optionally, labels for them. */
export function waveGrid(ctx, box, colors, { guides = [1, -1], labels = false } = {}) {
    for (const v of guides) {
        segment(ctx, box.left, box.y(v), box.right, box.y(v), { color: colors.faint, dash: [2, 4] });
        if (labels) label(ctx, num(v, 0), box.left - 8, box.y(v), { color: colors.muted, font: colors.mono, size: 10, align: 'right' });
    }
    segment(ctx, box.left, box.mid, box.right, box.mid, { color: colors.faint });
    if (labels) label(ctx, '0', box.left - 8, box.mid, { color: colors.muted, font: colors.mono, size: 10, align: 'right' });
}

/** Tick labels along the bottom of a wave box, e.g. every 2 ms. */
export function timeTicks(ctx, box, colors, { every, unit = 'ms', scale = 1000 }) {
    for (let t = 0; t <= box.duration + 1e-9; t += every) {
        const x = box.x(t);
        segment(ctx, x, box.bottom + 2, x, box.bottom + 6, { color: colors.faint });
        const value = Math.round(t * scale * 100) / 100;
        const last = t + every > box.duration + 1e-9;
        label(ctx, last ? `${value} ${unit}` : String(value), x, box.bottom + 16, {
            color: colors.muted, font: colors.mono, size: 10, align: last ? 'right' : 'center',
        });
    }
}
