import * as THREE from 'three';
import { GetNodeRelations, nodeData } from '../json/node';
import { WHITE } from './constants';

export function createNode(translation = new THREE.Vector3()) {
    const geometry = new THREE.CircleGeometry(1, 64);
    const material = new THREE.MeshBasicMaterial({ color: WHITE });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.translateX(translation.x);
    mesh.translateY(translation.y);
    mesh.translateZ(translation.z);
    return mesh;
}

export function connectNodes(startNode, endNode) {
    const start = new THREE.Vector3(
        startNode.position.x,
        startNode.position.y - startNode.geometry.parameters.radius,
        startNode.position.z
    );
    
    const end = new THREE.Vector3(
        endNode.position.x,
        endNode.position.y + endNode.geometry.parameters.radius,
        endNode.position.z,
    );
    
    const middle = end.y + ((start.y - end.y)/2)
    const control1 = new THREE.Vector3(start.x, middle, start.z);
    const control2 = new THREE.Vector3(end.x, middle, end.z);
    
    return new THREE.CubicBezierCurve3(start, control1, control2, end);
}

export function materializeConnection(connection) {
    const points = connection.getPoints(50);
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({ color: WHITE, linewidth: 2 });
    return new THREE.Line(geometry, material);
}

export function createNodeStructure() {
    const relations = GetNodeRelations();
    const nodes = {};
    nodeData.forEach((n) => {
        const node = createNode(new THREE.Vector3());
        nodes[n.id] = { node, data: n }
    });

    const startingPoints = nodeData.filter((n) => n.connectionsFrom.length === 0).map((n) => n.id);
    let positions = {};

    for(const point of startingPoints) {
        positions[point] = new THREE.Vector3();
        positions = {
            ...positions,
            ...calculatePositions(relations, positions, point),
        };
    }

    Object.entries(positions).forEach(([name, pos]) => {
        nodes[name].node.position.x = pos.x;
        nodes[name].node.position.y = pos.y;
        nodes[name].node.position.z = pos.z;
    });

    return nodes;
}

/**
 * 
 * @param {{[key: string]: string[]}} relations 
 * @param {{[key: string]: THREE.Vector3}} positions 
 * @param {string} parentPoint 
 */
function calculatePositions(relations, positions, parentPoint) {
    const connectedRelations = relations[parentPoint];
    const max = connectedRelations.length;
    const parentPosition = positions[parentPoint];
    for (let i = 0; i < max; i++) {
        const currentPoint = connectedRelations[i];
        const knownPosition = positions[currentPoint];
        const nextY = Math.min(parentPosition.y - 5, knownPosition?.y ?? 100);
        const position = getNextPosition(parentPosition, i, max);
        position.setY(nextY);
        positions[currentPoint] = position;

        if (relations[currentPoint]?.length > 0) {
            positions = {
                ...positions,
                ...calculatePositions(relations, positions, currentPoint),
            }
        }
    }

    return positions;
}

/**
 * 
 * @param {THREE.Vector3} prevPosition 
 * @param {number} i 
 * @param {number} max 
 */
function getNextPosition(prevPosition, i, max) {
    const spread = 3;
    const maxRange = 2*Math.PI;
    const n = (i/max) * maxRange;
    const x = spread * Math.cos(n);
    const z = spread * Math.sin(n);
    return new THREE.Vector3(prevPosition.x + x, prevPosition.y - spread, prevPosition.z + z)
}