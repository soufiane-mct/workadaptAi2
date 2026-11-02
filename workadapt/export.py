import csv
import io
from pathlib import Path

from .summary import generate_daily_summary

CSV_FIELDS = [
    "day",
    "active_minutes",
    "inactive_minutes",
    "window_events",
    "keys",
    "clicks",
    "moves",
    "dimension",
    "name",
    "minutes",
]

DIMENSIONS = (
    "tools",
    "domains",
    "tasks",
    "roles",
    "programming_languages",
    "apps",
)


def summary_rows(days):
    rows = []
    for day, stats in sorted(days.items()):
        base = {
            "day": day,
            "active_minutes": stats.get("active_minutes", 0),
            "inactive_minutes": stats.get("inactive_minutes", 0),
            "window_events": stats.get("window_events", 0),
            "keys": stats.get("input", {}).get("keys", 0),
            "clicks": stats.get("input", {}).get("clicks", 0),
            "moves": stats.get("input", {}).get("moves", 0),
        }
        for dimension in DIMENSIONS:
            for name, seconds in stats.get(dimension, {}).items():
                row = dict(base)
                row["dimension"] = dimension
                row["name"] = name
                row["minutes"] = round(float(seconds) / 60, 3)
                rows.append(row)
    return rows


def summary_csv_text(days):
    buffer = io.StringIO()
    writer = csv.DictWriter(buffer, fieldnames=CSV_FIELDS)
    writer.writeheader()
    writer.writerows(summary_rows(days))
    return buffer.getvalue()


def write_summary_csv(days, output_path):
    rows = summary_rows(days)
    output_path = Path(output_path)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with output_path.open("w", newline="", encoding="utf-8-sig") as file:
        writer = csv.DictWriter(file, fieldnames=CSV_FIELDS)
        writer.writeheader()
        writer.writerows(rows)
    return len(rows)


def export_events_csv(files, output_path):
    summary = generate_daily_summary(files)
    if not summary:
        return 0
    return write_summary_csv(summary["days"], output_path)
