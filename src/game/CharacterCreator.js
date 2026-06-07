import * as THREE from 'three';
import CharacterModel from './CharacterModel.js';

export const APPEARANCE_KEY = 'nightfall-appearance-v2';

const SWATCHES = {
  skin: [0x8a6a4a, 0x6b4f3a, 0xb8895e, 0x5a4030, 0xe0b48c, 0x3d2b1f],
  hair: [0x1a1410, 0x000000, 0x5a3a1a, 0xa9772f, 0xb0b0b0, 0x7a2020, 0x4a3a8a],
};

const HAIRSTYLES = [
  { id: 'short', label: 'Court' },
  { id: 'buzz', label: 'Rase' },
  { id: 'curly', label: 'Boucle' },
  { id: 'long', label: 'Long' },
  { id: 'bun', label: 'Chignon' },
  { id: 'bald', label: 'Chauve' },
];

export const DEFAULT_APPEARANCE = {
  name: 'Alex Mercer',
  skin: 0x8a6a4a,
  hair: 0x1a1410,
  hairStyle: 'short',
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
    this.camera = new THREE.PerspectiveCamera(32, (this.canvas.clientWidth || 280) / (this.canvas.clientHeight || 380), 0.1, 50);
    this.camera.position.set(0, 1.2, 3.6);
    this.camera.lookAt(0, 1.05, 0);

    this.scene.add(new THREE.AmbientLight(0xffffff, 1.2));
    const key = new THREE.DirectionalLight(0xfff0e0, 1.5);
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
    this.model = new CharacterModel({
      skin: this.appearance.skin,
      hair: this.appearance.hair,
      hairStyle: this.appearance.hairStyle,
      outfit: 0x3a4a6a,
      pants: 0x262630,
    });
    this.pivot.add(this.model.group);
  }

  buildUI() {
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

    const styleBox = document.getElementById('cc-hairstyles');
    if (styleBox) {
      styleBox.innerHTML = '';
      for (const h of HAIRSTYLES) {
        const b = document.createElement('button');
        b.className = 'cc-style';
        b.textContent = h.label;
        if (h.id === this.appearance.hairStyle) b.classList.add('selected');
        b.onclick = () => {
          this.appearance.hairStyle = h.id;
          styleBox.querySelectorAll('.cc-style').forEach((s) => s.classList.remove('selected'));
          b.classList.add('selected');
          this.rebuildModel();
        };
        styleBox.appendChild(b);
      }
    }

    const nameInput = document.getElementById('name-input');
    if (nameInput) {
      nameInput.value = this.appearance.name;
      nameInput.addEventListener('input', () => { this.appearance.name = nameInput.value; });
    }

    const playBtn = document.getElementById('cc-play');
    if (playBtn) {
      playBtn.onclick = () => {
        const nm = (nameInput && nameInput.value.trim()) || 'Alex Mercer';
        this.appearance.name = nm.slice(0, 16);
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
    if (this.model) this.model.update(delta, 0);
    this.pivot.rotation.y += 0.01;
    this.renderer.render(this.scene, this.camera);
  }

  stop() { this.active = false; }
}
