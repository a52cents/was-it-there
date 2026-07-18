# WAS IT THERE?

## Development Roadmap — Version 1.0

**Statut :** roadmap officielle du prototype jusqu’à la publication\
**Projet :** `was-it-there`

**Documents associés :**

- `GAME_DESIGN_ONE_PAGE.md`
- `TECHNICAL_BIBLE.md`
- `ART_DIRECTION.md`
- `ASSET_LIST.md`

------------------------------------------------------------------------

# 1. Objectif général

Construire et publier une première version complète de **Was It There?** en conservant un périmètre réaliste.

La priorité est :

    Prototype jouable
    → Validation du gameplay
    → Première salle finale
    → Parcours complet
    → Optimisation
    → Publication

Le projet ne doit pas chercher à devenir immédiatement :

- un jeu narratif ;
- un jeu d’horreur complexe ;
- un jeu multijoueur ;
- un jeu avec comptes utilisateurs ;
- une plateforme communautaire ;
- un jeu Steam.

Le premier objectif commercial est une version navigateur suffisamment propre pour être soumise à CrazyGames.

------------------------------------------------------------------------

# 2. Principes de développement

## 2.1 Une seule étape à la fois

Chaque phase doit être validée avant de commencer la suivante.

Une phase est validée uniquement lorsque :

- les fonctionnalités demandées sont terminées ;
- le projet compile ;
- le build fonctionne ;
- les critères de validation sont remplis ;
- aucun bug bloquant n’est connu ;
- le résultat a été testé manuellement.

## 2.2 Petites interventions Codex

Codex ne doit pas recevoir un prompt demandant de construire tout le jeu en une seule fois.

Chaque intervention doit avoir :

- un objectif précis ;
- une liste de fichiers concernés ;
- des limites claires ;
- des critères de réussite ;
- des commandes de validation ;
- l’interdiction d’ajouter des fonctionnalités non demandées.

## 2.3 Aucun embellissement prématuré

Avant validation du greybox, ne pas ajouter :

- modèles 3D externes ;
- textures finales ;
- logo définitif ;
- sons payants ;
- post-processing ;
- animations décoratives ;
- menus complexes ;
- classement mondial ;
- SDK publicitaire.

## 2.4 Toujours conserver un build fonctionnel

À la fin de chaque étape :

    pnpm typecheck
    pnpm test
    pnpm build

Le jeu doit rester lançable avec :

    pnpm dev

Aucune phase ne doit laisser le dépôt dans un état cassé.

------------------------------------------------------------------------

# 3. Organisation générale

La roadmap est divisée en neuf phases.

| Phase | Objectif                        |
|-------|---------------------------------|
| 0     | Préproduction                   |
| 1     | Initialisation technique        |
| 2     | Contrôleur FPS et salle greybox |
| 3     | Boucle d’anomalie jouable       |
| 4     | Validation du prototype         |
| 5     | Première salle finale           |
| 6     | Parcours complet de dix salles  |
| 7     | Finitions et optimisation       |
| 8     | Publication multi-plateforme    |

------------------------------------------------------------------------

# PHASE 0 — PRÉPRODUCTION

## 4. Objectif

Définir le projet avant d’écrire le gameplay.

## 4.1 Documents requis

- `GAME_DESIGN_ONE_PAGE.md`
- `TECHNICAL_BIBLE.md`
- `ART_DIRECTION.md`
- `ASSET_LIST.md`
- `DEVELOPMENT_ROADMAP.md`
- `VERSION_2_BACKLOG.md`
- `ASSET_LICENSES.md`

## 4.2 Statut actuel

Déjà terminés :

- concept ;
- boucle de gameplay ;
- progression des salles ;
- architecture technique ;
- direction artistique ;
- besoins en assets ;
- nom du jeu.

## 4.3 Tâches restantes

Créer deux fichiers simples.

### `VERSION_2_BACKLOG.md`

Ce fichier stocke toutes les idées hors MVP.

Exemples :

- mode Endless ;
- défi quotidien ;
- classement mondial ;
- éditeur de salles ;
- nouvelles maisons ;
- nouveaux thèmes ;
- achievements ;
- partage de seed ;
- statistiques avancées ;
- langues supplémentaires.

### `ASSET_LICENSES.md`

Créer le registre vide prévu dans `ASSET_LIST.md`.

## 4.4 Critère de validation

La préproduction est validée lorsque les décisions essentielles ne nécessitent plus d’improvisation pendant le développement.

------------------------------------------------------------------------

# PHASE 1 — INITIALISATION TECHNIQUE

## 5. Objectif

Créer une base Vite, TypeScript et Three.js propre, sans gameplay complexe.

## 5.1 Tâches

### 5.1.1 Initialiser le dépôt

Configurer :

- Node.js 24 ;
- pnpm ;
- Vite ;
- TypeScript strict ;
- Three.js ;
- ESLint ;
- Vitest ;
- chemins relatifs.

### 5.1.2 Créer la structure minimale

Créer uniquement les dossiers nécessaires au démarrage :

    src/
    ├── app/
    ├── core/
    ├── rendering/
    ├── platform/
    ├── styles/
    ├── ui/
    └── main.ts

Les autres dossiers seront ajoutés lorsque leur première fonctionnalité sera développée.

### 5.1.3 Créer les services de base

Implémenter :

- `GameApp`
- `GameLoop`
- `RendererManager`
- `CameraManager`
- `PlatformAdapter`
- `StandaloneAdapter`
- `PlatformManager`

### 5.1.4 Créer un écran de démarrage

Contenu :

- titre temporaire `WAS IT THERE?`
- bouton `PLAY`
- canvas Three.js
- écran de chargement minimal.

### 5.1.5 Ajouter la configuration de build

Le projet doit fonctionner :

- en développement ;
- en production ;
- depuis un sous-dossier ;
- dans une iframe simple.

## 5.2 Résultat attendu

Après clic sur `PLAY` :

- le canvas s’affiche ;
- une scène vide est rendue ;
- la souris peut être verrouillée ;
- `Échap` libère la souris ;
- le jeu peut être relancé.

## 5.3 Critères de validation

- aucune erreur TypeScript ;
- aucune erreur console ;
- build statique fonctionnel ;
- chemins relatifs ;
- redimensionnement responsive ;
- boucle de rendu unique ;
- `StandaloneAdapter` actif ;
- aucune fonctionnalité d’anomalie.

## 5.4 Interdictions

Ne pas ajouter :

- joueur complet ;
- collision ;
- salle ;
- audio ;
- menus secondaires ;
- assets externes ;
- mobile ;
- sauvegarde.

------------------------------------------------------------------------

# PHASE 2 — CONTRÔLEUR FPS ET SALLE GREYBOX

## 6. Objectif

Permettre au joueur de se déplacer correctement dans une petite chambre construite avec des primitives.

## 6.1 Étape 2.1 — Entrées ordinateur

Créer :

- `InputManager`
- `DesktopInput`
- `InputActions`
- gestion AZERTY et QWERTY ;
- souris ;
- clic gauche ;
- pause.

### Validation

