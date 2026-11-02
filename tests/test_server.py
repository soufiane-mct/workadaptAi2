import json
import threading
import urllib.error
import urllib.request

import pytest

from server.app import create_server


def post(url, payload, token=None):
    request = urllib.request.Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        method="POST",
        headers={"Content-Type": "application/json"},
    )
    if token:
        request.add_header("Authorization", f"Bearer {token}")
    with urllib.request.urlopen(request) as response:
        return json.loads(response.read())


def get(url, token=None):
    request = urllib.request.Request(url)
    if token:
        request.add_header("Authorization", f"Bearer {token}")
    with urllib.request.urlopen(request) as response:
        return json.loads(response.read())


@pytest.fixture
def server(tmp_path):
    httpd = create_server(
        "127.0.0.1", 0, str(tmp_path / "server.db"), token="secret"
    )
    thread = threading.Thread(target=httpd.serve_forever, daemon=True)
    thread.start()
    yield f"http://127.0.0.1:{httpd.server_address[1]}"
    httpd.shutdown()
    httpd.server_close()
    httpd.database.close()


def sample_event():
    return {
        "event_id": "e1",
        "device_id": "device-1",
        "event_type": "window_activity",
        "event_start": "2026-10-19T09:00:00+00:00",
        "duration_seconds": 60,
        "app": {
            "name": "EXCEL.EXE",
            "tool": "Excel",
            "category": "office",
            "domains": ["office"],
        },
        "work_context": {"tasks": ["data_analysis"]},
        "role": {"inferred": "accounting"},
    }


def test_rejects_missing_token(server):
    with pytest.raises(urllib.error.HTTPError) as error:
        post(f"{server}/api/v1/events", {"events": []})
    assert error.value.code == 401


def test_ingest_dedup_and_summary(server):
    first = post(f"{server}/api/v1/events", {"events": [sample_event()]}, "secret")
    assert first == {"received": 1, "duplicates": 0}

    second = post(
        f"{server}/api/v1/events", {"events": [sample_event()]}, "secret"
    )
    assert second == {"received": 0, "duplicates": 1}

    summary = get(f"{server}/api/v1/summary?day=2026-10-19", "secret")
    stats = summary["days"]["2026-10-19"]
    assert stats["apps"]["EXCEL.EXE"] == 60
    assert stats["roles"]["accounting"] == 60


def test_health(server):
    assert get(f"{server}/health") == {"status": "ok"}


def test_dashboard_renders_summary(server):
    post(f"{server}/api/v1/events", {"events": [sample_event()]}, "secret")

    with urllib.request.urlopen(f"{server}/?token=secret") as response:
        page = response.read().decode("utf-8")

    assert response.status == 200
    assert "WorkAdapt" in page
    assert "2026-10-19" in page
    assert "EXCEL.EXE" in page


def test_dashboard_requires_token(server):
    with pytest.raises(urllib.error.HTTPError) as error:
        urllib.request.urlopen(f"{server}/")
    assert error.value.code == 401


def test_csv_export(server):
    post(f"{server}/api/v1/events", {"events": [sample_event()]}, "secret")

    with urllib.request.urlopen(
        f"{server}/api/v1/export.csv?token=secret"
    ) as response:
        body = response.read().decode("utf-8-sig")

    assert response.status == 200
    assert "dimension,name,minutes" in body
    assert "EXCEL.EXE" in body


def test_favicon(server):
    with urllib.request.urlopen(f"{server}/favicon.ico") as response:
        assert response.status == 204
