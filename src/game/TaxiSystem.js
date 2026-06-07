import * as THREE from 'three';
import CharacterModel from './CharacterModel.js';
import { createTextSprite, distance2D } from './Utils.js';
import { jobForRep } from './MissionSystem.js';

// Repeatable taxi job: take a shift, pick up a passenger, drive/walk them to a
// destination, get paid by distance.
export default class TaxiSystem {
  constructor({ scene, hud, audio, playerState }) {
    this.scene = scene;
    this.hud = hud;
    this.audio = audio;
    this.playerState = playerState;

    this.state = 'idle'; // 'idle' | 'toPickup' | 'toDropoff'
    this.targetPos = null;
    this.fareBase = 0;
    this.radius = 3.2;

    // Candidate fare locations around the city (POIs)
    this.points = [
      new THREE.Vector3(18, 0, 11.5),
      new THREE.Vector3(-30, 0, 9.5),
      new THREE.Vector3(-38, 0, 40),
      new THREE.Vector3(2, 0, -34),
      new THREE.Vector3(40, 0, 30),
      new THREE.Vector3(-42, 0, -30),
      new THREE.Vector3(30, 0, -34),
      new THREE.Vector3(-40, 0, 34),
    ];

    // Destination ring marker
    this.ring = new THREE.Mesh(
      new THREE.RingGeometry(2.6, 3.1, 32),
      new THREE.MeshBasicMaterial({ color: 0xf5c542, side: THREE.DoubleSide, transparent: true, opacity: 0.8 })
    );
    this.ring.rotation.x = -Math.PI / 2;
    this.ring.position.y = 0.13;
    this.ring.visible = false;
    this.scene.add(this.ring);

    this.passenger = null;
  }

  pickPoint(avoid) {
    let best = null;
    let bestD = -1;
    for (const p of this.points) {
      const d = avoid ? distance2D(p, avoid) : Math.random() * 100;
      if (d > bestD && d > 5) { bestD = d; best = p; }
    }
    return best || this.points[0];
  }

  startShift(playerPos) {
    if (this.state !== 'idle') return;
    this.state = 'toPickup';
    this.targetPos = this.pickPoint(playerPos);
    this.spawnPassenger(this.targetPos);
    this.showRing(this.targetPos, 0x33ccff);
    this.hud.showNotification('Service taxi : va chercher le client (point bleu)');
  }

  spawnPassenger(pos) {
    this.removePassenger();
    const model = new CharacterModel({ outfit: 0x886633, skin: 0x7a5c44 });
    model.group.position.copy(pos);
    const tag = createTextSprite('Client', { color: '#33ccff', fontSize: 24, scale: 0.011 });
    tag.position.y = 2.3;
    model.group.add(tag);
    this.scene.add(model.group);
    this.passenger = model;
  }

  removePassenger() {
    if (this.passenger) {
      this.scene.remove(this.passenger.group);
      this.passenger = null;
    }
  }

  showRing(pos, color) {
    this.ring.position.set(pos.x, 0.13, pos.z);
    this.ring.material.color.setHex(color);
    this.ring.visible = true;
  }

  pickUp() {
    if (this.state !== 'toPickup') return;
    this.removePassenger();
    const from = this.targetPos.clone();
    this.targetPos = this.pickPoint(from);
    this.fareBase = Math.round(40 + distance2D(from, this.targetPos) * 2.2);
    this.state = 'toDropoff';
    this.showRing(this.targetPos, 0xf5c542);
    if (this.audio) this.audio.click();
    this.hud.showNotification(`Client a bord ! Depose-le au point jaune (course ~$${this.fareBase})`);
  }

  dropOff() {
    if (this.state !== 'toDropoff') return false;
    this.playerState.money += this.fareBase;
    this.playerState.reputation += 3;
    this.playerState.job = jobForRep(this.playerState.reputation);
    this.state = 'idle';
    this.ring.visible = false;
    if (this.audio) this.audio.success();
    this.hud.updatePlayerInfo(this.playerState);
    this.hud.showNotification(`Course terminee : +$${this.fareBase} / +3 reputation`);
    return true;
  }

  nearTarget(playerPos) {
    return this.targetPos && distance2D(playerPos, this.targetPos) <= this.radius;
  }

  update(delta, time, playerPos) {
    if (this.ring.visible) {
      this.ring.material.opacity = 0.5 + Math.sin(time * 3) * 0.3;
      this.ring.scale.setScalar(1 + Math.sin(time * 3) * 0.05);
    }
    if (this.passenger) this.passenger.update(delta, 0);
  }
}
