# WAS IT THERE?

## Asset List — Version 1.0

**Statut :** liste d’assets verrouillée pour le prototype et le MVP\
**Projet :** `was-it-there`\
**Documents associés :**

- `GAME_DESIGN_ONE_PAGE.md`
- `TECHNICAL_BIBLE.md`
- `ART_DIRECTION.md`

------------------------------------------------------------------------

## 1. Objectif

Ce document définit les assets nécessaires pour produire :

1.  le prototype greybox ;
2.  la première version complète du jeu ;
3.  les éléments de publication sur les plateformes web.

Le projet doit réutiliser un maximum d’éléments entre les salles afin de :

- réduire le temps de production ;
- conserver une direction artistique cohérente ;
- limiter la taille du téléchargement ;
- faciliter l’ajout d’anomalies ;
- éviter de chercher un asset différent pour chaque objet.

------------------------------------------------------------------------

## 2. Principes généraux

### 2.1 Priorité au gameplay

Un asset est utile uniquement s’il participe à au moins une fonction :

- rendre la salle identifiable ;
- servir de cible d’anomalie ;
- guider le joueur ;
- renforcer la cohérence de la maison ;
- améliorer la lisibilité.

Les décorations sans fonction claire doivent rester limitées.

### 2.2 Réutilisation

Les éléments suivants doivent être réutilisés dans plusieurs salles :

- portes ;
- poignées ;
- fenêtres ;
- interrupteurs ;
- prises électriques ;
- plinthes ;
- encadrements ;
- lampes ;
- cadres ;
- plantes ;
- horloges ;
- livres ;
- tapis ;
- petits objets domestiques.

### 2.3 Cohérence

Les assets doivent partager :

- un niveau de détail similaire ;
- une échelle cohérente ;
- des matériaux compatibles ;
- des proportions crédibles ;
- un style low-poly semi-réaliste.

Il ne faut pas mélanger :

- objets cartoon ;
- objets photoréalistes ;
- objets voxel ;
- modèles PS1 ;
- modèles avec des proportions irréalistes.

### 2.4 Simplicité technique

Privilégier :

- fichiers `.glb` ;
- matériaux simples ;
- textures partagées ;
- objets statiques ;
- pivots propres ;
- animations limitées ;
- géométries facilement modifiables.

------------------------------------------------------------------------

# PARTIE A — PROTOTYPE GREYBOX

## 3. Assets nécessaires au prototype

Le greybox ne nécessite aucun modèle externe.

Tous les éléments peuvent être produits avec des primitives Three.js.

### 3.1 Architecture

- sol ;
- plafond ;
- quatre murs ;
- porte d’entrée ;
- porte de sortie ;
- encadrement de porte ;
- collision de la salle ;
- point d’apparition du joueur.

### 3.2 Mobilier simplifié

- lit ;
- table de nuit ;
- armoire ;
- chaise ;
- petit bureau ou meuble TV ;
- télévision ;
- lampe ;
- plante ;
- tableau ;
- pile de livres.

### 3.3 Formes utilisées

| Élément    | Primitive recommandée       |
|------------|-----------------------------|
| Sol        | `BoxGeometry`               |
| Murs       | `BoxGeometry`               |
| Lit        | assemblage de boîtes        |
| Armoire    | boîte verticale             |
| Chaise     | assemblage de boîtes        |
| Télévision | boîte fine                  |
| Lampe      | cylindre + cône             |
| Plante     | cylindre + sphères ou cônes |
| Tableau    | boîte très fine             |
| Livres     | petites boîtes              |

### 3.4 Couleurs temporaires

Chaque objet important reçoit une couleur différente afin d’améliorer la mémorisation.

Le greybox doit uniquement tester :

- les déplacements ;
- les collisions ;
- la visibilité des objets ;
- le système d’anomalies ;
- le rythme des phases ;
- la sélection par raycast.

------------------------------------------------------------------------

# PARTIE B — KIT MODULAIRE DE LA MAISON

## 4. Architecture commune

Les dix salles doivent partager un kit architectural principal.

