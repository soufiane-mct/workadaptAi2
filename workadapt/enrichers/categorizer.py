DEFAULT_TAXONOMY = {
    "development": [
        "code", "pycharm", "intellij", "webstorm", "eclipse", "devenv",
        "antigravity", "idea", "git", "powershell", "cmd", "terminal",
        "bash", "windowsterminal",
    ],
    "browser": [
        "chrome", "firefox", "msedge", "brave", "opera", "safari", "edge",
    ],
    "communication": [
        "teams", "slack", "discord", "zoom", "outlook", "thunderbird",
        "skype", "meet",
    ],
    "office": [
        "winword", "word", "excel", "powerpnt", "powerpoint", "libreoffice",
        "notion", "onenote", "acrobat", "acrord32",
    ],
    "finance": ["sage", "sap", "quickbooks", "compta", "erp", "ciel"],
    "audit": ["acl", "idea", "caseware", "teamate"],
    "hr": ["sirh", "payfit", "workday", "talentsoft", "lucca"],
    "file_management": ["explorer", "finder", "filemanager", "totalcmd", "dolphin"],
    "media": ["vlc", "spotify", "photos", "mediaplayer", "music", "zoomplayer"],
    "system": ["taskmgr", "settings", "control", "systemsettings", "lockapp"],
}


class Categorizer:
    def __init__(self, taxonomy=None):
        self.taxonomy = taxonomy or DEFAULT_TAXONOMY

    def classify(self, app_name):
        app = (app_name or "").lower()
        if not app or app == "unknown":
            return "unknown"

        for category, keywords in self.taxonomy.items():
            if any(keyword in app for keyword in keywords):
                return category
        return "other"
