import * as THREE from 'three';
import { nodeData } from '../json/node';
import { BLACK, HIGHLIGHT, SCROLL_SPEED, WHITE } from './constants';
import { connectNodes, createNode, materializeConnection } from './generation';
import { createControls, getRenderEssentials } from './scene';

const overlayDocument = document.getElementById('overlay');
const hintDocument = document.getElementById('hint');
const targetDocument = document.getElementById('render');

const { scene, camera, renderer } = getRenderEssentials(targetDocument);
targetDocument.prepend(renderer.domElement);

const controls = createControls(camera, renderer);
camera.position.z = 30;
controls.update();

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2(1, 1);
const absMouse = new THREE.Vector2(1, 1);
let intersects = [];

function updateMousePosition(event) {
    const bounds = targetDocument.getBoundingClientRect();
    mouse.x = ((event.clientX - bounds.left) / bounds.width) * 2 - 1;
    mouse.y = - ((event.clientY - bounds.top) / bounds.height) * 2 + 1;
    absMouse.x = event.clientX;
    absMouse.y = event.clientY;
}

document.addEventListener('mousemove', (event) => {
    updateMousePosition(event);
})

document.addEventListener('mousedown', (event) => {
    updateMousePosition(event);
    raycaster.setFromCamera(mouse, camera);
    intersects = raycaster.intersectObjects(Object.values(nodes).map(({node})=>node));
    if (intersects.length !== 0) {
        hintDocument.style.display = 'none';
        const node = Object.values(nodes).find((n) => intersects[0].object === n.node);
        openOverlay(node);
    }
})

document.addEventListener('wheel', (event) => {
    const goingUp = event.deltaY < 0;
    controls.enabled = false;
    if (goingUp) {
        controls.target.y += SCROLL_SPEED;
    } else {
        controls.target.y -= SCROLL_SPEED;
    }
    controls.enabled = true;
})

let currentY = 28;
const nodes = {};
nodeData
    .sort((n1, n2) => n1.timeline - n2.timeline)
    .map((n) => {
        const min = -5;
        const max = 5;
        const randX = Math.random() * (max - min) + min;
        const randZ = Math.random() * (max - min) + min;
        const node = createNode(new THREE.Vector3(randX, currentY, randZ));
        currentY -= 5;
        return { node, data: n };
    }) 
    .forEach((e) => {
        nodes[e.data.id] = e;
    });

const connections = [];
Object.values(nodes).forEach((d) => {
    for (const fromConn of d.data.connectionsFrom) {
        const fromNode = nodes[fromConn]?.node;
        if (!fromNode) {
            console.log(`failed to find node ${fromConn}`);
            continue;
        }
        const connection = materializeConnection(connectNodes(fromNode, d.node));
        connections.push(connection);
    }
})

renderer.setClearColor(BLACK, 1)

Object.values(nodes).forEach((n) => scene.add(n.node));
connections.forEach((c) => scene.add(c));

renderer.render(scene, camera);

function isMouseInOverlay() {
    if (overlayDocument.style.display == 'none') return false;
    const bounds = overlayDocument.getBoundingClientRect();
    return (bounds.left <= absMouse.x && absMouse.x <= bounds.right) &&
            (bounds.top <= absMouse.y && absMouse.y <= bounds.bottom);
}

function openOverlay(node) {
    const title = document.getElementById('title');
    const subtitle = document.getElementById('subtitle');
    const timestamp = document.getElementById('timestamp');
    const description = document.getElementById('description');
    const skills = document.getElementById('skills');

    title.innerText = node.data.title;
    subtitle.innerText = node.data.subtitle;
    timestamp.innerText = node.data.timestamp;
    description.innerText = node.data.description;
    skills.innerText = node.data.skills.join(', ');

    overlayDocument.style.display = 'block';
    const bounds = overlayDocument.getBoundingClientRect();
    overlayDocument.style.top = `${absMouse.y - (bounds.height/2)}px`;
    overlayDocument.style.left = `${absMouse.x - (bounds.width/2)}px`;
}

function animate() {
    requestAnimationFrame(animate);

    controls.update();
    Object.values(nodes).forEach((n) => n.node.setRotationFromEuler(camera.rotation));

    raycaster.setFromCamera(mouse, camera);
    intersects = raycaster.intersectObjects(Object.values(nodes).map(({node})=>node));
    if (intersects.length !== 0) {
        intersects[0].object.material.color.set(HIGHLIGHT);
        controls.autoRotate = false;

        if (overlayDocument.style.display === 'none') {
            const node = Object.values(nodes).find((n) => n.node === intersects[0].object);
            hintDocument.innerText = node.data.title;
            hintDocument.style.display = 'block';
            const bounds = hintDocument.getBoundingClientRect();
            hintDocument.style.top = `${absMouse.y - (bounds.height/2)}px`;
            hintDocument.style.left = `${absMouse.x - (bounds.width/2)}px`;
        } else {
            hintDocument.style.display = 'none';
        }
    } else {
        if (!isMouseInOverlay()) {
            Object.values(nodes).forEach((n) => n.node.material.color.set(WHITE))
            controls.autoRotate = true;
            overlayDocument.style.display = 'none';
            hintDocument.style.display = 'none';
        }
    }

    renderer.render(scene, camera);
}
animate();