### 4.1 Éléments indispensables

- mur droit ;
- angle intérieur ;
- angle extérieur ;
- sol bois ;
- sol carrelage ;
- sol béton ou utilitaire ;
- plafond ;
- plinthe droite ;
- plinthe d’angle ;
- encadrement de porte ;
- porte intérieure fermée ;
- porte intérieure ouverte ;
- porte principale ;
- poignée ;
- fenêtre simple ;
- petite fenêtre ;
- rideau ;
- interrupteur ;
- prise électrique ;
- radiateur ou chauffage mural ;
- grille de ventilation.

### 4.2 Variantes autorisées

- deux couleurs de murs ;
- deux types de sols ;
- trois modèles de portes maximum ;
- deux modèles de fenêtres ;
- trois modèles de lampes murales ou plafonniers.

L’objectif n’est pas de créer dix architectures différentes.

------------------------------------------------------------------------

## 5. Éléments techniques invisibles

Chaque salle doit également posséder :

- volume de collision principal ;
- volumes de collision simplifiés ;
- point d’apparition ;
- zone de sortie ;
- volumes d’interaction ;
- points de duplication d’objets ;
- points de placement alternatifs ;
- repères de lumière ;
- repères de caméra éventuels ;
- limites jouables.

Ces éléments ne sont pas visibles dans le jeu final.

### Convention de nommage

    COLLIDER_Room
    COLLIDER_Furniture
    SPAWN_Player
    EXIT_Door
    INTERACT_Television
    DUPLICATE_Spawn_01
    VARIANT_Chair_Left
    LIGHT_Ceiling

------------------------------------------------------------------------

# PARTIE C — ASSETS PARTAGÉS

## 6. Mobilier partagé

Ces objets peuvent apparaître dans plusieurs pièces.

### 6.1 Meubles

- chaise simple ;
- chaise rembourrée ;
- tabouret ;
- petite table ;
- table moyenne ;
- console d’entrée ;
- étagère ;
- bibliothèque ;
- meuble bas ;
- armoire ;
- commode ;
- banc ;
- petit placard ;
- meuble mural.

### 6.2 Décoration

- plante en pot petite ;
- plante en pot moyenne ;
- grande plante ;
- cadre portrait ;
- cadre paysage ;
- miroir mural ;
- horloge ronde ;
- horloge carrée ;
- vase ;
- bougie ;
- petit tapis ;
- tapis moyen ;
- coussin ;
- couverture ;
- boîte en carton ;
- panier ;
- bouteille ;
- tasse ;
- verre ;
- assiette ;
- livre fermé ;
- livre ouvert ;
- pile de livres.

### 6.3 Électronique

- télévision ;
- écran d’ordinateur ;
- ordinateur portable ;
- clavier ;
- souris ;
- téléphone fixe ;
- smartphone ;
- radio ;
- réveil numérique ;
- lampe de bureau ;
- lampe sur pied ;
- lampe de table.

### 6.4 Objets d’entrée

- porte-manteaux ;
- cintres ;
- paire de chaussures ;
- parapluie ;
- petit vide-poche ;
- trousseau de clés ;
- sac ;
- tapis d’entrée.

------------------------------------------------------------------------

# PARTIE D — ASSETS PAR SALLE

## 7. Salle 1 — Chambre

### Assets principaux

- lit simple ou double ;
- matelas ;
- couverture ;
- deux oreillers ;
- table de nuit ;
- lampe de chevet ;
- armoire ;
- chaise ;
- télévision ou écran ;
- meuble TV ;
- tableau ;
- plante ;
- réveil ;
- livres ;
- petit tapis.

### Cibles d’anomalies prioritaires

- télévision ;
- lampe ;
- chaise ;
- tableau ;
- plante ;
- réveil ;
- livres ;
- oreiller ;
- armoire.

### Variantes nécessaires

- télévision tournée ;
- lampe allumée ou éteinte ;
- chaise à deux positions ;
- tableau avec deux images ;
- plante à deux positions ;
- réveil avec deux horaires ;
- livre présent ou absent.

