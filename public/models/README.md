# Modèles 3D

- **avatar_male.glb** — avatar humain réaliste (Ready Player Me, corps masculin de base).
- **anim_idle.glb / anim_walk.glb / anim_run.glb** — animations de la
  [Ready Player Me Animation Library](https://github.com/readyplayerme/animation-library)
  (licence MIT), appliquées à l'avatar.
- **Soldier.glb** — ancien personnage (exemples Three.js, CC0), conservé en secours.

Pour utiliser TON avatar : crée-le sur readyplayer.me, récupère le lien `.glb`,
et renseigne-le dans le jeu (les animations ci-dessus s'y appliquent).

Pour remplacer le personnage par le tien : dépose un `.glb` riggé ici (ex. avatar
Ready Player Me ou export Mixamo converti en glb) et change le chemin dans
`src/game/PlayerController.js` (`/models/Soldier.glb`).
