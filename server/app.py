import argparse
import html
import json
import logging
import os
import sqlite3
import ssl
import sys
import threading
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlparse

ROOT = Path(__file__).resolve().parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from workadapt.export import summary_csv_text  # noqa: E402
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


def _minutes(seconds):
    return f"{float(seconds or 0) / 60:.1f} min"


def _bucket_table(bucket):
    if not bucket:
        return "<p class='muted'>—</p>"
    rows = "".join(
        f"<tr><td>{html.escape(str(name))}</td>"
        f"<td class='num'>{_minutes(value)}</td></tr>"
        for name, value in bucket.items()
    )
    return f"<table><tbody>{rows}</tbody></table>"


def dashboard_html(days):
    if not days:
        body = "<p class='muted'>Aucun événement.</p>"
    else:
        sections = []
        for day, stats in sorted(days.items(), reverse=True):
            sections.append(
                f"""
                <section class="card">
                  <h2>{html.escape(day)}</h2>
                  <div class="kpis">
                    <div><span class="kpi">{stats['active_minutes']}</span><span class="label">min actif</span></div>
                    <div><span class="kpi">{stats['inactive_minutes']}</span><span class="label">min inactif</span></div>
                    <div><span class="kpi">{stats['window_events']}</span><span class="label">fenêtres</span></div>
                    <div><span class="kpi">{stats['input']['keys']}</span><span class="label">touches</span></div>
                  </div>
                  <div class="grid">
                    <div><h3>Outils</h3>{_bucket_table(stats['tools'])}</div>
                    <div><h3>Domaines</h3>{_bucket_table(stats['domains'])}</div>
                    <div><h3>Tâches</h3>{_bucket_table(stats['tasks'])}</div>
                    <div><h3>Rôles</h3>{_bucket_table(stats['roles'])}</div>
                    <div><h3>Langages</h3>{_bucket_table(stats['programming_languages'])}</div>
                    <div><h3>Applications</h3>{_bucket_table(stats['apps'])}</div>
                  </div>
                </section>
                """
            )
        body = "".join(sections)

    return f"""<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>WorkAdapt</title>
<style>
  * {{ box-sizing: border-box; }}
  body {{ margin: 0; padding: 24px; font-family: system-ui, sans-serif; background: #0f172a; color: #e2e8f0; }}
  header {{ max-width: 1100px; margin: 0 auto 16px; }}
  h1 {{ margin: 0 0 4px; font-size: 1.4rem; }}
  .muted {{ opacity: .6; }}
  .card {{ max-width: 1100px; margin: 0 auto 16px; background: #1e293b; border-radius: 12px; padding: 16px; }}
  h2 {{ margin: 0 0 12px; font-size: 1.1rem; }}
  h3 {{ margin: 0 0 8px; font-size: .8rem; text-transform: uppercase; letter-spacing: .05em; opacity: .7; }}
  .kpis {{ display: flex; gap: 24px; flex-wrap: wrap; margin-bottom: 16px; }}
  .kpi {{ display: block; font-size: 1.4rem; font-weight: 600; }}
  .label {{ font-size: .75rem; opacity: .6; }}
  .grid {{ display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; }}
  table {{ width: 100%; border-collapse: collapse; font-size: .85rem; }}
  td {{ padding: 4px 0; border-bottom: 1px solid #334155; }}
  td.num {{ text-align: right; white-space: nowrap; }}
</style>
</head>
<body>
<header>
  <h1>WorkAdapt</h1>
  <p class="muted">Résumé local — les données ne quittent pas la machine par défaut.</p>
</header>
{body}
</body>
</html>"""


class RequestHandler(BaseHTTPRequestHandler):
    server_version = "WorkAdaptServer/1.0"

    def _send(self, status, payload):
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _send_html(self, status, body):
        data = body.encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def _send_csv(self, status, body):
        data = ("\ufeff" + body).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "text/csv; charset=utf-8")
        self.send_header(
            "Content-Disposition", 'attachment; filename="workadapt_summary.csv"'
        )
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def _authorized(self):
        token = getattr(self.server, "token", "")
        if not token:
            return True
        if self.headers.get("Authorization", "") == f"Bearer {token}":
            return True
        query = parse_qs(urlparse(self.path).query)
        return query.get("token", [None])[0] == token

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
        if parsed.path == "/favicon.ico":
            self.send_response(204)
            self.end_headers()
            return
        if parsed.path == "/health":
            return self._send(200, {"status": "ok"})
        if not self._authorized():
            return self._send(401, {"error": "unauthorized"})

        day = parse_qs(parsed.query).get("day", [None])[0]
        if parsed.path == "/api/v1/events":
            return self._send(
                200, {"events": self.server.database.events(day)}
            )
        if parsed.path == "/api/v1/summary":
            days = aggregate_events(self.server.database.events(day))
            return self._send(200, {"day": day, "days": days})
        if parsed.path in ("/api/v1/export.csv", "/api/v1/summary.csv"):
            days = aggregate_events(self.server.database.events(day))
            return self._send_csv(200, summary_csv_text(days))
        if parsed.path in ("/", "/dashboard"):
            days = aggregate_events(self.server.database.events(day))
            return self._send_html(200, dashboard_html(days))
        return self._send(404, {"error": "not found"})

    def log_message(self, fmt, *args):
        logger.info("%s - %s", self.address_string(), fmt % args)


def create_server(host, port, database, token="", certfile=None, keyfile=None):
    httpd = ThreadingHTTPServer((host, port), RequestHandler)
    if certfile:
        context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
        context.load_cert_chain(certfile, keyfile)
        httpd.socket = context.wrap_socket(httpd.socket, server_side=True)
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
    parser.add_argument("--cert", default=None, help="certificat TLS (PEM)")
    parser.add_argument("--key", default=None, help="clé privée TLS (PEM)")
    args = parser.parse_args(argv)

    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(name)s: %(message)s",
    )

    httpd = create_server(
        args.host, args.port, args.db, args.token, args.cert, args.key
    )
    scheme = "https" if args.cert else "http"
    logger.info(
        "WorkAdapt server sur %s://%s:%d (db=%s, auth=%s)",
        scheme,
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
