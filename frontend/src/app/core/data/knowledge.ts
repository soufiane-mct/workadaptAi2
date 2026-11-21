import { Domain, ExamQuestionType } from '../models';

/**
 * Socle de connaissances pédagogiques.
 *
 * Il ne contient aucune structure de formation : uniquement des savoirs,
 * des exemples, des pièges, des exercices et des situations. Les sept
 * builders de formation y puisent chacun ce dont ils ont besoin, avec
 * leur propre composition. Le jour où le backend IA est disponible, ce
 * fichier est remplacé par les réponses du Agent de conception pédagogique.
 */

export interface KnowledgeConcept {
  title: string;
  objective: string;
  notions: string[];
  example: string;
  pitfall: string;
}

export interface KnowledgeLab {
  title: string;
  brief: string;
  environment: string;
  steps: string[];
  criteria: string[];
  commands: string[];
  hints: string[];
}

export interface KnowledgeDecisionOption {
  label: string;
  outcome: string;
  score: number;
  feedback: string;
}

export interface KnowledgeDecision {
  prompt: string;
  options: KnowledgeDecisionOption[];
}

export interface KnowledgeScenario {
  title: string;
  situation: string;
  signals: string[];
  console: string[];
  decisions: KnowledgeDecision[];
}

export interface KnowledgeExamQuestion {
  type: ExamQuestionType;
  prompt: string;
  options: string[];
  correctIndexes: number[];
  explanation: string;
}

export interface KnowledgePack {
  key: string;
  label: string;
  subject: string;
  concepts: KnowledgeConcept[];
  labs: KnowledgeLab[];
  scenarios: KnowledgeScenario[];
  exam: KnowledgeExamQuestion[];
  tutorSeeds: string[];
  teamMission: string;
  caseContext: string;
  caseSymptoms: string[];
}

