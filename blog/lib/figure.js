// Base class for the 2D figures in posts: a canvas that redraws when it is resized or
// its state changes, a row of controls underneath, and (for animated figures) an
// animation loop that only runs while the figure is on screen.

export const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** The palette, read from the CSS custom properties in tokens.css (and the visitor's theme). */
export function readColors(el) {
    const style = getComputedStyle(el);
    const get = (name) => style.getPropertyValue(name).trim();
    return {
        fg: get('--fg'),
        muted: get('--muted'),
        faint: get('--faint'),
        dimmed: get('--dimmed'),
        bg: get('--bg'),
        re: get('--re'),
        im: get('--im'),
        accent: get('--accent'),
        mono: get('--mono'),
        font: get('--font'),
    };
}

export class Figure extends HTMLElement {
    /** Animated figures redraw every frame while visible and not paused. */
    static animated = false;
    /** Short description of the drawing, for screen readers. */
    static label = '';

    connectedCallback() {
        if (this.stage) return;
        this.classList.add('figure');
        this.colors = readColors(this);

        this.stage = document.createElement('div');
        this.stage.className = 'figure-stage';
        this.canvas = document.createElement('canvas');
        this.canvas.setAttribute('role', 'img');
        this.canvas.setAttribute('aria-label', this.constructor.label);
        this.stage.append(this.canvas);
        this.controls = document.createElement('div');
        this.controls.className = 'figure-controls';
        this.append(this.stage, this.controls);

        this.ctx = this.canvas.getContext('2d');
        this.w = 0;
        this.h = 0;
        this.time = 0;
        this.visible = false;
        this.running = this.constructor.animated && !reducedMotion;

        this.setup();
        if (!this.controls.childElementCount) this.controls.remove();

        // The visitor picked another theme (js/theme.js)
        document.addEventListener('themechange', () => {
            this.colors = readColors(this);
            this.invalidate();
        });

        new ResizeObserver(() => this.resize()).observe(this.stage);
        new IntersectionObserver(([entry]) => {
            this.visible = entry.isIntersecting;
            if (this.visible) this.invalidate();
            else this.leave();
        }).observe(this);
    }

    resize() {
        const width = this.stage.clientWidth;
        if (!width) return;
        const height = Math.round(this.measure(width));
        const ratio = Math.min(window.devicePixelRatio || 1, 2);
        this.canvas.width = Math.round(width * ratio);
        this.canvas.height = Math.round(height * ratio);
        this.canvas.style.height = `${height}px`;
        this.ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
        this.w = width;
        this.h = height;
        this.invalidate();
    }

    /** Ask for a redraw on the next frame. */
    invalidate() {
        if (this.frame) return;
        this.frame = requestAnimationFrame((now) => this.render(now));
    }

    render(now) {
        this.frame = 0;
        if (!this.w) return;
        const animating = this.running && this.visible;
        const dt = animating && this.lastFrame ? Math.min((now - this.lastFrame) / 1000, 0.05) : 0;
        this.lastFrame = animating ? now : 0;
        this.time += dt;

        this.ctx.clearRect(0, 0, this.w, this.h);
        this.draw(this.ctx, this.w, this.h);
        if (animating) this.invalidate();
    }

    setRunning(running) {
        this.running = running;
        this.lastFrame = 0;
        this.invalidate();
    }

    /** Scrolled out of view: stop the sound, so it doesn't follow the reader around. */
    leave() {
        this.voice?.stop();
    }

    /* To implement */
    setup() {}
    measure(width) { return width * 0.4; }
    draw(ctx, width, height) {}
}

/**
 * Lets the reader drag something on a canvas. `hit` decides whether a press starts a
 * drag; `move` gets canvas coordinates in CSS pixels.
 */
export function draggable(canvas, { hit = () => true, move, end }) {
    canvas.classList.add('draggable');
    let dragging = false;
    const local = (event) => {
        const rect = canvas.getBoundingClientRect();
        return { x: event.clientX - rect.left, y: event.clientY - rect.top };
    };

    canvas.addEventListener('pointerdown', (event) => {
        const point = local(event);
        if (!hit(point)) return;
        dragging = true;
        canvas.setPointerCapture(event.pointerId);
        canvas.classList.add('dragging');
        move(point);
        event.preventDefault();
    });
    canvas.addEventListener('pointermove', (event) => {
        const point = local(event);
        if (dragging) move(point);
        else canvas.classList.toggle('grab', hit(point));
    });
    const stop = () => {
        if (!dragging) return;
        dragging = false;
        canvas.classList.remove('dragging');
        end?.();
    };
    canvas.addEventListener('pointerup', stop);
    canvas.addEventListener('pointercancel', stop);
}

/** Arrow keys nudge a value pair, for readers without a pointer. */
export function nudgeable(canvas, onNudge, step = 0.05) {
    canvas.tabIndex = 0;
    canvas.addEventListener('keydown', (event) => {
        const delta = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, step], ArrowDown: [0, -step] }[event.key];
        if (!delta) return;
        event.preventDefault();
        onNudge(...delta);
    });
}
