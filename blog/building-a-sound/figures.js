// Interactive figures for "Building a sound". Each one is a custom element, placed in
// the post with `::: figure <element-name> [attributes]`.
//
// Colours follow one rule throughout the series: white is the sound itself, coral is
// a cosine / real part, teal is a sine / imaginary part. In the first figures, before
// cosines and sines come up, coral marks whatever the text is talking about.

import { choice, motionButton, playButton, readout, row, slider } from '../lib/controls.js';
import { Voice } from '../lib/audio.js';
import { Figure, draggable, nudgeable, readColors, reducedMotion } from '../lib/figure.js';
import {
    TAU, arc, arrow, circle, clamp, curve, deg, dot, label, num, path, radians, segment,
    timeTicks, wave, waveBox, waveGrid,
} from '../lib/plot.js';

const TONE = 220; // Hz: the A below middle C

/* ---------- Shared bits ---------- */

/** A short coloured line followed by a label; returns the width it took. */
function key(ctx, x, y, color, text, colors, { align = 'left', size = 11 } = {}) {
    ctx.font = `${size}px ${colors.mono}`;
    const width = 16 + ctx.measureText(text).width;
    const start = align === 'right' ? x - width : x;
    segment(ctx, start, y, start + 11, y, { color, width: 2, cap: 'butt' });
    label(ctx, text, start + 16, y, { color: colors.muted, font: colors.mono, size });
    return width;
}

function keys(ctx, x, y, items, colors) {
    let cursor = x;
    for (const [color, text] of items) cursor += key(ctx, cursor, y, color, text, colors) + 18;
}

function rowLabel(ctx, text, x, y, colors) {
    label(ctx, text, x, y, { color: colors.muted, font: colors.mono, size: 11 });
}

/** A point on the complex plane that the reader can drag, shared by two figures. */
class PlaneFigure extends Figure {
    setupPlane(re, im) {
        this.re = re;
        this.im = im;
        draggable(this.canvas, {
            hit: (p) => this.inPlane(p),
            move: ({ x, y }) => {
                const { cx, cy, k } = this.plane();
                this.setPoint((x - cx) / k, (cy - y) / k);
            },
        });
        nudgeable(this.canvas, (dx, dy) => this.setPoint(this.re + dx, this.im + dy));
    }

    inPlane({ x, y }) {
        const { cx, cy, size } = this.plane();
        return Math.abs(x - cx) <= size / 2 && Math.abs(y - cy) <= size / 2;
    }

    setPoint(re, im) {
        const r = Math.hypot(re, im);
        if (r > 1.25) {
            re *= 1.25 / r;
            im *= 1.25 / r;
        }
        // Snap onto the axes, so a pure cosine or sine is easy to hit
        if (Math.abs(re) < 0.04) re = 0;
        if (Math.abs(im) < 0.04) im = 0;
        this.re = re;
        this.im = im;
        this.update();
    }

    drawPlaneGrid(ctx) {
        const c = this.colors;
        const { cx, cy, k, size } = this.plane();
        const reach = size / 2 - 4;
        circle(ctx, cx, cy, k, { color: c.faint, dash: [2, 4] });
        segment(ctx, cx - reach, cy, cx + reach, cy, { color: c.faint });
        segment(ctx, cx, cy - reach, cx, cy + reach, { color: c.faint });
        for (const [x, y, text, align] of [[cx + k, cy + 12, '1', 'center'], [cx - k, cy + 12, '−1', 'center'], [cx - 6, cy - k, '1', 'right'], [cx - 6, cy + k, '−1', 'right']]) {
            label(ctx, text, x, y, { color: c.muted, font: c.mono, size: 10, align });
        }
        key(ctx, cx + reach, cy - 12, c.re, 'real', c, { align: 'right' });
        key(ctx, cx + 8, cy - reach + 6, c.im, 'imaginary', c);
    }
}

/* ---------- Fig: a moving point draws a wave ---------- */

class FigTrace extends Figure {
    static animated = true;
    static label = 'A point moving smoothly up and down. Its position over time draws a wave.';