const DOCKER: KnowledgePack = {
  key: 'docker',
  label: 'Docker',
  subject: 'Conteneurisation d’applications',
  concepts: [
    {
      title: 'Image, conteneur et registre',
      objective: 'Distinguer une image immuable, un conteneur en exécution et un registre de stockage.',
      notions: [
        'Une image est un empilement de couches en lecture seule',
        'Un conteneur ajoute une couche d’écriture éphémère',
        'Un registre stocke et distribue les images versionnées',
      ],
      example: 'Une image node:20 est téléchargée depuis Docker Hub puis instanciée en trois conteneurs identiques.',
      pitfall: 'Confondre l’arrêt d’un conteneur avec la suppression de ses données : sans volume, tout disparaît.',
    },
    {
      title: 'Dockerfile et construction d’image',
      objective: 'Écrire un Dockerfile lisible, ordonné et reproductible.',
      notions: [
        'Instructions FROM, WORKDIR, COPY, RUN, CMD, ENTRYPOINT',
        'Ordonnancement des couches pour maximiser le cache',
        'Séparation build / runtime avec les builds multi-étapes',
      ],
      example: 'Copier package.json avant le code source permet de réutiliser la couche npm ci tant que les dépendances ne changent pas.',
      pitfall: 'Copier tout le dépôt avant npm ci : chaque modification de code invalide le cache et rallonge le build.',
    },
    {
      title: 'Volumes et persistance',
      objective: 'Choisir entre volume nommé, bind mount et tmpfs selon le besoin.',
      notions: [
        'Volume nommé : géré par Docker, adapté aux données persistantes',
        'Bind mount : dossier de l’hôte, adapté au développement',
        'tmpfs : en mémoire, perdu à l’arrêt',
      ],
      example: 'Une base PostgreSQL utilise un volume nommé ; le code source en développement utilise un bind mount.',
      pitfall: 'Stocker des données de production dans la couche inscriptible du conteneur.',
    },
    {
      title: 'Réseaux et exposition de ports',
      objective: 'Relier des conteneurs sans passer par localhost.',
      notions: [
        'Réseau bridge par défaut et résolution DNS par nom de service',
        'Publier un port avec -p hôte:conteneur',
        'Isolation par réseau dédié',
      ],
      example: 'Une interface web joint l’API par http://api:8080 sur le réseau interne, sans publier le port de l’API.',
      pitfall: 'Utiliser localhost dans un conteneur : cela désigne le conteneur lui-même, pas la machine hôte.',
    },
    {
      title: 'Docker Compose',
      objective: 'Décrire une application multi-services reproductible.',
      notions: [
        'services, volumes, networks, depends_on',
        'Variables d’environnement et fichiers .env',
        'Healthchecks et conditions de démarrage',
      ],
      example: 'Un compose réunit api, base de données et reverse proxy avec un healthcheck sur la base.',
      pitfall: 'depends_on ne garantit pas que le service est prêt : il faut un healthcheck.',
    },
    {
      title: 'Optimisation de la taille des images',
      objective: 'Réduire le poids et la surface d’attaque d’une image.',
      notions: [
        'Images de base minimales (alpine, distroless)',
        'Build multi-étapes pour exclure les outils de compilation',
        'Fichier .dockerignore',
      ],
      example: 'Une image Node passe de 1,1 Go à 180 Mo en séparant build et runtime.',
      pitfall: 'Installer les devDependencies dans l’image finale.',
    },
    {
      title: 'Sécurité des conteneurs',
      objective: 'Appliquer les principes de moindre privilège.',
      notions: [
        'Utilisateur non root avec USER',
        'Secrets injectés à l’exécution, jamais dans l’image',
        'Analyse de vulnérabilités des couches',
      ],
      example: 'Un Dockerfile crée un utilisateur applicatif et passe en USER app avant le CMD.',
      pitfall: 'Copier un fichier .env contenant des secrets dans l’image.',
    },
    {
      title: 'Debug et inspection',
      objective: 'Diagnostiquer un conteneur qui démarre puis s’arrête.',
      notions: [
        'docker logs, docker inspect, docker exec',
        'Codes de sortie et redémarrages en boucle',
        'Différence entre conteneur arrêté et image cassée',
      ],
      example: 'Un conteneur sort en code 1 : docker logs révèle une variable d’environnement manquante.',
      pitfall: 'Relancer sans lire les logs, ce qui masque la cause réelle.',
    },
    {
      title: 'Intégration continue et images',
      objective: 'Construire, étiqueter et publier une image depuis un pipeline.',
      notions: [
        'Étiquetage par commit et par version',
        'Cache de build entre exécutions',
        'Publication conditionnée aux tests',
      ],
      example: 'Le pipeline construit l’image uniquement si les tests passent, puis la publie avec le SHA du commit.',
      pitfall: 'Publier systématiquement le tag latest, ce qui rend les retours arrière impossibles.',
    },
    {
      title: 'Conteneurs et orchestration',
      objective: 'Comprendre la frontière entre Docker et un orchestrateur.',
      notions: [
        'Docker exécute, Kubernetes orchestre',
        'Redémarrage, réplication, découverte de services',
        'Différence entre conteneur et pod',
      ],
      example: 'Un déploiement Kubernetes recrée automatiquement un conteneur défaillant.',
      pitfall: 'Utiliser Docker Compose comme solution de production à forte charge.',
    },
    {
      title: 'Bonnes pratiques d’équipe',
      objective: 'Rendre les environnements reproductibles pour toute l’équipe.',
      notions: [
        'Versions d’images figées',
        'Un Dockerfile unique et documenté',
        'Parité entre développement et intégration',
      ],
      example: 'Toute l’équipe démarre la même pile avec une commande unique documentée.',
      pitfall: 'Laisser chaque développeur installer ses dépendances à la main.',
    },
    {
      title: 'Synthèse et cas réels',
      objective: 'Mobiliser l’ensemble des notions sur un cas complet.',
      notions: [
        'Chaîne image → conteneur → réseau → volume',
        'Diagnostic guidé par les logs',
        'Décisions d’architecture documentées',
      ],
      example: 'Conteneuriser une API avec base de données, healthcheck, volume et publication d’image.',
      pitfall: 'Optimiser trop tôt sans mesurer ni documenter.',
    },
  ],
  labs: [
    {
      title: 'Premier conteneur',
      brief: 'Exécuter une image officielle, vérifier son état et comprendre le cycle de vie.',
      environment: 'Terminal avec Docker disponible',
      steps: ['Lancer un conteneur nginx en arrière-plan', 'Vérifier qu’il tourne', 'Lire les logs', 'Arrêter puis supprimer le conteneur'],
      criteria: ['Le conteneur apparaît en état running', 'Les logs sont consultés', 'Le conteneur est supprimé sans erreur'],
      commands: ['docker run -d -p 8080:80 nginx', 'docker ps', 'docker logs <id>', 'docker rm -f <id>'],
      hints: ['Utiliser -d pour détacher', 'docker ps -a montre aussi les conteneurs arrêtés'],
    },
    {
      title: 'Dockerfile d’une API Node',
      brief: 'Écrire un Dockerfile qui construit et exécute une API Node avec un cache efficace.',
      environment: 'Projet Node avec package.json',
      steps: ['Copier package.json et installer', 'Copier le code', 'Exposer le port', 'Définir CMD'],
      criteria: ['Le build réussit', 'Le cache est réutilisé au second build', 'Le conteneur répond sur le port exposé'],
      commands: ['docker build -t api:1 .', 'docker run -p 3000:3000 api:1'],
      hints: ['Placer COPY package*.json avant RUN npm ci'],
    },
    {
      title: 'Image multi-étapes',
      brief: 'Séparer compilation et exécution pour réduire la taille de l’image.',
      environment: 'Projet TypeScript ou Java',
      steps: ['Créer l’étape build', 'Compiler', 'Copier uniquement le résultat', 'Comparer les tailles'],
      criteria: ['L’image finale ne contient pas les outils de compilation', 'La taille diminue nettement', 'L’application démarre'],
      commands: ['docker build -f Dockerfile -t app:slim .', 'docker images'],
      hints: ['Utiliser AS build puis COPY --from=build'],
    },
    {
      title: 'Persistance avec volume',
      brief: 'Faire survivre des données à la suppression du conteneur.',
      environment: 'Terminal Docker',
      steps: ['Créer un volume nommé', 'Écrire un fichier dedans', 'Supprimer le conteneur', 'Recréer et vérifier'],
      criteria: ['Le fichier survit à la suppression', 'Le volume est identifié', 'Aucune donnée dans la couche du conteneur'],
      commands: ['docker volume create data', 'docker run -v data:/data ...'],
      hints: ['Monter le volume sur le dossier de données de l’application'],
    },
    {
      title: 'Réseau entre deux conteneurs',
      brief: 'Faire communiquer une API et une base par nom de service.',
      environment: 'Terminal Docker',
      steps: ['Créer un réseau', 'Lancer la base', 'Lancer l’API sur le même réseau', 'Tester la connexion par nom'],
      criteria: ['La résolution par nom fonctionne', 'Aucun port de base publié', 'La connexion est vérifiée'],
      commands: ['docker network create appnet', 'docker run --network appnet --name db ...'],
      hints: ['Utiliser le nom du conteneur comme hôte'],
    },
    {
      title: 'Compose multi-services',
      brief: 'Décrire api, base et proxy dans un fichier compose avec healthcheck.',
      environment: 'Terminal avec Docker Compose',
      steps: ['Écrire services', 'Déclarer le volume', 'Ajouter le healthcheck', 'Démarrer et vérifier'],
      criteria: ['docker compose up fonctionne', 'Le healthcheck passe', 'La base attend d’être prête'],
      commands: ['docker compose up -d', 'docker compose ps', 'docker compose logs'],
      hints: ['condition: service_healthy'],
    },
    {
      title: 'Diagnostic d’un conteneur qui redémarre',
      brief: 'Trouver la cause d’un conteneur qui s’arrête en boucle.',
      environment: 'Scénario fourni avec une image défaillante',
      steps: ['Observer le statut', 'Lire les logs', 'Inspecter la configuration', 'Corriger et relancer'],
      criteria: ['La cause est identifiée', 'La correction est expliquée', 'Le conteneur reste stable'],
      commands: ['docker ps -a', 'docker logs --tail 50 <id>', 'docker inspect <id>'],
      hints: ['Comparer le code de sortie avec la documentation'],
    },
    {
      title: 'Pipeline de publication',
      brief: 'Construire et publier une image étiquetée par commit après les tests.',
      environment: 'Projet avec pipeline CI',
      steps: ['Ajouter l’étape de test', 'Construire l’image', 'Étiqueter', 'Publier'],
      criteria: ['La publication dépend des tests', 'Le tag contient le SHA', 'Aucun latest implicite'],
      commands: ['docker build -t registry/app:$GIT_SHA .', 'docker push registry/app:$GIT_SHA'],
      hints: ['Ne jamais publier avant le vert des tests'],
    },
  ],
  scenarios: [
    {
      title: 'Le conteneur qui meurt au démarrage',
      situation: 'En production, l’API redémarre toutes les 30 secondes. Le service est indisponible.',
      signals: ['Statut Restarting', 'Code de sortie 1', 'Aucune trace applicative'],
      console: ['$ docker ps', 'CONTAINER ID  STATUS', 'a1b2c3        Restarting (1) 12 seconds ago'],
      decisions: [
        {
          prompt: 'Première action ?',
          options: [
            { label: 'Lire les logs du conteneur', outcome: 'Vous trouvez une variable DATABASE_URL absente.', score: 2, feedback: 'Correct : les logs sont la première source de vérité.' },
            { label: 'Recréer le conteneur sans changer la configuration', outcome: 'Il redémarre encore : la cause est toujours là.', score: 0, feedback: 'Relancer sans diagnostiquer ne corrige rien.' },
            { label: 'Augmenter la limite mémoire', outcome: 'Aucun effet : le problème n’est pas la mémoire.', score: 0, feedback: 'Mauvaise hypothèse, non étayée par les signaux.' },
          ],
        },
        {
          prompt: 'La variable manque. Comment la fournir durablement ?',
          options: [
            { label: 'Injecter un secret au déploiement', outcome: 'Le conteneur démarre et la configuration reste hors de l’image.', score: 2, feedback: 'Bonne pratique : secret injecté à l’exécution.' },
            { label: 'La coder en dur dans le Dockerfile', outcome: 'Le secret fuite dans l’image.', score: 0, feedback: 'Faille de sécurité majeure.' },
            { label: 'La mettre dans le dépôt Git', outcome: 'Le secret est exposé à toute l’équipe et à l’historique.', score: 0, feedback: 'À proscrire.' },
          ],
        },
      ],
    },
    {
      title: 'L’image devenue énorme',
      situation: 'L’image est passée de 200 Mo à 1,4 Go après l’ajout du build TypeScript.',
      signals: ['Temps de publication multiplié', 'Couches nombreuses', 'Outils de compilation présents'],
      console: ['$ docker images', 'app  latest  1.4GB', 'app  previous  210MB'],
      decisions: [
        {
          prompt: 'Cause la plus probable ?',
          options: [
            { label: 'Les dépendances de build sont dans l’image finale', outcome: 'Vous confirmez avec l’historique des couches.', score: 2, feedback: 'Exact : build et runtime sont mélangés.' },
            { label: 'Le registre compresse mal', outcome: 'Le problème persiste localement.', score: 0, feedback: 'Le registre n’est pas en cause.' },
          ],
        },
        {
          prompt: 'Correction ?',
          options: [
            { label: 'Build multi-étapes', outcome: 'L’image finale ne garde que le résultat compilé.', score: 2, feedback: 'Solution standard et mesurable.' },
            { label: 'Supprimer node_modules après l’installation', outcome: 'Le cache est cassé et l’image reste instable.', score: 0, feedback: 'Fragile et non reproductible.' },
          ],
        },
      ],
    },
    {
      title: 'La base perd ses données',
      situation: 'À chaque redéploiement, les données de la base disparaissent.',
      signals: ['Aucun volume déclaré', 'Données présentes en développement seulement', 'Conteneur recréé à chaque version'],
      console: ['$ docker inspect db', '"Mounts": []'],
      decisions: [
        {
          prompt: 'Diagnostic ?',
          options: [
            { label: 'Les données sont dans la couche éphémère', outcome: 'Vous confirmez l’absence de volume.', score: 2, feedback: 'Exact.' },
            { label: 'La base est mal configurée', outcome: 'La configuration est correcte, seule la persistance manque.', score: 0, feedback: 'Mauvais diagnostic.' },
          ],
        },
        {
          prompt: 'Action ?',
          options: [
            { label: 'Déclarer un volume nommé et le monter', outcome: 'Les données survivent aux redéploiements.', score: 2, feedback: 'Correct.' },
            { label: 'Sauvegarder à la main avant chaque déploiement', outcome: 'Risque humain permanent.', score: 0, feedback: 'Ce n’est pas une solution d’ingénierie.' },
          ],
        },
      ],
    },
    {
      title: 'Le pipeline casse la production',
      situation: 'Le pipeline publie latest à chaque commit, y compris quand les tests échouent.',
      signals: ['Aucune condition sur les tests', 'Tag latest unique', 'Retour arrière impossible'],
      console: ['$ docker pull app:latest', 'Digest: sha256:9f...', '$ docker pull app:latest', 'Digest: sha256:1c...'],
      decisions: [
        {
          prompt: 'Risque principal ?',
          options: [
            { label: 'Déployer une version non testée et non traçable', outcome: 'Un incident survient sans possibilité de revenir à une version identifiée.', score: 2, feedback: 'Exact.' },
            { label: 'Consommer trop de bande passante', outcome: 'Impact mineur comparé au risque de release.', score: 0, feedback: 'Hors sujet.' },
          ],
        },
        {
          prompt: 'Correction ?',
          options: [
            { label: 'Publier seulement si les tests passent, avec un tag immuable', outcome: 'Chaque version est traçable et réversible.', score: 2, feedback: 'Bonne pratique.' },
            { label: 'Ajouter un second tag stable', outcome: 'Le problème de traçabilité demeure.', score: 0, feedback: 'Insuffisant.' },
          ],
        },
      ],
    },
    {
      title: 'Fuite de secret dans l’image',
      situation: 'Un audit découvre une clé d’API dans les couches d’une image publiée.',
      signals: ['Fichier .env copié', 'Couche historique consultable', 'Image publique'],
      console: ['$ docker history app:1', 'COPY .env /app/.env'],
      decisions: [
        {
          prompt: 'Que faire immédiatement ?',
          options: [
            { label: 'Révoquer la clé et reconstruire l’image', outcome: 'La clé est invalidée et l’image nettoyée.', score: 2, feedback: 'Priorité à la révocation.' },
            { label: 'Supprimer le tag local', outcome: 'La clé reste valide et l’image reste téléchargeable.', score: 0, feedback: 'Fausse sécurité.' },
          ],
        },
        {
          prompt: 'Prévention durable ?',
          options: [
            { label: 'Injection à l’exécution + .dockerignore + analyse d’image', outcome: 'Le secret ne peut plus entrer dans l’image.', score: 2, feedback: 'Défense en profondeur.' },
            { label: 'Ajouter un avertissement dans le README', outcome: 'Aucune barrière technique.', score: 0, feedback: 'Insuffisant.' },
          ],
        },
      ],
    },
    {
      title: 'Latence après conteneurisation',
      situation: 'Les temps de réponse ont triplé depuis le passage en conteneurs.',
      signals: ['CPU conteneur non limité mais partagé', 'Réseau bridge', 'Base distante'],
      console: ['$ docker stats', 'app  CPU 180%  MEM 512MB', '$ curl -w %{time_total}'],
      decisions: [
        {
          prompt: 'Première mesure ?',
          options: [
            { label: 'Comparer les métriques avant/après par composant', outcome: 'Vous isolez la base distante comme cause principale.', score: 2, feedback: 'Mesurer avant d’optimiser.' },
            { label: 'Augmenter les ressources sans mesure', outcome: 'Coût accru, latence inchangée.', score: 0, feedback: 'Optimisation à l’aveugle.' },
          ],
        },
      ],
    },
  ],
  exam: [
    { type: 'QCM', prompt: 'Quelle instruction définit l’image de base d’un Dockerfile ?', options: ['FROM', 'BASE', 'IMAGE', 'RUN'], correctIndexes: [0], explanation: 'FROM déclare l’image de départ.' },
    { type: 'TRUE_FALSE', prompt: 'Un conteneur arrêté conserve par défaut ses données dans un volume anonyme non déclaré.', options: ['Vrai', 'Faux'], correctIndexes: [1], explanation: 'Sans volume, la couche inscriptible est perdue.' },
    { type: 'MULTI', prompt: 'Quelles pratiques réduisent la taille d’une image ?', options: ['Build multi-étapes', 'Image de base minimale', 'Copier tout le dépôt', 'Fichier .dockerignore'], correctIndexes: [0, 1, 3], explanation: 'Copier tout le dépôt augmente la taille et casse le cache.' },
    { type: 'QCM', prompt: 'Comment un conteneur joint-il un autre service sur un réseau défini par l’utilisateur ?', options: ['Par localhost', 'Par le nom du service', 'Par l’adresse IP de l’hôte', 'Impossible'], correctIndexes: [1], explanation: 'Le DNS interne résout les noms de services.' },
    { type: 'SCENARIO', prompt: 'Un conteneur redémarre en boucle avec le code 1. Quelle est la première action utile ?', options: ['Lire les logs et le code de sortie', 'Recréer le conteneur', 'Changer de registre', 'Augmenter la mémoire'], correctIndexes: [0], explanation: 'Le diagnostic précède toute correction.' },
    { type: 'TRUE_FALSE', prompt: 'depends_on garantit que le service dépendant est prêt à recevoir des requêtes.', options: ['Vrai', 'Faux'], correctIndexes: [1], explanation: 'Il faut un healthcheck et une condition de démarrage.' },
    { type: 'QCM', prompt: 'Quel mécanisme est adapté à des données persistantes gérées par Docker ?', options: ['tmpfs', 'Volume nommé', 'Bind mount de développement', 'Couche inscriptible'], correctIndexes: [1], explanation: 'Le volume nommé est indépendant du cycle de vie du conteneur.' },
    { type: 'TECHNICAL', prompt: 'Expliquez pourquoi COPY package.json avant COPY . améliore le cache de build.', options: ['Réponse libre'], correctIndexes: [], explanation: 'La couche d’installation n’est invalidée que si les dépendances changent.' },
    { type: 'MULTI', prompt: 'Quelles pratiques renforcent la sécurité d’une image ?', options: ['Utilisateur non root', 'Secrets à l’exécution', 'Clé API dans le Dockerfile', 'Analyse de vulnérabilités'], correctIndexes: [0, 1, 3], explanation: 'Un secret dans le Dockerfile fuite dans l’image.' },
    { type: 'SCENARIO', prompt: 'Le pipeline publie latest à chaque commit sans attendre les tests. Quel risque majeur ?', options: ['Déployer une version non testée et non traçable', 'Perdre le cache Docker', 'Augmenter la taille de l’image', 'Casser le DNS interne'], correctIndexes: [0], explanation: 'La traçabilité et la qualité de release sont perdues.' },
    { type: 'QCM', prompt: 'Quelle commande inspecte la configuration complète d’un conteneur ?', options: ['docker logs', 'docker inspect', 'docker ps', 'docker stats'], correctIndexes: [1], explanation: 'inspect renvoie la configuration détaillée.' },
    { type: 'TECHNICAL', prompt: 'Décrivez la différence entre un volume nommé et un bind mount, avec un usage pour chacun.', options: ['Réponse libre'], correctIndexes: [], explanation: 'Persistance gérée par Docker vs dossier de l’hôte pour le développement.' },
  ],
  tutorSeeds: [
    'Pourquoi un conteneur n’est-il pas une machine virtuelle ?',
    'À quoi sert exactement un volume ?',
    'Comment fonctionne le cache des couches ?',
    'Pourquoi éviter latest en production ?',
    'Comment diagnostiquer un conteneur qui ne démarre pas ?',
    'Quelle différence entre Docker et Kubernetes ?',
    'Comment sécuriser une image destinée à la production ?',
    'Comment rendre un environnement reproductible pour toute l’équipe ?',
  ],
  teamMission: 'Conteneuriser une application complète et livrer une pile reproductible documentée',
  caseContext: 'Une PME édite une application web conteneurisée. Les déploiements sont manuels et les incidents se multiplient.',
  caseSymptoms: ['Images non versionnées', 'Aucune persistance déclarée', 'Diagnostics improvisés', 'Aucun contrôle avant publication'],
};

