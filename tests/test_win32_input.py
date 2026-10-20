import sys

import pytest

pytestmark = pytest.mark.skipif(
    not sys.platform.startswith("win"), reason="Windows only"
)

from workadapt.platform.input_win32 import InputMonitor  # noqa: E402


def test_hooks_install_and_counters_shape():
    monitor = InputMonitor()
    try:
        assert monitor.start() is True
        assert monitor._thread is not None and monitor._thread.is_alive()
        assert all(hook for hook in monitor._hooks)

        counters = monitor.counters()
        assert set(counters) == {"keys", "clicks", "moves"}
        assert all(isinstance(value, int) for value in counters.values())
    finally:
        monitor.stop()

    assert not monitor._thread.is_alive()


def test_start_is_idempotent():
    monitor = InputMonitor()
    try:
        assert monitor.start() is True
        assert monitor.start() is True
    finally:
        monitor.stop()