    setup() {
        this.voice = new Voice({ frequency: TONE, amplitudes: [0.8] });
        this.controls.append(row(playButton(this.voice), motionButton(this)));
        this.time = 0.6;
    }

    measure(width) {
        return clamp(width * 0.34, 170, 230);
    }

    draw(ctx, w, h) {
        const c = this.colors;
        const mid = h / 2;
        const amp = h / 2 - 30;
        const x0 = clamp(w * 0.12, 44, 84);
        const right = w - 8;
        const rate = 0.45; // on screen; the sound itself goes up and down 220 times per second
        const pxPerSecond = (right - x0) / 3.4;
        const y = (t) => mid - amp * Math.sin(TAU * rate * t);

        segment(ctx, x0, mid, right, mid, { color: c.faint });
        segment(ctx, x0, mid - amp - 12, x0, mid + amp + 12, { color: c.faint });
        label(ctx, 'rest', x0 - 12, mid, { color: c.muted, font: c.mono, size: 10, align: 'right' });
        label(ctx, 'time →', right, h - 8, { color: c.muted, font: c.mono, size: 10, align: 'right' });

        // Newest next to the point, older further right, fading out
        const fade = ctx.createLinearGradient(x0, 0, right, 0);
        fade.addColorStop(0, c.fg);
        fade.addColorStop(1, 'rgba(238, 238, 238, 0.08)');
        curve(ctx, x0, right, (x) => y(this.time - (x - x0) / pxPerSecond), { color: fade, width: 2 });

        dot(ctx, x0, y(this.time), 6, c.accent, { ring: c.bg });
    }
}

/* ---------- Figs: frequency, amplitude, phase ---------- */

class FigWave extends Figure {
    static label = 'A pure tone plotted over 10 milliseconds.';

    setup() {
        this.vary = this.getAttribute('vary') ?? 'frequency';
        this.frequency = TONE;
        this.amplitude = 0.8;
        this.phase = 0;
        this.voice = new Voice();

        const controls = {
            frequency: () => slider({
                label: 'Frequency', min: 110, max: 880, value: this.frequency, log: true, tone: 'accent',
                format: (v) => `${Math.round(v)} Hz`,
                onInput: (v) => { this.frequency = v; this.update(); },
            }),
            amplitude: () => slider({
                label: 'Amplitude', min: 0, max: 1, value: this.amplitude, tone: 'accent',
                format: (v) => num(v),
                onInput: (v) => { this.amplitude = v; this.update(); },
            }),
            phase: () => slider({
                label: 'Phase', min: -180, max: 180, step: 1, value: 0, tone: 'accent',
                format: (v) => `${num(v, 0)}°`,
                onInput: (v) => { this.phase = radians(v); this.update(); },
            }),
        };
        this.controls.append(playButton(this.voice), controls[this.vary]().element);
        this.update();
    }

    update() {
        this.voice.set({ frequency: this.frequency, amplitudes: [this.amplitude] });
        this.invalidate();
    }

    measure(width) {
        return clamp(width * 0.34, 180, 240);
    }

