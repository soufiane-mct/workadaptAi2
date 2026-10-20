from datetime import datetime, timedelta, timezone

from workadapt.collectors.activity import ActivityCollector
from workadapt.enrichers.pipeline import Enricher
from workadapt.platform.base import WindowInfo

T0 = datetime(2026, 10, 19, 9, 0, 0, tzinfo=timezone.utc)


def make_collector(config, probe, role="general"):
    return ActivityCollector(probe, config, Enricher(config), "device-1", role)


def window_events(events):
    return [event for event in events if event["event_type"] == "window_activity"]


def test_window_segment_split(make_config, fake_probe):
    collector = make_collector(make_config(), fake_probe)

    assert collector.poll(T0) == []

    fake_probe.window = WindowInfo(app="chrome.exe", title="Jira", pid=7)
    events = collector.poll(T0 + timedelta(seconds=30))

    closed = window_events(events)
    assert len(closed) == 1
    assert closed[0]["data"]["app"] == "Code.exe"
    assert closed[0]["duration_seconds"] == 30.0
    assert closed[0]["programming_language"] == "Python"

    flushed = window_events(collector.flush(T0 + timedelta(seconds=45)))
    assert flushed[0]["data"]["app"] == "chrome.exe"


def test_idle_transition(make_config, fake_probe):
    collector = make_collector(make_config(), fake_probe)
    collector.poll(T0)

    fake_probe.idle = 999
    events = collector.poll(T0 + timedelta(seconds=10))

    idle = [event for event in events if event["event_type"] == "idle_status"]
    assert len(idle) == 1
    assert idle[0]["activity_status"] == "active"
    assert idle[0]["data"]["status"] == "not-afk"
    assert idle[0]["duration_seconds"] == 10.0

    flushed = [
        event
        for event in collector.flush(T0 + timedelta(seconds=20))
        if event["event_type"] == "idle_status"
    ]
    assert flushed[0]["activity_status"] == "inactive"
    assert flushed[0]["data"]["status"] == "afk"
    assert flushed[0]["duration_seconds"] == 10.0


def test_excluded_app_is_dropped(make_config, fake_probe):
    config = make_config(privacy={"exclude_apps": ["code.exe"]})
    collector = make_collector(config, fake_probe)
    collector.poll(T0)

    fake_probe.window = WindowInfo(app="chrome.exe", title="Jira", pid=7)
    events = collector.poll(T0 + timedelta(seconds=10))
    assert window_events(events) == []

    flushed = window_events(collector.flush(T0 + timedelta(seconds=20)))
    assert all(event["data"]["app"] != "Code.exe" for event in flushed)


def test_excluded_app_can_be_anonymized(make_config, fake_probe):
    config = make_config(
        privacy={"exclude_apps": ["code.exe"], "drop_excluded_apps": False}
    )
    collector = make_collector(config, fake_probe)
    collector.poll(T0)

    fake_probe.window = WindowInfo(app="chrome.exe", title="Jira", pid=7)
    events = window_events(collector.poll(T0 + timedelta(seconds=10)))

    assert events[0]["data"]["app"] == "[excluded]"
    assert events[0]["data"]["title"] == "[excluded]"
    assert events[0]["app"]["domains"] == []
    assert events[0]["programming_language"] is None


def test_input_metrics_delta(make_config, fake_probe):
    config = make_config(
        collect={"keyboard_metrics": True, "mouse_metrics": True}
    )
    collector = make_collector(config, fake_probe)

    fake_probe.counters = {"keys": 100, "clicks": 5, "moves": 50}
    collector.poll(T0)

    fake_probe.counters = {"keys": 140, "clicks": 9, "moves": 80}
    fake_probe.window = WindowInfo(app="chrome.exe", title="Jira", pid=7)
    events = window_events(collector.poll(T0 + timedelta(seconds=10)))

    assert events[0]["input"] == {"keys": 40, "clicks": 4, "moves": 30}


def test_input_metrics_absent_when_disabled(make_config, fake_probe):
    collector = make_collector(make_config(), fake_probe)
    collector.poll(T0)

    fake_probe.window = WindowInfo(app="chrome.exe", title="Jira", pid=7)
    events = window_events(collector.poll(T0 + timedelta(seconds=10)))
    assert "input" not in events[0]


def test_redact_titles(make_config, fake_probe):
    config = make_config(privacy={"redact_titles": True})
    collector = make_collector(config, fake_probe)
    collector.poll(T0)
    events = window_events(collector.flush(T0 + timedelta(seconds=5)))
    assert events[0]["data"]["title"] == "[redacted]"
