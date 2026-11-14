import {
  FORMAT_LABELS,
  GeneratedTraining,
  ModuleFormat,
  ProjectRole,
  QuizQuestion,
  TrainingCodeExercise,
  TrainingDecision,
  TrainingFlashcard,
  TrainingStep,
} from '../models';

interface KnowledgeConcept {
  title: string;
  detail: string;
}

interface Knowledge {
  key: string;
  focus: string;
  concepts: KnowledgeConcept[];
  commands: string[];
  pitfalls: string[];
  quiz: Omit<QuizQuestion, 'id' | 'skill'>[];
  flashcards: TrainingFlashcard[];
  code: TrainingCodeExercise;
  decisions: TrainingDecision[];
  projectSteps: { title: string; deliverable: string }[];
  roles: ProjectRole[];
  peerCriteria: string[];
  sources: { title: string; body: string[] }[];
}

const GENERIC_QUIZ: Omit<QuizQuestion, 'id' | 'skill'>[] = [
  {
    type: 'QCM',
    prompt: 'Quelle démarche permet de progresser durablement sur ce sujet ?',
    options: [
      'Alterner une notion courte, un exercice immédiat puis un retour sur les erreurs',
      'Lire toute la documentation d’un seul bloc sans pratiquer',
      'Mémoriser des commandes sans comprendre leur contexte',
      'Attendre une formation officielle avant de s’exercer',
    ],
    correctIndex: 0,
    explanation:
      'La progression durable vient de la pratique délibérée : une notion, un exercice, un retour immédiat sur l’erreur.',
  },
  {
    type: 'TRUE_FALSE',
    prompt: 'Une compétence est considérée comme maîtrisée dès qu’on a lu la documentation correspondante.',
    options: ['Vrai', 'Faux'],
    correctIndex: 1,
    explanation:
      'Lire ne suffit pas : la maîtrise se vérifie par une mise en situation et une évaluation observable.',
  },
  {
    type: 'TECHNICAL',
    prompt: 'Quel indicateur montre le mieux une progression réelle ?',
    options: [
      'La capacité à réaliser une tâche nouvelle sans aide',
      'Le nombre de pages consultées',
      'Le temps passé sur une page',
      'Le nombre de vidéos regardées',
    ],
    correctIndex: 0,
    explanation:
      'La progression se mesure sur une tâche observable réalisée en autonomie, pas sur le volume consulté.',
  },
  {
    type: 'SCENARIO',
    prompt: 'Vous bloquez sur une tâche en situation réelle. Quelle réaction est la plus efficace ?',
    options: [
      'Isoler le problème, formuler une hypothèse, tester puis documenter la solution',
      'Recommencer la même action plusieurs fois sans observer',
      'Abandonner et attendre une nouvelle formation',
      'Copier une solution sans comprendre le contexte',
    ],
    correctIndex: 0,
    explanation:
      'Formuler une hypothèse et tester de façon contrôlée permet d’apprendre du blocage et de capitaliser la solution.',
  },
];

const GENERIC_FLASHCARDS: TrainingFlashcard[] = [
  { front: 'Principe clé', back: 'Comprendre le contexte avant d’appliquer une procédure.' },
  { front: 'Réflexe de diagnostic', back: 'Reproduire, isoler, observer, corriger, documenter.' },
  { front: 'Signal d’alerte', back: 'Une correction qui fonctionne sans explication est une dette.' },
  { front: 'Preuve de maîtrise', back: 'Réaliser la tâche en autonomie et l’expliquer à un pair.' },
];

const GENERIC_SOURCES = [
  {
    title: 'Leçon vidéo — cadrer le sujet',
    body: [
      'Chapitre 1 : pourquoi ce sujet compte dans votre poste et quelles tâches concrètes il débloque.',
      'Chapitre 2 : les trois notions indispensables, illustrées par une situation réelle.',
      'Chapitre 3 : démonstration guidée, puis piège fréquent et moyen de l’éviter.',
    ],
  },
  {
    title: 'Article de référence',
    body: [
      'Une fiche de synthèse structurée : définitions, procédure pas à pas, checklist de vérification.',
      'Chaque étape est reliée à un indicateur observable : que doit-on voir si l’action a réussi ?',
      'Une section « erreurs fréquentes » décrit les symptômes et la correction attendue.',
    ],
  },
  {
    title: 'Podcast — retour d’expérience',
    body: [
      'Un collègue raconte une situation où la compétence a fait la différence, puis ce qu’il aurait fait autrement.',
      'Le podcast se termine par trois questions à se poser avant de passer à l’exercice.',
    ],
  },
];

/**
 * Base de connaissances utilisée par le générateur de formation.
 *
 * En production, cette fonction sera remplacée par un appel à l'agent
 * « formation » du backend. Le contrat retourné reste identique.
 */
