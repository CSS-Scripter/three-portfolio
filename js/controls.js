import { AUTO_ROTATE_SPEED, BASE_DISTANCE, SCROLL_SPEED } from './constants';

const TAU = Math.PI * 2;
const CLICK_DISTANCE = 6;
const CLICK_TIME = 600;

const damp = (current, target, lambda, dt) => current + (target - current) * (1 - Math.exp(-lambda * dt));
const shortestAngle = (from, to) => ((((to - from) % TAU) + TAU * 1.5) % TAU) - Math.PI;

/**
 * Orbits a level camera around the vertical axis of the tree.
 * Horizontal drag rotates, vertical drag/scroll travels along the tree.
 * Works the same for mouse, touch and pen through pointer events.
 */
export class TreeControls {
    constructor(camera, element, { onTap, onHover }) {
        this.camera = camera;
        this.element = element;
        this.onTap = onTap;
        this.onHover = onHover;

        this.azimuth = 0;
        this.azimuthVelocity = 0;
        this.focusAzimuth = null;
        this.autoRotate = true;
        this.autoSpeed = 0;

        this.y = 0;
        this.targetY = 0;
        this.yVelocity = 0;
        this.minY = -Infinity;
        this.maxY = Infinity;
        this.top = Infinity;
        this.bottom = -Infinity;

        this.distance = BASE_DISTANCE;
        this.worldPerPixel = 0.02;
        this.lastInteraction = -Infinity;

        this.pointers = new Map();
        this.drag = null;

        element.style.touchAction = 'none';
        element.addEventListener('pointerdown', this.onPointerDown);
        element.addEventListener('pointermove', this.onPointerMove);
        element.addEventListener('pointerup', this.onPointerUp);
        element.addEventListener('pointercancel', this.onPointerUp);
        element.addEventListener('pointerleave', (e) => {
            if (e.pointerType === 'mouse' && !this.drag) this.onHover(null);
        });
        element.addEventListener('wheel', this.onWheel, { passive: false });
    }

    /** Sizes the orbit so the whole tree fits horizontally, and sets scroll limits. */
    fit({ radius, top, bottom }, width, height) {
        if (!width || !height) return; // e.g. loaded in a hidden tab; the next resize fits
        const vFov = (this.camera.fov * Math.PI) / 180;
        const hFov = 2 * Math.atan(Math.tan(vFov / 2) * (width / height));
        const fitDistance = radius + (radius + 1.5) / Math.tan(hFov / 2);
        this.distance = Math.max(BASE_DISTANCE, fitDistance);

        const visibleHeight = 2 * this.distance * Math.tan(vFov / 2);
        this.worldPerPixel = visibleHeight / height;
        // Root sits in the upper part of the screen at the top, the last layer can be centered at the bottom
        this.top = top;
        this.bottom = bottom;
        this.maxY = top - visibleHeight * 0.22;
        this.minY = Math.min(bottom, this.maxY);
        this.targetY = this.clampY(this.targetY);
        if (!Number.isFinite(this.y)) this.y = this.targetY;
    }

    clampY(y) {
        if (!Number.isFinite(y)) y = this.maxY;
        // While focused on a node, allow centering any node, even near the top
        const focused = this.focusAzimuth !== null;
        const max = focused ? Math.max(this.maxY, this.top) : this.maxY;
        const min = focused ? Math.min(this.minY, this.bottom) : this.minY;
        return Math.min(max, Math.max(min, y));
    }

    get progress() {
        if (this.maxY === this.minY) return 0;
        return (this.maxY - this.y) / (this.maxY - this.minY);
    }

    get isIdle() {
        return performance.now() - this.lastInteraction > 2500;
    }

    /** Camera azimuth at which a point at `angle` on the ring faces the camera. */
    static azimuthFacing(angle) {
        return Math.PI / 2 - angle;
    }

    scrollBy(amount) {
        this.targetY = this.clampY(this.targetY + amount);
        this.lastInteraction = performance.now();
    }

    focus({ azimuth, y }) {
        if (azimuth !== undefined) this.focusAzimuth = azimuth;
        if (y !== undefined) this.targetY = this.clampY(y);
        this.azimuthVelocity = 0;
        this.yVelocity = 0;
    }

