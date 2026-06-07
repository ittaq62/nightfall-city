import * as THREE from 'three';
import PlayerController from './PlayerController.js';
import CityBuilder from './CityBuilder.js';
import NPC from './NPC.js';
import Vehicle from './Vehicle.js';
import TrafficSystem from './TrafficSystem.js';
import OnlinePlayers from './OnlinePlayers.js';
import Network from './Network.js';
import Atmosphere from './Atmosphere.js';
import TaxiSystem from './TaxiSystem.js';
import HUD from './HUD.js';
import InventorySystem from './InventorySystem.js';
import MissionSystem, { jobForRep } from './MissionSystem.js';
import ShopSystem from './ShopSystem.js';
import BankSystem from './BankSystem.js';
import InventoryUI from './InventoryUI.js';
import AudioSystem from './AudioSystem.js';
import SaveSystem from './SaveSystem.js';
import DayNightCycle from './DayNightCycle.js';
import WeatherSystem from './WeatherSystem.js';
import { distance2D, clamp } from './Utils.js';

export default class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.clock = new THREE.Clock();
    this.eKeyWasDown = false;

    this.playerState = {
      name: 'Alex Mercer',
      money: 2450,
      bank: 0,
      reputation: 12,
      job: 'Citoyen',
    };
    this.rent = 60; // charged each in-game morning

    this.needs = {
      hunger: 72,
      energy: 64,
      hygiene: 81,
      stress: 24,
    };

    this.initRenderer();
    this.initScene();
    this.initSystems();
    this.setupEvents();
  }

  initRenderer() {
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    // Brightness is user-adjustable (pause menu) and remembered
    let saved = parseFloat(localStorage.getItem('nightfall-brightness'));
    this.brightness = (saved >= 0.6 && saved <= 3) ? saved : 1.7;
    this.renderer.toneMappingExposure = this.brightness;
  }

  initScene() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0c0c16);
    this.scene.fog = new THREE.FogExp2(0x12131c, 0.006);

    this.camera = new THREE.PerspectiveCamera(
      70,
      window.innerWidth / window.innerHeight,
      0.1,
      300
    );
    this.camera.position.set(0, 4, 12);

    // Lighting - night ambiance (dark but clearly readable).
    // References are kept so the DayNightCycle can animate them.
    this.ambient = new THREE.AmbientLight(0x4a4a66, 1.1);
    this.scene.add(this.ambient);

    this.hemi = new THREE.HemisphereLight(0x5566aa, 0x141420, 0.9);
    this.scene.add(this.hemi);

    // Sun / moon directional light
    this.sun = new THREE.DirectionalLight(0x8899cc, 0.9);
    this.sun.position.set(-30, 50, -20);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    this.sun.shadow.camera.near = 1;
    this.sun.shadow.camera.far = 200;
    this.sun.shadow.camera.left = -70;
    this.sun.shadow.camera.right = 70;
    this.sun.shadow.camera.top = 70;
    this.sun.shadow.camera.bottom = -70;
    // Prevent shadow acne (the diagonal artifacts on flat ground)
    this.sun.shadow.bias = -0.0004;
    this.sun.shadow.normalBias = 0.05;
    this.scene.add(this.sun);
  }

  initSystems() {
    // Build city
    this.city = new CityBuilder(this.scene);
    this.city.build();

    // Player
    this.player = new PlayerController(this.scene, this.camera, this.canvas);
    this.player.setObstacles(this.city.obstacles);

    // HUD + systems
    this.hud = new HUD();
    this.audio = new AudioSystem();
    this.player.audio = this.audio;
    this.inventory = new InventorySystem();

    // NPCs around the city
    this.tony = new NPC(this.scene, new THREE.Vector3(12, 0, 12), 'Tony', {
      outfit: 0x2a2a35, pants: 0x16161c, skin: 0x6b4f3a, hair: 0x0d0d0d,
      chatLine: 'Tranquille ? Si t\'as besoin de taf, je suis la.',
    });
    this.maria = new NPC(this.scene, new THREE.Vector3(-14, 0, 16), 'Maria', {
      outfit: 0x8a2f4a, pants: 0x2a2030, skin: 0x8a6a4f, hair: 0x2a1810,
      chatLine: 'Cette ville ne dort jamais, hein ?',
    });
    this.vince = new NPC(this.scene, new THREE.Vector3(16, 0, -12), 'Vince', {
      outfit: 0x1f3a2a, pants: 0x14201a, skin: 0x5a4636, hair: 0x101010,
      chatLine: 'Garde l\'oeil ouvert, gamin.',
    });
    this.npcs = [this.tony, this.maria, this.vince];

    // Drivable vehicle, parked on the road near the spawn
    this.vehicle = new Vehicle(this.scene, new THREE.Vector3(6, 0, 5), Math.PI, 0x991f2a);
    this.mode = 'foot'; // 'foot' | 'drive'

    // AI traffic cruising the main roads
    this.traffic = new TrafficSystem({ scene: this.scene, player: this.player });

    // Ambient atmosphere (motes + fountain particles), fountain matches the plaza
    this.atmosphere = new Atmosphere({
      scene: this.scene,
      player: this.player,
      fountainPos: new THREE.Vector3(-38, 0, 40),
    });

    // Simulated online players (local, no backend) - used when no server is reachable
    this.online = new OnlinePlayers({ scene: this.scene, hud: this.hud, count: 5 });

    // Real networked multiplayer (optional). Falls back to simulated players if the
    // server isn't running. When connected, the simulated players are hidden.
    this.networked = false;
    this.network = new Network({ scene: this.scene, hud: this.hud, name: this.playerState.name });
    this.network.onConnect = () => {
      this.networked = true;
      this.online.setActive(false);
      this.hud.addChatMessage('Systeme', 'Connecte au serveur multijoueur', 'online');
      this.updateGlobalCount();
    };
    this.network.onDisconnect = () => {
      this.networked = false;
      this.online.setActive(true);
      this.hud.addChatMessage('Systeme', 'Mode hors-ligne (joueurs simules)', 'online');
      this.updateGlobalCount();
    };
    // network.connect() is deferred to beginSession() (after the name is chosen)
    this.updateGlobalCount();

    this.mission = new MissionSystem(this.playerState, this.inventory, this.hud, this.audio);
    this.shop = new ShopSystem(this.playerState, this.inventory, this.hud, this.audio);
    this.shop.onClose = () => { this.player.inputBlocked = false; };

    // Bank
    this.bank = new BankSystem(this.playerState, this.hud, this.audio);
    this.bank.onClose = () => { this.player.inputBlocked = false; };

    // Taxi job
    this.taxi = new TaxiSystem({ scene: this.scene, hud: this.hud, audio: this.audio, playerState: this.playerState });

    // Detailed inventory panel (I)
    this.inventoryUI = new InventoryUI(this.inventory, (i) => this.useSlot(i, true));
    this.inventoryUI.onClose = () => { this.player.inputBlocked = false; };

    // Day / night cycle
    this.dayNight = new DayNightCycle({
      scene: this.scene,
      sun: this.sun,
      ambient: this.ambient,
      hemi: this.hemi,
      nightLights: this.city.nightLights,
      facadeMaterials: this.city.facadeMaterials,
      hud: this.hud,
    });

    // Weather (rain / fog) - baseFog matches the FogExp2 density set in initScene
    this.weather = new WeatherSystem({
      scene: this.scene,
      player: this.player,
      audio: this.audio,
      hud: this.hud,
      baseFog: 0.006,
    });

    // Save / load progress
    this.savingEnabled = true;
    this.save = new SaveSystem(this);
    if (this.save.load()) {
      this.mission.updateMissionHUD();
      this.inventory.updateHUD();
      this.player.group.position.copy(this.player.position);
      setTimeout(() => this.hud.showNotification('Partie chargee'), 500);
    }

    this.hud.updatePlayerInfo(this.playerState);
    this.hud.updateNeeds(this.needs);

    // Auto-save every 8 seconds and before leaving the page
    this.autoSaveTimer = 0;
    this._prevDayTime = this.dayNight.time; // for daily rent detection
    window.addEventListener('beforeunload', () => this.save.save());

    // Minimap setup
    this.minimapCanvas = document.getElementById('minimap-canvas');
    this.minimapCtx = this.minimapCanvas.getContext('2d');

    // Block player movement when dialog is open
    this.hud.onDialogClose = () => {
      this.player.inputBlocked = false;
    };
  }

  setupEvents() {
    window.addEventListener('resize', () => this.onResize());

    const chatInput = document.getElementById('chat-input');

    document.addEventListener('keydown', (e) => {
      // While typing in the chat, let the input handle keys (no game shortcuts)
      if (document.activeElement === chatInput) return;

      // Escape releases pointer and toggles the pause menu
      if (e.code === 'Escape') {
        document.exitPointerLock();
        this.togglePause();
      }
      // Enter opens the chat
      if (e.code === 'Enter') {
        document.exitPointerLock();
        this.player.inputBlocked = true;
        chatInput.focus();
        e.preventDefault();
        return;
      }
      // Toggle controls help
      if (e.code === 'KeyH') {
        document.getElementById('hud-controls').classList.toggle('hidden');
      }
      // Toggle minimap
      if (e.code === 'KeyM') {
        document.getElementById('hud-minimap').classList.toggle('hidden');
      }
      // Toggle inventory panel
      if (e.code === 'KeyI') {
        this.inventoryUI.toggle();
        this.player.inputBlocked = this.inventoryUI.isOpen;
      }
      // Use inventory item with number keys 1-5
      if (e.code.startsWith('Digit') && !e.repeat) {
        const n = parseInt(e.code.slice(5), 10);
        if (n >= 1 && n <= 5) this.useSlot(n - 1);
      }
    });

    // Mute / unmute button (reflects the restored setting)
    const muteBtn = document.getElementById('btn-mute');
    if (muteBtn) {
      muteBtn.textContent = this.audio.enabled ? '🔊' : '🔇';
      muteBtn.onclick = () => {
        const on = this.audio.toggle();
        muteBtn.textContent = on ? '🔊' : '🔇';
      };
    }

    // Pause menu buttons
    const resumeBtn = document.getElementById('pause-resume');
    if (resumeBtn) resumeBtn.onclick = () => {
      this.setPaused(false);
      if (this.canvas.requestPointerLock) this.canvas.requestPointerLock();
    };
    const pauseNewGame = document.getElementById('pause-newgame');
    if (pauseNewGame) pauseNewGame.onclick = () => this.resetGame();
    const volSlider = document.getElementById('vol-slider');
    if (volSlider) {
      volSlider.value = String(Math.round(this.audio.volume * 100));
      volSlider.addEventListener('input', () => this.audio.setVolume(volSlider.value / 100));
    }
    const brightSlider = document.getElementById('bright-slider');
    if (brightSlider) {
      brightSlider.value = String(Math.round(this.brightness * 100));
      brightSlider.addEventListener('input', () => this.setBrightness(brightSlider.value / 100));
    }

    // Chat input
    if (chatInput) {
      chatInput.addEventListener('keydown', (e) => {
        e.stopPropagation();
        if (e.code === 'Enter') {
          this.sendChat(chatInput.value);
          chatInput.value = '';
          chatInput.blur();
        } else if (e.code === 'Escape') {
          chatInput.value = '';
          chatInput.blur();
        }
      });
      chatInput.addEventListener('blur', () => { this.player.inputBlocked = false; });
    }
  }

  useSlot(index, fromPanel = false) {
    if (this.hud.isDialogOpen() || this.shop.isOpen || this.bank.isOpen) return;
    if (!fromPanel && this.inventoryUI.isOpen) return;
    const result = this.inventory.consumeSlot(index);
    if (!result) return; // empty slot
    if (!result.consumed) {
      this.hud.showNotification('Cet objet ne peut pas etre utilise');
      return;
    }
    const effects = result.def.effects || {};
    const parts = [];
    for (const key in effects) {
      this.needs[key] = clamp(this.needs[key] + effects[key], 0, 100);
      const sign = effects[key] > 0 ? '+' : '';
      parts.push(`${key} ${sign}${effects[key]}`);
    }
    this.hud.updateNeeds(this.needs);
    this.audio.consume();
    this.save.save();
    this.hud.showNotification(`${result.def.name} utilise (${parts.join(', ')})`);
  }

  onResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  setPaused(p) {
    this.paused = p;
    document.getElementById('hud-pause').classList.toggle('hidden', !p);
  }

  setBrightness(v) {
    this.brightness = Math.max(0.6, Math.min(3, v));
    this.renderer.toneMappingExposure = this.brightness;
    try { localStorage.setItem('nightfall-brightness', String(this.brightness)); } catch (e) { /* ignore */ }
  }

  updatePointerHint() {
    const el = document.getElementById('pointer-hint');
    if (!el) return;
    const overlayHidden = document.getElementById('start-overlay').classList.contains('hidden');
    const blocked = this.paused || this.hud.isDialogOpen() || this.shop.isOpen ||
      this.bank.isOpen || this.inventoryUI.isOpen ||
      document.activeElement === document.getElementById('chat-input');
    const show = overlayHidden && !blocked && !this.player.pointerLocked;
    el.classList.toggle('hidden', !show);
  }

  togglePause() {
    this.setPaused(!this.paused);
  }

  updateGlobalCount() {
    const n = this.networked ? (this.network.remotes.size + 1) : (this.online.players.length + 1);
    const tab = document.getElementById('chat-global-tab');
    if (tab) tab.textContent = `GLOBAL ● ${n}`;
  }

  // Called when the player clicks "play" - applies the chosen name and goes online
  beginSession(name) {
    const clean = (name || '').trim().slice(0, 16);
    if (clean) {
      this.playerState.name = clean;
      this.hud.updatePlayerInfo(this.playerState);
      this.save.save();
    }
    this.network.name = this.playerState.name;
    this.network.connect();
  }

  sendChat(text) {
    text = (text || '').trim();
    if (!text) return;
    this.hud.addChatMessage(this.playerState.name, text, ''); // local echo
    if (this.networked) this.network.sendChat(text);
  }

  resetGame() {
    // Disable saving so the beforeunload handler can't re-write the cleared save
    this.savingEnabled = false;
    this.save.clear();
    location.reload();
  }

  enterVehicle() {
    this.mode = 'drive';
    this.player.group.visible = false;
    this.vehicle.setRingVisible(false);
    this.vehicle.setHeadlights(true);
    this.audio.startEngine();
    this.hud.showNotification('Tu conduis. ZQSD pour rouler, E pour sortir.');
  }

  exitVehicle() {
    this.mode = 'foot';
    this.vehicle.speed = 0;
    this.audio.stopEngine();
    this.vehicle.setRingVisible(true);
    this.vehicle.setHeadlights(false);
    this.hud.hideSpeed();

    // Drop the player beside the car (left side of its heading)
    const sideX = Math.cos(this.vehicle.heading);
    const sideZ = -Math.sin(this.vehicle.heading);
    this.player.position.set(
      this.vehicle.position.x + sideX * 3,
      0,
      this.vehicle.position.z + sideZ * 3
    );
    this.player.yaw = this.vehicle.heading + Math.PI; // camera behind player
    this.player.group.visible = true;
    this.player.group.position.copy(this.player.position);
    this.save.save();
  }

  updateDriveCamera() {
    const v = this.vehicle;
    const back = 8.5;
    const height = 4.2;
    const desired = new THREE.Vector3(
      v.position.x - Math.sin(v.heading) * back,
      v.position.y + height,
      v.position.z - Math.cos(v.heading) * back
    );
    this.camera.position.lerp(desired, 0.12);
    this.camera.lookAt(v.position.x, v.position.y + 1.2, v.position.z);
  }

  handleInteractions() {
    const playerPos = this.player.position;
    const eDown = this.player.keys['KeyE'];
    const ePressed = eDown && !this.eKeyWasDown;
    this.eKeyWasDown = eDown;

    // Driving: taxi actions take priority, otherwise step out
    if (this.mode === 'drive') {
      if (this.taxi.state === 'toPickup' && this.taxi.nearTarget(playerPos)) {
        this.hud.showInteractPrompt('Appuie sur E pour prendre le client');
        if (ePressed) this.taxi.pickUp();
      } else if (this.taxi.state === 'toDropoff' && this.taxi.nearTarget(playerPos)) {
        this.hud.showInteractPrompt('Appuie sur E pour deposer le client');
        if (ePressed) { this.taxi.dropOff(); this.save.save(); }
      } else {
        this.hud.showInteractPrompt('Appuie sur E pour sortir du vehicule');
        if (ePressed) this.exitVehicle();
      }
      return;
    }

    // Don't process world interactions while a panel is open
    if (this.hud.isDialogOpen() || this.shop.isOpen || this.bank.isOpen || this.inventoryUI.isOpen) {
      this.hud.hideInteractPrompt();
      return;
    }

    // Enter the vehicle when on foot nearby
    if (distance2D(playerPos, this.vehicle.position) <= 3.6) {
      this.hud.showInteractPrompt('Appuie sur E pour conduire');
      if (ePressed) this.enterVehicle();
      return;
    }

    // --- NPC interactions (closest in-range NPC wins) ---
    const npc = this.npcs.find(n => n.inRange);
    if (npc) {
      const deliver = this.mission.getActiveDeliverableTo('npc:' + npc.name);
      const offer = this.mission.getOfferFor(npc.name);
      const locked = this.mission.getLockedFor(npc.name);

      if (deliver) {
        this.hud.showInteractPrompt(`Appuie sur E pour livrer a ${npc.name}`);
        if (ePressed) this.completeMissionFlow(deliver, npc);
      } else if (offer) {
        this.hud.showInteractPrompt('Appuie sur E pour parler');
        if (ePressed) this.openOfferDialog(offer, npc);
      } else if (locked) {
        this.hud.showInteractPrompt('Appuie sur E pour parler');
        if (ePressed) {
          this.player.inputBlocked = true;
          this.hud.showDialog(npc.name, locked.lockedText, null, false);
        }
      } else {
        this.hud.showInteractPrompt('Appuie sur E pour parler');
        if (ePressed) {
          this.player.inputBlocked = true;
          this.hud.showDialog(npc.name, npc.chatLine, null, false);
        }
      }
      return;
    }

    // --- Taxi: pick up / drop off the active fare (on foot) ---
    if (this.taxi.state !== 'idle' && this.taxi.nearTarget(playerPos)) {
      if (this.taxi.state === 'toPickup') {
        this.hud.showInteractPrompt('Appuie sur E pour prendre le client');
        if (ePressed) this.taxi.pickUp();
      } else {
        this.hud.showInteractPrompt('Appuie sur E pour deposer le client');
        if (ePressed) { this.taxi.dropOff(); this.save.save(); }
      }
      return;
    }

    // --- Depot delivery ---
    const nearDelivery = distance2D(playerPos, this.city.deliveryZone) <= this.city.deliveryRadius;
    if (nearDelivery) {
      const m = this.mission.getActiveDeliverableTo('depot');
      if (m) {
        this.hud.showInteractPrompt('Appuie sur E pour livrer la marchandise');
        if (ePressed) this.completeMissionFlow(m, null);
        return;
      }
    }

    // --- Shop ---
    const nearShop = distance2D(playerPos, this.city.shopZone) <= this.city.shopRadius;
    if (nearShop) {
      this.hud.showInteractPrompt('Appuie sur E pour entrer dans le magasin');
      if (ePressed) {
        this.player.inputBlocked = true;
        this.shop.open();
      }
      return;
    }

    // --- Bank ---
    const nearBank = distance2D(playerPos, this.city.bankZone) <= this.city.bankRadius;
    if (nearBank) {
      this.hud.showInteractPrompt('Appuie sur E pour la banque');
      if (ePressed) {
        this.player.inputBlocked = true;
        this.bank.open();
      }
      return;
    }

    // --- Taxi stand: start a shift ---
    const nearTaxi = distance2D(playerPos, this.city.taxiZone) <= this.city.taxiRadius;
    if (nearTaxi && this.taxi.state === 'idle') {
      this.hud.showInteractPrompt('Appuie sur E pour prendre un service taxi');
      if (ePressed) this.taxi.startShift(playerPos);
      return;
    }

    this.hud.hideInteractPrompt();
  }

  openOfferDialog(mission, npc) {
    this.player.inputBlocked = true;
    this.hud.showDialog(
      npc.name,
      mission.offer,
      () => {
        this.mission.accept(mission);
        this.audio.click();
        this.save.save();
        this.hud.showNotification('Mission acceptee : ' + mission.objective);
        this.hud.addChatMessage(npc.name, 'Compte sur moi pour te payer.', npc.name.toLowerCase());
      },
      true
    );
  }

  completeMissionFlow(mission, npc) {
    if (this.mission.complete(mission)) {
      this.audio.success();
      this.save.save();
      const who = npc ? npc.name : 'Systeme';
      this.hud.addChatMessage(who, 'Beau boulot, livraison recue !', npc ? npc.name.toLowerCase() : 'tony');
    }
  }

  chargeRent() {
    const ps = this.playerState;
    let due = this.rent;
    const fromCash = Math.min(ps.money, due);
    ps.money -= fromCash;
    due -= fromCash;
    if (due > 0) {
      const fromBank = Math.min(ps.bank, due);
      ps.bank -= fromBank;
      due -= fromBank;
    }
    this.hud.updatePlayerInfo(ps);
    this.save.save();
    if (due > 0) {
      ps.reputation = Math.max(0, ps.reputation - 2);
      ps.job = jobForRep(ps.reputation);
      this.hud.updatePlayerInfo(ps);
      this.hud.showNotification(`Loyer impaye ! -2 reputation`);
    } else {
      this.hud.showNotification(`Loyer paye : -$${this.rent}`);
    }
  }

  updateNeeds(delta) {
    // Needs slowly decay over time
    this.needs.hunger = Math.max(0, this.needs.hunger - delta * 0.15);
    this.needs.energy = Math.max(0, this.needs.energy - delta * 0.1);
    this.needs.hygiene = Math.max(0, this.needs.hygiene - delta * 0.08);
    this.needs.stress = Math.min(100, this.needs.stress + delta * 0.05);

    // Consequence: low energy slows the player down
    this.player.energyFactor = this.needs.energy < 20 ? 0.55 : 1;

    // Daily rent: charged once when the clock crosses 08:00
    const t = this.dayNight.time;
    if (this._prevDayTime < 8 && t >= 8) this.chargeRent();
    this._prevDayTime = t;

    // Update HUD periodically (every ~0.5s)
    this.needsTimer = (this.needsTimer || 0) + delta;
    if (this.needsTimer > 0.5) {
      this.hud.updateNeeds(this.needs);
      this.needsTimer = 0;
    }

    // Auto-save every 8s
    this.autoSaveTimer += delta;
    if (this.autoSaveTimer > 8) {
      this.save.save();
      this.autoSaveTimer = 0;
    }
  }

  renderMinimap() {
    const ctx = this.minimapCtx;
    const size = 180;
    const scale = 1.3; // world units to minimap pixels
    const cx = size / 2;
    const cy = size / 2;

    ctx.clearRect(0, 0, size, size);

    // Background
    ctx.fillStyle = '#0a0a12';
    ctx.fillRect(0, 0, size, size);

    const px = this.player.position.x;
    const pz = this.player.position.z;

    // Roads (centered on player)
    ctx.fillStyle = '#1a1a22';
    ctx.fillRect(0, cy - (pz * -scale) - 8 + (pz * 0), 0, 0); // placeholder no-op

    // Draw roads relative to player
    ctx.save();
    ctx.translate(cx, cy);
    // Horizontal road
    ctx.fillStyle = '#22222c';
    ctx.fillRect(-size, (0 - pz) * scale - 8, size * 2, 16);
    ctx.fillRect((0 - px) * scale - 8, -size, 16, size * 2);

    // Buildings & objects
    for (const obj of this.city.minimapObjects) {
      const ox = (obj.x - px) * scale;
      const oz = (obj.z - pz) * scale;
      ctx.fillStyle = obj.color || '#444';
      const w = obj.w * scale;
      const d = obj.d * scale;
      ctx.fillRect(ox - w / 2, oz - d / 2, w, d);
    }

    // Traffic cars
    ctx.fillStyle = '#9aa0aa';
    for (const c of this.traffic.cars) {
      const cx2 = (c.group.position.x - px) * scale;
      const cz2 = (c.group.position.z - pz) * scale;
      ctx.fillRect(cx2 - 1.5, cz2 - 1.5, 3, 3);
    }

    // Online players (real network = green, simulated = cyan)
    if (this.networked) {
      ctx.fillStyle = '#7CFC00';
      for (const r of this.network.remotes.values()) {
        const ox = (r.model.group.position.x - px) * scale;
        const oz = (r.model.group.position.z - pz) * scale;
        ctx.beginPath();
        ctx.arc(ox, oz, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
    } else {
      ctx.fillStyle = '#66ddff';
      for (const op of this.online.players) {
        const ox = (op.pos.x - px) * scale;
        const oz = (op.pos.z - pz) * scale;
        ctx.beginPath();
        ctx.arc(ox, oz, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Player's drivable car
    {
      const vx = (this.vehicle.position.x - px) * scale;
      const vz = (this.vehicle.position.z - pz) * scale;
      ctx.fillStyle = '#ff5555';
      ctx.fillRect(vx - 2, vz - 2, 4, 4);
    }

    // NPC markers (highlight those awaiting a delivery)
    for (const npc of this.npcs) {
      const nx = (npc.position.x - px) * scale;
      const nz = (npc.position.z - pz) * scale;
      const awaiting = this.mission.hasActiveTarget('npc:' + npc.name);
      ctx.fillStyle = awaiting ? '#44ccff' : '#f5a623';
      ctx.beginPath();
      ctx.arc(nx, nz, awaiting ? 4 : 3, 0, Math.PI * 2);
      ctx.fill();
    }

    // Taxi fare target
    if (this.taxi.state !== 'idle' && this.taxi.targetPos) {
      const tx = (this.taxi.targetPos.x - px) * scale;
      const tz = (this.taxi.targetPos.z - pz) * scale;
      ctx.fillStyle = this.taxi.state === 'toPickup' ? '#33ccff' : '#f5c542';
      ctx.beginPath();
      ctx.arc(tx, tz, 4, 0, Math.PI * 2);
      ctx.fill();
    }

    // Delivery zone marker (when a mission targets the depot)
    if (this.mission.hasActiveTarget('depot')) {
      const dx = (this.city.deliveryZone.x - px) * scale;
      const dz = (this.city.deliveryZone.z - pz) * scale;
      ctx.fillStyle = '#44ccff';
      ctx.beginPath();
      ctx.arc(dx, dz, 4, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();

    // Player marker (always center, pointing with yaw)
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(-this.player.group.rotation.y);
    ctx.fillStyle = '#4caf50';
    ctx.beginPath();
    ctx.moveTo(0, -6);
    ctx.lineTo(-4, 4);
    ctx.lineTo(4, 4);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // Circular mask border
    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    ctx.lineWidth = 2;
    ctx.strokeRect(0, 0, size, size);
  }

  start() {
    this.animate();
  }

  animate() {
    requestAnimationFrame(() => this.animate());

    const delta = Math.min(this.clock.getDelta(), 0.1);
    const time = this.clock.elapsedTime;

    this.updatePointerHint();

    // When paused, keep rendering but freeze all world updates
    if (this.paused) {
      this.renderer.render(this.scene, this.camera);
      return;
    }

    if (this.mode === 'drive') {
      const trafficPositions = this.traffic.cars.map((c) => c.group.position);
      this.vehicle.update(delta, this.player.keys, this.city.obstacles, trafficPositions);
      this.player.position.copy(this.vehicle.position);
      this.player.group.position.copy(this.vehicle.position);
      this.updateDriveCamera();
      this.audio.setEngineRpm(Math.abs(this.vehicle.speed) / this.vehicle.maxSpeed);
      this.hud.showSpeed(this.vehicle.kmh);
    } else {
      // On foot: collide with traffic cars and the parked drivable car
      const dyn = this.traffic.cars.map((c) => c.group.position);
      dyn.push(this.vehicle.position);
      this.player.dynamicObstacles = dyn;
      this.player.update(delta, time);
    }

    for (const npc of this.npcs) npc.update(this.player.position, delta, time);
    this.traffic.update(delta);
    this.atmosphere.update(delta, time);
    this.taxi.update(delta, time, this.player.position);
    this.online.update(delta, time);
    const localMoving = this.mode === 'drive'
      ? Math.abs(this.vehicle.speed) > 0.5
      : this.player.isMoving();
    this.network.update(delta, {
      x: this.player.position.x,
      z: this.player.position.z,
      heading: this.mode === 'drive' ? this.vehicle.heading : this.player.group.rotation.y,
      moving: localMoving,
      inCar: this.mode === 'drive',
    });
    if (this.networked) this.updateGlobalCount();
    this.city.update(time);
    this.dayNight.update(delta);
    this.weather.update(delta);

    this.handleInteractions();
    this.updateNeeds(delta);
    this.renderMinimap();

    this.renderer.render(this.scene, this.camera);
  }
}
