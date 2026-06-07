import './style.css';
import Game from './game/Game.js';
import CharacterCreator from './game/CharacterCreator.js';

const canvas = document.getElementById('game-canvas');
const game = new Game(canvas);
game.start();

// Expose for debugging in the console (handy during prototyping)
window.game = game;

const overlay = document.getElementById('start-overlay');

// Character creator with a live 3D preview
const creator = new CharacterCreator(document.getElementById('cc-canvas'));
creator.onPlay = (appearance) => {
  overlay.classList.add('hidden');
  creator.stop();
  game.audio.init(); // user gesture required to start the Web Audio context
  game.applyAppearance(appearance);
  game.beginSession(appearance.name);
  canvas.requestPointerLock();

  // Show the controls help briefly once the game starts
  const controls = document.getElementById('hud-controls');
  controls.classList.remove('hidden');
  setTimeout(() => controls.classList.add('hidden'), 6000);
};

// Resume audio whenever the player clicks back into the game
canvas.addEventListener('click', () => game.audio.resume());

// Reset the save (and restart)
const newGameBtn = document.getElementById('btn-newgame');
if (newGameBtn) {
  newGameBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    game.resetGame();
  });
}
