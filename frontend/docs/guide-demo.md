# Guide de démonstration — WorkAdapt AI

Ce guide décrit une démonstration reproductible du frontend autonome. Il ne
requiert aucun serveur : toutes les actions s'exécutent dans le navigateur.

## Préparer la démonstration

```powershell
cd frontend
npm ci
npm start
```

Ouvrir `http://localhost:4200`. La connexion ne demande aucun mot de passe.

| Rôle | Compte proposé |
| --- | --- |
| Employé | Soufiane Mechta |
| Superviseur | Ahmed El Fellah |
| Ressources humaines | Kawtar Souiyah |
| Administrateur | Yassine Berrada |

Pour une démonstration vierge, l'administrateur peut utiliser **Rétablir les
données**. La confirmation est demandée ; les comptes et la session restent
disponibles.

---

## Scénario recommandé — boucle complète

### 1. Vérifier l'espace collaborateur

1. Se connecter comme **Employé**.
2. Ouvrir **Mon profil**.
3. Contrôler les deux consentements :
   - collecte permanente ;
   - partage avec le superviseur.
4. Ouvrir **Collecte permanente** et lancer une collecte pour illustrer le
   rejeu d'une source.

Les sept formats sont visibles dans les préférences de formation du profil :

1. Multimédia ;
2. Interactive ;
3. Pratique ;
4. Projet ;
5. Simulation ;
6. Tuteur IA ;
7. Collaboratif.

### 2. Transformer un écart en demande

1. Ouvrir **Mes écarts**.
2. Choisir un écart actionnable.
3. Consulter les faits observés, l'inférence, les preuves et l'historique.
4. Choisir un format recommandé ou un autre format disponible.
5. Générer le parcours.

Le curriculum complet est créé et visible avant toute approbation. Le statut
reste « En validation » : l'employé ne peut pas encore le démarrer.

### 3. Faire valider le curriculum

1. Se déconnecter puis se connecter comme **Superviseur**.
2. Ouvrir **Validations**.
3. Ouvrir la demande reçue.
4. Examiner le parcours complet, les unités, les points de contrôle et la preuve
   de fin attendue.
5. Choisir une décision :
   - approuver ;
   - demander une modification réelle ;
   - rejeter avec un motif.

L'approbation est réservée au superviseur. L'administrateur et les RH ne
peuvent pas prendre cette décision à sa place.

### 4. Réaliser la formation

1. Se reconnecter comme **Employé**.
2. Ouvrir **Mes formations**, puis le parcours approuvé.
3. Démarrer la formation.
4. Dans l'espace du format choisi, saisir les observations, preuves, réponses ou
   contributions attendues.
5. Valider chaque unité après contrôle de sa preuve.
6. Déposer la preuve de fin lorsque toutes les unités sont terminées.
7. Clôturer la formation.

Le temps crédifié est celui du parcours et de ses jalons. Il ne représente
jamais le temps d'écran réellement passé. Les notes et la progression sont
conservées si l'écran est quitté puis rouvert.

### 5. Choisir et passer une évaluation

L'évaluation devient accessible seulement après la clôture complète de la
formation.

1. Choisir **Générer une évaluation**.
2. Vérifier les cinq méthodes proposées :
   - test de connaissances ;
   - épreuve technique ;
   - analyse de cas ;
   - dossier professionnel ;
   - soutenance professionnelle.
3. Générer l'épreuve avec la méthode choisie.
4. Lire les instructions et les critères éliminatoires affichés.
5. Produire la réponse et remettre l'épreuve.

Le résultat est une note sur 100. Le seuil utilisé est celui du programme,
75/100 dans la démonstration. Une exigence éliminatoire non satisfaite impose
l'échec même si le score est élevé.

### 6. Démontrer l'échec puis la reprise

Pour provoquer un échec de façon contrôlée :

- laisser une exigence obligatoire vide dans le dossier professionnel ;
- ne cocher aucun critère éliminatoire de l'épreuve technique ;
- omettre un thème attendu dans une analyse de cas ;
- fournir une réponse hors sujet à la question de fond de la soutenance.

Après l'échec :

1. vérifier qu'aucun certificat n'apparaît ;
2. vérifier que l'interface distingue le seuil non atteint d'une exigence
   bloquante ;
3. vérifier qu'une remédiation est créée pour le superviseur ;
4. revenir à la formation et relire le parcours ;
5. choisir **Repasser une autre épreuve** ;
6. générer une autre méthode.

La remédiation ne bloque pas la reprise. La boucle peut se poursuivre jusqu'à
la réussite et la délivrance du certificat.

### 7. Consulter et imprimer le certificat

Après une réussite :

1. ouvrir **Mes certificats** ;
2. vérifier le score, la méthode et les critères validés ;
3. ouvrir le document ;
4. cliquer sur **Imprimer via le navigateur**.

Le document est interne à la démonstration. Il n'a aucune valeur réglementaire
et n'est pas une certification officielle. L'impression utilise réellement le
navigateur ; elle ne génère pas un PDF natif.

