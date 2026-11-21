# Traçabilité des exigences — frontend WorkAdapt AI

Ce document relie chaque exigence du produit de démonstration à son
implémentation, ses tests automatisés et sa preuve de recette.

Les chemins sont relatifs à `frontend/`.

## Sources de vérité

| Couche | Rôle |
| --- | --- |
| `src/app/core/models.ts` | Contrats, unions discriminées et libellés visibles du domaine |
| `src/app/core/data/*.service.ts` | Règles métier, projections limitées au propriétaire et effets de bord |
| `src/app/core/data/demo-state.store.ts` | Persistance locale versionnée |
| `src/app/app.routes.ts` | Matrice d'accès aux espaces |
| `src/app/features/**` | Interfaces, copy française et retours utilisateur |
| `src/app/**/*.spec.ts` | Non-régressions automatisées |

La documentation décrit le comportement ; elle ne remplace pas ces sources de
vérité.

## Matrice des exigences

| ID | Exigence | Implémentation principale | Non-régression automatisée | Recette observable |
| --- | --- | --- | --- | --- |
| F-01 | Sept formats de formation distincts | `core/models.ts`, `core/data/training/builders.ts`, `features/training/*-workspace.ts` | `core/data/training/builders.spec.ts` — « génère un parcours complet pour chacun des 7 formats » ; `features/training/workspace-ux.spec.ts` — sept cas de restauration des notes | Les sept noms et les sept espaces de travail sont visibles |
| F-02 | Cinq méthodes d'évaluation distinctes | `core/models.ts`, `core/data/evaluation/builders.ts`, `features/evaluation/*` | `core/data/evaluation.service.spec.ts` — « produit un document propre à chacune des cinq méthodes » | Les cinq cartes de méthode sont proposées |
| F-03 | Méthode choisie après la fin de la formation | `EvaluationService.canEvaluate`, `EvaluationWorkspace` | `evaluation.service.spec.ts` — « refuse d’ouvrir une évaluation tant que la formation n’est pas terminée » | Le sélecteur apparaît après « Parcours terminé » |
| F-04 | Score pondéré normalisé sur 100 | `EvaluationService.submit`, `correct*` | `evaluation.service.spec.ts` — « normalise le score sur 100 » et « pondère le dossier professionnel 85/15 » | Le rapport affiche une note `/100` |
| F-05 | Seuil propre au programme, 75/100 en démonstration | `program.completion.passScore`, `EvaluationService.submit` | `evaluation.service.spec.ts` — cas de seuil et d'exigences | Le seuil du programme est affiché avant l'épreuve |
| F-06 | Exigences éliminatoires déclarées, sans déduction positionnelle | `ChallengeTask.blockingCriteria`, `InterviewQuestion.blocking`, builders d'évaluation | `evaluation.service.spec.ts` — « suit le critère éliminatoire déclaré, quelle que soit sa position » | Les critères éliminatoires sont explicitement signalés |
| F-07 | Une réponse longue hors sujet ne démontre pas la maîtrise | `EvaluationService.coverage`, `blockingFailures` | `evaluation.service.spec.ts` — « refuse une réponse de soutenance longue mais hors sujet » | L'exigence de fond peut invalider une longue réponse hors sujet |
| E-01 | Échec sans certificat et remédiation non bloquante | `CertificationService.finalize`, `TrainingService.createRemediation` | `certification.service.spec.ts` — « n'émet aucun certificat et ouvre une remédiation après un échec » | Remédiation créée, statut en attente de décision |
| E-02 | Relecture et nouvelle méthode autorisées après échec | `EvaluationWorkspace.retry`, `EvaluationService.open` | `certification.service.spec.ts` — « permet de repasser une autre épreuve après un échec » | Le sélecteur revient après le bouton de reprise |
| E-03 | Certificat uniquement après réussite | `CertificationService.finalize`, `issue` | `certification.service.spec.ts` — « délivre le certificat et ferme la remédiation devenue inutile » | Un certificat n'apparaît pas après un échec |
| E-04 | La réussite arrête la boucle | `EvaluationService.open` contrôle `request.certificateId` | `certification.service.spec.ts` — « refuse toute nouvelle évaluation après un certificat délivré » | Toute nouvelle ouverture est refusée |
| E-05 | Messages spécifiques dans l'interface | `EvaluationWorkspace.failureTitle`, `failureSummary` | `features/evaluation/evaluation-workspace.spec.ts` — seuil et exigence bloquante | « Seuil de réussite non atteint » et « Exigence bloquante non satisfaite » |
| E-06 | Brouillons conservés pendant la passation | `EvaluationService.saveDraft`, composants d'épreuve | `features/evaluation/evaluation-draft.spec.ts` — cinq cas de conservation et réhydratation | Les réponses réapparaissent après navigation |
| C-01 | Collecte permanente | `CollectionService.startAutoCollection`, cadence de trois minutes | `core/data/collection.service.spec.ts` et `shared/layout/shell.spec.ts` | La collecte démarre avec le shell et persiste ses événements |
| C-02 | Fins de formation réinjectées | `TrainingService.complete` → `CollectionService.recordTrainingCompletion` | `core/data/collection.service.spec.ts` — « réinjecte la fin de formation » | Un événement « Formation terminée » apparaît et l'écart est recalculé |
| C-03 | Résultats d'évaluation réinjectés | `CertificationService.finalize` → `CollectionService.recordEvaluationResult` | `core/data/collection.service.spec.ts` — « réinjecte le résultat d’évaluation » | Un événement d'évaluation et une mise à jour de l'écart sont visibles |
| D-01 | Ressources personnelles limitées à l'`employeeId` connecté | `DataService.my*`, méthodes de lecture limitées au propriétaire | `core/data/ownership.persistence.spec.ts` — « n'expose ni les données ni les actions d'un autre collaborateur » | Deux comptes restent isolés dans le même navigateur |
| D-02 | Persistance après rechargement | `DemoStateStore`, `AuthService` | `ownership.persistence.spec.ts` — « restaure le compte, son profil et son parcours après un rechargement » | Profil et parcours restaurés |
| D-03 | Réinitialisations ciblées et confirmées | `DataService.resetDemo`, `resetEmployeeWorkspace`, écrans Admin et Profil | `features/reset-controls.spec.ts` — quatre cas d'annulation et de confirmation | Les comptes et la session survivent aux deux resets |
| P-01 | Consentement de collecte effectif | `ProfileService`, `TrainingService`, `CollectionService` | `core/data/consent.policy.spec.ts` — suspension du parcours et absence d'événement | Aucun nouvel événement après retrait |
| P-02 | Partage superviseur effectif et révocable | `DataService.supervisorBlocked`, `supervisorTeam` | `ownership.persistence.spec.ts` et `consent.policy.spec.ts` — masquage puis rétablissement | Le collaborateur disparaît de l'équipe sans consentement |
| R-01 | Approbation réservée au superviseur | `app.routes.ts`, `TrainingService.approve` | `app.routes.spec.ts` — « réserve l'approbation des parcours au gestionnaire » | Administrateur et RH ne peuvent pas approuver |
| R-02 | Vues RH agrégées et non nominatives | `features/hr/*`, agrégats de `DataService` | `app.routes.spec.ts`, smoke browser des quatre rôles | Aucun nom, e-mail ou niveau individuel dans les vues RH |
| R-03 | Journal d'audit et annuaire réservés à l'administrateur | `app.routes.ts`, navigation, page de confidentialité | `app.routes.spec.ts` — « réserve le journal d'audit et l'annuaire à l'administrateur » | RH et autres rôles sont redirigés vers « Accès refusé » |
| R-04 | Équipe superviseur dérivée du flux de travail réel | `DataService.supervisorTeam` | `ownership.persistence.spec.ts` — consentement par collaborateur | Seuls les collaborateurs concernés par un flux de travail et consentis apparaissent |
| T-01 | Temps crédité égal au temps du parcours | `TrainingService.completeUnit`, `WorkspaceBase` | `training.service.spec.ts` — « permet de terminer un parcours PROJECT (le crédit couvre la durée du parcours) » | Le temps crédité vient des minutes du parcours |
| U-01 | Interface française sans statut technique brut | Templates, tables de libellés de `core/models.ts` | Smoke navigateur sur les espaces des quatre rôles | Aucun enum `IN_PROGRESS`, `CORRIGEE`, etc. visible |
| U-02 | Navigation mobile accessible | `shared/layout/shell.ts`, `shell.html` | `shared/layout/shell.spec.ts` — état, inertie, piège de focus et Échap | Tiroir utilisable au clavier à 390 px |
| M-01 | Treize KPI conservés | `core/data/mock-data.ts` | `core/data/product-contracts.spec.ts` — inventaire et unicité des KPI | Treize cartes et indicateurs présents |
| M-02 | Exports RH simulés et étiquetés | `features/hr/hr-reports.ts` | Smoke de recette RH | Aucun fichier réel produit ; action annoncée comme simulée |
| M-03 | Certificat interne honestement libellé | `features/employee/certificate-detail.ts` | Smoke d'impression navigateur | Mention « aucune valeur réglementaire » et impression native |
| M-04 | Aucun backend frontend choisi | Absence de client HTTP métier et documentation | Documentation du README et du guide | Aucune route ou pile backend annoncée comme implémentée |

