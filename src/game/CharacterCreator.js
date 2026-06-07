import * as THREE from 'three';
import GLTFCharacter from './GLTFCharacter.js';

export const APPEARANCE_KEY = 'nightfall-appearance-v1';

const SWATCHES = {
  skin: [0x8a6a4a, 0x6b4f3a, 0xb8895e, 0x5a4030, 0xe0b48c, 0x3d2b1f],
  hair: [0x1a1410, 0x000000, 0x5a3a1a, 0xa9772f, 0xb0b0b0, 0x7a2020, 0x553a8a],
  outfit: [0x3a3a4c, 0x8a2433, 0x224a8a, 0x227755, 0xd9a933, 0x111118, 0x7a33aa, 0xcccccc],
  pants: [0x24242e, 0x1a1a22, 0x33404a, 0x4a3a2a, 0x223322, 0x101010],
};

export const DEFAULT_APPEARANCE = {
  name: 'Alex Mercer',
  skin: 0x8a6a4a,
  hair: 0x1a1410,
  outfit: 0x3a3a4c,
  pants: 0x24242e,
  avatarUrl: '',
};

export function loadAppearance() {
  try {
    const raw = localStorage.getItem(APPEARANCE_KEY);
    if (raw) return { ...DEFAULT_APPEARANCE, ...JSON.parse(raw) };
  } catch (e) { /* ignore */ }
  return { ...DEFAULT_APPEARANCE };
}

export default class CharacterCreator {
  constructor(canvas) {
    this.canvas = canvas;
    this.appearance = loadAppearance();
    this.onPlay = null;
    this.active = true;

    this.initScene();
    this.buildUI();
    this.rebuildModel();
    this.animate();
  }

  initScene() {
    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(this.canvas.clientWidth || 280, this.canvas.clientHeight || 380, false);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.3;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(35, (this.canvas.clientWidth || 280) / (this.canvas.clientHeight || 380), 0.1, 50);
    this.camera.position.set(0, 1.15, 3.4);
    this.camera.lookAt(0, 1.05, 0);

    this.scene.add(new THREE.AmbientLight(0xffffff, 1.1));
    const key = new THREE.DirectionalLight(0xfff0e0, 1.4);
    key.position.set(2, 4, 3);
    this.scene.add(key);
    const rim = new THREE.DirectionalLight(0x6688ff, 0.7);
    rim.position.set(-3, 2, -2);
    this.scene.add(rim);

    this.pivot = new THREE.Group();
    this.scene.add(this.pivot);
    this.clock = new THREE.Clock();
  }

  rebuildModel() {
    if (this.model) this.pivot.remove(this.model.group);
    // Show the chosen avatar (custom RPM URL if provided, else the default)
    const url = this.appearance.avatarUrl || '/models/avatar_male.glb';
    this.model = new GLTFCharacter(url, {
      scale: 1,
      animations: { idle: '/models/anim_idle.glb' },
    });
    this.pivot.add(this.model.group);
  }

  buildUI() {
    // Color swatches
    document.querySelectorAll('.cc-swatches').forEach((container) => {
      const cat = container.dataset.cat;
      container.innerHTML = '';
      for (const color of SWATCHES[cat]) {
        const btn = document.createElement('button');
        btn.className = 'cc-swatch';
        btn.style.background = '#' + color.toString(16).padStart(6, '0');
        if (color === this.appearance[cat]) btn.classList.add('selected');
        btn.onclick = () => {
          this.appearance[cat] = color;
          container.querySelectorAll('.cc-swatch').forEach((s) => s.classList.remove('selected'));
          btn.classList.add('selected');
          this.rebuildModel();
        };
        container.appendChild(btn);
      }
    });

    // Name field
    const nameInput = document.getElementById('name-input');
    if (nameInput) {
      nameInput.value = this.appearance.name;
      nameInput.addEventListener('input', () => { this.appearance.name = nameInput.value; });
    }

    // Ready Player Me avatar URL
    const rpmInput = document.getElementById('rpm-input');
    if (rpmInput) {
      rpmInput.value = this.appearance.avatarUrl || '';
      rpmInput.addEventListener('change', () => {
        this.appearance.avatarUrl = rpmInput.value.trim();
        this.rebuildModel(); // preview the custom avatar
      });
    }

    // Play button
    const playBtn = document.getElementById('cc-play');
    if (playBtn) {
      playBtn.onclick = () => {
        const nm = (nameInput && nameInput.value.trim()) || 'Alex Mercer';
        this.appearance.name = nm.slice(0, 16);
        if (rpmInput) this.appearance.avatarUrl = rpmInput.value.trim();
        try { localStorage.setItem(APPEARANCE_KEY, JSON.stringify(this.appearance)); } catch (e) { /* ignore */ }
        this.active = false;
        if (this.onPlay) this.onPlay({ ...this.appearance });
      };
    }
  }

  animate() {
    if (!this.active) return;
    requestAnimationFrame(() => this.animate());
    const delta = this.clock.getDelta();
    if (this.model) this.model.update(delta, 0); // idle animation
    this.pivot.rotation.y += 0.012;
    this.renderer.render(this.scene, this.camera);
  }

  stop() {
    this.active = false;
  }
}
