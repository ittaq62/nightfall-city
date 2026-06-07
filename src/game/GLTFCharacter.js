import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const _loader = new GLTFLoader();

// Strip root translation so the walk/run plays in place (we move the model by code)
function makeInPlace(clip) {
  clip.tracks = clip.tracks.filter((t) => !/(^|[:.\/])Hips\.position$/i.test(t.name));
  return clip;
}

// Loads a rigged .glb character. Animations can be baked into the file, or
// loaded from separate .glb clip files (e.g. the Ready Player Me animation library).
export default class GLTFCharacter {
  constructor(url, { scale = 1, yOffset = 0, animations = null, onReady } = {}) {
    this.group = new THREE.Group();
    this.ready = false;
    this.mixer = null;
    this.current = null;
    this.model = null;
    this._scale = scale;
    this._yOffset = yOffset;
    this._animUrls = animations;

    _loader.load(
      url,
      (gltf) => this._onLoad(gltf, onReady),
      undefined,
      (err) => console.warn('[GLTFCharacter] load failed:', url, err)
    );
  }

  _onLoad(gltf, onReady) {
    const model = gltf.scene;
    model.scale.setScalar(this._scale);
    model.position.y = this._yOffset;
    model.traverse((o) => {
      if (o.isMesh) { o.castShadow = true; o.frustumCulled = false; }
    });
    this.group.add(model);
    this.model = model;
    this.mixer = new THREE.AnimationMixer(model);

    if (this._animUrls) {
      const names = Object.keys(this._animUrls);
      let pending = names.length;
      const done = () => { if (--pending === 0) this._finish(onReady); };
      for (const name of names) {
        _loader.load(
          this._animUrls[name],
          (animGltf) => {
            const clip = animGltf.animations && animGltf.animations[0];
            if (clip) this[name] = this.mixer.clipAction(makeInPlace(clip));
            done();
          },
          undefined,
          () => done()
        );
      }
    } else {
      const byName = {};
      for (const clip of gltf.animations) byName[clip.name.toLowerCase()] = this.mixer.clipAction(clip);
      const pick = (...n) => { for (const k of n) if (byName[k]) return byName[k]; return null; };
      this.idle = pick('idle') || Object.values(byName)[0] || null;
      this.walk = pick('walk', 'walking');
      this.run = pick('run', 'running');
      this._finish(onReady);
    }
  }

  _finish(onReady) {
    if (this.idle) { this.idle.play(); this.current = this.idle; }
    this.ready = true;
    if (onReady) onReady(this);
  }

  // Recolor the avatar's clothing meshes (RPM meshes are named Wolf3D_Outfit_*, etc.)
  setOutfitColor(topColor, bottomColor) {
    if (!this.model) return;
    this.model.traverse((o) => {
      if (!o.isMesh || !o.material) return;
      const n = (o.name || '').toLowerCase();
      const apply = (c) => {
        o.material = o.material.clone();
        o.material.map = null;
        o.material.color = new THREE.Color(c);
      };
      if (n.includes('top') || n.includes('jacket') || n.includes('shirt')) apply(topColor);
      else if (n.includes('bottom') || n.includes('trouser') || n.includes('pant')) apply(bottomColor ?? topColor);
    });
  }

  clearAccessories() {
    if (this._acc) for (const m of this._acc) if (m.parent) m.parent.remove(m);
    this._acc = [];
  }

  // Attach simple outfit accessories on top of the realistic avatar (no ugly model swap)
  attachAccessories(list) {
    this.clearAccessories();
    this._acc = [];
    const add = (geo, mat, x, y, z) => {
      const m = new THREE.Mesh(geo, mat);
      m.position.set(x, y, z);
      m.castShadow = true;
      this.group.add(m);
      this._acc.push(m);
      return m;
    };
    const mk = (color, rough = 0.6) => new THREE.MeshStandardMaterial({ color, roughness: rough });

    for (const acc of list) {
      if (acc === 'cap') {
        const m = mk(0x121a35);
        const d = add(new THREE.SphereGeometry(0.13, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.5), m, 0, 1.63, 0);
        d.scale.set(1.2, 0.7, 1.2);
        add(new THREE.BoxGeometry(0.24, 0.04, 0.14), m, 0, 1.61, 0.15);
      } else if (acc === 'helmet') {
        const m = mk(0xf0b020, 0.5);
        const d = add(new THREE.SphereGeometry(0.15, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.5), m, 0, 1.62, 0);
        d.scale.set(1.1, 0.85, 1.1);
        add(new THREE.CylinderGeometry(0.19, 0.19, 0.03, 16), m, 0, 1.58, 0);
      } else if (acc === 'beanie') {
        const b = add(new THREE.SphereGeometry(0.15, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.62), mk(0x202020, 0.9), 0, 1.56, 0);
        b.scale.set(1.1, 0.9, 1.1);
      } else if (acc === 'glasses') {
        add(new THREE.BoxGeometry(0.22, 0.05, 0.04), mk(0x0a0a0a, 0.3), 0, 1.55, 0.11);
      } else if (acc === 'tie') {
        const m = mk(0x9a1f2a, 0.5);
        add(new THREE.BoxGeometry(0.05, 0.26, 0.04), m, 0, 1.2, 0.11);
      } else if (acc === 'vest' || acc === 'vest_police') {
        const base = acc === 'vest' ? 0xeedd22 : 0x0b1230;
        add(new THREE.BoxGeometry(0.46, 0.5, 0.3), mk(base, 0.6), 0, 1.25, 0.02);
        const stripe = mk(acc === 'vest' ? 0xcfd2d6 : 0xdfe6ff, 0.4);
        add(new THREE.BoxGeometry(0.48, 0.06, 0.32), stripe, 0, 1.32, 0.02);
        add(new THREE.BoxGeometry(0.48, 0.06, 0.32), stripe, 0, 1.16, 0.02);
      } else if (acc === 'badge') {
        add(new THREE.BoxGeometry(0.07, 0.09, 0.03), mk(0xf5c542, 0.3), -0.12, 1.34, 0.14);
      } else if (acc === 'stetho') {
        const m = mk(0x3a3a40, 0.4);
        const r = add(new THREE.TorusGeometry(0.1, 0.018, 8, 20), m, 0, 1.42, 0.05);
        r.rotation.x = Math.PI / 2;
        r.scale.set(1, 1, 0.6);
      }
    }
  }

  update(delta, speed01) {
    if (!this.ready) return;
    this.mixer.update(delta);
    let target = this.idle;
    if (speed01 > 0.7 && this.run) target = this.run;
    else if (speed01 > 0.05 && this.walk) target = this.walk;
    if (target && target !== this.current) {
      if (this.current) this.current.fadeOut(0.2);
      target.reset().fadeIn(0.2).play();
      this.current = target;
    }
  }
}
