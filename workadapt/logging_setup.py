import logging
import sys
from logging.handlers import RotatingFileHandler

_FORMAT = "%(asctime)s %(levelname)s %(name)s: %(message)s"


def setup_logging(config, console=True):
    path = config.log_path
    path.parent.mkdir(parents=True, exist_ok=True)

    root = logging.getLogger()
    root.setLevel(logging.INFO)

    for handler in list(root.handlers):
        root.removeHandler(handler)

    formatter = logging.Formatter(_FORMAT)

    file_handler = RotatingFileHandler(
        path, maxBytes=5_000_000, backupCount=3, encoding="utf-8"
    )
    file_handler.setFormatter(formatter)
    root.addHandler(file_handler)

    if console and sys.stderr is not None:
        try:
            stream_handler = logging.StreamHandler()
            stream_handler.setFormatter(formatter)
            root.addHandler(stream_handler)
        except Exception:
            pass

    return logging.getLogger("workadapt")