const CICD: KnowledgePack = {
  key: 'cicd',
  label: 'CI/CD',
  subject: 'Intégration et livraison continues',
  concepts: [
    { title: 'Chaîne d’intégration', objective: 'Décrire les étapes d’un pipeline fiable.', notions: ['Lint', 'Tests', 'Build', 'Artefact'], example: 'Un pipeline exécute lint, tests unitaires puis build.', pitfall: 'Publier avant les tests.' },
    { title: 'Tests automatisés en pipeline', objective: 'Choisir les tests pertinents à chaque étape.', notions: ['Tests rapides en premier', 'Tests d’intégration', 'Rapports exploitables'], example: 'Les tests unitaires bloquent la fusion ; les tests d’intégration s’exécutent après.', pitfall: 'Tout tester à la fin.' },
    { title: 'Artefacts et versionnement', objective: 'Produire un artefact traçable.', notions: ['Tag par commit', 'Artefact immuable', 'Métadonnées'], example: 'L’artefact porte le SHA et la date.', pitfall: 'Réutiliser le même nom d’artefact.' },
    { title: 'Environnements et promotion', objective: 'Promouvoir un artefact sans le reconstruire.', notions: ['Dev, recette, production', 'Même artefact partout', 'Approbations'], example: 'L’artefact validé en recette est promu tel quel.', pitfall: 'Reconstruire pour la production.' },
    { title: 'Secrets et permissions', objective: 'Protéger les accès du pipeline.', notions: ['Coffre de secrets', 'Moindre privilège', 'Rotation'], example: 'Le jeton de publication est stocké dans le coffre du CI.', pitfall: 'Secret en clair dans le YAML.' },
    { title: 'Qualité et portes de fusion', objective: 'Empêcher les régressions.', notions: ['Revue obligatoire', 'Seuil de couverture', 'Analyse statique'], example: 'Une fusion est bloquée si la couverture baisse.', pitfall: 'Portes contournables sans trace.' },
    { title: 'Déploiement progressif', objective: 'Limiter l’impact d’une mauvaise version.', notions: ['Canary', 'Blue/green', 'Retour arrière'], example: '5 % du trafic reçoit la nouvelle version pendant 10 minutes.', pitfall: 'Déployer à 100 % sans observation.' },
    { title: 'Observabilité des pipelines', objective: 'Diagnostiquer une exécution échouée.', notions: ['Logs', 'Durée par étape', 'Taux d’échec'], example: 'Le rapport montre l’étape la plus lente.', pitfall: 'Pas de logs conservés.' },
    { title: 'Cache et performance', objective: 'Réduire le temps de pipeline.', notions: ['Cache de dépendances', 'Parallélisation', 'Étapes inutiles'], example: 'Le cache npm divise par trois la durée.', pitfall: 'Cache invalide silencieusement.' },
    { title: 'Livraison vs déploiement', objective: 'Distinguer les deux notions.', notions: ['Livrer = artefact prêt', 'Déployer = mise en service', 'Découplage'], example: 'Livraison quotidienne, déploiement hebdomadaire validé.', pitfall: 'Confondre les deux dans les indicateurs.' },
    { title: 'Infrastructure as Code', objective: 'Versionner les environnements.', notions: ['Fichiers déclaratifs', 'Revue de changement', 'Reproductibilité'], example: 'Une modification d’infrastructure passe par une pull request.', pitfall: 'Modifications manuelles non tracées.' },
    { title: 'Synthèse et amélioration continue', objective: 'Mesurer et améliorer le pipeline.', notions: ['DORA metrics', 'Fréquence de déploiement', 'Temps de rétablissement'], example: 'Le temps moyen de rétablissement passe de 4 h à 20 min.', pitfall: 'Optimiser sans mesure.' },
  ],
  labs: [
    { title: 'Premier pipeline', brief: 'Créer un pipeline qui installe, teste et construit.', environment: 'Dépôt avec projet Node', steps: ['Déclencher sur push', 'Installer', 'Tester', 'Construire'], criteria: ['Le pipeline s’exécute sur push', 'Les tests bloquent en cas d’échec', 'Le build est produit'], commands: ['git push', 'runner logs'], hints: ['Commencer par un pipeline minimal'] },
    { title: 'Porte de qualité', brief: 'Bloquer la fusion si les tests échouent.', environment: 'Dépôt avec protection de branche', steps: ['Ajouter les tests requis', 'Activer la protection', 'Tester un échec'], criteria: ['La fusion est bloquée', 'Le statut est visible', 'Aucun contournement'], commands: ['branch protection', 'status checks'], hints: ['Vérifier les droits'] },
    { title: 'Artefact versionné', brief: 'Produire un artefact étiqueté par commit.', environment: 'Pipeline existant', steps: ['Construire', 'Étiqueter', 'Stocker'], criteria: ['Le tag contient le SHA', 'L’artefact est récupérable', 'Aucun latest implicite'], commands: ['build --tag $SHA', 'upload artifact'], hints: ['Le SHA est fourni par le CI'] },
    { title: 'Cache de dépendances', brief: 'Réduire la durée du pipeline.', environment: 'Pipeline avec installation lente', steps: ['Mesurer', 'Ajouter le cache', 'Comparer'], criteria: ['Durée réduite', 'Pas de faux positif', 'Cache invalidé si besoin'], commands: ['cache restore', 'cache save'], hints: ['Clé de cache basée sur le lockfile'] },
    { title: 'Secrets protégés', brief: 'Utiliser un secret sans l’exposer.', environment: 'Pipeline avec coffre', steps: ['Créer le secret', 'L’injecter', 'Vérifier les logs'], criteria: ['Aucun secret dans les logs', 'Le déploiement fonctionne', 'Accès limité'], commands: ['secret set', 'deploy'], hints: ['Masquer les valeurs'] },
    { title: 'Déploiement canary', brief: 'Déployer sur une fraction du trafic.', environment: 'Environnement de recette', steps: ['Déployer 5 %', 'Observer', 'Étendre ou revenir'], criteria: ['Le trafic est contrôlé', 'Les métriques sont suivies', 'Retour arrière testé'], commands: ['deploy --weight 5', 'rollback'], hints: ['Définir un seuil d’erreur'] },
  ],
  scenarios: [
    { title: 'Le pipeline rouge bloque l’équipe', situation: 'Tous les développeurs sont bloqués par un test instable.', signals: ['Échec aléatoire', 'Aucun changement de code', 'Même test concerné'], console: ['$ ci status', 'FAIL test/timeout (flaky)'], decisions: [{ prompt: 'Action immédiate ?', options: [{ label: 'Isoler et stabiliser le test', outcome: 'Le pipeline redevient fiable.', score: 2, feedback: 'Traiter la cause.' }, { label: 'Désactiver tous les tests', outcome: 'Les régressions passent en production.', score: 0, feedback: 'Solution dangereuse.' }] }] },
    { title: 'La production diffère de la recette', situation: 'La recette valide, la production échoue.', signals: ['Artefact reconstruit', 'Versions de dépendances différentes'], console: ['build prod: sha 8f2', 'build recette: sha 1c4'], decisions: [{ prompt: 'Cause ?', options: [{ label: 'Artefact reconstruit pour la production', outcome: 'Les builds diffèrent.', score: 2, feedback: 'Promouvoir le même artefact.' }, { label: 'Le réseau est différent', outcome: 'Aucun lien avec le symptôme.', score: 0, feedback: 'Mauvaise piste.' }] }] },
    { title: 'Secret exposé dans les logs', situation: 'Un jeton apparaît en clair dans les logs du pipeline.', signals: ['Log verbeux', 'Variable non masquée'], console: ['[deploy] token=abc123'], decisions: [{ prompt: 'Première action ?', options: [{ label: 'Révoquer le jeton et purger les logs', outcome: 'Le risque est contenu.', score: 2, feedback: 'Révoquer d’abord.' }, { label: 'Supprimer le log local', outcome: 'Le jeton reste valide côté serveur.', score: 0, feedback: 'Insuffisant.' }] }] },
    { title: 'Déploiement du vendredi soir', situation: 'Un déploiement tardif casse le service sans personne pour réagir.', signals: ['Aucune astreinte', 'Aucun retour arrière préparé'], console: ['deploy start 21:58', 'error 500 rate 42%'], decisions: [{ prompt: 'Décision ?', options: [{ label: 'Revenir à la version précédente', outcome: 'Service rétabli en 8 minutes.', score: 2, feedback: 'Le retour arrière est prioritaire.' }, { label: 'Corriger à chaud', outcome: 'Le service reste dégradé longtemps.', score: 0, feedback: 'Risque accru sans diagnostic.' }] }] },
  ],
  exam: [
    { type: 'QCM', prompt: 'Quel est l’objectif d’une porte de qualité ?', options: ['Accélérer les builds', 'Empêcher les régressions', 'Réduire les logs', 'Supprimer les revues'], correctIndexes: [1], explanation: 'Elle bloque ce qui ne respecte pas les critères.' },
    { type: 'TRUE_FALSE', prompt: 'Il est recommandé de reconstruire l’artefact pour chaque environnement.', options: ['Vrai', 'Faux'], correctIndexes: [1], explanation: 'Le même artefact doit être promu.' },
    { type: 'MULTI', prompt: 'Quelles pratiques sécurisent un pipeline ?', options: ['Coffre de secrets', 'Moindre privilège', 'Secret dans le YAML', 'Rotation des jetons'], correctIndexes: [0, 1, 3], explanation: 'Un secret dans le YAML est exposé.' },
    { type: 'SCENARIO', prompt: 'Un test échoue de façon aléatoire et bloque toute l’équipe. Que faire ?', options: ['Isoler et stabiliser le test', 'Désactiver la suite', 'Ignorer l’échec', 'Changer de CI'], correctIndexes: [0], explanation: 'Traiter la cause sans supprimer la protection.' },
    { type: 'TECHNICAL', prompt: 'Expliquez la différence entre livraison et déploiement.', options: ['Réponse libre'], correctIndexes: [], explanation: 'Livrer prépare un artefact ; déployer le met en service.' },
    { type: 'QCM', prompt: 'Quel déploiement limite l’exposition d’une nouvelle version ?', options: ['Canary', 'Direct à 100 %', 'Manuel sans mesure', 'Reconstruction'], correctIndexes: [0], explanation: 'Le canary expose une fraction du trafic.' },
    { type: 'TRUE_FALSE', prompt: 'Un cache de dépendances peut masquer une dépendance manquante.', options: ['Vrai', 'Faux'], correctIndexes: [0], explanation: 'Un cache incomplet donne de faux positifs.' },
    { type: 'MULTI', prompt: 'Quels indicateurs suivent la santé d’un pipeline ?', options: ['Durée par étape', 'Taux d’échec', 'Nombre de commits', 'Temps de rétablissement'], correctIndexes: [0, 1, 3], explanation: 'Le nombre de commits ne mesure pas la santé du pipeline.' },
    { type: 'SCENARIO', prompt: 'Un jeton apparaît dans les logs. Première action ?', options: ['Révoquer le jeton', 'Supprimer le fichier local', 'Changer de branche', 'Relancer le pipeline'], correctIndexes: [0], explanation: 'La révocation précède le nettoyage.' },
    { type: 'TECHNICAL', prompt: 'Décrivez une stratégie de retour arrière fiable.', options: ['Réponse libre'], correctIndexes: [], explanation: 'Artefact immuable, version précédente disponible, procédure testée.' },
  ],
  tutorSeeds: ['Pourquoi les tests passent-ils avant le build ?', 'Comment éviter les secrets dans les logs ?', 'Pourquoi promouvoir un artefact plutôt que le reconstruire ?', 'Comment mesurer la qualité d’un pipeline ?', 'Qu’est-ce qu’un test instable et comment le traiter ?'],
  teamMission: 'Mettre en place un pipeline fiable avec portes de qualité et déploiement progressif',
  caseContext: 'Une équipe déploie manuellement chaque vendredi. Les incidents sont fréquents et le retour arrière est improvisé.',
  caseSymptoms: ['Aucune porte de qualité', 'Artefacts non versionnés', 'Secrets dans les logs', 'Aucun retour arrière testé'],
};

