# WAS IT THERE?

## Technical Bible — Version 1.0

**Statut :** décisions techniques verrouillées pour le prototype\
**Projet :** `was-it-there`\
**Document associé :** `GAME_DESIGN_ONE_PAGE.md`

------------------------------------------------------------------------

## 1. Objectif technique

Construire un jeu d’observation 3D en vue subjective :

- jouable directement dans un navigateur ;
- compatible ordinateur et mobile ;
- suffisamment léger pour les portails de jeux HTML5 ;
- exportable sous forme de fichiers statiques ;
- développé rapidement par une seule personne avec l’assistance de Codex ;
- maintenable avec un seul cœur de jeu et plusieurs adaptateurs de plateforme.

Le prototype ne contient aucun serveur, aucune base de données et aucun compte utilisateur.

------------------------------------------------------------------------

## 2. Décisions verrouillées

### Moteur et rendu

- **Three.js pur**
- **WebGLRenderer**
- Pas de React Three Fiber
- Pas de Unity
- Pas de Babylon.js
- Pas de moteur physique externe
- Pas de WebGPU pour le MVP

### Application

- **Vite**
- **TypeScript strict**
- HTML et CSS classiques pour l’interface
- Build entièrement statique
- Gestionnaire de paquets : **pnpm**
- Runtime de développement : **Node.js 24 LTS**

### Versions de départ

Au moment de l’initialisation :

- Node.js : branche `24.x`
- Vite : branche `8.x`
- Three.js : version stable disponible, initialement `r185`
- TypeScript : dernière version stable compatible avec Vite
- Les versions exactes sont enregistrées dans `pnpm-lock.yaml`

Les dépendances importantes doivent être installées avec une version exacte, sans mise à jour automatique incontrôlée.

------------------------------------------------------------------------

## 3. Pourquoi Three.js pur

Le gameplay repose sur :

- une caméra FPS ;
- des salles statiques ;
- quelques objets interactifs ;
- des changements de transformations ou de matériaux ;
- une interface 2D superposée ;
- aucune simulation physique complexe.

React n’apporterait pas de bénéfice déterminant au cœur du jeu et ajouterait une couche d’abstraction inutile dans la boucle de rendu.

Three.js pur permet :

- un contrôle direct de la scène ;
- un bundle plus simple ;
- une gestion explicite de la mémoire ;
- une intégration directe des SDK publicitaires ;
- une architecture plus facile à exporter vers plusieurs plateformes.

------------------------------------------------------------------------

## 4. Structure du dépôt

    was-it-there/
    ├── docs/
    │   ├── GAME_DESIGN_ONE_PAGE.md
    │   ├── TECHNICAL_BIBLE.md
    │   └── VERSION_2_BACKLOG.md
    │
    ├── public/
    │   ├── icons/
    │   └── static/
    │
    ├── src/
    │   ├── app/
    │   │   ├── GameApp.ts
    │   │   ├── GameLoop.ts
    │   │   └── GameStateMachine.ts
    │   │
    │   ├── core/
    │   │   ├── events/
    │   │   ├── math/
    │   │   ├── random/
    │   │   ├── time/
    │   │   └── types/
    │   │
    │   ├── rendering/
    │   │   ├── RendererManager.ts
    │   │   ├── CameraManager.ts
    │   │   ├── QualityManager.ts
    │   │   └── SceneTransition.ts
    │   │
    │   ├── world/
    │   │   ├── RoomLoader.ts
    │   │   ├── RoomRuntime.ts
    │   │   ├── RoomRegistry.ts
    │   │   ├── WorldCollision.ts
    │   │   └── assets/
    │   │       ├── AssetManager.ts
    │   │       ├── GlbAssetLoader.ts
    │   │       ├── GlbRoomPipeline.ts
    │   │       ├── RoomStateSnapshot.ts
    │   │       └── SceneNodeIndex.ts
    │   │
    │   ├── player/
    │   │   ├── PlayerController.ts
    │   │   ├── PlayerCollider.ts
    │   │   ├── PlayerLook.ts
    │   │   └── PlayerMovement.ts
    │   │
    │   ├── gameplay/
    │   │   ├── run/
    │   │   ├── rooms/
    │   │   ├── anomalies/
    │   │   ├── interaction/
    │   │   ├── scoring/
    │   │   └── progression/
    │   │
    │   ├── input/
    │   │   ├── InputManager.ts
    │   │   ├── DesktopInput.ts
    │   │   ├── MobileInput.ts
    │   │   └── InputActions.ts
    │   │
    │   ├── audio/
    │   │   ├── AudioManager.ts
    │   │   └── AudioRegistry.ts
    │   │
    │   ├── platform/
    │   │   ├── PlatformAdapter.ts
    │   │   ├── PlatformManager.ts
    │   │   └── adapters/
    │   │       └── StandaloneAdapter.ts
    │   │
    │   ├── content/
    │   │   ├── rooms/
    │   │   ├── difficulty/
    │   │   └── strings/
    │   │
    │   ├── ui/
    │   │   ├── HudController.ts
    │   │   ├── MenuController.ts
    │   │   ├── ResultsController.ts
    │   │   └── MobileControls.ts
    │   │
    │   ├── storage/
    │   │   ├── LocalSave.ts
    │   │   └── SettingsStore.ts
    │   │
    │   ├── assets/
    │   │   ├── models/
    │   │   ├── textures/
    │   │   └── audio/
    │   │
    │   ├── styles/
    │   ├── main.ts
    │   └── vite-env.d.ts
    │
    ├── tests/
    │   ├── unit/
    │   ├── integration/
    │   └── e2e/
    │
    ├── index.html
    ├── package.json
    ├── pnpm-lock.yaml
    ├── tsconfig.json
    ├── vite.config.ts
    └── README.md