- `ZQSD` fonctionne ;
- `WASD` fonctionne ;
- les flèches fonctionnent ;
- aucun input ne reste bloqué après perte de focus ;
- `Échap` libère proprement le pointeur.

------------------------------------------------------------------------

## 6.2 Étape 2.2 — Joueur FPS

Créer :

- `PlayerController`
- `PlayerMovement`
- `PlayerLook`
- caméra FPS ;
- hauteur des yeux ;
- vitesse normale ;
- vitesse rapide avec `Shift`.

### Validation

- déplacement indépendant du framerate ;
- aucune accélération excessive ;
- aucune dérive ;
- rotation verticale limitée ;
- sensibilité cohérente ;
- aucune possibilité de saut.

------------------------------------------------------------------------

## 6.3 Étape 2.3 — Collisions

Créer :

- capsule joueur ;
- octree statique ;
- résolution des collisions ;
- prévention des traversées de murs ;
- géométrie de collision simplifiée.

### Validation

- le joueur ne traverse aucun mur ;
- il ne tombe pas hors de la salle ;
- les coins ne bloquent pas anormalement ;
- les petits objets décoratifs ne bloquent pas ;
- le comportement reste stable à 30, 60 et 144 FPS.

------------------------------------------------------------------------

## 6.4 Étape 2.4 — Chambre greybox

Construire une chambre simple avec :

- sol ;
- plafond ;
- quatre murs ;
- une porte d’entrée ;
- une porte de sortie ;
- lit ;
- table de nuit ;
- armoire ;
- chaise ;
- télévision ;
- lampe ;
- plante ;
- tableau ;
- livres.

Tous les objets sont réalisés en primitives.

### Validation

- la salle est lisible ;
- tous les objets importants sont visibles ;
- aucun objet n’empêche le déplacement ;
- la pièce peut être inspectée rapidement ;
- la caméra ne traverse pas les murs.

------------------------------------------------------------------------

## 6.5 Étape 2.5 — Mode debug initial

Ajouter uniquement en développement :

- FPS ;
- draw calls ;
- triangles ;
- affichage des collisions ;
- position du joueur ;
- bouton de réinitialisation.

### Validation

Le mode debug n’apparaît pas dans le build de production.

------------------------------------------------------------------------

## 6.6 Fin de phase 2

Le joueur doit pouvoir entrer dans une chambre greybox et s’y déplacer agréablement pendant plusieurs minutes.

Aucune anomalie n’est encore appliquée.

------------------------------------------------------------------------

# PHASE 3 — BOUCLE D’ANOMALIE JOUABLE

## 7. Objectif

Créer la première boucle complète :

    Observer
    → Extinction
    → Changement
    → Chercher
    → Signaler
    → Sortir

------------------------------------------------------------------------

## 7.1 Étape 3.1 — Machine à états

Implémenter les états :

    boot
    loading
    main-menu
    room-intro
    observation
    blackout
    search
    room-complete
    room-transition
    paused
    game-over
    victory

Pour le prototype, tous les états doivent fonctionner même si certains écrans restent simples.

### Validation

- aucune transition directe non autorisée ;
- pause et reprise correctes ;
- minuterie arrêtée pendant la pause ;
- état affichable dans le mode debug.

------------------------------------------------------------------------

## 7.2 Étape 3.2 — Chronométrage

Créer :

- temps d’observation ;
- temps de recherche ;
- chronomètre global ;
- pénalités ;
- pause du temps lorsque l’onglet perd le focus.

### Valeurs temporaires

    Observation : 10 secondes
    Recherche : 30 secondes
    Mauvaise sélection : +5 secondes
    Temps expiré : +15 secondes

### Validation

- temps basé sur `performance.now()` ;
- aucune dépendance au nombre d’images ;
- aucune perte ou duplication de temps après pause ;
- affichage stable en secondes.

------------------------------------------------------------------------

## 7.3 Étape 3.3 — Cibles d’anomalies

Rendre interactifs :

- télévision ;
- chaise ;
- plante ;
- tableau ;
- lampe ;
- livres.

Chaque cible possède :

- identifiant logique ;
- état initial ;
- volume d’interaction ;
- anomalies autorisées.

### Validation

- chaque identifiant est unique ;
- les volumes d’interaction sont visibles en debug ;
- un clic retourne la bonne cible ;
- les murs et décorations ne sont pas sélectionnables.

------------------------------------------------------------------------

## 7.4 Étape 3.4 — Premier système d’anomalies

Implémenter uniquement :

- disparition ;
- rotation ;
- changement de couleur.

Chaque objet possède des variantes préparées.

### Validation

- même seed = même anomalie ;
- restauration parfaite de la salle ;
- aucune variante aléatoire non contrôlée ;
- aucune anomalie invisible ;
- aucun même objet modifié deux fois.

------------------------------------------------------------------------

## 7.5 Étape 3.5 — Extinction des lumières

Créer la transition :

1.  signal sonore ;
2.  léger vacillement ;
3.  écran noir ;
4.  application des anomalies ;
5.  retour de la lumière.

### Validation

- aucune anomalie n’est visible pendant son application ;
- l’extinction reste courte ;
- aucun flash agressif ;
- le joueur ne peut pas signaler pendant le noir.

------------------------------------------------------------------------

## 7.6 Étape 3.6 — Signalement

Ajouter :

- raycast central ;
- réticule ;
- clic pour signaler ;
- bonne réponse ;
- mauvaise réponse ;
- compteur d’anomalies restantes ;
- désactivation d’une anomalie trouvée.

### Validation

- un objet correct ne peut être compté qu’une fois ;
- un objet incorrect ajoute une erreur ;
- le réticule change sur une cible ;
- les petits objets restent sélectionnables ;
- la sélection fonctionne à distance raisonnable.

------------------------------------------------------------------------

## 7.7 Étape 3.7 — Erreurs et Game Over

Ajouter :

- trois erreurs maximum ;
- compteur d’erreurs ;
- écran Game Over ;
- bouton `TRY AGAIN`.

Une erreur est comptée lorsque :

- le joueur signale un mauvais objet ;
- le temps expire.

### Validation

- la troisième erreur termine la partie ;
- le redémarrage restaure toute la salle ;
- aucun ancien timer ne continue ;
- aucune anomalie précédente ne reste active.

------------------------------------------------------------------------

## 7.8 Étape 3.8 — Porte et fin du prototype

Lorsque toutes les anomalies sont trouvées :

- la porte se déverrouille ;
- elle s’ouvre ;
- le joueur peut franchir le seuil ;
- un écran de fin temporaire apparaît.

### Validation

- la porte ne s’ouvre pas avant ;
- elle ne bloque pas le joueur ;
- le seuil est détecté ;
- le temps final est affiché.

------------------------------------------------------------------------

# PHASE 4 — VALIDATION DU PROTOTYPE

## 8. Objectif

Décider si la boucle principale est suffisamment amusante pour justifier le développement complet.

Cette phase ne consiste pas à ajouter du contenu.

Elle consiste à tester, corriger et simplifier.

------------------------------------------------------------------------

## 8.1 Test interne

Effectuer plusieurs parties avec :

