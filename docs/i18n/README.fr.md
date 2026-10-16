# Ember Scope

**Une visualisation interactive et open source des feux de forêt, réalisée avec React, TypeScript et Three.js.**

[English](../../README.md) · [简体中文](README.zh-CN.md) · [Español](README.es.md) · [Français](README.fr.md) · [日本語](README.ja.md)

Explorez un incident fictif en montagne, de la première ignition à une archive de quatre jours. Déplacez la tête de lecture, consultez la caméra simulée d'un drone, passez de la 2D à la 3D et suivez les largages programmés des avions. La scène, la télémétrie et les graphiques partagent une seule horloge déterministe.

> **DÉMONSTRATION SYNTHÉTIQUE :** Le terrain, les incidents, la télémétrie, les capteurs et les opérations sont simulés. Ce projet n'est pas un outil de surveillance en direct, de prévision physique, de coordination des secours ou de décision d'urgence.

## Vidéo de présentation

[![Démonstration Ember Scope](../media/demo.gif)](https://github.com/JesseQin123/ember-scope/blob/main/docs/media/demo.mp4)

La visite guidée dure environ 40 secondes. Les titres, transitions, surlignages et légendes en anglais expliquent la progression du feu, les capteurs, le largage et le retour en arrière sur la carte. Le GIF de 11 secondes montre quatre jours de feu, de 1,95 à 444,82 hectares, parcourus en environ huit secondes.

[Voir ou télécharger le MP4](https://github.com/JesseQin123/ember-scope/blob/main/docs/media/demo.mp4) · [Présentation en anglais et guide d'enregistrement](../VIDEO.md)

La vidéo montre cette application : progression du feu, vues EO/IR/Thermal, largage aérien et carte topographique. Elle ne contient aucune séquence de la vidéo FireTrace d'origine.

**Présentation :** Découvrez Ember Scope, une visualisation interactive et open source des feux de forêt. Parcourez un paysage fictif, rejouez quatre jours de progression, inspectez six drones simulés et suivez treize moyens d'intervention. Une seule chronologie synchronise chaque scène et graphique. Tout est synthétique, reproductible et utilisable localement.

## Fonctionnalités

- **Incident :** relief érodé, forêt, lac de retenue et rivière reliés, périmètres irréguliers, zones brûlées, dates, calques, opacité et trois graphiques synchronisés.
- **Drones :** six drones sélectionnables, batterie/altitude/état, traces valides, dernière télémétrie figée, caméra de la même scène, chaleur relative IR/Thermal, zoom et suivi.
- **Resources :** treize avions, véhicules et équipes ; modèles procéduraux distincts, vues de poursuite/cockpit, charges programmées, particules de largage et dépôts reconstruits lors du retour en arrière.
- **Lecture :** pause, recherche temporelle, reprise, vitesses, clavier, 2D/3D, thèmes clair/sombre, graphismes réduits et repli explicite sans WebGL.

L'interface reste en anglais. Les cinq README traduisent la documentation, pas l'interface.

## Installation locale

Prérequis : Node.js 22.12+, npm et un navigateur compatible WebGL2.

```sh
git clone https://github.com/JesseQin123/ember-scope.git
cd ember-scope
npm ci
npm run dev
```

Ouvrez **http://127.0.0.1:5173/**. Aucune clé API, aucun serveur de données ni service cartographique externe n'est nécessaire.

```sh
npm test
npm run build
npm run preview
```

L'aperçu du build statique est accessible sur http://127.0.0.1:4173/. Pour les tests navigateur, installez Google Chrome, laissez le serveur de développement actif et lancez `npm run test:e2e` dans un autre terminal. `npm run verify` produit les captures et mesures. `EMBER_BASE_URL` permet de choisir un autre port.

## Commandes

Glissez pour tourner, utilisez le bouton droit pour déplacer et la molette pour zoomer. La chronologie et les dates permettent de changer d'instant. Espace lance ou suspend la lecture hors des champs de saisie. Les flèches avancent de 16 minutes d'archive ; Maj + flèche de 96 minutes. Sélectionnez un objet dans la liste ou sur la carte. Reset view ne réinitialise que la caméra. Masquer la page suspend la lecture.

## Déterminisme, tests et limites

Un seul entier de 0 à 3600 pilote l'archive. Chaque unité représente 96 secondes archivées, du jour fictif 01 à 12 h au jour 05 à 12 h. À 1×, une seconde réelle fait avancer 16 minutes d'archive ; à 4×, la lecture dure environ 90 secondes. Le feu provient d'une grille fixe de 128×128 cellules ; l'eau ne brûle pas. Revenir en arrière restitue le même état. Les drones sont des instantanés d'archive compressés, pas des vols physiques de quatre jours.

La version initiale passe 23 tests de simulation/état et 14 tests navigateur. Consultez les [règles du scénario](../SCENARIO.md) et la [validation](../VALIDATION.md). Les modèles sont stylisés, la fumée est composée de particules, les capteurs affichent une chaleur relative et les dépôts ne modifient pas le feu programmé. Aucune équivalence pixel par pixel n'est revendiquée.

## Inspiration, contributions et licence

Inspiré de la [démonstration FireTrace de Dilum Sanjaya](https://x.com/DilumSanjaya/status/2108241054298415258). Ce projet indépendant n'a ni affiliation ni approbation officielle. Il ne distribue ni code, marque, vidéo, captures, cartes ou modèles de l'original. La [provenance des ressources](../ASSETS.md) décrit les textures et la fumée générées.

Les issues, traductions et PR sont bienvenues ; voir [CONTRIBUTING](../../CONTRIBUTING.md). Le code, les données originales et les ressources du projet sont proposés sous [MIT](../../LICENSE), dans la mesure des droits détenus. Les dépendances conservent leurs licences. Aucun droit exclusif n'est revendiqué sur les images générées par IA ; voir [LICENSES](../../LICENSES.md).