------------------------------------------------------------------------

## 8. Salle 2 — Salle de bain

### Assets principaux

- lavabo ;
- meuble sous lavabo ;
- miroir ;
- douche ou baignoire ;
- toilettes ;
- tapis de bain ;
- serviette pliée ;
- serviette suspendue ;
- bouteille de savon ;
- flacon ;
- gobelet ;
- brosse à dents ;
- petite poubelle ;
- placard mural.

### Cibles d’anomalies prioritaires

- miroir ;
- serviette ;
- tapis ;
- bouteille ;
- brosse à dents ;
- placard ;
- poubelle ;
- rideau de douche.

### Variantes nécessaires

- serviette de couleur différente ;
- placard ouvert ou fermé ;
- bouteille déplacée ;
- objet absent du lavabo ;
- tapis tourné ;
- miroir avec image alternative simple.

------------------------------------------------------------------------

## 9. Salle 3 — Premier couloir

### Assets principaux

- console ;
- téléphone ;
- plante ;
- trois à cinq cadres ;
- horloge ;
- tapis ;
- chaussures ;
- lampe murale ;
- petit banc ;
- vide-poche.

### Cibles d’anomalies prioritaires

- cadres ;
- téléphone ;
- plante ;
- chaussures ;
- horloge ;
- tapis ;
- lampe.

### Variantes nécessaires

- cadre manquant ;
- image remplacée ;
- téléphone déplacé ;
- chaussures inversées ;
- horloge modifiée ;
- tapis tourné.

------------------------------------------------------------------------

## 10. Salle 4 — Bureau

### Assets principaux

- bureau ;
- chaise de bureau ;
- écran ;
- unité centrale ou ordinateur portable ;
- clavier ;
- souris ;
- lampe de bureau ;
- étagère ;
- dossiers ;
- livres ;
- téléphone ;
- tasse ;
- corbeille ;
- plante ;
- cadre ou affiche.

### Cibles d’anomalies prioritaires

- écran ;
- chaise ;
- lampe ;
- tasse ;
- téléphone ;
- livres ;
- dossiers ;
- clavier ;
- plante.

### Variantes nécessaires

- écran allumé ou éteint ;
- chaise tournée ;
- tasse déplacée ;
- clavier déplacé ;
- dossiers réorganisés ;
- livre absent ;
- lampe changée.

------------------------------------------------------------------------

## 11. Salle 5 — Cuisine

### Assets principaux

- réfrigérateur ;
- four ;
- plaques ;
- évier ;
- meuble bas ;
- meuble haut ;
- micro-ondes ;
- grille-pain ;
- bouilloire ;
- cafetière ;
- assiettes ;
- tasses ;
- casserole ;
- poêle ;
- corbeille de fruits ;
- bouteille ;
- torchon ;
- tabouret ou chaise ;
- petite table.

### Cibles d’anomalies prioritaires

- micro-ondes ;
- grille-pain ;
- bouilloire ;
- tasse ;
- fruits ;
- bouteille ;
- torchon ;
- chaise ;
- placard.

### Variantes nécessaires

- placard ouvert ou fermé ;
- appareil déplacé ;
- fruit disparu ;
- tasse changée ;
- torchon déplacé ;
- chaise tournée ;
- bouteille dupliquée.

------------------------------------------------------------------------

## 12. Salle 6 — Salle à manger

### Assets principaux

- grande table ;
- quatre à six chaises ;
- suspension ;
- buffet ;
- vase ;
- plante ;
- vaisselle ;
- couverts simplifiés ;
- verres ;
- cadres ;
- horloge ;
- tapis.

### Cibles d’anomalies prioritaires

- chaises ;
- vase ;
- vaisselle ;
- suspension ;
- cadre ;
- horloge ;
- plante ;
- tapis.

### Variantes nécessaires

- chaise tournée ou déplacée ;
- vase absent ;
- assiette ajoutée ;
- verre disparu ;
- lampe éteinte ;
- cadre remplacé ;
- tapis tourné.