Le prototype peut créer cette structure progressivement. Les dossiers inutilisés ne doivent pas contenir de fichiers factices uniquement pour respecter l’arborescence.

------------------------------------------------------------------------

## 5. Architecture générale

Le jeu est organisé autour de cinq systèmes principaux :

    GameApp
      ├── GameStateMachine
      ├── GameLoop
      ├── RoomRuntime
      ├── InputManager
      └── PlatformManager

### `GameApp`

Responsable de :

- l’initialisation générale ;
- la création du renderer ;
- le chargement des services ;
- le lancement du menu ;
- la destruction propre du jeu.

### `GameStateMachine`

Responsable de la progression entre les phases du jeu.

### `GameLoop`

Responsable de :

- la mise à jour du joueur ;
- la mise à jour du gameplay ;
- la résolution des collisions ;
- le rendu ;
- la limitation des deltas anormaux.

### `RoomRuntime`

Responsable de la salle actuellement chargée :

- scène 3D ;
- collisions ;
- objets interactifs ;
- anomalies ;
- lumières ;
- porte de sortie ;
- restauration de l’état initial.

### `PlatformManager`

Responsable de toutes les interactions avec l’environnement d’hébergement.

Le gameplay ne doit jamais accéder directement à CrazyGames, Y8 ou GameDistribution.

------------------------------------------------------------------------

## 6. Machine à états

Le jeu doit utiliser une machine à états explicite.

    type GameState =
      | 'boot'
      | 'loading'
      | 'main-menu'
      | 'room-intro'
      | 'observation'
      | 'blackout'
      | 'search'
      | 'room-complete'
      | 'room-transition'
      | 'paused'
      | 'game-over'
      | 'victory';

### Transitions principales

    boot
      → loading
      → main-menu
      → room-intro
      → observation
      → blackout
      → search

Depuis `search` :

    Toutes les anomalies trouvées
      → room-complete
      → room-transition
      → prochaine salle

Ou :

    Troisième erreur
      → game-over

Après la dernière salle :

    room-complete
      → victory

Les transitions doivent être centralisées. Aucun composant ne doit modifier directement l’état global du jeu.

------------------------------------------------------------------------

## 7. Boucle de jeu

Une seule boucle `requestAnimationFrame` est autorisée.

La logique de déplacement et de collision utilise un pas de simulation fixe.

    Pas fixe : 1 / 60 seconde
    Nombre maximal de sous-étapes : 5
    Delta maximal accepté : 100 ms

Principe :

    accumulator += clampedDelta;

    while (accumulator >= fixedStep) {
      updateFixed(fixedStep);
      accumulator -= fixedStep;
    }

    render();

Cela empêche le joueur de se déplacer plus vite ou plus lentement selon que son écran fonctionne à 60, 144 ou 165 Hz.

Les chronomètres utilisent `performance.now()` et non le nombre d’images rendues.

------------------------------------------------------------------------

## 8. Contrôleur FPS

### Déplacement

