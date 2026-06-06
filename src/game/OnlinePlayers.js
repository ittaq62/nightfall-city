import * as THREE from 'three';
import CharacterModel from './CharacterModel.js';
import { createTextSprite, distance2D } from './Utils.js';

// Simulated "online players" - purely local (no backend). They wander the city,
// show name tags, appear on the minimap and post RP chat messages, to give the
// feel of a populated RP server while keeping everything 100% local.
const NAMES = ['Mike_R', 'Sarah99', 'DJ_Karl', 'Nina', 'Rico_', 'LeoP'];
const OUTFITS = [0x33506e, 0x6e3350, 0x3a5a3a, 0x5a4a2a, 0x4a3a5a, 0x2a4a5a];
const CHAT_LINES = [
  'quelqu\'un pour une course ?',
  'je cherche un coloc pas cher',
  'rdv au 24/7 dans 5 min',
  'vends ma caisse, mp',
  'qui bosse pour Tony ce soir ?',
  'gg la ville est belle de nuit',
  'someone near le depot ?',
  'plus jamais sans parapluie...',
  'la banque ferme jamais lol',
  'bonne soiree a tous',
];

export default class OnlinePlayers {
  constructor({ scene, hud, count = 5 }) {
    this.scene = scene;
    this.hud = hud;
    this.players = [];

    // Sidewalk-ring waypoints (clear of buildings)
    this.waypoints = [];
    for (const x of [-40, -20, 0, 20, 40]) this.waypoints.push({ x, z: 7 }, { x, z: -7 });
    for (const z of [-40, -20, 20, 40]) this.waypoints.push({ x: 7, z }, { x: -7, z });

    this.chatTimer = 0;
    this.nextChat = 5;

    for (let i = 0; i < count; i++) {
      const start = this.waypoints[Math.floor(Math.random() * this.waypoints.length)];
      const model = new CharacterModel({ outfit: OUTFITS[i % OUTFITS.length], skin: 0x7a5c44 });
      model.group.position.set(start.x, 0, start.z);

      const tag = createTextSprite(NAMES[i % NAMES.length], { color: '#66ddff', fontSize: 26, scale: 0.011 });
      tag.position.y = 2.3;
      model.group.add(tag);

      this.scene.add(model.group);
      this.players.push({
        name: NAMES[i % NAMES.length],
        model,
        pos: new THREE.Vector3(start.x, 0, start.z),
        target: this.pickTarget(),
        speed: 2.6 + Math.random() * 1.4,
      });
    }
  }

  pickTarget() {
    const wp = this.waypoints[Math.floor(Math.random() * this.waypoints.length)];
    return new THREE.Vector3(wp.x, 0, wp.z);
  }

  update(delta, time) {
    for (const p of this.players) {
      const dx = p.target.x - p.pos.x;
      const dz = p.target.z - p.pos.z;
      const dist = Math.hypot(dx, dz);
      if (dist < 1) {
        p.target = this.pickTarget();
      } else {
        const vx = (dx / dist) * p.speed * delta;
        const vz = (dz / dist) * p.speed * delta;
        p.pos.x += vx;
        p.pos.z += vz;
        p.model.group.position.set(p.pos.x, 0, p.pos.z);
        p.model.group.rotation.y = Math.atan2(vx, vz);
      }
      p.model.update(delta, 0.5);
    }

    // Periodic ambient RP chat
    this.chatTimer += delta;
    if (this.chatTimer >= this.nextChat) {
      this.chatTimer = 0;
      this.nextChat = 8 + Math.random() * 12;
      const p = this.players[Math.floor(Math.random() * this.players.length)];
      const line = CHAT_LINES[Math.floor(Math.random() * CHAT_LINES.length)];
      if (this.hud) this.hud.addChatMessage(p.name, line, 'online');
    }
  }
}
