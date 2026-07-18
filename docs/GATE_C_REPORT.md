# Gate C Report

## Date

18 juillet 2026.

## Décision

- [x] Gate C validée avec retours à intégrer en Phase 5.
- [ ] Gate C refusée.

Le propriétaire du projet a confirmé que la boucle greybox complète fonctionne
et a demandé de passer aux phases suivantes. La compréhension générale et la
justesse des anomalies sont suffisantes pour ne plus bloquer la production de la
première salle finale.

## Retours du test interne

- La chambre est mémorisable, mais manque encore d’éléments distinctifs.
- Les anomalies sont généralement perçues comme justes.
- La consigne et le timer doivent apparaître en grand au début, puis se réduire
  dans un coin pendant la partie.
- Le déplacement fonctionne, mais doit devenir plus fluide ; le saut et
  l’accroupissement sont demandés.
- La durée d’observation convient.
- La recherche manque encore de tension.
- Le sens de « recommencer immédiatement » n’était pas clair. Pour la suite, ce
  critère signifie : après un échec ou une victoire, une nouvelle manche doit
  pouvoir commencer en un clic, sans recharger la page ni conserver l’état de
  la manche précédente.
- Les objets plausibles de la pièce doivent pouvoir être visés et signalés,
  même lorsqu’ils ne peuvent pas devenir l’anomalie ; un mauvais objet doit
  produire une erreur explicite.

## Tests abandonnés à la demande du propriétaire

La campagne externe supplémentaire de la section 8.2 et la collecte détaillée
par testeur de la section 8.3 ne seront pas réalisées pour ce prototype. Ce
rapport ne leur attribue donc aucun résultat fictif.

## Routage des corrections

- Étapes 5.1 et 5.3 : enrichir la chambre et ajouter des objets secondaires.
- Avant Gate D : améliorer la fluidité et ajouter saut/accroupissement sans
  casser les collisions ni le rythme de mémorisation.
- Étapes 5.3 et 5.4 : séparer les objets signalables des objets autorisés à
  devenir des anomalies.
- Étape 5.5 : grande présentation initiale de la consigne et du timer, puis HUD
  compact.
- Étape 5.6 : renforcer la tension par l’ambiance et les signaux temporels.

## Risque accepté

Gate C est franchie sur une validation propriétaire et non sur un panel externe.
Ce choix accélère la production, mais les critères de compréhension et d’envie
de rejouer devront être réévalués avant publication.
