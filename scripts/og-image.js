// Renders public/og.png: the preview image shown when the site is shared (LinkedIn,
// Slack, WhatsApp, ...). It draws the real career tree from the same layout code as
// the site, with the path to the current role highlighted.
//
// Run `pnpm og` after changing the structure of the tree, and commit the result.
// Text uses the locally installed Noto Sans fonts.

import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { Resvg } from '@resvg/resvg-js';
import * as THREE from 'three';
import { runnerImport } from 'vite';

// Vite's module runner resolves the extensionless imports used throughout js/
const load = async (path) => (await runnerImport(fileURLToPath(new URL(path, import.meta.url)), {
    configFile: false,
    logLevel: 'error',
})).module;

const { nodeData, profile } = await load('../js/data.js');
const { computeLayout } = await load('../js/layout.js');
const { createConnectionCurve } = await load('../js/graph.js');
const { chronological, currentMilestone, escapeHtml, formatMonth, profileRole } = await load('../js/format.js');
const { BLACK, HIGHLIGHT, LINEAGE, NODE_RADIUS, WHITE } = await load('../js/constants.js');

const WIDTH = 1200;
const HEIGHT = 630;
const TREE = { x: 560, width: 640 }; // the tree is drawn in the right part of the image
const OUTPUT = fileURLToPath(new URL('../public/og.png', import.meta.url));

const hex = (color) => `#${new THREE.Color(color).getHexString()}`;
const mix = (a, b, t) => `#${new THREE.Color(a).lerp(new THREE.Color(b), t).getHexString()}`;
const round = (value) => Math.round(value * 10) / 10;

// Career data
const layout = computeLayout(nodeData);
const current = currentMilestone(nodeData);
const byId = new Map(nodeData.map((n) => [n.id, n]));
const lineage = new Set([current.id]);
const addAncestors = (id) => byId.get(id).connectionsFrom.forEach((p) => {
    if (byId.has(p) && !lineage.has(p)) {
        lineage.add(p);
        addAncestors(p);
    }
});
addAncestors(current.id);

// Camera: a side view of the tree, so the spine and the branches leaving it are visible
const fov = 30;
const centerY = (layout.top + layout.bottom) / 2;
const visibleHeight = layout.top - layout.bottom + 10;
const distance = visibleHeight / (2 * Math.tan(THREE.MathUtils.degToRad(fov / 2)));
const camera = new THREE.PerspectiveCamera(fov, TREE.width / HEIGHT, 0.1, 1000);
const placeCamera = (azimuth) => {
    camera.position.set(Math.sin(azimuth) * distance, centerY, Math.cos(azimuth) * distance);
    camera.lookAt(0, centerY, 0);
    camera.updateMatrixWorld();
};

// Look at the current role's column from the side (so it doesn't hide the spine), at
// the angle where milestones overlap each other and the spine the least on screen
const facing = Math.PI / 2 - layout.nodes.get(current.id).angle;
const separation = (azimuth) => {
    placeCamera(azimuth);
    const toScreen = (p) => {
        const v = new THREE.Vector3(p.x, p.y, p.z).project(camera);
        return { x: v.x * TREE.width / 2, y: v.y * HEIGHT / 2 };
    };
    const points = [...layout.nodes.values()].filter((n) => !n.onSpine).map((n) => ({
        ...toScreen(n.position),
        spineX: toScreen({ x: 0, y: n.position.y, z: 0 }).x,
    }));
    let min = Infinity;
    points.forEach((a, i) => {
        min = Math.min(min, Math.abs(a.x - a.spineX));
        points.slice(i + 1).forEach((b) => {
            min = Math.min(min, Math.hypot(a.x - b.x, a.y - b.y));
        });
    });
    return min;
};
let azimuth = facing + Math.PI / 2;
for (let offset = 0.6; offset <= 2.5; offset += 0.02) {
    if (separation(facing + offset) > separation(azimuth)) azimuth = facing + offset;
}
placeCamera(azimuth);

const focal = HEIGHT / 2 / Math.tan(THREE.MathUtils.degToRad(fov / 2));
const project = (p) => {
    const v = new THREE.Vector3(p.x, p.y, p.z);
    const depth = v.clone().applyMatrix4(camera.matrixWorldInverse).z * -1;
    v.project(camera);
    return {
        x: TREE.x + ((v.x + 1) / 2) * TREE.width,
        y: ((1 - v.y) / 2) * HEIGHT,
        depth,
        // 1 at the front of the ring, fading towards the back (stands in for the fog)
        light: 1 - 0.5 * THREE.MathUtils.clamp((depth - (distance - layout.radius)) / (2 * layout.radius), 0, 1),
    };
};

