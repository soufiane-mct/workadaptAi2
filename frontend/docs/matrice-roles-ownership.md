# Matrice des rôles et de la propriété des données

Cette matrice décrit les règles appliquées par le frontend de démonstration.
Elle distingue trois notions :

- **rôle** : capacité d'accès à un espace ou à une action ;
- **propriété** : droit de lecture ou d'écriture sur une ressource
  personnellement identifiée ;
- **consentement** : autorisation explicite de partager une projection
  nominative avec le superviseur.

## Rôles

| Identifiant interne | Libellé visible | Rôle métier |
| --- | --- | --- |
| `EMPLOYEE` | Employé | Parcours individuel : profil, écarts, formation, évaluation, certificat |
| `MANAGER` | Superviseur | Validation des parcours et pilotage de l'équipe avec consentement |
| `RH` | Ressources humaines | Pilotage collectif agrégé |
| `ADMIN` | Administrateur | Administration technique, audit et annuaire |

Les identifiants ci-dessus n'apparaissent pas bruts dans l'interface.

## Accès aux routes

| Route | Employé | Superviseur | RH | Administrateur |
| --- | :---: | :---: | :---: | :---: |
| `/app/tableau-de-bord` | ✔ | ✔ | ✔ | ✔ |
| `/app/notifications` | ✔ | ✔ | ✔ | ✔ |
| `/app/confidentialite` | ✔ | ✔ | ✔ | ✔ |
| `/app/onboarding` | ✔ | — | — | — |
| `/app/collecte` | ✔ | — | — | — |
| `/app/ecarts` | ✔ | — | — | — |
| `/app/ecarts/:gapId` | ✔ | — | — | — |
| `/app/formations` | ✔ | — | — | — |
| `/app/formations/:requestId` | ✔ | — | — | — |
| `/app/evaluations/:requestId` | ✔ | — | — | — |
| `/app/certificats` | ✔ | — | — | — |
| `/app/certificats/:id` | ✔ | — | — | — |
| `/app/veille` | ✔ | — | — | — |
| `/app/profil` | ✔ | — | — | — |
| `/app/entretien` | ✔ | — | — | — |
| `/app/validations` | — | ✔ | — | — |
| `/app/validations/:requestId` | — | ✔ | — | — |
| `/app/suivi-formations` | — | ✔ | — | ✔ |
| `/app/resultats` | — | ✔ | — | ✔ |
| `/app/equipe` | — | ✔ | — | ✔ |
| `/app/agents` | — | — | ✔ | ✔ |
| `/app/rh` | — | — | ✔ | ✔ |
| `/app/rh/besoins` | — | — | ✔ | ✔ |
| `/app/rh/tendances` | — | — | ✔ | ✔ |
| `/app/rh/rapports` | — | — | ✔ | ✔ |
| `/app/rh/certifications` | — | — | ✔ | ✔ |
| `/app/rh/audit` | — | — | — | ✔ |
| `/app/rh/utilisateurs` | — | — | — | ✔ |
| `/app/admin` | — | — | — | ✔ |

Une route interdite redirige vers `/app/acces-refuse`.

## Propriété des ressources

| Ressource | Employé connecté | Superviseur | RH | Administrateur |
| --- | --- | --- | --- | --- |
| Profil, compétences, historique | Lecture et modification de son espace | Projection nominative seulement si consentement | Agrégats seulement | Consultation technique limitée à l'annuaire |
| Écarts et preuves | Lecture et action sur les siens | Vue d'équipe si consentement | Agrégats seulement | Aucune projection nominative de compétences |
| Demandes et parcours | Création et consommation de ses demandes | Décision sur les demandes reçues | Agrégats seulement | Administration générale, sans approbation |
| Progression et notes | Lecture et écriture de son parcours | Résultat si consentement | Agrégats seulement | Aucune modification pédagogique |
| Évaluations et brouillons | Création, lecture et remise de ses épreuves | Résultat si consentement | Agrégats seulement | Aucune correction ni certification |
| Certificats | Lecture et impression des siens | Vue si consentement | Agrégats seulement | Aucun certificat proposé par l'administrateur |
| Notifications | Recevoir celles de son `employeeId` | Recevoir les notifications de supervision | Recevoir les notifications RH autorisées | Recevoir les notifications d'administration |
| Journal d'audit | Aucun accès | Aucun accès | Aucun accès | Lecture |
| Annuaire des comptes | Ses propres informations | Aucun annuaire nominatif | Aucun annuaire nominatif | Lecture |