Le contrôleur est cinématique.

Il ne possède pas :

- de saut ;
- d’accroupissement ;
- de glissade ;
- de mouvement dans les airs ;
- de système de poids ;
- de véritable corps physique.

Paramètres initiaux :

    Vitesse normale : 2,6 m/s
    Vitesse rapide : 3,8 m/s
    Accélération : progressive mais courte
    Décélération : progressive mais courte
    Hauteur des yeux : environ 1,65 m
    Rayon du joueur : environ 0,30 m

Ces valeurs seront ajustées pendant le prototype.

### Collisions

Les collisions utilisent les outils Three.js :

- `Capsule` pour le joueur ;
- `Octree` pour la géométrie statique de la salle.

Aucun moteur comme Rapier, Cannon ou Ammo n’est ajouté au MVP.

La géométrie visible et la géométrie de collision peuvent être séparées.

Les éléments décoratifs très petits ne doivent pas bloquer le joueur.

### Caméra

- Perspective classique.
- Champ de vision initial : `70`.
- Rotation verticale limitée.
- Aucun roulis.
- Aucun head bob dans le premier prototype.
- Aucun motion blur.
- Sensibilité configurable.
- Option d’inversion verticale prévue dans les réglages.

------------------------------------------------------------------------

## 9. Entrées ordinateur

Le jeu utilise `KeyboardEvent.code` afin de conserver des positions physiques cohérentes entre les claviers AZERTY et QWERTY.

Actions abstraites :

    type InputAction =
      | 'move-forward'
      | 'move-backward'
      | 'move-left'
      | 'move-right'
      | 'move-fast'
      | 'interact'
      | 'pause';

Contrôles :

    ZQSD / WASD : déplacement
    Flèches : déplacement alternatif
    Souris : orientation
    Clic gauche : signaler
    Shift : déplacement rapide
    Échap : pause et libération du pointeur

Le pointeur ne doit être verrouillé qu’après une action explicite du joueur sur le bouton `PLAY`.

------------------------------------------------------------------------

## 10. Entrées mobiles

L’architecture doit prévoir le tactile dès le début, même si le premier greybox est d’abord validé sur ordinateur.

Disposition :

- joystick virtuel dans la moitié gauche ;
- glissement libre dans la moitié droite ;
- bouton `REPORT` accessible au pouce droit ;
- bouton pause dans un coin protégé par les safe areas.

Règles :

- `touch-action: none` sur la zone de jeu ;
- aucun zoom navigateur ;
- aucun texte sélectionnable ;
- prise en compte des encoches et zones arrondies ;
- interface utilisable en paysage ;
- assistance de sélection plus généreuse qu’à la souris.

L’assistance mobile ne doit pas sélectionner automatiquement une anomalie. Elle peut seulement élargir légèrement la zone d’interaction.

------------------------------------------------------------------------

## 11. Format d’une salle

Le mode principal utilise des salles conçues manuellement.

La géométrie des salles n’est pas générée procéduralement.

Ce qui est aléatoire :

- les anomalies sélectionnées ;
- leurs variantes ;
- éventuellement certains petits éléments décoratifs ;
- la seed de la partie.

Chaque salle possède une définition typée.

    interface RoomDefinition {
      id: string;
      displayName: string;
      sceneUrl: string;

      playerSpawn: TransformDefinition;
      exitDoorId: string;

      observationDurationMs: number;
      searchDurationMs: number;

      anomalyCount: {
        min: number;
        max: number;
      };

      anomalyTargets: AnomalyTargetDefinition[];
      lights: RoomLightDefinition[];
    }

Pour le greybox, la salle peut être construite directement en TypeScript.

Pour la version finale, chaque salle utilisera un fichier `.glb` accompagné d’une définition TypeScript.

------------------------------------------------------------------------

## 12. Conventions des scènes 3D

Les éléments importés doivent posséder des noms stables.

Exemples :

    ROOM_Bedroom
    COLLIDER_Room
    SPAWN_Player
    EXIT_Door
    LIGHT_Ceiling
    ANOM_Television
    ANOM_Plant
    ANOM_Picture_01
    DECOR_Books

Préfixes :