const ANGULAR: KnowledgePack = {
  key: 'angular',
  label: 'Angular',
  subject: 'Applications Angular maintenables',
  concepts: [
    { title: 'Composants standalone et signaux', objective: 'Structurer une application moderne autour de composants autonomes.', notions: ['Standalone components', 'Signaux', 'Computed'], example: 'Un composant déclare ses imports et expose un signal dérivé.', pitfall: 'Mutualiser un état global sans raison.' },
    { title: 'Gestion d’état réactive', objective: 'Choisir entre signal local et service partagé.', notions: ['Signal', 'Service injectable', 'Effets maîtrisés'], example: 'Un service expose un signal en lecture seule.', pitfall: 'Effets en cascade incontrôlés.' },
    { title: 'Formulaires réactifs', objective: 'Construire un formulaire typé et validé.', notions: ['FormGroup', 'Validateurs', 'États de validation'], example: 'Un formulaire d’inscription valide le consentement obligatoire.', pitfall: 'Validation uniquement côté interface.' },
    { title: 'Routage et guards', objective: 'Protéger les routes et charger à la demande.', notions: ['Lazy loading', 'CanActivate', 'Résolveurs'], example: 'Une route d’administration est protégée par un guard de rôle.', pitfall: 'Confondre guard d’interface et sécurité serveur.' },
    { title: 'Communication HTTP', objective: 'Consommer une API de façon robuste.', notions: ['HttpClient', 'Intercepteurs', 'Gestion d’erreur'], example: 'Un intercepteur ajoute le jeton et gère les erreurs 401.', pitfall: 'Souscrire sans gérer l’erreur.' },
    { title: 'Performance et change detection', objective: 'Limiter les recalculs inutiles.', notions: ['OnPush', 'Signaux', 'TrackBy dans les listes'], example: 'Un composant OnPush ne se rafraîchit que si ses entrées changent.', pitfall: 'Appels de fonction dans le template.' },
    { title: 'Design system et accessibilité', objective: 'Produire une interface cohérente et accessible.', notions: ['Tokens', 'Contraste', 'Navigation clavier'], example: 'Un bouton icône possède un libellé accessible.', pitfall: 'Couleur seule pour porter l’information.' },
    { title: 'Tests de composants', objective: 'Tester le comportement observable.', notions: ['TestBed', 'Signaux', 'Requêtes DOM'], example: 'Un test vérifie qu’un message d’erreur apparaît après soumission invalide.', pitfall: 'Tester l’implémentation interne.' },
    { title: 'Formulaires et consentement', objective: 'Recueillir des données sensibles correctement.', notions: ['Champs obligatoires', 'Consentement explicite', 'Messages clairs'], example: 'Le consentement de collecte est requis avant activation.', pitfall: 'Case pré-cochée.' },
    { title: 'Architecture par domaines', objective: 'Organiser le code par responsabilité métier.', notions: ['core', 'features', 'shared'], example: 'Chaque domaine possède ses modèles et services.', pitfall: 'Tout mettre dans un service géant.' },
    { title: 'Erreurs et états de chargement', objective: 'Rendre les états asynchrones visibles.', notions: ['Chargement', 'Erreur', 'Nouvelle tentative'], example: 'Un écran affiche un état d’erreur avec un bouton Réessayer.', pitfall: 'Écran vide sans explication.' },
    { title: 'Synthèse applicative', objective: 'Relier les notions sur une fonctionnalité complète.', notions: ['Formulaire', 'Service', 'Route', 'Test'], example: 'Un parcours d’inscription complet, testé de bout en bout.', pitfall: 'Fonctionnalité non testée.' },
  ],
  labs: [
    { title: 'Composant et signal', brief: 'Créer un composant standalone avec état local.', environment: 'Projet Angular', steps: ['Créer le composant', 'Ajouter un signal', 'Afficher la valeur', 'Mettre à jour'], criteria: ['Le composant compile', 'La valeur se met à jour', 'Aucun état inutile'], commands: ['ng generate component', 'ng build'], hints: ['Utiliser signal() et update()'] },
    { title: 'Service partagé', brief: 'Exposer un état en lecture seule.', environment: 'Projet Angular', steps: ['Créer le service', 'Exposer le signal', 'Consommer dans deux composants'], criteria: ['Les deux composants voient la même valeur', 'Aucune mutation externe'], commands: ['ng generate service'], hints: ['asReadonly()'] },
    { title: 'Formulaire validé', brief: 'Construire un formulaire avec champs obligatoires et consentement.', environment: 'Projet Angular', steps: ['Créer le FormGroup', 'Ajouter les validateurs', 'Afficher les erreurs', 'Bloquer la soumission'], criteria: ['Le formulaire invalide bloque', 'Les messages sont explicites', 'Le consentement est requis'], commands: ['ng test'], hints: ['Validators.requiredTrue'] },
    { title: 'Route protégée', brief: 'Ajouter un guard de rôle et du lazy loading.', environment: 'Projet Angular', steps: ['Créer le guard', 'Protéger la route', 'Vérifier l’accès refusé'], criteria: ['La route est inaccessible sans rôle', 'Le chargement est différé', 'Le message est clair'], commands: ['ng build'], hints: ['CanActivateFn'] },
    { title: 'Liste performante', brief: 'Afficher une liste avec track et OnPush.', environment: 'Projet Angular', steps: ['Créer la liste', 'Ajouter track', 'Passer en OnPush', 'Mesurer'], criteria: ['Aucun recalcul inutile', 'La liste reste correcte', 'La performance est stable'], commands: ['ng build --stats-json'], hints: ['track item.id'] },
    { title: 'Test de comportement', brief: 'Tester l’affichage d’une erreur après soumission invalide.', environment: 'Projet Angular', steps: ['Configurer le test', 'Soumettre invalide', 'Vérifier le message'], criteria: ['Le test passe', 'Il échoue si le comportement change', 'Aucun accès aux internes'], commands: ['ng test'], hints: ['fixture.nativeElement.textContent'] },
  ],
  scenarios: [
    { title: 'L’écran ne se rafraîchit plus', situation: 'Une liste ne se met plus à jour après une action utilisateur.', signals: ['Composant OnPush', 'Mutation directe du tableau'], console: ['[Angular] changed after checked'], decisions: [{ prompt: 'Cause ?', options: [{ label: 'Mutation directe d’une entrée sans nouveau signal', outcome: 'Le composant ne détecte pas le changement.', score: 2, feedback: 'Les entrées doivent être remplacées, pas mutées.' }, { label: 'Le routeur est mal configuré', outcome: 'Aucun lien avec le symptôme.', score: 0, feedback: 'Mauvaise piste.' }] }] },
    { title: 'Le formulaire accepte tout', situation: 'Un formulaire d’inscription accepte un consentement vide.', signals: ['Aucun validateur', 'Soumission directe'], console: ['submit: { consent: false }'], decisions: [{ prompt: 'Correction ?', options: [{ label: 'Ajouter requiredTrue et bloquer la soumission', outcome: 'Le formulaire est conforme.', score: 2, feedback: 'Validation explicite.' }, { label: 'Masquer le bouton', outcome: 'Contournable et non accessible.', score: 0, feedback: 'Insuffisant.' }] }] },
  ],
  exam: [
    { type: 'QCM', prompt: 'Quel décorateur rend un composant autonome ?', options: ['standalone: true', 'module: true', 'autonomous: true', 'inject: true'], correctIndexes: [0], explanation: 'Un composant standalone déclare ses imports.' },
    { type: 'TRUE_FALSE', prompt: 'Un signal peut être exposé en lecture seule par un service.', options: ['Vrai', 'Faux'], correctIndexes: [0], explanation: 'asReadonly() empêche la mutation externe.' },
    { type: 'MULTI', prompt: 'Quelles pratiques améliorent la performance d’une liste ?', options: ['track', 'OnPush', 'Appel de fonction dans le template', 'Signaux'], correctIndexes: [0, 1, 3], explanation: 'Les appels de fonction recalculent à chaque cycle.' },
    { type: 'SCENARIO', prompt: 'Une route d’administration est accessible à tous. Quelle correction ?', options: ['Guard de rôle côté route et contrôle serveur', 'Cacher le lien', 'Ajouter un CSS', 'Renommer la route'], correctIndexes: [0], explanation: 'Le guard est une protection d’interface, le serveur reste indispensable.' },
    { type: 'TECHNICAL', prompt: 'Expliquez pourquoi un guard Angular ne remplace pas la sécurité backend.', options: ['Réponse libre'], correctIndexes: [], explanation: 'Le client peut être contourné.' },
    { type: 'QCM', prompt: 'Quel opérateur de formulaire exige une case cochée ?', options: ['requiredTrue', 'required', 'minLength', 'pattern'], correctIndexes: [0], explanation: 'requiredTrue impose la valeur vraie.' },
  ],
  tutorSeeds: ['Pourquoi les signaux simplifient-ils l’état ?', 'Quand utiliser OnPush ?', 'Comment éviter les fuites d’abonnement ?', 'Pourquoi un guard n’est-il pas une sécurité ?', 'Comment tester un comportement plutôt qu’une implémentation ?'],
  teamMission: 'Livrer une fonctionnalité Angular complète, testée et accessible',
  caseContext: 'Une application Angular vieillissante subit des ralentissements et des accès non contrôlés.',
  caseSymptoms: ['Composants non optimisés', 'Routes non protégées', 'Formulaires permissifs'],
};

