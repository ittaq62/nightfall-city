import { ITEMS } from './InventorySystem.js';

// Detailed inventory panel (toggled with the I key).
export default class InventoryUI {
  constructor(inventory, onUse) {
    this.inventory = inventory;
    this.onUse = onUse; // callback(index) -> use the item in that slot
    this.isOpen = false;
    this.onClose = null;

    this.panel = document.getElementById('hud-inventory-panel');
    this.listEl = document.getElementById('inventory-panel-items');
    document.getElementById('inventory-panel-close').onclick = () => this.close();
  }

  toggle() {
    if (this.isOpen) this.close();
    else this.open();
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

  render() {
    this.listEl.innerHTML = '';
    for (let i = 0; i < this.inventory.maxSlots; i++) {
      const id = this.inventory.slots[i];
      const def = id ? ITEMS[id] : null;
      const row = document.createElement('div');
      row.className = 'inv-panel-item' + (def ? '' : ' empty');

      if (def) {
        const action = def.consumable
          ? `<button class="inv-use" data-i="${i}">Utiliser</button>`
          : `<span class="inv-tag">Objet</span>`;
        row.innerHTML = `
          <span class="inv-panel-slot">${i + 1}</span>
          <span class="inv-panel-icon">${def.icon}</span>
          <div class="inv-panel-info">
            <div class="inv-panel-name">${def.name}</div>
            <div class="inv-panel-desc">${def.desc || ''}</div>
          </div>
          ${action}`;
      } else {
        row.innerHTML = `
          <span class="inv-panel-slot">${i + 1}</span>
          <span class="inv-panel-icon">·</span>
          <div class="inv-panel-info"><div class="inv-panel-name muted">Emplacement vide</div></div>`;
      }
      this.listEl.appendChild(row);
    }

    this.listEl.querySelectorAll('.inv-use').forEach(btn => {
      btn.onclick = () => {
        this.onUse(parseInt(btn.dataset.i, 10));
        this.render();
      };
    });
  }
}
