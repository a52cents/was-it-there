# Registre des assets externes

Ce registre est la source de vérité pour les licences des assets intégrés au
projet. Un fichier externe ne doit pas entrer dans le build sans apparaître ici.

## Kenney — Furniture Kit

- Nom : Furniture Kit.
- Créateur : Kenney.
- Source : <https://kenney.nl/assets/furniture-kit>.
- Licence : Creative Commons Zero 1.0 Universal (CC0).
- Texte de licence archivé :
  [`docs/licenses/kenney-furniture-kit.txt`](./licenses/kenney-furniture-kit.txt).
- Date de récupération : 18 juillet 2026.
- Archive source : `kenney_furniture-kit.zip`, `5 130 729` octets.
- SHA-256 de l’archive source :
  `E67652D0932CEE41683F74711C03D3E192A2AF9979EF8E6B237711F5482D46B0`.
- Modifications actuelles : fichiers GLB sélectionnés et renommés selon les
  conventions du projet ; géométries et fichiers sources inchangés. À
  l’exécution, les copies de matériaux reçoivent la palette chaude et désaturée
  du projet, avec tissus mats, bois légèrement verni et métaux peu réfléchissants.
- Salles utilisées : chambre et premier couloir ; certains meubles pourront
  être réutilisés dans les salles suivantes.
- Format : GLB autonome avec textures intégrées.

La source contient 140 modèles. Seuls les 25 modèles nécessaires à la chambre,
à ses objets de distraction et au premier couloir ont été conservés. La
sélection locale représente `287 624` octets et `3 626` triangles. Les onze
fichiers propres au couloir représentent `123 640` octets et `1 462` triangles.

| Fichier local | Fichier source | Usage prévu | Triangles |
|---|---|---|---:|
| `src/assets/models/bedroom/prop-bed-double.glb` | `bedDouble.glb` | lit et literie principale | 264 |
| `src/assets/models/bedroom/prop-pillow-warm.glb` | `pillow.glb` | oreiller normal | 50 |
| `src/assets/models/bedroom/prop-pillow-blue.glb` | `pillowBlue.glb` | variante d’anomalie d’oreiller | 50 |
| `src/assets/models/bedroom/prop-wardrobe.glb` | `bookcaseClosedDoors.glb` | armoire | 296 |
| `src/assets/models/bedroom/prop-nightstand.glb` | `cabinetBedDrawerTable.glb` | table de nuit | 140 |
| `src/assets/models/bedroom/prop-table-lamp.glb` | `lampRoundTable.glb` | lampe de chevet | 76 |
| `src/assets/models/bedroom/prop-chair-cushion.glb` | `chairCushion.glb` | chaise | 198 |
| `src/assets/models/bedroom/prop-television.glb` | `televisionModern.glb` | télévision | 72 |
| `src/assets/models/bedroom/prop-tv-cabinet.glb` | `cabinetTelevision.glb` | meuble TV | 154 |
| `src/assets/models/bedroom/prop-plant-small.glb` | `plantSmall2.glb` | plante | 158 |
| `src/assets/models/bedroom/prop-books-stack.glb` | `books.glb` | livres | 62 |
| `src/assets/models/bedroom/prop-rug-rectangle.glb` | `rugRectangle.glb` | tapis et repère visuel | 28 |
| `src/assets/models/bedroom/prop-bookcase-low.glb` | `bookcaseOpenLow.glb` | meuble secondaire sélectionnable | 184 |
| `src/assets/models/bedroom/prop-radio.glb` | `radio.glb` | objet secondaire sélectionnable | 432 |
| `src/assets/models/corridor/prop-console.glb` | `sideTableDrawers.glb` | console du couloir | 238 |
| `src/assets/models/corridor/prop-bench.glb` | `benchCushionLow.glb` | banc du couloir | 138 |
| `src/assets/models/corridor/prop-wall-lamp.glb` | `lampWall.glb` | applique murale | 42 |
| `src/assets/models/corridor/prop-potted-plant.glb` | `pottedPlant.glb` | plante au bout du couloir | 60 |
| `src/assets/models/corridor/prop-runner-rug.glb` | `rugDoormat.glb` | tapis central | 204 |
| `src/assets/models/corridor/prop-coat-stand.glb` | `coatRackStanding.glb` | porte-manteau sur pied | 190 |
| `src/assets/models/corridor/prop-wall-hooks.glb` | `coatRack.glb` | patères de la seconde section | 132 |
| `src/assets/models/corridor/prop-side-table.glb` | `sideTable.glb` | petite table de la seconde section | 118 |
| `src/assets/models/corridor/prop-small-speaker.glb` | `speakerSmall.glb` | enceinte posée sur la petite table | 220 |
| `src/assets/models/corridor/prop-parcel-open.glb` | `cardboardBoxOpen.glb` | carton ouvert | 60 |
| `src/assets/models/corridor/prop-parcel-closed.glb` | `cardboardBoxClosed.glb` | carton fermé | 60 |

