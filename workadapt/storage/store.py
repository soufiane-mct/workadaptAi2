import json
import sqlite3
import threading
from datetime import date, datetime, timedelta, timezone
from pathlib import Path


def utc_now():
    return datetime.now(timezone.utc)


class EventStore:
    def __init__(
        self,
        output_path,
        database_path,
        rotate_daily=False,
        retention_days=0,
    ):
        self.output_path = Path(output_path)
        self.database_path = Path(database_path)
        self.rotate_daily = bool(rotate_daily)
        self.retention_days = max(int(retention_days or 0), 0)
        self.output_path.parent.mkdir(parents=True, exist_ok=True)
        self.database_path.parent.mkdir(parents=True, exist_ok=True)
        self._lock = threading.Lock()
        self.connection = self._connect()
        self.pruned = self._prune()

    def _connect(self):
        connection = sqlite3.connect(
            str(self.database_path), check_same_thread=False
        )
        connection.execute("PRAGMA journal_mode=WAL")
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS finalized_events (
                event_key TEXT PRIMARY KEY,
                saved_at TEXT NOT NULL
            )
            """
        )
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS sync_state (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL
            )
            """
        )
        connection.commit()
        return connection

    def _day(self, when=None):
        return (when or utc_now()).date().isoformat()

    def _record_day(self, record):
        start = record.get("event_start")
        if start:
            try:
                return datetime.fromisoformat(start).date().isoformat()
            except ValueError:
                pass
        return self._day()

    def path_for(self, when=None):
        if self.rotate_daily:
            day = when if isinstance(when, str) else self._day(when)
            return self.output_path.parent / f"{self.output_path.stem}-{day}.jsonl"
        return self.output_path

    def event_files(self):
        if not self.rotate_daily:
            return [self.output_path] if self.output_path.exists() else []
        return sorted(
            self.output_path.parent.glob(f"{self.output_path.stem}-*.jsonl")
        )

    def save(self, record):
        with self._lock:
            cursor = self.connection.execute(
                "INSERT OR IGNORE INTO finalized_events (event_key, saved_at) VALUES (?, ?)",
                (record["event_id"], utc_now().isoformat()),
            )
            if cursor.rowcount != 1:
                self.connection.commit()
                return False

            path = self.path_for(self._record_day(record))
            try:
                with path.open("a", encoding="utf-8") as file:
                    file.write(json.dumps(record, ensure_ascii=False) + "\n")
                self.connection.commit()
                return True
            except Exception:
                self.connection.rollback()
                raise

    def count(self):
        with self._lock:
            return self.connection.execute(
                "SELECT COUNT(*) FROM finalized_events"
            ).fetchone()[0]

    def get_state(self, key, default=None):
        with self._lock:
            row = self.connection.execute(
                "SELECT value FROM sync_state WHERE key = ?", (key,)
            ).fetchone()
        return row[0] if row else default

    def set_state(self, key, value):
        with self._lock:
            self.connection.execute(
                """
                INSERT INTO sync_state (key, value) VALUES (?, ?)
                ON CONFLICT(key) DO UPDATE SET value = excluded.value
                """,
                (key, value),
            )
            self.connection.commit()

    def _prune(self):
        if self.retention_days <= 0:
            return 0

        cutoff = (utc_now() - timedelta(days=self.retention_days)).isoformat()
        removed = 0
        with self._lock:
            cursor = self.connection.execute(
                "DELETE FROM finalized_events WHERE saved_at < ?", (cutoff,)
            )
            self.connection.commit()
            removed += cursor.rowcount or 0

        if self.rotate_daily:
            cutoff_date = (utc_now() - timedelta(days=self.retention_days)).date()
            for path in self.event_files():
                try:
                    file_date = date.fromisoformat(path.stem[-10:])
                except ValueError:
                    continue
                if file_date < cutoff_date:
                    path.unlink(missing_ok=True)
                    removed += 1

        return removed

    def close(self):
        with self._lock:
            self.connection.close()