    draw(ctx, w, h) {
        const c = this.colors;
        const box = waveBox({ left: 30, right: w - 6, top: 34, bottom: h - 30, duration: 0.01 });
        const omega = TAU * this.frequency;
        const period = 1 / this.frequency;
        const value = (t) => this.amplitude * Math.cos(omega * t + this.phase);

        waveGrid(ctx, box, c, { labels: true });
        timeTicks(ctx, box, c, { every: 0.002 });

        if (this.vary === 'phase') {
            wave(ctx, box, (t) => this.amplitude * Math.cos(omega * t), { color: c.fg, alpha: 0.3, width: 1.5, dash: [4, 4] });
        }
        wave(ctx, box, value, { color: c.fg, width: 2 });

        if (this.vary === 'frequency') {
            // One period, highlighted on the wave and bracketed above it
            const x0 = box.x(0);
            const x1 = box.x(period);
            curve(ctx, x0, x1, (x) => box.y(value(box.t(x))), { color: c.accent, width: 2.5 });
            const y = box.top - 14;
            segment(ctx, x0, y, x1, y, { color: c.accent, width: 1.5 });
            segment(ctx, x0, y - 4, x0, y + 4, { color: c.accent, width: 1.5 });
            segment(ctx, x1, y - 4, x1, y + 4, { color: c.accent, width: 1.5 });
            const text = `one period: ${num(period * 1000)} ms`;
            ctx.font = `11px ${c.mono}`;
            const fits = ctx.measureText(text).width < x1 - x0 - 8;
            label(ctx, text, fits ? (x0 + x1) / 2 : x1 + 8, fits ? y - 10 : y, {
                color: c.fg, font: c.mono, size: 11, align: fits ? 'center' : 'left',
            });
        }

        if (this.vary === 'amplitude') {
            for (const v of [this.amplitude, -this.amplitude]) {
                segment(ctx, box.left, box.y(v), box.right, box.y(v), { color: c.accent, alpha: 0.7, dash: [3, 4] });
            }
            const x = box.x(period);
            if (this.amplitude > 0.06) arrow(ctx, x, box.mid, x, box.y(this.amplitude) + 2, { color: c.accent, width: 1.5 });
            label(ctx, `amplitude ${num(this.amplitude)}`, x + 10, box.y(this.amplitude) - 10, { color: c.fg, font: c.mono, size: 11 });
        }

        if (this.vary === 'phase') {
            // Where the peak was without phase, and where it is now
            const from = period;
            const to = period - this.phase / omega;
            const y = box.y(this.amplitude);
            circle(ctx, box.x(from), y, 4, { color: c.fg, alpha: 0.5 });
            dot(ctx, box.x(to), y, 4, c.accent);
            const arrowY = box.top - 14;
            if (Math.abs(box.x(to) - box.x(from)) > 3) {
                arrow(ctx, box.x(from), arrowY, box.x(to), arrowY, { color: c.accent, width: 1.5 });
            }
            label(ctx, `phase ${num((this.phase * 180) / Math.PI, 0)}°`, Math.min(box.x(from), box.x(to)) - 8, arrowY, {
                color: c.fg, font: c.mono, size: 11, align: 'right',
            });
        }
    }
}

/* ---------- Fig: two tones, in and out of phase ---------- */

class FigInterference extends Figure {
    static label = 'Two identical tones and their sum. Shifting the second tone by half a turn cancels the sum.';

    setup() {
        this.offset = 0;
        this.voice = new Voice();
        this.readout = readout();
        this.slider = slider({
            label: 'Phase of tone 2', min: 0, max: 360, step: 1, value: 0, tone: 'accent',
            format: (v) => `${Math.round(v)}°`,
            onInput: (v) => {
                this.offset = radians(v);
                this.presets.select(String(Math.round(v)));
                this.update();
            },
        });
        this.presets = choice([['0', 'In step'], ['90', 'Quarter turn'], ['180', 'Half a turn']], '0', (key) => {
            this.offset = radians(Number(key));
            this.slider.set(Number(key));
            this.update();
        });
        this.controls.append(playButton(this.voice, 'Listen to the sum'), this.presets.element, this.slider.element, this.readout.element);
        this.update();
    }

    get sumAmplitude() {
        // Two tones of amplitude ½ add up to an amplitude of |cos(offset / 2)|
        return Math.abs(Math.cos(this.offset / 2));
    }

    update() {
        this.voice.set({ frequency: TONE, amplitudes: [this.sumAmplitude] });
        this.readout.set([['amplitude of the sum', num(this.sumAmplitude)]]);
        this.invalidate();
    }

    measure(width) {
        return clamp(width * 0.11, 56, 74) * 3 + 2 * 16 + 28;
    }