### 8. Vérifier le partage avec le superviseur

1. Toujours connecté comme Employé, retirer le consentement **Partage avec le
   superviseur**.
2. Se connecter comme Superviseur et ouvrir **Mon équipe**.
3. Constater que le collaborateur sans consentement n'apparaît pas dans les
   projections nominatives.
4. Constater que la demande de validation reste consultable : le partage de
   progression et de résultats ne remplace pas la décision humaine sur une
   demande déjà transmise.
5. Réactiver le partage puis recharger l'équipe : le collaborateur revient,
   uniquement s'il existe un flux de travail réel le concernant.

### 9. Vérifier les vues RH agrégées

1. Se connecter comme **Ressources humaines**.
2. Ouvrir **Pilotage RH**, **Besoins**, **Tendances**, **Rapports** et
   **Certifications**.
3. Vérifier l'absence de nom, d'e-mail, de niveau individuel, d'écart
   nominatif et de résultat individuel.
4. Ouvrir **Rapports** et exporter : l'action est simulée et annoncée comme
   telle ; aucun fichier réel n'est fabriqué.
5. Essayer d'ouvrir directement le journal d'audit : l'accès est refusé, car
   ce journal est réservé à l'administrateur.

Les 13 KPI sont visibles dans les écrans de pilotage et restent des valeurs
de démonstration.

### 10. Vérifier l'administration

1. Se connecter comme **Administrateur**.
2. Ouvrir **Vue système**.
3. Vérifier le journal d'audit et l'annuaire des utilisateurs.
4. Vérifier que les actions de supervision et de certification ne sont pas
   proposées comme des pouvoirs administrateur.
5. Utiliser **Rétablir les données** pour remettre le jeu initial dans le
   navigateur.

Le journal et l'annuaire restent nominatifs et réservés à l'administrateur.
Les vues RH ne le sont pas.

---

## Démonstration mobile et clavier

À une largeur inférieure ou égale à 960 px :

1. ouvrir le menu avec le bouton de la barre supérieure ;
2. vérifier que son état `aria-expanded` passe de « faux » à « vrai » ;
3. vérifier que le tiroir fermé est `inert` ;
4. naviguer avec Tab : le focus reste piégé dans le tiroir ouvert ;
5. appuyer sur Échap : le tiroir se ferme et le focus revient au bouton ;
6. utiliser le lien de superposition pour fermer le tiroir.

La navigation est également utilisable au clavier sur grand écran.

---

## Persistance et réinitialisation

Les données de démonstration sont conservées dans `localStorage` sous une
enveloppe versionnée. Un rechargement restaure les actions et les brouillons.

| Besoin | Action | Effet |
| --- | --- | --- |
| Revenir au jeu initial | Administrateur → **Rétablir les données** | Remplace les données de travail ; conserve comptes et session |
| Repartir d'un espace vierge | Employé → **Mon profil** → **Effacer mon espace** | Efface uniquement l'espace du collaborateur ; conserve son compte connecté |
| Vérifier l'isolation | Créer un second compte employé et alterner les connexions | Les profils, formations, preuves, évaluations, certificats et notifications restent séparés par `employeeId` |

Une confirmation native en français est toujours demandée avant une
réinitialisation destructive.

---

## Points à montrer en priorité

1. **Deux preuves d'évaluation contradictoires** : le score seul et la règle
   éliminatoire affichée.
2. **Une réponse longue mais hors sujet** : elle ne vaut pas une maîtrise.
3. **La boucle échec → remédiation → relecture → nouvelle méthode** : elle ne
   s'arrête qu'au certificat.
4. **Le changement de collaborateur dans le même navigateur** : aucune fuite
   de données personnelles.
5. **Le retrait du partage superviseur** : l'équipe se met à jour sans
   supprimer la décision de validation.
6. **Les gardes de rôle** : RH n'accède pas au journal, l'administrateur
   n'approuve pas les parcours, l'employé ne voit que son espace.

---

## Récapitulatif de recette

| Contrôle | Résultat attendu |
| --- | --- |
| Sept formats | Les sept espaces et preuves distincts sont présents |
| Cinq méthodes | Choix possible seulement après la fin de la formation |
| Score | Note pondérée sur 100 |
| Seuil | 75/100 issu du programme |
| Éliminatoire | Échec malgré un score élevé si la règle est violée |
| Échec | Aucun certificat ; remédiation non bloquante ; reprise possible |
| Réussite | Certificat interne ; nouvelle évaluation refusée |
| Propriété | Ressources personnelles limitées à l'`employeeId` connecté |
| Consentement | Partage superviseur effectif et révocable |
| RH | Agrégats sans identité |
| Administration | Journal et annuaire réservés à l'administrateur |
| Approbation | Superviseur uniquement |
| Collecte | Continue dans le shell ; fins et résultats réinjectés |
| Persistance | État restauré après rechargement |
| Impression | Dialogue natif du navigateur déclenché |
| Mobile | Tiroir accessible, inertie, Échap et piège de focus |
