import { LAYER_HEIGHT, LAYER_TWIST, MIN_NODE_SPACING, MIN_RING_RADIUS } from './constants';

/**
 * Layered layout for the career graph: a ring of milestones per layer, around a
 * central spine.
 *
 * 1. Every node goes one layer below its lowest parent.
 * 2. Nodes form a tree, each hanging below its parent on the layer directly above.
 *    Every subtree gets an angular wedge proportional to its number of leaves, and all
 *    layers share one ring radius. Wedges never overlap, so neither do nodes, and the
 *    whole tree stays centered on the axis the camera orbits around.
 * 3. A connection that skips layers can't go straight down without risking a clip
 *    through the nodes in between, so it is routed through the spine: into the central
 *    axis, down, and back out on the layer above its target. Nodes only live on the
 *    ring (apart from a single root, at the very top of the axis), so that route is
 *    always clear. Connections sharing the spine overlap; the highlighting on hover
 *    and selection tells them apart.
 *
 * @param {import('./data').Milestone[]} nodes
 */
export function computeLayout(nodes) {
    const byId = new Map(nodes.map((n) => [n.id, n]));
    const parentsOf = (n) => n.connectionsFrom.filter((id) => {
        if (byId.has(id)) return true;
        console.warn(`"${n.id}" references unknown node "${id}"`);
        return false;
    });

    // 1. Layers (longest path from a root)
    const layers = new Map();
    const visiting = new Set();
    const layerOf = (id) => {
        if (layers.has(id)) return layers.get(id);
        if (visiting.has(id)) throw new Error(`Cycle in career graph at "${id}"`);
        visiting.add(id);
        const parents = parentsOf(byId.get(id));
        const layer = parents.length ? Math.max(...parents.map(layerOf)) + 1 : 0;
        visiting.delete(id);
        layers.set(id, layer);
        return layer;
    };
    nodes.forEach((n) => layerOf(n.id));

    // 2. Tree: each node hangs below the first of its parents on the layer directly above
    const items = new Map(nodes.map((n) => [n.id, {
        id: n.id, layer: layers.get(n.id), start: n.start, children: [],
    }]));
    const root = { children: [] };
    for (const n of nodes) {
        const item = items.get(n.id);
        const primary = parentsOf(n).find((p) => layers.get(p) === item.layer - 1);
        (primary ? items.get(primary) : root).children.push(item);
    }

    // Angular wedges, siblings in chronological order
    const compare = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
    const leaves = (item) => {
        item.children.sort((a, b) => compare(a.start, b.start) || compare(a.id, b.id));
        item.weight = item.children.length ? item.children.reduce((sum, c) => sum + leaves(c), 0) : 1;
        return item.weight;
    };
    const totalLeaves = leaves(root);
    const radius = Math.max(MIN_RING_RADIUS, (totalLeaves * MIN_NODE_SPACING) / (2 * Math.PI));

    const assign = (item, from, to) => {
        item.angle = (from + to) / 2;
        let cursor = from;
        for (const child of item.children) {
            const span = ((to - from) * child.weight) / item.weight;
            assign(child, cursor, cursor + span);
            cursor += span;
        }
    };
    assign(root, 0, Math.PI * 2);

    const singleRoot = root.children.length === 1;
    for (const item of items.values()) {
        item.onSpine = item.layer === 0 && singleRoot;
        item.angle += item.layer * LAYER_TWIST;
        const r = item.onSpine ? 0 : radius;
        item.position = {
            x: r * Math.cos(item.angle),
            y: -item.layer * LAYER_HEIGHT,
            z: r * Math.sin(item.angle),
        };
    }

    // 3. Connections, routed through the spine when they skip layers
    const spine = (layer) => ({ x: 0, y: -layer * LAYER_HEIGHT, z: 0 });
    const edges = [];
    for (const n of nodes) {
        const child = items.get(n.id);
        for (const parentId of parentsOf(n)) {
            const parent = items.get(parentId);
            const points = [parent.position];
            if (child.layer - parent.layer > 1) {
                const waypoints = new Set();
                if (!parent.onSpine) waypoints.add(parent.layer + 1);
                waypoints.add(child.layer - 1);
                waypoints.forEach((layer) => points.push(spine(layer)));
            }
            points.push(child.position);
            edges.push({ from: parentId, to: n.id, points, viaSpine: points.length > 2 });
        }
    }

    const layerCount = Math.max(...layers.values()) + 1;
    return {
        radius,
        layerCount,
        top: 0,
        bottom: -(layerCount - 1) * LAYER_HEIGHT,
        nodes: items,
        edges,
    };
}