// Connections
const edges = layout.edges.map((edge) => {
    const points = createConnectionCurve(edge.points).getSpacedPoints(160).map(project);
    const highlighted = lineage.has(edge.from) && lineage.has(edge.to);
    const light = points.reduce((sum, p) => sum + p.light, 0) / points.length;
    const d = points.map((p, i) => `${i ? 'L' : 'M'}${round(p.x)} ${round(p.y)}`).join(' ');
    return highlighted
        ? `<path d="${d}" stroke="${hex(HIGHLIGHT)}" stroke-width="2.2" stroke-opacity="0.95" fill="none"/>`
        : `<path d="${d}" stroke="${hex(WHITE)}" stroke-width="1.3" stroke-opacity="${round(0.42 * light)}" fill="none"/>`;
});
// Highlighted connections on top
edges.sort((a, b) => a.includes(hex(HIGHLIGHT)) - b.includes(hex(HIGHLIGHT)));

// Nodes, back to front
const nodes = [...layout.nodes.entries()]
    .map(([id, item]) => ({ id, ...project(item.position) }))
    .sort((a, b) => b.depth - a.depth)
    .map((n) => {
        const r = (NODE_RADIUS * focal) / n.depth;
        const isCurrent = n.id === current.id;
        const color = isCurrent ? HIGHLIGHT : lineage.has(n.id) ? LINEAGE : WHITE;
        const fill = mix(color, BLACK, isCurrent ? 0 : 1 - n.light);
        const glow = `<circle cx="${round(n.x)}" cy="${round(n.y)}" r="${round(r * 5)}" fill="url(#${isCurrent ? 'glow-accent' : 'glow'})" opacity="${isCurrent ? 0.55 : round(0.12 * n.light)}"/>`;
        const ring = isCurrent
            ? `<circle cx="${round(n.x)}" cy="${round(n.y)}" r="${round(r * 1.75)}" stroke="${hex(HIGHLIGHT)}" stroke-width="1.6" stroke-opacity="0.7" fill="none"/>`
            : '';
        // Awards orbit their milestone, as on the site
        const awards = byId.get(n.id).awards ?? [];
        const satellites = awards.map((_, i) => {
            const a = -Math.PI / 2 + (i / awards.length) * Math.PI * 2;
            const orbit = r * 2.3;
            return `<circle cx="${round(n.x + Math.cos(a) * orbit)}" cy="${round(n.y + Math.sin(a) * orbit)}" r="${round(Math.max(r * 0.2, 1.4))}" fill="${hex(HIGHLIGHT)}"/>`;
        }).join('');
        return `${glow}<circle cx="${round(n.x)}" cy="${round(n.y)}" r="${round(r)}" fill="${fill}"/>${ring}${satellites}`;
    });

// Dust, deterministic so the image only changes when the tree does
let seed = 7;
const random = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
const dust = Array.from({ length: 150 }, () => {
    const x = 380 + random() * (WIDTH - 380);
    const y = random() * HEIGHT;
    const accent = random() < 0.08;
    return `<circle cx="${round(x)}" cy="${round(y)}" r="${round(0.6 + random() * 1.3)}" fill="${accent ? hex(HIGHLIGHT) : hex(WHITE)}" opacity="${round(0.08 + random() * 0.3)}"/>`;
});

const first = chronological(nodeData)[0];
const period = `${formatMonth(first.start).split(' ')[1]} – ${current.end ? formatMonth(current.end) : 'present'}`;

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
    <defs>
        <radialGradient id="glow">
            <stop offset="0" stop-color="${hex(WHITE)}" stop-opacity="1"/>
            <stop offset="1" stop-color="${hex(WHITE)}" stop-opacity="0"/>
        </radialGradient>
        <radialGradient id="glow-accent">
            <stop offset="0" stop-color="${hex(HIGHLIGHT)}" stop-opacity="1"/>
            <stop offset="1" stop-color="${hex(HIGHLIGHT)}" stop-opacity="0"/>
        </radialGradient>
        <radialGradient id="vignette" cx="0.5" cy="0.5" r="0.75">
            <stop offset="0.55" stop-color="${hex(BLACK)}" stop-opacity="0"/>
            <stop offset="1" stop-color="${hex(BLACK)}" stop-opacity="0.8"/>
        </radialGradient>
    </defs>
    <rect width="100%" height="100%" fill="${hex(BLACK)}"/>
    ${dust.join('')}
    ${edges.join('')}
    ${nodes.join('')}
    <rect width="100%" height="100%" fill="url(#vignette)"/>
    <g font-family="Noto Sans">
        <text x="80" y="262" font-family="Noto Sans Mono" font-size="17" letter-spacing="2" fill="${hex(HIGHLIGHT)}">CAREER MAP · ${escapeHtml(period.toUpperCase())}</text>
        <text x="78" y="330" font-size="64" font-weight="bold" letter-spacing="-1" fill="${hex(WHITE)}">${escapeHtml(profile.name)}</text>
        <text x="80" y="378" font-size="27" font-style="italic" fill="${hex(WHITE)}" fill-opacity="0.6">${escapeHtml(profileRole(profile, nodeData))}</text>
    </g>
</svg>`;

const png = new Resvg(svg, {
    font: { loadSystemFonts: true, defaultFontFamily: 'Noto Sans' },
}).render().asPng();
await writeFile(OUTPUT, png);
console.log(`Wrote ${OUTPUT} (${(png.length / 1024).toFixed(0)} kB)`);
