import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

export function getRenderEssentials(target) {
    const scene = new THREE.Scene();
    const bounds = target.getBoundingClientRect();
    const camera = new THREE.PerspectiveCamera(100, bounds.width / bounds.height, 0.0001, 1000);

    const renderer = new THREE.WebGLRenderer();
    renderer.setSize(bounds.width, bounds.height);
    window.addEventListener('resize', () => {
        const bounds = target.getBoundingClientRect();
        camera.aspect = bounds.width / bounds.height;
        camera.updateProjectionMatrix();
        renderer.setSize(bounds.width, bounds.height);
    });

    return { scene, camera, renderer };
}

export function createControls(camera, renderer) {
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.minPolarAngle = Math.PI/2;
    controls.maxPolarAngle = Math.PI/2;
    controls.autoRotate = true;
    controls.enableZoom = false;
    controls.enablePan = false;
    controls.enableDamping = true;
    controls.dampingFactor = 0.2;

    return controls;
}