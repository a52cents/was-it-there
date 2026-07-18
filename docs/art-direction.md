# WAS IT THERE?

## Art Direction — Version 1.0

**Statut :** direction artistique verrouillée pour le prototype et le MVP\
**Projet :** `was-it-there`\
**Documents associés :**

- `GAME_DESIGN_ONE_PAGE.md`
- `TECHNICAL_BIBLE.md`

------------------------------------------------------------------------

## 1. Vision artistique

**Was It There?** doit ressembler à un jeu d’observation 3D propre, lisible et légèrement inquiétant.

L’objectif n’est pas de créer un jeu d’horreur sombre ou réaliste.

L’objectif est de provoquer le doute :

> Cette pièce était-elle vraiment comme ça avant que la lumière s’éteigne ?

La direction artistique doit permettre au joueur de :

- identifier rapidement les objets ;
- mémoriser leur position ;
- repérer une anomalie sans difficulté artificielle ;
- ressentir une tension légère ;
- reconnaître immédiatement le jeu sur une capture d’écran.

------------------------------------------------------------------------

## 2. Piliers visuels

### 2.1 Lisibilité

Chaque objet important doit posséder :

- une silhouette claire ;
- une taille suffisante ;
- une position identifiable ;
- une couleur distincte de son environnement ;
- un éclairage qui permet de l’observer.

Le jeu ne doit jamais cacher une anomalie avec :

- une obscurité excessive ;
- du brouillard ;
- un grain trop fort ;
- une texture illisible ;
- un objet placé derrière un autre ;
- un angle de caméra impossible.

### 2.2 Simplicité

Le style doit rester suffisamment simple pour :

- produire dix salles rapidement ;
- fonctionner sur mobile ;
- conserver un bundle léger ;
- permettre la création de variantes ;
- éviter une quantité excessive de textures.

### 2.3 Familiarité

La maison doit sembler normale au premier regard.

Le joueur doit reconnaître immédiatement :

- une chambre ;
- une salle de bain ;
- un bureau ;
- une cuisine ;
- un salon.

Les anomalies fonctionnent mieux lorsque l’environnement de base paraît crédible et familier.

### 2.4 Étrangeté progressive

Le jeu commence avec une maison chaleureuse et ordinaire.

Plus le joueur approche de la sortie, plus l’ambiance devient :

- froide ;
- silencieuse ;
- géométrique ;
- légèrement irréelle.

Cette évolution doit rester subtile.

Il n’y a pas :

- de sang ;
- de corps ;
- de monstres ;
- de jumpscares obligatoires ;
- de décor gore.

------------------------------------------------------------------------

## 3. Style 3D

### Style retenu

> **Low-poly semi-réaliste stylisé**

Les objets doivent être simplifiés sans ressembler à des jouets.

Caractéristiques :

- formes propres ;
- arêtes légèrement adoucies ;
- proportions crédibles ;
- détails limités mais reconnaissables ;
- surfaces majoritairement mates ;
- palette contrôlée ;
- textures simples.

### À éviter

- style cartoon très coloré ;
- voxel art ;
- pixel art 3D ;
- réalisme photogrammétrique ;
- textures 4K ;
- modèles extrêmement détaillés ;
- esthétique PS1 volontairement dégradée ;
- objets génériques sans cohérence entre eux.

------------------------------------------------------------------------

## 4. Niveau de détail

Le joueur doit principalement mémoriser :

- les formes ;
- les couleurs ;
- les positions ;
- les orientations.

Les petits détails décoratifs ne doivent pas être indispensables.

### Objets importants

Exemples :

- télévision ;
- chaise ;
- lampe ;
- plante ;
- tableau ;
- miroir ;
- téléphone ;
- tasse ;
- livre ;
- horloge.

Ces objets peuvent être concernés par une anomalie.

### Objets secondaires

Exemples :

- prises électriques ;
- poignées ;
- plinthes ;
- petits accessoires ;
- interrupteurs non interactifs.

Ils servent uniquement à donner de la crédibilité à la pièce.

Le jeu ne doit pas contenir des centaines de petits objets similaires uniquement pour augmenter artificiellement la difficulté.

------------------------------------------------------------------------

## 5. Palette principale