| Préfixe     | Fonction                               |
|-------------|----------------------------------------|
| `ROOM_`     | Racine de la salle                     |
| `COLLIDER_` | Géométrie utilisée pour les collisions |
| `SPAWN_`    | Point d’apparition                     |
| `EXIT_`     | Porte ou zone de sortie                |
| `LIGHT_`    | Lumière contrôlable                    |
| `ANOM_`     | Objet compatible avec des anomalies    |
| `DECOR_`    | Décoration non interactive             |

Le gameplay ne doit jamais dépendre d’un identifiant Three.js généré automatiquement.

------------------------------------------------------------------------

## 13. Système d’anomalies

### Principe fondamental

Les anomalies sont **sélectionnées procéduralement**, mais leurs variantes sont **conçues et validées manuellement**.

Le jeu ne doit pas déplacer un objet vers des coordonnées totalement aléatoires.

Exemple correct :

    La télévision possède trois transformations autorisées :
    - position normale ;
    - rotation légère vers la gauche ;
    - rotation légère vers la droite.

Exemple incorrect :

    Déplacer la télévision à une position aléatoire dans la pièce.

Cette règle évite :

- les objets dans les murs ;
- les changements invisibles ;
- les anomalies impossibles ;
- les compositions visuelles incohérentes.

### Types

    type AnomalyKind =
      | 'hide'
      | 'show'
      | 'move'
      | 'rotate'
      | 'scale'
      | 'color'
      | 'material'
      | 'toggle-light'
      | 'toggle-open'
      | 'duplicate';

### Définition d’une cible

    interface AnomalyTargetDefinition {
      id: string;
      nodeName: string;
      interactionNodeNames?: string[];

      allowedKinds: AnomalyKind[];
      weight: number;
      minimumDifficulty: number;

      transformVariants?: TransformVariant[];
      colorVariants?: string[];
      materialVariants?: string[];
      duplicateSpawnPoints?: TransformDefinition[];
    }

### Snapshot initial

Lors du chargement d’une salle, le jeu enregistre pour chaque cible :

- position ;
- rotation ;
- échelle ;
- visibilité ;
- matériaux ;
- couleurs ;
- état ouvert ou fermé ;
- état des lumières associées.

Avant chaque nouvelle partie ou réinitialisation, l’état original est restauré.

Aucune anomalie ne doit laisser une mutation permanente non suivie.

------------------------------------------------------------------------

## 14. Générateur d’anomalies

Chaque partie possède une seed numérique.

    type GameMode = 'story' | 'escape';

    interface RunIdentity {
      seed: number;
      startedAt: number;
      mode: GameMode;
    }

Chaque salle dérive sa propre seed :

    roomSeed = hash(runSeed + roomIndex + roomId)

Le générateur doit être déterministe.

Avec la même seed et la même version du contenu :

- les mêmes anomalies sont choisies ;
- les mêmes variantes sont appliquées ;
- le même ordre est conservé.

Cela permettra plus tard :

- les défis quotidiens ;
- le partage de seeds ;
- la reproduction d’un bug ;
- des parcours comparables.

### Contraintes de sélection

Le générateur doit :

1.  récupérer les objets compatibles avec la difficulté ;
2.  retirer les objets déjà sélectionnés ;
3.  retirer les combinaisons incompatibles ;
4.  choisir les anomalies selon leur poids ;
5.  vérifier que le nombre demandé est atteignable ;
6.  produire une liste finale avant l’extinction des lumières.

Pour le MVP, un même objet ne peut recevoir qu’une seule anomalie par manche.

------------------------------------------------------------------------

## 15. Gestion des erreurs de génération

En développement :

- une configuration invalide provoque une erreur explicite ;
- l’identifiant de la salle et de l’objet est affiché ;
- la seed est indiquée dans la console.

En production :

- le jeu ne doit jamais rester bloqué ;
- une combinaison de secours validée manuellement est utilisée ;
- l’erreur est journalisée localement ;
- la partie continue.

Chaque salle doit posséder au moins une configuration de secours.

------------------------------------------------------------------------

## 16. Signalement d’un objet

La sélection utilise un `Raycaster` depuis le centre de la caméra.

Seuls les objets situés sur la couche d’interaction sont testés.

    Couche 0 : rendu standard
    Couche 1 : interaction
    Couche 2 : debug

Un objet visuel complexe peut disposer d’un volume d’interaction invisible et simplifié.

Lors d’un clic :

1.  le raycast cherche l’objet interactif le plus proche ;
2.  son identifiant logique est récupéré ;
3.  le système d’anomalies vérifie s’il est actif ;
4.  le résultat est envoyé au système de score ;
5.  le feedback visuel et sonore est joué.

