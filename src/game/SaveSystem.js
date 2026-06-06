const SAVE_KEY = 'nightfall-city-save-v1';

export default class SaveSystem {
  constructor(game) {
    this.game = game;
  }

  save() {
    const g = this.game;
    if (g.savingEnabled === false) return;
    const data = {
      playerState: g.playerState,
      needs: g.needs,
      inventory: g.inventory.slots,
      missions: g.mission.missions.map(m => ({ id: m.id, state: m.state })),
      pos: { x: g.player.position.x, z: g.player.position.z },
      yaw: g.player.yaw,
      dayTime: g.dayNight ? g.dayNight.time : undefined,
      vehicle: g.vehicle ? { x: g.vehicle.position.x, z: g.vehicle.position.z, heading: g.vehicle.heading } : undefined,
    };
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    } catch (e) {
      // localStorage may be unavailable (private mode) - fail silently
    }
  }

  hasSave() {
    return localStorage.getItem(SAVE_KEY) !== null;
  }

  load() {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return false;
    try {
      const data = JSON.parse(raw);
      const g = this.game;
      if (data.playerState) Object.assign(g.playerState, data.playerState);
      if (data.needs) Object.assign(g.needs, data.needs);
      if (Array.isArray(data.inventory)) g.inventory.slots = data.inventory;
      if (Array.isArray(data.missions)) {
        for (const sm of data.missions) {
          const m = g.mission.getById(sm.id);
          if (m) m.state = sm.state;
        }
      }
      if (data.pos) g.player.position.set(data.pos.x, 0, data.pos.z);
      if (typeof data.yaw === 'number') g.player.yaw = data.yaw;
      if (typeof data.dayTime === 'number' && g.dayNight) g.dayNight.time = data.dayTime;
      if (data.vehicle && g.vehicle) {
        g.vehicle.position.set(data.vehicle.x, 0, data.vehicle.z);
        g.vehicle.heading = data.vehicle.heading;
        g.vehicle.syncTransform();
      }
      return true;

    } catch (e) {
      return false;
    }
  }

  clear() {
    localStorage.removeItem(SAVE_KEY);
  }
}