    unfocus() {
        this.focusAzimuth = null;
        this.targetY = this.clampY(this.targetY);
    }

    onPointerDown = (e) => {
        if (e.pointerType === 'mouse' && e.button !== 0) return;
        this.pointers.set(e.pointerId, e);
        if (this.pointers.size > 1) return;
        this.element.setPointerCapture(e.pointerId);
        this.drag = {
            id: e.pointerId, startX: e.clientX, startY: e.clientY, lastX: e.clientX, lastY: e.clientY,
            startTime: performance.now(), lastTime: performance.now(), moved: 0, vx: 0, vy: 0,
        };
        this.azimuthVelocity = 0;
        this.yVelocity = 0;
        this.lastInteraction = performance.now();
    };

    onPointerMove = (e) => {
        const drag = this.drag;
        if (!drag || drag.id !== e.pointerId) {
            if (e.pointerType === 'mouse') this.onHover(e);
            return;
        }

        const now = performance.now();
        const dx = e.clientX - drag.lastX;
        const dy = e.clientY - drag.lastY;
        const dt = Math.max((now - drag.lastTime) / 1000, 1 / 240);
        drag.moved = Math.max(drag.moved, Math.hypot(e.clientX - drag.startX, e.clientY - drag.startY));
        drag.lastX = e.clientX;
        drag.lastY = e.clientY;
        drag.lastTime = now;
        this.lastInteraction = now;

        if (drag.moved < CLICK_DISTANCE) return;
        this.element.classList.add('dragging');
        if (this.focusAzimuth !== null) this.unfocus();
        if (e.pointerType === 'mouse') this.onHover(null);

        const rotateSpeed = TAU / Math.max(this.element.clientWidth, 600);
        const da = -dx * rotateSpeed;
        const dyWorld = dy * this.worldPerPixel;
        this.azimuth += da;
        this.targetY = this.clampY(this.targetY + dyWorld);
        this.y = damp(this.y, this.targetY, 30, dt);
        drag.vx = damp(drag.vx, da / dt, 20, dt);
        drag.vy = damp(drag.vy, dyWorld / dt, 20, dt);
    };

    onPointerUp = (e) => {
        this.pointers.delete(e.pointerId);
        const drag = this.drag;
        if (!drag || drag.id !== e.pointerId) return;
        this.drag = null;
        this.element.classList.remove('dragging');
        this.lastInteraction = performance.now();

        const isTap = drag.moved < CLICK_DISTANCE && performance.now() - drag.startTime < CLICK_TIME;
        if (isTap && e.type === 'pointerup') {
            this.onTap(e);
            return;
        }
        // Ignore stale velocity when the pointer rested before release
        if (performance.now() - drag.lastTime < 80) {
            this.azimuthVelocity = drag.vx;
            this.yVelocity = drag.vy;
        }
    };

    onWheel = (e) => {
        e.preventDefault();
        const scale = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? this.element.clientHeight : 1;
        const delta = Math.max(-240, Math.min(240, e.deltaY * scale));
        this.scrollBy(-delta * this.worldPerPixel * SCROLL_SPEED);
        if (e.deltaX) this.azimuth += e.deltaX * scale * 0.002;
    };

    update(dt) {
        if (!this.drag) {
            if (this.focusAzimuth !== null) {
                this.azimuth += shortestAngle(this.azimuth, this.focusAzimuth) * (1 - Math.exp(-4 * dt));
            } else {
                this.azimuth += this.azimuthVelocity * dt;
            }
            this.azimuthVelocity *= Math.exp(-3 * dt);

            this.targetY = this.clampY(this.targetY + this.yVelocity * dt);
            this.yVelocity *= Math.exp(-4 * dt);
            this.y = damp(this.y, this.targetY, 5, dt);
        }

        const rotating = this.autoRotate && this.focusAzimuth === null && !this.drag && this.isIdle;
        this.autoSpeed = damp(this.autoSpeed, rotating ? AUTO_ROTATE_SPEED : 0, 1.5, dt);
        this.azimuth += this.autoSpeed * dt;

        this.camera.position.set(Math.sin(this.azimuth) * this.distance, this.y, Math.cos(this.azimuth) * this.distance);
        this.camera.lookAt(0, this.y, 0);
    }
}