- anomalies différentes ;
- différentes seeds ;
- différentes vitesses de déplacement ;
- différentes durées ;
- différentes positions de départ.

Questions à vérifier :

- la chambre est-elle mémorisable ? un peu oui manques d'elements quand meme 
- l’anomalie est-elle juste ? oui en general 
- le joueur comprend-il quoi faire ? afficher en grand le timer et le message au debut et le faire reduire dans le coin 
- le déplacement est-il agréable ? un peu plus fluide et pouvoir sauter et saccroupir serait bien 
- la phase d’observation est-elle trop longue ? ramenée à 10 secondes après la
  passe visuelle finale
- la recherche est-elle stressante sans être frustrante ? pas assez stressant
- recommencer est-il immédiat ? pas compris la question

------------------------------------------------------------------------

## 8.2 Test externe minimal

Faire tester le prototype sans expliquer précisément la solution.

Observer :

- le temps nécessaire pour comprendre ;
- les objets que les joueurs regardent ;
- les erreurs de sélection ; ils faut rajouter les autres objets presnent dans la salle en trant que seelctable possiblement faisable en rajoutant les assets phase d'apres aussi pour + detailler la salle 
- les problèmes de déplacement ;
- les anomalies trop simples ou trop difficiles ;
- l’envie de recommencer.

Ne pas guider le joueur pendant le premier essai.

------------------------------------------------------------------------

## 8.3 Données à noter

Pour chaque testeur :

    Compréhension du concept
    Temps moyen d’une manche
    Nombre d’erreurs
    Anomalies manquées
    Anomalies trouvées immédiatement
    Problèmes de déplacement
    Envie de rejouer
    Commentaires libres

------------------------------------------------------------------------

## 8.4 Critères de validation du prototype

Le prototype peut continuer si :

- le jeu est compris en moins d’une minute ;
- la majorité des testeurs identifie correctement au moins une anomalie ;
- les erreurs sont perçues comme justes ;
- le déplacement ne provoque pas de frustration majeure ;
- plusieurs joueurs relancent volontairement une partie ;
- aucune fonctionnalité supplémentaire n’est nécessaire pour comprendre le concept.

------------------------------------------------------------------------

## 8.5 En cas d’échec

Ne pas ajouter immédiatement :

- histoire ;
- monstres ;
- nouvelles salles ;
- plus d’anomalies ;
- effets visuels.

Corriger d’abord :

- rythme ;
- lisibilité ;
- taille de la pièce ;
- sélection ;
- déplacements ;
- temps d’observation ;
- qualité des anomalies.

### Décision Gate C — 18 juillet 2026

Gate C validée avec les retours du propriétaire consignés dans
`docs/GATE_C_REPORT.md`. La campagne externe supplémentaire et la collecte de
données par testeur sont abandonnées à sa demande. Les corrections retenues sont
routées vers la Phase 5 : salle plus riche, objets secondaires signalables,
présentation initiale plus lisible, déplacement plus fluide avec saut et
accroupissement, et tension audio/visuelle renforcée.

------------------------------------------------------------------------

# PHASE 5 — PREMIÈRE SALLE FINALE

## 9. Objectif

Transformer la chambre greybox en première salle représentative du jeu final.

Cette salle devient le modèle de production des neuf suivantes.

------------------------------------------------------------------------

## 9.1 Étape 5.1 — Recherche des assets

Rechercher uniquement les assets nécessaires à la chambre.

Avant téléchargement, vérifier :

- licence ;
- style ;
- taille ;
- nombre de triangles ;
- textures ;
- cohérence ;
- possibilité de modification.

Ajouter chaque asset à :

    docs/ASSET_LICENSES.md

### Statut — 18 juillet 2026

Étape 5.1 terminée. Le Kenney Furniture Kit a été retenu comme source principale
CC0. Quatorze GLB utiles ont été sélectionnés, contrôlés et ajoutés au registre ;
le reste du pack n’est pas embarqué. Deux cadres KayKit Furniture Bits 1.0 Free,
également CC0 et compatibles avec le style, ont ensuite été ajoutés pour le
tableau mural et la décoration. Le réveil sera produit avec les formes et
matériaux du projet.

------------------------------------------------------------------------

## 9.2 Étape 5.2 — Pipeline d’import

Créer un pipeline permettant de :

- charger un fichier `.glb` ;
- retrouver les nœuds par nom ;
- construire les collisions ;
- enregistrer les cibles ;
- charger les matériaux ;
- restaurer la salle ;
- libérer les ressources.

### Validation

- aucun identifiant Three.js généré automatiquement utilisé dans le gameplay ;
- aucune dépendance à l’ordre des enfants ;
- erreur claire si un nœud manque ;
- salle rechargeable sans fuite visible.

### Statut — 18 juillet 2026

Étape 5.2 terminée. Le pipeline fournit : chargement GLB via `GLTFLoader`, cache
avec compteur de références, géométries et textures partagées, matériaux isolés
par instance, catalogue typé des 16 assets de chambre, indexation unique par
noms stables, extraction des collisions, enregistrement de plusieurs volumes
d’interaction par cible, snapshot/restauration de la salle et libération
idempotente. Les noms absents, ambigus ou placés hors de leur cible produisent
des erreurs explicites. Le démontage puis rechargement est couvert par les tests.

------------------------------------------------------------------------

## 9.3 Étape 5.3 — Chambre finale

Remplacer progressivement les primitives par :

- architecture finale ;
- meubles ;
- petits objets ;
- matériaux ;
- éclairage ;
- porte animée.

Ne pas remplacer tout en une seule intervention.

Ordre recommandé :

1.  architecture ;
2.  gros meubles ;
3.  cibles d’anomalies ;
4.  petits objets ;
5.  matériaux ;
6.  éclairage ;
7.  audio.

### Statut — sous-étape 5.3.1, 18 juillet 2026

Architecture finale intégrée sans modifier les collisions : parquet bois léger,
murs et plafond mats, plinthes et corniches réutilisables, encadrements et seuils,
portes à panneaux, fenêtre, radiateur, interrupteur, prises et plafonnier. La
texture de sol est créée une fois par montage et correctement libérée au
démontage. Cette sous-étape conservait temporairement les meubles en greybox
afin de respecter l’intégration progressive.

### Statut — sous-étape 5.3.2, 18 juillet 2026

Les quatre gros meubles prioritaires sont remplacés par leurs modèles GLB : lit
double, armoire, table de nuit et meuble TV. Ils sont chargés par le gestionnaire
d’assets partagé, redimensionnés et recentrés automatiquement, puis substitués
aux primitives en une seule opération afin de ne jamais laisser une chambre
partiellement convertie. En cas d’échec d’un fichier, les quatre primitives sont
conservées et les ressources déjà acquises sont libérées. Les volumes de
collision et les six cibles d’anomalies existantes restent inchangés. Le
démontage/remontage libère puis recharge correctement les quatre modèles. La
sous-étape suivante porte sur les cibles d’anomalies finales.

### Statut — sous-étape 5.3.3, 18 juillet 2026

