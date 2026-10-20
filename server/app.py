import argparse
import json
import logging
import os
import sqlite3
import sys
import threading
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlparse

ROOT = Path(__file__).resolve().parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from workadapt.summary import aggregate_events  # noqa: E402

logger = logging.getLogger("workadapt.server")
MAX_BODY_BYTES = 50_000_000


class EventDatabase:
    def __init__(self, path):
        self.path = Path(path)
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self._lock = threading.Lock()
        self._connection = sqlite3.connect(
            str(self.path), check_same_thread=False
        )
        self._connection.execute("PRAGMA journal_mode=WAL")
        self._connection.execute(
            """
            CREATE TABLE IF NOT EXISTS events (
                event_id TEXT PRIMARY KEY,
                device_id TEXT,
                role TEXT,
                event_type TEXT,
                event_start TEXT,
                day TEXT,
                payload TEXT NOT NULL,
                received_at TEXT NOT NULL
            )
            """
        )
        self._connection.execute(
            "CREATE INDEX IF NOT EXISTS idx_events_day ON events(day)"
        )
        self._connection.commit()

    def insert_many(self, events):
        received = 0
        duplicates = 0
        now = datetime.now(timezone.utc).isoformat()
        with self._lock:
            for event in events:
                if not isinstance(event, dict):
                    continue
                event_id = event.get("event_id")
                if not event_id:
                    continue
                day = (event.get("event_start") or "")[:10]
                role = event.get("role")
                if isinstance(role, dict):
                    role = role.get("inferred") or role.get("declared")
                try:
                    self._connection.execute(
                        """
                        INSERT INTO events (
                            event_id, device_id, role, event_type,
                            event_start, day, payload, received_at
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                        """,
                        (
                            event_id,
                            event.get("device_id"),
                            role,
                            event.get("event_type"),
                            event.get("event_start"),
                            day,
                            json.dumps(event, ensure_ascii=False),
                            now,
                        ),
                    )
                    received += 1
                except sqlite3.IntegrityError:
                    duplicates += 1
            self._connection.commit()
        return received, duplicates

    def events(self, day=None):
        with self._lock:
            if day:
                rows = self._connection.execute(
                    "SELECT payload FROM events WHERE day = ? ORDER BY event_start",
                    (day,),
                ).fetchall()
            else:
                rows = self._connection.execute(
                    "SELECT payload FROM events ORDER BY event_start"
                ).fetchall()
        return [json.loads(row[0]) for row in rows]

    def close(self):
        with self._lock:
            self._connection.close()


class RequestHandler(BaseHTTPRequestHandler):
    server_version = "WorkAdaptServer/1.0"

    def _send(self, status, payload):
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _authorized(self):
        token = getattr(self.server, "token", "")
        if not token:
            return True
        return self.headers.get("Authorization", "") == f"Bearer {token}"

    def do_POST(self):
        parsed = urlparse(self.path)
        if parsed.path != "/api/v1/events":
            return self._send(404, {"error": "not found"})
        if not self._authorized():
            return self._send(401, {"error": "unauthorized"})

        try:
            length = int(self.headers.get("Content-Length", 0) or 0)
        except ValueError:
            return self._send(400, {"error": "invalid content-length"})
        if length <= 0 or length > MAX_BODY_BYTES:
            return self._send(400, {"error": "invalid body size"})

        try:
            body = json.loads(self.rfile.read(length).decode("utf-8"))
        except (json.JSONDecodeError, UnicodeDecodeError):
            return self._send(400, {"error": "invalid json"})

        events = body.get("events") if isinstance(body, dict) else body
        if not isinstance(events, list):
            return self._send(400, {"error": "events must be a list"})

        received, duplicates = self.server.database.insert_many(events)
        return self._send(
            200, {"received": received, "duplicates": duplicates}
        )

    def do_GET(self):
        parsed = urlparse(self.path)
        if parsed.path == "/health":
            return self._send(200, {"status": "ok"})
        if not self._authorized():
            return self._send(401, {"error": "unauthorized"})
        if parsed.path == "/api/v1/events":
            day = parse_qs(parsed.query).get("day", [None])[0]
            return self._send(
                200, {"events": self.server.database.events(day)}
            )
        if parsed.path == "/api/v1/summary":
            day = parse_qs(parsed.query).get("day", [None])[0]
            days = aggregate_events(self.server.database.events(day))
            return self._send(200, {"day": day, "days": days})
        return self._send(404, {"error": "not found"})

    def log_message(self, fmt, *args):
        logger.info("%s - %s", self.address_string(), fmt % args)


def create_server(host, port, database, token=""):
    httpd = ThreadingHTTPServer((host, port), RequestHandler)
    httpd.database = EventDatabase(database)
    httpd.token = token
    return httpd


def main(argv=None):
    parser = argparse.ArgumentParser(description="WorkAdapt ingestion server")
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=8787)
    parser.add_argument(
        "--db",
        default=str(Path(__file__).resolve().parent / "workadapt_server.db"),
    )
    parser.add_argument(
        "--token", default=os.environ.get("WORKADAPT_TOKEN", "")
    )
    args = parser.parse_args(argv)

    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(name)s: %(message)s",
    )

    httpd = create_server(args.host, args.port, args.db, args.token)
    logger.info(
        "WorkAdapt server sur http://%s:%d (db=%s, auth=%s)",
        args.host,
        args.port,
        args.db,
        "on" if args.token else "off",
    )
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        httpd.server_close()
        httpd.database.close()


if __name__ == "__main__":
    main()
