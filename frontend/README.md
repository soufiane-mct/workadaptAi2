# WorkAdapt AI — Frontend

Interface web de **WorkAdapt AI**, la plateforme multi-agents de développement continu
des compétences décrite dans le cahier des charges v2.0.

> **État actuel : prototype de démonstration.**
> Aucune API n'est encore branchée. Toutes les données affichées sont fictives et
> proviennent de `src/app/core/data/mock-data.ts`. L'interface est entièrement en
> français ; les identifiants de code (types, statuts, routes internes) restent en
> anglais, comme le veut l'usage Angular.

---

## 1. Pile technique

| Élément | Version | Rôle |
| --- | --- | --- |
| Angular | 22.2 (standalone, signals, new control flow) | Framework applicatif |
| TypeScript | 6.0 | Langage |
| Angular Material | 22.2 (Material 3) | Composants et thème |
| ECharts + ngx-echarts | 6.1 / 22 | Graphiques (radar, barres) |
| ngx-translate | 18 | Prévu pour l'i18n (FR par défaut) |
| Vitest | 5.0 | Tests unitaires |
| Node | ≥ 22.22.3, 24.15+ ou 26+ | Runtime (Angular 22) |

Les polices **Roboto** et **Material Symbols Outlined** sont embarquées via
`@fontsource` (déclarées dans `angular.json`). L'application fonctionne donc
**hors ligne**, sans appel à Google Fonts.

---

## 2. Démarrage

```bash
cd frontend
npm install
npm start          # ng serve → http://localhost:4200
npm run build      # build de production dans dist/frontend
npm test           # tests Vitest
```

Prérequis : Node 22.22.3+, 24.15+ ou 26+. Node 25 n'est **pas** supporté par Angular 22.

---

## 3. Comptes de démonstration

La page de connexion propose quatre profils ; aucun mot de passe n'est demandé.
La session est conservée dans `localStorage` (clé `workadapt.session`).

| Rôle | Compte | Page d'arrivée |
| --- | --- | --- |
| Employé | Soufiane Mechta — Développeur Backend | `/app/tableau-de-bord` |
| Superviseur | Ahmed El Fellah — Responsable technique | `/app/validations` |
| RH | Kawtar Souiyah — Chargée RH | `/app/rh` |
| Administrateur | Admin WorkAdapt | `/app/agents` |

Les gardes de route (`authGuard`, `roleGuard`) empêchent l'accès aux pages non
autorisées et redirigent vers une page « Accès refusé » explicative.
**Ce contrôle est purement côté client** : il ne remplace pas l'autorisation
serveur, qui sera implémentée dans le backend Spring Boot.

---

## 4. Structure

```
src/
├─ app/
│  ├─ app.config.ts          # providers : router, animations, ECharts ciblé
│  ├─ app.routes.ts          # routes françaises + gardes de rôle
│  ├─ core/
│  │  ├─ models.ts           # contrats typés (miroir des futurs DTO de l'API)
│  │  ├─ auth/               # session simulée + gardes
│  │  ├─ ui/
│  │  │  └─ chart-theme.ts   # palette et styles partagés des graphiques
│  │  └─ data/
│  │     ├─ data.service.ts  # POINT D'ACCÈS UNIQUE aux données
│  │     └─ mock-data.ts     # jeu de démonstration
│  ├─ shared/
│  │  ├─ layout/             # coque : sidenav, topbar, navigation par rôle
│  │  └─ ui/                 # kpi-card, skill-bar, page-header, status-chip
│  └─ features/
│     ├─ auth/               # connexion (4 profils), page « Accès refusé »
│     ├─ employee/           # tableau de bord, compétences, parcours,
│     │                      # formats de formation, évaluation finale,
│     │                      # certificats, profil
│     ├─ interview/          # entretien IA (chat simulé)
│     ├─ supervisor/         # validations + suivi de progression de l'équipe
│     ├─ hr/                 # vue RH, utilisateurs/RBAC, journal d'audit
│     └─ control-center/     # AI Agent Control Center (7 agents, workflows, échanges)
└─ styles.scss               # thème Material 3 + jetons de design --wa-*
```

