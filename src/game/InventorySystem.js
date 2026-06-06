const ITEM_ICONS = {
  telephone: '📱',
  eau: '💧',
  burger: '🍔',
  cle: '🔑',
  colis: '📦',
};

export default class InventorySystem {
  constructor() {
    this.slots = [
      { id: 'telephone', name: 'Telephone' },
      { id: 'eau', name: 'Bouteille d\'eau' },
      { id: 'burger', name: 'Burger' },
      { id: 'cle', name: 'Cle' },
      null,
    ];
    this.maxSlots = 5;
    this.updateHUD();
  }

  addItem(id, name) {
    const emptyIndex = this.slots.indexOf(null);
    if (emptyIndex === -1) return false;
    this.slots[emptyIndex] = { id, name };
    this.updateHUD();
    return true;
  }

  removeItem(id) {
    const index = this.slots.findIndex(s => s && s.id === id);
    if (index === -1) return false;
    this.slots[index] = null;
    this.updateHUD();
    return true;
  }

  hasItem(id) {
    return this.slots.some(s => s && s.id === id);
  }

  updateHUD() {
    for (let i = 0; i < this.maxSlots; i++) {
      const el = document.getElementById(`inv-${i}`);
      if (!el) continue;
      const item = this.slots[i];
      el.textContent = item ? (ITEM_ICONS[item.id] || '?') : '';
      el.title = item ? item.name : '';
    }
  }
}
