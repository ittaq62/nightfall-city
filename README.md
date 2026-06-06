# 🌃 Nightfall City

Prototype de jeu navigateur **3D open-world RP** dans une ville sombre de nuit.
Personnage à la troisième personne, ambiance GTA RP / DarkRP, mécaniques de vie inspirées des Sims.

Construit avec **Vite + Three.js**, sans framework, sans backend. Tout tourne en local dans le navigateur.

---

## 🚀 Lancer le jeu

```bash
npm install
npm run dev
```

Puis ouvre l'URL affichée (par défaut `http://localhost:5173`).
**Clique dans la fenêtre** pour capturer la souris et commencer à jouer.

Pour générer une version de production :

```bash
npm run build
npm run preview
```

---

## 🎮 Contrôles

| Touche | Action |
|--------|--------|
| `Z` / `W` | Avancer |
| `S` | Reculer |
| `Q` / `A` | Aller à gauche |
| `D` | Aller à droite |
| `Shift` | Courir |
| Souris | Tourner la caméra |
| `E` | Interagir (parler / livrer / entrer dans le magasin) |
| `1` à `5` | Utiliser l'objet du slot correspondant |
| `M` | Afficher / cacher la mini-carte |
| `H` | Afficher / cacher l'aide |
| `Échap` | Libérer la souris |

> 🔊 Bouton son en haut à droite · « Nouvelle partie » sur l'écran d'accueil pour repartir de zéro.

---

## 🗺️ Arborescence

```
nightfall-city/
├── index.html              # Structure HTML + tout le HUD (overlay)
├── package.json
├── src/
│   ├── main.js             # Point d'entrée : démarre le jeu
│   ├── style.css           # Style du HUD (sombre, moderne)
│   ├── game/
│   │   ├── Game.js             # Scène, caméra, renderer, boucle, minimap
│   │   ├── PlayerController.js  # Déplacement, caméra 3e personne, collisions
│   │   ├── CityBuilder.js      # Construction de la ville (immeubles, rues, néons)
│   │   ├── NPC.js              # PNJ Tony + détection de proximité
│   │   ├── MissionSystem.js    # États de la mission + récompenses
│   │   ├── InventorySystem.js  # Objets + slots du HUD
│   │   ├── HUD.js             # Lien entre l'état du jeu et l'interface
│   │   └── Utils.js           # distance2D, clamp, collisions, text sprites
│   └── assets/
└── README.md
```

---

## ✅ Ce qui fonctionne (V1)

- **Personnage 3D contrôlable** vu de dos, caméra orbitale derrière lui.
- **Déplacement fluide** ZQSD / WASD + course (Shift).
- **Ville de nuit** : rue principale, trottoirs, immeubles, magasin *24/7 City Mart*,
  *Sunset Apartments*, lampadaires, voitures, poubelles, néons.
- **Collisions** simples (Box3) : on ne traverse pas les bâtiments ni les limites de la map.
- **PNJ Tony** : approche → label + prompt « Appuie sur E pour parler ».
- **Mission complète** : parler à Tony → recevoir le colis → le livrer au dépôt central
  → **+150 $ / +10 réputation** + notification.
- **Boucle de vie (type Sims)** :
  - **Magasin 24/7 fonctionnel** : entre dans le *24/7 City Mart* (`E`), achète
    burger, sandwich, eau, café, savon avec ton argent.
  - **Objets consommables** : utilise un objet (`1`-`5`) pour remonter tes besoins
    (le burger remplit la faim, le café redonne de l'énergie, etc.).
  - **Conséquences** : si l'énergie tombe trop bas, le personnage ralentit ; les
    barres de besoins critiques clignotent en rouge.
- **HUD complet** : profil (nom, argent, réputation, métier), barres de besoins
  (faim, énergie, hygiène, stress) qui baissent avec le temps, mission active,
  minimap stylisée (basculable avec `M`), inventaire rapide (5 slots), chat RP factice.
- **Sauvegarde automatique** (localStorage) : argent, réputation, besoins, inventaire,
  mission et position sont conservés au rechargement. Bouton *Nouvelle partie* pour repartir.
- **Sons synthétisés** (Web Audio, aucun fichier externe) : ambiance nocturne, pas,
  clics d'interface, jingle de mission. Bouton 🔊 pour couper/activer le son.

---

## 🔭 Prochaines améliorations possibles

- Plusieurs PNJ et missions enchaînées.
- Modèles 3D (GLTF) à la place des capsules.
- Panneau d'inventaire détaillé (touche `I`).
- Cycle jour/nuit.
- Multijoueur léger (WebSocket) pour le RP.

---

*Prototype — version 0.1.0*
