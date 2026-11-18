// The 3D figure: a point going round a circle while moving along a time axis draws a
// spiral. Looking along each axis shows one of the 2D pictures from the post:
//   along time            → the circle
//   along the imaginary   → the real part over time: a cosine (its shadow on the floor)
//   along the real axis   → the imaginary part over time: a sine (its shadow on the wall)
//
// World axes: x = time, y = imaginary (up), z = real (towards the default camera).
// Orthographic, so the views along an axis are exact projections.

import * as THREE from 'three';
import { Line2 } from 'three/addons/lines/Line2.js';
import { LineGeometry } from 'three/addons/lines/LineGeometry.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';

const LENGTH = 9;       // of the time axis
const TURNS = 2.5;
const SHADOW = 1.75;    // distance of the floor and wall from the time axis
const START = -LENGTH / 2;
const TAU = Math.PI * 2;

const X = new THREE.Vector3(1, 0, 0);
const Y = new THREE.Vector3(0, 1, 0);
const Z = new THREE.Vector3(0, 0, 1);

function orientation(direction, up) {
    const matrix = new THREE.Matrix4().lookAt(direction.clone().normalize(), new THREE.Vector3(), up);
    return new THREE.Quaternion().setFromRotationMatrix(matrix);
}

// What has to fit in view (world units), per preset
const VIEWS = {
    free: { q: orientation(new THREE.Vector3(-0.85, 0.55, 1), Y), fit: [10.4, 6.4] },
    circle: { q: orientation(new THREE.Vector3(-1, 0, 0), Y), fit: [5, 4.4] },
    cosine: { q: orientation(new THREE.Vector3(0, -1, 0), Z), fit: [11, 3.4] },
    sine: { q: orientation(new THREE.Vector3(0, 0, 1), Y), fit: [11, 3.4] },
};

const smoothstep = (a, b, x) => {
    const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
    return t * t * (3 - 2 * t);
};
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

function glowTexture() {
    const size = 64;
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext('2d');
    const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    gradient.addColorStop(0, 'rgba(255,255,255,1)');
    gradient.addColorStop(0.25, 'rgba(255,255,255,0.35)');
    gradient.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
}

/**
 * @param {HTMLElement} stage
 * @param {ReturnType<import('../lib/figure.js').readColors>} colors
 * @param {{ reducedMotion: boolean, onRotate: () => void }} options
 */