------------------------------------------------------------------------

## 13. Salle 7 — Salon

### Assets principaux

- canapé ;
- fauteuil ;
- télévision ;
- meuble TV ;
- table basse ;
- tapis ;
- bibliothèque ;
- lampadaire ;
- lampe de table ;
- coussins ;
- plante ;
- tableaux ;
- télécommande ;
- livres ;
- vase ;
- petite décoration.

### Cibles d’anomalies prioritaires

- télévision ;
- fauteuil ;
- coussins ;
- lampe ;
- plante ;
- tableau ;
- télécommande ;
- livres ;
- vase.

### Variantes nécessaires

- télévision tournée ou allumée ;
- fauteuil déplacé ;
- coussin changé de couleur ;
- lampe éteinte ;
- tableau remplacé ;
- télécommande déplacée ;
- livre absent ;
- vase dupliqué.

------------------------------------------------------------------------

## 14. Salle 8 — Buanderie ou débarras

### Assets principaux

- machine à laver ;
- sèche-linge ;
- panier à linge ;
- étagères ;
- boîtes ;
- produits ménagers ;
- balai ;
- serpillière ;
- seau ;
- vêtements pliés ;
- cintres ;
- tabouret ;
- petite lampe ;
- poubelle.

### Cibles d’anomalies prioritaires

- panier ;
- boîtes ;
- produits ;
- balai ;
- vêtements ;
- tabouret ;
- porte de machine ;
- lampe.

### Variantes nécessaires

- panier déplacé ;
- boîte absente ;
- produit dupliqué ;
- balai tourné ;
- vêtements de couleur différente ;
- porte de machine ouverte ;
- lampe éteinte.

------------------------------------------------------------------------

## 15. Salle 9 — Couloir d’entrée

### Assets principaux

- console ;
- miroir ;
- porte-manteaux ;
- manteaux ;
- chaussures ;
- parapluie ;
- trousseau de clés ;
- tapis ;
- cadres ;
- lampe ;
- plante ;
- banc ;
- petite fenêtre ;
- porte principale visible.

### Cibles d’anomalies prioritaires

- miroir ;
- manteaux ;
- chaussures ;
- parapluie ;
- clés ;
- cadres ;
- tapis ;
- lampe.

### Variantes nécessaires

- manteau disparu ;
- parapluie déplacé ;
- clés absentes ;
- cadre remplacé ;
- tapis tourné ;
- lampe éteinte ;
- chaussures déplacées.

------------------------------------------------------------------------

## 16. Salle 10 — Hall principal

### Assets principaux

- porte principale ;
- serrure ;
- poignée ;
- meuble d’entrée ;
- miroir ;
- plante ;
- banc ;
- grand tapis ;
- horloge ;
- tableau principal ;
- lampe ou suspension ;
- fenêtre ;
- objet central distinctif.

### Cibles d’anomalies prioritaires

- horloge ;
- tableau ;
- plante ;
- banc ;
- tapis ;
- lampe ;
- miroir ;
- objet central.

### Variantes nécessaires

- heure différente ;
- image remplacée ;
- plante déplacée ;
- banc tourné ;
- tapis modifié ;
- lampe éteinte ;
- objet central absent ou dupliqué.

------------------------------------------------------------------------

# PARTIE E — OBJETS COMPATIBLES AVEC LES ANOMALIES

## 17. Liste prioritaire

Tous les objets ne doivent pas être interactifs.

Les cibles prioritaires sont celles qui possèdent :

- une silhouette claire ;
- plusieurs états possibles ;
- une position facilement mémorisable ;
- une taille suffisante ;
- une bonne visibilité.

### Niveau A — Très bonnes cibles

- chaise ;
- télévision ;
- lampe ;
- plante ;
- tableau ;
- horloge ;
- tasse ;
- téléphone ;
- livre ;
- vase ;
- tapis ;
- coussin ;
- bouteille ;
- panier ;
- chaussures.

### Niveau B — Bonnes cibles

