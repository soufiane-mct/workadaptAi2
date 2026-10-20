import json
from pathlib import Path

from ..config import BUNDLE_DIR, PROJECT_ROOT


def _load_json(path):
    path = Path(path)
    if not path.exists():
        return {}
    try:
        with path.open("r", encoding="utf-8-sig") as file:
            text = file.read().strip()
            return json.loads(text) if text else {}
    except (OSError, json.JSONDecodeError):
        return {}


class CatalogSet:
    def __init__(self, directory=None):
        base = Path(directory) if directory else PROJECT_ROOT / "catalogs"
        if not base.is_absolute():
            base = PROJECT_ROOT / base
        if not base.exists() and (BUNDLE_DIR / "catalogs").exists():
            base = BUNDLE_DIR / "catalogs"

        self.directory = base
        self.apps = _load_json(base / "apps.json")
        self.documents = _load_json(base / "documents.json")
        self.domains = _load_json(base / "domains.json")
        self.roles = _load_json(base / "roles.json")