### Règle d'architecture

**Aucun composant ne contient de données en dur.** Toute lecture passe par
`DataService` (signaux en lecture seule : `skills()`, `courses()`, `approvals()`,
`agents()`, `kpis()`, etc.). Le jour où l'API existe, seule l'implémentation de
`DataService` change — les composants restent identiques.

### Identité visuelle

Les couleurs, rayons, ombres et dégradés sont centralisés dans `styles.scss`
(jetons `--wa-*`) et alignés sur les jetons Material 3. Les graphiques ECharts
partagent la palette de `core/ui/chart-theme.ts`. La navigation latérale est
sombre pour détacher la marque et hiérarchiser le contenu ; la zone de travail
reste claire et très contrastée.

### Parcours, formats et évaluation (CDC §5.X)

- **`/app/formations`** — catalogue des **sept formats** du cahier des charges :
  multimédia, interactive, pratique, projet, simulation / laboratoire virtuel,
  personnalisée avec l'IA, collaborative. Chaque fiche présente la
  présentation, le déroulement, le rôle de l'IA et un exemple.
- **`/app/parcours`** — tableau de démonstration `Étape · Type · Activité ·
  Statut`, détail des étapes et aperçu du processus post-formation.
- **`/app/parcours/:courseId/evaluation`** — les six étapes du CDC :
  1. quiz final (QCM, vrai/faux, question technique, situation professionnelle) ;
  2. évaluation pratique avec critères (vérification automatique ou validation
     humaine) ;
  3. feedback IA (points maîtrisés, difficultés, explications, exercices) ;
  4. rapport de progression (scores, acquis, difficultés, avant/après) ;
  5. certificat interne délivré si quiz ≥ 75 % **et** pratique réussie ;
  6. recommandations suivantes, puis mise à jour du profil.

Aucun résultat n'est décidé automatiquement : les critères non vérifiables
sont marqués « validation humaine » et le certificat reste un document interne.

---

## 5. Passage aux données réelles

1. Créer une implémentation HTTP de `DataService` (`HttpClient` + `Observable`
   converti en signal via `toSignal`, ou `resource()`).
2. Fournir l'URL de base dans un fichier d'environnement
   (`src/environments/environment.ts`, `apiBaseUrl: 'http://localhost:8080/api/v1'`).
3. Basculer le provider :

```ts
// app.config.ts
{ provide: DataService, useClass: HttpDataService }
```

Les chemins d'API attendus suivent le cahier des charges :
`/api/v1/skills`, `/api/v1/courses`, `/api/v1/approvals`,
`/api/v1/certificates`, `/api/v1/agents`, `/api/v1/kpis`, `/api/v1/audit`.

---

## 6. Rôles et navigation

| Page | Route | Employé | Superviseur | RH | Admin |
| --- | --- | :---: | :---: | :---: | :---: |
| Tableau de bord | `/app/tableau-de-bord` | ✔ | ✔ | ✔ | ✔ |
| Mon profil | `/app/profil` | ✔ | — | — | — |
| Mes compétences | `/app/competences` | ✔ | — | — | — |
| Mon parcours | `/app/parcours` | ✔ | — | — | — |
| Formats de formation | `/app/formations` | ✔ | — | — | — |
| Évaluation finale | `/app/parcours/:courseId/evaluation` | ✔ | — | — | — |
| Mes certificats | `/app/certificats` | ✔ | — | — | — |
| Entretien IA | `/app/entretien` | ✔ | — | — | — |
| Validations | `/app/validations` | — | ✔ | — | ✔ |
| Vue RH | `/app/rh` | — | — | ✔ | ✔ |
| Utilisateurs | `/app/utilisateurs` | — | — | — | ✔ |
| Journal d'audit | `/app/audit` | — | — | — | ✔ |
| Control Center | `/app/agents` | — | — | — | ✔ |

