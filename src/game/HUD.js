export default class HUD {
  constructor() {
    this.notificationTimeout = null;
    this.setupChat();
  }

  updatePlayerInfo(state) {
    document.getElementById('player-name').textContent = state.name;
    document.getElementById('player-money').textContent =
      '$' + state.money.toLocaleString('en-US');
    document.getElementById('player-rep').textContent = state.reputation;
    document.getElementById('player-job').textContent = state.job.toUpperCase();
  }

  updateNeeds(needs) {
    const keys = ['hunger', 'energy', 'hygiene', 'stress'];
    for (const key of keys) {
      const val = Math.round(needs[key]);
      const bar = document.getElementById(`bar-${key}`);
      const valEl = document.getElementById(`val-${key}`);
      if (bar) {
        bar.style.width = val + '%';
        // Stress is bad when HIGH; the others are bad when LOW
        const critical = key === 'stress' ? val > 80 : val < 20;
        bar.classList.toggle('critical', critical);
      }
      if (valEl) valEl.textContent = val + '%';
    }
  }

  updateClock(hour) {
    const el = document.getElementById('location-time');
    if (!el) return;
    const hh = Math.floor(hour);
    const mm = Math.floor((hour - hh) * 60);
    el.textContent = `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
  }

  showInteractPrompt(text) {
    const el = document.getElementById('hud-interact');
    document.getElementById('interact-text').textContent = text;
    el.classList.remove('hidden');
  }

  hideInteractPrompt() {
    document.getElementById('hud-interact').classList.add('hidden');
  }

  showDialog(name, text, onAccept, showAccept = true) {
    const el = document.getElementById('hud-dialog');
    document.getElementById('dialog-name').textContent = name;
    document.getElementById('dialog-text').textContent = text;
    el.classList.remove('hidden');
    // Release the mouse so dialog buttons become clickable
    document.exitPointerLock();

    const acceptBtn = document.getElementById('dialog-accept');
    const closeBtn = document.getElementById('dialog-close');
    acceptBtn.style.display = showAccept ? 'block' : 'none';

    const close = () => {
      el.classList.add('hidden');
      acceptBtn.onclick = null;
      closeBtn.onclick = null;
      if (this.onDialogClose) this.onDialogClose();
    };

    acceptBtn.onclick = () => {
      if (onAccept) onAccept();
      close();
    };
    closeBtn.onclick = close;
  }

  isDialogOpen() {
    return !document.getElementById('hud-dialog').classList.contains('hidden');
  }

  showNotification(text) {
    const el = document.getElementById('hud-notification');
    document.getElementById('notification-text').textContent = text;
    el.classList.remove('hidden');
    if (this.notificationTimeout) clearTimeout(this.notificationTimeout);
    this.notificationTimeout = setTimeout(() => {
      el.classList.add('hidden');
    }, 4000);
  }

  setupChat() {
    const messages = [
      { author: 'Chris_L', text: 'quelqu\'un pour une livraison ?', cls: 'chris' },
      { author: 'Emma', text: 'je cherche un appart a louer', cls: 'emma' },
      { author: 'Tony', text: 'Besoin d\'un livreur ?', cls: 'tony' },
      { author: 'Lucas', text: 'je vends un canape pas cher', cls: 'lucas' },
      { author: 'Emma', text: 'merci !', cls: 'emma' },
    ];
    const container = document.getElementById('chat-messages');
    container.innerHTML = '';
    for (const m of messages) {
      const div = document.createElement('div');
      div.className = 'chat-msg';
      div.innerHTML = `<span class="chat-author ${m.cls}">${m.author}:</span>${m.text}`;
      container.appendChild(div);
    }
    container.scrollTop = container.scrollHeight;
  }

  addChatMessage(author, text, cls = '') {
    const container = document.getElementById('chat-messages');
    const div = document.createElement('div');
    div.className = 'chat-msg';
    div.innerHTML = `<span class="chat-author ${cls}">${author}:</span>${text}`;
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
  }
}