export function knowledgeFor(skillCode: string, skillLabel: string, subject: string): Knowledge {
  const key = skillCode.toLowerCase();
  const base: Knowledge = {
    key,
    focus: `Maîtriser ${skillLabel.toLowerCase()} sur un cas concret : ${subject}.`,
    concepts: [
      {
        title: 'Comprendre le cadre',
        detail: `Identifier ce que ${subject} change dans le travail quotidien, les entrées disponibles et le résultat attendu.`,
      },
      {
        title: 'Appliquer la bonne procédure',
        detail: 'Décomposer l’action en étapes vérifiables, avec un critère de réussite pour chacune.',
      },
      {
        title: 'Diagnostiquer',
        detail: 'Reproduire le problème, isoler la cause, corriger puis vérifier que la correction tient.',
      },
      {
        title: 'Capitaliser',
        detail: 'Documenter la solution et l’expliquer à un pair pour transformer l’essai en compétence durable.',
      },
    ],
    commands: [
      `Reproduire la situation de départ : ${subject}`,
      'Exécuter l’action principale et observer le résultat',
      'Introduire volontairement une erreur, puis la corriger',
      'Documenter la vérification finale',
    ],
    pitfalls: [
      'Aller trop vite sans vérifier le résultat intermédiaire',
      'Copier une solution sans comprendre les hypothèses',
      'Oublier de documenter la correction',
    ],
    quiz: GENERIC_QUIZ,
    flashcards: GENERIC_FLASHCARDS,
    code: {
      language: 'text',
      starter: `# Exercice — ${subject}\n# 1. Décrivez l’état initial\n# 2. Écrivez la procédure\n# 3. Ajoutez la vérification finale\n`,
      expected: ['vérif', 'résultat', 'erreur'],
      hints: [
        'Commencez par écrire le résultat attendu avant la procédure.',
        'Ajoutez une étape de vérification observable.',
        'Prévoyez le cas d’erreur le plus probable.',
      ],
      solution: 'Une procédure décomposée, une vérification observable et un cas d’erreur traité.',
      criteria: [
        'La procédure est décomposée en étapes',
        'La vérification finale est explicite',
        'Un cas d’erreur est traité',
      ],
    },
    decisions: [
      {
        prompt: 'Une action échoue sans message clair. Que faites-vous en premier ?',
        options: [
          {
            label: 'Reproduire et isoler le comportement observé',
            outcome: 'Bonne réaction : vous obtenez un cas reproductible et une première hypothèse.',
            correct: true,
          },
          {
            label: 'Modifier plusieurs paramètres à la fois',
            outcome: 'Vous ne saurez pas quel changement a produit l’effet observé.',
            correct: false,
          },
          {
            label: 'Ignorer l’échec et continuer',
            outcome: 'Le problème reviendra en production, avec moins de contexte.',
            correct: false,
          },
        ],
      },
    ],
    projectSteps: [
      { title: 'Cadrer le besoin', deliverable: 'Un objectif mesurable et le résultat attendu.' },
      { title: 'Construire la solution', deliverable: 'Une première version fonctionnelle.' },
      { title: 'Vérifier et corriger', deliverable: 'Une checklist de vérification et les corrections.' },
      { title: 'Présenter et transmettre', deliverable: 'Une note de 10 lignes pour un pair.' },
    ],
    roles: [
      { name: 'Porteur du besoin', mission: 'Décrit le résultat attendu et les contraintes.' },
      { name: 'Réalisateur', mission: 'Produit la solution et documente les choix.' },
      { name: 'Relecteur', mission: 'Vérifie les critères et propose une amélioration.' },
    ],
    peerCriteria: [
      'Le résultat attendu est explicite',
      'La solution est vérifiable',
      'Les erreurs sont documentées',
      'Un pair peut reproduire la démarche',
    ],
    sources: GENERIC_SOURCES,
  };

  switch (key) {
    case 'docker':
      return {
        ...base,
        focus: 'Conteneuriser une application, la rendre reproductible et diagnostiquer un conteneur défaillant.',
        concepts: [
          {
            title: 'Image et conteneur',
            detail:
              'Une image est un modèle immuable ; un conteneur est une instance isolée. Toute modification d’image doit être reproductible via le Dockerfile.',
          },
          {
            title: 'Dockerfile multi-étapes',
            detail:
              'Séparer la compilation de l’exécution réduit la taille de l’image et limite la surface d’attaque.',
          },
          {
            title: 'Volumes, réseaux et variables',
            detail:
              'Les volumes conservent les données, les réseaux isolent les services, les variables évitent de coder les secrets dans l’image.',
          },
          {
            title: 'Diagnostic',
            detail:
              'docker logs, docker inspect et le code de sortie donnent les premiers indices avant toute modification.',
          },
        ],
        commands: [
          'docker build -t app:1.0 .',
          'docker run --rm -p 8080:8080 app:1.0',
          'docker logs <conteneur>',
          'docker inspect --format "{{.State.ExitCode}}" <conteneur>',
        ],
        pitfalls: [
          'Utiliser latest au lieu d’une version figée',
          'Copier node_modules ou target dans l’image finale',
          'Écrire des secrets dans le Dockerfile',
        ],
        quiz: [
          {
            type: 'QCM',
            prompt: 'Quel est le principal bénéfice d’un Dockerfile multi-étapes ?',
            options: [
              'Réduire la taille de l’image finale en séparant compilation et exécution',
              'Supprimer le besoin de tests',
              'Rendre le conteneur obligatoirement plus rapide',
              'Éviter d’écrire un fichier .dockerignore',
            ],
            correctIndex: 0,
            explanation:
              'Le multi-étapes ne conserve dans l’image finale que les artefacts nécessaires à l’exécution.',
          },
          {
            type: 'TRUE_FALSE',
            prompt: 'Un conteneur arrêté conserve par défaut ses données dans son système de fichiers.',
            options: ['Vrai', 'Faux'],
            correctIndex: 1,
            explanation:
              'Le système de fichiers du conteneur est éphémère : il faut un volume pour conserver les données.',
          },
          {
            type: 'TECHNICAL',
            prompt: 'Quelle commande affiche les logs d’un conteneur nommé api ?',
            options: ['docker logs api', 'docker ps api', 'docker pull api', 'docker tag api'],
            correctIndex: 0,
            explanation: 'docker logs suit la sortie standard et la sortie d’erreur du conteneur.',
          },
          {
            type: 'SCENARIO',
            prompt: 'Votre conteneur redémarre en boucle après déploiement. Quelle est la première action ?',
            options: [
              'Consulter les logs et le code de sortie pour identifier la cause',
              'Supprimer immédiatement l’image',
              'Redémarrer le serveur hôte',
              'Augmenter la mémoire au hasard',
            ],
            correctIndex: 0,
            explanation:
              'Les logs et le code de sortie orientent le diagnostic avant toute modification.',
          },
        ],
        flashcards: [
          { front: 'Image vs conteneur', back: 'L’image est le modèle immuable ; le conteneur est l’instance en exécution.' },
          { front: 'Forme courte du multi-stage', back: 'FROM builder AS build puis FROM runtime et COPY --from=build.' },
          { front: 'Commande de diagnostic', back: 'docker logs + docker inspect --format "{{.State.ExitCode}}".' },
          { front: 'Données persistantes', back: 'Un volume nommé ou un bind mount, jamais le système de fichiers interne seul.' },
          { front: 'Bonne pratique de base', back: 'Figer la version de l’image de base et ajouter un .dockerignore.' },
        ],
        code: {
          language: 'dockerfile',
          starter: `# Complétez ce Dockerfile multi-étapes\nFROM node:20-alpine AS build\nWORKDIR /app\n# TODO : copier les manifestes puis installer les dépendances\n\nFROM node:20-alpine AS runtime\nWORKDIR /app\n# TODO : copier uniquement le nécessaire depuis l’étape build\nEXPOSE 3000\n# TODO : démarrer l’application\n`,
          expected: ['copy package', 'npm ci', 'copy --from=build', 'expose', 'cmd'],
          hints: [
            'Copiez package.json et package-lock.json avant npm ci pour profiter du cache.',
            'Utilisez COPY --from=build pour ne récupérer que le dossier utile.',
            'La commande finale doit lancer le serveur sur le port exposé.',
          ],
          solution:
            'FROM node:20-alpine AS build\nWORKDIR /app\nCOPY package*.json ./\nRUN npm ci\nCOPY . .\nRUN npm run build\n\nFROM node:20-alpine AS runtime\nWORKDIR /app\nCOPY --from=build /app/dist ./dist\nEXPOSE 3000\nCMD ["node", "dist/main.js"]',
          criteria: [
            'Le build et l’exécution sont séparés',
            'Les dépendances sont installées de façon reproductible',
            'Seuls les artefacts utiles sont copiés',
            'Le port et la commande de démarrage sont explicites',
          ],
        },
        decisions: [
          {
            prompt: 'Le conteneur démarre puis s’arrête avec le code 137. Que concluez-vous ?',
            options: [
              {
                label: 'Le processus a probablement été tué par manque de mémoire (OOM)',
                outcome: 'Piste pertinente : vérifiez les limites mémoire et la consommation réelle.',
                correct: true,
              },
              {
                label: 'Le Dockerfile est forcément invalide',
                outcome: 'Le build aurait échoué avant le démarrage ; le code 137 oriente ailleurs.',
                correct: false,
              },
              {
                label: 'Le port 8080 est déjà utilisé',
                outcome: 'Un conflit de port produit plutôt un message explicite au démarrage.',
                correct: false,
              },
            ],
          },
          {
            prompt: 'Une image fait 1,2 Go. Quelle action est la plus efficace en premier ?',
            options: [
              {
                label: 'Passer à un build multi-étapes et vérifier le .dockerignore',
                outcome: 'Bonne priorité : vous retirez les dépendances et fichiers de build de l’image finale.',
                correct: true,
              },
              {
                label: 'Compresser manuellement l’image avant chaque déploiement',
                outcome: 'La cause reste présente et le pipeline devient plus fragile.',
                correct: false,
              },
              {
                label: 'Changer de registre',
                outcome: 'Le registre ne réduit pas la taille de l’image.',
                correct: false,
              },
            ],
          },
        ],
        projectSteps: [
          { title: 'Conteneuriser le service', deliverable: 'Un Dockerfile multi-étapes qui construit et démarre l’application.' },
          { title: 'Isoler la configuration', deliverable: 'Les variables d’environnement et le réseau documentés.' },
          { title: 'Ajouter un healthcheck', deliverable: 'Une commande de vérification et un test manuel réussi.' },
          { title: 'Simuler une panne', deliverable: 'Un rapport de diagnostic avec logs et correction.' },
        ],
        roles: [
          { name: 'Développeur', mission: 'Fournit l’application et ses dépendances.' },
          { name: 'Ingénieur plateforme', mission: 'Garantit la reproductibilité et la sécurité de l’image.' },
          { name: 'Relecteur', mission: 'Vérifie le Dockerfile et le diagnostic de panne.' },
        ],
        peerCriteria: [
          'L’image se construit sans dépendance locale',
          'Le conteneur démarre avec la configuration fournie',
          'Le healthcheck est explicite',
          'Le diagnostic de panne est reproductible',
        ],
        sources: [
          {
            title: 'Vidéo — de l’application au conteneur',
            body: [
              'Chapitre 1 : ce que contient réellement une image Docker.',
              'Chapitre 2 : écriture guidée d’un Dockerfile multi-étapes.',
              'Chapitre 3 : démonstration de diagnostic avec docker logs et docker inspect.',
            ],
          },
          {
            title: 'Article — Dockerfile de production',
            body: [
              'Checklist : image de base figée, utilisateur non root, .dockerignore, cache des dépendances, healthcheck.',
              'Comparaison avant/après d’une image Node : 1,2 Go puis 180 Mo.',
              'Les cinq erreurs qui font échouer un déploiement.',
            ],
          },
          {
            title: 'Podcast — le conteneur qui redémarrait en boucle',
            body: [
              'Récit d’un incident : symptômes, hypothèses, commande de diagnostic, correction.',
              'Leçon retenue : toujours lire le code de sortie avant de modifier le Dockerfile.',
            ],
          },
        ],
      };
    case 'cicd':
      return {
        ...base,
        focus: 'Construire un pipeline fiable : build, tests, artefacts et déploiement contrôlé.',
        concepts: [
          {
            title: 'Déclencheurs et étapes',
            detail: 'Un pipeline doit être déclenché par un événement explicite et séparer build, test et déploiement.',
          },
          {
            title: 'Reproductibilité',
            detail: 'Les versions d’outils et les dépendances sont figées pour éviter les succès aléatoires.',
          },
          {
            title: 'Portes de qualité',
            detail: 'Les tests et l’analyse statique bloquent la fusion avant le déploiement, pas après.',
          },
          {
            title: 'Secrets et environnements',
            detail: 'Les secrets vivent dans le coffre du fournisseur, jamais dans le YAML du dépôt.',
          },
        ],
        commands: [
          'git push origin feature/pipeline',
          'gh workflow run ci.yml',
          'gh run watch',
          'gh run view --log-failed',
        ],
        pitfalls: [
          'Mettre les secrets en clair dans le workflow',
          'Déployer sans test bloquant',
          'Utiliser des versions flottantes d’actions',
        ],
        quiz: [
          {
            type: 'QCM',
            prompt: 'Quel ordre est le plus sain dans un pipeline ?',
            options: [
              'Build → tests → analyse → déploiement contrôlé',
              'Déploiement → tests → build',
              'Tests → déploiement → build',
              'Analyse → déploiement → build → tests',
            ],
            correctIndex: 0,
            explanation: 'Chaque étape doit valider la précédente avant de passer à la suivante.',
          },
          {
            type: 'TRUE_FALSE',
            prompt: 'Un secret peut être stocké directement dans le fichier YAML du workflow.',
            options: ['Vrai', 'Faux'],
            correctIndex: 1,
            explanation: 'Le secret doit être fourni par le coffre du fournisseur et référencé par variable.',
          },
          {
            type: 'TECHNICAL',
            prompt: 'Comment inspecter l’échec d’un job GitHub Actions ?',
            options: [
              'gh run view --log-failed',
              'gh repo delete',
              'git reset --hard',
              'docker rm -f',
            ],
            correctIndex: 0,
            explanation: 'La commande affiche les journaux du job en échec.',
          },
          {
            type: 'SCENARIO',
            prompt: 'Le pipeline passe en local mais échoue en CI. Quelle hypothèse examiner d’abord ?',
            options: [
              'Une différence de version ou de variable d’environnement',
              'Le clavier du développeur',
              'Le nombre de commits',
              'La couleur du terminal',
            ],
            correctIndex: 0,
            explanation: 'Les écarts d’environnement et de versions sont la première cause à vérifier.',
          },
        ],
        flashcards: [
          { front: 'Porte de qualité', back: 'Un test qui bloque la fusion avant le déploiement.' },
          { front: 'Secret', back: 'Une valeur fournie par le coffre, référencée par variable, jamais écrite dans le YAML.' },
          { front: 'Échec CI localement invisible', back: 'Comparer versions, variables et système de fichiers.' },
          { front: 'Artefact', back: 'Le résultat versionné du build, réutilisé par les étapes suivantes.' },
        ],
        code: {
          language: 'yaml',
          starter: `name: ci\non:\n  push:\n    branches: [main]\n# TODO : définir le job\njobs:\n  build:\n    runs-on: ubuntu-latest\n    steps:\n      # TODO : checkout, installation, tests\n`,
          expected: ['checkout', 'npm ci', 'npm test'],
          hints: [
            'Commencez par récupérer le dépôt avec actions/checkout.',
            'Installez les dépendances de façon reproductible.',
            'Les tests doivent bloquer la suite en cas d’échec.',
          ],
          solution:
            'steps:\n  - uses: actions/checkout@v4\n  - uses: actions/setup-node@v4\n    with:\n      node-version: 20\n  - run: npm ci\n  - run: npm test',
          criteria: [
            'Le déclencheur est explicite',
            'Les dépendances sont installées de façon reproductible',
            'Les tests bloquent le pipeline en cas d’échec',
          ],
        },
        decisions: [
          {
            prompt: 'Un test instable échoue une fois sur cinq. Que faites-vous ?',
            options: [
              {
                label: 'Isoler la cause et corriger le test avant de le rendre bloquant',
                outcome: 'Bonne décision : un test instable ne doit pas être ignoré ni masqué.',
                correct: true,
              },
              {
                label: 'Ajouter un redémarrage automatique du job',
                outcome: 'Le symptôme disparaît parfois, la cause reste.',
                correct: false,
              },
              {
                label: 'Supprimer le test',
                outcome: 'Vous perdez la protection et la confiance dans le pipeline.',
                correct: false,
              },
            ],
          },
        ],
        projectSteps: [
          { title: 'Cartographier le pipeline', deliverable: 'Un schéma des étapes et des déclencheurs.' },
          { title: 'Ajouter les tests bloquants', deliverable: 'Un job de test qui échoue volontairement puis passe.' },
          { title: 'Sécuriser les secrets', deliverable: 'Les variables référencées et documentées.' },
          { title: 'Préparer le déploiement', deliverable: 'Une étape de déploiement conditionnée par une approbation.' },
        ],
        roles: [
          { name: 'Développeur', mission: 'Fournit les tests et les versions.' },
          { name: 'Ingénieur CI', mission: 'Construit le pipeline et sécurise les secrets.' },
          { name: 'Relecteur', mission: 'Vérifie les portes de qualité et la traçabilité.' },
        ],
        peerCriteria: [
          'Le pipeline échoue quand un test échoue',
          'Aucun secret n’est visible dans le dépôt',
          'Les versions sont figées',
          'Le déploiement est conditionné par une validation',
        ],
        sources: [
          {
            title: 'Vidéo — pipeline de bout en bout',
            body: [
              'Chapitre 1 : déclencheur, job, étape et runner.',
              'Chapitre 2 : tests bloquants et artefacts.',
              'Chapitre 3 : secrets et déploiement contrôlé.',
            ],
          },
          {
            title: 'Article — les portes de qualité',
            body: [
              'Comment ordonner build, tests et analyse sans allonger inutilement le retour développeur.',
              'Exemples de workflows GitHub Actions commentés.',
            ],
          },
          {
            title: 'Podcast — un pipeline qui mentait',
            body: [
              'Un test instable masquait une régression réelle. Retour sur la décision de le rendre bloquant.',
            ],
          },
        ],
      };
    case 'kubernetes':
      return {
        ...base,
        focus: 'Déployer, superviser et diagnostiquer une application dans un cluster Kubernetes.',
        concepts: [
          { title: 'Objets essentiels', detail: 'Pod, Deployment, Service et ConfigMap : comprendre qui pilote quoi.' },
          { title: 'Réconciliation', detail: 'Le contrôleur compare l’état désiré et l’état observé, puis agit.' },
          { title: 'Diagnostic', detail: 'kubectl describe, get events et logs racontent l’histoire du pod.' },
          { title: 'Ressources', detail: 'Requests et limits protègent le cluster et évitent les évictions.' },
        ],
        commands: ['kubectl get pods', 'kubectl describe pod <nom>', 'kubectl logs <pod> --previous', 'kubectl get events --sort-by=.lastTimestamp'],
        pitfalls: ['Oublier les requests/limits', 'Ignorer les events', 'Modifier un pod au lieu du Deployment'],
        quiz: [
          {
            type: 'QCM',
            prompt: 'Quel objet maintient un nombre de pods et gère les redéploiements ?',
            options: ['Deployment', 'ConfigMap', 'Secret', 'Namespace'],
            correctIndex: 0,
            explanation: 'Le Deployment pilote les ReplicaSets et les pods associés.',
          },
          {
            type: 'TRUE_FALSE',
            prompt: 'Les events d’un pod sont visibles avec kubectl describe.',
            options: ['Vrai', 'Faux'],
            correctIndex: 0,
            explanation: 'La section Events de describe donne souvent la cause immédiate.',
          },
          {
            type: 'TECHNICAL',
            prompt: 'Un pod est en CrashLoopBackOff. Quelle commande montre les logs du conteneur précédent ?',
            options: ['kubectl logs <pod> --previous', 'kubectl get nodes', 'kubectl apply -f', 'kubectl scale'],
            correctIndex: 0,
            explanation: 'L’option --previous récupère les logs de l’instance qui a redémarré.',
          },
          {
            type: 'SCENARIO',
            prompt: 'Le pod reste en Pending. Quelle piste examiner en premier ?',
            options: [
              'Les ressources demandées et les contraintes de planification',
              'La couleur du dashboard',
              'Le nombre de commits',
              'Le nom du namespace',
            ],
            correctIndex: 0,
            explanation: 'Pending indique souvent un manque de ressources ou une contrainte non satisfaite.',
          },
        ],
        flashcards: [
          { front: 'CrashLoopBackOff', back: 'Le conteneur démarre puis échoue en boucle : lire les logs et le code de sortie.' },
          { front: 'Pending', back: 'Le pod n’est pas planifié : vérifier ressources et contraintes.' },
          { front: 'Deployment', back: 'Objet qui maintient le nombre de replicas et gère les mises à jour.' },
          { front: 'Requests vs limits', back: 'Requests réservent, limits plafonnent.' },
        ],
        code: {
          language: 'yaml',
          starter: `apiVersion: apps/v1\nkind: Deployment\nmetadata:\n  name: api\nspec:\n  replicas: 2\n  # TODO : sélecteur et modèle de pod\n`,
          expected: ['selector', 'template', 'containers', 'resources'],
          hints: ['Le selector doit correspondre aux labels du template.', 'Déclarez requests et limits.'],
          solution:
            'spec:\n  replicas: 2\n  selector:\n    matchLabels:\n      app: api\n  template:\n    metadata:\n      labels:\n        app: api\n    spec:\n      containers:\n        - name: api\n          image: api:1.0\n          resources:\n            requests:\n              cpu: 100m\n              memory: 128Mi',
          criteria: ['Le selector correspond aux labels', 'Le conteneur déclare une image versionnée', 'Les ressources sont définies'],
        },
        decisions: [
          {
            prompt: 'Un pod passe en CrashLoopBackOff. Que faites-vous d’abord ?',
            options: [
              { label: 'Lire les logs précédents et les events', outcome: 'Vous obtenez la cause probable.', correct: true },
              { label: 'Supprimer le Deployment', outcome: 'Vous perdez la configuration sans diagnostic.', correct: false },
              { label: 'Redémarrer le cluster', outcome: 'Action disproportionnée et non informative.', correct: false },
            ],
          },
        ],
        projectSteps: [
          { title: 'Déployer l’application', deliverable: 'Un Deployment et un Service fonctionnels.' },
          { title: 'Configurer les ressources', deliverable: 'Requests et limits justifiés.' },
          { title: 'Provoquer une panne', deliverable: 'Un diagnostic complet avec events et logs.' },
          { title: 'Corriger et vérifier', deliverable: 'La preuve que le pod reste stable.' },
        ],
        roles: [
          { name: 'Développeur', mission: 'Fournit l’image et la configuration applicative.' },
          { name: 'Ingénieur plateforme', mission: 'Garantit le déploiement et l’observabilité.' },
          { name: 'Relecteur', mission: 'Vérifie le diagnostic et la remédiation.' },
        ],
        peerCriteria: ['Le pod démarre durablement', 'Les ressources sont définies', 'Le diagnostic cite les events', 'La correction est reproductible'],
        sources: [
          { title: 'Vidéo — premiers pas dans un cluster', body: ['Pod, Deployment, Service : qui fait quoi.', 'Démonstration de kubectl describe et logs.', 'Exercice guidé de diagnostic.'] },
          { title: 'Article — lire un pod en erreur', body: ['Checklist Pending, ImagePullBackOff, CrashLoopBackOff.', 'Les commandes à enchaîner sans modifier le cluster.'] },
          { title: 'Podcast — l’incident du pod invisible', body: ['Un déploiement silencieux, un selector erroné, un service sans endpoint.'] },
        ],
      };
    case 'tests':
      return {
        ...base,
        focus: 'Écrire des tests utiles : rapides, lisibles et capables de détecter une régression réelle.',
        concepts: [
          { title: 'Pyramide des tests', detail: 'Beaucoup d’unitaires, quelques intégrations, peu d’end-to-end.' },
          { title: 'Un test = un comportement', detail: 'Le nom décrit le résultat attendu, pas l’implémentation.' },
          { title: 'Données de test', detail: 'Des données minimales et explicites rendent les échecs faciles à lire.' },
          { title: 'Couverture utile', detail: 'La couverture indique ce qui n’est pas testé, pas la qualité du test.' },
        ],
        commands: ['npm test', 'npm test -- --coverage', 'ng test --watch=false', 'npm test -- -t "nom du test"'],
        pitfalls: ['Tester l’implémentation plutôt que le comportement', 'Tests dépendants de l’ordre', 'Mocks trop complexes'],
        quiz: [
          {
            type: 'QCM',
            prompt: 'Que doit décrire le nom d’un test ?',
            options: ['Le comportement attendu', 'Le nom de la classe interne', 'Le numéro de ligne', 'La couleur du bouton'],
            correctIndex: 0,
            explanation: 'Un nom orienté comportement rend l’échec compréhensible.',
          },
          {
            type: 'TRUE_FALSE',
            prompt: 'Une couverture de 100 % garantit l’absence de bugs.',
            options: ['Vrai', 'Faux'],
            correctIndex: 1,
            explanation: 'La couverture mesure l’exécution, pas la pertinence des assertions.',
          },
          {
            type: 'TECHNICAL',
            prompt: 'Quel test est le plus fragile ?',
            options: [
              'Un test qui vérifie un détail d’implémentation privée',
              'Un test qui vérifie un résultat observable',
              'Un test qui utilise des données explicites',
              'Un test isolé et rapide',
            ],
            correctIndex: 0,
            explanation: 'Les détails internes changent souvent sans modifier le comportement.',
          },
          {
            type: 'SCENARIO',
            prompt: 'Un test échoue uniquement en CI. Que vérifiez-vous d’abord ?',
            options: ['Les versions et variables d’environnement', 'Le clavier', 'Le nombre de fichiers', 'La couleur du terminal'],
            correctIndex: 0,
            explanation: 'L’écart d’environnement est la cause la plus fréquente.',
          },
        ],
        flashcards: [
          { front: 'Test unitaire', back: 'Vérifie un comportement isolé, rapide et déterministe.' },
          { front: 'Test d’intégration', back: 'Vérifie la collaboration entre plusieurs composants.' },
          { front: 'Assertion utile', back: 'Compare un résultat observable à une attente explicite.' },
          { front: 'Test instable', back: 'Échoue sans changement de code : à corriger, pas à relancer.' },
        ],
        code: {
          language: 'typescript',
          starter: `describe('calculateTotal', () => {\n  it('…', () => {\n    // TODO : écrire un test de comportement\n  });\n});\n`,
          expected: ['expect', 'tobe', 'calculatetotal'],
          hints: ['Commencez par le résultat attendu.', 'Utilisez des données minimales.', 'Vérifiez un comportement, pas un détail interne.'],
          solution: `describe('calculateTotal', () => {\n  it('additionne les lignes et applique la remise', () => {\n    expect(calculateTotal([10, 20], 0.1)).toBe(27);\n  });\n\n  it('retourne 0 pour un panier vide', () => {\n    expect(calculateTotal([], 0.1)).toBe(0);\n  });\n});`,
          criteria: ['Le nom décrit le comportement', 'Les données sont explicites', 'Le test échoue si le comportement change'],
        },
        decisions: [
          {
            prompt: 'Un test échoue de façon intermittente. Que faites-vous ?',
            options: [
              { label: 'Reproduire et isoler la dépendance instable', outcome: 'Vous corrigez la cause au lieu de masquer l’échec.', correct: true },
              { label: 'Relancer le pipeline jusqu’au succès', outcome: 'La régression reste possible.', correct: false },
              { label: 'Supprimer le test', outcome: 'Vous perdez la protection.', correct: false },
            ],
          },
        ],
        projectSteps: [
          { title: 'Choisir un comportement', deliverable: 'Un test rouge qui échoue pour la bonne raison.' },
          { title: 'Implémenter', deliverable: 'Le test passe sans casser les autres.' },
          { title: 'Refactoriser', deliverable: 'Le code reste lisible et les tests inchangés.' },
          { title: 'Mesurer', deliverable: 'Un rapport de couverture commenté.' },
        ],
        roles: [
          { name: 'Développeur', mission: 'Écrit le test et l’implémentation.' },
          { name: 'Relecteur', mission: 'Vérifie la pertinence des assertions.' },
          { name: 'Mentor', mission: 'Aide à transformer un test fragile en test de comportement.' },
        ],
        peerCriteria: ['Le test échoue sans le comportement', 'Le nom est explicite', 'Les données sont minimales', 'Le test est déterministe'],
        sources: [
          { title: 'Vidéo — écrire un test qui sert', body: ['Rouge, vert, refactoriser.', 'Un test de comportement vs un test d’implémentation.', 'Démonstration sur un service Angular.'] },
          { title: 'Article — tests lisibles', body: ['Nommage, données de test et messages d’échec.', 'Trois anti-patrons fréquents.'] },
          { title: 'Podcast — le test qui ne servait à rien', body: ['Un test à 100 % de couverture qui validait un détail interne inutile.'] },
        ],
      };
    case 'angular':
      return {
        ...base,
        focus: 'Structurer une application Angular performante et maintenable.',
        concepts: [
          { title: 'Composants et signaux', detail: 'Séparer présentation et logique, propager l’état avec des signaux.' },
          { title: 'Change detection', detail: 'OnPush et signals limitent les recalculs inutiles.' },
          { title: 'Routage', detail: 'Lazy loading et guards protègent les zones sensibles.' },
          { title: 'Formulaires', detail: 'Choisir entre template et réactif selon la complexité.' },
        ],
        commands: ['ng serve', 'ng build', 'ng test --watch=false', 'ng generate component features/x'],
        pitfalls: ['Souscrire sans désabonnement', 'Logique métier dans le template', 'Composants trop gros'],
        quiz: [
          { type: 'QCM', prompt: 'Quel apport principal des signaux ?', options: ['Un état réactif explicite et traçable', 'La suppression des tests', 'Le remplacement du routeur', 'La suppression du CSS'], correctIndex: 0, explanation: 'Les signaux rendent les dépendances d’état explicites.' },
          { type: 'TRUE_FALSE', prompt: 'OnPush signifie que le composant ne sera jamais mis à jour.', options: ['Vrai', 'Faux'], correctIndex: 1, explanation: 'OnPush réduit les vérifications mais réagit aux entrées et signaux.' },
          { type: 'TECHNICAL', prompt: 'Quelle commande produit un build de production Angular ?', options: ['ng build', 'ng serve', 'ng lint', 'ng doc'], correctIndex: 0, explanation: 'ng build génère les artefacts, avec optimisation en configuration production.' },
          { type: 'SCENARIO', prompt: 'Une liste se met à jour lentement. Que faites-vous ?', options: ['Mesurer les recalculs et réduire les dépendances', 'Ajouter des setTimeout', 'Désactiver les tests', 'Augmenter la RAM'], correctIndex: 0, explanation: 'Le profilage guide l’optimisation.' },
        ],
        flashcards: [
          { front: 'Signal', back: 'Une valeur réactive qui notifie ses consommateurs.' },
          { front: 'OnPush', back: 'Stratégie de détection réduite, déclenchée par les entrées et signaux.' },
          { front: 'Lazy loading', back: 'Charger une zone fonctionnelle à la demande.' },
          { front: 'Computed', back: 'Une valeur dérivée, recalculée quand ses dépendances changent.' },
        ],
        code: {
          language: 'typescript',
          starter: `@Component({ selector: 'wa-counter', template: '…' })\nexport class Counter {\n  // TODO : état réactif et incrément\n}\n`,
          expected: ['signal', 'computed', 'increment'],
          hints: ['Déclarez un signal pour le compteur.', 'Exposez une valeur dérivée si nécessaire.'],
          solution: `readonly count = signal(0);\nreadonly doubled = computed(() => this.count() * 2);\nincrement(): void { this.count.update((value) => value + 1); }`,
          criteria: ['L’état est réactif', 'La dérivée est calculée', 'L’incrément est explicite'],
        },
        decisions: [
          { prompt: 'Un composant contient 600 lignes. Que faites-vous ?', options: [{ label: 'Extraire des composants et services par responsabilité', outcome: 'La complexité baisse et les tests deviennent ciblés.', correct: true }, { label: 'Ajouter des commentaires', outcome: 'La dette reste intacte.', correct: false }, { label: 'Le laisser tel quel', outcome: 'La maintenance continuera de ralentir.', correct: false }] },
        ],
        projectSteps: [
          { title: 'Découper la page', deliverable: 'Un composant conteneur et des composants de présentation.' },
          { title: 'Centraliser l’état', deliverable: 'Un service ou un store explicite.' },
          { title: 'Optimiser', deliverable: 'Une mesure avant/après des recalculs.' },
          { title: 'Tester', deliverable: 'Des tests de comportement sur les composants clés.' },
        ],
        roles: [
          { name: 'Développeur frontend', mission: 'Implémente les composants.' },
          { name: 'Relecteur', mission: 'Vérifie l’architecture et la performance.' },
          { name: 'Designer', mission: 'Valide l’accessibilité et la cohérence visuelle.' },
        ],
        peerCriteria: ['Les responsabilités sont séparées', 'L’état est explicite', 'Les tests couvrent le comportement', 'L’accessibilité de base est respectée'],
        sources: [
          { title: 'Vidéo — architecture Angular moderne', body: ['Signaux, composants standalone et lazy loading.', 'Démonstration de profilage.'] },
          { title: 'Article — performance Angular', body: ['OnPush, computed et virtualisation des listes.'] },
          { title: 'Podcast — refactoriser sans casser', body: ['Stratégie progressive et tests de non-régression.'] },
        ],
      };
    default:
      return base;
  }
}

