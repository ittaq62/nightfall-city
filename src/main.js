import './style.css';
import Game from './game/Game.js';

const canvas = document.getElementById('game-canvas');
const game = new Game(canvas);
game.start();

// Expose for debugging in the console (handy during prototyping)
window.game = game;

// Start overlay -> click to capture pointer, start audio, and begin
const overlay = document.getElementById('start-overlay');
overlay.addEventListener('click', () => {
  overlay.classList.add('hidden');
  game.audio.init(); // user gesture required to start the Web Audio context
  canvas.requestPointerLock();
});

// Make sure audio resumes whenever the player clicks back into the game
canvas.addEventListener('click', () => game.audio.resume());

// "New game" button on the start overlay wipes the save and restarts
const newGameBtn = document.getElementById('btn-newgame');
newGameBtn.addEventListener('click', (e) => {
  e.stopPropagation(); // don't trigger the overlay's "click to play"
  game.resetGame();
});

// Show controls help briefly on start
const controls = document.getElementById('hud-controls');
controls.classList.remove('hidden');
setTimeout(() => controls.classList.add('hidden'), 6000);
