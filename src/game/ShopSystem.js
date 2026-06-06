import { ITEMS } from './InventorySystem.js';

// Items sold at the 24/7 City Mart
const CATALOG = ['burger', 'sandwich', 'eau', 'cafe', 'savon'];

export default class ShopSystem {
  constructor(playerState, inventory, hud) {
    this.playerState = playerState;
    this.inventory = inventory;
    this.hud = hud;
    this.isOpen = false;
    this.onClose = null;

    this.panel = document.getElementById('hud-shop');
    this.itemsEl = document.getElementById('shop-items');
    this.moneyEl = document.getElementById('shop-money');

    document.getElementById('shop-close').onclick = () => this.close();

    this.buildItems();
  }

  buildItems() {
    this.itemsEl.innerHTML = '';
    for (const id of CATALOG) {
      const def = ITEMS[id];
      const row = document.createElement('div');
      row.className = 'shop-item';
      row.innerHTML = `
        <span class="shop-item-icon">${def.icon}</span>
        <span class="shop-item-name">${def.name}</span>
        <span class="shop-item-price">$${def.price}</span>
        <button class="shop-buy" data-id="${id}">Acheter</button>
      `;
      this.itemsEl.appendChild(row);
    }
    this.itemsEl.querySelectorAll('.shop-buy').forEach(btn => {
      btn.onclick = () => this.buy(btn.dataset.id);
    });
  }

  buy(id) {
    const def = ITEMS[id];
    if (!def) return;
    if (this.playerState.money < def.price) {
      this.hud.showNotification('Pas assez d\'argent !');
      return;
    }
    if (!this.inventory.hasSpace()) {
      this.hud.showNotification('Inventaire plein !');
      return;
    }
    this.playerState.money -= def.price;
    this.inventory.addItem(id);
    this.hud.updatePlayerInfo(this.playerState);
    this.updateMoney();
    this.hud.showNotification(`${def.name} achete (-$${def.price})`);
  }

  updateMoney() {
    this.moneyEl.textContent = '$' + this.playerState.money.toLocaleString('en-US');
  }

  open() {
    this.isOpen = true;
    this.updateMoney();
    this.panel.classList.remove('hidden');
    document.exitPointerLock();
  }

  close() {
    this.isOpen = false;
    this.panel.classList.add('hidden');
    if (this.onClose) this.onClose();
  }
}
