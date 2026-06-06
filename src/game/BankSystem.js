// Bank panel: move money between cash (playerState.money) and savings (playerState.bank).
export default class BankSystem {
  constructor(playerState, hud, audio = null) {
    this.playerState = playerState;
    this.hud = hud;
    this.audio = audio;
    this.isOpen = false;
    this.onClose = null;

    if (this.playerState.bank === undefined) this.playerState.bank = 0;

    this.panel = document.getElementById('hud-bank');
    this.cashEl = document.getElementById('bank-cash');
    this.savingsEl = document.getElementById('bank-savings');
    document.getElementById('bank-close').onclick = () => this.close();
    this.panel.querySelectorAll('[data-bank]').forEach(btn => {
      btn.onclick = () => this.action(btn.dataset.bank);
    });
  }

  action(cmd) {
    const ps = this.playerState;
    if (cmd.startsWith('dep')) {
      const amt = cmd === 'depall' ? ps.money : Math.min(ps.money, parseInt(cmd.slice(3), 10));
      if (amt <= 0) { this.hud.showNotification('Pas de liquide a deposer'); return; }
      ps.money -= amt;
      ps.bank += amt;
    } else {
      const amt = cmd === 'wdall' ? ps.bank : Math.min(ps.bank, parseInt(cmd.slice(2), 10));
      if (amt <= 0) { this.hud.showNotification('Solde bancaire insuffisant'); return; }
      ps.bank -= amt;
      ps.money += amt;
    }
    if (this.audio) this.audio.click();
    this.hud.updatePlayerInfo(ps);
    this.refresh();
  }

  refresh() {
    this.cashEl.textContent = '$' + this.playerState.money.toLocaleString('en-US');
    this.savingsEl.textContent = '$' + this.playerState.bank.toLocaleString('en-US');
  }

  open() {
    this.isOpen = true;
    this.refresh();
    this.panel.classList.remove('hidden');
    document.exitPointerLock();
  }

  close() {
    this.isOpen = false;
    this.panel.classList.add('hidden');
    if (this.onClose) this.onClose();
  }
}