Les six cibles d’observation sont remplacées par leurs modèles finaux :
télévision, fauteuil, plante, tableau, lampe et livres. Le tableau utilise le
cadre paysage KayKit converti en GLB autonome ; les cinq autres objets utilisent
la sélection Kenney. Le remplacement des six cibles est transactionnel : un
échec conserve toutes les primitives et libère les modèles déjà chargés. Les
identifiants, volumes d’interaction, variantes et collisions restent stables.
Les changements de couleur ciblent les matériaux déclarés — tissu, feuillage,
abat-jour ou écran — sans recolorer inutilement le reste du modèle. Le remontage
de salle et la restauration exacte des anomalies sont couverts par les tests.
La sous-étape suivante porte sur les petits objets et détails décoratifs.

### Statut — sous-étape 5.3.4, 18 juillet 2026

Le tapis greybox est remplacé par son GLB final. Une bibliothèque basse adossée
au mur sud accueille une radio Kenney et un petit cadre photo KayKit afin
d’enrichir la lecture de la chambre sans saturer la scène. Ces éléments restent
décoratifs et n’ajoutent aucune collision gênante. Leur chargement est
transactionnel : si l’un des quatre modèles échoue, le tapis primitif est
conservé et aucun détail partiel n’est ajouté. Le démontage/remontage et la
libération des ressources sont couverts par les tests. L’orientation du meuble
TV a également été corrigée pour que sa façade regarde la pièce.
La sous-étape suivante porte sur l’harmonisation des matériaux.

### Statut — sous-étape 5.3.5, 18 juillet 2026

Les matériaux de tous les GLB intégrés utilisent désormais une palette commune
chaude et légèrement désaturée. Les bois sont brun moyen avec un vernis doux,
les tissus restent très mats, le feuillage est atténué, les métaux sont peu
réfléchissants et les atlas KayKit reçoivent une légère teinte chaude. Les
modifications s’appliquent uniquement aux matériaux clonés par instance ; les
sources partagées du cache et les fichiers GLB restent intacts. Les variantes de
couleur continuent de cibler leur matériau déclaré et la restauration revient
exactement à la palette finale. Cette restauration et la libération des
matériaux sont couvertes par les tests.
La sous-étape suivante porte sur l’éclairage final de la chambre.

### Statut — sous-étape 5.3.6, 18 juillet 2026

La chambre utilise un éclairage chaud et lisible adapté au premier acte : un
spot principal placé dans le plafonnier, un rebond chaud local, un remplissage
froid venant de la fenêtre et une ambiance légère qui maintient les zones
sombres observables. Le plafonnier est la seule lumière projetant des ombres,
avec une carte `1024 × 1024`, un biais contrôlé et des bords adoucis. Les gros
meubles et les cibles importantes projettent et reçoivent les ombres ; le
tapis, la radio et les petits cadres les reçoivent sans en projeter. L’abat-jour
importé reçoit une émission discrète sans ajouter une nouvelle lumière à ombres.
La carte statique est invalidée lors des anomalies, restaurations et remontages.
La hiérarchie, les intensités et le budget d’une seule lumière à ombres sont
couverts par les tests.
La sous-étape suivante porte sur l'ambiance audio finale de la chambre.

### Ajustements de validation propriétaire — 18 juillet 2026

Avant la passe audio, quatre corrections de lisibilité ont été intégrées. La
phase d’observation de la chambre passe de 15 à 10 secondes. Le parquet est
légèrement éclairci pour mieux détacher les silhouettes des meubles. La
bibliothèque basse, la radio et le petit cadre photo projettent désormais leurs
ombres sur le mur, tandis que le tapis reste sans projection inutile. Enfin,
huit cibles couleur sont ajoutées aux six cibles existantes : lit, armoire,
table de nuit, meuble TV, tapis, bibliothèque, radio et petit cadre photo. La
chambre finale propose donc quatorze objets signalables, tous validés par le
générateur déterministe et restaurables à leur palette initiale.

La configuration initiale de la chambre varie désormais avec la seed : dans
70 % des manches, un accessoire compatible (télévision, chaise, plante,
tableau, lampe, livres, radio ou cadre photo) est absent dès l'observation. Il
reste absent après le blackout sauf si le générateur le choisit pour la
nouvelle anomalie `show`, auquel cas il apparaît. Un poids contrôlé garde cette
variante occasionnelle. La même seed reproduit exactement l'objet absent et le
plan d'anomalie. En cas de Game Over, la caméra vise maintenant l'anomalie
manquée, son volume est encadré en rouge et le panneau nomme l'objet ainsi que
le changement attendu.

### Statut — sous-étape 5.3.7, 18 juillet 2026

La chambre possède désormais une ambiance procédurale continue et discrète,
composée d'un souffle grave filtré et d'un léger ronronnement électrique. Elle
démarre uniquement après l'interaction autorisant la Web Audio API, reste
correctement suspendue pendant une pause et s'arrête au Game Over ou à la
victoire. Les effets couvrent maintenant l'extinction, le retour de lumière, la
bonne réponse, l'erreur, le déverrouillage et l'ouverture de la porte. Chaque
famille est routée vers son bus `ambience`, `effects` ou `interface`, avec volume
et mute centralisés. Aucun fichier audio externe n'est ajouté au téléchargement.
Le cycle de vie du graphe audio, les reprises, les volumes et l'orchestration des
événements sont couverts par des tests dédiés. L'étape 5.3 est terminée ; la
prochaine étape est 5.4, les anomalies finales de la chambre.
Le panneau de développement expose deux réglages en direct : `SFX VOLUME` pour
les effets et l'interface, et `MUSIC / AMBIENCE` pour la musique et l'ambiance
continue.
Le gain interne de cette ambiance est renforcé et ses fréquences principales
sont remontées à 80 et 160 Hz afin qu'elle reste clairement audible sur des
haut-parleurs d'ordinateur lorsque le slider est à 100 %.
Deux nappes de violon procédural, à 220 Hz puis 146,83 Hz, alternent toutes les
neuf secondes avec une attaque progressive, un léger vibrato et une longue
tenue. La seconde descend donc vers une note plus grave afin d'alourdir
l'ambiance. Cette couche reste derrière les effets de gameplay et suit le bus
`MUSIC / AMBIENCE`. Les deux sliders audio démarrent à 50 %.

------------------------------------------------------------------------

## 9.4 Étape 5.4 — Anomalies finales de la chambre

### Fondation Level Builder 3D — 18 juillet 2026

Un éditeur réservé au développement est disponible depuis `OPEN LEVEL BUILDER`
dans le panneau debug. Il suspend la manche, libère la souris et fournit une
caméra orbitale, une sélection directe dans le viewport, une hiérarchie de
scène et des gizmos de déplacement, rotation et échelle avec raccourcis `W`,
`E` et `R`. Chaque objet peut conserver un état `BEFORE` et `AFTER`, modifier sa
visibilité ou sa couleur, puis produire une variante validée `show`, `hide`,
`move`, `rotate`, `scale` ou `color`.

