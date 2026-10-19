def _stem(app_name):
    name = app_name or "unknown"
    lower = name.lower()
    if lower.endswith(".exe"):
        return name[:-4]
    return name


class ToolResolver:
    def __init__(self, catalog):
        catalog = catalog or {}
        self.exact = {
            key.lower(): value for key, value in catalog.get("exact", {}).items()
        }
        self.patterns = catalog.get("patterns", [])

    def resolve(self, app_name):
        key = (app_name or "").lower()

        entry = self.exact.get(key)

        if entry is None and key:
            best = None
            best_length = 0
            for pattern in self.patterns:
                keyword = (pattern.get("contains") or "").lower()
                if keyword and keyword in key and len(keyword) > best_length:
                    best = pattern
                    best_length = len(keyword)
            entry = best

        if entry is not None:
            domains = list(entry.get("domains", []))
            category = entry.get("category") or (domains[0] if domains else "other")
            return {
                "tool": entry.get("tool") or _stem(app_name),
                "vendor": entry.get("vendor"),
                "domains": domains,
                "category": category,
                "matched": True,
            }

        return {
            "tool": _stem(app_name),
            "vendor": None,
            "domains": [],
            "category": "other",
            "matched": False,
        }