### Couleurs de base

La maison utilise une palette chaude et désaturée :

| Usage           | Couleur indicative |
|-----------------|--------------------|
| Murs clairs     | `#D8D0C3`          |
| Bois clair      | `#A97852`          |
| Bois sombre     | `#4D382F`          |
| Tissu beige     | `#B5A38C`          |
| Vert végétal    | `#5F7658`          |
| Rouge décoratif | `#8C4F46`          |
| Bleu décoratif  | `#536C7B`          |
| Noir doux       | `#1D1D1D`          |
| Blanc chaud     | `#F1EDE5`          |

Ces valeurs sont des références, pas des couleurs obligatoires pour chaque matériau.

### Accent du jeu

La couleur d’accent principale de l’interface est un jaune électrique doux :

    #E8C35A

Elle est utilisée pour :

- le logo ;
- le réticule actif ;
- les éléments sélectionnés ;
- les boutons principaux ;
- les informations importantes.

### Bonne réponse

    #72C98D

### Mauvaise réponse

    #D9665B

### Interface neutre

    #F2F0EB
    #B8B5AE
    #181818

------------------------------------------------------------------------

## 6. Progression colorimétrique

La maison évolue sur trois actes visuels.

### Acte 1 — Familiarité

Salles 1 à 3 :

- lumière chaude ;
- bois visible ;
- tissus clairs ;
- environnement rassurant ;
- contraste modéré.

### Acte 2 — Doute

Salles 4 à 7 :

- lumière plus neutre ;
- moins de couleurs chaudes ;
- ombres légèrement plus présentes ;
- espaces plus ordonnés ;
- ambiance sonore plus vide.

### Acte 3 — Sortie

Salles 8 à 10 :

- lumière légèrement froide ;
- palette plus grise ;
- pièces plus épurées ;
- contrastes plus marqués ;
- signes extérieurs de la sortie ;
- lumière extérieure visible au loin.

La progression ne doit jamais empêcher l’observation.

------------------------------------------------------------------------

## 7. Éclairage

L’éclairage est une mécanique importante du jeu.

### Éclairage normal

Chaque salle possède :

- une lumière principale ;
- une ou deux lumières secondaires simulées ;
- une lumière ambiante légère ;
- des zones sombres mais lisibles.

### Extinction

Lors du changement :

1.  un léger bruit électrique est joué ;
2.  la lumière vacille rapidement ;
3.  l’écran devient noir ;
4.  les anomalies sont appliquées ;
5.  la lumière revient progressivement.

Durée totale cible :

    0,8 à 1,3 seconde

L’extinction ne doit pas devenir frustrante ou répétitive.

### Couleur des lumières

Début du jeu :

    Température chaude, environ 3200 K à 4000 K

Fin du jeu :

    Température neutre à froide, environ 4500 K à 5500 K

### Ombres

Les ombres doivent :

- donner du volume ;
- renforcer les silhouettes ;
- rester suffisamment douces ;
- ne jamais dissimuler une anomalie.

------------------------------------------------------------------------

## 8. Les dix salles

## Salle 1 — Chambre

### Rôle

Présenter le gameplay dans un environnement simple.

### Ambiance

- chaleureuse ;
- calme ;
- intime ;
- immédiatement compréhensible.

### Objets principaux

- lit ;
- table de nuit ;
- lampe ;
- télévision ou écran ;
- armoire ;
- chaise ;
- tableau ;
- plante ;
- réveil ;
- livres.

### Difficulté visuelle

Faible.

Les objets sont espacés et possèdent des silhouettes distinctes.

------------------------------------------------------------------------

## Salle 2 — Salle de bain

### Rôle

Introduire les surfaces réfléchissantes et les objets plus petits.

### Ambiance

- claire ;
- propre ;
- légèrement froide ;
- carrelage simple.

### Objets principaux

- miroir ;
- lavabo ;
- serviettes ;
- savon ;
- brosse ;
- placard ;
- douche ;
- poubelle ;
- tapis ;
- bouteille.

### Contrainte

Le miroir du MVP ne doit pas utiliser une réflexion temps réel coûteuse.

Il peut employer :

- une surface sombre ;
- une fausse réflexion ;
- une texture statique.