const TESTS: KnowledgePack = {
  key: 'tests',
  label: 'Tests logiciels',
  subject: 'Stratégie de test et qualité',
  concepts: [
    { title: 'Pyramide des tests', objective: 'Répartir les tests selon leur coût et leur valeur.', notions: ['Unitaires', 'Intégration', 'Bout en bout'], example: 'Beaucoup d’unitaires, quelques intégrations, peu d’E2E.', pitfall: 'Tout miser sur l’E2E.' },
    { title: 'Test unitaire utile', objective: 'Tester un comportement isolé et significatif.', notions: ['Arrange/Act/Assert', 'Cas limites', 'Nommage'], example: 'Un test vérifie qu’un montant négatif est refusé.', pitfall: 'Tester les getters.' },
    { title: 'Test d’intégration', objective: 'Vérifier la collaboration entre composants.', notions: ['Base de données', 'API', 'Fixtures'], example: 'Un test vérifie la persistance réelle dans une base de test.', pitfall: 'Mocker la base et croire tester l’intégration.' },
    { title: 'Test de bout en bout', objective: 'Valider un parcours utilisateur critique.', notions: ['Scénario', 'Sélecteurs stables', 'Données de test'], example: 'Un scénario couvre inscription puis première connexion.', pitfall: 'Scénarios trop nombreux et lents.' },
    { title: 'Doubles de test', objective: 'Choisir entre mock, stub et fake.', notions: ['Mock', 'Stub', 'Fake'], example: 'Un fake de dépôt remplace la base en mémoire.', pitfall: 'Mocker ce qu’on veut vérifier.' },
    { title: 'Couverture et pertinence', objective: 'Interpréter la couverture sans s’y tromper.', notions: ['Couverture de lignes', 'Couverture de branches', 'Qualité des assertions'], example: '80 % de couverture sans assertion utile ne prouve rien.', pitfall: 'Optimiser le chiffre.' },
    { title: 'Tests instables', objective: 'Diagnostiquer et corriger la non-déterminisme.', notions: ['Temps', 'Ordre', 'Réseau'], example: 'Un test dépendant de l’heure échoue la nuit.', pitfall: 'Ajouter des temporisations.' },
    { title: 'Données de test', objective: 'Créer des jeux de données reproductibles.', notions: ['Fixtures', 'Isolation', 'Nettoyage'], example: 'Chaque test crée et supprime ses données.', pitfall: 'Partager un état mutable.' },
    { title: 'Tests de régression', objective: 'Empêcher le retour d’un défaut.', notions: ['Reproduction', 'Assertion ciblée', 'Référence au ticket'], example: 'Un test reproduit le bug corrigé.', pitfall: 'Corriger sans test.' },
    { title: 'Performance et charge', objective: 'Mesurer le comportement sous charge.', notions: ['Latence', 'Débit', 'Saturation'], example: 'Un test de charge révèle une saturation à 300 utilisateurs.', pitfall: 'Tester en environnement non représentatif.' },
  ],
  labs: [
    { title: 'Premier test unitaire', brief: 'Écrire un test qui échoue puis passe.', environment: 'Projet avec runner de test', steps: ['Écrire le test', 'Observer l’échec', 'Implémenter', 'Vérifier le vert'], criteria: ['Le test échoue avant', 'Il passe après', 'Le nom décrit le comportement'], commands: ['npm test'], hints: ['Un comportement par test'] },
    { title: 'Test d’intégration API', brief: 'Tester une route avec une base de test.', environment: 'API et base de test', steps: ['Préparer les données', 'Appeler la route', 'Vérifier la persistance'], criteria: ['La base est isolée', 'Le résultat est vérifié', 'Les données sont nettoyées'], commands: ['npm run test:integration'], hints: ['Transaction annulée après test'] },
    { title: 'Doubles de test', brief: 'Remplacer une dépendance externe par un fake.', environment: 'Projet avec service externe', steps: ['Créer le fake', 'Injecter', 'Tester'], criteria: ['Aucun appel réseau', 'Le comportement est vérifié', 'Le test est rapide'], commands: ['npm test'], hints: ['Fake plutôt que mock profond'] },
    { title: 'Test instable', brief: 'Stabiliser un test dépendant du temps.', environment: 'Suite avec test instable', steps: ['Reproduire', 'Identifier la dépendance', 'Injecter une horloge'], criteria: ['Le test est déterministe', 'Il échoue si le comportement casse', 'Aucun sleep'], commands: ['npm test -- --repeat 20'], hints: ['Horloge injectable'] },
  ],
  scenarios: [
    { title: 'La suite devient lente', situation: 'La suite de tests prend 40 minutes et l’équipe la contourne.', signals: ['Beaucoup d’E2E', 'Tests redondants'], console: ['$ npm test', 'duration 2412s'], decisions: [{ prompt: 'Action ?', options: [{ label: 'Rééquilibrer vers des tests unitaires', outcome: 'La suite passe sous 8 minutes.', score: 2, feedback: 'Respecter la pyramide.' }, { label: 'Supprimer les tests lents', outcome: 'Les régressions augmentent.', score: 0, feedback: 'Perte de couverture.' }] }] },
  ],
  exam: [
    { type: 'QCM', prompt: 'Quel test coûte généralement le plus cher ?', options: ['Unitaire', 'Intégration', 'Bout en bout', 'Statique'], correctIndexes: [2], explanation: 'L’E2E est le plus lent et le plus fragile.' },
    { type: 'TRUE_FALSE', prompt: 'Une couverture de 100 % garantit l’absence de défauts.', options: ['Vrai', 'Faux'], correctIndexes: [1], explanation: 'La couverture ne mesure pas la pertinence des assertions.' },
    { type: 'MULTI', prompt: 'Quelles causes rendent un test instable ?', options: ['Dépendance au temps', 'Ordre d’exécution', 'Assertion explicite', 'Réseau non contrôlé'], correctIndexes: [0, 1, 3], explanation: 'Une assertion explicite stabilise au contraire.' },
    { type: 'TECHNICAL', prompt: 'Expliquez la différence entre un mock et un fake.', options: ['Réponse libre'], correctIndexes: [], explanation: 'Le mock vérifie des interactions, le fake fournit une implémentation simplifiée.' },
  ],
  tutorSeeds: ['Pourquoi la pyramide des tests ?', 'Quand un mock devient-il nuisible ?', 'Comment stabiliser un test ?', 'Que mesure vraiment la couverture ?'],
  teamMission: 'Définir une stratégie de test proportionnée et fiable',
  caseContext: 'Une équipe a une suite de tests lente et instable, contournée en cas d’urgence.',
  caseSymptoms: ['Suite lente', 'Tests instables', 'Couverture élevée mais défauts en production'],
};

