import json
import logging
import os
import ssl
import threading
from urllib import request

logger = logging.getLogger("workadapt.sync")


class EventUploader:
    def __init__(self, config, store):
        self.config = config
        self.store = store
        self.settings = config.get("sync", {}) or {}
        self.endpoint = (self.settings.get("endpoint") or "").rstrip("/")
        self.enabled = bool(self.settings.get("enabled") and self.endpoint)
        self.batch_size = max(int(self.settings.get("batch_size", 500) or 500), 1)
        self.batch_seconds = max(
            float(self.settings.get("batch_seconds", 60) or 60), 1.0
        )
        self.timeout = max(
            float(self.settings.get("timeout_seconds", 20) or 20), 1.0
        )
        self.verify_tls = bool(self.settings.get("verify_tls", True))
        self.token = os.environ.get("WORKADAPT_TOKEN", "")
        self.schema_version = config.get("schema_version", 3)

        self._stop = threading.Event()
        self._thread = None
        self._cursors = self._load_cursors()

    def _load_cursors(self):
        raw = self.store.get_state("sync_cursors")
        if not raw:
            return {}
        try:
            cursors = json.loads(raw)
            return {str(k): int(v) for k, v in cursors.items()}
        except (json.JSONDecodeError, ValueError, TypeError):
            return {}

    def _save_cursors(self):
        self.store.set_state(
            "sync_cursors", json.dumps(self._cursors, sort_keys=True)
        )

    def start(self):
        if not self.enabled:
            return False
        if self._thread and self._thread.is_alive():
            return True
        self._thread = threading.Thread(
            target=self._run, name="workadapt-sync", daemon=True
        )
        self._thread.start()
        return True

    def stop(self):
        self._stop.set()
        if self._thread and self._thread.is_alive():
            self._thread.join(timeout=5)

    def _run(self):
        logger.info("sync: actif vers %s", self.endpoint)
        while not self._stop.is_set():
            try:
                self.upload_once()
            except Exception as error:
                logger.warning("sync: échec de la boucle: %s", error)
            self._stop.wait(self.batch_seconds)

    def upload_once(self):
        sent = 0
        for path in self.store.event_files():
            try:
                sent += self._upload_file(path)
            except Exception as error:
                logger.warning("sync: %s: %s", path.name, error)
        return sent

    def _upload_file(self, path):
        key = str(path)
        try:
            offset = int(self._cursors.get(key, 0))
        except (TypeError, ValueError):
            offset = 0

        try:
            size = path.stat().st_size
        except OSError:
            return 0
        if offset >= size:
            return 0

        events, new_offset = self._read_from(path, offset)
        if not events:
            return 0

        for index in range(0, len(events), self.batch_size):
            batch = events[index : index + self.batch_size]
            self._post_with_retry(batch)

        self._cursors[key] = new_offset
        self._save_cursors()
        logger.info("sync: %d événement(s) envoyé(s)", len(events))
        return len(events)

    def _read_from(self, path, offset):
        with path.open("rb") as file:
            file.seek(offset)
            data = file.read()

        last_newline = data.rfind(b"\n")
        if last_newline == -1:
            return [], offset

        complete = data[: last_newline + 1]
        new_offset = offset + len(complete)

        events = []
        for line in complete.splitlines():
            line = line.strip()
            if not line:
                continue
            try:
                events.append(json.loads(line.decode("utf-8-sig")))
            except (json.JSONDecodeError, UnicodeDecodeError):
                continue

        return events, new_offset

    def _post_with_retry(self, batch, attempts=3):
        delay = 2.0
        last_error = None
        for attempt in range(1, attempts + 1):
            try:
                self._post(batch)
                return
            except Exception as error:
                last_error = error
                logger.warning(
                    "sync: tentative %d/%d échouée: %s",
                    attempt,
                    attempts,
                    error,
                )
                if attempt < attempts and self._stop.wait(delay):
                    break
                delay = min(delay * 2, 30)
        raise last_error

    def _post(self, batch):
        body = json.dumps(
            {"schema_version": self.schema_version, "events": batch},
            ensure_ascii=False,
        ).encode("utf-8")

        http_request = request.Request(self.endpoint, data=body, method="POST")
        http_request.add_header("Content-Type", "application/json")
        http_request.add_header("User-Agent", "workadapt-agent/3")
        if self.token:
            http_request.add_header("Authorization", f"Bearer {self.token}")

        context = None
        if not self.verify_tls:
            context = ssl._create_unverified_context()

        with request.urlopen(
            http_request, timeout=self.timeout, context=context
        ) as response:
            if response.status >= 300:
                raise RuntimeError(f"HTTP {response.status}")
