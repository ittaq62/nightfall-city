// Central item registry: icon, display name, and (if consumable) the need effects.
export const ITEMS = {
  telephone: { name: 'Telephone', icon: '📱', consumable: false, desc: 'Ton smartphone. Indispensable en ville.' },
  eau: { name: 'Bouteille d\'eau', icon: '💧', consumable: true, price: 10, effects: { energy: 10, stress: -12 }, desc: 'Rafraichit : +10 energie, -12 stress.' },
  burger: { name: 'Burger', icon: '🍔', consumable: true, price: 25, effects: { hunger: 35, stress: -5 }, desc: 'Bien gras : +35 faim, -5 stress.' },
  sandwich: { name: 'Sandwich', icon: '🥪', consumable: true, price: 18, effects: { hunger: 25, energy: 5 }, desc: 'En-cas rapide : +25 faim, +5 energie.' },
  cafe: { name: 'Cafe', icon: '☕', consumable: true, price: 15, effects: { energy: 30, stress: -8 }, desc: 'Un bon shot : +30 energie, -8 stress.' },
  savon: { name: 'Savon', icon: '🧼', consumable: true, price: 12, effects: { hygiene: 40 }, desc: 'Pour rester propre : +40 hygiene.' },
  cle: { name: 'Cle', icon: '🔑', consumable: false, desc: 'Une cle. On ne sait jamais.' },
  colis: { name: 'Colis de Tony', icon: '📦', consumable: false, desc: 'A livrer au depot central.' },
  cargaison: { name: 'Cargaison de Vince', icon: '🧳', consumable: false, desc: 'Grosse cargaison. A livrer au depot, discretement.' },
};

export default class InventorySystem {
  constructor() {
    // Slots store item ids (or null)
    this.slots = ['telephone', 'eau', 'burger', 'cle', null];
    this.maxSlots = 5;
    this.updateHUD();
  }

  addItem(id) {
    if (!ITEMS[id]) return false;
    const emptyIndex = this.slots.indexOf(null);
    if (emptyIndex === -1) return false;
    this.slots[emptyIndex] = id;
    this.updateHUD();
    return true;
  }

  removeItem(id) {
    const index = this.slots.findIndex(s => s === id);
    if (index === -1) return false;
    this.slots[index] = null;
    this.updateHUD();
    return true;
  }

  hasItem(id) {
    return this.slots.includes(id);
  }

  hasSpace() {
    return this.slots.includes(null);
  }

  // Try to consume the item in a slot. Returns the item def if consumed, else null.
  consumeSlot(index) {
    const id = this.slots[index];
    if (!id) return null;
    const def = ITEMS[id];
    if (!def || !def.consumable) return { id, def, consumed: false };
    this.slots[index] = null;
    this.updateHUD();
    return { id, def, consumed: true };
  }

  updateHUD() {
    for (let i = 0; i < this.maxSlots; i++) {
      const el = document.getElementById(`inv-${i}`);
      if (!el) continue;
      const id = this.slots[i];
      const def = id ? ITEMS[id] : null;
      el.textContent = def ? def.icon : '';
      el.title = def ? def.name : '';
    }
  }
}
