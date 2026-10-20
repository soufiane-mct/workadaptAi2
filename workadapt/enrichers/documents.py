import hashlib
import re

_EXTENSION_PATTERN = re.compile(r"\.([A-Za-z0-9]{1,10})\b")
_FILE_PATTERN = re.compile(r"([A-Za-z0-9][A-Za-z0-9 _\-\.]{0,100}\.[A-Za-z0-9]{2,10})\b")


def _extract_file_name(title):
    best = None
    for match in _FILE_PATTERN.finditer(title or ""):
        token = match.group(1).strip()
        base, _, extension = token.rpartition(".")
        if not base or not extension or extension.isdigit() or base.isdigit():
            continue
        if best is None or len(token) > len(best):
            best = token
    return best


def _hash_name(name):
    return hashlib.sha256(name.lower().encode("utf-8")).hexdigest()[:16]


class DocumentResolver:
    def __init__(self, catalog):
        catalog = catalog or {}
        self.extensions = {
            key.lower(): value for key, value in catalog.get("extensions", {}).items()
        }
        self.app_defaults = {
            key.lower(): value
            for key, value in catalog.get("app_defaults", {}).items()
        }

    def resolve(self, title, app_name, include_file=True, hash_paths=True):
        title = title or ""
        app = (app_name or "").lower()

        document = {"type": None, "extension": None}
        for candidate in _EXTENSION_PATTERN.findall(title):
            extension = candidate.lower()
            document_type = self.extensions.get(extension)
            if document_type:
                document = {"type": document_type, "extension": extension}
                break

        if document["type"] is None:
            for keyword, document_type in self.app_defaults.items():
                if keyword in app:
                    document = {"type": document_type, "extension": None}
                    break

        if include_file:
            name = _extract_file_name(title)
            if name:
                document["file"] = (
                    {"name_hash": _hash_name(name)}
                    if hash_paths
                    else {"name": name}
                )

        return document