- clavier ;
- télécommande ;
- réveil ;
- serviette ;
- assiette ;
- fruit ;
- parapluie ;
- boîte ;
- produit ménager ;
- vêtement ;
- petit appareil de cuisine.

### Niveau C — Cibles limitées

- grands meubles ;
- lit ;
- canapé ;
- réfrigérateur ;
- machine à laver ;
- grande table ;
- armoire.

Les objets de niveau C peuvent recevoir uniquement certaines anomalies :

- changement de couleur ;
- porte ouverte ou fermée ;
- léger déplacement ;
- disparition exceptionnelle.

------------------------------------------------------------------------

## 18. Nombre cible d’objets interactifs

| Salle          | Cibles interactives recommandées |
|----------------|---------------------------------:|
| Chambre        |                          10 à 12 |
| Salle de bain  |                          10 à 12 |
| Couloir        |                           8 à 10 |
| Bureau         |                          12 à 15 |
| Cuisine        |                          14 à 18 |
| Salle à manger |                          12 à 15 |
| Salon          |                          15 à 20 |
| Buanderie      |                          14 à 18 |
| Entrée         |                          12 à 16 |
| Hall           |                          12 à 16 |

Le nombre d’objets visibles peut être supérieur.

Seules les cibles conçues et validées doivent pouvoir devenir des anomalies.

------------------------------------------------------------------------

# PARTIE F — VARIANTES D’ANOMALIES

## 19. Variantes de transformation

Pour chaque objet compatible :

- état normal ;
- position alternative A ;
- position alternative B ;
- rotation alternative ;
- éventuellement échelle alternative.

Chaque variante doit être préparée manuellement.

### Exemple

    ANOM_Chair_Dining_01

    Normal:
    position = [1.2, 0, -0.8]
    rotation = [0, 0, 0]

    Variant A:
    position = [1.5, 0, -0.8]
    rotation = [0, 0.35, 0]

    Variant B:
    position = [1.2, 0, -1.1]
    rotation = [0, -0.5, 0]

------------------------------------------------------------------------

## 20. Variantes de matériaux

Prévoir des matériaux partagés :

- tissu beige ;
- tissu bleu ;
- tissu rouge sombre ;
- bois clair ;
- bois sombre ;
- plastique blanc ;
- plastique noir ;
- métal gris ;
- vert végétal ;
- verre simplifié.

Les changements de couleur doivent être suffisamment visibles.

------------------------------------------------------------------------

## 21. Images alternatives

Créer un petit ensemble d’images originales ou libres :

- six tableaux ;
- quatre photographies abstraites ;
- quatre écrans de télévision ;
- trois affiches ;
- quatre écrans d’ordinateur ;
- quatre horaires d’horloge numérique.

Les images doivent être :

- légères ;
- lisibles ;
- cohérentes avec la maison ;
- juridiquement utilisables ;
- non dépendantes d’une œuvre protégée.

------------------------------------------------------------------------

# PARTIE G — AUDIO

## 22. Sons indispensables au prototype

- clic d’interface ;
- début de partie ;
- compte à rebours ;
- bruit électrique ;
- extinction des lumières ;
- retour de lumière ;
- bonne réponse ;
- mauvaise réponse ;
- pénalité ;
- porte déverrouillée ;
- porte ouverte ;
- Game Over ;
- victoire.

------------------------------------------------------------------------

## 23. Ambiances du MVP

### Ambiance commune

- bruit intérieur discret ;
- ventilation ;
- électricité légère ;
- craquements occasionnels.

### Ambiances spécifiques

- chambre : horloge légère ;
- salle de bain : ventilation ou gouttes discrètes ;
- cuisine : réfrigérateur ;
- bureau : ordinateur ou ventilateur ;
- salon : ronronnement électrique ;
- buanderie : machine ou tuyauterie ;
- entrée : vent extérieur léger ;
- sortie : oiseaux, vent, environnement extérieur.

### Musique

- boucle très légère pour le menu ;
- court thème de victoire ;
- aucun morceau continu obligatoire pendant la partie.

------------------------------------------------------------------------