------------------------------------------------------------------------

## Salle 3 — Premier couloir

### Rôle

Faire comprendre que le joueur progresse réellement dans une maison.

### Ambiance

- étroite ;
- simple ;
- transition entre les premières pièces.

### Objets principaux

- cadres ;
- console ;
- téléphone ;
- chaussures ;
- lampe murale ;
- plante ;
- petit tapis ;
- horloge.

### Difficulté visuelle

Le nombre d’objets reste limité.

------------------------------------------------------------------------

## Salle 4 — Bureau

### Rôle

Augmenter la densité d’objets.

### Ambiance

- organisée ;
- neutre ;
- légèrement plus froide.

### Objets principaux

- bureau ;
- ordinateur ;
- écran ;
- clavier ;
- chaise ;
- lampe ;
- étagères ;
- livres ;
- tasse ;
- téléphone ;
- dossiers.

### Difficulté visuelle

Modérée.

Certains objets sont proches les uns des autres, mais restent clairement identifiables.

------------------------------------------------------------------------

## Salle 5 — Cuisine

### Rôle

Introduire davantage d’objets et de variations possibles.

### Ambiance

- fonctionnelle ;
- encore familière ;
- lumière neutre.

### Objets principaux

- réfrigérateur ;
- four ;
- évier ;
- placards ;
- micro-ondes ;
- grille-pain ;
- assiettes ;
- tasses ;
- fruits ;
- bouilloire ;
- chaises.

### Contrainte

Les objets de cuisine doivent être regroupés par zones pour éviter une surcharge visuelle.

------------------------------------------------------------------------

## Salle 6 — Salle à manger

### Rôle

Créer une grande zone centrale facile à observer, mais contenant plusieurs relations spatiales.

### Ambiance

- propre ;
- silencieuse ;
- légèrement trop ordonnée.

### Objets principaux

- table ;
- chaises ;
- lampe suspendue ;
- buffet ;
- vase ;
- cadres ;
- vaisselle ;
- horloge ;
- plante.

### Particularité

Les anomalies de rotation et de déplacement fonctionnent particulièrement bien dans cette pièce.

------------------------------------------------------------------------

## Salle 7 — Salon

### Rôle

Devenir la première salle vraiment dense.

### Ambiance

- plus sombre ;
- lumière de télévision ou lampe secondaire ;
- palette moins chaleureuse.

### Objets principaux

- canapé ;
- fauteuil ;
- télévision ;
- table basse ;
- tapis ;
- bibliothèque ;
- lampes ;
- coussins ;
- plante ;
- tableaux ;
- objets décoratifs.

### Difficulté visuelle

Élevée, mais la composition doit rester lisible.

------------------------------------------------------------------------

## Salle 8 — Buanderie ou débarras

### Rôle

Créer une sensation de confinement sans utiliser l’horreur.

### Ambiance

- petite ;
- froide ;
- utilitaire ;
- légèrement encombrée.

### Objets principaux

- machine à laver ;
- sèche-linge ;
- paniers ;
- étagères ;
- produits ménagers ;
- balai ;
- cartons ;
- vêtements ;
- tabouret.

### Contrainte

L’encombrement doit être organisé et non aléatoire.

------------------------------------------------------------------------

## Salle 9 — Couloir d’entrée

### Rôle

Faire sentir que la sortie est proche.

### Ambiance

- lumière extérieure visible ;
- silence marqué ;
- tons froids ;
- espace plus long.

### Objets principaux

- porte-manteaux ;
- chaussures ;
- cadres ;
- console ;
- miroir ;
- tapis ;
- parapluie ;
- clés ;
- lampe ;
- petite fenêtre.

### Particularité

La porte principale peut être visible mais inaccessible.

------------------------------------------------------------------------

## Salle 10 — Hall principal

### Rôle

Finale du parcours.

### Ambiance

- plus grande ;
- très propre ;
- presque trop vide ;
- lumière extérieure au-delà de la porte.

### Objets principaux

- porte principale ;
- meuble d’entrée ;
- miroir ;
- plante ;
- banc ;
- tapis ;
- horloge ;
- tableau ;
- lampe ;
- objet central reconnaissable.

### Fin

Lorsque toutes les anomalies sont trouvées :

