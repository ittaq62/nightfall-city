import * as THREE from 'three';
import { checkBoxCollision } from './Utils.js';

// A drivable car with simple arcade physics and box collisions.
export default class Vehicle {
  constructor(scene, position, heading = 0, color = 0x991f2a) {
    this.scene = scene;
    this.position = position.clone();
    this.heading = heading;   // radians, 0 = +Z
    this.speed = 0;           // current forward speed (units/s)
    this.radius = 1.6;

    this.maxSpeed = 20;
    this.maxReverse = 7;
    this.accel = 16;
    this.brakeDecel = 26;
    this.friction = 6;
    this.turnRate = 1.8;

    this.wheels = [];
    this.buildModel(color);
    scene.add(this.group);
  }

  buildModel(color) {
    this.group = new THREE.Group();

    const bodyMat = new THREE.MeshStandardMaterial({ color, roughness: 0.4, metalness: 0.6 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(2, 0.7, 4.2), bodyMat);
    body.position.y = 0.6;
    body.castShadow = true;
    this.group.add(body);

    const cabin = new THREE.Mesh(
      new THREE.BoxGeometry(1.8, 0.6, 2.2),
      new THREE.MeshStandardMaterial({ color: 0x111118, roughness: 0.15, metalness: 0.85 })
    );
    cabin.position.set(0, 1.15, -0.2);
    this.group.add(cabin);

    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x0a0a0a });
    const wheelGeo = new THREE.CylinderGeometry(0.4, 0.4, 0.3, 12);
    for (const [wx, wz] of [[-1, 1.4], [1, 1.4], [-1, -1.4], [1, -1.4]]) {
      const wheel = new THREE.Mesh(wheelGeo, wheelMat);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(wx, 0.4, wz);
      this.group.add(wheel);
      this.wheels.push(wheel);
    }

    // Headlights
    const hlMat = new THREE.MeshStandardMaterial({ color: 0xffffcc, emissive: 0xffffaa, emissiveIntensity: 1 });
    for (const hx of [-0.6, 0.6]) {
      const hl = new THREE.Mesh(new THREE.SphereGeometry(0.13, 8, 8), hlMat);
      hl.position.set(hx, 0.6, 2.1);
      this.group.add(hl);
    }
    this.headlight = new THREE.PointLight(0xfff0cc, 0, 18);
    this.headlight.position.set(0, 0.8, 3);
    this.group.add(this.headlight);

    // Ground highlight so the player can spot it
    const ringMat = new THREE.MeshBasicMaterial({ color: 0x44ccff, transparent: true, opacity: 0.4, side: THREE.DoubleSide });
    this.ring = new THREE.Mesh(new THREE.RingGeometry(2.2, 2.5, 32), ringMat);
    this.ring.rotation.x = -Math.PI / 2;
    this.ring.position.y = 0.05;
    this.group.add(this.ring);

    this.syncTransform();
  }

  setRingVisible(v) {
    this.ring.visible = v;
  }

  setHeadlights(on) {
    this.headlight.intensity = on ? 2 : 0;
  }

  syncTransform() {
    this.group.position.copy(this.position);
    this.group.rotation.y = this.heading;
  }

  hitsDynamic(pos, dynamicObstacles, radius) {
    for (const o of dynamicObstacles) {
      const dx = pos.x - o.x;
      const dz = pos.z - o.z;
      if (dx * dx + dz * dz < radius * radius) return true;
    }
    return false;
  }

  update(delta, keys, obstacles, dynamicObstacles = []) {
    const forwardPressed = keys['KeyW'] || keys['KeyZ'] || keys['ArrowUp'];
    const backPressed = keys['KeyS'] || keys['ArrowDown'];
    const leftPressed = keys['KeyA'] || keys['KeyQ'] || keys['ArrowLeft'];
    const rightPressed = keys['KeyD'] || keys['ArrowRight'];

    // Longitudinal dynamics
    if (forwardPressed) {
      this.speed += this.accel * delta;
    } else if (backPressed) {
      this.speed -= (this.speed > 0 ? this.brakeDecel : this.accel) * delta;
    } else {
      // friction toward 0
      const f = this.friction * delta;
      if (this.speed > f) this.speed -= f;
      else if (this.speed < -f) this.speed += f;
      else this.speed = 0;
    }
    this.speed = Math.max(-this.maxReverse, Math.min(this.maxSpeed, this.speed));

    // Steering scales with speed and reverses when backing up
    if (Math.abs(this.speed) > 0.1) {
      const dir = this.speed >= 0 ? 1 : -1;
      const steerFactor = Math.min(1, Math.abs(this.speed) / 6);
      if (leftPressed) this.heading += this.turnRate * delta * steerFactor * dir;
      if (rightPressed) this.heading -= this.turnRate * delta * steerFactor * dir;
    }

    // Move along heading with per-axis collision so the car slides along walls
    const fx = Math.sin(this.heading);
    const fz = Math.cos(this.heading);
    const dx = fx * this.speed * delta;
    const dz = fz * this.speed * delta;

    const carRadius = 3; // keep clear of other cars

    const tryX = this.position.clone();
    tryX.x += dx;
    if (!checkBoxCollision(tryX, this.radius, obstacles) && !this.hitsDynamic(tryX, dynamicObstacles, carRadius)) {
      this.position.x = tryX.x;
    } else {
      this.speed *= 0.2;
    }
    const tryZ = this.position.clone();
    tryZ.z += dz;
    if (!checkBoxCollision(tryZ, this.radius, obstacles) && !this.hitsDynamic(tryZ, dynamicObstacles, carRadius)) {
      this.position.z = tryZ.z;
    } else {
      this.speed *= 0.2;
    }

    // Spin wheels for visual feedback
    const spin = this.speed * delta * 2;
    for (const w of this.wheels) w.rotation.x += spin;

    this.syncTransform();
  }

  // Speed in arbitrary "km/h" for the HUD
  get kmh() {
    return Math.round(Math.abs(this.speed) * 6);
  }
}
