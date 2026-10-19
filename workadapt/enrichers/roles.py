class RoleResolver:
    def __init__(self, catalog):
        catalog = catalog or {}
        self.roles = catalog.get("roles", {})

    def resolve(self, declared, domains):
        declared = declared or "general"
        observed = set(domains or [])

        if not observed:
            return {"declared": declared, "inferred": declared, "confidence": 0.2}

        scores = {}
        for role, spec in self.roles.items():
            tags = set(spec.get("domains", []))
            scores[role] = len(observed & tags)

        if declared in scores:
            scores[declared] += 1

        best_role = None
        best_score = 0
        for role, score in scores.items():
            if score > best_score or (
                score == best_score and score > 0 and role == declared
            ):
                best_role = role
                best_score = score

        if best_role and best_score > 0:
            confidence = min(0.9, 0.5 + 0.1 * best_score)
            return {
                "declared": declared,
                "inferred": best_role,
                "confidence": round(confidence, 2),
            }

        return {
            "declared": declared,
            "inferred": declared,
            "confidence": 0.4 if observed else 0.2,
        }