- la serrure se déverrouille ;
- la porte s’ouvre ;
- une lumière blanche naturelle entre ;
- le joueur peut sortir ;
- le chronomètre s’arrête une fois le seuil franchi.

------------------------------------------------------------------------

## 9. Extérieur final

L’extérieur n’est pas un environnement explorable complet.

Il sert uniquement de récompense visuelle.

Contenu minimal :

- petit porche ;
- sol extérieur ;
- végétation simple ;
- ciel clair ou lever du jour ;
- lumière naturelle ;
- ambiance sonore extérieure.

Le joueur avance de quelques mètres, puis l’écran de victoire apparaît.

------------------------------------------------------------------------

## 10. Cohérence architecturale

La maison doit sembler physiquement cohérente.

Les salles doivent respecter :

- une échelle commune ;
- une hauteur de plafond identique ;
- des portes de même taille ;
- des matériaux récurrents ;
- des plinthes et encadrements similaires ;
- une progression spatiale logique.

La maison ne doit pas ressembler à dix niveaux indépendants assemblés sans lien.

### Éléments récurrents

Utiliser dans plusieurs salles :

- même type de porte ;
- mêmes interrupteurs ;
- mêmes plinthes ;
- mêmes encadrements ;
- même style de fenêtres ;
- mêmes matériaux de sol ;
- variantes d’une même lampe ;
- variantes de cadres.

Ces répétitions renforcent la cohérence et réduisent le nombre d’assets nécessaires.

------------------------------------------------------------------------

## 11. Matériaux

Les matériaux sont simples et majoritairement mats.

### Matériaux principaux

- peinture mate ;
- bois verni léger ;
- métal peu réfléchissant ;
- tissu ;
- plastique ;
- carrelage ;
- verre simplifié.

### Valeurs générales

- métal limité ;
- roughness plutôt élevée ;
- reflets doux ;
- peu de transparence ;
- matériaux partagés entre plusieurs objets.

### À éviter

- surfaces miroir temps réel ;
- chrome très réfléchissant ;
- verre complexe ;
- textures procédurales lourdes ;
- matériaux uniques pour chaque objet.

------------------------------------------------------------------------

## 12. Textures

Les textures doivent servir à distinguer les objets, pas à afficher des détails invisibles.

### Style

- couleurs légèrement désaturées ;
- détails peints simples ;
- usure très légère ;
- aucune saleté excessive ;
- aucune texture photoréaliste isolée.

### Résolutions

| Élément              | Résolution recommandée |
|----------------------|-----------------------:|
| Petits objets        |           256 à 512 px |
| Meubles              |          512 à 1024 px |
| Sols et murs         |                1024 px |
| Élément exceptionnel |        2048 px maximum |

### Réutilisation

Privilégier :

- atlas de textures ;
- matériaux partagés ;
- variations de couleur ;
- duplication d’objets avec transformations différentes.

------------------------------------------------------------------------

## 13. Anomalies et direction artistique

Chaque anomalie doit être préparée visuellement.

### Disparition

L’objet disparaît entièrement.

À utiliser sur :

- objets de taille moyenne ;
- silhouettes reconnaissables ;
- objets ne laissant pas un vide incohérent.

### Apparition

Un objet absent dans l’état normal apparaît à un emplacement validé.

L’objet ne doit pas :

- flotter ;
- traverser un meuble ;
- bloquer le joueur ;
- ressembler à un élément normal impossible à distinguer.

### Déplacement

Le déplacement doit être visible mais crédible.

Exemples :

- tasse déplacée à l’autre bout du bureau ;
- chaise décalée ;
- plante déplacée vers un coin ;
- livre changé d’étagère.

### Rotation

À utiliser sur des objets dont l’orientation est claire :

- chaise ;
- télévision ;
- tableau ;
- lampe ;
- livre ;
- horloge.

### Changement de couleur

La différence doit rester visible avec la lumière de la salle.

Éviter :

- beige vers beige légèrement plus clair ;
- noir vers gris foncé ;
- modifications imperceptibles sur mobile.

### Changement d’image

Adapté aux :

- cadres ;
- écrans ;
- affiches ;
- photographies ;
- horloges numériques.

### Lumière

