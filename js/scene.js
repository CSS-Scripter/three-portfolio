import * as THREE from 'three';
import { BLACK, FOG_DENSITY, FOV } from './constants';

export function getRenderEssentials(target) {
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(BLACK);
    scene.fog = new THREE.FogExp2(BLACK, FOG_DENSITY);

    const bounds = target.getBoundingClientRect();
    const camera = new THREE.PerspectiveCamera(FOV, bounds.width / bounds.height, 0.1, 400);

    // Throws when WebGL is unavailable; main.js falls back to the static list
    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(bounds.width, bounds.height);
    renderer.domElement.setAttribute('aria-hidden', 'true');

    const resizeListeners = [];
    const onResize = (fn) => resizeListeners.push(fn);
    new ResizeObserver(() => {
        const { width, height } = target.getBoundingClientRect();
        if (!width || !height) return;
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.setSize(width, height);
        resizeListeners.forEach((fn) => fn(width, height));
    }).observe(target);

    return { scene, camera, renderer, onResize };
}
