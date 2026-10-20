import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from workadapt.config import DEFAULTS, Config, _deep_merge  # noqa: E402
from workadapt.enrichers.pipeline import Enricher  # noqa: E402
from workadapt.platform.base import PlatformProbe, WindowInfo  # noqa: E402


class FakeProbe(PlatformProbe):
    name = "fake"

    def __init__(self, config=None):
        super().__init__(config)
        self.window = WindowInfo(
            app="Code.exe",
            title="main.py - Visual Studio Code",
            pid=42,
        )
        self.idle = 0.0
        self.locked = False
        self.screens = 2
        self.counters = {"keys": 0, "clicks": 0, "moves": 0}

    def get_os_name(self):
        return "test"

    def get_foreground_window(self):
        return self.window

    def get_idle_seconds(self):
        return self.idle

    def get_screen_count(self):
        return self.screens

    def is_session_locked(self):
        return self.locked

    def get_input_counters(self):
        return dict(self.counters)


@pytest.fixture
def make_config(tmp_path):
    def _make(**overrides):
        data = _deep_merge(
            DEFAULTS,
            {
                "output_file": str(tmp_path / "events.jsonl"),
                "database_file": str(tmp_path / "state.db"),
                "log_file": str(tmp_path / "agent.log"),
            },
        )
        data = _deep_merge(data, overrides)
        return Config(data)

    return _make


@pytest.fixture
def fake_probe():
    return FakeProbe()


@pytest.fixture
def make_enricher(make_config):
    def _make(**overrides):
        return Enricher(make_config(**overrides))

    return _make