    draw(ctx, w, h) {
        const c = this.colors;
        const gap = 16;
        const rowHeight = (h - 28 - 2 * gap) / 3;
        const left = clamp(w * 0.13, 70, 92);
        const omega = TAU * TONE;
        const rows = [
            ['tone 1', (t) => 0.5 * Math.cos(omega * t), { color: c.fg, alpha: 0.75, width: 1.75 }],
            ['+ tone 2', (t) => 0.5 * Math.cos(omega * t + this.offset), { color: c.accent, width: 1.75 }],
            ['= sum', (t) => 0.5 * Math.cos(omega * t) + 0.5 * Math.cos(omega * t + this.offset), { color: c.fg, width: 2.25 }],
        ];
        rows.forEach(([name, fn, style], i) => {
            const top = i * (rowHeight + gap);
            const box = waveBox({ left, right: w - 6, top, bottom: top + rowHeight, duration: 0.01, range: 1.05 });
            waveGrid(ctx, box, c);
            wave(ctx, box, fn, style);
            rowLabel(ctx, name, 0, box.mid, c);
            if (i === rows.length - 1) timeTicks(ctx, box, c, { every: 0.002 });
        });
    }
}

/* ---------- Fig: a point going round a circle ---------- */

class FigCircle extends Figure {
    static animated = true;
    static label = 'A point going round a circle. Its height draws a sine wave, its left-right position a cosine wave.';

    setup() {
        this.amplitude = 1;
        this.voice = new Voice({ frequency: TONE });
        const radius = slider({
            label: 'Radius (amplitude)', min: 0.2, max: 1, value: 1, tone: 'accent', format: (v) => num(v),
            onInput: (v) => { this.amplitude = v; this.update(); },
        });
        this.controls.append(row(playButton(this.voice), motionButton(this)), radius.element);
        this.time = 0.7;
        this.update();
    }

    update() {
        this.voice.set({ amplitudes: [this.amplitude] });
        this.invalidate();
    }

    geometry(width) {
        const pad = 12;
        const r = clamp(width * 0.11, 42, 76);
        const centre = pad + r + 10;
        const gap = 28;
        const down = clamp(width * 0.24, 130, 200);
        return { pad, r, cx: centre, cy: centre, gap, height: centre + r + gap + down + pad };
    }

    measure(width) {
        return this.geometry(width).height;
    }

    draw(ctx, w, h) {
        const c = this.colors;
        const { pad, r, cx, cy, gap } = this.geometry(w);
        const turnsPerSecond = 0.16; // on screen
        const angle = (t) => TAU * turnsPerSecond * t;
        const pxPerSecond = 4.4 * r * turnsPerSecond; // one turn takes 4.4 radii on both traces
        const R = r * this.amplitude;
        const now = angle(this.time);
        const px = cx + R * Math.cos(now);
        const py = cy - R * Math.sin(now);

        segment(ctx, cx - r - 8, cy, cx + r + 8, cy, { color: c.faint });
        segment(ctx, cx, cy - r - 8, cx, cy + r + 8, { color: c.faint });
        circle(ctx, cx, cy, R, { color: c.fg, alpha: 0.3 });

        // Height over time → sine, drawn to the right
        const rx0 = cx + r + gap;
        const rx1 = w - pad;
        segment(ctx, rx0, cy, rx1, cy, { color: c.faint });
        curve(ctx, rx0, rx1, (x) => cy - R * Math.sin(angle(this.time - (x - rx0) / pxPerSecond)), { color: c.im, width: 2 });
        segment(ctx, px, py, rx0, py, { color: c.im, alpha: 0.6, dash: [3, 4] });
        dot(ctx, rx0, py, 4, c.im);
        key(ctx, rx1, pad + 6, c.im, 'height → sine', c, { align: 'right' });

        // Left-right position over time → cosine, drawn downwards
        const dy0 = cy + r + gap;
        const dy1 = h - pad;
        segment(ctx, cx, dy0, cx, dy1, { color: c.faint });
        const points = [];
        for (let y = dy0; y <= dy1; y += 1) points.push([cx + R * Math.cos(angle(this.time - (y - dy0) / pxPerSecond)), y]);
        path(ctx, points, { color: c.re, width: 2 });
        segment(ctx, px, py, px, dy0, { color: c.re, alpha: 0.6, dash: [3, 4] });
        dot(ctx, px, dy0, 4, c.re);
        key(ctx, cx + r + 18, dy0 + 10, c.re, 'left-right → cosine', c);
        label(ctx, 'time ↓', cx + r + 18, dy1 - 4, { color: c.muted, font: c.mono, size: 10 });
        label(ctx, 'time →', rx1, cy + r + 4, { color: c.muted, font: c.mono, size: 10, align: 'right' });

        segment(ctx, cx, cy, px, py, { color: c.fg, width: 1.5 });
        dot(ctx, px, py, 6, c.fg, { ring: c.bg });
    }
}

