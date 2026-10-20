from workadapt.storage.store import EventStore


def record(event_id, start="2026-10-19T09:00:00+00:00"):
    return {"event_id": event_id, "event_start": start, "event_type": "window_activity"}


def test_deduplication(make_config):
    config = make_config()
    store = EventStore(config.output_path, config.database_path)

    assert store.save(record("a")) is True
    assert store.save(record("a")) is False
    assert store.count() == 1

    store.close()


def test_daily_rotation_uses_event_start(make_config):
    config = make_config()
    store = EventStore(
        config.output_path, config.database_path, rotate_daily=True
    )
    store.save(record("a", "2026-10-18T23:59:00+00:00"))

    rotated = config.output_path.parent / "events-2026-10-18.jsonl"
    assert rotated.exists()
    store.close()


def test_retention_prunes_rows_and_old_files(make_config):
    config = make_config()
    old_file = config.output_path.parent / "events-2000-01-01.jsonl"
    old_file.write_text('{"event_id": "old"}\n', encoding="utf-8")

    store = EventStore(
        config.output_path,
        config.database_path,
        rotate_daily=True,
        retention_days=1,
    )
    store.connection.execute(
        "INSERT INTO finalized_events (event_key, saved_at) VALUES (?, ?)",
        ("old", "2000-01-01T00:00:00+00:00"),
    )
    store.connection.commit()
    store.close()

    assert not old_file.exists()

    reopened = EventStore(
        config.output_path,
        config.database_path,
        rotate_daily=True,
        retention_days=1,
    )
    assert reopened.count() == 0
    reopened.close()


def test_retention_zero_keeps_everything(make_config):
    config = make_config()
    store = EventStore(config.output_path, config.database_path, retention_days=0)
    store.save(record("a"))
    assert store.count() == 1
    store.close()


def test_sync_state_roundtrip(make_config):
    config = make_config()
    store = EventStore(config.output_path, config.database_path)
    store.set_state("sync_cursors", '{"a": 1}')
    assert store.get_state("sync_cursors") == '{"a": 1}'
    assert store.get_state("missing", "fallback") == "fallback"
    store.close()
