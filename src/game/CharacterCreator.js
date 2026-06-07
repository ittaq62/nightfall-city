import * as THREE from 'three';
import GLTFCharacter from './GLTFCharacter.js';

export const APPEARANCE_KEY = 'nightfall-appearance-v3';

// Default realistic avatar shipped with the game (used until the player customizes one)
export const DEFAULT_AVATAR = '/models/avatar_default.glb';

// Ready Player Me creator subdomain. "demo" works without an account; if you create a
// free Ready Player Me developer account you can replace it with your own subdomain.
const RPM_SUBDOMAIN = 'demo';
const RPM_URL = `https://${RPM_SUBDOMAIN}.readyplayer.me/avatar?frameApi&clearCache&bodyType=fullbody`;

export const DEFAULT_APPEARANCE = {
  name: 'Alex Mercer',
  avatarUrl: DEFAULT_AVATAR,
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
    if (!this.appearance.avatarUrl) this.appearance.avatarUrl = DEFAULT_AVATAR;
    this.onPlay = null;
    this.active = true;
    this.preview = null;

    this.initScene();
    this.buildUI();
    this.loadPreview(this.appearance.avatarUrl);
    this.animate();
  }

  initScene() {
    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(this.canvas.clientWidth || 280, this.canvas.clientHeight || 380, false);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.25;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(30, (this.canvas.clientWidth || 280) / (this.canvas.clientHeight || 380), 0.1, 50);
    this.camera.position.set(0, 1.0, 3.9);
    this.camera.lookAt(0, 0.95, 0);

    this.scene.add(new THREE.AmbientLight(0xffffff, 1.1));
    const key = new THREE.DirectionalLight(0xfff0e0, 1.6);
    key.position.set(2, 4, 3);
    this.scene.add(key);
    const rim = new THREE.DirectionalLight(0x6688ff, 0.8);
    rim.position.set(-3, 2, -2);
    this.scene.add(rim);

    this.pivot = new THREE.Group();
    this.scene.add(this.pivot);
    this.clock = new THREE.Clock();
  }

  // Load (or reload) the realistic avatar shown in the live preview
  loadPreview(url) {
    if (this.preview && this.preview.group && this.preview.group.parent) {
      this.pivot.remove(this.preview.group);
    }
    this.previewLoading = true;
    const setHint = (msg) => { const el = document.getElementById('cc-avatar-status'); if (el) el.textContent = msg; };
    setHint('Chargement de l’avatar…');
    this.preview = new GLTFCharacter(url, {
      targetHeight: 1.8,
      animations: { idle: '/models/anim_idle.glb' },
      onReady: () => {
        this.previewLoading = false;
        if (this.preview) this.pivot.add(this.preview.group);
        setHint('');
      },
    });
    // Fallback if a custom avatar fails to load (e.g. offline): keep the default
    this._previewTimer = setTimeout(() => {
      if (this.previewLoading && url !== DEFAULT_AVATAR) {
        setHint('Avatar indisponible — modèle par défaut');
        this.appearance.avatarUrl = DEFAULT_AVATAR;
        this.loadPreview(DEFAULT_AVATAR);
      }
    }, 12000);
  }

  buildUI() {
    const nameInput = document.getElementById('name-input');
    if (nameInput) {
      nameInput.value = this.appearance.name;
      nameInput.addEventListener('input', () => { this.appearance.name = nameInput.value; });
    }

    // Open the Ready Player Me creator (embedded in-game) to personalize the avatar
    const customBtn = document.getElementById('cc-customize');
    if (customBtn) customBtn.onclick = () => this.openRPM();

    const rpmClose = document.getElementById('rpm-close');
    if (rpmClose) rpmClose.onclick = () => this.closeRPM();

    // Listen once for messages coming from the Ready Player Me iframe
    if (!this._rpmListener) {
      this._rpmListener = (event) => this.onRPMMessage(event);
      window.addEventListener('message', this._rpmListener);
    }

    const playBtn = document.getElementById('cc-play');
    if (playBtn) {
      playBtn.onclick = () => {
        const nm = (nameInput && nameInput.value.trim()) || 'Alex Mercer';
        this.appearance.name = nm.slice(0, 16);
        this.save();
        this.active = false;
        if (this.onPlay) this.onPlay({ ...this.appearance });
      };
    }
  }

  save() {
    try { localStorage.setItem(APPEARANCE_KEY, JSON.stringify(this.appearance)); } catch (e) { /* ignore */ }
  }

  // ---- Ready Player Me embedded creator ----
  openRPM() {
    const overlay = document.getElementById('rpm-overlay');
    const iframe = document.getElementById('rpm-iframe');
    if (!overlay || !iframe) return;
    if (!iframe.getAttribute('src')) iframe.setAttribute('src', RPM_URL);
    overlay.classList.remove('hidden');
  }

  closeRPM() {
    const overlay = document.getElementById('rpm-overlay');
    if (overlay) overlay.classList.add('hidden');
  }

  onRPMMessage(event) {
    let json;
    try { json = typeof event.data === 'string' ? JSON.parse(event.data) : event.data; } catch (e) { return; }
    if (!json || json.source !== 'readyplayerme') return;

    const iframe = document.getElementById('rpm-iframe');
    // Subscribe to all v1 events once the frame is ready
    if (json.eventName === 'v1.frame.ready' && iframe && iframe.contentWindow) {
      iframe.contentWindow.postMessage(
        JSON.stringify({ target: 'readyplayerme', type: 'subscribe', eventName: 'v1.**' }),
        '*'
      );
    }
    // The user finished: we receive the avatar .glb URL
    if (json.eventName === 'v1.avatar.exported') {
      const url = json.data && json.data.url;
      if (url) {
        this.appearance.avatarUrl = url;
        this.save();
        this.loadPreview(url);
      }
      this.closeRPM();
    }
  }

  animate() {
    if (!this.active) return;
    requestAnimationFrame(() => this.animate());
    const delta = this.clock.getDelta();
    if (this.preview && this.preview.ready) this.preview.update(delta, 0);
    this.pivot.rotation.y += 0.008;
    this.renderer.render(this.scene, this.camera);
  }

  stop() {
    this.active = false;
    if (this._rpmListener) { window.removeEventListener('message', this._rpmListener); this._rpmListener = null; }
    if (this._previewTimer) clearTimeout(this._previewTimer);
  }
}
