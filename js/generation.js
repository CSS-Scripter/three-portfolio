import * as THREE from 'three';
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

export function createText(text) {
    
}