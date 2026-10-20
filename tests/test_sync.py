import json
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

import pytest

from workadapt.storage.store import EventStore
from workadapt.sync.uploader import EventUploader


class Received:
    batches = []
    auth = []

    @classmethod
    def reset(cls):
        cls.batches = []
        cls.auth = []


class Handler(BaseHTTPRequestHandler):
    def do_POST(self):
        length = int(self.headers.get("Content-Length", 0))
        payload = json.loads(self.rfile.read(length))
        Received.batches.append(payload["events"])
        Received.auth.append(self.headers.get("Authorization"))
        body = b'{"received": 1}'
        self.send_response(200)
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, *args):
        pass


@pytest.fixture
def endpoint():
    Received.reset()
    httpd = ThreadingHTTPServer(("127.0.0.1", 0), Handler)
    thread = threading.Thread(target=httpd.serve_forever, daemon=True)
    thread.start()
    yield f"http://127.0.0.1:{httpd.server_address[1]}/api/v1/events"
    httpd.shutdown()
    httpd.server_close()


def record(event_id):
    return {
        "event_id": event_id,
        "event_start": "2026-10-19T09:00:00+00:00",
        "event_type": "window_activity",
    }


def test_uploader_batches_and_advances_cursor(make_config, endpoint, monkeypatch):
    monkeypatch.setenv("WORKADAPT_TOKEN", "secret")
    config = make_config(
        sync={"enabled": True, "endpoint": endpoint, "batch_size": 2}
    )
    store = EventStore(config.output_path, config.database_path)
    for index in range(3):
        store.save(record(f"e{index}"))

    uploader = EventUploader(config, store)
    assert uploader.enabled is True
    assert uploader.upload_once() == 3
    assert [len(batch) for batch in Received.batches] == [2, 1]
    assert Received.auth[0] == "Bearer secret"

    assert uploader.upload_once() == 0
    store.close()


def test_disabled_without_endpoint(make_config):
    config = make_config(sync={"enabled": True, "endpoint": ""})
    store = EventStore(config.output_path, config.database_path)
    uploader = EventUploader(config, store)
    assert uploader.enabled is False
    assert uploader.start() is False
    store.close()