## Portée des actions

### Employé

L'employé peut :

- modifier son profil et ses préférences ;
- accepter ou retirer ses consentements ;
- demander un parcours pour un écart qui lui appartient ;
- réaliser et documenter son parcours ;
- choisir une méthode d'évaluation après la formation ;
- produire, conserver et remettre son brouillon ;
- relire son parcours et repasser une autre méthode après un échec ;
- consulter et imprimer son certificat interne.

Il ne peut pas :

- lire ou modifier l'espace d'un autre collaborateur ;
- approuver, modifier ou rejeter un parcours ;
- consulter le journal d'audit ou l'annuaire ;
- obtenir une vue nominative RH.

### Superviseur

Le superviseur peut :

- consulter les demandes qui lui sont transmises ;
- approuver, demander une modification réelle ou rejeter un parcours ;
- consulter l'équipe, la progression, les résultats et les certificats des
  collaborateurs qui ont consenti au partage.

Il ne peut pas :

- valider une demande pour lui-même ;
- modifier les preuves ou résultats d'un collaborateur ;
- consulter les vues nominatives RH ;
- administrer les comptes, l'audit ou la plateforme.

### Ressources humaines

Les RH peuvent :

- consulter les besoins, tendances, KPI, rapports et certifications agrégés ;
- lancer les exports simulés annoncés comme tels ;
- consulter les agents pour comprendre le fonctionnement global.

Les RH ne peuvent pas :

- consulter un profil, un écart, un niveau, un résultat ou un certificat
  individuel ;
- consulter le journal d'audit nominatif ;
- consulter l'annuaire des utilisateurs ;
- valider une formation ou une évaluation.

### Administrateur

L'administrateur peut :

- consulter la configuration de démonstration et les agents ;
- consulter le journal d'audit ;
- consulter l'annuaire des comptes ;
- rétablir le jeu global de données.

Il ne peut pas :

- valider ou corriger une formation ;
- modifier un niveau de compétence ;
- décider d'une évaluation ;
- délivrer un certificat ;
- consulter les agrégats RH à la place des RH pour contourner leur périmètre.

## Isolation par `employeeId`

L'isolation n'est pas une simple règle CSS. Elle est appliquée dans les
services Angular :

1. la session fournit l'identifiant métier `employeeId` ;
2. les projections personnelles filtrent les ressources par cet identifiant ;
3. les méthodes de lecture restreintes au propriétaire (`myRequestById`, `myEvaluationFor`,
   `myCertificateById`, etc.) appliquent le même filtre ;
4. les actions de parcours vérifient la propriété avant de muter l'état ;
5. les notifications personnelles sont filtrées par collaborateur ;
6. les brouillons et preuves sont enregistrés sous l'identifiant de leur
   évaluation ou de leur collaborateur.

Un collaborateur ne peut donc pas atteindre les ressources d'un autre en
modifiant une URL ou un identifiant dans le navigateur.

## Partage avec le superviseur

Le consentement de partage est distinct du consentement de collecte.

| Situation | Collecte | Formation / preuves | Partage nominatif superviseur |
| --- | --- | --- | --- |
| Consentements actifs | Activée | Autorisée | Autorisé |
| Collecte retirée | Suspendue | Parcours suspendu ; preuves bloquées | Inchangé |
| Partage superviseur retiré | Activée | Autorisée | Masqué dans l'équipe, le suivi, les résultats et les certificats |

Le retrait du partage n'empêche pas le superviseur de statuer sur une demande
déjà transmise : le flux de décision est distinct de la projection de
progression.

## Audit et annuaire

Le journal d'audit contient des acteurs humains et des cibles nominatives.
L'annuaire contient des identités, des adresses professionnelles et des rôles.
Ces deux surfaces sont donc strictement réservées à l'administrateur, y
compris par les gardes de route, la navigation, la page de confidentialité et
les tests contractuels.

## Limite de sécurité

Cette matrice décrit une démonstration frontend. Les gardes et projections
sont implémentés côté client et ne constituent pas une barrière de sécurité
serveur. Lors du choix d'un backend, les mêmes règles devront être reproduites
ou renforcées côté serveur :

- authentification et contrôle de rôle ;
- portée `employeeId` pour chaque lecture et mutation ;
- consentement au moment de la projection ;
- agrégation RH avant sérialisation ;
- restriction de l'audit et de l'annuaire ;
- absence de pouvoir d'approbation ou de certification pour l'administrateur.