/* ---------- Fig: a cosine plus a sine ---------- */

class FigCosSin extends Figure {
    static label = 'Some amount of cosine plus some amount of sine, and their sum: always a pure wave of the same frequency.';

    setup() {
        this.a = 0.6;
        this.b = 0.5;
        this.voice = new Voice({ frequency: TONE });
        this.readout = readout();
        const cos = slider({
            label: 'Cosine', min: -1, max: 1, value: this.a, tone: 're', format: (v) => num(v),
            onInput: (v) => { this.a = v; this.update(); },
        });
        const sin = slider({
            label: 'Sine', min: -1, max: 1, value: this.b, tone: 'im', format: (v) => num(v),
            onInput: (v) => { this.b = v; this.update(); },
        });
        this.controls.append(playButton(this.voice, 'Listen to the sum'), cos.element, sin.element, this.readout.element);
        this.update();
    }

    get amplitude() { return Math.hypot(this.a, this.b); }
    // a·cos(ωt) + b·sin(ωt) = A·cos(ωt + φ) with φ = atan2(−b, a); see the note in the post
    get phase() { return Math.atan2(-this.b, this.a); }

    update() {
        this.voice.set({ amplitudes: [this.amplitude / Math.SQRT2] });
        this.readout.set([['sum: amplitude', num(this.amplitude)], ['phase', deg(this.phase)]]);
        this.invalidate();
    }

    measure(width) {
        return clamp(width * 0.11, 58, 76) * 3 + 2 * 16 + 6;
    }

    draw(ctx, w, h) {
        const c = this.colors;
        const gap = 16;
        const rowHeight = (h - 6 - 2 * gap) / 3;
        const left = clamp(w * 0.13, 70, 92);
        const box = (i) => waveBox({ left, right: w - 6, top: 3 + i * (rowHeight + gap), bottom: 3 + i * (rowHeight + gap) + rowHeight, duration: 2, range: 1.5 });
        const { a, b, amplitude: A, phase } = this;

        const rows = [
            ['cosine', c.re, (t) => a * Math.cos(TAU * t)],
            ['+ sine', c.im, (t) => b * Math.sin(TAU * t)],
        ];
        rows.forEach(([name, color, fn], i) => {
            const bx = box(i);
            waveGrid(ctx, bx, c);
            wave(ctx, bx, fn, { color, width: 2 });
            key(ctx, 0, bx.mid, color, name, c);
        });

        const bx = box(2);
        waveGrid(ctx, bx, c);
        rowLabel(ctx, '= sum', 0, bx.mid, c);
        // A plain cosine of the same amplitude, to show the shift
        wave(ctx, bx, (t) => A * Math.cos(TAU * t), { color: c.fg, alpha: 0.25, width: 1.5, dash: [4, 4] });
        wave(ctx, bx, (t) => a * Math.cos(TAU * t) + b * Math.sin(TAU * t), { color: c.fg, width: 2.25 });
        if (A > 0.05) {
            const from = 1;
            const to = 1 - phase / TAU;
            circle(ctx, bx.x(from), bx.y(A), 4, { color: c.fg, alpha: 0.5 });
            dot(ctx, bx.x(to), bx.y(A), 4, c.fg);
        }
    }
}

/* ---------- Fig: the complex plane ---------- */

class FigComplex extends PlaneFigure {
    static label = 'A draggable point on the complex plane, and the wave it describes.';

    setup() {
        this.setupPlane(0.6, 0.45);
        this.voice = new Voice({ frequency: TONE });
        this.readout = readout();
        this.controls.append(playButton(this.voice), this.readout.element);
        this.update();
    }

