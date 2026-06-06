import * as THREE from 'three';

// A simple articulated humanoid built from primitives (no external assets).
// Arms and legs hang from pivot groups so they can swing during a walk cycle.
export default class CharacterModel {
  constructor(options = {}) {
    const skin = options.skin ?? 0x6b4f3a;
    const outfit = options.outfit ?? 0x1a1a22;
    const pants = options.pants ?? 0x15151c;
    const hair = options.hair ?? 0x141414;

    this.group = new THREE.Group();
    this.phase = Math.random() * Math.PI * 2; // desync idle/walk between characters

    const outfitMat = new THREE.MeshStandardMaterial({ color: outfit, roughness: 0.75 });
    const skinMat = new THREE.MeshStandardMaterial({ color: skin, roughness: 0.6 });
    const pantsMat = new THREE.MeshStandardMaterial({ color: pants, roughness: 0.8 });

    // Torso
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.65, 0.28), outfitMat);
    torso.position.y = 1.15;
    torso.castShadow = true;
    this.group.add(torso);

    // Hips
    const hips = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.25, 0.26), pantsMat);
    hips.position.y = 0.78;
    hips.castShadow = true;
    this.group.add(hips);

    // Head
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.21, 16, 16), skinMat);
    head.position.y = 1.66;
    head.castShadow = true;
    this.group.add(head);

    // Hair cap
    const hairMesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.225, 16, 16, 0, Math.PI * 2, 0, Math.PI * 0.6),
      new THREE.MeshStandardMaterial({ color: hair, roughness: 0.9 })
    );
    hairMesh.position.y = 1.69;
    this.group.add(hairMesh);

    // Face marker (so the facing direction is readable)
    const face = new THREE.Mesh(
      new THREE.PlaneGeometry(0.18, 0.1),
      new THREE.MeshStandardMaterial({ color: 0x000000 })
    );
    face.position.set(0, 1.64, 0.205);
    this.group.add(face);

    // Limbs
    this.leftArm = this._limb(outfitMat, 0.55);
    this.leftArm.position.set(-0.33, 1.42, 0);
    this.group.add(this.leftArm);

    this.rightArm = this._limb(outfitMat, 0.55);
    this.rightArm.position.set(0.33, 1.42, 0);
    this.group.add(this.rightArm);

    this.leftLeg = this._limb(pantsMat, 0.7);
    this.leftLeg.position.set(-0.14, 0.7, 0);
    this.group.add(this.leftLeg);

    this.rightLeg = this._limb(pantsMat, 0.7);
    this.rightLeg.position.set(0.14, 0.7, 0);
    this.group.add(this.rightLeg);
  }

  _limb(material, length) {
    const pivot = new THREE.Group();
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.15, length, 0.15), material);
    mesh.position.y = -length / 2; // hang below the pivot (shoulder / hip)
    mesh.castShadow = true;
    pivot.add(mesh);
    return pivot;
  }

  // speed01: 0 = idle, ~0.5 = walking, ~1 = running
  update(delta, speed01) {
    if (speed01 > 0.02) {
      this.phase += delta * (7 + speed01 * 7);
      const swing = Math.sin(this.phase) * (0.35 + speed01 * 0.5);
      this.leftLeg.rotation.x = swing;
      this.rightLeg.rotation.x = -swing;
      this.leftArm.rotation.x = -swing;
      this.rightArm.rotation.x = swing;
    } else {
      // gentle idle breathing + ease limbs back to rest
      this.phase += delta * 1.5;
      const breathe = Math.sin(this.phase) * 0.04;
      this.leftArm.rotation.x = breathe;
      this.rightArm.rotation.x = breathe;
      this.leftLeg.rotation.x *= 0.85;
      this.rightLeg.rotation.x *= 0.85;
    }
  }
}
