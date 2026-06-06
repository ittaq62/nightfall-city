import * as THREE from 'three';
import { createTextSprite, distance2D } from './Utils.js';
import CharacterModel from './CharacterModel.js';

export default class NPC {
  constructor(scene, position, name = 'Tony', options = {}) {
    this.scene = scene;
    this.name = name;
    this.position = position.clone();
    this.interactionRange = options.range ?? 3.5;
    this.inRange = false;
    this.ringColor = options.ringColor ?? 0xf5a623;
    this.chatLine = options.chatLine ?? 'Salut.';

    this.group = new THREE.Group();
    this.group.position.copy(position);
    this.buildModel(options);
    this.buildLabel();
    scene.add(this.group);
  }

  buildModel(options) {
    this.character = new CharacterModel({
      skin: options.skin,
      outfit: options.outfit,
      pants: options.pants,
      hair: options.hair,
    });
    this.group.add(this.character.group);

    // Highlight ring on the ground
    const ringMat = new THREE.MeshBasicMaterial({
      color: this.ringColor,
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
    this.nameSprite.position.y = 2.4;
    this.group.add(this.nameSprite);

    this.promptSprite = createTextSprite('Appuie sur E pour parler', {
      color: '#f5a623',
      fontSize: 24,
      scale: 0.012,
    });
    this.promptSprite.position.y = 2.1;
    this.promptSprite.visible = false;
    this.group.add(this.promptSprite);
  }

  setPrompt(text) {
    if (this._promptText === text) return;
    this._promptText = text;
    this.group.remove(this.promptSprite);
    this.promptSprite = createTextSprite(text, { color: '#f5a623', fontSize: 24, scale: 0.012 });
    this.promptSprite.position.y = 2.1;
    this.group.add(this.promptSprite);
  }

  update(playerPosition, delta, time) {
    if (this.ring) {
      this.ring.material.opacity = 0.3 + Math.sin(time * 3) * 0.15;
    }

    const dist = distance2D(this.position, playerPosition);
    this.inRange = dist <= this.interactionRange;
    this.promptSprite.visible = this.inRange;

    // Face the player when nearby
    if (this.inRange) {
      const angle = Math.atan2(playerPosition.x - this.position.x, playerPosition.z - this.position.z);
      this.character.group.rotation.y = angle;
    }

    this.character.update(delta, 0); // idle animation
    return this.inRange;
  }
}
