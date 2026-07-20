# Level Builder 3D

Le Level Builder est un outil disponible uniquement dans les builds de
développement. Il sert à préparer visuellement les variantes d'anomalies avant
de les raccorder au générateur du jeu.

## Ouverture

1. Lancer le projet avec `pnpm dev`.
2. Appuyer sur `H` pour afficher le panneau debug.
3. Cliquer sur `OPEN LEVEL BUILDER`.
4. Le jeu libère la souris et met la manche en pause automatiquement.

Le bouton `CLOSE` restaure tous les objets modifiés pendant la session. Si une
partie était en cours, le jeu redemande ensuite le pointer lock et reprend la
manche.

La section `LEVEL` permet de charger directement les huit salles construites
(chambre, salle de bain, couloir, bureau, cuisine, salle à manger, salon et
buanderie). Le nouveau Level Builder se rouvre
automatiquement dans la salle choisie : il n'est pas nécessaire de terminer les
salles précédentes.

Changer de salle restaure la salle courante. Si le layout a été modifié, une
confirmation rappelle de l'exporter avant le changement.

La section `EDITOR LIGHT` ajoute temporairement jusqu'à 200 % de lumière
ambiante afin de mieux voir les objets pendant le placement. Ce réglage ne
modifie ni l'éclairage réel de la salle ni les fichiers JSON exportés, et la
lumière supplémentaire est désactivée dès que le Level Builder est fermé.

## Navigation et sélection

- clic gauche sur un objet : sélection ;
- clic gauche et glisser hors gizmo : rotation de la caméra ;
- clic droit et glisser : déplacement de la caméra ;
- molette : zoom ;
- `FRAME SELECTED` : centre la caméra sur l'objet ;
- la hiérarchie permet aussi de sélectionner un objet par son nom.

Lorsqu'un mesh appartient à une cible d'anomalie enregistrée, le builder
sélectionne automatiquement la racine logique de cette cible. Son identifiant
est affiché entre crochets.

## Transformations

- `W` : déplacement ;
- `E` : rotation ;
- `R` : échelle.

Le menu `SNAPPING` propose uniquement quatre réglages : `OFF`, `FINE` (1 cm,
1 degré, 0,01), `NORMAL` (5 cm, 5 degrés, 0,05) et `COARSE` (25 cm, 15 degrés,
0,10). La visibilité et la couleur peuvent être modifiées dans la section
`BEFORE / AFTER`.

## Ajouter et retirer du mobilier

- `DUPLICATE OBJECT` crée une copie visuelle du meuble sélectionné et la décale
  de 50 cm pour qu'elle soit immédiatement visible ;
- `REMOVE OBJECT` retire une copie ajoutée ou masque un meuble existant dans le
  layout exporté ;
- les murs, portes et objets techniques restent protégés ;
- une copie sert au placement canonique et ne peut pas devenir directement une
  variante d'anomalie.

Une suppression de meuble existant peut être annulée pendant la session en le
resélectionnant dans la hiérarchie et en recochant `VISIBLE`.

## Création d'une variante

1. Sélectionner l'objet.
2. Placer l'objet dans son état de référence.
3. Cliquer sur `CAPTURE BEFORE`.
4. Construire l'anomalie avec le gizmo, la visibilité ou la couleur.
5. Cliquer sur `CAPTURE AFTER`.
6. Utiliser `PREVIEW BEFORE` et `PREVIEW AFTER` pour comparer.
7. Saisir un identifiant en kebab-case, par exemple `chair-moved`.
8. Choisir `show`, `hide`, `move`, `rotate`, `scale` ou `color`.
9. Cliquer sur `VALIDATE + SAVE`.

La validation refuse une variante dont les captures ne contiennent pas le type
de changement déclaré.

Pour créer une variante `show`, masquer d'abord l'objet, capturer `BEFORE`, puis
le rendre visible et capturer `AFTER`. Pour `hide`, faire l'inverse.

## JSON

`EXPORT ANOMALIES` télécharge un document versionné contenant :

- l'identifiant de la salle ;
- un chemin stable par nom et occurrence pour chaque objet ;
- l'identifiant de cible d'anomalie lorsqu'il existe ;
- position, quaternion, échelle et visibilité avant/après ;
- les couleurs des matériaux avant/après ;
- le type et l'identifiant de chaque variante.

`IMPORT ANOMALIES` valide la version, la salle, les identifiants, les changements et
la présence des objets référencés.

## Placement canonique d'une salle

Pour replacer les meubles et en faire leur position normale définitive, aucune
variante d'anomalie n'est nécessaire :

1. Mettre le jeu en pause avec `Echap`, puis cliquer sur `OPEN LEVEL BUILDER`.
2. Sélectionner un objet dans la vue 3D ou dans la hiérarchie.
3. Le placer avec `W`, `E` et `R` pour le déplacement, la rotation et l'échelle.
4. Répéter l'opération pour tous les objets à corriger.
5. Cliquer sur `EXPORT LAYOUT` avant de fermer l'éditeur.
6. Transmettre le fichier `<room-id>-layout.json` pour intégrer ces valeurs au
   placement de base de la salle.

L'export layout version 2 contient l'état actuel de toutes les cibles de la
salle, triées par identifiant : position locale, quaternion, échelle et
visibilité. Il contient aussi chaque copie ajoutée avec sa source et sa
transformation. Un meuble retiré est exporté avec `visible: false`. `CLOSE`
restaure toujours la salle telle qu'elle était avant l'ouverture de l'éditeur ;
le JSON exporté conserve les placements effectués.

## Raccord au jeu

Le format d'authoring est maintenant consommé directement par le runtime. Le
catalogue versionné de la chambre se trouve dans
`src/world/rooms/greybox-bedroom-anomalies.json`. Pour ajouter les variantes
d'un export, fusionner son tableau `variants` dans ce fichier sans modifier le
reste du document.

Au chargement, l'adaptateur :

- exige une cible d'anomalie enregistrée et un identifiant unique ;
- refuse un document destiné à une autre salle ;
- compare l'état `BEFORE` avec la chambre canonique afin de détecter les exports
  devenus obsolètes ;
- refuse une variante qui mélange plusieurs types de changement ;
- convertit `move`, `rotate` et `scale` en deltas restaurables ;
- applique les couleurs par chemin de mesh et index de matériau ;
- ignore les volumes techniques d'interaction ;
- ajoute les six types `show`, `hide`, `move`, `rotate`, `scale` et `color` au
  générateur déterministe de `RoomAnomalySystem`.

Le catalogue JSON est actuellement vide. Les prochains exports n'incluront plus
les matériaux des volumes d'interaction dans leurs snapshots.

Les variantes JSON complètent le catalogue automatique des 14 objets jouables.
Les axes, amplitudes et exclusions de rotation de ce catalogue sont détaillés
dans `docs/bedroom-anomaly-catalog.md`.