function quizFor(
  knowledge: Knowledge,
  skillLabel: string,
  requestId: string,
  extra: boolean,
): QuizQuestion[] {
  const questions = extra
    ? [
        ...knowledge.quiz,
        {
          type: 'SCENARIO' as const,
          prompt: `Comment vérifieriez-vous que vous maîtrisez « ${skillLabel} » en situation réelle ?`,
          options: [
            'En réalisant une tâche nouvelle en autonomie puis en l’expliquant',
            'En relisant la fiche plusieurs fois',
            'En regardant une vidéo supplémentaire',
            'En mémorisant le vocabulaire',
          ],
          correctIndex: 0,
          explanation:
            'La preuve de maîtrise est une tâche réalisée et explicable, pas une consommation de contenu.',
        },
      ]
    : knowledge.quiz;

  return questions.map((question, index) => ({
    ...question,
    id: `${requestId}-q${index + 1}`,
    skill: skillLabel,
  }));
}

function step(
  requestId: string,
  order: number,
  kind: TrainingStep['kind'],
  title: string,
  instructions: string,
  durationMinutes: number,
): TrainingStep {
  return {
    id: `${requestId}-s${order}`,
    order,
    kind,
    title,
    instructions,
    body: [],
    durationMinutes,
    required: true,
  };
}