const KUBERNETES: KnowledgePack = {
  key: 'kubernetes',
  label: 'Kubernetes',
  subject: 'Orchestration de conteneurs',
  concepts: [
    { title: 'Pod, deployment, service', objective: 'Distinguer les objets fondamentaux.', notions: ['Pod', 'Deployment', 'Service'], example: 'Un deployment gère trois pods derrière un service.', pitfall: 'Créer des pods nus en production.' },
    { title: 'Réplication et mise à l’échelle', objective: 'Adapter la capacité à la charge.', notions: ['Replicas', 'HPA', 'Ressources'], example: 'Le HPA ajoute des pods au-delà de 70 % CPU.', pitfall: 'Mettre à l’échelle sans limites de ressources.' },
    { title: 'Configuration et secrets', objective: 'Externaliser la configuration.', notions: ['ConfigMap', 'Secret', 'Variables'], example: 'La configuration change sans reconstruire l’image.', pitfall: 'Configuration en dur dans l’image.' },
    { title: 'Santé des applications', objective: 'Configurer readiness et liveness correctement.', notions: ['Readiness', 'Liveness', 'Startup'], example: 'Une readiness trop stricte retire tous les pods du service.', pitfall: 'Confondre les deux sondes.' },
    { title: 'Réseau et ingress', objective: 'Exposer un service proprement.', notions: ['ClusterIP', 'Ingress', 'DNS interne'], example: 'L’ingress termine le TLS et route vers le service.', pitfall: 'Exposer chaque pod directement.' },
    { title: 'Volumes et état', objective: 'Gérer les données persistantes.', notions: ['PV', 'PVC', 'StatefulSet'], example: 'Une base utilise un StatefulSet avec un PVC.', pitfall: 'Traiter une base comme un deployment sans état.' },
    { title: 'Déploiements progressifs', objective: 'Limiter le risque de mise à jour.', notions: ['RollingUpdate', 'Canary', 'Rollback'], example: 'Un rolling update remplace les pods un par un.', pitfall: 'Pas de stratégie de retour arrière.' },
    { title: 'Diagnostic', objective: 'Enquêter sur un pod en échec.', notions: ['kubectl describe', 'logs', 'events'], example: 'Les events révèlent une image introuvable.', pitfall: 'Supprimer le pod sans lire les events.' },
  ],
  labs: [
    { title: 'Déployer une application', brief: 'Créer un deployment et un service.', environment: 'Cluster de test', steps: ['Écrire le manifeste', 'Appliquer', 'Vérifier les pods', 'Tester le service'], criteria: ['Les pods sont prêts', 'Le service répond', 'Les ressources sont définies'], commands: ['kubectl apply -f app.yaml', 'kubectl get pods'], hints: ['Utiliser des labels cohérents'] },
    { title: 'Sondes de santé', brief: 'Configurer readiness et liveness.', environment: 'Cluster de test', steps: ['Ajouter readiness', 'Ajouter liveness', 'Simuler une panne'], criteria: ['Le trafic est retiré si non prêt', 'Le pod redémarre si bloqué'], commands: ['kubectl describe pod'], hints: ['Readiness plus stricte que liveness'] },
    { title: 'Diagnostic d’un pod en échec', brief: 'Identifier la cause d’un CrashLoopBackOff.', environment: 'Cluster avec pod défaillant', steps: ['describe', 'logs', 'events', 'corriger'], criteria: ['La cause est identifiée', 'Le pod devient stable'], commands: ['kubectl logs', 'kubectl describe'], hints: ['Lire les events en dernier recours'] },
  ],
  scenarios: [
    { title: 'Tous les pods sont retirés du service', situation: 'Le service renvoie 503 alors que les pods tournent.', signals: ['Readiness en échec', 'Timeouts de sonde'], console: ['$ kubectl get pods', '0/1 Running'], decisions: [{ prompt: 'Cause ?', options: [{ label: 'La sonde readiness échoue', outcome: 'Vous ajustez le chemin et le délai.', score: 2, feedback: 'Exact.' }, { label: 'Le DNS est cassé', outcome: 'Aucun impact sur la readiness.', score: 0, feedback: 'Mauvaise piste.' }] }] },
  ],
  exam: [
    { type: 'QCM', prompt: 'Quel objet maintient un nombre de pods ?', options: ['Service', 'Deployment', 'Ingress', 'ConfigMap'], correctIndexes: [1], explanation: 'Le deployment gère les replicas.' },
    { type: 'TRUE_FALSE', prompt: 'Une sonde liveness doit être plus permissive qu’une readiness.', options: ['Vrai', 'Faux'], correctIndexes: [0], explanation: 'Sinon les pods redémarrent inutilement.' },
    { type: 'MULTI', prompt: 'Quels objets externalisent la configuration ?', options: ['ConfigMap', 'Secret', 'Deployment', 'Service'], correctIndexes: [0, 1], explanation: 'ConfigMap et Secret portent la configuration.' },
  ],
  tutorSeeds: ['Pourquoi ne pas créer de pods nus ?', 'Comment diagnostiquer un CrashLoopBackOff ?', 'Readiness ou liveness ?', 'Quand utiliser un StatefulSet ?'],
  teamMission: 'Déployer une application résiliente sur un cluster de test',
  caseContext: 'Une application conteneurisée doit être déployée avec haute disponibilité.',
  caseSymptoms: ['Pods instables', 'Service indisponible', 'Configuration non externalisée'],
};