    layout(width) {
        const pad = 10;
        const stacked = width < 540;
        const size = stacked ? Math.min(width - 2 * pad, 300) : clamp(width * 0.4, 230, 320);
        const plane = { cx: stacked ? width / 2 : pad + size / 2, cy: pad + size / 2, k: size / 2 / 1.3, size };
        const box = stacked
            ? { left: 6, right: width - 6, top: pad + size + 40, bottom: pad + size + 40 + 130 }
            : { left: pad + size + 36, right: width - 6, top: pad + 40, bottom: pad + size - 20 };
        return { plane, box, height: stacked ? box.bottom + 10 : size + 2 * pad };
    }

    plane() {
        return this.layout(this.w).plane;
    }

    measure(width) {
        return this.layout(width).height;
    }

    update() {
        const A = Math.hypot(this.re, this.im);
        this.voice.set({ amplitudes: [A * 0.8] });
        this.readout.set([
            ['re', num(this.re)], ['im', num(this.im)],
            ['amplitude', num(A)], ['phase', deg(Math.atan2(this.im, this.re))],
        ]);
        this.invalidate();
    }

    draw(ctx, w) {
        const c = this.colors;
        const { plane, box: area } = this.layout(w);
        const { cx, cy, k } = plane;
        const { re, im } = this;
        const A = Math.hypot(re, im);
        const phase = Math.atan2(im, re);
        const zx = cx + re * k;
        const zy = cy - im * k;

        this.drawPlaneGrid(ctx);
        segment(ctx, zx, zy, zx, cy, { color: c.fg, alpha: 0.35, dash: [3, 4] });
        segment(ctx, zx, zy, cx, zy, { color: c.fg, alpha: 0.35, dash: [3, 4] });
        segment(ctx, cx, cy, zx, cy, { color: c.re, width: 3, cap: 'butt' });
        segment(ctx, cx, cy, cx, zy, { color: c.im, width: 3, cap: 'butt' });
        segment(ctx, cx, cy, zx, zy, { color: c.fg, width: 1.5 });
        if (A > 0.12) {
            const r = Math.min(28, A * k * 0.55);
            arc(ctx, cx, cy, r, 0, phase, { color: c.fg, alpha: 0.7 });
            label(ctx, 'φ', cx + (r + 9) * Math.cos(phase / 2), cy - (r + 9) * Math.sin(phase / 2), { color: c.fg, font: c.font, size: 13, align: 'center' });
        }
        dot(ctx, zx, zy, 7, c.fg, { ring: c.bg });

        const box = waveBox({ ...area, duration: 2, range: 1.35 });
        waveGrid(ctx, box, c);
        wave(ctx, box, (t) => re * Math.cos(TAU * t), { color: c.re, alpha: 0.75, width: 1.5 });
        wave(ctx, box, (t) => -im * Math.sin(TAU * t), { color: c.im, alpha: 0.75, width: 1.5 });
        wave(ctx, box, (t) => re * Math.cos(TAU * t) - im * Math.sin(TAU * t), { color: c.fg, width: 2.25 });
        keys(ctx, box.left, box.top - 22, [[c.re, 're · cos'], [c.im, '−im · sin'], [c.fg, 'sum']], c);
    }
}

/* ---------- Fig: atan versus atan2 ---------- */

class FigAtan extends PlaneFigure {
    static label = 'The angle of a point according to atan(im / re) and according to atan2(im, re).';

    setup() {
        this.setupPlane(-0.7, 0.5);
        this.readout = readout();
        this.controls.append(this.readout.element);
        this.update();
    }

    plane() {
        const size = Math.min(this.w - 12, 340);
        return { cx: this.w / 2, cy: size / 2 + 6, k: size / 2 / 1.3, size };
    }

    measure(width) {
        return Math.min(width - 12, 340) + 12;
    }

    update() {
        const wrong = Math.atan(this.im / this.re);
        const right = Math.atan2(this.im, this.re);
        this.readout.set([['atan(im / re)', Number.isNaN(wrong) ? 'undefined' : deg(wrong, 1)], ['atan2(im, re)', deg(right, 1)]]);
        this.invalidate();
    }

