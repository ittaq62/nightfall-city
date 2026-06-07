import { OUTFITS, SHOP_OUTFITS } from './Outfits.js';

// Clothes shop / wardrobe: buy outfits with money and equip them to change look.
export default class WardrobeSystem {
  constructor(playerState, hud, audio, player, onChange) {
    this.playerState = playerState;
    this.hud = hud;
    this.audio = audio;
    this.player = player;
    this.onChange = onChange; // called after buy/equip (to persist)
    this.isOpen = false;
    this.onClose = null;

    this.panel = document.getElementById('hud-wardrobe');
    this.listEl = document.getElementById('wardrobe-items');
    this.moneyEl = document.getElementById('wardrobe-money');
    document.getElementById('wardrobe-close').onclick = () => this.close();
  }

  owns(id) {
    return this.playerState.ownedOutfits.includes(id);
  }

  buy(id) {
    const o = OUTFITS[id];
    if (!o || this.owns(id)) return;
    if (this.playerState.money < o.price) {
      this.hud.showNotification('Pas assez d\'argent !');
      return;
    }
    this.playerState.money -= o.price;
    this.playerState.ownedOutfits.push(id);
    if (this.audio) this.audio.buy();
    this.hud.updatePlayerInfo(this.playerState);
    this.equip(id);
  }

  equip(id) {
    if (!this.owns(id)) return;
    this.player.setOutfit(id);
    this.playerState.outfit = id;
    if (this.audio) this.audio.click();
    this.hud.showNotification(`${OUTFITS[id].name} equipee`);
    if (this.onChange) this.onChange();
    this.render();
  }

  render() {
    if (this.moneyEl) this.moneyEl.textContent = '$' + this.playerState.money.toLocaleString('en-US');
    this.listEl.innerHTML = '';
    const ids = ['realistic', ...SHOP_OUTFITS];
    for (const id of ids) {
      const o = OUTFITS[id];
      const owned = this.owns(id);
      const equipped = this.playerState.outfit === id;
      const row = document.createElement('div');
      row.className = 'wd-item';
      let btn;
      if (equipped) btn = '<span class="wd-equipped">Equipee</span>';
      else if (owned) btn = `<button class="wd-btn equip" data-id="${id}">Equiper</button>`;
      else btn = `<button class="wd-btn buy" data-id="${id}">Acheter $${o.price}</button>`;
      const swatch = o.realistic ? '#6b8caa' : '#' + (o.outfit ?? 0x888888).toString(16).padStart(6, '0');
      row.innerHTML = `
        <span class="wd-swatch" style="background:${swatch}"></span>
        <span class="wd-name">${o.name}</span>
        ${btn}`;
      this.listEl.appendChild(row);
    }
    this.listEl.querySelectorAll('.wd-btn.buy').forEach((b) => { b.onclick = () => this.buy(b.dataset.id); });
    this.listEl.querySelectorAll('.wd-btn.equip').forEach((b) => { b.onclick = () => this.equip(b.dataset.id); });
  }

  open() {
    this.isOpen = true;
    this.render();
    this.panel.classList.remove('hidden');
    document.exitPointerLock();
  }

  close() {
    this.isOpen = false;
    this.panel.classList.add('hidden');
    if (this.onClose) this.onClose();
  }
}
