def test_defaults_are_merged(make_config):
    config = make_config()
    assert config.get("schema_version") == 3
    assert config.get("privacy")["rotate_daily"] is True
    assert config.get("privacy")["retention_days"] == 30
    assert config.log_path.name == "agent.log"


def test_nested_override_keeps_other_defaults(make_config):
    config = make_config(collect={"domains": True})
    collect = config.get("collect")
    assert collect["domains"] is True
    assert collect["window"] is True
    assert collect["programming_language"] is True


def test_sync_settings(make_config):
    config = make_config(sync={"enabled": True, "endpoint": "http://x"})
    assert config.get("sync")["enabled"] is True
    assert config.get("sync")["batch_size"] == 500