---

## 7. Principes issus du cahier des charges

- **Observation ≠ inférence** : chaque compétence affiche sa source (`Observé`,
  `Déclaré`, `Évalué`, `Certifié`), son niveau de confiance et ses preuves.
- **Validation humaine obligatoire** : aucun parcours n'est lancé sans
  approbation du superviseur ; il peut approuver, demander une modification ou rejeter.
- **Aucune décision disciplinaire automatisée** : les écrans le rappellent
  explicitement (entretien, profil, certificats).
- **Transparence des sources** : le profil liste les six sources de données, leur
  état de synchronisation, les finalités, les droits d'accès, la durée de
  conservation et la méthode d'estimation (CDC §12.2).
- **Formats de formation** : les sept formats du CDC (multimédia, interactive,
  pratique, projet, simulation, personnalisée IA, collaborative) sont décrits
  dans un catalogue et utilisés dans les parcours.
- **Évaluation complète** : quiz final (quatre types de questions), évaluation
  pratique avec critères, feedback IA, rapport de progression, certificat et
  recommandations suivantes — dans cet ordre.
- **Certificats internes** : délivrés après quiz final (seuil 75 %) et évaluation
  pratique ; les vidéos ne valident jamais une compétence.
- **Validation humaine** : les critères pratiques non vérifiables
  automatiquement sont transmis au superviseur ; aucun résultat n'est décidé
  automatiquement.

---

## 8. Conventions

- Composants `standalone`, `ChangeDetectionStrategy.OnPush`, signaux.
- Nommage Angular 22 : `dashboard.ts` / `dashboard.html` / `dashboard.scss`,
  classes sans suffixe `Component` (sauf composants partagés historiques).
- Icônes : `<span class="material-symbols-outlined">nom_icone</span>`
  (pas de `mat-icon`, la police Material Symbols est chargée globalement).
- Textes visibles en français ; code, types et statuts en anglais.
- Graphiques : ECharts en import ciblé (`app.config.ts`) pour limiter le bundle.

---

## 9. Tests

```bash
npm test                      # Vitest, exécution unique
npx ng test --watch=false     # équivalent via le CLI Angular
```

La suite couvre l'application, le contrat de `DataService` (compétences,
approbations, progression), le catalogue des sept formats, le quiz final et son
seuil de 75 %, le verrouillage des étapes, la délivrance du certificat,
l'authentification simulée, les gardes de route (`authGuard`, `roleGuard`), la
conversion des statuts en tonalités visuelles et le rendu des écrans de
formation.

État actuel : **7 fichiers, 41 tests au vert**.

---

## 10. Limites connues du prototype

- Données fictives, aucune persistance : un rechargement réinitialise les
  décisions d'approbation et la progression des modules.
- L'évaluation finale reste accessible en mode démonstration même si le parcours
  n'est pas terminé à 100 % ; un bandeau le signale explicitement.
- Le quiz, l'évaluation pratique et le feedback utilisent un jeu de questions et
  de critères prédéfinis ; aucun moteur de correction réel n'est branché.
- Pas d'authentification réelle (pas de JWT, pas de mot de passe).
- Chat de l'entretien IA simulé par un jeu de réponses prédéfinies.
- Téléchargement des certificats PDF désactivé.
- Le radar et le graphique d'écarts sont calculés à partir du même jeu de
  compétences que la page « Mes compétences ».

---

## 11. Prochaines étapes

1. Backend Spring Boot + PostgreSQL (`workadapt`), endpoint
   `POST /api/v1/agent/events` pour le Desktop Agent.
2. Contrat d'événements (`docs/event-contract.md`) et modèle de données
   (`docs/data-model.sql`).
3. Remplacement de `DataService` par l'implémentation HTTP et ajout des
   intercepteurs JWT.
4. Tests d'intégration frontend/backend et recette des parcours.
