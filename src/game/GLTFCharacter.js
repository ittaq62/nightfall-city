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
