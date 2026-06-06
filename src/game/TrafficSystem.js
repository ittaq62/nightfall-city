import * as THREE from 'three';

// Lightweight AI traffic: cars cruise along the main roads and wrap around
// at the map edges. They slow down if the player is right in front of them.
export default class TrafficSystem {
  constructor({ scene, player }) {
    this.scene = scene;
    this.player = player;
    this.limit = 54;
    this.cars = [];

    const colors = [0x6688cc, 0xcc5544, 0xdddddd, 0x44aa66, 0xccaa44, 0x884488];

    // lane definitions: axis to travel along, fixed offset on the other axis, direction
    const lanes = [
      { axis: 'x', off: -3, dir: 1 },   // eastbound
      { axis: 'x', off: 3, dir: -1 },   // westbound
      { axis: 'z', off: 3, dir: 1 },    // northbound
      { axis: 'z', off: -3, dir: -1 },  // southbound
    ];

    let ci = 0;
    for (const lane of lanes) {
      // two cars per lane, spaced apart
      for (let k = 0; k < 2; k++) {
        const along = -40 + k * 45;
        const car = this.buildCar(colors[ci % colors.length]);
        ci++;
        const data = {
          group: car,
          axis: lane.axis,
          off: lane.off,
          dir: lane.dir,
          along,
          baseSpeed: 9 + Math.random() * 4,
          speed: 9,
        };
        this.place(data);
        this.scene.add(car);
        this.cars.push(data);
      }
    }
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

  place(data) {
    const x = data.axis === 'x' ? data.along : data.off;
    const z = data.axis === 'z' ? data.along : data.off;
    data.group.position.set(x, 0, z);
    // face travel direction
    if (data.axis === 'x') data.group.rotation.y = data.dir > 0 ? Math.PI / 2 : -Math.PI / 2;
    else data.group.rotation.y = data.dir > 0 ? 0 : Math.PI;
  }

  update(delta) {
    const p = this.player.position;
    for (const c of this.cars) {
      // current world position
      const x = c.axis === 'x' ? c.along : c.off;
      const z = c.axis === 'z' ? c.along : c.off;

      // slow down if the player is just ahead in the same lane
      const lateral = c.axis === 'x' ? Math.abs(p.z - z) : Math.abs(p.x - x);
      const aheadDist = c.axis === 'x' ? (p.x - x) * c.dir : (p.z - z) * c.dir;
      const target = (lateral < 2.2 && aheadDist > 0 && aheadDist < 7) ? 0 : c.baseSpeed;
      c.speed += (target - c.speed) * Math.min(1, delta * 4);

      c.along += c.dir * c.speed * delta;
      if (c.along > this.limit) c.along = -this.limit;
      else if (c.along < -this.limit) c.along = this.limit;

      this.place(c);
    }
  }
}