## Règles de correction

Toute évolution qui touche l'un des domaines suivants doit mettre à jour la
ligne correspondante :

1. **score ou seuil** : `evaluation.service.ts` et ses tests ;
2. **boucle échec / réussite** : `certification.service.ts`, `training.service.ts`
   et leurs tests ;
3. **ownership ou consentement** : `data.service.ts`, les services concernés,
   `consent.policy.spec.ts` et `ownership.persistence.spec.ts` ;
4. **droits d'un rôle** : `app.routes.ts`, la navigation, la confidentialité et
   `app.routes.spec.ts` ;
5. **format ou méthode** : les builders, l'espace interactif et le test de
   contrat correspondant ;
6. **persistance ou réinitialisation** : `demo-state.store.ts`, `data.service.ts` et
   `reset-controls.spec.ts`.

Une exigence sans source de vérité ou sans test doit être traitée comme non
tracée, même si l'interface semble la respecter.

## Recette de release

La recette de référence comprend :

```powershell
npx tsc -p tsconfig.app.json --noEmit
npm test -- --watch=false
npm run build
```

Puis le smoke navigateur décrit dans
[`guide-demo.md`](guide-demo.md), avec les contrôles suivants :

- les quatre comptes et leurs espaces ;
- les sept formats ;
- les cinq méthodes ;
- l'échec avec exigence bloquante et son message ;
- l'impression native du certificat ;
- les gardes RH et administrateur ;
- le tiroir mobile à 390 px ;
- l'absence d'exception JavaScript pendant le parcours.

Les budgets de production restent 14 kB d'avertissement et 20 kB d'erreur par
style de composant. La construction de la version livrable doit donc être
exécutée sans dépasser ces seuils.
