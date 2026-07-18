# Gate D Report

## Date

18 juillet 2026.

## Décision

- [x] Gate D validée ; la production du parcours multi-salles peut commencer.
- [ ] Gate D refusée.

Le propriétaire du projet a validé successivement la chambre finale, ses
assets, ses anomalies, son audio, son interface et les derniers ajustements de
lisibilité. La chambre sert désormais de référence technique et visuelle pour
les neuf salles suivantes.

## Pipeline validé

- chargement et libération d'assets GLB avec comptage des références ;
- séparation des racines visuelles et de collision ;
- cibles d'anomalie typées, snapshots et restauration exacte ;
- catalogue automatique et import JSON du Level Builder ;
- apparitions et disparitions dépendantes de la seed ;
- dépendances entre meubles supports et objets posés ;
- HUD, pause opaque, Game Over et victoire ;
- ambiance et signaux audio procéduraux ;
- build web et build standalone sans serveur.

## Ajustements issus du test propriétaire

- observation ramenée à 10 secondes ;
- déplacements automatiques supprimés car trop subtils ;
- rotations automatiques portées à ±30° ;
- objets posés masqués avec leur meuble support ;
- révélation de l'anomalie manquée au Game Over ;
- volumes audio séparés et réglés par défaut à 50 %.

## Contrôles techniques

La suite comporte 254 tests unitaires. TypeScript, ESLint, le build de
production et le build standalone sont validés. L'avertissement de taille du
chunk Three.js reste non bloquant à cette étape et devra être traité pendant la
phase d'optimisation.

## Décision de production

La Phase 6 commence par une route de salles et une difficulté entièrement
pilotées par les données. La salle de bain et le premier couloir seront ensuite
branchés sur ce socle avant la Gate E.