Un objet correctement signalé ne peut plus être sélectionné comme anomalie pendant la manche en cours.

------------------------------------------------------------------------

## 17. Feedback visuel

Bonne réponse :

- contour ou surbrillance très courte ;
- petit symbole de validation ;
- son positif ;
- réduction du compteur restant.

Mauvaise réponse :

- flash léger du réticule ;
- vibration d’interface courte ;
- son sec ;
- affichage de la pénalité.

Les effets ne doivent pas cacher la pièce pendant plusieurs secondes.

Aucun post-processing lourd n’est requis dans le prototype.

------------------------------------------------------------------------

## 18. Chronométrage et score

Le chronomètre du parcours démarre lorsque le joueur obtient le contrôle dans la première salle.

Il comprend :

- phase d’observation ;
- extinction des lumières ;
- recherche ;
- ouverture des portes ;
- transition entre les salles.

Il exclut :

- chargement initial ;
- menu principal ;
- pause manuelle ;
- publicité ;
- perte de focus imposée par la plateforme.

Format interne :

    interface RunTiming {
      activeTimeMs: number;
      penaltyTimeMs: number;
      finalTimeMs: number;
    }

Calcul :

    finalTimeMs = activeTimeMs + penaltyTimeMs

Pénalités initiales :

    Mauvais objet : +5 000 ms
    Temps expiré : +15 000 ms
    Indice futur : +10 000 ms

Toutes les valeurs sont stockées en millisecondes entières.

------------------------------------------------------------------------

## 19. Sauvegarde locale

Clé :

    was-it-there.save.v1

Contenu :

    interface LocalSaveV1 {
      version: 1;

      settings: {
        masterVolume: number;
        musicVolume: number;
        effectsVolume: number;
        mouseSensitivity: number;
        invertY: boolean;
        quality: 'low' | 'medium' | 'high';
      };

      records: {
        bestEscapeTimeMs: number | null;
        bestPerfectTimeMs: number | null;
      };

      statistics: {
        runsStarted: number;
        runsCompleted: number;
        roomsCompleted: number;
        correctReports: number;
        incorrectReports: number;
      };
    }

La lecture doit résister aux données absentes ou corrompues.

Une migration doit être prévue lorsque la version du format change.

Aucune information personnelle n’est enregistrée dans le MVP.

------------------------------------------------------------------------

## 20. Rendu et qualité graphique

### Renderer

- `WebGLRenderer`
- anti-aliasing activé uniquement si l’appareil le supporte correctement ;
- color space correctement configuré ;
- ombres limitées ;
- redimensionnement responsive ;
- contexte WebGL perdu géré proprement.

### Résolution

Plafonds initiaux :

    Desktop : devicePixelRatio maximal de 1,5
    Mobile : devicePixelRatio maximal de 1,25

Les valeurs peuvent être réduites en qualité basse.

### Ombres

Pour le MVP :

- une seule lumière principale avec ombres ;
- carte d’ombre maximale de `1024 × 1024` ;
- les petits objets ne projettent pas forcément d’ombre ;
- les éclairages décoratifs peuvent être simulés avec des matériaux emissifs.

### Effets interdits dans le prototype

- SSAO ;
- ray tracing ;
- volumetric fog complexe ;
- depth of field ;
- motion blur ;
- reflections temps réel généralisées ;
- plusieurs dizaines de lumières dynamiques.

------------------------------------------------------------------------

## 21. Budgets de performance

Objectifs internes :

| Mesure                   |            Cible |
|--------------------------|-----------------:|
| Téléchargement initial   |   moins de 20 Mo |
| Bundle total final       |  moins de 150 Mo |
| Nombre total de fichiers |     moins de 500 |
| Première salle           |    moins de 8 Mo |
| Images d’interface       |    moins de 2 Mo |
| Audio initial            |    moins de 3 Mo |
| FPS ordinateur moyen     |               60 |
| FPS mobile acceptable    |       30 minimum |
| Draw calls par salle     |     moins de 150 |
| Triangles visibles       | moins de 250 000 |
| Textures standards       |  1024 px maximum |
| Textures exceptionnelles |  2048 px maximum |

Ces budgets sont des plafonds et non des objectifs à atteindre.

Moins le jeu utilise de ressources, mieux c’est.

------------------------------------------------------------------------

