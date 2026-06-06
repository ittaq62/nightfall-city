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
      mission: g.mission.state,
      pos: { x: g.player.position.x, z: g.player.position.z },
      yaw: g.player.yaw,
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
      if (data.mission) g.mission.state = data.mission;
      if (data.pos) g.player.position.set(data.pos.x, 0, data.pos.z);
      if (typeof data.yaw === 'number') g.player.yaw = data.yaw;
      return true;
    } catch (e) {
      return false;
    }
  }

  clear() {
    localStorage.removeItem(SAVE_KEY);
  }
}
