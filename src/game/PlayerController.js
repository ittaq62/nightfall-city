import * as THREE from 'three';
import { checkBoxCollision, clamp } from './Utils.js';
import CharacterModel from './CharacterModel.js';
import GLTFCharacter from './GLTFCharacter.js';
import { OUTFITS } from './Outfits.js';

export default class PlayerController {
  constructor(scene, camera, domElement) {
    this.scene = scene;
    this.camera = camera;
    this.domElement = domElement;

    this.position = new THREE.Vector3(0, 0, 2);
    this.velocity = new THREE.Vector3();
    this.radius = 0.6;

    this.walkSpeed = 6;
    this.runSpeed = 11;
    this.energyFactor = 1; // reduced when the player is exhausted

    // Camera orbit angles (start facing the 24/7 store & Tony cluster)
    this.yaw = 3.95;      // horizontal rotation
    this.pitch = 0.22;    // vertical rotation
    this.cameraDistance = 6;
    this.cameraHeight = 2.2;

    this.keys = {};
    this.pointerLocked = false;
    this.obstacles = [];
    this.audio = null;
    this.stepTimer = 0;
    this.dynamicObstacles = []; // car positions to walk around (set each frame)

    this.buildModel();
    this.setupInput();
  }

  buildModel() {
    // Player root (position + facing live here, the visible model is a child)
    this.group = new THREE.Group();
    this.group.position.copy(this.position);
    this.scene.add(this.group);

    // Fully customizable base character (skin / hair / clothes), default look
    this.appearance = { skin: 0x8a6a4a, hair: 0x1a1410, hairStyle: 'short' };
    this.outfitId = 'casual';
    this.modelHolder = null;
    this.activeModel = null;
    this.gltfReady = false;
    this._anims = {
      idle: '/models/anim_idle.glb',
      walk: '/models/anim_walk.glb',
      run: '/models/anim_run.glb',
    };

    // Show the customizable model right away
    this._showStylized('casual');

    // Realistic avatar loaded in the background (used only for the "realistic" outfit)
    this.gltfChar = new GLTFCharacter('/models/avatar_rpm.glb', {
      scale: 1,
      animations: this._anims,
      onReady: () => {
        this.gltfReady = true;
        if (this.outfitId === 'realistic') this.setOutfit('realistic');
      },
    });
  }

  _showModel(model) {
    const wasVisible = this.modelHolder ? this.modelHolder.visible : true;
    if (this.modelHolder) this.group.remove(this.modelHolder);
    this.group.add(model.group);
    model.group.visible = wasVisible;
    this.modelHolder = model.group;
    this.activeModel = model;
  }

  _showStylized(outfitId) {
    const o = OUTFITS[outfitId] || OUTFITS.casual;
    this.character = new CharacterModel({
      skin: this.appearance.skin,
      hair: o.hair ?? this.appearance.hair,
      hairStyle: this.appearance.hairStyle,
      outfit: o.outfit,
      pants: o.pants,
      accessories: o.accessories || [],
    });
    this._showModel(this.character);
  }

  setOutfit(outfitId) {
    this.outfitId = outfitId;
    if (outfitId === 'realistic') {
      // The realistic avatar (not customizable, no accessories)
      if (this.gltfReady) this._showModel(this.gltfChar);
      else this._showStylized('casual');
    } else {
      // The customizable model dressed with the chosen outfit + accessories
      this._showStylized(outfitId);
    }
  }

  setObstacles(obstacles) {
    this.obstacles = obstacles;
  }

  setAppearance(app) {
    if (app.skin != null) this.appearance.skin = app.skin;
    if (app.hair != null) this.appearance.hair = app.hair;
    if (app.hairStyle != null) this.appearance.hairStyle = app.hairStyle;
    this.setOutfit(app.outfitId || this.outfitId || 'casual');
  }

  hitsCars(pos) {
    const r = this.radius + 1.6; // player radius + car half-extent
    for (const o of this.dynamicObstacles) {
      const dx = pos.x - o.x;
      const dz = pos.z - o.z;
      if (dx * dx + dz * dz < r * r) return true;
    }
    return false;
  }

