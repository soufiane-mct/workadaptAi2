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
| Angular Material + CDK | 22.2 | Thème Material 3, breakpoint de mise en page |
| Vitest | 5.0 | Tests unitaires |
| Node | ≥ 22.22.3, 24.15+ ou 26+ | Runtime (Angular 22) |

Les polices **Roboto** et **Material Symbols Outlined** sont embarquées via
`@fontsource` (déclarées dans `angular.json`). L'application fonctionne donc
**hors ligne**, sans appel à Google Fonts. Aucune bibliothèque de graphiques ni
d'internationalisation n'est installée : les visualisations sont en CSS/SVG et
l'interface est en français directement dans les templates.

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
│  ├─ app.config.ts          # providers : router, animations, http
│  ├─ app.routes.ts          # routes françaises + gardes de rôle
│  ├─ core/
│  │  ├─ models.ts           # contrats typés (miroir des futurs DTO de l'API)
│  │  ├─ auth/               # session simulée + gardes (authGuard, roleGuard)
│  │  └─ data/
│  │     ├─ data.service.ts  # POINT D'ACCÈS UNIQUE aux données
│  │     ├─ mock-data.ts     # jeu de démonstration
│  │     ├─ training/        # builders des 7 formats + helpers
│  │     └─ evaluation/      # builders des 5 méthodes d'épreuve
│  ├─ shared/
│  │  ├─ layout/             # coque : sidenav, topbar, navigation par rôle
│  │  └─ ui/                 # kpi-card, skill-bar, page-header, status-chip
│  └─ features/
│     ├─ auth/               # connexion (4 profils), page « Accès refusé »
│     ├─ dashboard/          # dispatcher de tableau de bord par rôle
│     ├─ employee/           # tableau de bord, écarts, parcours, formats,
│     │                      # profil, veille, certificats, entretien
│     ├─ training/           # les 7 espaces de formation interactifs
│     ├─ evaluation/         # les 5 épreuves d'évaluation + orchestrateur
│     ├─ notifications/      # centre de notifications filtré par rôle
│     ├─ legal/              # confidentialité et consentement
│     ├─ supervisor/         # validations, équipe, suivi, résultats
│     ├─ hr/                 # vue RH, besoins, tendances, certifications,
│     │                      # rapports, journal d'audit, annuaire
│     └─ admin/              # vue système, agents IA et orchestration
└─ styles.scss               # thème Material 3 + jetons de design --wa-*
```

Les générateurs de contenu simulé vivent dans `core/data/training/builders.ts`
(les **sept** formats de formation) et `core/data/evaluation/builders.ts`
(les **cinq** méthodes d'évaluation finale).

### Règle d'architecture

**Aucun composant ne contient de données en dur.** Toute lecture passe par
`DataService` (signaux en lecture seule : `skills()`, `requests()`,
`certificates()`, `agents()`, `kpis()`, etc.). Le jour où l'API existe, seule
l'implémentation de `DataService` change — les composants restent identiques.

### Identité visuelle

Les couleurs, rayons, ombres et dégradés sont centralisés dans `styles.scss`
(jetons `--wa-*`) et alignés sur les jetons Material 3. La navigation latérale est
sombre pour détacher la marque et hiérarchiser le contenu ; la zone de travail
reste claire et très contrastée.

### Parcours, formats et évaluation (CDC §5.X)

- **`/app/ecarts`** — l'IA détecte les écarts (Collector, CV, entretien,
  projets, certifications, veille) et notifie l'employé. Celui-ci choisit
  **un écart**, **un seul format** parmi les sept et précise le sujet et
  l'objectif. La demande part ensuite au superviseur.
- **`/app/validations`** — le superviseur approuve, rejette ou demande une
  modification. L'approbation génère et débloque le contenu ; tant qu'elle
  n'est pas donnée, la formation reste inaccessible.
- **`/app/formations/:requestId`** — séance de formation réellement interactive
  selon le format : épisodes multimédias, decks de révision, quiz corrigés,
  éditeur de code vérifié, livrables de projet, scénarios de simulation, tuteur
  IA conversationnel, production collaborative avec revue de pair. La
  progression ne valide que les activités effectivement réalisées : chaque
  étape envoie sa preuve à l'agent d'analyse, qui statue.
- **`/app/evaluations/:requestId`** — après la fin de la formation, l'employé
  choisit **une** des **cinq** méthodes d'épreuve : test de connaissances,
  analyse de cas, épreuve technique, dossier professionnel, soutenance. L'IA
  génère l'épreuve à partir du parcours réellement suivi, puis corrige. Le
  score final est une moyenne pondérée sur **100**, comparée au seuil
  `program.completion.passScore` (75 par défaut). En cas d'échec, l'employé
  peut relire son parcours et **repasser une autre épreuve** ; le certificat
  n'est délivré qu'en cas de réussite.
- **`/app/notifications`** — chaque événement du parcours (écart détecté,
  demande transmise, décision du superviseur, formation terminée, certificat)
  produit une notification dont l'audience est filtrée par rôle.
- **`/app/entretien`** — entretien en cinq temps : analyse du CV, conversation,
  quiz diagnostique, mise en situation puis synthèse avec **trois actions
  concrètes**. Les résultats sont marqués « Évalué » et restent distincts des
  observations du poste.
- **`/app/collecte`** — la collecte est **permanente** : elle tourne en arrière-plan
  (cadence de 3 minutes en démonstration) et le bouton ne sert qu'à forcer une
  reprise. Les événements `TRAINING_COMPLETION` et `EVALUATION_RESULT` sont
  réinjectés dans la collecte.

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
`/api/v1/skills`, `/api/v1/gaps`, `/api/v1/training-requests`,
`/api/v1/programs`, `/api/v1/evaluations`, `/api/v1/certificates`,
`/api/v1/collection/events`, `/api/v1/agents`, `/api/v1/kpis`, `/api/v1/audit`.

---

## 6. Rôles et navigation

| Page | Route | Employé | Superviseur | RH | Admin |
| --- | --- | :---: | :---: | :---: | :---: |
| Tableau de bord | `/app/tableau-de-bord` | ✔ | ✔ | ✔ | ✔ |
| Notifications | `/app/notifications` | ✔ | ✔ | ✔ | ✔ |
| Confidentialité | `/app/confidentialite` | ✔ | ✔ | ✔ | ✔ |
| Profil professionnel | `/app/onboarding` | ✔ | — | — | — |
| Mes écarts | `/app/ecarts` | ✔ | — | — | — |
| Mes formations | `/app/formations` | ✔ | — | — | — |
| Séance de formation | `/app/formations/:requestId` | ✔ | — | — | — |
| Évaluation | `/app/evaluations/:requestId` | ✔ | — | — | — |
| Mes certificats | `/app/certificats` | ✔ | — | — | — |
| Veille technologique | `/app/veille` | ✔ | — | — | — |
| Mon profil | `/app/profil` | ✔ | — | — | — |
| Entretien IA | `/app/entretien` | ✔ | — | — | — |
| Collecte | `/app/collecte` | ✔ | — | — | — |
| Validations | `/app/validations` | — | ✔ | — | — |
| Mon équipe | `/app/equipe` | — | ✔ | — | ✔ |
| Suivi des formations | `/app/suivi-formations` | — | ✔ | — | ✔ |
| Résultats et évaluations | `/app/resultats` | — | ✔ | — | ✔ |
| Pilotage RH | `/app/rh` | — | — | ✔ | ✔ |
| Besoins de formation | `/app/rh/besoins` | — | — | ✔ | ✔ |
| Tendances | `/app/rh/tendances` | — | — | ✔ | ✔ |
| Rapports et exports | `/app/rh/rapports` | — | — | ✔ | ✔ |
| Certifications agrégées | `/app/rh/certifications` | — | — | ✔ | ✔ |
| Administration | `/app/admin` | — | — | — | ✔ |
| Agents IA | `/app/agents` | — | — | ✔ | ✔ |
| Journal d'audit | `/app/rh/audit` | — | — | — | ✔ |
| Utilisateurs et rôles | `/app/rh/utilisateurs` | — | — | — | ✔ |

> **Règles de séparation des privilèges**
> - Les vues RH sont **agrégées et non nominatives** : ni nom, ni e-mail, ni
>   niveau individuel. Le journal d'audit et l'annuaire, nominatifs, sont
>   réservés à l'administrateur.
> - L'approbation d'un curriculum est **réservée au superviseur** : aucun rôle
>   technique ne peut valider un parcours.
> - Les écrans personnels (« Mes formations », « Mes certificats ») ne
>   affichent que le périmètre de l'employé connecté.

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
- **Évaluation au choix** : l'employé choisit **une** des cinq méthodes
  d'épreuve **après** la formation ; l'IA génère l'épreuve à partir du parcours
  terminé, avec pondération, règles éliminatoires et seuil de 75 / 100.
- **Reprise libre** : après un échec, l'employé peut relire son parcours et
  repasser une autre épreuve, en boucle. Seul le certificat délivré arrête la
  boucle.
- **Certificats internes** : délivrés uniquement au-dessus du seuil ; les
  évaluations échouées sont enregistrées sans certificat, avec une remédiation
  non bloquante créée automatiquement.
- **Notifications traçables** : chaque événement du parcours produit une
  notification non disciplinaire, dont l'audience est filtrée par rôle.

---

## 8. Conventions

- Composants `standalone`, `ChangeDetectionStrategy.OnPush`, signaux.
- Nommage Angular 22 : `dashboard.ts` / `dashboard.html` / `dashboard.scss`,
  classes sans suffixe `Component` (sauf composants partagés historiques).
- Icônes : `<span class="material-symbols-outlined">nom_icone</span>`
  (pas de `mat-icon`, la police Material Symbols est chargée globalement).
- Textes visibles en français ; les identifiants de code (types, statuts,
  routes internes) restent en anglais, mais **aucun statut technique n'est
  affiché brut** dans l'interface.

---

## 9. Tests

```bash
npm test                      # Vitest, exécution unique
npx ng test --watch=false     # équivalent via le CLI Angular
```

La suite couvre le scoring des cinq méthodes d'évaluation, les règles
éliminatoires, le cycle échec → reprise → certificat, les conditions de fin de
parcours (dont l'atteignabilité après modification du curriculum), l'analyse
des preuves d'étape, les notifications par rôle et les garde-fous de service.

État actuel : **10 fichiers, 55 tests au vert**.

---

## 10. Limites connues du prototype

- Données fictives, aucune persistance : un rechargement réinitialise les
  demandes de formation, les décisions d'approbation et la progression. Seul
  le compte connecté est conservé (`localStorage`).
- Le contenu des formations et des évaluations est généré de façon
  déterministe côté frontend ; aucun moteur pédagogique réel n'est branché.
- L'évaluation n'est accessible qu'**après** la fin complète de la formation
  (`request.status === 'COMPLETED'`).
- Pas d'authentification réelle (pas de JWT, pas de mot de passe) : le contrôle
  d'accès est purement côté client et devra être reproduit côté serveur.
- L'entretien IA enchaîne des questions et activités prédéfinies ; il n'y a pas
  de modèle de langage connecté, et l'entretien de soutenance est simulé.
- Le contrôle de cohérence temporelle des preuves d'étape est **actif hors mode
  démonstration** (`step-verification.service.ts`). En mode démonstration, le
  temps est compressé (facteur ×20) : le ratio temps passé / durée planifiée
  n'a pas de sens et le contrôle est explicitement écarté, avec la trace dans
  le verdict. Le mode se règle dans l'écran d'administration.
- Téléchargement des certificats PDF désactivé ; les rapports CSV/PDF RH sont
  simulés et étiquetés comme tels.
- Les 13 KPI, besoins et tendances sont des jeux de démonstration statiques :
  ils seront calculés à partir des événements persistés côté backend.
- Le consentement est enregistré et affiché, mais la politique de collecte
  (suspension au retrait) reste à implémenter côté backend.

---

## 11. Prochaines étapes

1. Backend Spring Boot + PostgreSQL (`workadapt`), endpoint
   `POST /api/v1/agent/events` pour le Desktop Agent.
2. Contrat d'événements (`docs/event-contract.md`) et modèle de données
   (`docs/data-model.sql`).
3. Remplacement de `DataService` par l'implémentation HTTP, ajout des
   intercepteurs JWT et **reproduction des contrôles d'accès côté serveur**
   (périmètre employé, rôle superviseur pour l'approbation, agrégat RH).
4. Persistance des transitions métier (profil, parcours, évaluations,
   certificats, collecte, journal d'audit) et calcul des KPI sur événements.
5. Reproduction du contrôle de cohérence temporelle côté serveur (temps réel
   mesuré, hors mode démonstration).
6. Tests d'intégration frontend/backend et recette des parcours.
