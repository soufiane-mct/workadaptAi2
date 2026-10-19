import sys


def get_platform_probe(config=None):
    platform = sys.platform

    if platform.startswith("win"):
        from .win32 import Win32Probe

        return Win32Probe(config)

    if platform == "darwin":
        from .macos import MacOSProbe

        return MacOSProbe(config)

    from .linux import LinuxProbe

    return LinuxProbe(config)
