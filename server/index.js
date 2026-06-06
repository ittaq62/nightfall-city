// Minimal Node + WebSocket server for Nightfall City multiplayer.
// Run with: npm run server   (then `npm run dev` in another terminal)
const { WebSocketServer } = require('ws');

const PORT = process.env.PORT || 8080;
const wss = new WebSocketServer({ port: PORT });

let nextId = 1;
const clients = new Map(); // ws -> { id, name, x, z, heading, moving }

function broadcast(obj, exceptWs) {
  const msg = JSON.stringify(obj);
  for (const ws of wss.clients) {
    if (ws !== exceptWs && ws.readyState === 1 /* OPEN */) ws.send(msg);
  }
}

wss.on('connection', (ws) => {
  const id = nextId++;
  const state = { id, name: 'Player' + id, x: 0, z: 0, heading: 0, moving: false };
  clients.set(ws, state);
  console.log(`+ player ${id} connected (${wss.clients.size} online)`);

  ws.on('message', (raw) => {
    let m;
    try { m = JSON.parse(raw); } catch (e) { return; }

    if (m.t === 'join') {
      state.name = String(m.name || state.name).slice(0, 16);
      state.x = m.x || 0; state.z = m.z || 0; state.heading = m.heading || 0;
      const players = [...clients.values()].filter((s) => s.id !== id);
      ws.send(JSON.stringify({ t: 'welcome', id, players }));
      broadcast({ t: 'join', id, name: state.name, x: state.x, z: state.z, heading: state.heading }, ws);
    } else if (m.t === 'pos') {
      state.x = m.x; state.z = m.z; state.heading = m.heading; state.moving = !!m.moving;
      broadcast({ t: 'pos', id, x: m.x, z: m.z, heading: m.heading, moving: state.moving }, ws);
    } else if (m.t === 'chat') {
      broadcast({ t: 'chat', id, name: state.name, text: String(m.text).slice(0, 120) }, null);
    }
  });

  ws.on('close', () => {
    clients.delete(ws);
    broadcast({ t: 'leave', id }, ws);
    console.log(`- player ${id} disconnected (${wss.clients.size} online)`);
  });
});

console.log(`Nightfall City multiplayer server running on ws://localhost:${PORT}`);
