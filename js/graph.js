import * as THREE from 'three';
import { Line2 } from 'three/addons/lines/Line2.js';
import { LineGeometry } from 'three/addons/lines/LineGeometry.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';
import { DIMMED, HIGHLIGHT, LINEAGE, NODE_RADIUS, WHITE } from './constants';
import { getGlowTexture } from './textures';

const discGeometry = new THREE.CircleGeometry(NODE_RADIUS, 64);
const ringGeometry = new THREE.RingGeometry(NODE_RADIUS * 1.45, NODE_RADIUS * 1.58, 64);
const hitGeometry = new THREE.CircleGeometry(NODE_RADIUS * 1.9, 16);
const haloGeometry = new THREE.PlaneGeometry(1, 1);

const COLORS = {
    white: new THREE.Color(WHITE),
    highlight: new THREE.Color(HIGHLIGHT),
    lineage: new THREE.Color(LINEAGE),
    dimmed: new THREE.Color(DIMMED),
};

const easeOutBack = (x) => 1 + 2.2 * Math.pow(x - 1, 3) + 1.2 * Math.pow(x - 1, 2);
const clamp01 = (x) => Math.min(1, Math.max(0, x));
const damp = (current, target, lambda, dt) => current + (target - current) * (1 - Math.exp(-lambda * dt));

/**
 * Smooth path through a list of points with vertical tangents at every point, so
 * connectors leave the bottom of a node and arrive at the top of the next one.
 */
export function createConnectionCurve(points) {
    const path = new THREE.CurvePath();
    for (let i = 0; i < points.length - 1; i++) {
        const a = points[i];
        const b = points[i + 1];
        const start = new THREE.Vector3(a.x, a.y - (i === 0 ? NODE_RADIUS : 0), a.z);
        const end = new THREE.Vector3(b.x, b.y + (i === points.length - 2 ? NODE_RADIUS : 0), b.z);
        const middle = (start.y + end.y) / 2;
        path.add(new THREE.CubicBezierCurve3(
            start,
            new THREE.Vector3(start.x, middle, start.z),
            new THREE.Vector3(end.x, middle, end.z),
            end,
        ));
    }
    return path;
}

function createNodeView(data, item) {
    const group = new THREE.Group();
    group.position.set(item.position.x, item.position.y, item.position.z);

    // Everything visual lives in a billboard that always faces the camera
    const billboard = new THREE.Group();
    group.add(billboard);

    const halo = new THREE.Mesh(haloGeometry, new THREE.MeshBasicMaterial({
        map: getGlowTexture(), transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending,
    }));
    halo.scale.setScalar(NODE_RADIUS * 8);
    halo.position.z = -0.05;

    const disc = new THREE.Mesh(discGeometry, new THREE.MeshBasicMaterial({ color: WHITE }));

    const ring = new THREE.Mesh(ringGeometry, new THREE.MeshBasicMaterial({
        color: HIGHLIGHT, transparent: true, opacity: 0, depthWrite: false,
    }));

    // Larger invisible target, so small nodes are easy to hit (especially on touch)
    const hit = new THREE.Mesh(hitGeometry, new THREE.MeshBasicMaterial({ visible: false }));
    hit.userData.id = data.id;

    billboard.add(halo, disc, ring, hit);

    let ping = null;
    if (data.end === null) {
        ping = new THREE.Mesh(ringGeometry, new THREE.MeshBasicMaterial({
            color: HIGHLIGHT, transparent: true, opacity: 0, depthWrite: false,
        }));
        billboard.add(ping);
    }

    return {
        id: data.id,
        data,
        layer: item.layer,
        angle: item.angle,
        position: group.position,
        group, billboard, halo, disc, ring, ping, hit,
        appearAt: 0.5 + item.layer * 0.45,
        state: { scale: 0, halo: 0, ring: 0 },
    };
}

function createEdgeView(edge, nodeViews) {
    const curve = createConnectionCurve(edge.points);
    const divisions = 48 * (edge.points.length - 1);
    const points = curve.getSpacedPoints(divisions);

    const geometry = new LineGeometry();
    geometry.setPositions(points.flatMap((p) => [p.x, p.y, p.z]));
    geometry.instanceCount = 0;

    const material = new LineMaterial({
        color: WHITE, linewidth: 1.4, transparent: true, opacity: 0, depthWrite: false, fog: true,
    });
    const line = new Line2(geometry, material);

    return {
        from: edge.from,
        to: edge.to,
        curve,
        length: curve.getLength(),
        segments: divisions,
        line,
        material,
        startAt: nodeViews.get(edge.from).appearAt + 0.2,
        endAt: nodeViews.get(edge.to).appearAt + 0.1,
        pulseOffset: Math.random(),
        state: { opacity: 0 },
    };
}

function createPulses(edges) {
    const positions = new Float32Array(edges.length * 3);
    const colors = new Float32Array(edges.length * 3);
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    const material = new THREE.PointsMaterial({
        size: 0.9,
        map: getGlowTexture(),
        vertexColors: true,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
    });
    const points = new THREE.Points(geometry, material);
    points.frustumCulled = false;
    return points;
}

