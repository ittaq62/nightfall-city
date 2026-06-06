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

### 🌐 Multijoueur (optionnel)

Le jeu fonctionne seul avec `npm run dev` (d'autres « joueurs » sont alors **simulés**
localement). Pour du **vrai multijoueur en réseau**, lance le serveur dans un second
terminal :

```bash
npm run server     # serveur WebSocket sur ws://localhost:8080
npm run dev        # le jeu, dans un autre terminal
```

Ouvre plusieurs onglets / machines (sur le même réseau) : les joueurs se voient,
bougent et tchattent en temps réel. Si le serveur n'est pas lancé, le jeu bascule
automatiquement sur les joueurs simulés.

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
| `E` | Interagir (parler / livrer / magasin / banque / voiture) |
| `Entrée` | Ouvrir le chat / envoyer un message |
| `1` à `5` | Utiliser l'objet du slot correspondant |
| `I` | Ouvrir / fermer l'inventaire détaillé |
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
├── server/
│   └── index.js            # Serveur multijoueur WebSocket (Node)
├── src/
│   ├── main.js             # Point d'entrée : démarre le jeu
│   ├── style.css           # Style du HUD (sombre, moderne)
│   ├── game/
│   │   ├── Game.js             # Scène, caméra, renderer, boucle, minimap
│   │   ├── PlayerController.js  # Déplacement, caméra 3e personne, collisions
│   │   ├── CharacterModel.js   # Humanoïde articulé + animation de marche
│   │   ├── CityBuilder.js      # Construction de la ville (immeubles, rues, néons)
│   │   ├── NPC.js              # PNJ (Tony, Maria, Vince) + proximité
│   │   ├── Vehicle.js          # Voiture conduisible (physique arcade)
│   │   ├── TrafficSystem.js    # Circulation IA + feux de circulation
│   │   ├── OnlinePlayers.js    # Joueurs en ligne simulés (local)
│   │   ├── Network.js          # Client multijoueur WebSocket
│   │   ├── Textures.js         # Textures procédurales (canvas)
│   │   ├── MissionSystem.js    # Missions multiples, réputation, métiers
│   │   ├── InventorySystem.js  # Registre d'objets + slots du HUD
│   │   ├── InventoryUI.js      # Panneau d'inventaire détaillé (I)
│   │   ├── ShopSystem.js       # Magasin 24/7 fonctionnel
│   │   ├── BankSystem.js       # Banque (dépôt / retrait)
│   │   ├── DayNightCycle.js    # Cycle jour/nuit + horloge
│   │   ├── WeatherSystem.js    # Pluie / brouillard dynamiques
│   │   ├── AudioSystem.js      # Sons synthétisés (Web Audio)
│   │   ├── SaveSystem.js       # Sauvegarde localStorage
│   │   ├── HUD.js             # Lien entre l'état du jeu et l'interface
│   │   └── Utils.js           # distance2D, clamp, collisions, text sprites
│   └── assets/
└── README.md
```

---

## ✅ Ce qui fonctionne

- **Personnages 3D articulés** (joueur + PNJ) avec animation de marche, vus de dos,
  caméra orbitale en troisième personne.
- **Déplacement fluide** ZQSD / WASD + course (Shift).
- **Ville de nuit** : rue principale, trottoirs, immeubles, magasin *24/7 City Mart*,
  *Sunset Apartments*, lampadaires, voitures, poubelles, néons.
- **Collisions** simples (Box3) : on ne traverse pas les bâtiments ni les limites de la map.
- **Missions multiples & PNJ** : Tony, Maria et Vince donnent chacun une mission
  (livraison au dépôt, courses à rapporter…). La **réputation** débloque de nouvelles
  missions et fait évoluer ton **métier** (Citoyen → Coursier → Livreur → Livreur Pro).
- **Voiture conduisible** : approche la voiture (cercle bleu), `E` pour monter, conduis
  avec ZQSD (physique arcade : accélération, direction, freinage, collisions),
  compteur de vitesse + son moteur, `E` pour sortir.
- **Circulation IA & feux** : des voitures roulent en continu sur les routes, **s'arrêtent
  aux feux rouges** à l'intersection, et ralentissent si tu leur coupes la route.
- **Multijoueur en réseau** (avec `npm run server`) : les vrais joueurs connectés se voient,
  bougent et tchattent en temps réel (WebSocket). **Repli automatique** sur des joueurs
  simulés si aucun serveur n'est lancé. Chat interactif (touche `Entrée`).
- **Banque & loyer** : entre dans la *Banque de Nightfall* (`E`) pour déposer/retirer
  ton argent ; un **loyer** est prélevé chaque matin (sur le liquide puis l'épargne).
- **Textures procédurales** : bitume, béton, sol et **façades d'immeubles avec fenêtres
  éclairées** générés au canvas (sans fichier image) pour un rendu plus riche.
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
- **Inventaire détaillé** (`I`) : panneau avec icône, nom, description et bouton
  *Utiliser* pour chaque objet, en plus de la barre rapide.
- **Cycle jour/nuit dynamique** : le ciel, le brouillard, la lumière du soleil/lune et
  l'ambiance évoluent en continu ; les lampadaires et néons s'allument à la tombée de la
  nuit. Horloge affichée sous la mini-carte (le jeu démarre à 21:00).
- **Météo dynamique** : alternance clair / brouillard / pluie (particules + son de pluie),
  avec densité de brouillard variable. Indicateur météo sur la mini-carte.
- **Sauvegarde automatique** (localStorage) : argent, réputation, besoins, inventaire,
  missions, position et heure sont conservés. Bouton *Nouvelle partie* pour repartir.
- **Sons synthétisés** (Web Audio, aucun fichier externe) : ambiance nocturne, pas,
  pluie, clics, jingle de mission. Bouton 🔊 pour couper/activer le son.

---

## 🔭 Prochaines améliorations possibles

- Modèles GLTF importés (vrais personnages riggés).
- Virages de l'IA aux intersections.
- Synchroniser les véhicules et l'état du monde en multijoueur.
- Salles / serveurs nommés + persistance côté serveur.

---

*Prototype — version 0.6.0*
