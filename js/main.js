import * as THREE from 'three';
import { createDust } from './ambience';
import { SCROLL_STEP } from './constants';
import { TreeControls } from './controls';
import { GetNodeRelations, nodeData } from './data';
import { chronological, currentMilestone } from './format';
import { createGraph } from './graph';
import { computeLayout } from './layout';
import { getRenderEssentials } from './scene';
import { createUI } from './ui';

const targetDocument = document.getElementById('render');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

let essentials;
try {
    essentials = getRenderEssentials(targetDocument);
} catch (error) {
    // No WebGL: the static milestone list (baked into index.html) becomes the page
    console.warn('WebGL unavailable, showing the plain list instead.', error);
    document.body.classList.add('no-webgl');
}

if (essentials) start(essentials);

function start({ scene, camera, renderer, onResize }) {
    document.body.classList.add('webgl');
    targetDocument.prepend(renderer.domElement);

    const byId = new Map(nodeData.map((n) => [n.id, n]));
    const relations = GetNodeRelations();
    const timeline = chronological(nodeData);

    const layout = computeLayout(nodeData);
    const graph = createGraph(layout, nodeData);
    const dust = createDust(layout);
    scene.add(graph.group, dust.object);

    const view = { hovered: null, selected: null, lineage: new Set(), reducedMotion };

    const ui = createUI({ onSelect: select, onClose: deselect });
    ui.setListOpen(false);

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let lastHover = null;

    function pick(clientX, clientY) {
        const bounds = renderer.domElement.getBoundingClientRect();
        pointer.x = ((clientX - bounds.left) / bounds.width) * 2 - 1;
        pointer.y = -((clientY - bounds.top) / bounds.height) * 2 + 1;
        raycaster.setFromCamera(pointer, camera);
        const hit = raycaster.intersectObjects(graph.pickables, false)[0];
        return hit ? hit.object.userData.id : null;
    }

    const controls = new TreeControls(camera, renderer.domElement, {
        onTap(event) {
            ui.dismissHelp();
            const id = pick(event.clientX, event.clientY);
            if (id) select(id);
            else deselect();
        },
        onHover(event) {
            lastHover = event;
        },
    });

    // Hover picking is done once per frame (the scene moves under a still cursor too)
    function updateHover() {
        const id = lastHover ? pick(lastHover.clientX, lastHover.clientY) : null;
        view.hovered = id;
        renderer.domElement.classList.toggle('pointing', id !== null);
        if (id && id !== view.selected) ui.showHint(byId.get(id), lastHover.clientX, lastHover.clientY);
        else ui.hideHint();
    }

    function ancestors(id, found = new Set()) {
        for (const parent of byId.get(id).connectionsFrom) {
            if (!byId.has(parent) || found.has(parent)) continue;
            found.add(parent);
            ancestors(parent, found);
        }
        return found;
    }

    function select(id, { focusCard = false, instant = false } = {}) {
        const node = byId.get(id);
        if (!node) return;
        const nodeView = graph.nodes.get(id);

        view.selected = id;
        view.lineage = ancestors(id);
        ui.dismissHelp();

        const index = timeline.indexOf(node);
        ui.openCard(node, {
            parents: node.connectionsFrom.map((p) => byId.get(p)).filter(Boolean),
            children: relations[id].map((c) => byId.get(c)),
            prev: timeline[index - 1],
            next: timeline[index + 1],
            focusCard,
        });

        controls.focus({ azimuth: TreeControls.azimuthFacing(nodeView.angle), y: nodeView.position.y });
        if (instant) {
            controls.azimuth = controls.focusAzimuth;
            controls.y = controls.targetY;
        }
        history.replaceState(null, '', `#${id}`);
    }

    function deselect() {
        if (view.selected === null) return;
        view.selected = null;
        view.lineage = new Set();
        controls.unfocus();
        ui.closeCard();
        history.replaceState(null, '', window.location.pathname + window.location.search);
    }

    ['pointerdown', 'wheel'].forEach((type) => renderer.domElement.addEventListener(type, ui.dismissHelp, { once: true }));
    // The scene isn't selectable, so clicking it wouldn't clear a selection made elsewhere (e.g. in the card)
    renderer.domElement.addEventListener('pointerdown', () => window.getSelection()?.removeAllRanges());

    // Header buttons
    document.getElementById('controls_scroll_down').addEventListener('click', () => controls.scrollBy(-SCROLL_STEP));
    document.getElementById('controls_scroll_up').addEventListener('click', () => controls.scrollBy(SCROLL_STEP));

    // Keyboard: ↑/↓ travel, ←/→ step through milestones in time, Esc closes
    document.addEventListener('keydown', (e) => {
        if (e.target.closest?.('input, textarea')) return;
        const step = (dir) => {
            const index = view.selected ? timeline.indexOf(byId.get(view.selected)) : -1;
            const next = timeline[index === -1 ? (dir > 0 ? 0 : timeline.length - 1) : index + dir];
            if (next) select(next.id);
        };
        switch (e.key) {
            case 'ArrowDown': case 'PageDown': controls.scrollBy(-SCROLL_STEP); break;
            case 'ArrowUp': case 'PageUp': controls.scrollBy(SCROLL_STEP); break;
            case 'ArrowRight': step(1); break;
            case 'ArrowLeft': step(-1); break;
            case 'Escape':
                if (ui.isListOpen) ui.setListOpen(false);
                else deselect();
                break;
            default: return;
        }
        ui.dismissHelp();
        e.preventDefault();
    });

    // Sizing
    const resize = (width, height) => {
        controls.fit(layout, width, height);
        graph.setResolution(width, height);
    };
    const bounds = targetDocument.getBoundingClientRect();
    resize(bounds.width, bounds.height);
    onResize(resize);

    // Opening shot: start above the tree, facing the current position, and glide down
    const current = currentMilestone(nodeData);
    controls.azimuth = TreeControls.azimuthFacing(graph.nodes.get(current.id).angle) - 0.6;
    controls.targetY = controls.maxY;
    controls.y = reducedMotion ? controls.maxY : controls.maxY + 14;
    controls.autoRotate = !reducedMotion;

    const deepLink = decodeURIComponent(window.location.hash.slice(1));
    if (byId.has(deepLink)) select(deepLink, { instant: true });

    // Render loop
    const timer = new THREE.Timer();
    let time = reducedMotion || byId.has(deepLink) ? graph.introDuration : 0;
    const viewOffset = { x: 0, y: 0 };

    function frame(dt) {
        time += dt;

        updateHover();
        controls.autoRotate = !reducedMotion && view.hovered === null && view.selected === null;
        controls.update(dt);

        // Center the scene in the space left free by the card and list panels
        const inset = ui.insets();
        const k = 1 - Math.exp(-6 * dt);
        viewOffset.x += ((inset.right - inset.left) / 2 - viewOffset.x) * k;
        viewOffset.y += (inset.bottom / 2 - viewOffset.y) * k;
        const { clientWidth: w, clientHeight: h } = renderer.domElement;
        camera.setViewOffset(w, h, viewOffset.x, viewOffset.y, w, h);

        graph.update(dt, time, camera, view);
        dust.update(reducedMotion ? 0 : time, reducedMotion ? 0 : dt);
        ui.setDepth(controls.progress);

        renderer.render(scene, camera);
    }

    renderer.setAnimationLoop((timestamp) => {
        timer.update(timestamp);
        frame(Math.min(timer.getDelta(), 1 / 20));
    });

    if (import.meta.env.DEV) {
        // Debug handle, e.g. __portfolio.advance(5) to skip ahead while the tab is in the background
        window.__portfolio = {
            scene, camera, controls, graph, layout, view, select, deselect,
            advance(seconds, step = 1 / 30) {
                for (let t = 0; t < seconds; t += step) frame(step);
            },
        };
    }
}
