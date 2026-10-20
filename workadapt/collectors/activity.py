import hashlib
import json
from datetime import datetime, timezone


def utc_now():
    return datetime.now(timezone.utc)


def _make_event_id(payload):
    content = json.dumps(payload, sort_keys=True, ensure_ascii=False, separators=(",", ":"))
    return hashlib.sha256(content.encode("utf-8")).hexdigest()


class ActivityCollector:
    def __init__(self, probe, config, enricher, device_id, role):
        self.probe = probe
        self.config = config
        self.enricher = enricher
        self.device_id = device_id
        self.declared_role = role
        self.schema_version = config.get("schema_version", 3)
        self.idle_threshold = config.get("idle_threshold_seconds", 180)
        self.collect = config.get("collect", {})
        self.privacy = config.get("privacy", {})
        self.exclude_apps = [a.lower() for a in self.privacy.get("exclude_apps", [])]
        self.drop_excluded_apps = self.privacy.get("drop_excluded_apps", True)
        self.input_enabled = bool(
            self.collect.get("keyboard_metrics")
            or self.collect.get("mouse_metrics")
        )

        self.window_segment = None
        self.idle_segment = None
        self.screen_count = self._safe(self.probe.get_screen_count)

    def _safe(self, func):
        try:
            return func()
        except Exception:
            return None

    def _read_window(self):
        return self._safe(self.probe.get_foreground_window)

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
            closed = self._close_window(now)
            if closed is not None:
                events.append(closed)
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
            closed = self._close_window(now)
            if closed is not None:
                events.append(closed)
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
            "input_start": self._input_counters(),
        }

    def _is_excluded(self, app):
        return (app or "").lower() in self.exclude_apps

    def _redact_title(self, title):
        if self.privacy.get("redact_titles"):
            return "[redacted]"
        return title

    def _input_counters(self):
        if not self.input_enabled:
            return None
        function = getattr(self.probe, "get_input_counters", None)
        if function is None:
            return None
        return self._safe(function)

    def _input_delta(self, segment):
        if not self.input_enabled:
            return None
        start = segment.get("input_start")
        end = self._input_counters()
        if not start or not end:
            return None

        data = {}
        if self.collect.get("keyboard_metrics"):
            data["keys"] = max(
                int(end.get("keys", 0)) - int(start.get("keys", 0)), 0
            )
        if self.collect.get("mouse_metrics"):
            data["clicks"] = max(
                int(end.get("clicks", 0)) - int(start.get("clicks", 0)), 0
            )
            data["moves"] = max(
                int(end.get("moves", 0)) - int(start.get("moves", 0)), 0
            )
        return data or None

    def _excluded_enrichment(self):
        return {
            "tool": "excluded",
            "vendor": None,
            "category": "excluded",
            "domains": [],
            "document": {"type": None, "extension": None},
            "programming_language": None,
            "tasks": [],
            "role": self.enricher.role_for_idle(self.declared_role),
            "confidence": 0.0,
        }

    def _context(self):
        context = {"os": self._safe(self.probe.get_os_name)}
        if self.collect.get("session", True):
            context["screens"] = self.screen_count
            context["session"] = (
                "locked" if self._safe(self.probe.is_session_locked) else "unlocked"
            )
        return context

    def _close_window(self, end):
        segment = self.window_segment
        self.window_segment = None
        duration = max((end - segment["start"]).total_seconds(), 0.0)

        app = segment["app"]

        if self._is_excluded(app):
            if self.drop_excluded_apps:
                return None
            app = "[excluded]"
            title = "[excluded]"
            enriched = self._excluded_enrichment()
        else:
            title = self._redact_title(segment["title"])
            enriched = self.enricher.enrich_window(
                app, segment["title"], self.declared_role
            )

        input_data = self._input_delta(segment)

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
            "role": enriched["role"],
            "event_type": "window_activity",
            "event_start": segment["start"].isoformat(),
            "event_end": end.isoformat(),
            "timestamp": segment["start"].isoformat(),
            "duration_seconds": round(duration, 3),
            "activity_status": segment["status"],
            "app": {
                "name": app,
                "pid": segment["pid"],
                "category": enriched["category"],
                "tool": enriched["tool"],
                "vendor": enriched["vendor"],
                "domains": enriched["domains"],
            },
            "document": enriched["document"],
            "work_context": {
                "domains": enriched["domains"],
                "tasks": enriched["tasks"],
                "confidence": enriched["confidence"],
            },
            "programming_language": enriched["programming_language"],
            "context": self._context(),
            "data": {
                "app": app,
                "title": title,
                "application_category": enriched["category"],
            },
            "collected_at": utc_now().isoformat(),
        }

        if input_data is not None:
            record["input"] = input_data

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

        return {
            "event_id": _make_event_id(payload),
            "source": "workadapt_agent",
            "schema_version": self.schema_version,
            "device_id": self.device_id,
            "role": self.enricher.role_for_idle(self.declared_role),
            "event_type": "idle_status",
            "event_start": segment["start"].isoformat(),
            "event_end": end.isoformat(),
            "timestamp": segment["start"].isoformat(),
            "duration_seconds": round(duration, 3),
            "activity_status": segment["status"],
            "data": {"status": segment["raw"]},
            "collected_at": utc_now().isoformat(),
        }
