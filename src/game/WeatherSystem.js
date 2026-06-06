import * as THREE from 'three';

// Cycles between clear / fog / rain and animates a rain particle field
// that follows the player. Fog density eases toward the weather target.
export default class WeatherSystem {
  constructor({ scene, player, audio = null, hud = null, baseFog = 0.009 }) {
    this.scene = scene;
    this.player = player;
    this.audio = audio;
    this.hud = hud;
    this.baseFog = baseFog;
    this.targetFog = baseFog;

    this.area = 44;
    this.height = 32;
    this.fallSpeed = 38;

    this.timer = 0;
    this.nextChange = 35; // first change after ~35s

    this.buildRain();
    this.setState('clear');
  }

  buildRain() {
    const count = 1800;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * this.area;
      positions[i * 3 + 1] = Math.random() * this.height;
      positions[i * 3 + 2] = (Math.random() - 0.5) * this.area;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({
      color: 0xaab4ff,
      size: 0.14,
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
    });
    this.rain = new THREE.Points(geo, mat);
    this.rain.visible = false;
    this.scene.add(this.rain);
  }

  setState(state) {
    this.state = state;
    if (state === 'rain') {
      this.targetFog = this.baseFog * 2.2;
      this.rain.visible = true;
    } else if (state === 'fog') {
      this.targetFog = this.baseFog * 3.2;
      this.rain.visible = false;
    } else {
      this.targetFog = this.baseFog;
      this.rain.visible = false;
    }
    if (this.audio) this.audio.setRain(state === 'rain');
    if (this.hud) this.hud.updateWeather(state);
  }

  update(delta) {
    // Schedule the next weather change (weighted toward clear)
    this.timer += delta;
    if (this.timer >= this.nextChange) {
      this.timer = 0;
      this.nextChange = 40 + Math.random() * 45;
      const pool = ['clear', 'clear', 'clear', 'fog', 'rain', 'rain'];
      this.setState(pool[Math.floor(Math.random() * pool.length)]);
    }

    // Ease fog density toward the weather target
    if (this.scene.fog) {
      this.scene.fog.density += (this.targetFog - this.scene.fog.density) * Math.min(1, delta * 0.6);
    }

    // Animate rain and keep the field centered on the player
    if (this.rain.visible) {
      this.rain.position.set(this.player.position.x, 0, this.player.position.z);
      const pos = this.rain.geometry.attributes.position;
      const arr = pos.array;
      for (let i = 0; i < arr.length; i += 3) {
        arr[i + 1] -= this.fallSpeed * delta;
        if (arr[i + 1] < 0) {
          arr[i + 1] = this.height;
          arr[i] = (Math.random() - 0.5) * this.area;
          arr[i + 2] = (Math.random() - 0.5) * this.area;
        }
      }
      pos.needsUpdate = true;
    }
  }
}
