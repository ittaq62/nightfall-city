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
        id: 'tony_courier',
        giver: 'Tony',
        title: 'Tournee de livraison',
        offer: "Tu veux bosser regulierement ? Prends ce colis, file au depot, et reviens. Je te paie a chaque tournee.",
        objective: 'Livrer un colis au depot (tournee)',
        target: 'depot',
        giveItem: 'colis',
        needItem: 'colis',
        reward: { money: 120, rep: 4 },
        requires: { mission: 'tony_delivery' },
        repeatable: true,
        lockedText: 'Fais d\'abord ta premiere livraison, on verra ensuite.',
        state: MissionState.LOCKED,
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
        id: 'maria_coffee',
        giver: 'Maria',
        title: 'Pause cafe',
        offer: "Tu peux me ramener un cafe du 24/7 ? J'ai besoin d'un coup de fouet.",
        objective: 'Apporter un cafe a Maria',
        target: 'npc:Maria',
        needItem: 'cafe',
        reward: { money: 80, rep: 6 },
        requires: { mission: 'maria_food' },
        lockedText: 'On se connait a peine... rends-moi d\'abord un premier service.',
        state: MissionState.LOCKED,
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
      {
        id: 'vince_night',
        giver: 'Vince',
        title: 'Cargaison de nuit',
        offer: "Grosse confiance maintenant. Une derniere cargaison, gros paquet, gros billets. Discret.",
        objective: 'Livrer la cargaison de nuit au depot',
        target: 'depot',
        giveItem: 'cargaison',
        needItem: 'cargaison',
        reward: { money: 500, rep: 25 },
        requires: { rep: 40, mission: 'vince_big' },
        lockedText: 'Finis d\'abord le premier boulot, et reviens avec 40 de reputation.',
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
        const prereq = m.requires.mission ? this.getById(m.requires.mission) : null;
        const missionOk = !prereq || prereq.state === MissionState.COMPLETED;
        if (repOk && missionOk) m.state = MissionState.AVAILABLE;
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
    if (this.playerState.job !== 'Policier') {
      this.playerState.job = jobForRep(this.playerState.reputation);
    }
    // Repeatable jobs become available again; one-shots are marked done
    mission.state = mission.repeatable ? MissionState.AVAILABLE : MissionState.COMPLETED;

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
