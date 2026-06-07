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
  constructor(url, { scale = 1, yOffset = 0, targetHeight = null, animations = null, onReady } = {}) {
    this.group = new THREE.Group();
    this.ready = false;
    this.mixer = null;
    this.current = null;
    this.model = null;
    this.bones = {};
    this._scale = scale;
    this._yOffset = yOffset;
    this._targetHeight = targetHeight;
    this._animUrls = animations;
    this._accList = [];

    _loader.load(
      url,
      (gltf) => this._onLoad(gltf, onReady),
      undefined,
      (err) => console.warn('[GLTFCharacter] load failed:', url, err)
    );
  }

  _onLoad(gltf, onReady) {
    const model = gltf.scene;

    // --- Auto-scale so every avatar (default or custom RPM) is the same height ---
    model.updateWorldMatrix(true, true);
    const box = new THREE.Box3().setFromObject(model);
    const rawH = Math.max(0.001, box.max.y - box.min.y);
    const scale = this._targetHeight ? this._targetHeight / rawH : this._scale;
    model.scale.setScalar(scale);
    // Put the feet on the ground (y = 0) whatever the model's origin is
    model.position.y = -box.min.y * scale + this._yOffset;

    model.traverse((o) => {
      if (o.isMesh) { o.castShadow = true; o.frustumCulled = false; }
    });
    this.group.add(model);
    this.model = model;

    // Index bones so accessories can be attached exactly on the head / chest
    this.bones = {};
    model.traverse((o) => { if (o.isBone) this.bones[o.name] = o; });

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

  // Read a bone's position expressed in the character group's local space.
  _bonePos(name, fallback) {
    const b = this.bones && this.bones[name];
    if (!b) return fallback.clone();
    this.group.updateWorldMatrix(true, true);
    return this.group.worldToLocal(b.getWorldPosition(new THREE.Vector3()));
  }

  // Attach outfit accessories anchored on the avatar's REAL head / chest bones,
  // so caps, vests and badges fit any RPM avatar whatever its proportions.
  attachAccessories(list) {
    this.clearAccessories();
    this._acc = [];
    this._accList = list ? list.slice() : [];
    if (!this.model) return;

    // Anchor points derived from the skeleton (group-local coordinates)
    const head = this._bonePos('Head', new THREE.Vector3(0, 1.62, 0));
    const chest = this._bonePos('Spine2', this._bonePos('Spine1', new THREE.Vector3(0, 1.32, 0)));
    const hx = head.x, hz = head.z;          // head is centered on x; z is its depth
    const cx = chest.x, cz = chest.z;

    const add = (geo, mat, x, y, z) => {
      const m = new THREE.Mesh(geo, mat);
      m.position.set(x, y, z);
      m.castShadow = true;
      this.group.add(m);
      this._acc.push(m);
      return m;
    };
    const mk = (color, rough = 0.6) => new THREE.MeshStandardMaterial({ color, roughness: rough });

    for (const acc of list || []) {
      if (acc === 'cap') {
        const m = mk(0x121a35);
        const d = add(new THREE.SphereGeometry(0.12, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.55), m, hx, head.y + 0.13, hz);
        d.scale.set(1.22, 0.85, 1.22);
        add(new THREE.BoxGeometry(0.22, 0.03, 0.12), m, hx, head.y + 0.10, hz + 0.13); // visor (front = +z)
      } else if (acc === 'helmet') {
        const m = mk(0xf0b020, 0.5);
        const d = add(new THREE.SphereGeometry(0.14, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.55), m, hx, head.y + 0.12, hz);
        d.scale.set(1.16, 0.95, 1.16);
        add(new THREE.CylinderGeometry(0.18, 0.18, 0.03, 18), m, hx, head.y + 0.07, hz);
      } else if (acc === 'beanie') {
        const b = add(new THREE.SphereGeometry(0.14, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.65), mk(0x202024, 0.95), hx, head.y + 0.09, hz);
        b.scale.set(1.16, 1.0, 1.16);
      } else if (acc === 'glasses') {
        add(new THREE.BoxGeometry(0.20, 0.045, 0.03), mk(0x0a0a0a, 0.25), hx, head.y + 0.03, hz + 0.10);
      } else if (acc === 'tie') {
        add(new THREE.BoxGeometry(0.05, 0.24, 0.03), mk(0x9a1f2a, 0.5), cx, chest.y - 0.05, cz + 0.10);
      } else if (acc === 'vest' || acc === 'vest_police') {
        const base = acc === 'vest' ? 0xeedd22 : 0x0b1230;
        add(new THREE.BoxGeometry(0.42, 0.46, 0.28), mk(base, 0.6), cx, chest.y, cz + 0.01);
        const stripe = mk(acc === 'vest' ? 0xcfd2d6 : 0xdfe6ff, 0.4);
        add(new THREE.BoxGeometry(0.44, 0.05, 0.30), stripe, cx, chest.y + 0.07, cz + 0.01);
        add(new THREE.BoxGeometry(0.44, 0.05, 0.30), stripe, cx, chest.y - 0.07, cz + 0.01);
      } else if (acc === 'badge') {
        add(new THREE.BoxGeometry(0.06, 0.08, 0.02), mk(0xf5c542, 0.3), cx - 0.11, chest.y + 0.08, cz + 0.13);
      } else if (acc === 'stetho') {
        const m = mk(0x3a3a40, 0.4);
        const r = add(new THREE.TorusGeometry(0.09, 0.016, 8, 20), m, cx, chest.y + 0.12, cz + 0.04);
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
