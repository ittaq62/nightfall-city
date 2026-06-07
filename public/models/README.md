# Modèles 3D

- **avatar_rpm.glb** — avatar humain réaliste (Ready Player Me) utilisé pour
  l'option de tenue « réaliste ».
- **anim_idle.glb / anim_walk.glb / anim_run.glb** — animations de la
  [Ready Player Me Animation Library](https://github.com/readyplayerme/animation-library)
  (licence MIT), appliquées à l'avatar réaliste.

Le **personnage de base est entièrement personnalisable** (peau, cheveux, coiffure,
tenues) et construit dans le code (`CharacterModel.js`) — c'est lui qui porte les
tenues achetées et les uniformes de métier.

Pour remplacer le personnage par le tien : dépose un `.glb` riggé ici (ex. avatar
Ready Player Me ou export Mixamo converti en glb) et change le chemin dans
`src/game/PlayerController.js` (`/models/Soldier.glb`).