## 22. Chargement des assets

Le chargement est progressif.

Au démarrage :

- interface ;
- sons indispensables ;
- première salle ;
- joueur ;
- éléments nécessaires au menu.

Après le début de la partie :

- préchargement de la salle suivante ;
- chargement différé des salles éloignées ;
- libération de la salle précédente lorsqu’elle n’est plus utile.

Séquence :

    Chargement salle N
    → gameplay salle N
    → préchargement salle N+1
    → transition
    → destruction salle N
    → activation salle N+1

Le jeu ne doit pas charger les dix salles avant de devenir jouable.

------------------------------------------------------------------------

## 23. Formats d’assets

### Modèles

Format principal :

    .glb

Règles :

- transformations appliquées avant export ;
- pivots correctement placés ;
- échelles cohérentes ;
- noms stables ;
- géométrie de collision simplifiée ;
- matériaux partagés lorsque possible.

### Textures

Formats privilégiés :

- WebP pour les textures classiques ;
- PNG uniquement lorsque la transparence ou la qualité l’exige ;
- pas d’images non compressées inutilement.

### Audio

Formats :

- MP3 pour les musiques et ambiances ;
- MP3 ou OGG pour les effets courts selon les tests de compatibilité.

Les fichiers sources lourds ne doivent pas être placés dans le build final.

------------------------------------------------------------------------

## 24. Gestion mémoire

Lorsqu’une salle est détruite :

- ses géométries inutilisées sont disposées ;
- ses matériaux inutilisés sont disposés ;
- ses textures inutilisées sont disposées ;
- ses écouteurs d’événements sont retirés ;
- ses timers sont annulés ;
- ses références sont supprimées.

Les assets partagés passent par `AssetManager` et utilisent un compteur de références.

Aucun chargement de salle ne doit créer une deuxième boucle de rendu.

------------------------------------------------------------------------

## 25. Audio

Le projet utilise la Web Audio API derrière un `AudioManager`.

Catégories :

    master
    music
    ambience
    effects
    interface

Fonctions minimales :

    interface AudioManager {
      initialize(): Promise<void>;
      unlock(): Promise<void>;
      play(id: string): void;
      stop(id: string): void;
      setCategoryVolume(category: string, volume: number): void;
      setMuted(muted: boolean): void;
    }

L’audio n’est activé qu’après une interaction utilisateur.

Le jeu doit reprendre correctement l’audio après :

- un changement d’onglet ;
- une interruption mobile ;
- une publicité ;
- une mise en pause.

------------------------------------------------------------------------

## 26. Interface

L’interface est réalisée en HTML et CSS au-dessus du canvas.

Avantages :

- texte plus lisible ;
- responsive plus simple ;
- meilleure accessibilité ;
- aucune texture 3D pour le HUD ;
- intégration mobile facilitée.

Structure :

    <div id="app">
      <canvas id="game-canvas"></canvas>
      <div id="hud-layer"></div>
      <div id="menu-layer"></div>
      <div id="modal-layer"></div>
    </div>

L’interface ne doit pas utiliser de framework pour le MVP.

Chaque contrôleur d’interface reçoit des données simples et ne contient aucune règle de gameplay.

------------------------------------------------------------------------

## 27. Textes et langues

La langue par défaut du jeu est l’anglais.

Tous les textes doivent être centralisés.

    export const en = {
      play: 'PLAY',
      resume: 'RESUME',
      anomaliesRemaining: 'CHANGES LEFT',
      roomComplete: 'ROOM CLEARED',
      gameOver: 'GAME OVER',
      victory: 'YOU GOT OUT',
    };

Aucun texte important ne doit être écrit directement dans un composant.

Une traduction française pourra être ajoutée sans modifier le gameplay, mais elle ne doit pas ralentir le prototype.

------------------------------------------------------------------------

## 28. Adaptateurs de plateforme

Interface de base :

    interface PlatformAdapter {
      readonly id: string;

      initialize(): Promise<void>;

      loadingStart(): void;
      loadingStop(): void;

      gameplayStart(): void;
      gameplayStop(): void;

      requestInterstitial(): Promise<void>;
      requestRewardedAd(): Promise<boolean>;

      submitEscapeTime(timeMs: number): Promise<void>;

      getLocale(): string;
      isMobile(): boolean;

      setAudioMuted(muted: boolean): void;
    }

Premier adaptateur :

    StandaloneAdapter

