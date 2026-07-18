# Catalogue d'anomalies de la chambre

La chambre possède 14 objets jouables. Chacun dispose automatiquement de :

- une disparition `hide` ;
- une apparition `show` avec absence déterminée par la seed pendant
  l'observation ;
- deux couleurs préparées et filtrées sur les matériaux utiles.

Les variantes automatiques de déplacement `shifted-*` et `moved-*` ont été
retirées après test en jeu, car elles étaient trop subtiles. Le type `move`
reste disponible dans le Level Builder pour créer plus tard un déplacement
manuel volontairement évident.

Les rotations automatiques utilisent ±30° et uniquement lorsqu'elles sont
visuellement lisibles sans devenir absurdes. Les murs, portes, fenêtres,
radiateurs et éléments de progression ne sont pas des cibles d'anomalie.

| Objet | Rotation | Couleurs |
| --- | --- | --- |
| Télévision | ±30° autour de Y | violet, ambre |
| Chaise | ±30° autour de Y | bleu, ocre |
| Plante | aucune, silhouette trop symétrique | violet, ambre |
| Tableau | ±30° autour de Z | bleu, orange |
| Lampe | aucune, silhouette trop symétrique | violet, bleu |
| Livres | ±30° autour de Y | jaune, violet |
| Lit | aucune, meuble massif | bleu, beige |
| Armoire | aucune, meuble massif adossé au mur | bois foncé, bois clair |
| Table de nuit | ±30° autour de Y | bleu, bois foncé |
| Meuble TV | aucune, meuble adossé au mur | olive, rouge |
| Tapis | ±30° autour de Y | bleu, beige |
| Bibliothèque basse | aucune, meuble adossé au mur | bleu, crème |
| Radio | ±30° autour de Y | rouge, bleu |
| Cadre photo | ±30° autour de Y | bleu, violet |

Cela produit 72 variantes automatiques : 56 variantes communes et 16
rotations supplémentaires. Le catalogue JSON d'authoring est actuellement vide,
donc le jeu expose exactement ces 72 variantes.

Les collisions du lit, de l'armoire et du meuble TV suivent leurs déplacements,
disparaissent avec eux et sont reconstruites dans l'Octree. Leur restauration
replace à la fois le modèle, le volume d'interaction et le collider à son état
canonique.

Les objets posés sur un meuble suivent également leur support :

- table de nuit → lampe et livres ;
- meuble TV → télévision ;
- bibliothèque basse → radio et cadre photo.

Si le support est absent pendant l'observation ou disparaît comme anomalie, ses
objets dépendants sont masqués et ne peuvent pas être ciblés dans le vide. Ils
réapparaissent avec lui et accompagnent aussi ses déplacements ou rotations.
Chaque objet dépendant conserve néanmoins ses propres anomalies lorsque son
support est présent.