### Validation avant intégration

- Licence commerciale et modification : autorisées par CC0.
- Style : low-poly cohérent ; palette harmonisée pendant l’intégration.
- Taille : aucun fichier ne dépasse 26 Ko.
- Géométrie : 28 à 432 triangles par modèle dans cette sélection.
- Textures : une texture intégrée par GLB ; aucun fichier 4K externe.
- Pivots et nœuds : présents et nommés dans les fichiers source ; le pipeline
  devra les résoudre par noms déclarés et jamais par UUID Three.js.
- Collisions : les silhouettes permettent des volumes simplifiés séparés.
- Cohérence : une source principale unique évite le mélange de styles.

Le réveil reste prévu avec les formes et matériaux du projet. Le tableau mural
utilise désormais le cadre KayKit enregistré ci-dessous.

## KayKit — Furniture Bits 1.0 Free

- Nom : Furniture Bits.
- Version : 1.0 Free.
- Créateur : Kay Lousberg / KayKit.
- Source officielle :
  <https://www.kaylousberg.com/game-assets/furniture-bits>.
- Licence : Creative Commons Zero 1.0 Universal (CC0), usage personnel et
  commercial autorisé sans attribution obligatoire.
- Notice de licence et de provenance archivée :
  [`docs/licenses/kaykit-furniture-bits.txt`](./licenses/kaykit-furniture-bits.txt).
- Date de réception : 18 juillet 2026.
- Source locale reçue : dossier glTF fourni par le propriétaire du projet,
  accompagné des fichiers BIN et de la texture atlas commune.
- Modifications actuelles : `pictureframe_large_B.gltf` et
  `pictureframe_standing_A.gltf`, leurs BIN et la texture commune
  `furniturebits_texture.png` ont été regroupés en deux GLB autonomes. Les GLB
  restent inchangés ; leurs copies de matériaux sont légèrement réchauffées et
  rendues plus mates à l’exécution.
- SHA-256 de `prop-picture-frame.glb` :
  `4FBA3862719F157C44506145C9467186F347DA2FC35E40FA523EEA7F6D3F4174`.
- SHA-256 de `prop-photo-frame.glb` :
  `F72EA7105485363912F60261ECA98012E11E110D8896B377F152D72D605570F8`.
- Salles utilisées : chambre et premier couloir, qui réutilise les deux cadres
  sans dupliquer leurs fichiers.
- Format de production : GLB autonome avec texture intégrée.

Les deux modèles retenus totalisent 134 triangles et `41 196` octets. Chaque GLB
embarque l’atlas PNG de `1024 × 1024`. Les autres fichiers du dossier source ne
sont pas référencés par le catalogue Vite et ne sont donc pas émis dans le build
à cette étape.

| Fichier local | Fichier source | Usage | Triangles |
|---|---|---|---:|
| `src/assets/models/bedroom/prop-picture-frame.glb` | `pictureframe_large_B.gltf` | tableau mural et cible d’anomalie | 60 |
| `src/assets/models/bedroom/prop-photo-frame.glb` | `pictureframe_standing_A.gltf` | petit cadre photo décoratif | 74 |

## Poly Pizza — compléments du premier couloir

Trois modèles GLB ont été récupérés individuellement sur Poly Pizza le
18 juillet 2026. Ils restent inchangés sur disque ; le runtime ne modifie que
les copies de matériaux afin d’harmoniser leur palette avec le couloir.

La mention « Creative Commons Attribution » affichée par Poly Pizza ne précise
pas de numéro de version. Par prudence, les deux attributions concernées doivent
rester visibles dans le registre et dans les crédits distribués avec le jeu.
La notice de provenance prête à être reprise dans les crédits est archivée dans
[`docs/licenses/poly-pizza-corridor-assets.txt`](./licenses/poly-pizza-corridor-assets.txt).

