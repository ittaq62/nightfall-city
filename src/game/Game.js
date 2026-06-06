import * as THREE from 'three';
import PlayerController from './PlayerController.js';
import CityBuilder from './CityBuilder.js';
import NPC from './NPC.js';
import HUD from './HUD.js';
import InventorySystem from './InventorySystem.js';
import MissionSystem, { MissionState } from './MissionSystem.js';
import ShopSystem from './ShopSystem.js';
import AudioSystem from './AudioSystem.js';
import SaveSystem from './SaveSystem.js';
import DayNightCycle from './DayNightCycle.js';
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

    // NPC Tony - in front of the 24/7 store
    this.tony = new NPC(this.scene, new THREE.Vector3(12, 0, 12), 'Tony');

    // HUD + systems
    this.hud = new HUD();
    this.audio = new AudioSystem();
    this.player.audio = this.audio;
    this.inventory = new InventorySystem();
    this.mission = new MissionSystem(this.playerState, this.inventory, this.hud);
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

    // Don't process world interactions while a dialog or shop is open
    if (this.hud.isDialogOpen() || this.shop.isOpen) {
      this.hud.hideInteractPrompt();
      return;
    }

    const nearTony = this.tony.inRange;
    const distToDelivery = distance2D(playerPos, this.city.deliveryZone);
    const nearDelivery = distToDelivery <= this.city.deliveryRadius;
    const nearShop = distance2D(playerPos, this.city.shopZone) <= this.city.shopRadius;

    // Tony interaction
    if (nearTony && this.mission.state === MissionState.AVAILABLE) {
      this.hud.showInteractPrompt('Appuie sur E pour parler');
      if (ePressed) {
        this.openTonyDialog();
      }
    }
    // Delivery interaction
    else if (nearDelivery && this.mission.state === MissionState.ACTIVE) {
      this.hud.showInteractPrompt('Appuie sur E pour livrer le colis');
      if (ePressed) {
        this.mission.completeMission();
        this.audio.success();
        this.save.save();
        this.hud.addChatMessage('Systeme', 'Colis livre avec succes !', 'tony');
      }
    }
    // Shop interaction (24/7 City Mart)
    else if (nearShop) {
      this.hud.showInteractPrompt('Appuie sur E pour entrer dans le magasin');
      if (ePressed) {
        this.player.inputBlocked = true;
        this.shop.open();
      }
    }
    // Tony after completion
    else if (nearTony && this.mission.state === MissionState.COMPLETED) {
      this.hud.showInteractPrompt('Appuie sur E pour parler');
      if (ePressed) {
        this.hud.showDialog(
          'Tony',
          'Merci pour la livraison ! Reviens me voir, j\'aurai d\'autres missions pour toi.',
          null,
          false
        );
        this.player.inputBlocked = true;
      }
    }
    else {
      this.hud.hideInteractPrompt();
    }
  }

  openTonyDialog() {
    this.player.inputBlocked = true;
    this.hud.showDialog(
      'Tony',
      'Salut ! J\'ai besoin d\'un livreur. Va deposer ce colis au depot central, la-bas au nord. Tu seras paye 150$ et ta reputation montera. Ca te dit ?',
      () => {
        this.mission.acceptMission();
        this.audio.click();
        this.save.save();
        this.hud.showNotification('Mission acceptee : Livrer le colis au depot central');
        this.hud.addChatMessage('Tony', 'Parfait ! Le depot est au nord.', 'tony');
      },
      true
    );
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

    // Tony marker
    const tx = (this.tony.position.x - px) * scale;
    const tz = (this.tony.position.z - pz) * scale;
    ctx.fillStyle = '#f5a623';
    ctx.beginPath();
    ctx.arc(tx, tz, 3, 0, Math.PI * 2);
    ctx.fill();

    // Delivery zone marker (when mission active)
    if (this.mission.state === MissionState.ACTIVE) {
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
    this.tony.update(this.player.position, time);
    this.city.update(time);
    this.dayNight.update(delta);

    this.handleInteractions();
    this.updateNeeds(delta);
    this.renderMinimap();

    this.renderer.render(this.scene, this.camera);
  }
}
