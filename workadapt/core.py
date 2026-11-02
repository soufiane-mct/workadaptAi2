import argparse
import hashlib
import logging
import socket
import time
from pathlib import Path

from .catalogs import CatalogSet
from .collectors.activity import ActivityCollector
from .config import load_config
from .enrichers.pipeline import Enricher
from .export import write_summary_csv
from .logging_setup import setup_logging
from .platform import get_platform_probe
from .storage.store import EventStore
from .summary import generate_daily_summary
from .sync import EventUploader

logger = logging.getLogger("workadapt")


def _device_id(config):
    name = config.get("device_name") or socket.gethostname() or "unknown-device"
    return hashlib.sha256(name.encode("utf-8")).hexdigest()[:16]


class Agent:
    def __init__(self, config):
        self.config = config
        self.probe = get_platform_probe(config)
        self.enricher = Enricher(config)

        privacy = config.get("privacy", {}) or {}
        self.store = EventStore(
            config.output_path,
            config.database_path,
            rotate_daily=privacy.get("rotate_daily", True),
            retention_days=privacy.get("retention_days", 0),
        )
        self.collector = ActivityCollector(
            self.probe,
            config,
            self.enricher,
            _device_id(config),
            config.get("role", "general"),
        )
        self.poll_interval = config.get("poll_interval_seconds", 1)
        self.summary_path = (
            config.output_path.parent / "workadapt_summary_daily.json"
        )
        self.uploader = EventUploader(config, self.store)
        self.saved_total = 0

    def run(self):
        logger.info("WorkAdapt Agent")
        logger.info("OS: %s | probe: %s", self.probe.get_os_name(), self.probe.name)
        logger.info(
            "rôle: %s | sortie: %s",
            self.config.get("role"),
            self.store.output_path,
        )
        logger.info(
            "seuil AFK: %ss | intervalle: %ss",
            self.collector.idle_threshold,
            self.poll_interval,
        )
        if self.store.pruned:
            logger.info("rétention: %d élément(s) purgé(s)", self.store.pruned)
        if self.uploader.start():
            logger.info("sync: activé vers %s", self.uploader.endpoint)
        else:
            logger.info("sync: désactivé")
        logger.info("Arrêt : Ctrl+C")

        self.saved_total = 0
        try:
            self._loop()
        except KeyboardInterrupt:
            logger.info("Arrêt demandé, clôture des segments en cours...")
        except Exception:
            logger.exception("erreur fatale")
            raise
        finally:
            self._shutdown()

    def _loop(self):
        while True:
            loop_start = time.monotonic()
            events = self.collector.poll()
            for record in events:
                if self.store.save(record):
                    self.saved_total += 1
                    self._log_event(record)

            elapsed = time.monotonic() - loop_start
            time.sleep(max(self.poll_interval - elapsed, 0.05))

    def _shutdown(self):
        try:
            for record in self.collector.flush():
                if self.store.save(record):
                    self.saved_total += 1
                    self._log_event(record)
        except Exception:
            logger.exception("échec de la clôture des segments")

        self.uploader.stop()
        if self.uploader.enabled:
            try:
                self.uploader.upload_once()
            except Exception as error:
                logger.warning("sync: envoi final échoué: %s", error)

        try:
            self.probe.close()
        except Exception:
            logger.exception("échec de la fermeture du probe")

        counts = self.store.count()
        files = self.store.event_files()
        self.store.close()

        try:
            generate_daily_summary(files, self.summary_path)
        except Exception:
            logger.exception("échec de la génération du résumé")

        logger.info("Événements écrits cette session : %d", self.saved_total)
        logger.info("Total en base de déduplication : %d", counts)
        logger.info("Résumé quotidien : %s", self.summary_path)

    @staticmethod
    def _log_event(record):
        data = record.get("data", {})
        label = data.get("app") or data.get("status") or ""
        logger.info(
            "%s %.3fs %s",
            record.get("event_type"),
            record.get("duration_seconds", 0),
            label,
        )


def _summary_files(config):
    base = config.output_path
    files = sorted(base.parent.glob(f"{base.stem}-*.jsonl"))
    if base.exists():
        files.append(base)
    return files


def _print_summary(config):
    summary = generate_daily_summary(
        _summary_files(config),
        config.output_path.parent / "workadapt_summary_daily.json",
    )
    if not summary:
        logger.warning("aucun événement à résumer")
        return 1
    for day, stats in sorted(summary["days"].items()):
        print(
            f"{day}: {stats['active_minutes']} min actif, "
            f"{stats['window_events']} événements fenêtre"
        )
    print(f"Résumé : {config.output_path.parent / 'workadapt_summary_daily.json'}")
    return 0


def _export_csv(config, target):
    summary = generate_daily_summary(_summary_files(config))
    if not summary:
        logger.warning("aucun événement à exporter")
        return 1
    output = (
        config.output_path.parent / "workadapt_summary.csv"
        if target in (None, "auto")
        else Path(target)
    )
    rows = write_summary_csv(summary["days"], output)
    print(f"{rows} ligne(s) -> {output}")
    return 0


def _doctor(config):
    probe = get_platform_probe(config)
    lines = [
        f"config: {config.path}",
        f"rôle: {config.get('role')}",
        f"OS: {probe.get_os_name()} | probe: {probe.name}",
    ]

    try:
        window = probe.get_foreground_window()
        if window:
            lines.append(
                f"fenêtre: {window.app} | titre: {len(window.title or '')} caractères"
            )
        else:
            lines.append("fenêtre: (aucune)")
        lines.append(
            f"idle: {probe.get_idle_seconds()}s | "
            f"écrans: {probe.get_screen_count()} | "
            f"verrouillé: {probe.is_session_locked()}"
        )
        lines.append(f"input: {probe.get_input_counters() or 'indisponible'}")
    finally:
        probe.close()

    privacy = config.get("privacy", {}) or {}
    sync = config.get("sync", {}) or {}
    catalogs = CatalogSet(config.get("catalogs"))
    lines.extend(
        [
            f"sortie: {config.output_path} | "
            f"rotation: {privacy.get('rotate_daily')} | "
            f"rétention: {privacy.get('retention_days')}j",
            f"db: {config.database_path}",
            f"log: {config.log_path}",
            f"catalogues: {catalogs.directory} "
            f"(apps={len(catalogs.apps.get('exact', {}))}, "
            f"documents={len(catalogs.documents.get('extensions', {}))}, "
            f"rôles={len(catalogs.roles.get('roles', {}))})",
            f"sync: {'activé' if sync.get('enabled') else 'désactivé'} "
            f"{sync.get('endpoint') or ''}",
        ]
    )

    for line in lines:
        logger.info(line)
        print(line)
    return 0


def main(argv=None):
    parser = argparse.ArgumentParser(description="WorkAdapt Agent")
    parser.add_argument("--config", default=None)
    parser.add_argument("--summary", action="store_true")
    parser.add_argument(
        "--export-csv",
        nargs="?",
        const="auto",
        default=None,
        metavar="PATH",
        help="exporte le résumé agrégé en CSV (défaut: data/workadapt_summary.csv)",
    )
    parser.add_argument("--doctor", action="store_true")
    args = parser.parse_args(argv)

    config = load_config(args.config)
    setup_logging(config)

    if args.doctor:
        return _doctor(config)
    if args.export_csv is not None:
        return _export_csv(config, args.export_csv)
    if args.summary:
        return _print_summary(config)

    Agent(config).run()
    return 0