/**
 * Génère une formation complète et interactive dans le format choisi.
 * Le générateur est déterministe : mêmes entrées, même contenu.
 */
export function generateTraining(input: {
  requestId: string;
  format: ModuleFormat;
  skillCode: string;
  skillLabel: string;
  subject: string;
  levelFrom: number;
  levelTo: number;
}): GeneratedTraining {
  const knowledge = knowledgeFor(input.skillCode, input.skillLabel, input.subject);
  const { requestId } = input;
  const title = `${input.skillLabel} — ${input.subject}`;
  const objectives = [
    `Comprendre les notions clés de « ${input.subject} »`,
    `Appliquer la démarche sur un cas concret`,
    `Diagnostiquer une erreur fréquente`,
    `Prouver la maîtrise par une réalisation observable`,
  ];

  let steps: TrainingStep[] = [];
  let flashcards: TrainingFlashcard[] | undefined;
  let roles: ProjectRole[] | undefined;
  let peerReviewCriteria: string[] | undefined;

  switch (input.format) {
    case 'MULTIMEDIA': {
      const video = step(requestId, 1, 'VIDEO', 'Leçon vidéo guidée', 'Regardez les chapitres, puis répondez au quiz de compréhension.', 28);
      video.body = knowledge.sources[0]?.body ?? GENERIC_SOURCES[0].body;
      const article = step(requestId, 2, 'ARTICLE', 'Article et documentation', 'Lisez la fiche de référence et la checklist.', 20);
      article.body = knowledge.sources[1]?.body ?? GENERIC_SOURCES[1].body;
      const podcast = step(requestId, 3, 'PODCAST', 'Podcast — retour d’expérience', 'Écoutez le retour d’expérience et notez trois idées à réutiliser.', 15);
      podcast.body = knowledge.sources[2]?.body ?? GENERIC_SOURCES[2].body;
      const quiz = step(requestId, 4, 'QUIZ', 'Quiz de compréhension', 'Validez les notions essentielles avant de terminer.', 10);
      quiz.quiz = { questions: quizFor(knowledge, input.skillLabel, requestId, false) };
      steps = [video, article, podcast, quiz];
      break;
    }
    case 'INTERACTIVE': {
      const cards = step(requestId, 1, 'FLASHCARD', 'Cartes de révision', 'Retournez chaque carte et auto-évaluez-vous.', 12);
      flashcards = knowledge.flashcards.map((card) => ({ ...card }));
      const quiz = step(requestId, 2, 'QUIZ', 'Questionnaire interactif', 'QCM, vrai/faux, question technique et situation professionnelle.', 18);
      quiz.quiz = { questions: quizFor(knowledge, input.skillLabel, requestId, true) };
      steps = [cards, quiz];
      break;
    }
    case 'PRACTICAL': {
      const brief = step(requestId, 1, 'ARTICLE', 'Brief de l’exercice', 'Lisez le brief et les critères avant de coder.', 8);
      brief.body = knowledge.concepts.map((concept) => `${concept.title} — ${concept.detail}`);
      const code = step(requestId, 2, 'CODE', 'Exercice technique', 'Complétez l’exercice puis lancez la vérification.', 35);
      code.exercise = knowledge.code;
      const quiz = step(requestId, 3, 'QUIZ', 'Contrôle des acquis', 'Vérifiez que vous savez expliquer vos choix techniques.', 10);
      quiz.quiz = { questions: quizFor(knowledge, input.skillLabel, requestId, false) };
      steps = [brief, code, quiz];
      break;
    }
    case 'PROJECT': {
      const kickoff = step(requestId, 1, 'ARTICLE', 'Cadrage du projet', 'Lisez le contexte, puis complétez chaque étape avec un livrable.', 10);
      kickoff.body = [
        `Projet : ${input.subject}`,
        `Objectif : passer d’un niveau ${input.levelFrom} à ${input.levelTo} sur ${input.skillLabel}.`,
        'Chaque étape est validée par un livrable écrit.',
      ];
      steps = [
        kickoff,
        ...knowledge.projectSteps.map((projectStep, index) => {
          const project = step(requestId, index + 2, 'PROJECT', `Étape ${index + 1} — ${projectStep.title}`, projectStep.deliverable, 25);
          project.deliverable = projectStep.deliverable;
          project.body = [projectStep.deliverable];
          return project;
        }),
      ];
      break;
    }
    case 'SIMULATION': {
      steps = knowledge.decisions.map((decision, index) => {
        const simulation = step(requestId, index + 1, 'DECISION', `Scénario ${index + 1}`, 'Choisissez la réaction la plus pertinente et lisez la conséquence.', 15);
        simulation.decisions = [decision];
        return simulation;
      });
      if (!steps.length) {
        const fallback = step(requestId, 1, 'DECISION', 'Scénario', 'Choisissez la réaction la plus pertinente.', 15);
        fallback.decisions = knowledge.decisions;
        steps = [fallback];
      }
      break;
    }
    case 'AI_TUTORED': {
      const chat = step(requestId, 1, 'CHAT', 'Dialogue avec le tuteur IA', 'Posez vos questions, le tuteur adapte ses explications et vous propose un exercice.', 20);
      chat.body = [
        `Bonjour ! Je suis votre tuteur pour « ${input.subject} ».`,
        `Nous allons partir de votre niveau actuel (${input.levelFrom}/100) et viser ${input.levelTo}/100.`,
        'Dites-moi ce qui vous bloque, ou demandez un exemple concret.',
      ];
      const quiz = step(requestId, 2, 'QUIZ', 'Exercice sur mesure', 'Le tuteur génère un contrôle final à partir de vos échanges.', 15);
      quiz.quiz = { questions: quizFor(knowledge, input.skillLabel, requestId, true) };
      steps = [chat, quiz];
      break;
    }
    case 'COLLABORATIVE': {
      const kickoff = step(requestId, 1, 'ARTICLE', 'Projet commun', 'Lisez les rôles et choisissez le vôtre.', 8);
      kickoff.body = knowledge.roles.map((role) => `${role.name} — ${role.mission}`);
      roles = knowledge.roles;
      const tasks = step(requestId, 2, 'PEER', 'Production partagée', 'Complétez votre livrable et vérifiez les critères de revue.', 38);
      tasks.body = knowledge.projectSteps.map((projectStep) => `${projectStep.title} : ${projectStep.deliverable}`);
      tasks.deliverable = 'Livrable d’équipe et note de transmission.';
      peerReviewCriteria = knowledge.peerCriteria;
      const quiz = step(requestId, 3, 'QUIZ', 'Contrôle individuel', 'Chaque membre valide les acquis individuellement.', 10);
      quiz.quiz = { questions: quizFor(knowledge, input.skillLabel, requestId, false) };
      steps = [kickoff, tasks, quiz];
      break;
    }
  }

  return {
    id: `training-${requestId}`,
    requestId,
    format: input.format,
    title,
    summary: `Formation ${FORMAT_LABELS[input.format].toLowerCase()} générée à partir de vos données : ${knowledge.focus}`,
    skillLabel: input.skillLabel,
    levelFrom: input.levelFrom,
    levelTo: input.levelTo,
    durationMinutes: steps.reduce((sum, item) => sum + item.durationMinutes, 0),
    objectives,
    steps,
    flashcards,
    roles,
    peerReviewCriteria,
    generatedAt: new Date().toISOString(),
  };
}

export type { Knowledge };