L'aperçu avant/après, la restauration à la fermeture et l'import/export JSON
versionné sont opérationnels. Les chemins d'objets restent stables en présence
de noms dupliqués grâce à un index d'occurrence. Le format, les snapshots, la
résolution de références et les six règles de validation sont couverts par les
tests. Le workflow complet est décrit dans `docs/level-builder.md`.

La prochaine sous-étape 5.4 consiste à adapter les variantes exportées au
`RoomAnomalySystem`, puis à produire et tester les anomalies finales ci-dessous.

### Raccord JSON au runtime — 18 juillet 2026

Les documents exportés par le Level Builder alimentent maintenant directement
le `RoomAnomalySystem`. L'adaptateur valide la salle, la cible, les identifiants,
l'état `BEFORE` et l'unicité du type de changement, puis prépare les variantes
`show`, `hide`, `move`, `rotate`, `scale` et `color`. Les mouvements et tailles
sont appliqués comme des deltas, les rotations comme des offsets locaux, et les
couleurs ciblent un chemin de mesh et un index de matériau. La restauration
reste fondée sur le snapshot canonique de chaque cible.

Le catalogue `src/world/rooms/greybox-bedroom-anomalies.json` est chargé après
les modèles finaux. Il est actuellement vide et prêt à recevoir de nouveaux
exports. Les volumes d'interaction sont exclus des nouvelles captures de
couleurs. Des tests couvrent les six types, le rejet d'un export obsolète, la
sélection par le générateur, l'application et la restauration.

La prochaine sous-étape consiste à produire les autres variantes finales avec
le builder, les fusionner dans ce catalogue et les valider individuellement.

Correction de placement canonique : un export temporaire du builder a permis de
descendre la télévision de `Y = 0,70` à `Y = 0,65`. Elle repose désormais sur le
meuble TV dans le modèle final comme dans le fallback primitif. Cette correction
de base n'est volontairement pas enregistrée comme anomalie aléatoire.

### Catalogue automatique complet — 18 juillet 2026

Les 14 objets jouables possèdent maintenant chacun une disparition, une
apparition et deux couleurs.
La télévision, la chaise, le tableau, les livres, la table de nuit, le tapis, la
radio et le cadre photo ajoutent deux rotations de ±30°. Les objets massifs
adossés au mur et les silhouettes symétriques ne tournent pas. Le catalogue
contient 72 variantes automatiques. Les 28 variantes de déplacement
`shifted-*` et `moved-*` ont été retirées, car elles étaient trop subtiles en
jeu. Le type `move` reste disponible pour les variantes manuelles du Level
Builder. Le catalogue JSON du Level Builder est
actuellement vide.

Les colliders du lit, de l'armoire et du meuble TV suivent désormais les
variantes `move`, sont retirés pour `hide`, restaurés pour `show`, puis réinjectés
dans l'Octree. Les 72 variantes sont validées individuellement par les tests :
mutation visible, restauration exacte, couleurs distinctes et rotation
automatique fixée à 30°. Le détail objet par objet est consigné dans
`docs/bedroom-anomaly-catalog.md`.

Correction des objets supportés : la lampe et les livres suivent la table de
nuit, la télévision suit son meuble, puis la radio et le cadre photo suivent la
bibliothèque basse. Masquer un support masque désormais tout ce qui repose
dessus et désactive les zones de clic correspondantes ; le retour ou le
déplacement du support restaure et entraîne correctement l'ensemble.

Préparer au minimum :

- télévision tournée ;
- lampe éteinte ;
- chaise déplacée ;
- tableau remplacé ;
- plante disparue ;
- radio modifié ;
- livres déplacés ;
- autres objets disparu ou apparu etc.. regarde ce quil ya dans la scene et adapte toi 


Chaque anomalie doit être testée individuellement.

------------------------------------------------------------------------

## 9.5 Étape 5.5 — Interface visuelle

### Passe visuelle finale — 18 juillet 2026

Le menu principal possède maintenant une identité complète fondée sur
l'observation et le doute : cadre de protocole, silhouette de porte, halo,
grain, balayage lumineux, titre à rémanence et rappel discret des commandes.
L'ensemble est produit en HTML/CSS, reste responsive et respecte la préférence
système de réduction des animations.

Le HUD reprend la même grammaire visuelle pour le compteur, les erreurs, le
chronomètre, le réticule ciblé et les feedbacks correct/incorrect. Une annonce
temporaire `ROOM CLEARED / THE EXIT IS OPEN` confirme la réussite sans bloquer
le déplacement vers la sortie. Les écrans Game Over et victoire existants
restent raccordés au parcours.

La passe d’unification finale applique désormais la police éditoriale, la police
technique, le noir chaud, l’or et les bordures fines du menu à tous les éléments
en jeu, au Game Over, à la victoire, au panneau debug et au Level Builder. En
développement, `H` masque ou réaffiche l’ensemble du debug — panneau, labels,
collisions et volumes — et ce choix reste conservé lors des transitions de salle.

La pause dispose désormais d'un écran dédié, accessible et entièrement opaque.
Son fond est un noir réel (`#000`) : aucune partie de la chambre ou d'une
anomalie ne reste visible pendant que le jeu est suspendu. L'ouverture du Level
Builder continue volontairement de masquer cet écran afin de conserver le
workflow d'édition 3D.

Ajouter :

- HUD définitif ;
- réticule ;
- compteur ;
- chronomètre ;
- feedback correct ;
- feedback erreur ;
- écran de pause ;
- écran Game Over ;
- écran temporaire de salle réussie.

Le logo final n’est pas encore obligatoire.

------------------------------------------------------------------------

## 9.6 Étape 5.6 — Audio minimal

Ajouter :

- blackout ;
- retour de lumière ;
- bonne réponse ;
- mauvaise réponse ;
- déverrouillage ;
- ouverture de porte ;
- ambiance de chambre.

------------------------------------------------------------------------

## 9.7 Critères de validation

La chambre finale doit :

- représenter correctement l’identité visuelle ;
- fonctionner sur ordinateur moyen ;
- rester lisible sur petit écran ;
- charger rapidement ;
- contenir suffisamment d’anomalies ;
- ne produire aucun bug de restauration ;
- servir de modèle aux futures salles.

------------------------------------------------------------------------

# PHASE 6 — PARCOURS COMPLET

## 10. Objectif

Créer les dix salles et la sortie sans modifier la boucle principale.

L’ordre de production ne suit pas obligatoirement l’ordre du jeu.

Il suit la réutilisation des assets.

### Fondation de la route — 18 juillet 2026

La route ESCAPE des dix salles est désormais décrite par une configuration
typée unique. Elle fixe l'ordre canonique de la maison, le niveau de difficulté,
les durées d'observation et de recherche, ainsi que la plage d'anomalies de
chaque salle conformément au GDD. Les plages variables choisissent leur nombre
d'anomalies de façon déterministe à partir de la seed de la partie.

Un contrôleur de progression sait avancer jusqu'au hall principal, refuser de
boucler après la dernière salle et revenir proprement à la chambre lors d'une
nouvelle partie. La chambre actuelle consomme déjà cette configuration au lieu
d'utiliser des valeurs et un index codés en dur. La prochaine sous-étape est le
runtime de la salle de bain, puis son branchement à la transition de porte.