    draw(ctx) {
        const c = this.colors;
        const { cx, cy, k, size } = this.plane();

        // The half of the plane where atan gets it wrong
        ctx.fillStyle = c.accent;
        ctx.globalAlpha = 0.06;
        ctx.fillRect(cx - size / 2, cy - size / 2, size / 2, size);
        ctx.globalAlpha = 1;
        label(ctx, 'here, atan is', cx - size / 2 + 8, cy - size / 2 + 12, { color: c.muted, font: c.mono, size: 10 });
        label(ctx, 'off by 180°', cx - size / 2 + 8, cy - size / 2 + 26, { color: c.muted, font: c.mono, size: 10 });

        this.drawPlaneGrid(ctx);

        const { re, im } = this;
        const wrong = Math.atan(im / re);
        const right = Math.atan2(im, re);
        const ray = (angle, length) => [cx + length * Math.cos(angle), cy - length * Math.sin(angle)];

        if (!Number.isNaN(wrong)) {
            const [x, y] = ray(wrong, 1.18 * k);
            arrow(ctx, cx, cy, x, y, { color: c.accent, width: 1.5, dash: [5, 4] });
            arc(ctx, cx, cy, 44, 0, wrong, { color: c.accent, dash: [3, 3] });
            const [lx, ly] = ray(wrong, 1.18 * k + 16);
            label(ctx, 'atan', lx, ly, { color: c.fg, font: c.mono, size: 11, align: 'center' });
        }
        const [x, y] = ray(right, 1.18 * k);
        arrow(ctx, cx, cy, x, y, { color: c.fg, width: 1.75 });
        arc(ctx, cx, cy, 30, 0, right, { color: c.fg, alpha: 0.8 });
        const [lx, ly] = ray(right, 1.18 * k + 16);
        // When both agree, put the labels on either side of the ray
        const same = Math.abs(wrong - right) < 0.01;
        label(ctx, 'atan2', lx, ly + (same ? 12 : 0), { color: c.fg, font: c.mono, size: 11, align: 'center' });

        dot(ctx, cx + re * k, cy - im * k, 7, c.fg, { ring: c.bg });
    }
}

/* ---------- Fig: harmonics ---------- */

const HARMONICS = 12;

class FigHarmonics extends Figure {
    static label = 'A 220 Hz tone with harmonics added on top, and a bar per harmonic showing how much of it is in the mix.';

    setup() {
        this.count = 1;
        this.recipe = 'all';
        this.voice = new Voice({ frequency: TONE, partials: HARMONICS });
        const count = slider({
            label: 'Harmonics', min: 1, max: HARMONICS, step: 1, value: 1, tone: 'accent',
            format: (v) => String(Math.round(v)),
            onInput: (v) => { this.count = Math.round(v); this.update(); },
        });
        const recipe = choice([['all', 'All'], ['odd', 'Odd only']], 'all', (value) => {
            this.recipe = value;
            this.update();
        });
        this.controls.append(playButton(this.voice), recipe.element, count.element);
        this.update();
    }

    get amplitudes() {
        return Array.from({ length: HARMONICS }, (_, i) => {
            const n = i + 1;
            return n <= this.count && (this.recipe === 'all' || n % 2 === 1) ? 1 / n : 0;
        });
    }

    update() {
        this.voice.set({ amplitudes: this.amplitudes.map((a) => a * 0.55) });
        this.invalidate();
    }

    layout(width) {
        const stacked = width < 540;
        if (stacked) {
            return {
                wave: { left: 4, right: width - 4, top: 8, bottom: 168 },
                bars: { left: 4, right: width - 4, top: 214, bottom: 300 },
                height: 322,
            };
        }
        const height = clamp(width * 0.3, 200, 250);
        const split = width * 0.62;
        return {
            wave: { left: 4, right: split - 24, top: 8, bottom: height - 8 },
            bars: { left: split + 12, right: width - 4, top: 34, bottom: height - 30 },
            height,
        };
    }

