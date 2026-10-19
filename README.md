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
- `role` : profil métier (`development`, `finance`, `audit`, `hr`, `general`…)
- `collect` : active/désactive chaque collecteur
- `privacy` : `redact_titles`, `exclude_apps`, `keystroke_content` (toujours `false`)
- `taxonomy` : mapping app → catégorie métier

## Données collectées

- `window_activity` : application active, titre (réductible), catégorie, durée
- `idle_status` : périodes actives / inactives
- enrichissements : langue système + layout clavier, contexte (OS, écrans, session)

Les métriques clavier/souris (agrégats, **jamais le contenu**) sont prévues mais
désactivées par défaut.

## Structure

```
workadapt_agent.py         point d'entrée
config.json                configuration
workadapt/
  config.py                chargement config
  core.py                  boucle de l'agent
  platform/                abstraction OS (base, win32, macos, linux)
  collectors/activity.py   segments fenêtre + inactivité
  enrichers/categorizer.py catégorisation métier
  storage/store.py         SQLite (dédup) + JSONL
data/                      sorties (ignorées par Git)
```

## Confidentialité

Conçu pour ne pas capturer le contenu : pas de frappes, pas de texte. Titres
redactables et apps exclues configurables. À déployer avec information et
consentement de l'employé (RGPD).
