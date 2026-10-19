import re

_EXTENSION_PATTERN = re.compile(r"\.([A-Za-z0-9]{1,10})\b")


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

    def resolve(self, title, app_name):
        title = title or ""
        app = (app_name or "").lower()

        for candidate in _EXTENSION_PATTERN.findall(title):
            extension = candidate.lower()
            document_type = self.extensions.get(extension)
            if document_type:
                return {"type": document_type, "extension": extension}

        for keyword, document_type in self.app_defaults.items():
            if keyword in app:
                return {"type": document_type, "extension": None}

        return {"type": None, "extension": None}
