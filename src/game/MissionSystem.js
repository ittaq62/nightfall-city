export const MissionState = {
  LOCKED: 'locked',
  AVAILABLE: 'available',
  ACTIVE: 'active',
  COMPLETED: 'completed',
};

// Reputation tiers -> job title
const REP_TIERS = [
  { min: 0, job: 'Citoyen' },
  { min: 20, job: 'Coursier' },
  { min: 40, job: 'Livreur' },
  { min: 70, job: 'Livreur Pro' },
];

export function jobForRep(rep) {
  let job = 'Citoyen';
  for (const t of REP_TIERS) if (rep >= t.min) job = t.job;
  return job;
}

export default class MissionSystem {
  constructor(playerState, inventory, hud, audio = null) {
    this.playerState = playerState;
    this.inventory = inventory;
    this.hud = hud;
    this.audio = audio;

    this.missions = [
      {
        id: 'tony_delivery',
        giver: 'Tony',
        title: 'Premiere livraison',
        offer: "Salut ! J'ai besoin d'un livreur. Va deposer ce colis au depot central, au nord. 150$ et de la reputation a la cle. Ca te dit ?",
        objective: 'Livrer le colis au depot central',
        target: 'depot',
        giveItem: 'colis',
        needItem: 'colis',
        reward: { money: 150, rep: 10 },
        requires: {},
        state: MissionState.AVAILABLE,
      },
      {
        id: 'maria_food',
        giver: 'Maria',
        title: 'Un petit creux',
        offer: "Je meurs de faim... Tu peux m'acheter un burger au 24/7 et me le rapporter ? Je te revaudrai ca.",
        objective: 'Apporter un burger a Maria',
        target: 'npc:Maria',
        needItem: 'burger',
        reward: { money: 90, rep: 8 },
        requires: {},
        state: MissionState.AVAILABLE,
      },
      {
        id: 'vince_big',
        giver: 'Vince',
        title: 'Cargaison speciale',
        offer: "T'as fait tes preuves, gamin. J'ai une grosse cargaison pour le depot. Ca paie tres bien, mais sois discret.",
        objective: 'Livrer la cargaison au depot central',
        target: 'depot',
        giveItem: 'cargaison',
        needItem: 'cargaison',
        reward: { money: 350, rep: 20 },
        requires: { rep: 25 },
        lockedText: 'Reviens quand tu auras au moins 25 de reputation. La je te ferai confiance.',
        state: MissionState.LOCKED,
      },
    ];

    this.refreshLocks();
    this.updateMissionHUD();
  }

  refreshLocks() {
    for (const m of this.missions) {
      if (m.state === MissionState.LOCKED) {
        const repOk = !m.requires.rep || this.playerState.reputation >= m.requires.rep;
        if (repOk) m.state = MissionState.AVAILABLE;
      }
    }
  }

  getById(id) {
    return this.missions.find(m => m.id === id);
  }

  getOfferFor(npcName) {
    return this.missions.find(m => m.giver === npcName && m.state === MissionState.AVAILABLE);
  }

  getLockedFor(npcName) {
    return this.missions.find(m => m.giver === npcName && m.state === MissionState.LOCKED);
  }

  getActiveDeliverableTo(targetKey) {
    return this.missions.find(
      m => m.state === MissionState.ACTIVE && m.target === targetKey && this.inventory.hasItem(m.needItem)
    );
  }

  hasActiveTarget(targetKey) {
    return this.missions.some(m => m.state === MissionState.ACTIVE && m.target === targetKey);
  }

  accept(mission) {
    if (mission.state !== MissionState.AVAILABLE) return;
    mission.state = MissionState.ACTIVE;
    if (mission.giveItem) this.inventory.addItem(mission.giveItem);
    this.updateMissionHUD();
  }

  complete(mission) {
    if (mission.state !== MissionState.ACTIVE) return false;
    if (!this.inventory.hasItem(mission.needItem)) return false;

    this.inventory.removeItem(mission.needItem);
    this.playerState.money += mission.reward.money;
    this.playerState.reputation += mission.reward.rep;
    this.playerState.job = jobForRep(this.playerState.reputation);
    mission.state = MissionState.COMPLETED;

    this.refreshLocks();
    this.updateMissionHUD();
    this.hud.updatePlayerInfo(this.playerState);
    this.hud.showNotification(
      `Mission terminee : +${mission.reward.money}$ / +${mission.reward.rep} reputation`
    );
    return true;
  }

  updateMissionHUD() {
    const el = document.getElementById('hud-mission');
    const title = document.getElementById('mission-title');
    const desc = document.getElementById('mission-desc');

    const active = this.missions.filter(m => m.state === MissionState.ACTIVE);
    const available = this.missions.filter(m => m.state === MissionState.AVAILABLE);

    el.classList.remove('hidden');
    if (active.length > 0) {
      title.textContent = active.length > 1 ? `Missions actives (${active.length})` : 'Mission en cours';
      desc.textContent = active[0].objective + (active.length > 1 ? ` ( +${active.length - 1} autre(s) )` : '');
    } else if (available.length > 0) {
      title.textContent = 'Missions disponibles !';
      desc.textContent = 'Parle aux PNJ marques d\'un cercle pour en accepter une';
    } else {
      title.textContent = 'Toutes les missions terminees !';
      desc.textContent = 'Bravo, tu as tout livre.';
    }
  }
}
