from ..catalogs import CatalogSet
from .documents import DocumentResolver
from .domains import DomainResolver
from .programming import ProgrammingLanguageDetector
from .roles import RoleResolver
from .tasks import TaskInferrer
from .tools import ToolResolver


class Enricher:
    def __init__(self, config):
        self.collect = config.get("collect", {}) or {}
        self.privacy = config.get("privacy", {}) or {}
        self.exclude_domains = {
            str(domain).lower()
            for domain in self.privacy.get("exclude_domains", []) or []
        }
        catalogs = CatalogSet(config.get("catalogs"))

        self.tools = ToolResolver(catalogs.apps)
        self.documents = DocumentResolver(catalogs.documents)
        self.domains = DomainResolver(catalogs.domains)
        self.tasks = TaskInferrer()
        self.roles = RoleResolver(catalogs.roles)
        self.programming = ProgrammingLanguageDetector()

    def enrich_window(self, app, title, declared_role):
        if self.collect.get("tools", True):
            tool_info = self.tools.resolve(app)
        else:
            fallback = app or "unknown"
            if fallback.lower().endswith(".exe"):
                fallback = fallback[:-4]
            tool_info = {
                "tool": fallback,
                "vendor": None,
                "domains": [],
                "category": "other",
                "matched": False,
            }

        document = self.documents.resolve(
            title,
            app,
            include_file=self.collect.get("files", True),
            hash_paths=self.privacy.get("hash_paths", True),
        )
        if not self.collect.get("documents", True):
            file_info = document.get("file")
            document = {"type": None, "extension": None}
            if file_info:
                document["file"] = file_info

        domains = list(tool_info["domains"])

        if self.collect.get("domains", False):
            web = self.domains.resolve(title)
            if web:
                if web.get("tool") and not tool_info["matched"]:
                    tool_info["tool"] = web["tool"]
                    tool_info["vendor"] = web.get("vendor")
                    tool_info["matched"] = True
                for domain in web.get("domains", []):
                    if domain not in domains:
                        domains.append(domain)

        if self.exclude_domains:
            domains = [
                domain
                for domain in domains
                if domain.lower() not in self.exclude_domains
            ]

        programming_language = None
        if self.collect.get("programming_language", True):
            programming_language = self.programming.detect(title, app)

        tasks = []
        if self.collect.get("tasks", True):
            tasks = self.tasks.infer(
                domains,
                document.get("type"),
                programming_language,
                tool_info["tool"],
            )

        role = self.roles.resolve(declared_role, domains)

        if tool_info["matched"]:
            confidence = 0.9
        elif document.get("type"):
            confidence = 0.5
        else:
            confidence = 0.3

        return {
            "tool": tool_info["tool"],
            "vendor": tool_info["vendor"],
            "category": tool_info["category"],
            "domains": domains,
            "document": document,
            "programming_language": programming_language,
            "tasks": tasks,
            "role": role,
            "confidence": confidence,
        }

    def role_for_idle(self, declared_role):
        return self.roles.resolve(declared_role, [])
