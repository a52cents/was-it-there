# Level Builder 3D

Le Level Builder est un outil disponible uniquement dans les builds de
développement. Il sert à préparer visuellement les variantes d'anomalies avant
de les raccorder au générateur du jeu.

## Ouverture

1. Lancer le projet avec `pnpm dev`.
2. Cliquer sur `OPEN LEVEL BUILDER` dans le panneau debug.
3. Le jeu libère la souris et met la manche en pause automatiquement.

Le bouton `CLOSE` restaure tous les objets modifiés pendant la session. Si une
partie était en cours, le jeu redemande ensuite le pointer lock et reprend la
manche.

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

Les gizmos utilisent un pas de 5 cm pour le déplacement, 5 degrés pour la
rotation et 0,05 pour l'échelle. La visibilité et la couleur peuvent être
modifiées dans la section `BEFORE / AFTER`.

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

L'export contient l'état actuel de toutes les cibles de la salle, triées par
identifiant : position locale, quaternion, échelle et visibilité. `CLOSE`
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
