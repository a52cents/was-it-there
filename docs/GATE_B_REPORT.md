# Gate B Report

## Date

16 juillet 2026

## Version testée

- Projet : `was-it-there` `0.1.0`.
- Révision : espace de travail fourni sans métadonnées Git, donc aucun hash de commit disponible.
- Navigateur de validation : Chrome `150.0.7871.116`, fenêtre `1280 × 720` puis `800 × 500`.
- Outils : pnpm `11.11.0`, Node.js `22.14.0`.
- Cible déclarée par le projet : Node.js `>=24 <25`. Toutes les commandes passent sous Node 22, mais une nouvelle exécution sous Node 24 reste recommandée avant publication.

## Résumé

Gate B est validée pour la base greybox actuelle. Le déplacement est contrôlable, les collisions principales sont stables, la circulation vers la porte de sortie est possible et les six cibles préparatoires sont lisibles depuis des positions accessibles.

Un défaut bloquant pour le confort a été découvert pendant l'audit : le joueur dérivait latéralement de `0,515 m` en avançant tout droit depuis le spawn. La cause était l'arête diagonale interne du collider de sol, interprétée par la résolution capsule/Octree comme une petite rampe. Le collider a été corrigé et un test de régression vérifie désormais une trajectoire droite.

Cette décision repose sur un audit interne automatisé et une session Chrome structurée. Elle ne remplace pas un test utilisateur humain externe.

## Déplacement

- Statut : **VALIDÉ**.
- Problèmes trouvés : dérive latérale de `0,515 m` sur une entrée avant pure ; panneau initial incomplet pour mesurer correctement delta, sous-étapes et vitesse horizontale.
- Corrections : surface physique du sol sans arête interne dans la zone jouable ; snapshot debug typé ; affichage de la vitesse horizontale, du delta, des FPS et des sous-étapes ; test de régression de trajectoire droite.
- Validation : vitesse normale `2,600 m/s`, vitesse rapide `3,800 m/s` avec `ShiftLeft` et `ShiftRight`, diagonale plafonnée à `2,600 m/s`, arrêt à `0,000 m/s`, yaw continu, pitch borné à environ `±1,521 rad`, aucun roll.
- Robustesse : aucun mouvement après `Échap`, perte du Pointer Lock ou changement d'onglet ; reprise sans vitesse résiduelle ; cinq resets successifs identiques.

## Collisions

- Statut : **VALIDÉ**.
- Problèmes trouvés : arête interne du sol responsable de la dérive ; ancienne cage capsule illisible car la caméra FPS se trouvait à l'intérieur.
- Corrections : triangle de sol physique unique et surdimensionné, avec proxy debug exact limité aux dimensions de la chambre ; helper capsule remplacé par son empreinte exacte au sol, tandis que début, fin et rayon restent affichés numériquement.
- Validation : sol stable, plafond présent, murs bloquants aux limites attendues, glissement tangentiel conservé, aucun tremblement ou `NaN` observé.
- Mobilier bloquant validé : lit, armoire et meuble TV.
- Portes fermées validées : entrée et sortie.
- Éléments non bloquants validés : chaise, lampe, plante, tableau, livres et décorations.

## Circulation

- Statut : **VALIDÉ**.
- Problèmes trouvés : aucun problème spatial nécessitant de déplacer un meuble.
- Corrections : aucune coordonnée de mobilier modifiée.
- Dimensions vérifiées : chambre `6,5 × 7,5 × 2,8 m`, ouvertures de porte `1,0 m`.
- Dégagements utiles : environ `0,98 m` entre le lit et le meuble TV, `1,03 m` entre l'armoire et la table de nuit, et `1,68 m` entre le lit et le mur est.
- Route principale testée : spawn → centre → côté est du lit → face de la porte de sortie. Position finale contre la porte : environ `(2,870, 0,000, -2,325)` sans pénétration.
- Télévision, plante, tableau, livres, lampe et chaise accessibles ou observables ; aucune zone nécessaire n'est bloquée.

## Lisibilité

- Statut : **VALIDÉ**.
- Problèmes trouvés : panneau debug initial trop haut et trop incomplet ; labels de la lampe et des livres susceptibles de se chevaucher ; helper capsule masquant la vue.
- Corrections : panneau compact à largeur bornée, labels alternés verticalement, empreinte capsule non intrusive, contrôle de remontage de salle et noms de cibles.
- La chambre est identifiable immédiatement grâce au lit, à l'armoire, à la table de nuit, à la lampe, au tableau, à la télévision et aux deux portes.
- Les six cibles minimales ont des identifiants uniques et des racines stables : `television`, `chair`, `plant`, `picture`, `lamp`, `books`.
- Les captures à `1280 × 720` et `800 × 500` confirment des silhouettes et couleurs distinctes. La chaise et la télévision deviennent immédiatement visibles en tournant la caméra vers la droite ; la plante, la lampe, les livres et le tableau sont visibles depuis le spawn ou un faible changement d'angle.