Adaptateurs futurs :

    CrazyGamesAdapter
    Y8Adapter
    GameDistributionAdapter

Le fonctionnement du jeu ne doit pas dépendre de la réussite d’un SDK.

En cas d’échec d’initialisation d’une plateforme, le jeu doit pouvoir continuer avec des fonctionnalités réduites.

------------------------------------------------------------------------

## 29. Builds

Variable principale :

    VITE_PLATFORM

Valeurs futures :

    standalone
    crazygames
    y8
    gamedistribution

Commandes prévues :

    {
      "scripts": {
        "dev": "vite",
        "build": "vite build",
        "build:standalone": "vite build --mode standalone",
        "build:crazygames": "vite build --mode crazygames",
        "build:y8": "vite build --mode y8",
        "build:gamedistribution": "vite build --mode gamedistribution",
        "preview": "vite preview",
        "typecheck": "tsc --noEmit",
        "lint": "eslint .",
        "test": "vitest run"
      }
    }

Le `base` Vite doit être configuré pour générer des chemins relatifs :

    export default defineConfig({
      base: './',
    });

Aucun asset du build ne doit dépendre du domaine racine.

------------------------------------------------------------------------

## 30. CrazyGames

L’intégration CrazyGames ne fait pas partie du premier greybox.

L’architecture doit néanmoins permettre plus tard :

- initialisation du SDK ;
- événements de chargement ;
- événements de début et fin de gameplay ;
- publicités interstitielles ;
- publicités récompensées ;
- mute automatique pendant les publicités ;
- score et classement ;
- informations sur l’appareil ;
- sauvegarde utilisateur éventuelle.

Les publicités ne peuvent apparaître que :

- après un Game Over ;
- après une victoire ;
- éventuellement entre certaines salles ;
- jamais pendant l’observation ;
- jamais pendant la recherche ;
- jamais pendant l’extinction des lumières.

La version CrazyGames ne doit pas afficher son propre bouton plein écran.

------------------------------------------------------------------------

## 31. Classement futur

Le classement mondial n’est pas inclus dans le prototype.

L’interface technique doit néanmoins accepter :

    interface RunResult {
      seed: number;
      finalTimeMs: number;
      activeTimeMs: number;
      penaltyTimeMs: number;
      errors: number;
      perfect: boolean;
      completedRooms: number;
      gameVersion: string;
      contentVersion: string;
    }

Dans un premier temps, les records seront enregistrés localement.

Lorsque le jeu sera accepté sur une plateforme :

- une soumission client pourra suffire pour tester le classement ;
- une validation serveur ne sera ajoutée que si la triche devient un problème réel ;
- le backend ne devra jamais être nécessaire pour jouer.

------------------------------------------------------------------------

## 32. Tests

### Tests unitaires

Obligatoires pour :

- générateur déterministe ;
- sélection des anomalies ;
- incompatibilités ;
- progression de difficulté ;
- calcul du score ;
- pénalités ;
- machine à états ;
- migrations de sauvegarde.

### Tests d’intégration

Obligatoires pour :

- chargement d’une salle ;
- restauration de son état initial ;
- application puis annulation d’une anomalie ;
- détection d’un objet signalé ;
- transition entre deux salles.

### Tests manuels

Matrice minimale :

    Chrome Windows
    Edge Windows
    Chrome Android
    Safari iPhone
    Iframe 16:9
    Plein écran
    Clavier AZERTY
    Clavier QWERTY
    Écran 60 Hz
    Écran 144 Hz ou plus

### Validation du contenu

Chaque salle doit vérifier :

- identifiants uniques ;
- nœuds existants ;
- point d’apparition défini ;
- porte de sortie définie ;
- nombre suffisant de candidats ;
- variantes valides ;
- aucune anomalie sans cible ;
- configuration de secours disponible.

------------------------------------------------------------------------

## 33. Mode debug

Le mode debug est activé uniquement en développement.

Fonctions prévues :

- affichage des collisions ;
- affichage du FPS ;
- affichage du nombre de triangles ;
- affichage des draw calls ;
- affichage des objets interactifs ;
- affichage de l’anomalie active ;
- sélection manuelle d’une seed ;
- passage immédiat à la phase suivante ;
- rechargement de la salle ;
- application forcée d’un type d’anomalie.

Le mode debug ne doit pas être inclus ou accessible dans le build public final.