const GIT: KnowledgePack = {
  key: 'git',
  label: 'Git',
  subject: 'Travail collaboratif avec Git',
  concepts: [
    { title: 'Modèle de commits', objective: 'Comprendre l’historique comme un graphe.', notions: ['Commit', 'Branche', 'Fusion'], example: 'Une branche pointe sur un commit.', pitfall: 'Réécrire une branche partagée.' },
    { title: 'Branches et intégration', objective: 'Choisir entre merge et rebase.', notions: ['Merge', 'Rebase', 'Conflits'], example: 'Rebase pour une branche locale, merge pour l’intégration.', pitfall: 'Rebase d’une branche publique.' },
    { title: 'Revue de code', objective: 'Produire une pull request lisible.', notions: ['Petit diff', 'Description', 'Revue'], example: 'Une PR de 200 lignes est relue en 15 minutes.', pitfall: 'PR géante fourre-tout.' },
    { title: 'Résolution de conflits', objective: 'Résoudre un conflit sans perte.', notions: ['Conflit', 'Marqueurs', 'Tests'], example: 'On résout puis on exécute les tests avant de poursuivre.', pitfall: 'Choisir un côté sans comprendre.' },
    { title: 'Commits utiles', objective: 'Écrire des messages et des découpages clairs.', notions: ['Message', 'Atomicité', 'Contexte'], example: 'Un commit par intention.', pitfall: 'Commit fourre-tout.' },
    { title: 'Sécurité des secrets', objective: 'Ne jamais versionner de secret.', notions: ['.gitignore', 'Historique', 'Révocation'], example: 'Un secret poussé doit être révoqué immédiatement.', pitfall: 'Supprimer le fichier sans révoquer.' },
  ],
  labs: [
    { title: 'Cycle de branche', brief: 'Créer, committer, pousser et fusionner une branche.', environment: 'Dépôt Git', steps: ['Créer la branche', 'Commiter', 'Pousser', 'Ouvrir une PR'], criteria: ['L’historique est lisible', 'La PR est petite', 'Les tests passent'], commands: ['git switch -c feature', 'git commit', 'git push -u origin'], hints: ['Un commit par intention'] },
    { title: 'Résoudre un conflit', brief: 'Résoudre un conflit en conservant le comportement attendu.', environment: 'Dépôt avec conflit préparé', steps: ['Reproduire', 'Lire les marqueurs', 'Résoudre', 'Tester'], criteria: ['Aucun marqueur restant', 'Les tests passent', 'L’intention est préservée'], commands: ['git status', 'git add', 'git rebase --continue'], hints: ['Comprendre les deux versions'] },
  ],
  scenarios: [
    { title: 'Secret poussé par erreur', situation: 'Un fichier .env contenant une clé a été poussé.', signals: ['Fichier dans l’historique', 'Clé active'], console: ['$ git log --all -- .env'], decisions: [{ prompt: 'Première action ?', options: [{ label: 'Révoquer la clé puis nettoyer l’historique', outcome: 'Le risque est contenu.', score: 2, feedback: 'La révocation prime.' }, { label: 'Supprimer le fichier au prochain commit', outcome: 'La clé reste dans l’historique.', score: 0, feedback: 'Insuffisant.' }] }] },
  ],
  exam: [
    { type: 'QCM', prompt: 'Quelle commande crée une branche et bascule dessus ?', options: ['git switch -c', 'git merge', 'git clone', 'git stash'], correctIndexes: [0], explanation: 'switch -c crée et bascule.' },
    { type: 'TRUE_FALSE', prompt: 'Supprimer un fichier de secret au commit suivant le retire de l’historique.', options: ['Vrai', 'Faux'], correctIndexes: [1], explanation: 'L’historique conserve le contenu.' },
    { type: 'MULTI', prompt: 'Quelles pratiques rendent une revue efficace ?', options: ['Petit diff', 'Description claire', 'PR fourre-tout', 'Tests exécutés'], correctIndexes: [0, 1, 3], explanation: 'Une PR trop large dégrade la revue.' },
  ],
  tutorSeeds: ['Rebase ou merge ?', 'Comment écrire un bon message de commit ?', 'Que faire après avoir poussé un secret ?'],
  teamMission: 'Adopter un flux Git lisible et sécurisé',
  caseContext: 'Une équipe subit des conflits fréquents et des revues interminables.',
  caseSymptoms: ['Branches longues', 'PR volumineuses', 'Secrets versionnés'],
};