Une lampe peut :

- s’allumer ;
- s’éteindre ;
- changer légèrement de température.

Les changements de lumière globale doivent être rares, car ils peuvent modifier l’apparence de toute la pièce.

------------------------------------------------------------------------

## 14. Interface

L’interface doit être minimale.

Le joueur doit regarder la pièce, pas le HUD.

### HUD principal

En phase de recherche :

    CHANGES LEFT: 2
    00:18

Disposition :

- compteur en haut à gauche ;
- chronomètre en haut à droite ;
- réticule au centre ;
- erreurs ou vies représentées discrètement.

### Réticule

Forme :

- petit point ;
- ou cercle fin.

États :

| État                 | Apparence                    |
|----------------------|------------------------------|
| Normal               | blanc légèrement transparent |
| Objet sélectionnable | jaune                        |
| Bonne réponse        | vert bref                    |
| Mauvaise réponse     | rouge bref                   |

### Phase d’observation

Afficher :

    MEMORIZE THE ROOM

Puis un compte à rebours discret.

### Phase de recherche

Afficher brièvement :

    WHAT CHANGED?

Le texte disparaît rapidement.

------------------------------------------------------------------------

## 15. Menus

### Menu principal

Contenu :

- logo ;
- bouton `PLAY` ;
- bouton `SETTINGS` ;
- meilleur temps local ;
- bouton son.

Fond :

- vue fixe d’une pièce ;
- très légère animation de lumière ;
- aucune caméra complexe.

### Pause

Contenu :

- `RESUME`
- `RESTART`
- `SETTINGS`
- `QUIT TO MENU`

### Game Over

Contenu :

- titre ;
- salle atteinte ;
- temps ;
- nombre d’erreurs ;
- bouton `TRY AGAIN`.

### Victoire

Contenu :

- `YOU GOT OUT`
- temps actif ;
- pénalités ;
- temps final ;
- erreurs ;
- mention `PERFECT RUN` si applicable ;
- meilleur temps ;
- bouton `PLAY AGAIN`.

------------------------------------------------------------------------

## 16. Typographie

### Style recherché

- sans-serif ;
- moderne ;
- légèrement condensée ;
- très lisible ;
- lettres capitales pour les informations courtes.

### Polices possibles

Utiliser une seule famille libre et légère.

Direction recommandée :

- Inter ;
- Archivo ;
- IBM Plex Sans ;
- Barlow Condensed pour certains titres.

Le MVP doit éviter de charger plusieurs familles et de nombreux poids.

### Hiérarchie

- titres : gras ;
- boutons : semi-gras ;
- chronomètre : chiffres tabulaires ;
- informations secondaires : régulier.

------------------------------------------------------------------------

## 17. Logo

Le logo doit rester simple.

### Composition recommandée

    WAS IT
    THERE?

Ou :

    WAS IT THERE?

### Élément distinctif

Le point d’interrogation peut :

- être légèrement décalé ;
- avoir une partie absente ;
- apparaître après une extinction ;
- utiliser la couleur jaune d’accent.

### Style

- typographique ;
- sans symbole complexe ;
- lisible en petite taille ;
- utilisable sur fond sombre et clair.

### À éviter

- maison détaillée ;
- œil réaliste ;
- silhouette horrifique ;
- monstre ;
- logo trop illustratif ;
- effets 3D complexes ;
- nombreux dégradés.

Le logo final sera produit après validation du greybox.

------------------------------------------------------------------------

## 18. Icône

L’icône doit fonctionner en format carré.

Piste recommandée :

- un point d’interrogation ;
- dans l’encadrement simple d’une porte ;
- fond sombre ;
- accent jaune ;
- formes épaisses et lisibles.

L’icône doit rester reconnaissable à petite taille.

------------------------------------------------------------------------

## 19. Image CrazyGames

L’image de présentation devra montrer directement le gameplay.

Composition recommandée :

- vue FPS d’une salle ;
- deux états visuels suggérés ;
- un objet légèrement différent ;
- réticule visible ;
- logo court et lisible ;
- contraste suffisant.

L’image ne doit pas montrer :

- une fausse scène impossible dans le jeu ;
- un monstre absent du jeu ;
- une quantité excessive de texte ;
- une interface entièrement différente.