------------------------------------------------------------------------

## 34. Journalisation

Le jeu utilise un logger léger.

Niveaux :

    debug
    info
    warn
    error

Informations importantes :

- version du jeu ;
- plateforme ;
- seed ;
- salle ;
- état actuel ;
- anomalies sélectionnées ;
- erreurs de chargement.

Aucune donnée personnelle ne doit être journalisée.

Les `console.log` temporaires doivent être supprimés avant chaque build public.

------------------------------------------------------------------------

## 35. Standards de code

### TypeScript

- mode strict ;
- aucun `any` sans justification ;
- types explicites aux frontières des systèmes ;
- unions discriminées pour les états ;
- fonctions courtes ;
- dépendances injectées dans les services importants.

### Organisation

- une classe ou responsabilité principale par fichier ;
- aucun fichier central de plusieurs milliers de lignes ;
- aucun singleton global incontrôlé ;
- aucune logique de gameplay dans l’interface ;
- aucune logique de plateforme dans le gameplay ;
- aucune référence directe à un objet 3D depuis la sauvegarde.

### Commentaires

Les commentaires doivent expliquer :

- pourquoi une décision est prise ;
- les contraintes inhabituelles ;
- les comportements non évidents.

Ils ne doivent pas simplement répéter le code.

------------------------------------------------------------------------

## 36. Sécurité et triche

Le MVP est entièrement client.

Il est donc impossible d’empêcher totalement :

- la modification du chronomètre ;
- l’inspection des anomalies ;
- la modification de la sauvegarde ;
- l’appel manuel des fonctions de score.

Cette limite est acceptée pour la première version.

Le projet ne doit pas construire un système anti-triche complexe avant d’avoir :

- des joueurs ;
- un classement actif ;
- un problème de triche mesurable.

------------------------------------------------------------------------

## 37. Fonctionnalités explicitement exclues

Ne pas ajouter au prototype :

- Next.js ;
- React ;
- React Three Fiber ;
- serveur Node.js ;
- Supabase ;
- Firebase ;
- comptes utilisateurs ;
- synchronisation cloud ;
- moteur physique ;
- ECS complet ;
- multijoueur ;
- PWA ;
- service worker ;
- installation mobile ;
- génération 3D procédurale des salles ;
- intelligence artificielle ;
- éditeur de niveau ;
- shaders complexes ;
- achats intégrés ;
- publicités réelles.

------------------------------------------------------------------------

## 38. Premier prototype technique

Le premier greybox doit uniquement contenir :

1.  écran de lancement ;
2.  bouton `PLAY` ;
3.  canvas Three.js ;
4.  petite chambre en formes simples ;
5.  déplacement FPS ;
6.  collisions ;
7.  réticule ;
8.  cinq à dix objets observables ;
9.  phase d’observation ;
10. extinction des lumières ;
11. une anomalie appliquée ;
12. signalement par raycast ;
13. bonne et mauvaise réponse ;
14. chronomètre ;
15. trois erreurs maximum ;
16. porte de sortie ;
17. seconde salle factice ou écran de fin.

Anomalies du premier greybox :

- disparition ;
- rotation ;
- changement de couleur.

Aucun modèle 3D externe n’est nécessaire à cette étape.

------------------------------------------------------------------------

## 39. Critères de validation technique

Le prototype est validé lorsque :

- `pnpm install` fonctionne sans modification manuelle ;
- `pnpm dev` démarre le jeu ;
- `pnpm build` génère un dossier statique fonctionnel ;
- le build fonctionne depuis un sous-dossier ;
- aucun chemin absolu n’est requis ;
- les mouvements sont identiques à différents taux de rafraîchissement ;
- le joueur ne traverse pas les murs ;
- la souris se verrouille et se libère proprement ;
- les anomalies sont reproductibles avec une seed ;
- une salle peut être restaurée à son état initial ;
- le jeu ne produit aucune erreur console pendant une partie normale ;
- le prototype reste fluide sur un ordinateur moyen ;
- le système de plateforme fonctionne avec `StandaloneAdapter`.

------------------------------------------------------------------------

## 40. Règle finale

Toute nouvelle décision technique doit répondre à cette question :

> Est-ce nécessaire pour rendre le prototype jouable, testable ou publiable ?

Si la réponse est non, elle est ajoutée dans `VERSION_2_BACKLOG.md` et n’est pas développée pendant le MVP.
