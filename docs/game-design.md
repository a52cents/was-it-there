# WAS IT THERE?

## Game Design One-Page — Version 1.0

### 1. Concept

**Was It There?** est un jeu d’observation 3D en vue subjective dans lequel le joueur traverse une maison pièce après pièce.

Dans chaque pièce, il dispose d’un court temps pour observer l’environnement. Les lumières s’éteignent, puis une ou plusieurs anomalies apparaissent. Le joueur doit toutes les identifier avant la fin du temps pour ouvrir la porte suivante et progresser vers la sortie.

### 2. Pitch

> Observe la pièce.\
> Les lumières s’éteignent.\
> Quelque chose a changé.\
> Trouve toutes les anomalies et atteins la sortie.

### 3. Objectif principal

Traverser les dix pièces de la maison et ouvrir la porte de sortie.

La partie possède donc une vraie fin :

1.  Le joueur commence dans une chambre.
2.  Il traverse progressivement les différentes pièces de la maison.
3.  Chaque salle réussie ouvre l’accès à la suivante.
4.  La dixième salle mène au hall d’entrée.
5.  La porte principale s’ouvre.
6.  Le joueur sort de la maison.
7.  Son temps final et ses résultats sont affichés.

Écran de victoire :

> **YOU GOT OUT**\
> Temps total\
> Erreurs\
> Précision\
> Meilleure série\
> Rang obtenu

### 4. Boucle de gameplay

Pour chaque pièce :

1.  Le joueur entre dans la pièce.
2.  La porte derrière lui se ferme.
3.  Une phase d’observation commence.
4.  Le joueur peut explorer librement.
5.  Un signal sonore annonce la fin de l’observation.
6.  Les lumières s’éteignent brièvement.
7.  Une ou plusieurs anomalies sont appliquées.
8.  Les lumières reviennent.
9.  Le joueur recherche les changements.
10. Il vise un objet et clique pour le signaler.
11. Toutes les anomalies trouvées ouvrent la porte suivante.
12. Une erreur retire une vie ou ajoute une pénalité de temps.
13. Le joueur continue jusqu’à la sortie ou jusqu’au Game Over.

### 5. Structure de la maison

La progression suit un parcours cohérent à travers une maison.

| Salle  | Environnement         | Difficulté     |
|--------|-----------------------|----------------|
| 1      | Chambre               | Introduction   |
| 2      | Salle de bain         | Facile         |
| 3      | Couloir               | Facile         |
| 4      | Bureau                | Modérée        |
| 5      | Cuisine               | Modérée        |
| 6      | Salle à manger        | Modérée        |
| 7      | Salon                 | Difficile      |
| 8      | Buanderie ou débarras | Difficile      |
| 9      | Couloir d’entrée      | Très difficile |
| 10     | Hall principal        | Finale         |
| Sortie | Extérieur             | Victoire       |

Les pièces ne sont pas choisies aléatoirement dans le mode principal. Leur ordre reste identique afin que les temps des joueurs soient comparables.

Les anomalies, elles, changent à chaque partie.

La seed peut aussi retirer un accessoire de la configuration observée au début
d'une salle. Cet objet absent fait partie de l'état de référence de la manche :
il ne devient une anomalie que s'il apparaît pendant le blackout.

### 6. Progression de la difficulté

| Salles | Nombre d’anomalies | Observation |   Recherche |
|--------|-------------------:|------------:|------------:|
| 1–2    |                  1 | 10 secondes | 30 secondes |
| 3–4    |              1 à 2 | 15 secondes | 30 secondes |
| 5–6    |                  2 | 13 secondes | 28 secondes |
| 7–8    |              2 à 3 | 11 secondes | 25 secondes |
| 9      |                  3 | 10 secondes | 22 secondes |
| 10     |              3 à 4 | 10 secondes | 25 secondes |

Les valeurs pourront être ajustées après les tests.

### 7. Types d’anomalies du MVP

Le MVP utilise uniquement des anomalies visuelles simples et fiables.

- Objet disparu.
- Objet apparu.
- Objet déplacé.
- Objet tourné.
- Objet redimensionné légèrement.
- Couleur d’un objet modifiée.
- Texture ou image remplacée.
- Lampe allumée ou éteinte.
- Porte, tiroir ou placard ouvert ou fermé.
- Objet dupliqué.

Chaque anomalie doit respecter trois règles :

1.  Elle doit être visible depuis une position accessible.
2.  Elle ne doit pas être ambiguë.
3.  Elle doit être suffisamment perceptible sans être évidente.

### 8. Sélection des anomalies

Le jeu ne doit jamais générer deux anomalies incompatibles sur le même objet.

Exemples interdits :

- déplacer puis supprimer le même objet ;
- modifier la couleur d’un objet caché ;
- faire apparaître un objet à l’intérieur d’un meuble ;
- choisir une anomalie invisible depuis la zone jouable.

Chaque objet possède une liste d’anomalies autorisées.

Exemple :

    Télévision
    - rotation
    - déplacement
    - écran différent
    - disparition
    - allumée / éteinte

### 9. Signalement d’une anomalie

Le joueur vise l’objet avec le réticule et clique.

Si l’objet est bien concerné :

- son contour apparaît brièvement ;
- un son positif est joué ;
- le compteur d’anomalies diminue ;
- l’objet ne peut plus être sélectionné.