export function mountHelix(stage, colors, { reducedMotion, onRotate }) {
    // Throws without WebGL; the figure shows a message instead
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    const canvas = renderer.domElement;
    canvas.setAttribute('role', 'img');
    canvas.setAttribute('aria-label', 'A spiral drawn by a point going round a circle while moving along a time axis, with its cosine shadow on the floor and its sine shadow on the back wall.');
    canvas.style.touchAction = 'pan-y';
    canvas.style.cursor = 'grab';
    stage.prepend(canvas);

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 100);
    const color = (css) => new THREE.Color(css);
    const fg = color(colors.fg);
    const materials = [];

    function line(points, css, { width = 2, opacity = 1, dashed = false } = {}) {
        const geometry = new LineGeometry();
        geometry.setPositions(points.flatMap((p) => [p.x, p.y, p.z]));
        const material = new LineMaterial({
            color: css instanceof THREE.Color ? css : color(css),
            linewidth: width,
            transparent: opacity < 1,
            opacity,
            dashed,
            dashSize: 0.12,
            gapSize: 0.1,
            depthWrite: opacity === 1,
        });
        materials.push(material);
        const mesh = new Line2(geometry, material);
        if (dashed) mesh.computeLineDistances();
        scene.add(mesh);
        return mesh;
    }

    const at = (u) => {
        const angle = TAU * TURNS * u;
        return new THREE.Vector3(START + LENGTH * u, Math.sin(angle), Math.cos(angle));
    };
    const samples = Array.from({ length: 721 }, (_, i) => at(i / 720));

    // Floor and back wall, with the shadows of the spiral on them
    const rect = (corners) => [...corners, corners[0]];
    line(rect([
        new THREE.Vector3(START, -SHADOW, -1.25), new THREE.Vector3(-START, -SHADOW, -1.25),
        new THREE.Vector3(-START, -SHADOW, 1.25), new THREE.Vector3(START, -SHADOW, 1.25),
    ]), fg, { width: 1, opacity: 0.12 });
    line(rect([
        new THREE.Vector3(START, -1.25, -SHADOW), new THREE.Vector3(-START, -1.25, -SHADOW),
        new THREE.Vector3(-START, 1.25, -SHADOW), new THREE.Vector3(START, 1.25, -SHADOW),
    ]), fg, { width: 1, opacity: 0.12 });
    line(samples.map((p) => new THREE.Vector3(p.x, -SHADOW, p.z)), colors.re, { width: 2, opacity: 0.9 });
    line(samples.map((p) => new THREE.Vector3(p.x, p.y, -SHADOW)), colors.im, { width: 2, opacity: 0.9 });

    // Axes at the start of time, and the time axis itself
    line([new THREE.Vector3(START, 0, 0), new THREE.Vector3(-START + 0.9, 0, 0)], fg, { width: 1, opacity: 0.3 });
    line([new THREE.Vector3(START, 0, -1.3), new THREE.Vector3(START, 0, 1.3)], colors.re, { width: 1.5 });
    line([new THREE.Vector3(START, -1.3, 0), new THREE.Vector3(START, 1.3, 0)], colors.im, { width: 1.5 });
    line(Array.from({ length: 129 }, (_, i) => {
        const angle = (TAU * i) / 128;
        return new THREE.Vector3(START, Math.sin(angle), Math.cos(angle));
    }), fg, { width: 1, opacity: 0.25 });

    // The spiral
    line(samples, fg, { width: 2.5 });

    // A point travelling along it, dropping lines onto its two shadows
    const marker = new THREE.Group();
    const ball = (css, radius) => new THREE.Mesh(new THREE.SphereGeometry(radius, 16, 12), new THREE.MeshBasicMaterial({ color: color(css) }));
    const point = ball(colors.fg, 0.075);
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: fg, transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending }));
    glow.scale.setScalar(0.9);
    const floorPoint = ball(colors.re, 0.06);
    const wallPoint = ball(colors.im, 0.06);
    marker.add(point, glow);
    scene.add(marker, floorPoint, wallPoint);

    const connector = (css) => {
        const geometry = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]);
        const mesh = new THREE.Line(geometry, new THREE.LineDashedMaterial({ color: color(css), dashSize: 0.1, gapSize: 0.08, transparent: true, opacity: 0.7 }));
        scene.add(mesh);
        return mesh;
    };
    const toFloor = connector(colors.re);
    const toWall = connector(colors.im);

    function placeMarker(u) {
        const p = at(u);
        marker.position.copy(p);
        floorPoint.position.set(p.x, -SHADOW, p.z);
        wallPoint.position.set(p.x, p.y, -SHADOW);
        toFloor.geometry.setFromPoints([p, floorPoint.position]);
        toFloor.computeLineDistances();
        toWall.geometry.setFromPoints([p, wallPoint.position]);
        toWall.computeLineDistances();
    }

    // Labels: HTML on top of the canvas, faded out when their axis or plane is edge-on
    const labels = [
        ['time →', new THREE.Vector3(-START + 1.2, 0, 0), (view) => 1 - smoothstep(0.85, 0.97, Math.abs(view.dot(X)))],
        ['real', new THREE.Vector3(START, 0, 1.55), (view) => 1 - smoothstep(0.85, 0.97, Math.abs(view.dot(Z)))],
        ['imaginary', new THREE.Vector3(START, 1.55, 0), (view) => 1 - smoothstep(0.85, 0.97, Math.abs(view.dot(Y)))],
        ['cosine', new THREE.Vector3(-START + 0.7, -SHADOW, -1.1), (view) => smoothstep(0.2, 0.4, Math.abs(view.dot(Y)))],
        ['sine', new THREE.Vector3(-START + 0.35, 1.55, -SHADOW), (view) => smoothstep(0.2, 0.4, Math.abs(view.dot(Z)))],
    ].map(([text, position, visibility]) => {
        const el = document.createElement('span');
        el.className = 'figure-label';
        el.textContent = text;
        el.setAttribute('aria-hidden', 'true');
        stage.append(el);
        return { el, position, visibility };
    });

    // Camera: an orientation (quaternion) around the centre, dragged freely or eased to a preset
    const orientationNow = VIEWS.free.q.clone();
    let fit = [...VIEWS.free.fit];
    let tween = null;
    let width = 1;
    let height = 1;

    function updateCamera() {
        const aspect = width / height;
        const halfHeight = Math.max(fit[1] / 2, fit[0] / 2 / aspect);
        camera.left = -halfHeight * aspect;
        camera.right = halfHeight * aspect;
        camera.top = halfHeight;
        camera.bottom = -halfHeight;
        camera.updateProjectionMatrix();
        camera.quaternion.copy(orientationNow);
        camera.position.set(0, 0, 30).applyQuaternion(orientationNow);
    }

    function look(name) {
        const view = VIEWS[name];
        tween = { from: orientationNow.clone(), fromFit: [...fit], to: view.q, toFit: view.fit, t: 0 };
        requestRender();
    }

    let dragging = null;
    canvas.addEventListener('pointerdown', (event) => {
        dragging = { x: event.clientX, y: event.clientY };
        tween = null;
        canvas.setPointerCapture(event.pointerId);
        canvas.style.cursor = 'grabbing';
    });
    canvas.addEventListener('pointermove', (event) => {
        if (!dragging) return;
        const dx = event.clientX - dragging.x;
        const dy = event.clientY - dragging.y;
        dragging = { x: event.clientX, y: event.clientY };
        if (!dx && !dy) return;
        const up = Y.clone().applyQuaternion(orientationNow);
        const right = X.clone().applyQuaternion(orientationNow);
        orientationNow.premultiply(new THREE.Quaternion().setFromAxisAngle(up, -dx * 0.008));
        orientationNow.premultiply(new THREE.Quaternion().setFromAxisAngle(right, -dy * 0.008));
        orientationNow.normalize();
        fit = [...VIEWS.free.fit];
        onRotate();
        requestRender();
    });
    const release = () => {
        dragging = null;
        canvas.style.cursor = 'grab';
    };
    canvas.addEventListener('pointerup', release);
    canvas.addEventListener('pointercancel', release);

    new ResizeObserver(() => {
        width = stage.clientWidth;
        height = stage.clientHeight;
        if (!width || !height) return;
        renderer.setSize(width, height);
        materials.forEach((m) => m.resolution.set(width, height));
        requestRender();
    }).observe(stage);

    // Rendering: continuously while visible (for the travelling point), else on demand
    let visible = false;
    let travelled = 0.3;
    let last = 0;
    let pending = false;
    const view = new THREE.Vector3();
    const projected = new THREE.Vector3();

    function frame(now) {
        pending = false;
        const dt = last ? Math.min((now - last) / 1000, 0.05) : 0;
        last = visible && !reducedMotion ? now : 0;

        if (tween) {
            tween.t = Math.min(1, tween.t + dt / 0.9 + (dt ? 0 : 0.02));
            const k = ease(tween.t);
            orientationNow.slerpQuaternions(tween.from, tween.to, k);
            fit = [0, 1].map((i) => tween.fromFit[i] + (tween.toFit[i] - tween.fromFit[i]) * k);
            if (tween.t >= 1) tween = null;
        }
        if (!reducedMotion) travelled = (travelled + dt * 0.06) % 1;
        placeMarker(travelled);
        updateCamera();
        renderer.render(scene, camera);

        view.set(0, 0, 1).applyQuaternion(orientationNow);
        for (const { el, position, visibility } of labels) {
            projected.copy(position).project(camera);
            const x = ((projected.x + 1) / 2) * width;
            const y = ((1 - projected.y) / 2) * height;
            const inside = x > 0 && x < width && y > 0 && y < height;
            el.style.transform = `translate(-50%, -50%) translate(${x}px, ${y}px)`;
            el.style.opacity = inside ? String(visibility(view)) : '0';
        }

        if ((visible && !reducedMotion) || tween) requestRender();
    }

    function requestRender() {
        if (pending) return;
        pending = true;
        requestAnimationFrame(frame);
    }

    return {
        look,
        setVisible(value) {
            visible = value;
            last = 0;
            if (visible) requestRender();
        },
    };
}
