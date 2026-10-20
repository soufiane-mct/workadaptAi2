import ctypes
import threading
from ctypes import wintypes

user32 = ctypes.WinDLL("user32", use_last_error=True)
kernel32 = ctypes.WinDLL("kernel32", use_last_error=True)

WH_KEYBOARD_LL = 13
WH_MOUSE_LL = 14

WM_QUIT = 0x0012
WM_KEYDOWN = 0x0100
WM_SYSKEYDOWN = 0x0104
WM_MOUSEMOVE = 0x0200
WM_LBUTTONDOWN = 0x0201
WM_RBUTTONDOWN = 0x0204
WM_MBUTTONDOWN = 0x0207

HOOKPROC = ctypes.WINFUNCTYPE(
    ctypes.c_ssize_t, ctypes.c_int, wintypes.WPARAM, wintypes.LPARAM
)


class MSG(ctypes.Structure):
    _fields_ = [
        ("hwnd", wintypes.HWND),
        ("message", wintypes.UINT),
        ("wParam", wintypes.WPARAM),
        ("lParam", wintypes.LPARAM),
        ("time", wintypes.DWORD),
        ("pt", wintypes.POINT),
    ]


user32.SetWindowsHookExW.argtypes = [
    ctypes.c_int,
    HOOKPROC,
    wintypes.HINSTANCE,
    wintypes.DWORD,
]
user32.SetWindowsHookExW.restype = wintypes.HHOOK
user32.UnhookWindowsHookEx.argtypes = [wintypes.HHOOK]
user32.UnhookWindowsHookEx.restype = wintypes.BOOL
user32.CallNextHookEx.argtypes = [
    wintypes.HHOOK,
    ctypes.c_int,
    wintypes.WPARAM,
    wintypes.LPARAM,
]
user32.CallNextHookEx.restype = ctypes.c_ssize_t
user32.GetMessageW.argtypes = [
    ctypes.POINTER(MSG),
    wintypes.HWND,
    wintypes.UINT,
    wintypes.UINT,
]
user32.GetMessageW.restype = ctypes.c_int
user32.TranslateMessage.argtypes = [ctypes.POINTER(MSG)]
user32.DispatchMessageW.argtypes = [ctypes.POINTER(MSG)]
user32.PostThreadMessageW.argtypes = [
    wintypes.DWORD,
    wintypes.UINT,
    wintypes.WPARAM,
    wintypes.LPARAM,
]
kernel32.GetCurrentThreadId.restype = wintypes.DWORD
kernel32.GetModuleHandleW.restype = wintypes.HMODULE


class InputMonitor:
    def __init__(self):
        self.keys = 0
        self.clicks = 0
        self.moves = 0
        self._lock = threading.Lock()
        self._thread = None
        self._thread_id = None
        self._running = False
        self._ready = threading.Event()
        self._hooks = []
        self._callbacks = []

    def start(self):
        if self._thread and self._thread.is_alive():
            return True
        self._running = True
        self._ready.clear()
        self._thread = threading.Thread(
            target=self._run, name="workadapt-input", daemon=True
        )
        self._thread.start()
        return self._ready.wait(2.0)

    def counters(self):
        with self._lock:
            return {
                "keys": self.keys,
                "clicks": self.clicks,
                "moves": self.moves,
            }

    def stop(self):
        self._running = False
        if self._thread_id:
            user32.PostThreadMessageW(self._thread_id, WM_QUIT, 0, 0)
        if self._thread and self._thread.is_alive():
            self._thread.join(timeout=2.0)

    def _run(self):
        self._thread_id = kernel32.GetCurrentThreadId()
        module = kernel32.GetModuleHandleW(None)

        keyboard_callback = HOOKPROC(self._keyboard)
        mouse_callback = HOOKPROC(self._mouse)
        self._callbacks = [keyboard_callback, mouse_callback]

        self._hooks = [
            user32.SetWindowsHookExW(WH_KEYBOARD_LL, keyboard_callback, module, 0),
            user32.SetWindowsHookExW(WH_MOUSE_LL, mouse_callback, module, 0),
        ]
        self._ready.set()

        message = MSG()
        while self._running:
            result = user32.GetMessageW(ctypes.byref(message), None, 0, 0)
            if result <= 0:
                break
            user32.TranslateMessage(ctypes.byref(message))
            user32.DispatchMessageW(ctypes.byref(message))

        for hook in self._hooks:
            if hook:
                user32.UnhookWindowsHookEx(hook)
        self._hooks = []

    def _keyboard(self, code, wparam, lparam):
        if code >= 0 and wparam in (WM_KEYDOWN, WM_SYSKEYDOWN):
            with self._lock:
                self.keys += 1
        return user32.CallNextHookEx(None, code, wparam, lparam)

    def _mouse(self, code, wparam, lparam):
        if code >= 0:
            if wparam in (WM_LBUTTONDOWN, WM_RBUTTONDOWN, WM_MBUTTONDOWN):
                with self._lock:
                    self.clicks += 1
            elif wparam == WM_MOUSEMOVE:
                with self._lock:
                    self.moves += 1
        return user32.CallNextHookEx(None, code, wparam, lparam)