La production de cette image intervient après l’intégration des vrais assets.

------------------------------------------------------------------------

## 20. Son et ambiance artistique

L’audio complète l’image sans devenir envahissant.

### Maison

- léger bourdonnement électrique ;
- ventilation ;
- horloge ;
- bruit extérieur discret ;
- craquements occasionnels très légers.

### Progression

Début :

- environnement vivant ;
- sons domestiques subtils.

Fin :

- ambiance plus silencieuse ;
- sons plus espacés ;
- sensation de vide.

### Musique

Aucune musique continue n’est nécessaire pour le prototype.

Le MVP peut utiliser :

- un drone très léger dans le menu ;
- une texture sonore subtile dans les dernières salles ;
- une courte musique de victoire.

------------------------------------------------------------------------

## 21. Feedback

### Bonne réponse

- contour vert très bref ;
- son clair ;
- petit mouvement du compteur ;
- aucune explosion de particules.

### Mauvaise réponse

- réticule rouge ;
- son sec ;
- léger flash sombre ;
- affichage de la pénalité.

### Salle réussie

- son de serrure ;
- éclairage de la porte ;
- poignée qui bouge ;
- porte qui s’ouvre.

### Victoire

- changement brutal vers une lumière naturelle ;
- respiration sonore ;
- ambiance extérieure ;
- interface affichée après quelques secondes.

------------------------------------------------------------------------

## 22. Accessibilité visuelle

Le jeu ne doit pas dépendre uniquement de la couleur.

Bonne réponse :

- vert ;
- symbole de validation ;
- son positif.

Mauvaise réponse :

- rouge ;
- vibration du réticule ;
- son négatif.

Options futures possibles :

- réduction des clignotements ;
- taille du réticule ;
- contraste renforcé ;
- mode daltonien ;
- durée d’observation augmentée.

Pour le MVP, l’extinction doit éviter les flashs rapides répétés.

------------------------------------------------------------------------

## 23. Prototype greybox

Le greybox ne doit pas attendre les assets définitifs.

### Style du prototype

- murs gris clair ;
- sol gris sombre ;
- objets colorés simplement ;
- lumière principale chaude ;
- formes primitives ;
- réticule fonctionnel ;
- interface minimale.

### Couleurs d’identification temporaires

| Objet      | Couleur          |
|------------|------------------|
| Lit        | bleu             |
| Armoire    | brun             |
| Chaise     | rouge            |
| Plante     | vert             |
| Télévision | noir             |
| Lampe      | jaune            |
| Tableau    | violet           |
| Livres     | couleurs variées |

L’objectif est de tester la mémorisation et non l’apparence finale.

------------------------------------------------------------------------

## 24. Critères de validation artistique

La direction artistique est validée lorsque :

- chaque pièce est identifiable en moins de deux secondes ;
- les objets importants sont immédiatement lisibles ;
- une anomalie peut être vue sur ordinateur et mobile ;
- l’éclairage ne cache pas les changements ;
- les dix salles semblent appartenir à la même maison ;
- la progression chaude vers froide est perceptible mais subtile ;
- une capture d’écran est reconnaissable comme provenant de `Was It There?` ;
- les performances respectent les budgets techniques ;
- le style reste réalisable par un développeur solo.

------------------------------------------------------------------------

## 25. Éléments explicitement exclus

Ne pas ajouter au MVP :

- monstre ;
- personnage visible ;
- sang ;
- corps ;
- jumpscare obligatoire ;
- décor surnaturel complexe ;
- murs qui respirent ;
- maison procédurale ;
- dimensions impossibles ;
- cinématiques ;
- doublage ;
- rendu photoréaliste ;
- post-processing lourd ;
- effets VHS ;
- esthétique PS1 ;
- nombreux shaders personnalisés ;
- météo dynamique ;
- cycle jour-nuit.

------------------------------------------------------------------------

## 26. Règle finale

Toute décision visuelle doit respecter cette priorité :

    Lisibilité du gameplay
    → Cohérence de la maison
    → Atmosphère
    → Beauté graphique

Une pièce simple et parfaitement lisible est préférable à une pièce détaillée dans laquelle les anomalies deviennent injustes.
