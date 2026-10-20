import json

from workadapt.summary import aggregate_events, generate_daily_summary


def sample_event(start="2026-10-19T09:00:00+00:00", event_type="window_activity"):
    return {
        "event_type": event_type,
        "event_start": start,
        "duration_seconds": 60,
        "app": {
            "name": "EXCEL.EXE",
            "tool": "Excel",
            "category": "office",
            "domains": ["office", "finance"],
        },
        "work_context": {"tasks": ["data_analysis"]},
        "role": {"inferred": "accounting"},
        "programming_language": None,
        "input": {"keys": 10, "clicks": 2, "moves": 3},
    }


def test_aggregate_events():
    days = aggregate_events([sample_event()])
    stats = days["2026-10-19"]

    assert stats["apps"]["EXCEL.EXE"] == 60
    assert stats["domains"]["finance"] == 60
    assert stats["tasks"]["data_analysis"] == 60
    assert stats["roles"]["accounting"] == 60
    assert stats["input"]["keys"] == 10


def test_legacy_string_role_is_supported():
    event = sample_event()
    event["role"] = "general"
    days = aggregate_events([event])
    assert days["2026-10-19"]["roles"]["general"] == 60


def test_idle_seconds():
    idle = {
        "event_type": "idle_status",
        "event_start": "2026-10-19T09:00:00+00:00",
        "duration_seconds": 120,
        "activity_status": "active",
    }
    days = aggregate_events([idle])
    assert days["2026-10-19"]["active_seconds"] == 120


def test_generate_over_multiple_files(tmp_path):
    first = tmp_path / "events-2026-10-19.jsonl"
    second = tmp_path / "events-2026-10-20.jsonl"
    first.write_text(
        json.dumps(sample_event("2026-10-19T09:00:00+00:00")) + "\n",
        encoding="utf-8",
    )
    second.write_text(
        json.dumps(sample_event("2026-10-20T09:00:00+00:00")) + "\n",
        encoding="utf-8",
    )

    output = tmp_path / "summary.json"
    summary = generate_daily_summary([first, second], output)

    assert set(summary["days"]) == {"2026-10-19", "2026-10-20"}
    assert len(summary["source_files"]) == 2
    assert output.exists()


def test_generate_with_no_files(tmp_path):
    assert generate_daily_summary(tmp_path / "missing.jsonl") is None