Si l’objet est incorrect :

- un son négatif est joué ;
- l’écran réagit brièvement ;
- une erreur est comptabilisée ;
- une pénalité est appliquée.

Le joueur voit uniquement :

    Anomalies restantes : 2
    Temps : 18

Il ne connaît pas la nature des anomalies.

### 10. Victoire et défaite

#### Victoire

Le joueur trouve toutes les anomalies des dix salles et franchit la porte principale.

#### Défaite

La partie se termine après trois erreurs.

Au Game Over, le jeu révèle l'anomalie manquée en orientant la caméra vers son
emplacement, en l'encadrant en rouge et en indiquant le nom de l'objet ainsi
que la nature du changement.

Une erreur peut être :

- sélectionner un objet qui n’a pas changé ;
- laisser le temps expirer ;
- quitter une salle sans avoir trouvé toutes les anomalies.

### 11. Score et classement

Le classement principal repose sur le temps total nécessaire pour terminer les dix salles.

Des pénalités sont ajoutées :

- mauvaise sélection : +5 secondes ;
- temps expiré : +15 secondes ;
- indice utilisé : +10 secondes.

Classements prévus :

- Meilleur temps global.
- Meilleur temps sans erreur.
- Meilleur temps par salle.
- Nombre de parcours terminés.
- Série de parcours parfaits.

Pour le MVP local, seul le meilleur temps est enregistré dans le navigateur.

Le classement mondial viendra après validation du jeu.

### 12. Speedrun

Le mode principal est directement compatible avec le speedrun :

- même ordre de salles ;
- même nombre total de manches ;
- chronomètre visible ;
- anomalies aléatoires mais contrôlées ;
- temps final précis ;
- écran de résultats partageable.

Deux catégories pourront exister plus tard :

- **Random Seed** : anomalies aléatoires.
- **Daily Seed** : même parcours pour tous les joueurs pendant 24 heures.

### 13. Contrôles

#### Ordinateur

- `ZQSD` ou `WASD` : déplacement.
- Souris : caméra.
- Clic gauche : signaler un objet.
- `Échap` : menu.
- `Shift` : marche rapide légère.

Pas de saut.

Pas d’accroupissement.

Pas de course complexe.

#### Mobile

- Joystick virtuel à gauche.
- Glissement à droite pour regarder.
- Bouton principal pour signaler.
- Assistance légère à la sélection des petits objets.

### 14. Direction artistique

- 3D low-poly propre.
- Intérieurs légèrement stylisés.
- Formes lisibles.
- Palette chaleureuse au début.
- Atmosphère progressivement plus froide vers la sortie.
- Éclairage mystérieux mais suffisamment clair pour observer.
- Aucun gore.
- Aucun jumpscare obligatoire.
- Interface minimaliste.

L’ambiance doit créer du doute, pas de la peur intense.

### 15. Son

Le son sert principalement au feedback.

- Ambiance discrète de maison.
- Bruit de lumière avant le changement.
- Extinction électrique courte.
- Son positif lors d’une bonne réponse.
- Son sec lors d’une erreur.
- Porte qui se déverrouille.
- Ambiance extérieure lors de la victoire.

Pas de doublage.

Pas de dialogues.

### 16. Mode principal du MVP

Le MVP contient uniquement :

> **ESCAPE — Traverse les dix salles et atteins la sortie.**

Le mode Endless ne fait pas partie du premier développement.

Il pourra être ajouté plus tard avec :

- salles répétées ;
- difficulté progressive ;
- trois erreurs maximum ;
- classement basé sur le nombre de salles réussies.

### 17. Contenu du premier prototype

Le premier prototype greybox contient :

- une seule chambre ;
- déplacement FPS ;
- caméra ;
- collisions ;
- phase d’observation ;
- extinction des lumières ;
- trois types d’anomalies ;
- sélection des objets ;
- chronomètre ;
- erreurs ;
- passage à une seconde salle factice.

Ce prototype doit confirmer que la boucle est amusante avant de produire les dix environnements.

### 18. Hors périmètre du MVP

Ne pas développer pendant la première version :

- histoire détaillée ;
- personnages ;
- ennemis ;
- monstres ;
- intelligence artificielle ;
- combat ;
- multijoueur ;
- inventaire ;
- énigmes classiques ;
- comptes utilisateurs ;
- éditeur de salles ;
- boutique ;
- objets cosmétiques ;
- mode Endless ;
- application mobile native ;
- version Steam.

### 19. Critères de réussite du prototype

Le prototype est validé si :

- le concept est compris sans longue explication ;
- les déplacements sont agréables sur ordinateur ;
- la sélection des objets est précise ;
- aucune anomalie n’est impossible ;
- le joueur souhaite immédiatement refaire une manche ;
- une session de test dure naturellement au moins cinq minutes ;
- le jeu reste fluide sur un ordinateur moyen ;
- la boucle fonctionne sans serveur.

### 20. Identité

**Titre :** Was It There?\
**Nom du dépôt :** `was-it-there`\
**Genre :** Observation 3D / Puzzle / Mémoire\
**Perspective :** Première personne\
**Plateformes visées :** navigateur ordinateur et mobile\
**Première plateforme commerciale visée :** CrazyGames\
**Accroche :**

> **Was it there before the lights went out?**
