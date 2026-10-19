import re

EXTENSION_LANGUAGES = {
    "py": "Python",
    "pyw": "Python",
    "ipynb": "Python (Jupyter)",
    "js": "JavaScript",
    "mjs": "JavaScript",
    "cjs": "JavaScript",
    "jsx": "JavaScript (React)",
    "ts": "TypeScript",
    "tsx": "TypeScript (React)",
    "java": "Java",
    "kt": "Kotlin",
    "kts": "Kotlin",
    "cs": "C#",
    "c": "C",
    "h": "C/C++",
    "cc": "C++",
    "cpp": "C++",
    "cxx": "C++",
    "hpp": "C++",
    "hh": "C++",
    "go": "Go",
    "rs": "Rust",
    "rb": "Ruby",
    "php": "PHP",
    "swift": "Swift",
    "m": "Objective-C",
    "mm": "Objective-C++",
    "sql": "SQL",
    "sh": "Shell",
    "bash": "Shell",
    "zsh": "Shell",
    "ps1": "PowerShell",
    "bat": "Batch",
    "cmd": "Batch",
    "html": "HTML",
    "htm": "HTML",
    "css": "CSS",
    "scss": "SCSS",
    "sass": "Sass",
    "less": "Less",
    "vue": "Vue",
    "svelte": "Svelte",
    "r": "R",
    "scala": "Scala",
    "dart": "Dart",
    "lua": "Lua",
    "pl": "Perl",
    "ex": "Elixir",
    "exs": "Elixir",
    "erl": "Erlang",
    "clj": "Clojure",
    "hs": "Haskell",
    "jl": "Julia",
    "sol": "Solidity",
    "asm": "Assembly",
    "vhd": "VHDL",
    "v": "V",
}

APP_FALLBACKS = {
    "rstudio": "R",
    "matlab": "MATLAB",
    "jupyter": "Python (Jupyter)",
    "ssms": "SQL",
    "sqldeveloper": "SQL",
    "android studio": "Kotlin/Java",
    "xcode": "Swift/Objective-C",
    "visual studio": "C#/C++",
}

_EXTENSION_PATTERN = re.compile(r"\.([A-Za-z0-9]{1,10})\b")


class ProgrammingLanguageDetector:
    def detect(self, title, app=""):
        title = title or ""
        app = (app or "").lower()

        for candidate in _EXTENSION_PATTERN.findall(title):
            language = EXTENSION_LANGUAGES.get(candidate.lower())
            if language:
                return language

        for keyword, language in APP_FALLBACKS.items():
            if keyword in app:
                return language

        return None
