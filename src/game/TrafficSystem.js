import * as THREE from 'three';

// AI traffic: cars cruise the main roads, obey traffic lights at the central
// intersection, wrap at the map edges, and slow for the player.
export default class TrafficSystem {
  constructor({ scene, player }) {
    this.scene = scene;
    this.player = player;
    this.limit = 54;
    this.cars = [];
    this.lights = [];

    // light cycle state
    this.lightTimer = 0;
    this.lightState = 'ns'; // 'ns' | 'ar1' | 'ew' | 'ar2'

    const colors = [0x6688cc, 0xcc5544, 0xdddddd, 0x44aa66, 0xccaa44, 0x884488];
    const lanes = [
      { axis: 'x', off: -3, dir: 1 },
      { axis: 'x', off: 3, dir: -1 },
      { axis: 'z', off: 3, dir: 1 },
      { axis: 'z', off: -3, dir: -1 },
    ];

    let ci = 0;
    for (const lane of lanes) {
      for (let k = 0; k < 2; k++) {
        const car = this.buildCar(colors[ci % colors.length]);
        ci++;
        const data = {
          group: car,
          axis: lane.axis,
          off: lane.off,
          dir: lane.dir,
          along: -40 + k * 45,
          baseSpeed: 9 + Math.random() * 4,
          speed: 9,
        };
        this.place(data);
        this.scene.add(car);
        this.cars.push(data);
      }
    }

    this.buildLights();
  }

  buildCar(color) {
    const g = new THREE.Group();
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(1.8, 0.6, 3.8),
      new THREE.MeshStandardMaterial({ color, roughness: 0.45, metalness: 0.55 })
    );
    body.position.y = 0.55;
    body.castShadow = true;
    g.add(body);
    const cabin = new THREE.Mesh(
      new THREE.BoxGeometry(1.6, 0.5, 1.8),
      new THREE.MeshStandardMaterial({ color: 0x111118, roughness: 0.2, metalness: 0.8 })
    );
    cabin.position.set(0, 1.05, -0.1);
    g.add(cabin);
    const head = new THREE.MeshStandardMaterial({ color: 0xffffcc, emissive: 0xffffaa, emissiveIntensity: 1 });
    const tail = new THREE.MeshStandardMaterial({ color: 0xff3333, emissive: 0xff2222, emissiveIntensity: 1 });
    for (const hx of [-0.6, 0.6]) {
      const hl = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.15, 0.1), head);
      hl.position.set(hx, 0.55, 1.95);
      g.add(hl);
      const tl = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.15, 0.1), tail);
      tl.position.set(hx, 0.55, -1.95);
      g.add(tl);
    }
    return g;
  }

  buildLights() {
    const mkPost = (x, z, governs) => {
      const post = new THREE.Group();
      const pole = new THREE.Mesh(
        new THREE.CylinderGeometry(0.1, 0.12, 4.2, 8),
        new THREE.MeshStandardMaterial({ color: 0x222222, metalness: 0.8 })
      );
      pole.position.y = 2.1;
      post.add(pole);
      const housing = new THREE.Mesh(
        new THREE.BoxGeometry(0.4, 1.1, 0.3),
        new THREE.MeshStandardMaterial({ color: 0x0a0a0a })
      );
      housing.position.y = 4.2;
      post.add(housing);
      const red = new THREE.Mesh(
        new THREE.SphereGeometry(0.13, 10, 10),
        new THREE.MeshStandardMaterial({ color: 0xff2222, emissive: 0xff2222, emissiveIntensity: 1.4 })
      );
      red.position.set(0, 4.5, 0.18);
      post.add(red);
      const grn = new THREE.Mesh(
        new THREE.SphereGeometry(0.13, 10, 10),
        new THREE.MeshStandardMaterial({ color: 0x33ff55, emissive: 0x33ff55, emissiveIntensity: 0.05 })
      );
      grn.position.set(0, 3.95, 0.18);
      post.add(grn);
      post.position.set(x, 0, z);
      this.scene.add(post);
      this.lights.push({ red, grn, governs });
    };
    mkPost(7, 7, 'x');
    mkPost(-7, -7, 'x');
    mkPost(7, -7, 'z');
    mkPost(-7, 7, 'z');
  }

  place(data) {
    const x = data.axis === 'x' ? data.along : data.off;
    const z = data.axis === 'z' ? data.along : data.off;
    data.group.position.set(x, 0, z);
    if (data.axis === 'x') data.group.rotation.y = data.dir > 0 ? Math.PI / 2 : -Math.PI / 2;
    else data.group.rotation.y = data.dir > 0 ? 0 : Math.PI;
  }

  axisGo(axis) {
    return (axis === 'z' && this.lightState === 'ns') || (axis === 'x' && this.lightState === 'ew');
  }

  updateLights(delta) {
    this.lightTimer += delta;
    const NS = 8, AR = 1.5, EW = 8, AR2 = 1.5;
    const cycle = NS + AR + EW + AR2;
    const t = this.lightTimer % cycle;
    if (t < NS) this.lightState = 'ns';
    else if (t < NS + AR) this.lightState = 'ar1';
    else if (t < NS + AR + EW) this.lightState = 'ew';
    else this.lightState = 'ar2';

    for (const l of this.lights) {
      const go = this.axisGo(l.governs);
      l.grn.material.emissiveIntensity = go ? 1.5 : 0.05;
      l.red.material.emissiveIntensity = go ? 0.05 : 1.4;
    }
  }

  update(delta) {
    this.updateLights(delta);
    const p = this.player.position;

    for (const c of this.cars) {
      const x = c.axis === 'x' ? c.along : c.off;
      const z = c.axis === 'z' ? c.along : c.off;

      // Stop at red light when approaching the intersection (but not if already inside it)
      const go = this.axisGo(c.axis);
      let stopForLight = false;
      if (!go) {
        if (c.dir > 0 && c.along > -8 && c.along < -5) stopForLight = true;
        if (c.dir < 0 && c.along < 8 && c.along > 5) stopForLight = true;
      }

      // Slow down if the player is just ahead in the same lane
      const lateral = c.axis === 'x' ? Math.abs(p.z - z) : Math.abs(p.x - x);
      const aheadDist = c.axis === 'x' ? (p.x - x) * c.dir : (p.z - z) * c.dir;
      const playerAhead = lateral < 2.2 && aheadDist > 0 && aheadDist < 7;

      const target = (stopForLight || playerAhead) ? 0 : c.baseSpeed;
      c.speed += (target - c.speed) * Math.min(1, delta * 4);

      c.along += c.dir * c.speed * delta;

      // Hold at the stop line
      if (stopForLight) {
        if (c.dir > 0) c.along = Math.min(c.along, -5.2);
        else c.along = Math.max(c.along, 5.2);
      }

      if (c.along > this.limit) c.along = -this.limit;
      else if (c.along < -this.limit) c.along = this.limit;

      this.place(c);
    }
  }
}
