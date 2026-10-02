import * as THREE from 'three';
import { FOG_DENSITY, HIGHLIGHT, WHITE } from './constants';

const vertexShader = /* glsl */ `
    uniform float uTime;
    uniform float uPixelRatio;
    uniform float uSize;
    uniform float uFogDensity;
    attribute float aSeed;
    attribute float aTint;
    varying float vAlpha;
    varying float vTint;

    void main() {
        vec3 p = position;
        p.x += sin(uTime * 0.13 + aSeed * 12.0) * 0.7;
        p.y += sin(uTime * 0.07 + aSeed * 7.0) * 1.2;
        p.z += cos(uTime * 0.11 + aSeed * 9.0) * 0.7;

        vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mvPosition;

        float depth = -mvPosition.z;
        gl_PointSize = uSize * uPixelRatio * (0.4 + aSeed) * (12.0 / max(depth, 0.1));

        float twinkle = 0.55 + 0.45 * sin(uTime * (0.5 + aSeed) + aSeed * 40.0);
        float fog = exp(-pow(uFogDensity * depth, 2.0));
        vAlpha = twinkle * fog * smoothstep(1.0, 6.0, depth);
        vTint = aTint;
    }
`;

const fragmentShader = /* glsl */ `
    uniform vec3 uColor;
    uniform vec3 uTintColor;
    varying float vAlpha;
    varying float vTint;

    void main() {
        float d = length(gl_PointCoord - 0.5);
        float a = smoothstep(0.5, 0.0, d);
        gl_FragColor = vec4(mix(uColor, uTintColor, vTint), a * a * vAlpha * 0.7);
        #include <colorspace_fragment>
    }
`;

/**
 * Slowly drifting, twinkling dust around the tree. Gives depth and parallax
 * while the camera orbits.
 */
export function createDust({ top, bottom, count = 900 }) {
    const positions = new Float32Array(count * 3);
    const seeds = new Float32Array(count);
    const tints = new Float32Array(count);
    const height = top - bottom + 40;

    for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const radius = 7 + Math.pow(Math.random(), 0.7) * 45;
        positions[i * 3] = Math.cos(angle) * radius;
        positions[i * 3 + 1] = top + 20 - Math.random() * height;
        positions[i * 3 + 2] = Math.sin(angle) * radius;
        seeds[i] = Math.random();
        tints[i] = Math.random() < 0.08 ? 1 : 0;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1));
    geometry.setAttribute('aTint', new THREE.BufferAttribute(tints, 1));

    const material = new THREE.ShaderMaterial({
        vertexShader,
        fragmentShader,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        uniforms: {
            uTime: { value: 0 },
            uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
            uSize: { value: 6 },
            uFogDensity: { value: FOG_DENSITY * 0.8 },
            uColor: { value: new THREE.Color(WHITE) },
            uTintColor: { value: new THREE.Color(HIGHLIGHT) },
        },
    });

    const points = new THREE.Points(geometry, material);
    points.frustumCulled = false;

    return {
        object: points,
        update(time, dt) {
            material.uniforms.uTime.value = time;
            material.uniforms.uPixelRatio.value = Math.min(window.devicePixelRatio, 2);
            // Counter-rotate slowly for a bit of parallax against the tree
            points.rotation.y -= dt * 0.012;
        },
    };
}
