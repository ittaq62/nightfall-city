import * as THREE from 'three';

// Ambient atmosphere: slowly drifting city motes around the player and a
// particle water jet for the fountain.
export default class Atmosphere {
  constructor({ scene, player, fountainPos }) {
    this.scene = scene;
    this.player = player;
    this.fountainPos = fountainPos || new THREE.Vector3(0, 0, 0);
    this.buildMotes();
    this.buildFountain();
  }

  buildMotes() {
    const n = 350;
    this.area = 60;
    this.height = 16;
    const pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      pos[i * 3] = (Math.random() - 0.5) * this.area;
      pos[i * 3 + 1] = Math.random() * this.height;
      pos[i * 3 + 2] = (Math.random() - 0.5) * this.area;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.PointsMaterial({
      color: 0xffcc99, size: 0.09, transparent: true, opacity: 0.3, depthWrite: false,
    });
    this.motes = new THREE.Points(geo, mat);
    this.scene.add(this.motes);
  }

  buildFountain() {
    this.count = 140;
    this.vel = new Array(this.count);
    const pos = new Float32Array(this.count * 3);
    for (let i = 0; i < this.count; i++) this.spawnDrop(pos, i, true);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.PointsMaterial({
      color: 0x9fd6ff, size: 0.13, transparent: true, opacity: 0.85, depthWrite: false,
    });
    this.jet = new THREE.Points(geo, mat);
    this.scene.add(this.jet);
  }

  spawnDrop(arr, i, randomHeight) {
    const f = this.fountainPos;
    arr[i * 3] = f.x + (Math.random() - 0.5) * 0.4;
    arr[i * 3 + 1] = f.y + 1.4 + (randomHeight ? Math.random() * 2 : 0);
    arr[i * 3 + 2] = f.z + (Math.random() - 0.5) * 0.4;
    this.vel[i] = {
      vx: (Math.random() - 0.5) * 1.6,
      vy: 3.2 + Math.random() * 2.2,
      vz: (Math.random() - 0.5) * 1.6,
    };
  }

  update(delta, time) {
    // Motes drift gently and stay centered on the player
    this.motes.position.set(this.player.position.x, 0, this.player.position.z);
    const mp = this.motes.geometry.attributes.position;
    const a = mp.array;
    for (let i = 0; i < a.length; i += 3) {
      a[i + 1] += delta * 0.25;
      a[i] += Math.sin(time * 0.4 + i) * 0.004;
      if (a[i + 1] > this.height) a[i + 1] = 0;
    }
    mp.needsUpdate = true;

    // Fountain jet: simple ballistic particles recycled when they fall back
    const jp = this.jet.geometry.attributes.position;
    const j = jp.array;
    for (let i = 0; i < this.count; i++) {
      const v = this.vel[i];
      j[i * 3] += v.vx * delta;
      j[i * 3 + 1] += v.vy * delta;
      j[i * 3 + 2] += v.vz * delta;
      v.vy -= 9 * delta;
      if (j[i * 3 + 1] < this.fountainPos.y + 0.6) this.spawnDrop(j, i, false);
    }
    jp.needsUpdate = true;
  }
}