## 24. Contraintes audio

- pas de doublage ;
- pas de dialogues ;
- pas de musique sous copyright ;
- boucles sans coupure audible ;
- volume normalisé ;
- fichiers compressés ;
- sons très courts pour les actions répétées.

------------------------------------------------------------------------

# PARTIE H — INTERFACE

## 25. Assets d’interface

La majorité de l’interface doit être produite en HTML et CSS.

### Éléments graphiques nécessaires

- logo typographique ;
- icône du jeu ;
- réticule ;
- symbole de bonne réponse ;
- symbole de mauvaise réponse ;
- icône son ;
- icône pause ;
- icône sensibilité ;
- icône qualité ;
- icône plein écran uniquement pour la version standalone ;
- indicateurs d’erreurs ;
- fond simple pour les modales.

### Éléments inutiles

- boutons sous forme d’images ;
- cadres décoratifs lourds ;
- texture complète pour le HUD ;
- animations vidéo de menu ;
- interface 3D.

------------------------------------------------------------------------

## 26. Police

Une seule famille principale.

Poids recommandés :

- Regular ;
- Medium ;
- Bold.

Les chiffres du chronomètre doivent utiliser des variantes tabulaires.

------------------------------------------------------------------------

# PARTIE I — PUBLICATION

## 27. Assets de plateforme

À produire après validation du jeu final :

- icône carrée ;
- image principale CrazyGames ;
- capture de gameplay 16:9 ;
- capture mobile ;
- bannière horizontale ;
- logo transparent ;
- favicon ;
- image de partage social.

Ces éléments ne doivent pas être produits avant que le style final du jeu soit visible.

------------------------------------------------------------------------

# PARTIE J — SOURCES ET LICENCES

## 28. Types de licences acceptées

Privilégier :

- CC0 ;
- domaine public ;
- licence commerciale explicite ;
- asset acheté avec licence commerciale permanente ;
- assets créés directement pour le projet.

Licences acceptables avec attribution :

- CC BY, uniquement si l’attribution est compatible avec les portails ciblés.

### Licences interdites

- usage personnel uniquement ;
- usage non commercial ;
- licence inconnue ;
- asset extrait d’un autre jeu ;
- modèle provenant d’un rip ;
- asset distribué sans accord du créateur ;
- contenu protégé provenant d’un film ou d’une marque.

------------------------------------------------------------------------

## 29. Registre des licences

Créer plus tard :

    docs/ASSET_LICENSES.md

Pour chaque asset externe :

    Nom :
    Créateur :
    Source :
    Licence :
    Date de récupération :
    Modifications :
    Salles utilisées :
    Fichier local :

Aucun asset externe ne doit être intégré sans être ajouté à ce registre.

------------------------------------------------------------------------

# PARTIE K — CONVENTIONS DE FICHIERS

## 30. Nommage des modèles

    room-bedroom.glb
    room-bathroom.glb
    prop-chair-basic.glb
    prop-television.glb
    prop-plant-medium.glb
    prop-picture-frame.glb
    prop-table-lamp.glb

Pas de noms comme :

    model-final-final2.glb
    chair_new.glb
    asset1.glb

------------------------------------------------------------------------

## 31. Nommage des textures

    wood-light-basecolor.webp
    wood-light-normal.webp
    fabric-beige-basecolor.webp
    picture-landscape-01.webp
    screen-tv-static-01.webp

------------------------------------------------------------------------

## 32. Nommage de l’audio

    sfx-light-blackout-01.mp3
    sfx-correct-01.mp3
    sfx-wrong-01.mp3
    sfx-door-unlock-01.mp3
    amb-bedroom-loop.mp3
    amb-kitchen-loop.mp3
    music-menu-loop.mp3

------------------------------------------------------------------------

# PARTIE L — BUDGETS

## 33. Budget modèles

| Catégorie             | Budget recommandé |
|-----------------------|------------------:|
| Architecture partagée |   10 à 20 modèles |
| Mobilier partagé      |   25 à 40 modèles |
| Objets spécifiques    |   30 à 50 modèles |
| Petits objets         |   20 à 30 modèles |
| Total approximatif    |  85 à 140 modèles |

