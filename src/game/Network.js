import CharacterModel from './CharacterModel.js';
import { createTextSprite } from './Utils.js';

// WebSocket client. Connects to the multiplayer server if available; renders
// remote players and relays chat. Fails silently if no server is running
// (the game then falls back to simulated players).
export default class Network {
  constructor({ scene, hud, name = 'Player', url }) {
    this.scene = scene;
    this.hud = hud;
    this.name = name;
    this.url = url || `ws://${location.hostname || 'localhost'}:8080`;
    this.connected = false;
    this.id = null;
    this.remotes = new Map(); // id -> { model, target:{x,z,heading}, moving }
    this.sendTimer = 0;
    this.onConnect = null;
    this.onDisconnect = null;
  }

  connect() {
    let ws;
    try {
      ws = new WebSocket(this.url);
    } catch (e) {
      return;
    }
    this.ws = ws;
    ws.onopen = () => {
      this.connected = true;
      ws.send(JSON.stringify({ t: 'join', name: this.name, x: 0, z: 0, heading: 0 }));
      if (this.onConnect) this.onConnect();
    };
    ws.onmessage = (ev) => {
      let m;
      try { m = JSON.parse(ev.data); } catch (e) { return; }
      this.handle(m);
    };
    ws.onclose = () => {
      const was = this.connected;
      this.connected = false;
      this.clearRemotes();
      if (was && this.onDisconnect) this.onDisconnect();
    };
    ws.onerror = () => { /* onclose will follow */ };
  }

  handle(m) {
    if (m.t === 'welcome') {
      this.id = m.id;
      for (const p of m.players) this.addRemote(p);
    } else if (m.t === 'join') {
      this.addRemote(m);
      if (this.hud) this.hud.addChatMessage('Systeme', `${m.name} a rejoint la ville`, 'online');
    } else if (m.t === 'pos') {
      this.updateRemote(m);
    } else if (m.t === 'leave') {
      this.removeRemote(m.id);
    } else if (m.t === 'chat') {
      if (this.hud) this.hud.addChatMessage(m.name, m.text, 'online');
    }
  }

  addRemote(p) {
    if (this.remotes.has(p.id)) return;
    const model = new CharacterModel({ outfit: 0x2a6e6e, skin: 0x7a5c44, hair: 0x101010 });
    model.group.position.set(p.x || 0, 0, p.z || 0);
    const tag = createTextSprite(p.name || ('P' + p.id), { color: '#7CFC00', fontSize: 26, scale: 0.011 });
    tag.position.y = 2.3;
    model.group.add(tag);
    this.scene.add(model.group);
    this.remotes.set(p.id, {
      model,
      target: { x: p.x || 0, z: p.z || 0, heading: p.heading || 0 },
      moving: false,
    });
  }

  updateRemote(m) {
    const r = this.remotes.get(m.id);
    if (!r) return;
    r.target.x = m.x;
    r.target.z = m.z;
    r.target.heading = m.heading;
    r.moving = m.moving;
  }

  removeRemote(id) {
    const r = this.remotes.get(id);
    if (r) {
      this.scene.remove(r.model.group);
      this.remotes.delete(id);
    }
  }

  clearRemotes() {
    for (const id of [...this.remotes.keys()]) this.removeRemote(id);
  }

  sendChat(text) {
    if (this.connected) this.ws.send(JSON.stringify({ t: 'chat', text }));
  }

  update(delta, local) {
    // Throttled position broadcast (~10/s)
    this.sendTimer += delta;
    if (this.connected && this.sendTimer > 0.1) {
      this.sendTimer = 0;
      this.ws.send(JSON.stringify({ t: 'pos', x: local.x, z: local.z, heading: local.heading, moving: local.moving }));
    }
    // Smoothly interpolate remote players toward their last known transform
    for (const r of this.remotes.values()) {
      const g = r.model.group;
      const k = Math.min(1, delta * 10);
      g.position.x += (r.target.x - g.position.x) * k;
      g.position.z += (r.target.z - g.position.z) * k;
      g.rotation.y = r.target.heading;
      r.model.update(delta, r.moving ? 0.5 : 0);
    }
  }
}
