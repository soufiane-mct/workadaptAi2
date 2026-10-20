import json
import sys
from pathlib import Path

if getattr(sys, "frozen", False):
    PROJECT_ROOT = Path(sys.executable).resolve().parent
    BUNDLE_DIR = Path(getattr(sys, "_MEIPASS", PROJECT_ROOT))
else:
    PROJECT_ROOT = Path(__file__).resolve().parent.parent
    BUNDLE_DIR = PROJECT_ROOT

DEFAULT_CONFIG_PATH = PROJECT_ROOT / "config.json"
if not DEFAULT_CONFIG_PATH.exists() and (BUNDLE_DIR / "config.json").exists():
    DEFAULT_CONFIG_PATH = BUNDLE_DIR / "config.json"

DEFAULTS = {
    "schema_version": 3,
    "poll_interval_seconds": 1,
    "idle_threshold_seconds": 180,
    "output_file": "data/workadapt_events_v3.jsonl",
    "database_file": "data/agent_state.db",
    "log_file": "data/agent.log",
    "role": "general",
    "device_name": "",
    "catalogs": "catalogs",
    "collect": {
        "window": True,
        "idle": True,
        "session": True,
        "keyboard_metrics": False,
        "mouse_metrics": False,
        "tools": True,
        "documents": True,
        "tasks": True,
        "domains": False,
        "files": True,
        "programming_language": True,
        "file_metadata": False,
    },
    "privacy": {
        "redact_titles": False,
        "exclude_apps": [],
        "exclude_domains": [],
        "drop_excluded_apps": True,
        "hash_paths": True,
        "rotate_daily": True,
        "retention_days": 30,
        "keystroke_content": False,
    },
    "catalogs": "catalogs",
    "sync": {
        "enabled": False,
        "endpoint": "",
        "batch_size": 500,
        "batch_seconds": 60,
        "timeout_seconds": 20,
        "verify_tls": True,
    },
}


def _deep_merge(base, override):
    result = dict(base)
    for key, value in override.items():
        if (
            key in result
            and isinstance(result[key], dict)
            and isinstance(value, dict)
        ):
            result[key] = _deep_merge(result[key], value)
        else:
            result[key] = value
    return result


class Config:
    def __init__(self, data, path=None):
        self._data = data
        self.path = path

    def get(self, key, default=None):
        return self._data.get(key, default)

    def __getitem__(self, key):
        return self._data[key]

    def __contains__(self, key):
        return key in self._data

    @property
    def data(self):
        return self._data

    @property
    def output_path(self):
        return self._resolve(self._data["output_file"])

    @property
    def database_path(self):
        return self._resolve(self._data["database_file"])

    @property
    def log_path(self):
        return self._resolve(self._data["log_file"])

    @staticmethod
    def _resolve(value):
        path = Path(value)
        return path if path.is_absolute() else PROJECT_ROOT / path


def load_config(path=None):
    path = Path(path) if path else DEFAULT_CONFIG_PATH

    loaded = {}
    if path.exists():
        with path.open("r", encoding="utf-8-sig") as file:
            text = file.read().strip()
            if text:
                loaded = json.loads(text)

    merged = _deep_merge(DEFAULTS, loaded)
    return Config(merged, path)