  setupInput() {
    window.addEventListener('keydown', (e) => {
      if (e.target && e.target.tagName === 'INPUT') return; // ignore while typing in chat
      this.keys[e.code] = true;
    });
    window.addEventListener('keyup', (e) => {
      if (e.target && e.target.tagName === 'INPUT') return;
      this.keys[e.code] = false;
    });

    // Pointer lock for mouse look
    this.domElement.addEventListener('click', () => {
      if (!this.pointerLocked && !this.inputBlocked) {
        this.domElement.requestPointerLock();
      }
    });

    document.addEventListener('pointerlockchange', () => {
      this.pointerLocked = document.pointerLockElement === this.domElement;
    });

    document.addEventListener('mousemove', (e) => {
      if (!this.pointerLocked) return;
      this.yaw -= e.movementX * 0.0025;
      this.pitch -= e.movementY * 0.0025;
      this.pitch = clamp(this.pitch, -0.3, 1.0);
    });
  }

  isMoving() {
    return this.keys['KeyW'] || this.keys['KeyZ'] || this.keys['ArrowUp'] ||
           this.keys['KeyS'] || this.keys['ArrowDown'] ||
           this.keys['KeyA'] || this.keys['KeyQ'] || this.keys['ArrowLeft'] ||
           this.keys['KeyD'] || this.keys['ArrowRight'];
  }

  update(delta, time) {
    const blocked = this.inputBlocked;

    // Movement direction relative to camera yaw
    const forward = new THREE.Vector3(Math.sin(this.yaw), 0, Math.cos(this.yaw));
    const right = new THREE.Vector3(Math.sin(this.yaw - Math.PI / 2), 0, Math.cos(this.yaw - Math.PI / 2));

    const move = new THREE.Vector3();
    if (!blocked) {
      // Forward: W / Z / Up
      if (this.keys['KeyW'] || this.keys['KeyZ'] || this.keys['ArrowUp']) move.sub(forward);
      // Backward: S / Down
      if (this.keys['KeyS'] || this.keys['ArrowDown']) move.add(forward);
      // Left: A / Q / Left
      if (this.keys['KeyA'] || this.keys['KeyQ'] || this.keys['ArrowLeft']) move.add(right);
      // Right: D / Right
      if (this.keys['KeyD'] || this.keys['ArrowRight']) move.sub(right);
    }

    const running = this.keys['ShiftLeft'] || this.keys['ShiftRight'];
    const speed = (running ? this.runSpeed : this.walkSpeed) * this.energyFactor;

    if (move.lengthSq() > 0) {
      move.normalize().multiplyScalar(speed * delta);

      // Try X axis
      const tryX = this.position.clone();
      tryX.x += move.x;
      if (!checkBoxCollision(tryX, this.radius, this.obstacles) && !this.hitsCars(tryX)) {
        this.position.x = tryX.x;
      }
      // Try Z axis
      const tryZ = this.position.clone();
      tryZ.z += move.z;
      if (!checkBoxCollision(tryZ, this.radius, this.obstacles) && !this.hitsCars(tryZ)) {
        this.position.z = tryZ.z;
      }

      // Rotate character to face movement direction
      const targetAngle = Math.atan2(move.x, move.z);
      this.group.rotation.y = this.lerpAngle(this.group.rotation.y, targetAngle, 0.2);

      // Footstep sounds, paced with the gait
      this.stepTimer += delta;
      const stepInterval = running ? 0.3 : 0.45;
      if (this.stepTimer >= stepInterval) {
        if (this.audio) this.audio.footstep();
        this.stepTimer = 0;
      }
    } else {
      this.stepTimer = 0.4; // ready to step almost immediately when starting to move
    }

    // Animate the active character model (GLB or fallback)
    const moving = move.lengthSq() > 1e-6;
    const speed01 = moving ? (running ? 1 : 0.5) : 0;
    this.activeModel.update(delta, speed01);

    this.group.position.copy(this.position);
    this.updateCamera();
  }

  lerpAngle(a, b, t) {
    let diff = b - a;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    return a + diff * t;
  }

  updateCamera() {
    // Third-person orbit camera behind player
    const offsetX = Math.sin(this.yaw) * Math.cos(this.pitch) * this.cameraDistance;
    const offsetZ = Math.cos(this.yaw) * Math.cos(this.pitch) * this.cameraDistance;
    const offsetY = Math.sin(this.pitch) * this.cameraDistance + this.cameraHeight;

    const desired = new THREE.Vector3(
      this.position.x + offsetX,
      this.position.y + offsetY,
      this.position.z + offsetZ
    );

    this.camera.position.lerp(desired, 0.15);
    this.camera.lookAt(
      this.position.x,
      this.position.y + 1.5,
      this.position.z
    );
  }
}
