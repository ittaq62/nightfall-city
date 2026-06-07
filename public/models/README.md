# Modèles 3D

- **avatar_default.glb** — avatar humain réaliste (Ready Player Me) utilisé comme
  personnage par défaut, tant que le joueur n'a pas créé le sien.
- **anim_idle.glb / anim_walk.glb / anim_run.glb** — animations de la
  [Ready Player Me Animation Library](https://github.com/readyplayerme/animation-library)
  (licence MIT), appliquées à l'avatar réaliste (immobile / marche / course).

## Avatar personnalisé (Ready Player Me)

Le joueur peut créer son **propre avatar réaliste** directement dans le jeu :
sur l'écran de création, le bouton **« Personnaliser mon avatar »** ouvre le
créateur Ready Player Me (intégré en *iframe*). À la validation, le jeu récupère
automatiquement l'URL `.glb` de l'avatar, le charge, l'anime et le mémorise
(localStorage). Aucun lien à coller : tout se fait dans l'interface du jeu.

L'avatar est **auto-mis à l'échelle** (≈1m80) et les **tenues de métier**
(police, ouvrier, médecin…) ajoutent des accessoires ajustés sur les os réels
du squelette (tête / torse), donc ils s'adaptent à n'importe quel avatar.
