class DomainResolver:
    def __init__(self, catalog):
        catalog = catalog or {}
        self.domains = {
            key.lower(): value for key, value in catalog.get("domains", {}).items()
        }

    def resolve(self, text):
        text = (text or "").lower()
        if not text:
            return None

        best = None
        best_length = 0
        for domain, spec in self.domains.items():
            if domain in text and len(domain) > best_length:
                best = spec
                best_length = len(domain)
        return best
