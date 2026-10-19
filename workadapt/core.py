import hashlib
import socket
import time
from datetime import datetime, timezone

from .collectors.activity import ActivityCollector
from .config import load_config
from .enrichers.pipeline import Enricher
from .platform import get_platform_probe
from .storage.store import EventStore
from .summary import generate_daily_summary


def _device_id(config):
    name = config.get("device_name") or socket.gethostname() or "unknown-device"
    return hashlib.sha256(name.encode("utf-8")).hexdigest()[:16]


def _log(message):
    stamp = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S")
    print(f"[{stamp}] {message}", flush=True)


class Agent:
    def __init__(self, config):
        self.config = config
        self.probe = get_platform_probe(config)
        self.enricher = Enricher(config)
        self.store = EventStore(config.output_path, config.database_path)
        self.collector = ActivityCollector(
            self.probe,
            config,
            self.enricher,
            _device_id(config),
            config.get("role", "general"),
        )
        self.poll_interval = config.get("poll_interval_seconds", 1)
        self.summary_path = config.output_path.parent / "workadapt_summary_daily.json"

    def run(self):
        _log("WorkAdapt Agent")
        _log(f"OS: {self.probe.get_os_name()} | probe: {self.probe.name}")
        _log(f"rôle: {self.config.get('role')} | sortie: {self.store.output_path}")
        _log(
            f"seuil AFK: {self.collector.idle_threshold}s | "
            f"intervalle: {self.poll_interval}s"
        )
        _log("Arrêt : Ctrl+C\n")

        saved_total = 0
        try:
            while True:
                loop_start = time.monotonic()
                events = self.collector.poll()
                for record in events:
                    if self.store.save(record):
                        saved_total += 1
                        label = record.get("data", {}).get(
                            "app", record.get("data", {}).get("status", "")
                        )
                        _log(
                            f"{record['event_type']} "
                            f"{record['duration_seconds']}s {label}"
                        )

                elapsed = time.monotonic() - loop_start
                time.sleep(max(self.poll_interval - elapsed, 0.05))
        except KeyboardInterrupt:
            _log("Arrêt demandé, clôture des segments en cours...")
            for record in self.collector.flush():
                if self.store.save(record):
                    saved_total += 1
        finally:
            counts = self.store.count()
            output_path = self.store.output_path
            self.store.close()

            generate_daily_summary(output_path, self.summary_path)

            _log(f"Événements écrits cette session : {saved_total}")
            _log(f"Total en base de déduplication : {counts}")
            _log(f"Résumé quotidien : {self.summary_path}")


def main(argv=None):
    config = load_config()
    Agent(config).run()
    return 0