## Performances greybox

- Objets visuels : `55` meshes.
- Objets de collision : `15` colliders.
- Cibles d'observation : `6`.
- Mesures normales observées selon le champ de caméra : jusqu'à `52` draw calls et `1 272` triangles.
- Mesure avec les collisions debug affichées : environ `62` draw calls et `1 224` triangles dans la vue testée.
- Budget de référence : moins de `150` draw calls et `250 000` triangles.
- Build standalone : JavaScript `572,40 kB`, `144,23 kB` gzip ; CSS `1,72 kB`, `0,77 kB` gzip.
- Aucun rebuild de géométrie par frame. Les matériaux sont partagés. Les compteurs de meshes sont calculés au montage au lieu de traverser la scène à chaque frame. Seules les six cibles sont projetées par frame quand leurs labels debug sont explicitement activés.
- Le warning Vite sur le chunk JavaScript supérieur à `500 kB` demeure non bloquant : le bundle gzip reste très inférieur au budget et aucune nouvelle dépendance n'a été ajoutée.

## Tests exécutés

### Automatisés

- `pnpm typecheck` : succès.
- `pnpm lint` : succès.
- `pnpm test` : `13` fichiers, `129` tests réussis.
- `pnpm build:standalone` : succès.
- Joueur : vitesses, diagonales, accélération/décélération, reset répété, valeurs finies, synchronisation caméra/capsule, absence de mouvement sans Pointer Lock, absence de vitesse résiduelle, trajectoire droite sans dérive.
- Salle : montage unique, démontage, remontage, nombres stables, six cibles stables, porte de sortie renouvelée, anciennes références détachées, géométries et matériaux disposés puis recréés.
- Collisions : spawn sans pénétration, sol, plafond, mur, coin, glissement, portes fermées, route principale vers la sortie, petits objets non bloquants, aucune valeur `NaN`.
- Boucle : pas fixe `1/60 s`, maximum de cinq sous-étapes, delta borné à `100 ms`, rendu unique, démarrage idempotent, consommation souris unique par frame.
- Build public inspecté : aucune chaîne `GATE B DEBUG`, aucun contrôle de remontage, aucun label et aucun helper debug présents dans `dist/`.

### Manuels structurés dans Chrome

- Lancement réel de `pnpm dev`, chargement HTTP réussi.
- Clic réel sur `PLAY` et acquisition réelle du Pointer Lock.
- `WASD`, `ZQSD`, flèches, diagonales, `ShiftLeft`, `ShiftRight`, changements rapides de direction.
- Rotation souris horizontale/verticale et bornes du pitch.
- `Échap` en mouvement, reprise, changement d'onglet en mouvement, retour et reprise.
- CPU throttling `×6`, frames avec jusqu'à cinq sous-étapes et delta observé de `83,3 ms`, sans saut de position.
- Murs nord, sud, est et ouest ; glissement ; lit ; armoire ; meuble TV ; porte d'entrée ; porte de sortie ; passage à travers la chaise non bloquante.
- Trois remontages successifs de la salle, compteurs stables et absence d'erreur console.
- Affichage des collisions, de l'empreinte capsule et des six noms de cibles.
- Vues de lisibilité depuis le spawn, vers la droite, vers la gauche et dans une fenêtre `800 × 500`.
- Console : aucune erreur pendant la session normale.

## Problèmes restants

- L'environnement local utilise Node.js 22 alors que le projet verrouille Node.js 24. Les validations doivent être rejouées sous Node 24 avant publication, sans que cela bloque Gate B sur le comportement greybox.
- Le warning de taille de chunk Vite reste présent, principalement lié au bundle Three.js monolithique ; aucune régression mesurable du greybox n'en résulte.
- La fluidité et l'éventuelle nausée n'ont pas été évaluées par un humain externe. L'audit interne constate un FOV de `70`, aucune oscillation de tête, aucun roll, aucun motion blur et des vitesses modérées, mais ne prétend pas remplacer ce test.
- La session couvre Chrome desktop. La matrice multi-navigateurs et mobile appartient aux validations ultérieures prévues par la roadmap.

## Décision

- [x] Gate B validée
- [ ] Gate B refusée

## Justification

Les quatre axes sont satisfaits dans le périmètre de la Phase 2 : déplacement réactif et stable, collisions fiables, circulation complète vers la sortie et chambre/cibles lisibles. Le défaut de dérive découvert pendant l'audit est corrigé et couvert. Les ressources sont renouvelées sans réutiliser les anciennes références, les compteurs restent stables après remontage, le debug est absent du build public et toutes les validations obligatoires passent.

La future boucle d'observation paraît viable sur cette base. Aucune mécanique de Phase 3 n'a été commencée.
