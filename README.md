# WorkAdapt Agent

Agent de collecte d'activité **autonome et multi-plateforme** (Windows, macOS ;
Linux prévu). Aucune dépendance à ActivityWatch : l'agent lit directement l'OS.

## Démarrage (Windows)

```powershell
python .\workadapt_agent.py
```

Aucune dépendance externe (stdlib Python uniquement).

## Configuration

Tous les réglages sont dans `config.json` (aucune donnée sensible) :

- `poll_interval_seconds` : fréquence d'échantillonnage (défaut 1 s)
- `idle_threshold_seconds` : seuil d'inactivité « afk » (défaut 180 s)
- `output_file` : fichier d'événements JSONL (`data/workadapt_events_v3.jsonl`)
- `database_file` : base SQLite de déduplication
- `catalogs` : dossier des catalogues métier (`catalogs/`)
- `role` : profil **déclaré** (`development`, `accounting`, `audit`, `hr`, `sales`, `support`, `design`, `marketing`, `management`, `operations`, `legal`, `general`)
- `collect` : active/désactive chaque enrichissement
  (`tools`, `documents`, `tasks`, `domains`, `files`, `programming_language`…)
- `privacy` : `redact_titles`, `exclude_apps`, `exclude_domains`, `hash_paths`,
  `retention_days`, `keystroke_content` (toujours `false`)

## Catalogues (éditables sans code)

- `catalogs/apps.json` : app → outil, éditeur, **domaines métier multiples**
- `catalogs/documents.json` : extension → type de document
- `catalogs/domains.json` : domaine web → outil SaaS / domaine (opt-in)
- `catalogs/roles.json` : rôle → domaines attendus

Ajouter un métier ou un outil = éditer un JSON, pas le code.

## Données collectées

- `window_activity` : application, outil, éditeur, domaines métier, catégorie,
  durée, statut actif/inactif
- `document` : type + extension (ex. `spreadsheet` / `xlsx`)
- `work_context` : domaines, tâches inférées (`coding`, `data_analysis`,
  `communicating`, `meeting`…), confiance
- `programming_language` : déduit du titre / fichier (`main.py` → Python)
- `role` : rôle déclaré + rôle inféré + confiance
- `idle_status` : périodes actives / inactives
- `data/workadapt_summary_daily.json` : temps par outil / domaine / tâche /
  langage, généré à l'arrêt

Les métriques clavier/souris et les domaines navigateur sont **opt-in** et
n'exposent jamais le contenu.

## Structure

```
workadapt_agent.py           point d'entrée
config.json                  configuration
catalogs/                    apps, documents, domains, roles (JSON)
workadapt/
  config.py                  chargement config
  core.py                    boucle de l'agent
  summary.py                 résumé quotidien
  platform/                  abstraction OS (base, win32, macos, linux)
  collectors/activity.py     segments fenêtre + inactivité
  enrichers/
    pipeline.py              orchestrateur d'enrichissement
    tools.py                 app → outil / domaines
    documents.py             extension → type de document
    domains.py               domaine web → SaaS (opt-in)
    tasks.py                 inférence de tâche
    roles.py                 rôle déclaré + inféré
    programming.py           langage de programmation
  storage/store.py           SQLite (dédup) + JSONL
data/                        sorties (ignorées par Git)
```

## Confidentialité

Conçu pour ne pas capturer le contenu : pas de frappes, pas de texte, pas de
captures. Titres réductibles, apps et domaines exclus configurables. À déployer
avec information et consentement de l'employé (RGPD).
