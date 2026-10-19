from dataclasses import dataclass, field


@dataclass
class WindowInfo:
    app: str = "unknown"
    title: str = ""
    pid: int | None = None
    bundle_id: str | None = None
    version: str | None = None
    extra: dict = field(default_factory=dict)


class PlatformProbe:
    name = "base"

    def __init__(self, config=None):
        self.config = config

    def get_os_name(self):
        return "unknown"

    def get_foreground_window(self):
        raise NotImplementedError

    def get_idle_seconds(self):
        raise NotImplementedError

    def get_keyboard_layout(self):
        return None

    def get_system_language(self):
        return None

    def get_screen_count(self):
        return None

    def is_session_locked(self):
        return None
