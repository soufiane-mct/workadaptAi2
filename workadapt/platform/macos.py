import sys

from .base import PlatformProbe, WindowInfo

_MISSING = (
    "macOS support requires PyObjC. Install with:\n"
    "  pip install pyobjc-framework-Cocoa pyobjc-framework-Quartz"
)


def _require_darwin():
    if sys.platform != "darwin":
        raise RuntimeError("macOS probe loaded on a non-macOS system")


class MacOSProbe(PlatformProbe):
    name = "macos"

    def get_os_name(self):
        return "macos"

    def get_foreground_window(self):
        _require_darwin()
        try:
            from AppKit import NSWorkspace
        except ImportError as error:
            raise RuntimeError(_MISSING) from error

        app = NSWorkspace.sharedWorkspace().frontmostApplication()
        if app is None:
            return None

        app_name = app.localizedName() or "unknown"
        bundle_id = app.bundleIdentifier()

        return WindowInfo(
            app=app_name,
            title=self._window_title(app.processIdentifier()) or app_name,
            pid=app.processIdentifier() or None,
            bundle_id=bundle_id,
        )

    def _window_title(self, pid):
        try:
            from Quartz import (
                CGWindowListCopyWindowInfo,
                kCGWindowListOptionOnScreenOnly,
                kCGWindowListExcludeDesktopElements,
                kCGNullWindowID,
            )
        except ImportError:
            return None

        options = kCGWindowListOptionOnScreenOnly | kCGWindowListExcludeDesktopElements
        windows = CGWindowListCopyWindowInfo(options, kCGNullWindowID) or []
        for window in windows:
            if window.get("kCGWindowOwnerPID") == pid:
                title = window.get("kCGWindowName")
                if title:
                    return title
        return None

    def get_idle_seconds(self):
        _require_darwin()
        try:
            from Quartz import (
                CGEventSourceSecondsSinceLastEventType,
                kCGEventSourceStateCombinedSessionState,
                kCGAnyInputEventType,
            )
        except ImportError as error:
            raise RuntimeError(_MISSING) from error

        return float(
            CGEventSourceSecondsSinceLastEventType(
                kCGEventSourceStateCombinedSessionState, kCGAnyInputEventType
            )
        )

    def get_keyboard_layout(self):
        return None

    def get_system_language(self):
        try:
            from Foundation import NSLocale
        except ImportError:
            return None
        language = NSLocale.currentLocale().objectForKey_("kCFLocaleLanguageCode")
        return str(language) if language else None

    def get_screen_count(self):
        try:
            from AppKit import NSScreen
        except ImportError:
            return None
        return len(NSScreen.screens())

    def is_session_locked(self):
        try:
            from Quartz import CGSessionCopyCurrentDictionary
        except ImportError:
            return None
        session = CGSessionCopyCurrentDictionary() or {}
        value = session.get("CGSSessionScreenIsLocked")
        return bool(value) if value is not None else None