/** Vocabulaire par domaine pour les compétences sans pack dédié. */
const DOMAIN_VOCAB: Record<Domain, { unit: string; actor: string; artefact: string; measure: string }> = {
  DEV: { unit: 'module applicatif', actor: 'développeur', artefact: 'dépôt de code', measure: 'qualité de livraison' },
  DATA_AI: { unit: 'pipeline de données', actor: 'data engineer', artefact: 'jeu de données validé', measure: 'fiabilité des résultats' },
  ECOMMERCE: { unit: 'parcours d’achat', actor: 'responsable e-commerce', artefact: 'tableau de conversion', measure: 'taux de conversion' },
  AUDIT_QUALITY: { unit: 'chantier d’audit', actor: 'auditeur', artefact: 'rapport d’audit', measure: 'conformité constatée' },
  MARKETING: { unit: 'campagne', actor: 'responsable marketing', artefact: 'plan de campagne', measure: 'performance des campagnes' },
  RH: { unit: 'processus RH', actor: 'responsable RH', artefact: 'dossier structuré', measure: 'qualité du processus' },
  FINANCE: { unit: 'cycle financier', actor: 'analyste financier', artefact: 'analyse chiffrée', measure: 'fiabilité des analyses' },
  DESIGN: { unit: 'parcours utilisateur', actor: 'designer', artefact: 'maquette testée', measure: 'utilisabilité' },
  OTHER: { unit: 'activité professionnelle', actor: 'professionnel', artefact: 'livrable documenté', measure: 'maîtrise observée' },
};

function proceduralPack(skillCode: string, skillLabel: string, subject: string, domain: Domain): KnowledgePack {
  const vocab = DOMAIN_VOCAB[domain];
  const base = subject || skillLabel;
  const angles = [
    { suffix: 'Fondamentaux et vocabulaire', objective: `Poser les bases de ${base} et lever les ambiguïtés.` },
    { suffix: 'Cadre professionnel', objective: `Situer ${base} dans le métier de ${vocab.actor}.` },
    { suffix: 'Méthode et démarche', objective: `Appliquer une démarche structurée sur ${base}.` },
    { suffix: 'Outils et environnement', objective: `Maîtriser les outils associés à ${base}.` },
    { suffix: 'Cas standard', objective: `Traiter un cas standard de ${base} sans aide.` },
    { suffix: 'Cas dégradé', objective: `Diagnostiquer une situation dégradée liée à ${base}.` },
    { suffix: 'Qualité et contrôle', objective: `Contrôler la qualité du ${vocab.unit}.` },
    { suffix: 'Risques et conformité', objective: `Identifier les risques et les règles applicables.` },
    { suffix: 'Communication', objective: `Présenter et justifier une décision sur ${base}.` },
    { suffix: 'Amélioration continue', objective: `Mesurer et améliorer ${vocab.measure}.` },
    { suffix: 'Cas complexe', objective: `Résoudre un cas complexe mobilisant plusieurs notions.` },
    { suffix: 'Synthèse et transfert', objective: `Transposer la maîtrise de ${base} à un nouveau contexte.` },
  ];

  const concepts: KnowledgeConcept[] = angles.map((angle) => ({
    title: `${base} — ${angle.suffix}`,
    objective: angle.objective,
    notions: [
      `Notion clé : ${base.toLowerCase()} dans le contexte ${vocab.unit}`,
      `Repère professionnel attendu pour un ${vocab.actor}`,
      `Critère d’évaluation observable sur ${vocab.artefact}`,
    ],
    example: `Un ${vocab.actor} applique ${base} sur un ${vocab.unit} et documente le résultat dans le ${vocab.artefact}.`,
    pitfall: `Traiter ${base} de façon isolée sans mesurer ${vocab.measure}.`,
  }));

  const labs: KnowledgeLab[] = angles.slice(0, 6).map((angle, index) => ({
    title: `Mise en pratique — ${angle.suffix}`,
    brief: `${angle.objective} Vous produisez un résultat vérifiable.`,
    environment: `Environnement de travail simulé (${vocab.unit})`,
    steps: [
      'Lire la consigne et reformuler l’objectif',
      `Réaliser l’activité sur ${base}`,
      'Documenter les décisions prises',
      'Vérifier le résultat selon les critères',
    ],
    criteria: [
      'L’objectif est atteint',
      `Le ${vocab.artefact} est complet`,
      'Les décisions sont justifiées',
    ],
    commands: index < 3 ? ['étape 1', 'étape 2', 'vérification'] : ['analyse', 'correction', 'validation'],
    hints: ['Revenir à l’objectif pédagogique', 'Comparer avec un cas standard'],
  }));

  const scenarios: KnowledgeScenario[] = [
    {
      title: `Incident sur ${base}`,
      situation: `Un ${vocab.unit} présente un dysfonctionnement lié à ${base}. Le ${vocab.actor} doit réagir.`,
      signals: ['Écart constaté sur le résultat attendu', 'Aucune documentation récente', 'Pression de délai'],
      console: ['$ statut', 'anomalie détectée', '$ historique', 'aucune trace récente'],
      decisions: [
        {
          prompt: 'Première action ?',
          options: [
            { label: 'Collecter les faits et délimiter le problème', outcome: 'Vous identifiez la cause probable.', score: 2, feedback: 'Le diagnostic précède la correction.' },
            { label: 'Corriger immédiatement au hasard', outcome: 'Le problème persiste et le risque augmente.', score: 0, feedback: 'Action non fondée sur des faits.' },
          ],
        },
        {
          prompt: 'Comment sécuriser la décision ?',
          options: [
            { label: 'Documenter et faire valider par un pair', outcome: 'La décision est traçable et validée.', score: 2, feedback: 'Traçabilité et validation humaine.' },
            { label: 'Décider seul sans trace', outcome: 'Aucune possibilité de revue.', score: 0, feedback: 'Risque de décision non vérifiable.' },
          ],
        },
      ],
    },
  ];

  const exam: KnowledgeExamQuestion[] = [
    { type: 'QCM', prompt: `Quel est l’objectif principal de ${base} pour un ${vocab.actor} ?`, options: [`Améliorer ${vocab.measure}`, 'Réduire les coûts uniquement', 'Supprimer les contrôles', 'Éviter la documentation'], correctIndexes: [0], explanation: `La maîtrise de ${base} sert ${vocab.measure}.` },
    { type: 'TRUE_FALSE', prompt: `Une observation d’usage suffit à prouver la maîtrise de ${base}.`, options: ['Vrai', 'Faux'], correctIndexes: [1], explanation: 'Une observation ne prouve pas la maîtrise ; une évaluation est nécessaire.' },
    { type: 'MULTI', prompt: `Quelles pratiques renforcent la maîtrise de ${base} ?`, options: ['Pratique délibérée', 'Documentation', 'Évitement des cas difficiles', 'Retour d’expérience'], correctIndexes: [0, 1, 3], explanation: 'Éviter les cas difficiles empêche la progression.' },
    { type: 'SCENARIO', prompt: `Un ${vocab.unit} dérive. Que faites-vous en premier ?`, options: ['Collecter les faits', 'Changer tout le processus', 'Ignorer', 'Attendre la fin du mois'], correctIndexes: [0], explanation: 'Le diagnostic factuel précède toute décision.' },
    { type: 'TECHNICAL', prompt: `Décrivez une situation où vous avez appliqué ${base} et le résultat obtenu.`, options: ['Réponse libre'], correctIndexes: [], explanation: 'La réponse est évaluée sur la structure et la preuve.' },
  ];

  return {
    key: skillCode.toLowerCase(),
    label: skillLabel,
    subject: base,
    concepts,
    labs,
    scenarios,
    exam,
    tutorSeeds: angles.slice(0, 6).map((angle) => `Comment abordez-vous ${angle.suffix.toLowerCase()} ?`),
    teamMission: `Produire un ${vocab.artefact} collectif démontrant la maîtrise de ${base}`,
    caseContext: `Une organisation doit améliorer ${vocab.measure} sur son ${vocab.unit}, avec des moyens limités.`,
    caseSymptoms: ['Résultats irréguliers', 'Processus non documenté', 'Décisions non tracées'],
  };
}

const PACKS: KnowledgePack[] = [DOCKER, CICD, ANGULAR, TESTS, KUBERNETES, GIT];

export function knowledgeFor(
  skillCode: string,
  skillLabel: string,
  subject: string,
  domain: Domain,
): KnowledgePack {
  const haystack = `${skillCode} ${skillLabel} ${subject}`.toLowerCase();
  const match = PACKS.find((pack) => haystack.includes(pack.key));
  if (match) {
    return { ...match, subject: subject || match.subject };
  }
  return proceduralPack(skillCode, skillLabel, subject, domain);
}
