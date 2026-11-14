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
│     ├─ dashboard/          # dispatcher de tableau de bord par rôle
│     ├─ employee/           # tableau de bord, compétences, parcours,
│     │                      # formats, séance de formation, évaluation,
│     │                      # certificats, profil
│     ├─ notifications/      # centre de notifications filtré par rôle
│     ├─ interview/          # entretien IA en cinq phases
│     ├─ supervisor/         # validations, équipe, suivi, résultats
│     ├─ hr/                 # vue RH, besoins, tendances, certifications,
│     │                      # rapports, utilisateurs, journal d'audit
│     └─ control-center/     # AI Agent Control Center (7 agents, workflows, échanges)
└─ styles.scss               # thème Material 3 + jetons de design --wa-*
```

Les générateurs de contenu simulé vivent dans `core/data/` :
`training-generator.ts` (les sept formats de formation interactive) et
`evaluation-generator.ts` (les sept formats d'évaluation finale).

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

- **`/app/formations`** — l'IA détecte les écarts (Collector, CV, entretien,
  projets, certifications, évaluations) et notifie l'employé. Celui-ci choisit
  **un écart**, **un seul format** parmi les sept et précise le sujet et
  l'objectif. La demande part ensuite au superviseur.
- **`/app/validations`** — le superviseur approuve, rejette ou demande une
  modification. L'approbation génère et débloque le contenu ; tant qu'elle
  n'est pas donnée, la formation reste inaccessible.
- **`/app/formations/:requestId`** — séance de formation réellement interactive
  selon le format : chapitres vidéo, cartes de révision, quiz corrigés,
  éditeur de code vérifié, livrables de projet, scénarios de simulation, tuteur
  IA conversationnel, production collaborative avec revue de pair. La
  progression ne valide que les activités effectivement réalisées.
- **`/app/parcours`** — tableau de démonstration `Étape · Type · Activité ·
  Statut` et détail des étapes du parcours.
- **`/app/parcours/:courseId/evaluation`** — l'employé choisit **un seul** des
  sept formats. L'IA génère l'évaluation à partir du parcours réellement suivi,
  puis l'employé réalise ses activités (analyse de ressources, quiz, exercice
  technique, livrable, mise en situation, entretien avec le tuteur IA, revue de
  pair). Chaque activité est pondérée ; le score final est calculé sur 100.
  Le certificat interne n'est délivré qu'à partir de **75 / 100**, et les
  évaluations échouées sont enregistrées sans certificat.
- **`/app/notifications`** — chaque événement du parcours (écart détecté,
  demande transmise, décision du superviseur, formation terminée, certificat)
  produit une notification dont l'audience est filtrée par rôle.
- **`/app/entretien`** — entretien en cinq temps : analyse du CV, conversation,
  quiz diagnostique, mise en situation puis synthèse avec **trois actions
  concrètes**. Les résultats sont marqués « Évalué » et restent distincts des
  observations du poste.

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
| Notifications | `/app/notifications` | ✔ | ✔ | ✔ | ✔ |
| Mon profil | `/app/profil` | ✔ | — | — | — |
| Mes compétences | `/app/competences` | ✔ | — | — | — |
| Mon parcours | `/app/parcours` | ✔ | — | — | — |
| Formats de formation | `/app/formations` | ✔ | — | — | — |
| Séance de formation | `/app/formations/:requestId` | ✔ | — | — | — |
| Évaluation finale | `/app/parcours/:courseId/evaluation` | ✔ | — | — | — |
| Mes certificats | `/app/certificats` | ✔ | — | — | — |
| Entretien IA | `/app/entretien` | ✔ | — | — | — |
| Validations | `/app/validations` | — | ✔ | — | ✔ |
| Mon équipe | `/app/equipe` | — | ✔ | — | ✔ |
| Suivi des formations | `/app/suivi-formations` | — | ✔ | — | ✔ |
| Résultats et évaluations | `/app/resultats` | — | ✔ | — | ✔ |
| Besoins de formation | `/app/besoins-formation` | — | — | ✔ | ✔ |
| Tendances | `/app/tendances` | — | — | ✔ | ✔ |
| Formations et certifications | `/app/formations-certifications` | — | — | ✔ | ✔ |
| Rapports et exports | `/app/rapports` | — | — | ✔ | ✔ |
| Vue RH | `/app/rh` | — | — | ✔ | ✔ |
| Utilisateurs | `/app/utilisateurs` | — | — | — | ✔ |
| Journal d'audit | `/app/audit` | — | — | — | ✔ |
| Control Center | `/app/agents` | — | — | — | ✔ |

---

## 7. Principes issus du cahier des charges

- **Observation ≠ inférence** : chaque compétence affiche sa source (`Observé`,
  `Déclaré`, `Évalué`, `Certifié`), son niveau de confiance et ses preuves.
- **Validation humaine obligatoire** : aucun parcours ni aucune formation n'est
  lancé sans approbation du superviseur ; il peut approuver, demander une
  modification ou rejeter, et chaque décision est conservée avec sa date.
- **Aucune décision disciplinaire automatisée** : les écrans le rappellent
  explicitement (entretien, profil, certificats, notifications).
- **Transparence des sources** : le profil liste les six sources de données, leur
  état de synchronisation, les finalités, les droits d'accès, la durée de
  conservation et la méthode d'estimation (CDC §12.2).
- **Formats de formation réels** : les sept formats du CDC (multimédia,
  interactive, pratique, projet, simulation, personnalisée IA, collaborative)
  ne sont pas des fiches de texte : chacun produit une séance interactive
  (vidéo, cartes, quiz, code, livrable, scénario, tuteur, pair).
- **Évaluation au choix** : l'employé choisit **un seul** format d'évaluation ;
  l'IA génère les activités à partir du parcours terminé, avec pondération et
  seuil de 75 / 100.
- **Certificats internes** : délivrés uniquement au-dessus du seuil ; les
  évaluations échouées sont enregistrées sans certificat, avec un parcours de
  consolidation proposé.
- **Notifications traçables** : chaque événement du parcours produit une
  notification non disciplinaire, dont l'audience est filtrée par rôle.

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
approbations, progression), le parcours complet de formation validée
(demande → décision → génération → progression → clôture), l'évaluation dans un
format choisi (réussite et échec), les notifications par rôle et l'entretien
diagnostique, ainsi que le catalogue des sept formats, le quiz historique et son
seuil, les gardes de route et le rendu des écrans.

État actuel : **8 fichiers, 50 tests au vert**.

---

## 10. Limites connues du prototype

- Données fictives, aucune persistance : un rechargement réinitialise les
  demandes de formation, les décisions d'approbation et la progression.
- Le contenu des formations et des évaluations est généré de façon
  déterministe côté frontend ; aucun moteur pédagogique réel n'est branché.
- L'évaluation finale reste accessible en mode démonstration même si le parcours
  n'est pas terminé à 100 % ; un bandeau le signale explicitement.
- Pas d'authentification réelle (pas de JWT, pas de mot de passe).
- L'entretien IA enchaîne des questions et activités prédéfinies ; il n'y a pas
  de modèle de langage connecté.
- Téléchargement des certificats PDF désactivé ; les rapports CSV/PDF RH sont
  simulés.

---

## 11. Prochaines étapes

1. Backend Spring Boot + PostgreSQL (`workadapt`), endpoint
   `POST /api/v1/agent/events` pour le Desktop Agent.
2. Contrat d'événements (`docs/event-contract.md`) et modèle de données
   (`docs/data-model.sql`).
3. Remplacement de `DataService` par l'implémentation HTTP et ajout des
   intercepteurs JWT.
4. Tests d'intégration frontend/backend et recette des parcours.
