import os
from pathlib import Path


def get_path_var(name, default):
    value = os.getenv(name, default)
    return Path(os.path.expanduser(value)).resolve()


def get_bool_var(name, default=False) -> bool:
    return os.getenv(name, "true" if default else "false").lower() in (
        "1",
        "true",
        "yes",
        "on",
    )


CONTENT_DIR = get_path_var("CONTENT_DIR", "content")
CACHE_DIR = get_path_var("CACHE_DIR", "cache")
THUMB_QUALITY = int(os.getenv("THUMB_QUALITY", "60"))
PREVIEW_QUALITY = int(os.getenv("PREVIEW_QUALITY", "85"))
FILTER_FILES = get_bool_var("FILTER_FILES", True)

SUPPORTED_FILE_TYPES = ["audio", "video", "image"]
