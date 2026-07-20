# Audit de cohérence des détails par salle

**État :** audit visuel et narratif des sept salles construites  
**Ordre :** chambre, salle de bain, couloir, bureau, cuisine, salle à manger,
salon

Ce document compare les objets réellement placés avec les textes d'examen et
les objectifs du mode Histoire. Les indices mesurables doivent toujours être
visibles avant les détails purement atmosphériques.

## Résumé des quantités

| Salle | État actuel | État recommandé |
|---|---:|---:|
| Salle de bain — brosses à dents | 2 | 4, dont une visuellement différente |
| Cuisine — chaises | 3 | 3, pour matérialiser la chaise absente |
| Cuisine — services | 3 | 4 services complets |
| Salle à manger — chaises à table | 6 | 4 |
| Salle à manger — assiettes | 4 | 4, déjà correct |

## 1. Chambre

### Prioritaire

- Remplacer l'intérieur générique de la photo familiale par quatre
  emplacements, avec Elise visiblement découpée ou effacée.
- Faire réellement apparaître `3:04` sur le cadran de la radio.
- Rendre la plante morte ou modifier le texte qui affirme que ses feuilles
  sont mortes.
- Donner au tableau l'image de la porte dont la poignée a été repeinte.

### Secondaire

- La télévision ne produit pas réellement le reflet décrit par le texte.
- Les livres ne permettent pas de voir la page `304`.

Une texture ou un plan ajouté par le runtime suffit pour la photo, le cadran et
le tableau. Blender n'est pas indispensable.

## 2. Salle de bain

### Prioritaire

- Le modèle `toothbrush_cup_decorated` contient deux brosses alors que le texte
  en annonce quatre.
- Ajouter deux brosses et rendre la quatrième légèrement différente : couleur
  délavée, humidité ou inclinaison spécifique.
- Conserver le nom de nœud `toothbrush_cup_decorated` lors du réexport Blender.

### Secondaire

- Graver `304` sous le canard.
- Donner à la bougie la cire inversée décrite par le texte.
- Ajouter sur le meuble vasque le tiroir sans joint portant le nom du joueur.

Le miroir est cohérent : aucune buée visible, seulement le message d'examen.

## 3. Couloir

### Déjà cohérent

- L'horloge reçoit un véritable affichage `03:04` au runtime.
- Le téléphone est visible et correspond à l'objectif.
- Les anomalies de rotation restent autorisées uniquement ici parmi les salles
  concernées par les restrictions actuelles.

### À améliorer

- Ajouter sous l'horloge l'inscription visible `SUBJECT 04 LEFT THIS WAY`.
- Les deux cadres peuvent recevoir de vraies images, mais ils ne portent aucun
  indice obligatoire pour le moment.

Un décal ou une petite texture suffit ; aucun changement Blender obligatoire.

## 4. Bureau

### Prioritaire

- La photo du bureau et les livres se chevauchent presque. Déplacer la photo
  vers un bord clairement visible du bureau.
- Ajouter à la photo une vraie ligne effacée et le nom `ELISE VALE`.
- Faire apparaître `3:04` sur le cadran de la radio.

### Aménagement

- Le fauteuil de la baie, son tapis et sa plante sont actuellement séparés dans
  trois zones. Les regrouper pour former un véritable coin lecture.

### Déjà cohérent

- L'horloge du bureau affiche réellement `03:04`.
- L'objectif vise la petite photo et non le bureau entier.

Les placements peuvent être réglés dans le Level Builder. Le contenu de la
photo peut être ajouté avec un plan texturé.

## 5. Cuisine

### Prioritaire

- Conserver exactement trois chaises autour de la table.
- Ajouter un quatrième service complet à l'ouest : assiette, tasse et nourriture.
- Ne pas ajouter de quatrième chaise. Le service sans chaise représente la
  place d'Elise et rend l'absence immédiatement compréhensible.
- Déplacer la plante appelée `window-plant` : elle se trouve actuellement au
  centre de la table et concurrence la corbeille de fruits.
- Ajouter un reçu visible dans la poubelle avec `03:04`, quatre petits-déjeuners
  servis et trois payés.

### Secondaire

- Ajouter un affichage montant au micro-ondes ou simplifier son texte.
- Les quatre portions du réfrigérateur peuvent rester textuelles tant que la
  porte ne peut pas être ouverte.

Les services sont créés par le code et ne nécessitent pas Blender.

## 6. Salle à manger

### Prioritaire

- Retirer `chair-west` et `chair-east` de la table principale.
- Garder les quatre chaises des coins, alignées avec les quatre assiettes déjà
  présentes.
- Ajouter une vraie étiquette `NOAH VALE` sur l'ours.
- Ajouter sur le buffet la marque de serrure en forme d'ours.
- Matérialiser l'ordre de suppression signé par Adrian avec un document visible.

### Désencombrement facultatif

- L'alcôve contient un banc et deux fauteuils. Garder le banc et un fauteuil,
  ou retirer le banc si les deux fauteuils sont conservés.

### Audio

- Le son des quatre voix est actuellement synthétique. Prévoir de véritables
  murmures ou adapter le texte si aucune voix enregistrée n'est ajoutée.

Les quatre assiettes et les deux bougies sont déjà cohérentes.

## 7. Salon

### Prioritaire

- Écrire réellement `NOAH // FOR ELISE` sur l'étiquette de la cassette.
- Remplacer la radio réutilisée par un véritable lecteur de cassette.
- Afficher une forme d'onde figée sur la télévision avant la révélation.
- Remplacer le son synthétique de Noah par une voix ou assumer une transmission
  très dégradée accompagnée des sous-titres.

### Ambiance et accessoires

- Donner à la cheminée une matière de pierre lisible, des bûches et des braises
  visibles cohérentes avec sa lumière orange.
- Donner à la photo familiale de l'étagère un contenu lié à Noah et Elise.

La disposition et le nombre de meubles ne contredisent pas l'histoire.

## Ordre de correction recommandé

1. Quatre brosses à dents dans la salle de bain.
2. Quatrième service sans chaise et déplacement de la plante dans la cuisine.
3. Quatre chaises autour de la table de la salle à manger.
4. Photos lisibles dans la chambre et le bureau.
5. Reçu, étiquette de l'ours et ordre de suppression.
6. Véritable lecteur de cassette dans le salon.
7. Petits détails `3:04`, inscriptions, forme d'onde et audio narratif.
