import ctypes
import locale
from ctypes import wintypes

from .base import PlatformProbe, WindowInfo

user32 = ctypes.WinDLL("user32", use_last_error=True)
kernel32 = ctypes.WinDLL("kernel32", use_last_error=True)

PROCESS_QUERY_LIMITED_INFORMATION = 0x1000
SM_CMONITORS = 80
HKL = ctypes.c_void_p

user32.GetForegroundWindow.restype = wintypes.HWND
user32.GetWindowTextLengthW.argtypes = [wintypes.HWND]
user32.GetWindowTextLengthW.restype = ctypes.c_int
user32.GetWindowTextW.argtypes = [wintypes.HWND, wintypes.LPWSTR, ctypes.c_int]
user32.GetWindowTextW.restype = ctypes.c_int
user32.GetWindowThreadProcessId.argtypes = [wintypes.HWND, ctypes.POINTER(wintypes.DWORD)]
user32.GetWindowThreadProcessId.restype = wintypes.DWORD
user32.GetKeyboardLayout.argtypes = [wintypes.DWORD]
user32.GetKeyboardLayout.restype = HKL
user32.GetSystemMetrics.argtypes = [ctypes.c_int]
user32.GetSystemMetrics.restype = ctypes.c_int
user32.OpenInputDesktop.argtypes = [wintypes.DWORD, wintypes.BOOL, wintypes.DWORD]
user32.OpenInputDesktop.restype = wintypes.HANDLE
user32.CloseDesktop.argtypes = [wintypes.HANDLE]

kernel32.GetTickCount.restype = wintypes.DWORD
kernel32.GetTickCount64.restype = ctypes.c_ulonglong
kernel32.OpenProcess.argtypes = [wintypes.DWORD, wintypes.BOOL, wintypes.DWORD]
kernel32.OpenProcess.restype = wintypes.HANDLE
kernel32.QueryFullProcessImageNameW.argtypes = [
    wintypes.HANDLE, wintypes.DWORD, wintypes.LPWSTR, ctypes.POINTER(wintypes.DWORD)
]
kernel32.QueryFullProcessImageNameW.restype = wintypes.BOOL
kernel32.CloseHandle.argtypes = [wintypes.HANDLE]
kernel32.GetUserDefaultLocaleName.argtypes = [wintypes.LPWSTR, ctypes.c_int]
kernel32.GetUserDefaultLocaleName.restype = ctypes.c_int


class LASTINPUTINFO(ctypes.Structure):
    _fields_ = [("cbSize", wintypes.UINT), ("dwTime", wintypes.DWORD)]


class Win32Probe(PlatformProbe):
    name = "win32"

    def __init__(self, config=None):
        super().__init__(config)
        self._input_monitor = None

    def get_input_counters(self):
        if self._input_monitor is None:
            from .input_win32 import InputMonitor

            self._input_monitor = InputMonitor()
            if not self._input_monitor.start():
                self._input_monitor = None
                return None
        return self._input_monitor.counters()

    def close(self):
        if self._input_monitor is not None:
            self._input_monitor.stop()
            self._input_monitor = None

    def get_os_name(self):
        return "windows"

    def get_foreground_window(self):
        hwnd = user32.GetForegroundWindow()
        if not hwnd:
            return None

        length = user32.GetWindowTextLengthW(hwnd)
        buffer = ctypes.create_unicode_buffer(length + 1)
        user32.GetWindowTextW(hwnd, buffer, length + 1)
        title = buffer.value

        pid = wintypes.DWORD()
        user32.GetWindowThreadProcessId(hwnd, ctypes.byref(pid))

        return WindowInfo(
            app=self._process_name(pid.value),
            title=title,
            pid=pid.value or None,
        )

    def _process_name(self, pid):
        if not pid:
            return "unknown"
        handle = kernel32.OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, False, pid)
        if not handle:
            return "unknown"
        try:
            size = wintypes.DWORD(1024)
            buffer = ctypes.create_unicode_buffer(size.value)
            if kernel32.QueryFullProcessImageNameW(handle, 0, buffer, ctypes.byref(size)):
                return buffer.value.rsplit("\\", 1)[-1]
        finally:
            kernel32.CloseHandle(handle)
        return "unknown"

    def get_idle_seconds(self):
        info = LASTINPUTINFO()
        info.cbSize = ctypes.sizeof(LASTINPUTINFO)
        if not user32.GetLastInputInfo(ctypes.byref(info)):
            return None
        tick = kernel32.GetTickCount()
        elapsed_ms = (tick - info.dwTime) & 0xFFFFFFFF
        return elapsed_ms / 1000.0

    def get_keyboard_layout(self):
        hwnd = user32.GetForegroundWindow()
        thread_id = user32.GetWindowThreadProcessId(hwnd, None)
        hkl = user32.GetKeyboardLayout(thread_id)
        if not hkl:
            return None
        langid = int(hkl) & 0xFFFF
        return locale.windows_locale.get(langid)

    def get_system_language(self):
        buffer = ctypes.create_unicode_buffer(85)
        if kernel32.GetUserDefaultLocaleName(buffer, 85):
            return buffer.value
        return None

    def get_screen_count(self):
        count = user32.GetSystemMetrics(SM_CMONITORS)
        return count or None

    def is_session_locked(self):
        desktop = user32.OpenInputDesktop(0, False, 0x0100)
        if desktop:
            user32.CloseDesktop(desktop)
            return False
        return True