### Salle de bain jouable — 18 juillet 2026

Le runtime de la deuxième salle est construit et raccordé au parcours. La porte
de la chambre charge désormais la salle de bain sous un fondu noir, libère la
chambre précédente, recrée les systèmes de sélection, d’anomalies, de collision
et de debug, puis lance une nouvelle phase d’observation. Une nouvelle partie
revient correctement à la chambre, y compris après un Game Over dans la salle de
bain.

La salle de bain possède une architecture carrelée cohérente, une lumière chaude
principale complétée par des remplissages froids, une douche vitrée, une fenêtre
dépolie, quatre collisions de mobilier et 17 objets issus de Tiny Treats. Chaque
objet dispose des variantes apparition, disparition et de deux couleurs ; les
rotations à 30° sont limitées aux objets pour lesquels elles restent lisibles.
Les accessoires suivent leurs supports afin d’éviter tout objet flottant.
La sélection donne désormais la priorité à un accessoire directement visé sur
son support : le canard reste ainsi cliquable dans la baignoire, comme les petits
objets posés sur la vasque, les étagères ou les meubles des salles suivantes.

La collection finale regroupe les 17 modèles dans un seul GLB et déduplique leur
atlas commun. Prochaine sous-étape après validation manuelle : premier couloir,
puis Gate E lorsque trois salles consécutives et leurs transitions fonctionnent.

### Premier couloir jouable — 18 juillet 2026

Le runtime de la troisième salle est construit et raccordé à la sortie de la
salle de bain. Il forme désormais un passage en L : une première section étroite,
un virage à 90°, puis une seconde section complète avant la porte de sortie. Le
parquet, les soubassements et quatre plafonniers unifient les deux branches.

La salle compte 16 cibles sélectionnables : console, téléphone, banc, bottes,
plante, deux cadres, tapis, applique, horloge, porte-manteau, patères, petite
table, enceinte et deux cartons. Les meubles principaux proviennent du Furniture
Kit Kenney ; Poly Pizza complète précisément le téléphone, l’horloge et les
bottes. Les deux cadres KayKit existants sont réutilisés sans ajouter de fichier
au build.

Chaque cible possède apparition, disparition et deux variantes de couleur. Le
layout exporté du Level Builder dans `first-corridor-layout.json` définit
désormais les positions, orientations et échelles canoniques des 16 objets. Les
rotations au sol du téléphone, des bottes, du tapis, des cartons et de l’enceinte
restent à 30° autour de l’axe vertical. Les deux cadres et les patères tournent
seulement de 15° autour de l’axe normal à leur mur respectif. L’horloge, la
plante et le porte-manteau ne possèdent aucune anomalie de rotation.

Le téléphone suit la visibilité de sa console et l’enceinte celle de sa petite
table. La console, le banc et la petite table disposent de collisions
synchronisées avec leurs anomalies. Le catalogue vide du Level Builder est
également enregistré afin de pouvoir créer des variantes sans modifier le
runtime.

Pour compenser la surface plus grande sans retirer la hausse de difficulté, le
joueur dispose de 20 secondes d’observation et 45 secondes de recherche. Chaque
passage contient exactement deux anomalies parmi les 16 cibles.

Les validations automatiques couvrent le shell en L, le spawn, les lumières,
les seize chargements GLB, l’unicité des cibles, la génération déterministe, les
dépendances console/téléphone et petite table/enceinte, ainsi que la libération
des assets. La Gate E reste en attente de la validation visuelle et jouable des
trois transitions consécutives par le propriétaire du projet.

### Couleurs variables dans l’état initial — 18 juillet 2026

La baseline de chaque salle peut maintenant recolorer chaque cible compatible
avec une probabilité de 15 %, dans une limite de deux objets par salle. La
sélection de l’objet et de sa variante reste entièrement déterministe à partir
de la seed ; les objets absents et les accessoires masqués avec leur support ne
sont jamais choisis. Cette couleur alternative fait partie de l’état normal à
mémoriser pendant la phase d’observation.

Une cible ainsi recolorée gagne automatiquement une variante d’anomalie
`restored-base-color`. Après le blackout, l’objet peut donc reprendre sa couleur
canonique : ce retour constitue bien l’anomalie à signaler. La variante de
couleur déjà utilisée par la baseline est exclue pour éviter une mutation
invisible. La restauration de la salle, le panneau debug et le reveal de Game
Over connaissent tous ce nouvel état.

### Préchargement et préparation Gate E — 19 juillet 2026

La salle suivante est désormais montée dans une scène de staging invisible et
charge ses GLB pendant que le joueur termine la salle courante. Au passage de la
porte, cette instance déjà préparée est transférée vers la scène active avec ses
matériaux, ses cibles et ses leases d’assets intacts. Le monde de collision est
reconstruit pour la nouvelle salle sans reconstruire son contenu visuel.

Les demandes identiques sont regroupées, une annulation libère la salle de
staging et ses ressources, et un échec de préchargement conserve le chargement
normal sous fondu noir comme solution de repli. La chambre précharge la salle de
bain ; la salle de bain précharge le premier couloir. Aucun asset supplémentaire
n’est nécessaire pour cette fondation.

Les contrôles automatiques de transfert, concurrence, annulation, repli et
libération mémoire sont terminés. La Gate E attend seulement le parcours manuel
des trois salles consécutives décrit dans `docs/GATE_E_REPORT.md`.

------------------------------------------------------------------------

## 10.1 Groupe 1 — Premières salles

Produire :

1.  chambre ;
2.  salle de bain ;
3.  premier couloir.

### Objectif

Valider :

- transition entre plusieurs salles ;
- préchargement ;
- destruction de salle ;
- progression de difficulté ;
- cohérence architecturale.

### Gate

Ne pas produire les salles suivantes tant que trois salles consécutives ne fonctionnent pas parfaitement.

------------------------------------------------------------------------

## 10.2 Groupe 2 — Salles centrales

Produire :

4.  bureau ;
5.  cuisine ;
6.  salle à manger ;
7.  salon.

### Objectif

Introduire :

- densité plus importante ;
- anomalies multiples ;
- plus de variantes ;
- difficultés intermédiaires.

### Anomalies par salle

    Bureau : 1 à 2
    Cuisine : 2
    Salle à manger : 2
    Salon : 2 à 3

------------------------------------------------------------------------

## 10.3 Groupe 3 — Salles finales

Produire :

8.  buanderie ;
9.  couloir d’entrée ;
10. hall principal ;
11. extérieur final non explorable.

### Objectif

Créer une progression visuelle vers la sortie.

### Anomalies par salle

    Buanderie : 2 à 3
    Couloir d’entrée : 3
    Hall principal : 3 à 4

------------------------------------------------------------------------

## 10.4 Transitions

Entre les salles :

- porte déverrouillée ;
- ouverture ;
- passage du joueur ;
- chargement de la prochaine salle ;
- fermeture ou disparition de la précédente ;
- courte introduction ;
- nouvelle phase d’observation.

Éviter les écrans de chargement entre chaque salle sauf nécessité réelle.

