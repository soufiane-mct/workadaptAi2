from workadapt.export import summary_csv_text, summary_rows, write_summary_csv


def sample_days():
    return {
        "2026-10-19": {
            "active_minutes": 10.0,
            "inactive_minutes": 1.0,
            "window_events": 3,
            "input": {"keys": 5, "clicks": 2, "moves": 7},
            "tools": {"Excel": 600.0},
            "domains": {"finance": 600.0},
            "tasks": {"data_analysis": 600.0},
            "roles": {"accounting": 600.0},
            "programming_languages": {},
            "apps": {"EXCEL.EXE": 600.0},
        }
    }


def test_summary_rows_expose_dimensions():
    rows = summary_rows(sample_days())
    assert len(rows) == 5
    assert {row["dimension"] for row in rows} == {
        "tools",
        "domains",
        "tasks",
        "roles",
        "apps",
    }

    excel = next(row for row in rows if row["name"] == "Excel")
    assert excel["day"] == "2026-10-19"
    assert excel["minutes"] == 10.0
    assert excel["keys"] == 5


def test_write_summary_csv(tmp_path):
    path = tmp_path / "summary.csv"
    assert write_summary_csv(sample_days(), path) == 5

    text = path.read_text(encoding="utf-8-sig")
    header = text.splitlines()[0]
    assert header.startswith("day,active_minutes,inactive_minutes")
    assert "Excel" in text


def test_csv_text_empty():
    assert summary_csv_text({}).startswith("day,active_minutes")