    measure(width) {
        return this.layout(width).height;
    }

    draw(ctx, w) {
        const c = this.colors;
        const { wave: area, bars } = this.layout(w);
        const amplitudes = this.amplitudes;

        const box = waveBox({ ...area, duration: 2, range: 2 });
        waveGrid(ctx, box, c, { guides: [] });
        amplitudes.forEach((a, i) => {
            if (a && amplitudes.filter(Boolean).length > 1) {
                wave(ctx, box, (t) => a * Math.sin(TAU * (i + 1) * t), { color: c.fg, alpha: 0.16, width: 1 });
            }
        });
        wave(ctx, box, (t) => amplitudes.reduce((sum, a, i) => sum + a * Math.sin(TAU * (i + 1) * t), 0), { color: c.fg, width: 2.25 });

        // One bar per harmonic: how much of each frequency is in the mix
        label(ctx, 'how much of each frequency', bars.left, bars.top - 22, { color: c.muted, font: c.mono, size: 10 });
        const slot = (bars.right - bars.left) / HARMONICS;
        const barWidth = Math.max(3, slot - 4);
        const height = bars.bottom - bars.top;
        segment(ctx, bars.left, bars.bottom + 0.5, bars.right, bars.bottom + 0.5, { color: c.faint });
        amplitudes.forEach((a, i) => {
            const x = bars.left + i * slot + (slot - barWidth) / 2;
            if (!a) return;
            ctx.fillStyle = c.fg;
            ctx.beginPath();
            ctx.roundRect(x, bars.bottom - a * height, barWidth, a * height, [2, 2, 0, 0]);
            ctx.fill();
        });
        label(ctx, `${TONE} Hz`, bars.left, bars.bottom + 14, { color: c.muted, font: c.mono, size: 10 });
        label(ctx, `${TONE * HARMONICS} Hz`, bars.right, bars.bottom + 14, { color: c.muted, font: c.mono, size: 10, align: 'right' });
    }
}

/* ---------- Fig: the spiral (three.js, loaded when it comes near) ---------- */

class FigHelix extends HTMLElement {
    connectedCallback() {
        if (this.stage) return;
        this.classList.add('figure');
        this.stage = document.createElement('div');
        this.stage.className = 'figure-stage';
        this.stage.style.aspectRatio = '2 / 1';
        this.stage.style.minHeight = '250px';
        this.controls = document.createElement('div');
        this.controls.className = 'figure-controls';
        this.views = choice([['free', 'Free'], ['circle', 'Circle'], ['cosine', 'Cosine'], ['sine', 'Sine']], 'free', (view) => this.scene?.look(view));
        this.controls.append(this.views.element);
        this.append(this.stage, this.controls);

        let loading = false;
        new IntersectionObserver(([entry]) => {
            this.scene?.setVisible(entry.isIntersecting);
            if (!entry.isIntersecting || loading) return;
            loading = true;
            import('./helix.js')
                .then(({ mountHelix }) => {
                    this.scene = mountHelix(this.stage, readColors(this), {
                        reducedMotion,
                        onRotate: () => this.views.select('free'),
                    });
                    this.scene.setVisible(true);
                })
                .catch((error) => {
                    console.warn('Could not show the 3D figure', error);
                    const message = document.createElement('p');
                    message.className = 'figure-fallback';
                    message.textContent = 'This figure needs WebGL, which isn’t available in this browser.';
                    this.stage.replaceChildren(message);
                    this.stage.style.aspectRatio = '';
                    this.stage.style.minHeight = '';
                    this.controls.remove();
                });
        }, { rootMargin: '300px' }).observe(this);
    }
}

customElements.define('fig-trace', FigTrace);
customElements.define('fig-wave', FigWave);
customElements.define('fig-interference', FigInterference);
customElements.define('fig-circle', FigCircle);
customElements.define('fig-cos-sin', FigCosSin);
customElements.define('fig-complex', FigComplex);
customElements.define('fig-helix', FigHelix);
customElements.define('fig-atan', FigAtan);
customElements.define('fig-harmonics', FigHarmonics);