------------------------------------------------------------------------

## 10.5 Préchargement

Pendant la salle actuelle :

- précharger la salle suivante ;
- conserver seulement les ressources nécessaires ;
- libérer la salle précédente après transition.

### Validation

- aucun freeze majeur ;
- aucune double boucle ;
- mémoire stable ;
- aucun ancien son actif ;
- aucun objet de l’ancienne salle sélectionnable.

------------------------------------------------------------------------

## 10.6 Progression de difficulté

Configurer les durées et nombres d’anomalies selon le GDD.

Le système doit utiliser des données et non des conditions codées directement.

Exemple :

    interface DifficultyStep {
      roomIndex: number;
      observationDurationMs: number;
      searchDurationMs: number;
      anomalyCountMin: number;
      anomalyCountMax: number;
    }

------------------------------------------------------------------------

## 10.7 Fin du jeu

Après la dernière salle :

- la porte principale se déverrouille ;
- le joueur sort ;
- le chronomètre s’arrête ;
- l’extérieur apparaît ;
- écran `YOU GOT OUT` ;
- affichage des résultats ;
- sauvegarde du meilleur temps local.

------------------------------------------------------------------------

## 10.8 Critères de validation

Le parcours complet est validé lorsque :

- les dix salles sont jouables dans l’ordre ;
- aucune salle ne bloque la progression ;
- toutes les anomalies sont valides ;
- une partie peut être terminée ;
- une partie peut être recommencée ;
- les résultats sont corrects ;
- les salles se chargent sans fuite évidente ;
- la difficulté augmente progressivement.

------------------------------------------------------------------------

# PHASE 7 — FINITIONS ET OPTIMISATION

## 11. Objectif

Transformer le parcours fonctionnel en jeu publiable.

------------------------------------------------------------------------

## 11.1 Mobile

Ajouter :

- joystick virtuel ;
- contrôle caméra tactile ;
- bouton `REPORT` ;
- bouton pause ;
- safe areas ;
- orientation paysage ;
- assistance de sélection.

### Validation

- jeu utilisable à deux pouces ;
- aucun scroll de page ;
- aucun zoom navigateur ;
- interface non masquée ;
- petits objets sélectionnables.

------------------------------------------------------------------------

## 11.2 Qualité graphique

Ajouter des profils :

- low ;
- medium ;
- high.

Paramètres possibles :

- résolution ;
- anti-aliasing ;
- ombres ;
- distance d’affichage ;
- qualité des textures ;
- effets légers.

Le jeu doit sélectionner une qualité par défaut raisonnable.

------------------------------------------------------------------------

## 11.3 Sauvegarde

Implémenter :

- paramètres ;
- meilleur temps ;
- meilleur temps parfait ;
- statistiques locales ;
- migration de format ;
- résistance aux données corrompues.

------------------------------------------------------------------------

## 11.4 Menus finaux

Finaliser :

- menu principal ;
- paramètres ;
- pause ;
- Game Over ;
- victoire ;
- crédits ;
- mentions de licences.

------------------------------------------------------------------------

## 11.5 Logo et icône

Produire uniquement lorsque le rendu final existe.

Livrables :

- logo horizontal ;
- logo empilé ;
- icône carrée ;
- favicon ;
- version claire ;
- version sombre.

------------------------------------------------------------------------

## 11.6 Accessibilité minimale

Ajouter :

- réglage sensibilité ;
- inversion verticale ;
- volumes séparés ;
- réduction des clignotements ;
- taille du réticule si nécessaire ;
- feedback non basé uniquement sur la couleur.

------------------------------------------------------------------------

## 11.7 Optimisation

Vérifier :

- taille du bundle ;
- textures ;
- audio ;
- draw calls ;
- triangles ;
- mémoire ;
- garbage collection ;
- temps de chargement ;
- comportement mobile ;
- perte du contexte WebGL.

------------------------------------------------------------------------

## 11.8 Tests finaux

Tester :

- Chrome ;
- Edge ;
- Firefox si compatible ;
- Safari iPhone ;
- Chrome Android ;
- écran 60 Hz ;
- écran haute fréquence ;
- iframe ;
- sous-dossier ;
- réseau lent ;
- retour d’onglet ;
- redimensionnement ;
- audio interrompu ;
- écran tactile.

------------------------------------------------------------------------

## 11.9 Critères de validation

Le jeu est prêt à être soumis lorsque :

- aucun bug bloquant connu ;
- parcours terminable ;
- mobile utilisable ;
- build statique ;
- chemins relatifs ;
- chargement acceptable ;
- interface complète ;
- meilleur temps sauvegardé ;
- crédits et licences présents ;
- aucune erreur console normale ;
- aucune dépendance à un serveur.

------------------------------------------------------------------------

# PHASE 8 — PUBLICATION

## 12. Objectif

Publier le même cœur de jeu avec des adaptateurs spécifiques.

Ordre recommandé :

    Standalone
    → CrazyGames
    → Y8
    → GameDistribution

------------------------------------------------------------------------

## 12.1 Version standalone

Créer :

    pnpm build:standalone

Cette version sert à :

- tester le build final ;
- héberger une démo ;
- partager le jeu ;
- effectuer les tests externes ;
- conserver une version indépendante.

Ne pas ajouter de publicité externe pendant les tests.

------------------------------------------------------------------------

## 12.2 CrazyGames

Créer :

    CrazyGamesAdapter

Intégrer :

- initialisation SDK ;
- événements de chargement ;
- événements de gameplay ;
- pause publicitaire ;
- mute publicitaire ;
- interstitiel ;
- rewarded ad uniquement si utile ;
- score ou leaderboard si disponible et pertinent.

### Emplacements publicitaires autorisés

- après Game Over ;
- après victoire ;
- éventuellement après plusieurs salles, uniquement après test.

### Emplacements interdits

- observation ;
- blackout ;
- recherche ;
- interaction ;
- ouverture de porte.

------------------------------------------------------------------------

## 12.3 Y8

Créer :

    Y8Adapter

Ne pas réutiliser directement le code CrazyGames.

Réutiliser uniquement l’interface commune.

------------------------------------------------------------------------

## 12.4 GameDistribution

Créer :

    GameDistributionAdapter

Vérifier :

- initialisation ;
- pause ;
- reprise ;
- audio ;
- affichage des publicités ;
- règles de distribution ;
- absence de conflit avec les autres SDK.

------------------------------------------------------------------------

## 12.5 Builds séparés

Produire :

    pnpm build:standalone
    pnpm build:crazygames
    pnpm build:y8
    pnpm build:gamedistribution

Chaque build doit contenir uniquement le SDK nécessaire.

Aucun build ne doit charger plusieurs SDK publicitaires.

------------------------------------------------------------------------

## 12.6 Assets de publication

Créer après validation finale :

- icône carrée ;
- bannière CrazyGames ;
- capture 16:9 ;
- capture mobile ;
- logo transparent ;
- description courte ;
- description longue ;
- instructions ;
- catégorie ;
- tags.

------------------------------------------------------------------------

# 13. Ordre des futurs prompts Codex

Les interventions Codex doivent suivre cet ordre.

