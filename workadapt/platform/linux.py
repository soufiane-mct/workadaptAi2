from .base import PlatformProbe, WindowInfo


class LinuxProbe(PlatformProbe):
    name = "linux"

    def get_os_name(self):
        return "linux"

    def get_foreground_window(self):
        raise NotImplementedError(
            "Linux support is not implemented yet (planned: X11/EWMH)."
        )

    def get_idle_seconds(self):
        raise NotImplementedError(
            "Linux support is not implemented yet (planned: XScreenSaver)."
        )
