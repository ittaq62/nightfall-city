import * as THREE from 'three';
import PlayerController from './PlayerController.js';
import CityBuilder from './CityBuilder.js';
import NPC from './NPC.js';
import HUD from './HUD.js';
import InventorySystem from './InventorySystem.js';
import MissionSystem from './MissionSystem.js';
import ShopSystem from './ShopSystem.js';
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
      reputation: 12,
      job: 'Citoyen',
    };

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
    this.renderer.toneMappingExposure = 1.1;
  }

  initScene() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0c0c16);
    this.scene.fog = new THREE.FogExp2(0x0c0c16, 0.009);

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

    this.mission = new MissionSystem(this.playerState, this.inventory, this.hud, this.audio);
    this.shop = new ShopSystem(this.playerState, this.inventory, this.hud, this.audio);
    this.shop.onClose = () => { this.player.inputBlocked = false; };

    // Day / night cycle
    this.dayNight = new DayNightCycle({
      scene: this.scene,
      sun: this.sun,
      ambient: this.ambient,
      hemi: this.hemi,
      nightLights: this.city.nightLights,
      hud: this.hud,
    });

    // Weather (rain / fog) - baseFog matches the FogExp2 density set in initScene
    this.weather = new WeatherSystem({
      scene: this.scene,
      player: this.player,
      audio: this.audio,
      hud: this.hud,
      baseFog: 0.009,
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

    document.addEventListener('keydown', (e) => {
      // Escape releases pointer
      if (e.code === 'Escape') {
        document.exitPointerLock();
      }
      // Toggle controls help
      if (e.code === 'KeyH') {
        document.getElementById('hud-controls').classList.toggle('hidden');
      }
      // Toggle minimap
      if (e.code === 'KeyM') {
        document.getElementById('hud-minimap').classList.toggle('hidden');
      }
      // Use inventory item with number keys 1-5
      if (e.code.startsWith('Digit') && !e.repeat) {
        const n = parseInt(e.code.slice(5), 10);
        if (n >= 1 && n <= 5) this.useSlot(n - 1);
      }
    });

    // Mute / unmute button
    const muteBtn = document.getElementById('btn-mute');
    if (muteBtn) {
      muteBtn.onclick = () => {
        const on = this.audio.toggle();
        muteBtn.textContent = on ? '🔊' : '🔇';
      };
    }
  }

  useSlot(index) {
    if (this.hud.isDialogOpen() || this.shop.isOpen) return;
    if (this.inventoryOpen) return;
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

  resetGame() {
    // Disable saving so the beforeunload handler can't re-write the cleared save
    this.savingEnabled = false;
    this.save.clear();
    location.reload();
  }

  handleInteractions() {
    const playerPos = this.player.position;
    const eDown = this.player.keys['KeyE'];
    const ePressed = eDown && !this.eKeyWasDown;
    this.eKeyWasDown = eDown;

    // Don't process world interactions while a dialog, shop or inventory is open
    if (this.hud.isDialogOpen() || this.shop.isOpen || this.inventoryOpen) {
      this.hud.hideInteractPrompt();
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

  updateNeeds(delta) {
    // Needs slowly decay over time
    this.needs.hunger = Math.max(0, this.needs.hunger - delta * 0.15);
    this.needs.energy = Math.max(0, this.needs.energy - delta * 0.1);
    this.needs.hygiene = Math.max(0, this.needs.hygiene - delta * 0.08);
    this.needs.stress = Math.min(100, this.needs.stress + delta * 0.05);

    // Consequence: low energy slows the player down
    this.player.energyFactor = this.needs.energy < 20 ? 0.55 : 1;

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

    this.player.update(delta, time);
    for (const npc of this.npcs) npc.update(this.player.position, delta, time);
    this.city.update(time);
    this.dayNight.update(delta);
    this.weather.update(delta);

    this.handleInteractions();
    this.updateNeeds(delta);
    this.renderMinimap();

    this.renderer.render(this.scene, this.camera);
  }
}
