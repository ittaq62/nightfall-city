import * as THREE from 'three';
import { createTextSprite } from './Utils.js';
import { makeAsphalt, makeConcrete, makeGround, makeFacade } from './Textures.js';

export default class CityBuilder {
  constructor(scene) {
    this.scene = scene;
    this.obstacles = []; // Array of THREE.Box3
    this.minimapObjects = []; // For minimap rendering: {x, z, w, d, color}
    this.nightLights = []; // Lights that turn on at night: {light, base}
    this.deliveryZone = null;
  }

  build() {
    this.buildGround();
    this.buildRoads();
    this.buildSidewalks();
    this.buildBuildings();
    this.buildStreetlights();
    this.buildCars();
    this.buildProps();
    this.buildDeliveryZone();
    this.buildShopEntrance();
    this.buildBank();
    this.buildBoundaryWalls();
    return this;
  }

  addObstacle(mesh, padding = 0) {
    const box = new THREE.Box3().setFromObject(mesh);
    if (padding) box.expandByScalar(padding);
    this.obstacles.push(box);
  }

  buildGround() {
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x12121a,
      roughness: 0.3,
      metalness: 0.6,
      map: makeGround(16, 16),
    });
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(120, 120), groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.scene.add(ground);
  }

  buildRoads() {
    // Main horizontal road
    const roadH = new THREE.Mesh(
      new THREE.PlaneGeometry(120, 12),
      new THREE.MeshStandardMaterial({ color: 0x1c1c24, roughness: 0.45, metalness: 0.5, map: makeAsphalt(30, 3) })
    );
    roadH.rotation.x = -Math.PI / 2;
    roadH.position.y = 0.01;
    roadH.receiveShadow = true;
    this.scene.add(roadH);

    // Cross road
    const roadV = new THREE.Mesh(
      new THREE.PlaneGeometry(12, 120),
      new THREE.MeshStandardMaterial({ color: 0x1c1c24, roughness: 0.45, metalness: 0.5, map: makeAsphalt(3, 30) })
    );
    roadV.rotation.x = -Math.PI / 2;
    roadV.position.y = 0.01;
    roadV.receiveShadow = true;
    this.scene.add(roadV);

    // Road markings (dashed center line)
    const lineMat = new THREE.MeshBasicMaterial({ color: 0xf5c542 });
    for (let x = -55; x <= 55; x += 6) {
      if (Math.abs(x) < 8) continue;
      const dash = new THREE.Mesh(new THREE.PlaneGeometry(3, 0.3), lineMat);
      dash.rotation.x = -Math.PI / 2;
      dash.position.set(x, 0.02, 0);
      this.scene.add(dash);
    }
    for (let z = -55; z <= 55; z += 6) {
      if (Math.abs(z) < 8) continue;
      const dash = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 3), lineMat);
      dash.rotation.x = -Math.PI / 2;
      dash.position.set(0, 0.02, z);
      this.scene.add(dash);
    }
  }

  buildSidewalks() {
    // Sidewalks alongside the main road
    const positions = [
      { x: 0, z: 9, w: 120, d: 4 },
      { x: 0, z: -9, w: 120, d: 4 },
      { x: 9, z: 0, w: 4, d: 120 },
      { x: -9, z: 0, w: 4, d: 120 },
    ];
    for (const p of positions) {
      const swMat = new THREE.MeshStandardMaterial({
        color: 0x33333c,
        roughness: 0.85,
        map: makeConcrete(p.w / 4, p.d / 4),
      });
      const sw = new THREE.Mesh(new THREE.BoxGeometry(p.w, 0.2, p.d), swMat);
      sw.position.set(p.x, 0.1, p.z);
      sw.receiveShadow = true;
      this.scene.add(sw);
    }
  }

  createBuilding(x, z, w, h, d, color, name = null, signColor = '#ffffff') {
    const wallHex = '#' + new THREE.Color(color).getHexString();
    const fz = makeFacade(w, h, wallHex); // front/back facade
    const fx = makeFacade(d, h, wallHex); // side facade
    const facadeMat = (f) => new THREE.MeshStandardMaterial({
      map: f.map, emissiveMap: f.emissiveMap, emissive: 0xffffff,
      emissiveIntensity: 0.9, roughness: 0.85, metalness: 0.1,
    });
    const roofMat = new THREE.MeshStandardMaterial({ color: 0x101016, roughness: 0.95 });
    // BoxGeometry face order: +x, -x, +y, -y, +z, -z
    const mats = [facadeMat(fx), facadeMat(fx), roofMat, roofMat, facadeMat(fz), facadeMat(fz)];

    const building = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mats);
    building.position.set(x, h / 2, z);
    building.castShadow = true;
    building.receiveShadow = true;
    this.scene.add(building);
    this.addObstacle(building);
    this.minimapObjects.push({ x, z, w, d, color: '#444' });

    // Sign
    if (name) {
      const sign = createTextSprite(name, { color: signColor, fontSize: 40, scale: 0.02 });
      sign.position.set(x, h + 1.2, z + d / 2 + 0.1);
      this.scene.add(sign);

      // Neon glow light at sign
      const signLight = new THREE.PointLight(new THREE.Color(signColor), 2.5, 22);
      signLight.position.set(x, h * 0.8, z + d / 2 + 1);
      this.scene.add(signLight);
      this.nightLights.push({ light: signLight, base: 2.5 });
    }

    return building;
  }

  buildBuildings() {
    // 24/7 City Mart - signature store
    this.createBuilding(18, 18, 14, 6, 12, 0x3a2a2a, '24/7 CITY MART', '#ff5555');

    // Sunset Apartments
    this.createBuilding(-20, 20, 16, 24, 14, 0x2a2a3a, 'SUNSET APARTMENTS', '#ff66cc');

    // Generic buildings
    this.createBuilding(22, -20, 18, 18, 14, 0x252530);
    this.createBuilding(-22, -22, 14, 30, 14, 0x1f1f28);
    this.createBuilding(-45, 15, 12, 20, 20, 0x282832);
    this.createBuilding(45, 20, 14, 16, 18, 0x232330);
    this.createBuilding(-45, -25, 16, 22, 16, 0x262630);
    this.createBuilding(45, -22, 12, 26, 16, 0x1d1d26);

    // Pawn shop (small)
    this.createBuilding(-18, 16, 8, 5, 8, 0x3a2f2a, 'PAWN SHOP', '#ff8844');
  }

  buildStreetlights() {
    const poleMat = new THREE.MeshStandardMaterial({ color: 0x222222, metalness: 0.8 });
    const positions = [
      [12, 12], [-12, 12], [12, -12], [-12, -12],
      [30, 12], [-30, 12], [30, -12], [-30, -12],
      [12, 30], [-12, 30], [12, -30], [-12, -30],
    ];
    for (const [x, z] of positions) {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.15, 6, 8), poleMat);
      pole.position.set(x, 3, z);
      pole.castShadow = true;
      this.scene.add(pole);

      const lamp = new THREE.Mesh(
        new THREE.SphereGeometry(0.3, 12, 12),
        new THREE.MeshStandardMaterial({ color: 0xfff0c0, emissive: 0xffcc66, emissiveIntensity: 1 })
      );
      lamp.position.set(x, 6, z);
      this.scene.add(lamp);

      const light = new THREE.PointLight(0xffcc66, 1.2, 16, 2);
      light.position.set(x, 5.8, z);
      this.scene.add(light);
      this.nightLights.push({ light, base: 1.2 });
    }
  }

  createCar(x, z, rotation, color) {
    const group = new THREE.Group();

    const bodyMat = new THREE.MeshStandardMaterial({ color, roughness: 0.4, metalness: 0.6 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(2, 0.7, 4.2), bodyMat);
    body.position.y = 0.6;
    body.castShadow = true;
    group.add(body);

    const cabin = new THREE.Mesh(
      new THREE.BoxGeometry(1.8, 0.6, 2.2),
      new THREE.MeshStandardMaterial({ color: 0x111118, roughness: 0.2, metalness: 0.8 })
    );
    cabin.position.y = 1.15;
    cabin.position.z = -0.2;
    group.add(cabin);

    // Wheels
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x0a0a0a });
    const wheelGeo = new THREE.CylinderGeometry(0.4, 0.4, 0.3, 12);
    const wheelPos = [[-1, 1.4], [1, 1.4], [-1, -1.4], [1, -1.4]];
    for (const [wx, wz] of wheelPos) {
      const wheel = new THREE.Mesh(wheelGeo, wheelMat);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(wx, 0.4, wz);
      group.add(wheel);
    }

    // Headlights
    const hlMat = new THREE.MeshStandardMaterial({ color: 0xffffcc, emissive: 0xffffaa, emissiveIntensity: 1 });
    for (const hx of [-0.6, 0.6]) {
      const hl = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 8), hlMat);
      hl.position.set(hx, 0.6, 2.1);
      group.add(hl);
    }

    group.position.set(x, 0, z);
    group.rotation.y = rotation;
    this.scene.add(group);
    this.addObstacle(group, 0.2);
    this.minimapObjects.push({ x, z, w: 2, d: 4, color: '#666' });
  }

  buildCars() {
    this.createCar(4, 25, 0, 0x882222);
    this.createCar(-4, -30, Math.PI, 0x222288);
    this.createCar(25, 4, Math.PI / 2, 0x666666);
    this.createCar(-32, -4, -Math.PI / 2, 0x227722);
  }

  createTrashcan(x, z) {
    const mat = new THREE.MeshStandardMaterial({ color: 0x1a3a1a, roughness: 0.8 });
    const can = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.35, 1, 10), mat);
    can.position.set(x, 0.5, z);
    can.castShadow = true;
    this.scene.add(can);
    this.addObstacle(can, 0.1);
  }

  buildProps() {
    this.createTrashcan(11, 11);
    this.createTrashcan(13, 14);
    this.createTrashcan(-11, 11);
    this.createTrashcan(-13, -11);

    // Bus stop bench area
    const benchMat = new THREE.MeshStandardMaterial({ color: 0x333328 });
    const bench = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.5, 0.6), benchMat);
    bench.position.set(-14, 0.5, 11);
    this.scene.add(bench);
  }

  buildDeliveryZone() {
    // Central delivery depot zone - glowing pad
    const zoneX = 0;
    const zoneZ = -38;

    const padMat = new THREE.MeshStandardMaterial({
      color: 0x1a3a4a,
      emissive: 0x2288cc,
      emissiveIntensity: 0.5,
      transparent: true,
      opacity: 0.8,
    });
    const pad = new THREE.Mesh(new THREE.CircleGeometry(4, 32), padMat);
    pad.rotation.x = -Math.PI / 2;
    pad.position.set(zoneX, 0.05, zoneZ);
    this.scene.add(pad);

    // Glowing border ring
    const ringMat = new THREE.MeshBasicMaterial({ color: 0x44ccff, side: THREE.DoubleSide });
    const ring = new THREE.Mesh(new THREE.RingGeometry(3.8, 4.2, 32), ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(zoneX, 0.06, zoneZ);
    this.scene.add(ring);
    this.deliveryRing = ring;

    // Depot building behind
    this.createBuilding(zoneX, zoneZ - 8, 16, 8, 8, 0x2a3540, 'DEPOT CENTRAL', '#44ccff');

    // Label
    const label = createTextSprite('Zone de livraison', { color: '#44ccff', fontSize: 28, scale: 0.014 });
    label.position.set(zoneX, 3, zoneZ);
    this.scene.add(label);

    // Light
    const zoneLight = new THREE.PointLight(0x44ccff, 2, 20);
    zoneLight.position.set(zoneX, 4, zoneZ);
    this.scene.add(zoneLight);

    this.deliveryZone = new THREE.Vector3(zoneX, 0, zoneZ);
    this.deliveryRadius = 4;
    this.minimapObjects.push({ x: zoneX, z: zoneZ, w: 8, d: 8, color: '#44ccff', isZone: true });
  }

  buildShopEntrance() {
    // Glowing entrance pad in front of the 24/7 City Mart (store is at 18,18)
    const zoneX = 18;
    const zoneZ = 11.5;

    const padMat = new THREE.MeshStandardMaterial({
      color: 0x1a4a1a,
      emissive: 0x33cc44,
      emissiveIntensity: 0.5,
      transparent: true,
      opacity: 0.7,
    });
    const pad = new THREE.Mesh(new THREE.CircleGeometry(2.2, 32), padMat);
    pad.rotation.x = -Math.PI / 2;
    pad.position.set(zoneX, 0.05, zoneZ);
    this.scene.add(pad);

    const ringMat = new THREE.MeshBasicMaterial({ color: 0x44ff66, side: THREE.DoubleSide });
    const ring = new THREE.Mesh(new THREE.RingGeometry(2.1, 2.4, 32), ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(zoneX, 0.06, zoneZ);
    this.scene.add(ring);
    this.shopRing = ring;

    const label = createTextSprite('ENTREE', { color: '#44ff66', fontSize: 24, scale: 0.012 });
    label.position.set(zoneX, 2.6, zoneZ);
    this.scene.add(label);

    const light = new THREE.PointLight(0x44ff66, 1.2, 12);
    light.position.set(zoneX, 3, zoneZ);
    this.scene.add(light);

    this.shopZone = new THREE.Vector3(zoneX, 0, zoneZ);
    this.shopRadius = 2.6;
  }

  buildBank() {
    // Bank building on the north sidewalk
    this.createBuilding(-30, 16, 14, 16, 12, 0x2e2a1f, 'BANQUE', '#f5c542');

    const zoneX = -30;
    const zoneZ = 9.5;
    const padMat = new THREE.MeshStandardMaterial({
      color: 0x3a3320, emissive: 0xf5c542, emissiveIntensity: 0.35,
      transparent: true, opacity: 0.7,
    });
    const pad = new THREE.Mesh(new THREE.CircleGeometry(2.2, 32), padMat);
    pad.rotation.x = -Math.PI / 2;
    pad.position.set(zoneX, 0.05, zoneZ);
    this.scene.add(pad);

    const ring = new THREE.Mesh(
      new THREE.RingGeometry(2.1, 2.4, 32),
      new THREE.MeshBasicMaterial({ color: 0xf5c542, side: THREE.DoubleSide })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(zoneX, 0.06, zoneZ);
    this.scene.add(ring);
    this.bankRing = ring;

    const light = new THREE.PointLight(0xf5c542, 1.2, 12);
    light.position.set(zoneX, 3, zoneZ);
    this.scene.add(light);
    this.nightLights.push({ light, base: 1.2 });

    this.bankZone = new THREE.Vector3(zoneX, 0, zoneZ);
    this.bankRadius = 2.6;
  }

  buildBoundaryWalls() {
    // Invisible boundary boxes to keep player inside the map
    const limit = 58;
    const thickness = 2;
    const walls = [
      { x: 0, z: limit, w: 120, d: thickness },
      { x: 0, z: -limit, w: 120, d: thickness },
      { x: limit, z: 0, w: thickness, d: 120 },
      { x: -limit, z: 0, w: thickness, d: 120 },
    ];
    for (const w of walls) {
      const box = new THREE.Box3(
        new THREE.Vector3(w.x - w.w / 2, 0, w.z - w.d / 2),
        new THREE.Vector3(w.x + w.w / 2, 10, w.z + w.d / 2)
      );
      this.obstacles.push(box);
    }
  }

  update(time) {
    if (this.deliveryRing) {
      this.deliveryRing.material.opacity = 0.5 + Math.sin(time * 2) * 0.3;
      this.deliveryRing.scale.setScalar(1 + Math.sin(time * 2) * 0.05);
    }
    if (this.shopRing) {
      this.shopRing.scale.setScalar(1 + Math.sin(time * 2.5) * 0.06);
    }
  }
}
