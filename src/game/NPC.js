import * as THREE from 'three';
import { createTextSprite, distance2D } from './Utils.js';

export default class NPC {
  constructor(scene, position, name = 'Tony') {
    this.scene = scene;
    this.name = name;
    this.position = position.clone();
    this.interactionRange = 3.5;
    this.inRange = false;

    this.group = new THREE.Group();
    this.group.position.copy(position);
    this.buildModel();
    this.buildLabel();
    scene.add(this.group);
  }

  buildModel() {
    // Body
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x2a2a35 });
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.35, 0.9, 4, 8), bodyMat);
    body.position.y = 0.95;
    body.castShadow = true;
    this.group.add(body);

    // Head
    const headMat = new THREE.MeshStandardMaterial({ color: 0x6b4f3a });
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.28, 16, 16), headMat);
    head.position.y = 1.75;
    head.castShadow = true;
    this.group.add(head);

    // Highlight ring on ground
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xf5a623,
      transparent: true,
      opacity: 0.4,
      side: THREE.DoubleSide,
    });
    this.ring = new THREE.Mesh(new THREE.RingGeometry(0.5, 0.7, 32), ringMat);
    this.ring.rotation.x = -Math.PI / 2;
    this.ring.position.y = 0.02;
    this.group.add(this.ring);
  }

  buildLabel() {
    this.nameSprite = createTextSprite(this.name, { color: '#ffffff', fontSize: 32, scale: 0.012 });
    this.nameSprite.position.y = 2.5;
    this.group.add(this.nameSprite);

    this.promptSprite = createTextSprite('Appuie sur E pour parler', {
      color: '#f5a623',
      fontSize: 24,
      scale: 0.012,
    });
    this.promptSprite.position.y = 2.2;
    this.promptSprite.visible = false;
    this.group.add(this.promptSprite);
  }

  update(playerPosition, time) {
    // Pulse ring
    if (this.ring) {
      this.ring.material.opacity = 0.3 + Math.sin(time * 3) * 0.15;
    }

    const dist = distance2D(this.position, playerPosition);
    this.inRange = dist <= this.interactionRange;
    this.promptSprite.visible = this.inRange;
    return this.inRange;
  }
}
