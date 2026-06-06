import './style.css';
import Game from './game/Game.js';

const canvas = document.getElementById('game-canvas');
const game = new Game(canvas);
game.start();

// Expose for debugging in the console (handy during prototyping)
window.game = game;

// Start overlay -> click to capture pointer and begin
const overlay = document.getElementById('start-overlay');
overlay.addEventListener('click', () => {
  overlay.classList.add('hidden');
  canvas.requestPointerLock();
});

// Show controls help briefly on start
const controls = document.getElementById('hud-controls');
controls.classList.remove('hidden');
setTimeout(() => controls.classList.add('hidden'), 6000);
