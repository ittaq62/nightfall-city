export const MissionState = {
  NONE: 'none',
  AVAILABLE: 'available',
  ACTIVE: 'active',
  COMPLETED: 'completed',
};

export default class MissionSystem {
  constructor(playerState, inventory, hud) {
    this.playerState = playerState;
    this.inventory = inventory;
    this.hud = hud;
    this.state = MissionState.AVAILABLE;
    this.updateMissionHUD();
  }

  acceptMission() {
    if (this.state !== MissionState.AVAILABLE) return;
    this.state = MissionState.ACTIVE;
    this.inventory.addItem('colis');
    this.updateMissionHUD();
  }

  completeMission() {
    if (this.state !== MissionState.ACTIVE) return;
    if (!this.inventory.hasItem('colis')) return;

    this.inventory.removeItem('colis');
    this.playerState.money += 150;
    this.playerState.reputation += 10;
    this.state = MissionState.COMPLETED;
    this.updateMissionHUD();
    this.hud.updatePlayerInfo(this.playerState);
    this.hud.showNotification('Mission terminee : +150$ / +10 reputation');
  }

  updateMissionHUD() {
    const el = document.getElementById('hud-mission');
    const title = document.getElementById('mission-title');
    const desc = document.getElementById('mission-desc');

    if (this.state === MissionState.AVAILABLE) {
      el.classList.remove('hidden');
      title.textContent = 'Mission disponible !';
      desc.textContent = 'Parle a Tony derriere le magasin 24/7';
    } else if (this.state === MissionState.ACTIVE) {
      el.classList.remove('hidden');
      title.textContent = 'Mission en cours';
      desc.textContent = 'Livrer le colis au depot central';
    } else if (this.state === MissionState.COMPLETED) {
      el.classList.remove('hidden');
      title.textContent = 'Mission terminee !';
      desc.textContent = 'Bravo ! Tu as gagne 150$ et 10 reputation.';
      setTimeout(() => el.classList.add('hidden'), 5000);
    } else {
      el.classList.add('hidden');
    }
  }
}
