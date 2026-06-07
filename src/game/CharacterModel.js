import * as THREE from 'three';

// A stylized humanoid built from rounded primitives (capsules) for a smoother,
// less blocky look. Arms and legs hang from pivot groups so they swing when walking.
export default class CharacterModel {
  constructor(options = {}) {
    const skin = options.skin ?? 0x8a6a4a;
    const outfit = options.outfit ?? 0x3a3a4c;
    const pants = options.pants ?? 0x24242e;
    const hair = options.hair ?? 0x1a1410;
    const shoes = options.shoes ?? 0x101014;

    this.group = new THREE.Group();
    this.phase = Math.random() * Math.PI * 2;

    const skinMat = new THREE.MeshStandardMaterial({ color: skin, roughness: 0.55 });
    const outfitMat = new THREE.MeshStandardMaterial({ color: outfit, roughness: 0.7 });
    const pantsMat = new THREE.MeshStandardMaterial({ color: pants, roughness: 0.75 });
    const hairMat = new THREE.MeshStandardMaterial({ color: hair, roughness: 0.85 });
    const shoeMat = new THREE.MeshStandardMaterial({ color: shoes, roughness: 0.5 });

    // Hips
    const hips = new THREE.Mesh(new THREE.CapsuleGeometry(0.2, 0.12, 4, 12), pantsMat);
    hips.position.y = 0.92;
    hips.castShadow = true;
    this.group.add(hips);

    // Torso (slightly tapered chest)
    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.26, 0.42, 6, 16), outfitMat);
    torso.position.y = 1.28;
    torso.scale.set(1, 1, 0.7);
    torso.castShadow = true;
    this.group.add(torso);

    // Neck
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.1, 0.1, 10), skinMat);
    neck.position.y = 1.6;
    this.group.add(neck);

    // Head
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.21, 20, 20), skinMat);
    head.position.y = 1.78;
    head.scale.set(0.92, 1.05, 0.95);
    head.castShadow = true;
    this.group.add(head);

    // Hair cap
    const hairMesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.225, 18, 18, 0, Math.PI * 2, 0, Math.PI * 0.62),
      hairMat
    );
    hairMesh.position.y = 1.81;
    hairMesh.scale.set(0.95, 1.05, 1);
    this.group.add(hairMesh);

    // Eyes
    const eyeMat = new THREE.MeshStandardMaterial({ color: 0x141414, roughness: 0.3 });
    for (const ex of [-0.08, 0.08]) {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.028, 8, 8), eyeMat);
      eye.position.set(ex, 1.79, 0.19);
      this.group.add(eye);
    }

    // Limbs
    this.leftArm = this._limb(outfitMat, skinMat, 0.46, 0.075);
    this.leftArm.position.set(-0.3, 1.5, 0);
    this.group.add(this.leftArm);

    this.rightArm = this._limb(outfitMat, skinMat, 0.46, 0.075);
    this.rightArm.position.set(0.3, 1.5, 0);
    this.group.add(this.rightArm);

    this.leftLeg = this._limb(pantsMat, shoeMat, 0.62, 0.1, true);
    this.leftLeg.position.set(-0.12, 0.92, 0);
    this.group.add(this.leftLeg);

    this.rightLeg = this._limb(pantsMat, shoeMat, 0.62, 0.1, true);
    this.rightLeg.position.set(0.12, 0.92, 0);
    this.group.add(this.rightLeg);

    this._buildAccessories(options.accessories || []);
  }

  _buildAccessories(list) {
    const add = (geo, mat, x, y, z, rx = 0) => {
      const m = new THREE.Mesh(geo, mat);
      m.position.set(x, y, z);
      if (rx) m.rotation.x = rx;
      m.castShadow = true;
      this.group.add(m);
      return m;
    };
    const mk = (color, rough = 0.6) => new THREE.MeshStandardMaterial({ color, roughness: rough });

    for (const acc of list) {
      if (acc === 'cap') {
        const m = mk(0x141a33);
        const dome = add(new THREE.SphereGeometry(0.225, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.5), m, 0, 1.86, 0);
        dome.scale.set(1, 0.7, 1);
        add(new THREE.BoxGeometry(0.34, 0.05, 0.2), m, 0, 1.83, 0.22);
      } else if (acc === 'helmet') {
        const m = mk(0xf0b020, 0.5);
        const dome = add(new THREE.SphereGeometry(0.24, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.5), m, 0, 1.86, 0);
        dome.scale.set(1, 0.85, 1);
        add(new THREE.CylinderGeometry(0.3, 0.3, 0.04, 16), m, 0, 1.82, 0);
      } else if (acc === 'beanie') {
        const m = mk(0x202020, 0.9);
        const b = add(new THREE.SphereGeometry(0.235, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.62), m, 0, 1.8, 0);
        b.scale.set(1, 0.85, 1);
      } else if (acc === 'glasses') {
        add(new THREE.BoxGeometry(0.34, 0.06, 0.04), mk(0x0a0a0a, 0.3), 0, 1.79, 0.2);
      } else if (acc === 'tie') {
        const m = mk(0x9a1f2a, 0.5);
        add(new THREE.BoxGeometry(0.07, 0.34, 0.05), m, 0, 1.18, 0.16);
        add(new THREE.BoxGeometry(0.09, 0.08, 0.05), m, 0, 1.42, 0.16);
      } else if (acc === 'vest' || acc === 'vest_police') {
        const base = acc === 'vest' ? 0xeedd22 : 0x0b1230;
        const shell = add(new THREE.BoxGeometry(0.58, 0.56, 0.36), mk(base, 0.6), 0, 1.27, 0);
        shell.castShadow = true;
        const stripe = mk(acc === 'vest' ? 0xcfd2d6 : 0xdfe6ff, 0.4);
        add(new THREE.BoxGeometry(0.6, 0.07, 0.38), stripe, 0, 1.36, 0);
        add(new THREE.BoxGeometry(0.6, 0.07, 0.38), stripe, 0, 1.18, 0);
      } else if (acc === 'badge') {
        add(new THREE.BoxGeometry(0.09, 0.11, 0.03), mk(0xf5c542, 0.3), -0.14, 1.42, 0.17);
      } else if (acc === 'stetho') {
        const m = mk(0x3a3a40, 0.4);
        const ring = add(new THREE.TorusGeometry(0.13, 0.02, 8, 20), m, 0, 1.52, 0.04, Math.PI / 2);
        ring.scale.set(1, 1, 0.6);
        add(new THREE.BoxGeometry(0.05, 0.05, 0.03), m, 0.1, 1.3, 0.17);
      }
    }
  }

  _limb(material, endMat, length, radius, isLeg = false) {
    const pivot = new THREE.Group();
    const mesh = new THREE.Mesh(new THREE.CapsuleGeometry(radius, length, 4, 10), material);
    mesh.position.y = -(length / 2 + radius);
    mesh.castShadow = true;
    pivot.add(mesh);
    // hand / foot
    const end = new THREE.Mesh(
      isLeg ? new THREE.BoxGeometry(radius * 2.2, radius * 1.4, radius * 3.2)
            : new THREE.SphereGeometry(radius * 1.2, 8, 8),
      endMat
    );
    if (isLeg) end.position.set(0, -(length + radius * 1.2), radius * 0.6);
    else end.position.y = -(length + radius * 1.4);
    pivot.add(end);
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
      this.phase += delta * 1.5;
      const breathe = Math.sin(this.phase) * 0.04;
      this.leftArm.rotation.x = breathe;
      this.rightArm.rotation.x = breathe;
      this.leftLeg.rotation.x *= 0.85;
      this.rightLeg.rotation.x *= 0.85;
    }
  }
}