| Fichier local | Modèle, auteur et source | Licence indiquée | Taille | Triangles | SHA-256 |
|---|---|---|---:|---:|---|
| `src/assets/models/corridor/prop-office-phone.glb` | [Office Phone](https://poly.pizza/m/YxfMuchpUF), dook | Creative Commons Attribution | `362 728` o | 5 216 | `3F6991E0B463DE5391EF44963E6D0A504DBE5092AF0BA8A39028344B7CF76107` |
| `src/assets/models/corridor/prop-wall-clock.glb` | [Analog clock](https://poly.pizza/m/5gAoMR2YHs3), Poly by Google | Creative Commons Attribution | `13 656` o | 588 | `0EB1148843FC9FB9A564DCCAF1F892026CE01D24C4256701E8943F0539394822` |
| `src/assets/models/corridor/prop-boots.glb` | [Boots](https://poly.pizza/m/7XCvej7wZU), Isa Lousberg | Public Domain (CC0) | `46 420` o | 644 | `09B6F7350EFDF675B88F16713B89D815C568A3440D3985C47CF34FB9205FE1CA` |

Les trois fichiers totalisent `422 804` octets et `6 448` triangles. Les pages
sources annoncent des formats glTF compatibles avec le pipeline du projet.

## Tiny Treats — Bubbly Bathroom 1.1

- Nom : Bubbly Bathroom.
- Version : 1.1 Free.
- Créatrice : Isa Lousberg / Tiny Treats.
- Source locale : `pre-assets/Tiny_Treats_Bubbly_Bathroom_1.1_FREE`.
- Licence : Creative Commons Zero 1.0 Universal (CC0), usage personnel,
  éducatif et commercial autorisé ; attribution facultative.
- Notice archivée :
  [`docs/licenses/tiny-treats-bubbly-bathroom.txt`](./licenses/tiny-treats-bubbly-bathroom.txt).
- Date d’intégration : 18 juillet 2026.
- Salle utilisée : salle de bain.
- Format de production : collection GLB autonome avec texture intégrée.

Les 17 objets retenus — baignoire, meuble vasque, miroir, toilettes, tapis,
étagère et accessoires — ont été regroupés dans
`src/assets/models/bathroom/bathroom-collection.glb`. Le regroupement conserve
les noms de nœuds utiles au runtime et déduplique l’atlas commun : la collection
ne charge donc qu’un matériau et une texture pour toute la pièce.

- Taille : `386 112` octets.
- Géométrie : 19 meshes, `9 710` triangles.
- SHA-256 :
  `3C702CA07C8F0278115D1E288635C5BC46896DA1008797E6E72451BB5FA34538`.
- Modifications runtime : matériaux rendus plus mats et légèrement désaturés,
  ombres activées, placement et échelle normalisés par le runtime de salle.

## Source évaluée — Quaternius Ultimate House Interior Pack

Le pack FBX fourni dans `pre-assets/2nd pack` est conservé pour de futures
salles, mais aucun de ses modèles n’est actuellement référencé par le build.
La source et sa licence CC0 sont archivées dans
[`docs/licenses/quaternius-ultimate-house-interior-pack.txt`](./licenses/quaternius-ultimate-house-interior-pack.txt).
Tiny Treats a été retenu pour cette salle afin de garder une direction visuelle
unique et d’éviter un second pipeline FBX.

## Réutilisation — bureau

Le bureau n’ajoute aucun fichier 3D au build. Ses dix-huit instances réutilisent
les GLB déjà référencés de la chambre et du premier couloir : mobilier Kenney,
cadres et accessoires KayKit, ainsi que le téléphone et l’horloge Poly Pizza
déjà attribués ci-dessus. Les identifiants d’assets restent identiques afin que
le cache partage les sources pendant le préchargement du bureau.

## Réutilisation — cuisine

La cuisine utilise dix-neuf GLB supplémentaires extraits de l’archive locale
Kenney Furniture Kit déjà enregistrée ci-dessus. La sélection comprend les
meubles bas et hauts, l’évier, le réfrigérateur, la cuisinière, la hotte,
l’îlot, le coin repas, les luminaires et les petits accessoires. Aucun asset
externe supplémentaire ni aucune ressource Poly Pizza n’a été nécessaire.

Les fichiers sont conservés dans `src/assets/models/kitchen/` sous des noms
alignés sur les conventions du projet. Ils totalisent `249 704` octets et
restent inchangés sur disque ; seule leur palette est harmonisée au runtime.

## Réutilisation — salle à manger

La salle à manger utilise dix GLB supplémentaires extraits de l’archive locale
Kenney Furniture Kit déjà enregistrée ci-dessus. Cette sélection distincte
comprend une table nappée, une chaise moderne, un buffet, un tapis arrondi, un
ventilateur de plafond et le mobilier complet de l’alcôve. Aucun nouvel asset
externe ni aucune ressource Poly Pizza n’a été nécessaire.

Les fichiers sont conservés dans `src/assets/models/dining-room/`. Ils totalisent
`128 820` octets et restent inchangés sur disque ; le runtime ajuste uniquement
leur palette, leur orientation et leur taille dans la pièce.

## Poly Haven — Kloppenheim 07 Pure Sky HDRI

- Asset : Kloppenheim 07 (Pure Sky).
- Auteurs : Greg Zaal (original) et Jarod Guest (édition du ciel).
- Source : https://polyhaven.com/a/kloppenheim_07_puresky
- Licence : Creative Commons Zero 1.0 Universal (CC0).
- Fichier local : `src/assets/environment/kloppenheim-07-pure-sky-1k.hdr`.
- Résolution de production : 1K HDR, choisie pour limiter le poids du build web.
- Taille : `1 282 823` octets.
- SHA-256 :
  `C18AA40364D1B5AA788F309F1C64D891C386E6F8E7D958C329F7470489E04F8A`.
- Usage : ciel nocturne couvert, vue extérieure des fenêtres et éclairage
  indirect très léger contrôlé par les blackouts et la pression de la maison.
