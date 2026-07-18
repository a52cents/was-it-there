# Gate E Report

## Date

19 juillet 2026.

## État

- [ ] Gate E validée par le propriétaire du projet.
- [x] Validation automatique terminée ; parcours manuel demandé.
- [ ] Gate E refusée.

La chambre, la salle de bain et le premier couloir sont construits dans leur
ordre réel. Le troisième passage termine provisoirement la partie sur l’écran de
victoire tant que le bureau n’est pas encore raccordé.

## Préchargement validé automatiquement

- la chambre précharge la salle de bain pendant la manche ;
- la salle de bain précharge le premier couloir ;
- la salle chargée reste hors de la scène rendue jusqu’à la transition ;
- l’instance préparée est transférée sans reconstruire ses objets ;
- les collisions passent vers le nouveau monde actif ;
- les demandes simultanées d’une même salle sont regroupées ;
- une annulation ou un chargement en erreur libère la staging room ;
- les leases GLB survivent au transfert puis sont libérés au démontage ;
- un échec de préchargement retombe sur le chargement normal sous écran noir.

## Test manuel à effectuer

Lancer le projet :

```powershell
pnpm dev
```

Puis effectuer une partie continue :

1. terminer l’anomalie de la chambre et franchir sa porte ;
2. vérifier l’arrivée dans la salle de bain sans ancien meuble sélectionnable ;
3. terminer l’anomalie de la salle de bain et franchir sa porte ;
4. vérifier l’arrivée au début du couloir en L ;
5. trouver ses deux anomalies, franchir la dernière porte et vérifier l’écran
   `YOU GOT OUT` provisoire ;
6. confirmer l’absence d’erreur rouge dans la console du navigateur.

Pendant les deux transitions, vérifier également :

- écran noir complet, sans aperçu de l’ancienne salle ;
- aucune longue attente ou image figée ;
- joueur replacé au bon spawn et collisions immédiatement actives ;
- nouveau timer d’observation démarré une seule fois ;
- ambiance audio relancée une seule fois ;
- panneau debug `H` associé uniquement à la salle active.

## Décision attendue

Si ces contrôles passent, cocher `Gate E validée` puis commencer le bureau, salle
4 du parcours. Les packs locaux KayKit et Quaternius contiennent déjà l’essentiel
du mobilier nécessaire ; Poly Pizza ne devra servir qu’à compléter un objet
signature réellement manquant.