## Lot 1 — Initialisation

1.  analyser les documents ;
2.  initialiser Vite et TypeScript ;
3.  créer l’architecture minimale ;
4.  créer le renderer ;
5.  créer le menu et le bouton `PLAY`.

## Lot 2 — FPS

6.  créer les entrées ;
7.  créer le contrôleur FPS ;
8.  ajouter les collisions ;
9.  construire la chambre greybox ;
10. ajouter le debug.

## Lot 3 — Gameplay

11. créer la machine à états ;
12. créer les timers ;
13. créer les cibles ;
14. créer le système d’anomalies ;
15. créer le blackout ;
16. créer le raycast ;
17. créer les erreurs ;
18. créer la porte et la fin.

## Lot 4 — Première salle finale

19. créer le pipeline GLB ;
20. intégrer l’architecture ;
21. intégrer les gros meubles ;
22. intégrer les anomalies finales ;
23. intégrer l’éclairage ;
24. intégrer l’audio ;
25. finaliser le HUD.

## Lot 5 — Parcours

26. salle de bain ;
27. couloir ;
28. transitions ;
29. bureau ;
30. cuisine ;
31. salle à manger ;
32. salon ;
33. buanderie ;
34. entrée ;
35. hall ;
36. extérieur ;
37. écran de victoire.

## Lot 6 — Publication

38. mobile ;
39. sauvegarde ;
40. qualité graphique ;
41. optimisation ;
42. logo et assets de publication ;
43. standalone ;
44. CrazyGames ;
45. Y8 ;
46. GameDistribution.

------------------------------------------------------------------------

# 14. Format obligatoire des prompts Codex

Chaque prompt doit contenir :

    Contexte
    Objectif
    Documents à lire
    État actuel du projet
    Fonctionnalités demandées
    Fichiers à créer ou modifier
    Contraintes techniques
    Fonctionnalités interdites
    Tests à ajouter
    Commandes à exécuter
    Critères de validation
    Compte-rendu attendu

Codex doit :

- lire les fichiers existants avant toute modification ;
- respecter les documents du dossier `docs` ;
- ne pas réécrire une architecture fonctionnelle sans nécessité ;
- ne pas ajouter de dépendance sans justification ;
- exécuter les validations ;
- fournir un résumé des modifications ;
- signaler les problèmes restants honnêtement.

------------------------------------------------------------------------

# 15. Gestion Git recommandée

## Branches

    main
    develop
    feature/*
    fix/*

Pour un développement solo, `develop` reste optionnelle.

Une structure simple est acceptable :

    main
    feature/greybox-room
    feature/anomaly-system
    feature/final-bedroom
    fix/player-collision

## Commits

Exemples :

    chore: initialize vite threejs project
    feat: add first-person player controller
    feat: add deterministic anomaly selection
    feat: add greybox bedroom
    fix: prevent player clipping through corners
    test: cover anomaly compatibility rules
    docs: update development roadmap

Éviter les commits vagues :

    update
    fix stuff
    changes
    final

------------------------------------------------------------------------

# 16. Définition d’une fonctionnalité terminée

Une fonctionnalité est terminée lorsque :

- elle fonctionne dans le jeu ;
- elle respecte les documents ;
- elle possède des tests lorsque nécessaire ;
- elle ne casse aucune fonctionnalité existante ;
- le build passe ;
- les erreurs console sont corrigées ;
- elle a été testée manuellement ;
- son code ne contient pas de solution temporaire non signalée ;
- la documentation est mise à jour si nécessaire.

------------------------------------------------------------------------

# 17. Priorité des bugs

## Bloquant

- jeu impossible à lancer ;
- build cassé ;
- sauvegarde corrompue ;
- progression impossible ;
- joueur bloqué ;
- anomalie impossible ;
- écran noir permanent.

Corriger immédiatement.

## Majeur

- collision instable ;
- objet difficilement sélectionnable ;
- timer incorrect ;
- mauvaise restauration ;
- chute importante de performance ;
- contrôle mobile inutilisable.

Corriger avant la prochaine phase.

## Mineur

- léger problème visuel ;
- son trop fort ;
- texte mal aligné ;
- animation imparfaite ;
- décoration incorrecte.

Peut être regroupé dans une phase de polish.

------------------------------------------------------------------------

# 18. Points d’arrêt obligatoires

Le projet doit s’arrêter pour validation aux étapes suivantes :

## Gate A

Après l’initialisation technique.

Question :

> Le projet est-il propre, stable et exportable ?

## Gate B

Après le contrôleur FPS.

Question :

> Se déplacer dans la chambre est-il agréable ?

## Gate C

Après la boucle d’anomalie greybox.

Question :

> Le gameplay est-il compréhensible et amusant ?

## Gate D

Après la chambre finale.

Question :

> Le style et le pipeline sont-ils assez solides pour produire neuf salles supplémentaires ?

### Décision Gate D — 18 juillet 2026

Gate D validée après les confirmations successives du propriétaire et la
validation automatisée de la chambre finale. Le détail du pipeline, des
ajustements demandés et des risques reportés est consigné dans
`docs/GATE_D_REPORT.md`. La production peut passer à la route multi-salles de la
Phase 6.

## Gate E

Après trois salles.

Question :

> Les transitions, le chargement et la progression fonctionnent-ils réellement ?

## Gate F

Après le parcours complet.

Question :

> Une partie complète peut-elle être terminée sans problème ?

## Gate G

Avant soumission.

Question :

> Le build respecte-t-il les contraintes des portails ?

------------------------------------------------------------------------

# 19. Fonctionnalités à ne jamais glisser entre deux phases

Toute idée suivante doit aller dans `VERSION_2_BACKLOG.md` :

- histoire complète ;
- mode Endless ;
- daily challenge ;
- classement mondial ;
- achievements ;
- éditeur ;
- nouvelle maison ;
- nouvelles mécaniques ;
- monstres ;
- secrets complexes ;
- inventaire ;
- objets à ramasser ;
- énigmes ;
- personnalisation ;
- boutique ;
- comptes ;
- cloud ;
- multijoueur.

Aucune de ces idées ne doit être ajoutée « rapidement » pendant le MVP.

------------------------------------------------------------------------

# 20. Première action de développement

La prochaine étape concrète est :

> Initialiser le projet Vite, TypeScript et Three.js à partir des décisions présentes dans les documents.

Le premier prompt Codex doit uniquement couvrir :

- analyse des documents ;
- initialisation du projet ;
- architecture minimale ;
- renderer ;
- écran de lancement ;
- bouton `PLAY` ;
- `StandaloneAdapter` ;
- commandes de validation.

Il ne doit pas encore créer :

- salle greybox ;
- joueur ;
- collision ;
- anomalies ;
- chronomètre ;
- assets externes.

------------------------------------------------------------------------

# 21. Règle finale

Le projet doit toujours privilégier :

    Terminer
    → Tester
    → Publier

avant :

    Ajouter
    → Complexifier
    → Refaire

Une petite version complète et publiée de **Was It There?** a plus de valeur qu’une grande version ambitieuse jamais terminée.