Les variantes de couleur ne comptent pas comme des modèles supplémentaires.

------------------------------------------------------------------------

## 34. Budget textures

| Catégorie                | Quantité recommandée |
|--------------------------|---------------------:|
| Matériaux architecturaux |               8 à 12 |
| Bois                     |                3 à 5 |
| Tissus                   |                4 à 6 |
| Plastiques et métaux     |                5 à 8 |
| Images décoratives       |              15 à 25 |
| Interfaces               |          moins de 15 |

------------------------------------------------------------------------

## 35. Budget audio

| Catégorie               | Quantité |
|-------------------------|---------:|
| Effets d’interface      |    5 à 8 |
| Effets de gameplay      |  10 à 15 |
| Portes et environnement |   5 à 10 |
| Ambiances               |   5 à 10 |
| Musiques                |    1 à 3 |

------------------------------------------------------------------------

# PARTIE M — PRIORITÉS

## 36. Ordre de production

### Priorité 1 — Greybox

- primitives ;
- chambre ;
- dix objets ;
- trois anomalies ;
- porte ;
- sons temporaires.

### Priorité 2 — Kit architectural

- murs ;
- sols ;
- portes ;
- fenêtres ;
- plinthes ;
- lumières.

### Priorité 3 — Chambre finale

- modèles définitifs ;
- matériaux ;
- anomalies ;
- éclairage ;
- son.

### Priorité 4 — Trois premières salles

- chambre ;
- salle de bain ;
- couloir.

Ces trois salles servent à tester la progression réelle du jeu.

### Priorité 5 — Salles centrales

- bureau ;
- cuisine ;
- salle à manger ;
- salon.

### Priorité 6 — Salles finales

- buanderie ;
- couloir d’entrée ;
- hall ;
- extérieur.

### Priorité 7 — Publication

- logo ;
- icône ;
- image CrazyGames ;
- captures ;
- sons et finitions.

------------------------------------------------------------------------

# PARTIE N — CE QUI N’EST PAS NÉCESSAIRE

## 37. Assets exclus du MVP

Ne pas rechercher ou produire :

- personnages ;
- monstres ;
- animations humaines ;
- armes ;
- véhicules ;
- extérieur complet ;
- jardin explorable ;
- ville ;
- ciel dynamique ;
- météo ;
- animaux ;
- effets de sang ;
- objets cassables ;
- destruction ;
- physique avancée ;
- particules complexes ;
- cinématiques ;
- voix ;
- dizaines de variantes architecturales ;
- objets de collection ;
- cosmétiques.

------------------------------------------------------------------------

# PARTIE O — CHECKLIST DE VALIDATION

## 38. Validation d’un modèle

Avant intégration, vérifier :

- licence utilisable ;
- style compatible ;
- échelle correcte ;
- pivot correct ;
- transformations appliquées ;
- nom propre ;
- nombre de triangles raisonnable ;
- matériaux limités ;
- textures compressées ;
- aucune animation inutile ;
- aucune géométrie cachée inutile ;
- collision simplifiable ;
- apparence correcte sur mobile.

------------------------------------------------------------------------

## 39. Validation d’un objet d’anomalie

Avant de rendre un objet interactif :

- visible depuis la zone jouable ;
- silhouette reconnaissable ;
- changement perceptible ;
- variantes préparées ;
- volume d’interaction correct ;
- aucune ambiguïté avec un autre objet ;
- aucune collision bloquante ;
- état initial restaurable ;
- compatible avec au moins une anomalie ;
- testé dans l’éclairage final.

------------------------------------------------------------------------

## 40. Règle finale

Le projet ne doit pas chercher à posséder beaucoup d’assets.

Il doit posséder :

> Le plus petit ensemble d’objets cohérents permettant de créer dix salles lisibles et suffisamment de variations pour rendre chaque partie différente.

La qualité des anomalies et de la composition des salles est plus importante que la quantité de modèles.