export function createGraph(layout, nodes) {
    const group = new THREE.Group();

    const nodeViews = new Map(nodes.map((n) => [n.id, createNodeView(n, layout.nodes.get(n.id))]));
    const edgeViews = layout.edges.map((e) => createEdgeView(e, nodeViews));
    const pulses = createPulses(edgeViews);

    edgeViews.forEach((e) => group.add(e.line));
    nodeViews.forEach((n) => group.add(n.group));
    group.add(pulses);

    const pickables = [...nodeViews.values()].map((n) => n.hit);
    const tmpPoint = new THREE.Vector3();

    function setResolution(width, height) {
        edgeViews.forEach((e) => e.material.resolution.set(width, height));
    }

    /**
     * @param {number} dt
     * @param {number} time      seconds since start, drives the intro
     * @param {THREE.Camera} camera
     * @param {{ hovered: string|null, selected: string|null, lineage: Set<string>, reducedMotion: boolean }} view
     */
    function update(dt, time, camera, view) {
        const focus = view.selected !== null;

        nodeViews.forEach((n) => {
            n.billboard.quaternion.copy(camera.quaternion);

            const isHovered = n.id === view.hovered;
            const isSelected = n.id === view.selected;
            const inLineage = view.lineage.has(n.id);

            let color = COLORS.white;
            let halo = 0.09;
            let ring = 0;
            if (isSelected || isHovered) {
                color = COLORS.highlight; halo = 0.4; ring = 1;
            } else if (inLineage) {
                color = COLORS.lineage; halo = 0.18;
            } else if (focus) {
                color = COLORS.dimmed; halo = 0.02;
            }

            const appear = clamp01((time - n.appearAt) / 0.7);
            const targetScale = easeOutBack(appear) * (isHovered || isSelected ? 1.18 : 1);
            n.state.scale = appear < 1 ? targetScale : damp(n.state.scale, targetScale, 14, dt);
            n.state.halo = damp(n.state.halo, halo * appear, 8, dt);
            n.state.ring = damp(n.state.ring, ring, 10, dt);

            n.billboard.scale.setScalar(Math.max(n.state.scale, 0.0001));
            n.disc.material.color.lerp(color, 1 - Math.exp(-10 * dt));
            n.halo.material.opacity = n.state.halo;
            n.ring.material.opacity = n.state.ring;
            n.ring.scale.setScalar(0.85 + 0.15 * n.state.ring);

            if (n.ping) {
                // Sonar ping marking the current position
                const cycle = view.reducedMotion ? 0.35 : (time * 0.45) % 1;
                n.ping.scale.setScalar(1 + cycle * 1.1);
                n.ping.material.opacity = (1 - cycle) * 0.55 * appear * (1 - n.state.ring);
            }
        });

        const pulsePositions = pulses.geometry.attributes.position;
        const pulseColors = pulses.geometry.attributes.color;

        edgeViews.forEach((e, i) => {
            const progress = clamp01((time - e.startAt) / Math.max(e.endAt - e.startAt, 0.2));
            e.line.geometry.instanceCount = Math.round(progress * e.segments);

            const touchesHover = view.hovered !== null && (e.from === view.hovered || e.to === view.hovered);
            const inLineage = focus && view.lineage.has(e.from)
                && (view.lineage.has(e.to) || e.to === view.selected);

            let color = COLORS.white;
            let opacity = 0.42;
            if (inLineage) {
                color = COLORS.highlight; opacity = 0.95;
            } else if (touchesHover) {
                opacity = 0.9;
            } else if (focus) {
                opacity = 0.12;
            }
            e.state.opacity = damp(e.state.opacity, opacity, 8, dt);
            e.material.opacity = e.state.opacity;
            e.material.color.lerp(color, 1 - Math.exp(-8 * dt));
            // Connections share the spine: draw highlighted ones on top of the overlapping rest
            e.line.renderOrder = inLineage ? 2 : touchesHover ? 1 : 0;

            // A small light travelling down each connection, every few seconds
            let brightness = 0;
            if (progress >= 1 && !view.reducedMotion) {
                const speed = 3.2 / e.length;
                const cycle = (time * speed * 0.35 + e.pulseOffset) % 1;
                const travel = cycle / 0.6;
                if (travel < 1) {
                    e.curve.getPointAt(travel, tmpPoint);
                    brightness = Math.sin(Math.PI * travel) * e.state.opacity * 1.1;
                }
            }
            pulsePositions.setXYZ(i, tmpPoint.x, tmpPoint.y, tmpPoint.z);
            const pulseColor = inLineage ? COLORS.highlight : COLORS.white;
            pulseColors.setXYZ(i, pulseColor.r * brightness, pulseColor.g * brightness, pulseColor.b * brightness);
        });
        pulsePositions.needsUpdate = true;
        pulseColors.needsUpdate = true;
    }

    const introDuration = Math.max(...edgeViews.map((e) => e.endAt), ...[...nodeViews.values()].map((n) => n.appearAt + 0.7));

    return { group, nodes: nodeViews, edges: edgeViews, pickables, setResolution, update, introDuration };
}
