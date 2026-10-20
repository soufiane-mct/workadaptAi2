# WorkAdapt Agent

Agent de collecte d'activité **autonome et multi-plateforme**. Aucune dépendance
à ActivityWatch : l'agent lit directement l'OS. Windows est pleinement
implémenté ; macOS est best-effort (PyObjC + permissions), Linux est un stub.

## Démarrage (Windows)

```powershell
python .\workadapt_agent.py
```

Aucune dépendance externe pour l'agent (stdlib Python uniquement).

Résumé hors ligne :

```powershell
python .\workadapt_agent.py --summary
```

## Configuration

Tout est dans `config.json` :

- `poll_interval_seconds` : fréquence d'échantillonnage (défaut 1 s)
- `idle_threshold_seconds` : seuil d'inactivité « afk » (défaut 180 s)
- `output_file` / `database_file` / `log_file` : sorties (`data/`)
- `catalogs` : dossier des catalogues métier (`catalogs/`)
- `role` : profil **déclaré** (`development`, `accounting`, `audit`, `hr`,
  `sales`, `support`, `design`, `marketing`, `management`, `operations`,
  `legal`, `general`)
- `collect` : `window`, `idle`, `session`, `tools`, `documents`, `tasks`,
  `domains` (opt-in), `files`, `programming_language`,
  `keyboard_metrics` / `mouse_metrics` (opt-in, agrégats seulement)
- `privacy` : voir ci-dessous
- `sync` : upload vers un serveur (voir plus bas)

### Confidentialité (`privacy`)

- `redact_titles` : remplace le titre par `[redacted]`
- `exclude_apps` : apps ignorées (voir `drop_excluded_apps`)
- `drop_excluded_apps` : `true` = aucun événement ; `false` = app anonymisée
  (`[excluded]`, sans titre ni enrichissement)
- `exclude_domains` : retire des domaines des événements
- `hash_paths` : hache le nom de fichier (SHA-256 tronqué) ; sinon nom brut
- `rotate_daily` : un fichier JSONL par jour (`workadapt_events_v3-YYYY-MM-DD`)
- `retention_days` : purge auto des lignes SQLite et des fichiers anciens
- `keystroke_content` : toujours `false` — jamais de contenu

Aucune frappe, aucun texte, aucune capture d'écran, aucun presse-papiers.

## Catalogues (éditables sans code)

- `catalogs/apps.json` : app → outil, éditeur, **domaines métier multiples**
- `catalogs/documents.json` : extension → type de document
- `catalogs/domains.json` : domaine web → outil SaaS / domaine (opt-in)
- `catalogs/roles.json` : rôle → domaines attendus

## Données collectées

Chaque `window_activity` contient : app, outil, éditeur, domaines, catégorie,
durée, statut, `document` (type, extension, nom haché), `work_context`
(domaines, tâches, confiance), `programming_language`, `role` (déclaré, inféré,
confiance), `context` (OS, écrans, session) et, si activé, `input`
(clés/clics/mouvements agrégés).

`idle_status` enregistre les périodes actives/inactives. Le résumé quotidien
(`data/workadapt_summary_daily.json`) agrège temps par outil, domaine, tâche,
rôle et langage.

## Sync vers un serveur

Dans `config.json` :

```json
"sync": {
  "enabled": true,
  "endpoint": "http://127.0.0.1:8787/api/v1/events",
  "batch_size": 500,
  "batch_seconds": 60,
  "timeout_seconds": 20,
  "verify_tls": true
}
```

Le token se met dans la variable d'environnement `WORKADAPT_TOKEN` (jamais dans
le fichier de config). L'upload reprend après coupure via un curseur SQLite ;
les doublons sont éliminés côté serveur par `event_id`.

Serveur d'ingestion (stdlib, zéro dépendance) :

```powershell
python -m server.app --host 127.0.0.1 --port 8787
```

Endpoints :

- `GET /` ou `/dashboard` — tableau de bord HTML (`.?token=...` si auth)
- `POST /api/v1/events` — `{"schema_version": 3, "events": [...]}`
- `GET /api/v1/summary?day=YYYY-MM-DD`
- `GET /api/v1/events?day=YYYY-MM-DD`
- `GET /health`

## Exécution autonome (Windows)

```powershell
# 1) Construire l'exécutable (PyInstaller)
powershell -ExecutionPolicy Bypass -File .\scripts\build_windows.ps1

# 2) Installer au démarrage de session (Tâche planifiée)
powershell -ExecutionPolicy Bypass -File .\scripts\install_windows.ps1

# Désinstaller
powershell -ExecutionPolicy Bypass -File .\scripts\uninstall_windows.ps1
```

Placez `config.json` et `catalogs/` à côté de l'exécutable pour personnaliser.
Les données et logs sont écrits dans `data/` à côté de l'exécutable.

## Tests

```powershell
python -m pip install -r requirements-dev.txt
python -m pytest
```

## Structure

```
workadapt_agent.py           point d'entrée
config.json                  configuration
catalogs/                    apps, documents, domains, roles (JSON)
scripts/                     build / install / uninstall Windows
server/app.py                serveur d'ingestion + résumé
workadapt/
  config.py                  chargement config (relatif à l'exe si figé)
  core.py                    boucle de l'agent
  logging_setup.py           logs rotatifs (data/agent.log)
  summary.py                 agrégation / résumé quotidien
  platform/                  abstraction OS (base, win32, macos, linux)
  platform/input_win32.py    hooks clavier/souris (opt-in)
  collectors/activity.py     segments fenêtre + inactivité
  enrichers/                 outils, documents, domaines, tâches, rôles, langage
  storage/store.py           SQLite (dédup, curseur sync) + JSONL rotatif
  sync/uploader.py           upload par lots avec reprise
tests/                       suite pytest
data/                        sorties (ignorées par Git)
```

## Confidentialité & conformité

Conçu pour ne pas capturer le contenu. À déployer avec information et
consentement de l'employé (RGPD) ; la rétention est configurable et appliquée.
