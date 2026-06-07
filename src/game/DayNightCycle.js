import * as THREE from 'three';
import { clamp } from './Utils.js';

// Color keyframes
const NIGHT_SKY = new THREE.Color(0x1e2333);  // lifted so the night never goes fully black
const DAY_SKY = new THREE.Color(0x6678a0);    // muted, urban daylight (keeps the noir vibe)
const TWILIGHT_SKY = new THREE.Color(0xd9663a);

const NIGHT_SUN = new THREE.Color(0x8899cc);  // cool moonlight
const DAY_SUN = new THREE.Color(0xfff2d6);    // warm white
const TWILIGHT_SUN = new THREE.Color(0xff8844);

export default class DayNightCycle {
  constructor({ scene, sun, ambient, hemi, nightLights = [], facadeMaterials = [], hud }) {
    this.scene = scene;
    this.sun = sun;
    this.ambient = ambient;
    this.hemi = hemi;
    this.nightLights = nightLights;
    this.facadeMaterials = facadeMaterials;
    this.hud = hud;

    this.dayLength = 240; // seconds for a full 24h cycle
    this.time = 18;       // start at dusk: well lit, then night falls naturally

    this._sky = new THREE.Color();
    this._sunColor = new THREE.Color();
  }

  update(delta) {
    this.time = (this.time + (delta / this.dayLength) * 24) % 24;
    this.apply();
  }

  apply() {
    const h = this.time;
    const elevation = Math.sin((h - 6) * Math.PI / 12); // -1 (midnight) .. 1 (noon)
    const daylight = clamp(elevation, 0, 1);
    const twilight = clamp(1 - Math.abs(elevation) * 3, 0, 1); // peaks at dawn/dusk

    // Sky + fog
    this._sky.copy(NIGHT_SKY).lerp(DAY_SKY, daylight);
    this._sky.lerp(TWILIGHT_SKY, twilight * 0.45);
    this.scene.background.copy(this._sky);
    if (this.scene.fog) this.scene.fog.color.copy(this._sky);

    // Sun / moon color + intensity
    this._sunColor.copy(NIGHT_SUN).lerp(DAY_SUN, daylight);
    this._sunColor.lerp(TWILIGHT_SUN, twilight * 0.6);
    this.sun.color.copy(this._sunColor);
    this.sun.intensity = 0.55 + daylight * 0.8;

    // Light swings east -> west across the day (keeps a high angle for clean shadows)
    const ang = (h / 24) * Math.PI * 2 - Math.PI / 2;
    this.sun.position.set(Math.cos(ang) * 45, 55, Math.sin(ang) * 45);

    // Ambient / hemisphere brighten during the day (night stays clearly readable)
    this.ambient.intensity = 1.5 + daylight * 0.5;
    this.hemi.intensity = 1.15 + daylight * 0.4;

    // Streetlights & neon: full at night, dimmed during the day
    const artificial = 0.15 + (1 - daylight) * 0.85;
    for (const nl of this.nightLights) {
      nl.light.intensity = nl.base * artificial;
    }

    // Building windows: bright at night, dim by day
    const winGlow = 0.25 + (1 - daylight) * 0.85;
    for (const m of this.facadeMaterials) {
      m.emissiveIntensity = winGlow;
    }

    if (this.hud) this.hud.updateClock(h);
  }
}
