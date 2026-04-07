import os
import config
import thumbnails
import mimetypes
from pathlib import Path


def _is_thumbable_file(path_abs: Path) -> bool:
    if not path_abs.is_file():
        return False

    mime = mimetypes.guess_type(path_abs)[0] or ""
    return mime.startswith("image") or mime.startswith("video")


def _dir_has_thumbable_content(path_abs: Path) -> bool:
    try:
        children = list(path_abs.iterdir())
    except OSError:
        return False

    # Direct image/video files can be thumbnailed immediately.
    if any(_is_thumbable_file(child) for child in children):
        return True

    # Also consider immediate subdirectories that can produce thumbnails.
    for child in children:
        if not child.is_dir():
            continue

        try:
            if any(_is_thumbable_file(sub_child) for sub_child in child.iterdir()):
                return True
        except OSError:
            continue

    return False


def get_item_meta_type(path_rel, is_directory=False):
    item_path = config.CONTENT_DIR / path_rel

    if not os.path.exists(item_path):
        return {"error": "Item not found"}, 404

    if is_directory or os.path.isdir(item_path):
        return "dir"
    elif os.path.isfile(item_path):
        return (mimetypes.guess_type(item_path)[0] or "file").split("/")[0]
    else:
        return "unknown"


def get_item_meta(path_rel, extended=False):
    item_path = config.CONTENT_DIR / path_rel

    if not os.path.exists(item_path):
        raise FileNotFoundError("Item not found")

    is_directory = os.path.isdir(item_path)

    meta = {
        "name": item_path.name or "root",
        "type": get_item_meta_type(path_rel, is_directory),
        "atime": int(os.path.getatime(item_path)),
        "mtime": int(os.path.getmtime(item_path)),
    }

    if is_directory:
        meta["item_count"] = len(os.listdir(item_path))
        meta["has_thumb"] = _dir_has_thumbable_content(item_path)
    else:
        meta["size"] = os.path.getsize(item_path)
        meta["has_thumb"] = meta["type"] in ["image", "video"]

    return meta


def get_directory_listing(path_rel):
    target_dir: Path = config.CONTENT_DIR / path_rel

    meta = get_item_meta(path_rel)

    if not os.path.exists(target_dir):
        return {"error": "Directory not found"}, 404

    if not os.path.isdir(target_dir):
        return {"error": "Not a directory"}, 400

    count_dirs = 0
    items = []
    for item in os.listdir(target_dir):
        item_meta = get_item_meta(target_dir / item)
        if item_meta["type"] == "dir":
            count_dirs += 1
        if (
            config.FILTER_FILES
            and item_meta["type"] != "dir"
            and item_meta["type"] not in config.SUPPORTED_FILE_TYPES
        ):
            continue
        items.append(item_meta)

    items.sort(key=lambda x: (x["type"] != "dir", x["name"].lower()))

    dir_meta: dict = {
        "items": items,
        "dir_count": count_dirs,
        "file_count": len(items) - count_dirs,
    }

    if len(path_rel) > 0:
        dir_meta["parent"] = str(target_dir.parent.name)
        dir_meta["parent_path"] = "/" + str(
            target_dir.parent.relative_to(config.CONTENT_DIR)
        )

        if dir_meta["parent_path"] == "/.":
            dir_meta["parent_path"] = "/"

    return meta | dir_meta
