import json
from datetime import datetime, timezone
from pathlib import Path


def _empty_day():
    return {
        "events": 0,
        "window_events": 0,
        "idle_events": 0,
        "active_seconds": 0.0,
        "inactive_seconds": 0.0,
        "input": {"keys": 0, "clicks": 0, "moves": 0},
        "apps": {},
        "tools": {},
        "categories": {},
        "domains": {},
        "tasks": {},
        "roles": {},
        "programming_languages": {},
    }


def _add(bucket, key, seconds):
    key = key or "unknown"
    bucket[key] = bucket.get(key, 0.0) + seconds


def _round(bucket):
    return {
        key: round(value, 3)
        for key, value in sorted(
            bucket.items(), key=lambda item: item[1], reverse=True
        )
    }


def _accumulate(days, event):
    day = (event.get("event_start") or "")[:10]
    if not day:
        return

    stats = days.setdefault(day, _empty_day())
    stats["events"] += 1
    duration = float(event.get("duration_seconds", 0) or 0)

    event_type = event.get("event_type")
    if event_type == "window_activity":
        stats["window_events"] += 1
        app = event.get("app") or {}
        name = app.get("name") or "unknown"
        _add(stats["apps"], name, duration)
        _add(stats["tools"], app.get("tool") or name, duration)
        _add(stats["categories"], app.get("category") or "other", duration)
        for domain in app.get("domains", []) or []:
            _add(stats["domains"], domain, duration)

        context = event.get("work_context") or {}
        for task in context.get("tasks", []) or []:
            _add(stats["tasks"], task, duration)

        role = event.get("role")
        if isinstance(role, dict):
            role_name = role.get("inferred") or role.get("declared") or "unknown"
        else:
            role_name = role or "unknown"
        _add(stats["roles"], role_name, duration)

        language = event.get("programming_language")
        if language:
            _add(stats["programming_languages"], language, duration)

        input_stats = event.get("input") or {}
        for key in ("keys", "clicks", "moves"):
            stats["input"][key] += int(input_stats.get(key, 0) or 0)

    elif event_type == "idle_status":
        stats["idle_events"] += 1
        status = event.get("activity_status")
        if status == "active":
            stats["active_seconds"] += duration
        elif status == "inactive":
            stats["inactive_seconds"] += duration


def _finalize(days):
    for stats in days.values():
        for key in (
            "apps",
            "tools",
            "categories",
            "domains",
            "tasks",
            "roles",
            "programming_languages",
        ):
            stats[key] = _round(stats[key])
        stats["active_seconds"] = round(stats["active_seconds"], 3)
        stats["inactive_seconds"] = round(stats["inactive_seconds"], 3)
        stats["active_minutes"] = round(stats["active_seconds"] / 60, 2)
        stats["inactive_minutes"] = round(stats["inactive_seconds"] / 60, 2)


def aggregate_events(events):
    days = {}
    for event in events:
        _accumulate(days, event)
    _finalize(days)
    return days


def _input_files(inputs):
    if inputs is None:
        return []
    if isinstance(inputs, (str, Path)):
        inputs = [inputs]

    files = []
    for item in inputs:
        path = Path(item)
        if path.is_dir():
            files.extend(sorted(path.glob("*.jsonl")))
        elif path.exists():
            files.append(path)
    return files


def generate_daily_summary(inputs, output_path=None):
    files = _input_files(inputs)
    if not files:
        return None

    days = {}

    for path in files:
        with path.open("r", encoding="utf-8-sig") as file:
            for line in file:
                line = line.strip()
                if not line:
                    continue
                try:
                    event = json.loads(line)
                except json.JSONDecodeError:
                    continue
                _accumulate(days, event)

    _finalize(days)

    summary = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "source_files": [str(path) for path in files],
        "days": days,
    }

    if output_path:
        output_path = Path(output_path)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        with output_path.open("w", encoding="utf-8") as file:
            json.dump(summary, file, ensure_ascii=False, indent=2)
            file.write("\n")

    return summary
