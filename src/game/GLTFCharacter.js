import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

// Loads a rigged .glb character and drives its Idle / Walk / Run animations.
// Exposes the same interface as CharacterModel (group + update(delta, speed01))
// so it can be swapped in transparently.
export default class GLTFCharacter {
  constructor(url, { scale = 1, yOffset = 0, onReady } = {}) {
    this.group = new THREE.Group();
    this.ready = false;
    this.mixer = null;
    this.current = null;
    this._scale = scale;
    this._yOffset = yOffset;

    new GLTFLoader().load(
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
      if (o.isMesh) {
        o.castShadow = true;
        o.frustumCulled = false; // skinned meshes can be culled incorrectly
      }
    });
    this.group.add(model);

    this.mixer = new THREE.AnimationMixer(model);
    const byName = {};
    for (const clip of gltf.animations) byName[clip.name.toLowerCase()] = this.mixer.clipAction(clip);

    const pick = (...names) => {
      for (const n of names) if (byName[n]) return byName[n];
      return null;
    };
    this.idle = pick('idle', 'survey', 'tpose') || Object.values(byName)[0] || null;
    this.walk = pick('walk', 'walking');
    this.run = pick('run', 'running');

    if (this.idle) { this.idle.play(); this.current = this.idle; }
    this.ready = true;
    if (onReady) onReady(this);
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
