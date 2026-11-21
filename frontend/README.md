# WorkAdapt AI — Frontend de démonstration

Interface Angular autonome de **WorkAdapt AI** pour la boucle de développement
continu des compétences : collecte permanente, détection d'écarts, formation,
évaluation, certification interne et pilotage.

> **Statut : produit de démonstration frontend autonome.**
> Aucun serveur métier n'est requis. Les données sont fictives, amorcées
> localement puis persistées dans le navigateur. L'interface et ses messages
> sont en français ; les statuts et codes internes ne sont jamais affichés bruts.

Ce frontend est distinct du collecteur Python du dépôt. Ce dernier n'est pas
branché à l'application et ne constitue pas le backend du produit.

## Sommaire

1. [Démarrage](#1-démarrage)
2. [Comptes et espaces](#2-comptes-et-espaces)
3. [Boucle produit](#3-boucle-produit)
4. [Sept formats de formation](#4-sept-formats-de-formation)
5. [Cinq méthodes d'évaluation](#5-cinq-méthodes-dévaluation)
6. [Certification et reprise](#6-certification-et-reprise)
7. [Rôles, propriété et consentement](#7-rôles-propriété-et-consentement)
8. [Collecte permanente](#8-collecte-permanente)
9. [Persistance et réinitialisation](#9-persistance-et-réinitialisation)
10. [Architecture](#10-architecture)
11. [Qualité et build](#11-qualité-et-build)
12. [Limites de la démonstration](#12-limites-de-la-démonstration)
13. [Documentation](#13-documentation)

---

## 1. Démarrage

Prérequis : Node.js 22 ou 24 LTS, ou Node.js 26, et npm 11.

```powershell
cd frontend
npm ci
npm start
```

L'application est ensuite disponible sur `http://localhost:4200`.

Commandes de validation :

```powershell
npx tsc -p tsconfig.app.json --noEmit
npm test -- --watch=false
npm run build
```

- le build de production est généré dans `frontend/dist/frontend` ;
- les tests utilisent Vitest via le builder Angular ;
- les budgets de styles de composants sont 14 kB (avertissement) et 20 kB
  (erreur).

---

## 2. Comptes et espaces

La page de connexion propose quatre comptes de démonstration, sans mot de
passe. Tous les rôles rejoignent le tableau de bord dispatcher par rôle.

| Rôle | Compte | Périmètre |
| --- | --- | --- |
| Employé | Soufiane Mechta — Développeur backend | Son profil, ses écarts, ses formations, ses évaluations et ses certificats |
| Superviseur | Ahmed El Fellah — Responsable ingénierie | Validation des parcours et suivi consenting de son équipe |
| Ressources humaines | Kawtar Souiyah — Responsable développement RH | Agrégats, besoins, tendances, rapports et certifications agrégées |
| Administrateur | Yassine Berrada — Administrateur plateforme | Paramètres, agents, journal d'audit, annuaire et réinitialisation globale |

Des comptes employés peuvent aussi être créés depuis l'application. Ils restent
disponibles sur le navigateur utilisé.

Trois clés `localStorage` sont employées :

| Clé | Contenu |
| --- | --- |
| `workadapt.session` | Session et rôle courants |
| `workadapt.accounts` | Comptes créés localement |
| `workadapt.demo-state.v1` | État de démonstration versionné |

Les gardes `authGuard` et `roleGuard` contrôlent les routes. Dans cette
démonstration, ce contrôle est côté client et ne remplace pas une autorisation
serveur future.

---

## 3. Boucle produit

Le parcours principal démontré est le suivant :

1. **Collecte** — la collecte continue alimente les observations et les écarts.
2. **Choix du parcours** — l'employé choisit un écart et l'un des sept formats.
3. **Validation humaine** — le superviseur approuve, ajuste ou rejette le
   curriculum complet, déjà visible avant la décision.
4. **Formation** — chaque unité produit une preuve vérifiée ; la progression
   n'est validée que sur les activités réellement réalisées.
5. **Fin de formation** — la preuve de fin est réinjectée dans la collecte et
   l'écart est recalculé.
6. **Choix de l'évaluation** — après la fin de la formation, l'employé choisit
   l'un des cinq instruments d'évaluation.
7. **Résultat** — la réussite délivre un certificat interne ; l'échec crée une
   remédiation non bloquante et permet de recommencer.
8. **Pilotage** — le superviseur suit les collaborateurs qui ont consenti au
   partage ; les RH restent sur des agrégats ; l'administrateur administre le
   système.

Les fin de formation et les résultats d'évaluation sont réinjectés comme
événements de collecte. Les notification, preuves, décisions, évaluations et
certificats restent rattachés à leur collaborateur.

---

## 4. Sept formats de formation

Chaque format possède une structure, une interaction et une preuve distinctes.

| Format | Expérience |
| --- | --- |
| Multimédia | Épisodes guidés avec progression, notes et validation d'activité |
| Interactive | Séances de révision par cartes et questions à reveal |
| Pratique | Laboratoires, commandes, contrôles et restitution |
| Projet | Livrable structuré, jalons et démonstration de résultat |
| Simulation | Scénarios, décisions et débriefing |
| Tuteur IA | Dialogue guidé et teach-back documenté |
| Collaboratif | Contributions, revues croisées et synthèse collective |

Les sept catalogues sont construits dans
`src/app/core/data/training/builders.ts`. Les espaces interactifs se trouvent
dans `src/app/features/training/`.

Le temps crédité correspond à la durée du curriculum et aux jalons prévus ; il
ne provient jamais du temps d'écran réellement observé.

---

## 5. Cinq méthodes d'évaluation

Le collaborateur choisit sa méthode **après** la formation. Chaque méthode a
son propre document, son mode de passation et sa correction.

| Méthode | Instrument | Preuve principale |
| --- | --- | --- |
| Test de connaissances | Examen écrit, choix multiples, questions ouvertes et techniques | Score par section et analyse des erreurs |
| Épreuve technique | Tâches vérifiables dans un environnement simulé | Critères observés, note d'exécution et journal |
| Analyse de cas | Diagnostic, hypothèses, décisions et justification | Raisonnement évalué par grille |
| Dossier professionnel | Livrable complet et entretien de vérification | Conformité du dossier et defense des choix |
| Soutenance professionnelle | Questions de fond, relances, contre-exemples et situations | Grille d'entretien |

Les documents sont construits dans
`src/app/core/data/evaluation/builders.ts`. Les cinq épreuves sont dans
`src/app/features/evaluation/`.

Le score final est une **moyenne pondérée normalisée sur 100**, et non une
somme brute de points. Il est comparé au seuil
`program.completion.passScore`, actuellement **75/100** pour les programmes de
démonstration.

Les exigences éliminatoires sont déclarées explicitement dans les documents.
Une exigence non satisfaite invalide l'épreuve quel que soit le score ; la
longueur d'une réponse ne neutralise jamais cette règle.

---

## 6. Certification et reprise

### Réussite

- le score atteint le seuil du programme ;
- aucune exigence éliminatoire n'est violée ;
- le certificat interne est délivré ;
- le résultat est réinjecté dans la collecte et l'écart est recalculé ;
- les remédiations ouvertes sur le même écart sont closes ;
- aucune nouvelle évaluation n'est ouverte pour cette formation.

### Échec

- aucun certificat n'est émis ;
- l'interface distingue le seuil non atteint d'une exigence bloquante ;
- une remédiation distincte est créée et soumise au superviseur ;
- cette remédiation est **non bloquante** ;
- l'employé peut relire le parcours et choisir une nouvelle méthode ;
- la reprise reste possible jusqu'à la délivrance du certificat.

Le certificat est un **document interne de démonstration**. Il n'a aucune
valeur réglementaire et ne constitue ni une certification officielle ni une
habilitation. Le bouton « Imprimer via le navigateur » déclenche réellement
l'impression du navigateur ; aucun PDF natif n'est fabriqué.

---

## 7. Rôles, propriété et consentement

### Routes par rôle

| Espace | Employé | Superviseur | RH | Administrateur |
| --- | :---: | :---: | :---: | :---: |
| Tableau de bord, notifications, confidentialité | ✔ | ✔ | ✔ | ✔ |
| Profil, écarts, formations, évaluations, certificats, veille, collecte | ✔ | — | — | — |
| Validation des parcours | — | ✔ | — | — |
| Suivi, résultats et équipe | — | ✔ | — | ✔ |
| Pilotage RH agrégé | — | — | ✔ | ✔ |
| Agents IA | — | — | ✔ | ✔ |
| Administration | — | — | — | ✔ |
| Journal d'audit et annuaire | — | — | — | ✔ |

### Propriété des données

- Les lectures et actions personnelles sont filtrées par l'`employeeId` de la
  session, et pas seulement masquées visuellement.
- Deux employés peuvent utiliser le même navigateur sans partager leur profil,
  leurs preuves, leurs formations, leurs évaluations, leurs certificats ou
  leurs notifications.
- L'équipe du superviseur est dérivée du flux de travail réel. Chaque collaborateur
  n'y apparaît que si le partage avec le superviseur est consenti.
- Les vues RH sont agrégées et non nominatives : aucun nom, e-mail, niveau
  individuel, écart individuel ou résultat individuel n'y est exposé.
- Le journal d'audit et l'annuaire nominatif sont réservés à
  l'administrateur.
- L'approbation d'un curriculum est réservée au superviseur.

### Consentements

Deux consentements sont distincts :

- **Collecte permanente** : son retrait bloque l'envoi du profil à l'IA,
  suspend le parcours en cours, empêche l'envoi de preuves et l'enregistrement
  de nouveaux événements pour le collaborateur. La cadence de collecte reste
  active et trace son exécution sans constituer un événement de données.
- **Partage avec le superviseur** : son retrait masque progression, résultats
  et certificats au superviseur. Le superviseur peut néanmoins statuer sur une
  demande déjà transmise.

Le détail contractuel figure dans
[`docs/matrice-roles-ownership.md`](docs/matrice-roles-ownership.md).

---

## 8. Collecte permanente

La collecte frontend démarre avec le shell et s'arrête lorsque l'application
est fermée. Sa cadence métier de démonstration est de trois minutes ; une
vérification interne est réalisée toutes les quinze secondes.

Elle :

- simule les sources autorisées et conserve les événements horodatés ;
- persiste les événements dans l'état local ;
- n'enregistre aucune donnée pour un collaborateur sans consentement de
  collecte ;
- réinjecte les fins de formation et les résultats d'évaluation ;
- alimente les écarts, les compétences et les indicateurs de la boucle.

Le collecteur Python réel du dépôt est un composant séparé. Il n'est ni
simulé par, ni connecté à, ce frontend dans la démonstration actuelle.

---

## 9. Persistance et réinitialisation

`DemoStateStore` conserve l'état dans une enveloppe versionnée :

```json
{
  "version": 1,
  "savedAt": "2026-11-21T05:00:00.000Z",
  "data": {}
}
```

Une enveloppe de version incompatible est ignorée proprement. Les changements
importants sont persistés immédiatement : parcours, preuves, évaluations,
certificats, collection, notifications et audit restent disponibles après un
rechargement.

Deux réinitialisations sont proposées avec confirmation explicite :

| Action | Portée | Compte et session |
| --- | --- | --- |
| **Rétablir les données** — Administrateur | Restaure le jeu de démonstration global | Conservés |
| **Effacer mon espace** — Employé | Efface uniquement l'espace du collaborateur connecté | Conservés |

Les confirmations utilisent la fenêtre native du navigateur et sont écrites en
français.

---

## 10. Architecture

```text
src/app/
├─ app.config.ts                 providers Angular et animations
├─ app.routes.ts                 routes françaises et gardes de rôle
├─ core/
│  ├─ auth/                      session locale, gardes et comptes locaux
│  ├─ models.ts                  contrats typés du domaine
│  └─ data/
│     ├─ demo-state.store.ts     persistance locale versionnée
│     ├─ data.service.ts         façade de projections et d'actions
│     ├─ training.service.ts     règles du parcours et des preuves
│     ├─ evaluation.service.ts   correction, score et règles éliminatoires
│     ├─ certification.service.ts     issuance du certificat et remédiation
│     ├─ collection.service.ts   collecte permanente et réinjection
│     ├─ training/               constructeurs des sept formats
│     └─ evaluation/             constructeurs des cinq méthodes
├─ features/
│  ├─ auth/                      connexion et accès refusé
│  ├─ dashboard/                 dispatch par rôle
│  ├─ employee/                  espace collaborateur
│  ├─ training/                  sept expériences de formation
│  ├─ evaluation/                cinq expériences d'évaluation
│  ├─ supervisor/                validation et suivi avec consentement
│  ├─ hr/                        agrégats RH
│  ├─ admin/                     administration
│  └─ legal/                     confidentialité et consentement
└─ shared/                       structure, navigation mobile et composants d'interface
```

Les règles métier restent dans les services Angular. `DataService` est la
façade principale utilisée par les écrans, mais des fixtures de présentation
locales restent possibles. Une future API devra remplacer les sources de
données sans déplacer ces règles dans les composants.

Les composants sont standalone, utilisent les signaux et
`ChangeDetectionStrategy.OnPush`. Les écrans personnels sont explicitement limités
par `employeeId` ; la navigation mobile expose `aria-expanded`, rend le tiroir
fermé `inert`, ferme avec Échap et piège le focus pendant son ouverture.

---

## 11. Qualité et build

La suite de référence contient 21 fichiers de tests et 109 cas. Elle couvre
notamment :

- les sept formats, les cinq méthodes, les 13 KPI et le seuil de réussite ;
- la restauration des notes et de la progression de chaque format ;
- la collecte permanente, sa persistance et la réinjection des fins de
  formation et des résultats d'évaluation ;
- une réponse de soutenance longue mais hors sujet ;
- la conservation des brouillons d'évaluation ;
- l'isolation `employeeId` et la persistance après rechargement ;
- le consentement de collecte et le partage superviseur ;
- la matrice des routes et des rôles ;
- les confirmations de réinitialisation ;
- les messages d'échec de l'interface d'évaluation ;
- le tiroir mobile, son état accessible et le piège de focus.

```powershell
npx tsc -p tsconfig.app.json --noEmit
npm test -- --watch=false
npm run build
```

Les 13 KPI de démonstration restent inchangés : couverture de collecte,
précision d'identification des compétences, pertinence des écarts, pertinence
des recommandations, temps de génération d'un parcours, taux d'approbation,
taux de complétion, taux de réussite aux évaluations, amélioration des
compétences, réduction des écarts, taux de boucles terminées, taux de
réussite des workflows et temps de réponse API.

Les exports RH CSV/PDF sont **simulés** : l'interface ne fabrique aucun
fichier. Ils sont explicitement étiquetés comme tels.

---

## 12. Limites de la démonstration

- Les données sont fictives et locales à un navigateur ; aucun
  synchronisation multi-appareil n'est disponible.
- L'authentification et les gardes sont simulés côté client.
- L'IA, les preuves, les agents et la génération de curriculum sont déterministes
  et simulés ; aucun modèle de langage n'est connecté.
- Les KPI, besoins, tendances et exports reposent sur des jeux de
  démonstration statiques.
- Les certificats sont des documents internes sans valeur réglementaire.
- L'impression dépend du navigateur et des imprimantes installées.
- Aucune pile backend n'est choisie. Les routes API, l'authentification et le
  stockage serveur restent des décisions ouvertes.

Le collecteur Python, les tests du collecteur, ses données et son archive ne
font pas partie de ce frontend et ne doivent pas être modifiés pour ce projet.

---

## 13. Documentation

- [Guide de démonstration](docs/guide-demo.md)
- [Matrice des rôles et de la propriété des données](docs/matrice-roles-ownership.md)
- [Traçabilité des exigences](docs/tracabilite.md)
