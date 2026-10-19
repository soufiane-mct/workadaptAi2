import json
import sqlite3
from datetime import datetime, timezone
from pathlib import Path


def utc_now():
    return datetime.now(timezone.utc)


class EventStore:
    def __init__(self, output_path, database_path):
        self.output_path = Path(output_path)
        self.database_path = Path(database_path)
        self.output_path.parent.mkdir(parents=True, exist_ok=True)
        self.database_path.parent.mkdir(parents=True, exist_ok=True)
        self.connection = self._connect()

    def _connect(self):
        connection = sqlite3.connect(str(self.database_path))
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS finalized_events (
                event_key TEXT PRIMARY KEY,
                saved_at TEXT NOT NULL
            )
            """
        )
        connection.commit()
        return connection

    def save(self, record):
        cursor = self.connection.execute(
            "INSERT OR IGNORE INTO finalized_events (event_key, saved_at) VALUES (?, ?)",
            (record["event_id"], utc_now().isoformat()),
        )
        if cursor.rowcount != 1:
            self.connection.commit()
            return False

        try:
            with self.output_path.open("a", encoding="utf-8") as file:
                file.write(json.dumps(record, ensure_ascii=False) + "\n")
            self.connection.commit()
            return True
        except Exception:
            self.connection.rollback()
            raise

    def count(self):
        return self.connection.execute(
            "SELECT COUNT(*) FROM finalized_events"
        ).fetchone()[0]

    def close(self):
        self.connection.close()
