import hashlib
import json
from datetime import datetime, timezone


def utc_now():
    return datetime.now(timezone.utc)


def _make_event_id(payload):
    content = json.dumps(payload, sort_keys=True, ensure_ascii=False, separators=(",", ":"))
    return hashlib.sha256(content.encode("utf-8")).hexdigest()


class ActivityCollector:
    def __init__(self, probe, config, categorizer, device_id, role):
        self.probe = probe
        self.config = config
        self.categorizer = categorizer
        self.device_id = device_id
        self.role = role
        self.schema_version = config.get("schema_version", 3)
        self.idle_threshold = config.get("idle_threshold_seconds", 180)
        self.collect = config.get("collect", {})
        self.privacy = config.get("privacy", {})
        self.exclude_apps = [a.lower() for a in self.privacy.get("exclude_apps", [])]

        self.window_segment = None
        self.idle_segment = None
        self.system_language = self._safe(self.probe.get_system_language)
        self.screen_count = self._safe(self.probe.get_screen_count)

        if self.collect.get("window", True):
            self.probe.get_foreground_window()

        self.last_window = self._read_window()
        self.current_status = self._read_status()

    def _safe(self, func):
        try:
            return func()
        except Exception:
            return None

    def _read_window(self):
        window = self._safe(self.probe.get_foreground_window)
        if window is None:
            return None
        return window

    def _read_status(self):
        locked = self._safe(self.probe.is_session_locked)
        if locked:
            return "inactive"
        idle = self._safe(self.probe.get_idle_seconds)
        if idle is None:
            return "unknown"
        return "inactive" if idle >= self.idle_threshold else "active"

    def poll(self, now=None):
        now = now or utc_now()
        events = []

        window = self._read_window()
        status = self._read_status()

        if self.collect.get("idle", True):
            events.extend(self._update_idle(status, now))

        if self.collect.get("window", True):
            events.extend(self._update_window(window, status, now))

        return events

    def flush(self, now=None):
        now = now or utc_now()
        events = []
        if self.window_segment is not None:
            events.append(self._close_window(now))
        if self.idle_segment is not None:
            events.append(self._close_idle(now))
        return events

    def _update_idle(self, status, now):
        events = []
        raw_status = "afk" if status == "inactive" else "not-afk"

        if self.idle_segment is None:
            self.idle_segment = {"start": now, "raw": raw_status, "status": status}
        elif self.idle_segment["raw"] != raw_status:
            events.append(self._close_idle(now))
            self.idle_segment = {"start": now, "raw": raw_status, "status": status}
        else:
            self.idle_segment["status"] = status
        return events

    def _update_window(self, window, status, now):
        events = []
        app = window.app if window else "unknown"
        title = window.title if window else ""

        if self.window_segment is None:
            self.window_segment = self._new_window_segment(window, status, now)
            return events

        segment = self.window_segment
        same_window = segment["app"] == app and segment["title"] == title

        if not same_window or segment["status"] != status:
            events.append(self._close_window(now))
            self.window_segment = self._new_window_segment(window, status, now)

        return events

    def _new_window_segment(self, window, status, now):
        app = window.app if window else "unknown"
        title = window.title if window else ""
        return {
            "start": now,
            "app": app,
            "title": title,
            "pid": window.pid if window else None,
            "status": status,
        }

    def _redact_title(self, app, title):
        if app.lower() in self.exclude_apps:
            return "[excluded]"
        if self.privacy.get("redact_titles"):
            return "[redacted]"
        return title

    def _context(self):
        context = {"os": self._safe(self.probe.get_os_name)}
        if self.collect.get("session", True):
            context["screens"] = self.screen_count
            context["session"] = "locked" if self._safe(
                self.probe.is_session_locked
            ) else "unlocked"
        return context

    def _language(self):
        if not self.collect.get("language", True):
            return None
        return {
            "system": self.system_language,
            "keyboard_layout": self._safe(self.probe.get_keyboard_layout),
        }

    def _close_window(self, end):
        segment = self.window_segment
        self.window_segment = None
        duration = max((end - segment["start"]).total_seconds(), 0.0)
        app = segment["app"]
        title = self._redact_title(app, segment["title"])
        category = self.categorizer.classify(app) if self.collect.get("tools", True) else "unknown"

        payload = {
            "source": "workadapt_agent",
            "event_type": "window_activity",
            "event_start": segment["start"].isoformat(),
            "app": app,
            "title": title,
        }

        record = {
            "event_id": _make_event_id(payload),
            "source": "workadapt_agent",
            "schema_version": self.schema_version,
            "device_id": self.device_id,
            "role": self.role,
            "event_type": "window_activity",
            "event_start": segment["start"].isoformat(),
            "event_end": end.isoformat(),
            "timestamp": segment["start"].isoformat(),
            "duration_seconds": round(duration, 3),
            "activity_status": segment["status"],
            "app": {"name": app, "pid": segment["pid"], "category": category},
            "language": self._language(),
            "context": self._context(),
            "data": {
                "app": app,
                "title": title,
                "application_category": category,
            },
            "collected_at": utc_now().isoformat(),
        }
        return record

    def _close_idle(self, end):
        segment = self.idle_segment
        self.idle_segment = None
        duration = max((end - segment["start"]).total_seconds(), 0.0)

        payload = {
            "source": "workadapt_agent",
            "event_type": "idle_status",
            "event_start": segment["start"].isoformat(),
            "status": segment["raw"],
        }

        record = {
            "event_id": _make_event_id(payload),
            "source": "workadapt_agent",
            "schema_version": self.schema_version,
            "device_id": self.device_id,
            "role": self.role,
            "event_type": "idle_status",
            "event_start": segment["start"].isoformat(),
            "event_end": end.isoformat(),
            "timestamp": segment["start"].isoformat(),
            "duration_seconds": round(duration, 3),
            "activity_status": segment["status"],
            "data": {"status": segment["raw"]},
            "collected_at": utc_now().isoformat(),
        }
        return record
