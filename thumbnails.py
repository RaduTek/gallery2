import os
import config
import mimetypes
import subprocess
from PIL import Image
from pathlib import Path


def generate_video_thumbnail(path_abs: Path, thumb_path: Path, size=150):
    thumb_path.parent.mkdir(parents=True, exist_ok=True)

    probe_cmd = [
        "ffprobe",
        "-v",
        "error",
        "-show_entries",
        "format=duration",
        "-of",
        "default=noprint_wrappers=1:nokey=1",
        str(path_abs),
    ]

    try:
        probe_result = subprocess.run(
            probe_cmd,
            check=True,
            capture_output=True,
            text=True,
        )
        duration = float((probe_result.stdout or "").strip() or 0)
        seek_time = max(duration / 3, 0)

        ffmpeg_cmd = [
            "ffmpeg",
            "-y",
            "-ss",
            f"{seek_time:.3f}",
            "-i",
            str(path_abs),
            "-frames:v",
            "1",
            "-q:v",
            str(config.THUMB_QUALITY // 10),
            "-vf",
            f"crop='min(iw,ih)':'min(iw,ih)',scale={size}:{size}",
            str(thumb_path),
        ]

        subprocess.run(ffmpeg_cmd, check=True, capture_output=True, text=True)
    except (subprocess.CalledProcessError, FileNotFoundError, ValueError) as exc:
        raise RuntimeError(
            f"Failed to generate video thumbnail for {path_abs}"
        ) from exc


def generate_image_thumbnail(path_abs: Path, thumb_path: Path, size=150):
    with Image.open(path_abs) as img:
        has_alpha = img.mode in ("RGBA", "LA") or (
            img.mode == "P" and "transparency" in img.info
        )

        # Blend alpha channel with fixed color
        if has_alpha:
            rgba = img.convert("RGBA")
            background = Image.new("RGB", rgba.size, (32, 32, 32))
            background.paste(rgba, mask=rgba.getchannel("A"))
            img = background
        else:
            img = img.convert("RGB")

        # Crop center to square
        width, height = img.size
        side = min(width, height)
        left = (width - side) // 2
        top = (height - side) // 2
        img = img.crop((left, top, left + side, top + side))

        img.thumbnail((size, size))

        thumb_path.parent.mkdir(parents=True, exist_ok=True)
        img.save(thumb_path, "JPEG", quality=config.THUMB_QUALITY)


def generate_dir_thumbnail(path_abs: Path, thumb_path: Path, size=150):
    thumb_path.parent.mkdir(parents=True, exist_ok=True)

    media_items = []
    dir_items = []

    for child in path_abs.iterdir():
        try:
            created_at = child.stat().st_birthtime
        except OSError:
            continue

        if child.is_file():
            mime_type = mimetypes.guess_type(child)[0] or ""
            if mime_type.startswith("image") or mime_type.startswith("video"):
                media_items.append((created_at, child))
        elif child.is_dir():
            dir_items.append((created_at, child))

    media_items.sort(key=lambda item: item[0], reverse=True)
    dir_items.sort(key=lambda item: item[0], reverse=True)

    selected_paths = [path for _, path in media_items[:4]]
    if len(selected_paths) < 4:
        selected_paths.extend(
            [path for _, path in dir_items[: 4 - len(selected_paths)]]
        )

    thumbnail_paths = []
    for selected in selected_paths:
        try:
            selected_rel = selected.relative_to(config.CONTENT_DIR)
            child_thumb = get_thumbnail(selected_rel, size=size)
            if child_thumb.exists():
                thumbnail_paths.append(child_thumb)
        except Exception:
            continue

        if len(thumbnail_paths) == 4:
            break

    if not thumbnail_paths:
        raise RuntimeError(f"No thumbnail sources found for directory: {path_abs}")

    tile_size = max(size // 2, 1)
    mosaic = Image.new("RGB", (tile_size * 2, tile_size * 2), (32, 32, 32))
    tile_positions = [
        (0, 0),
        (tile_size, 0),
        (0, tile_size),
        (tile_size, tile_size),
    ]

    if (len(thumbnail_paths) == 1) and thumbnail_paths[0].is_file():
        with Image.open(thumbnail_paths[0]) as single_thumb:
            single_thumb = single_thumb.convert("RGB")
            single_thumb = single_thumb.resize((size, size))
            single_thumb.save(thumb_path, "JPEG", quality=config.THUMB_QUALITY)
        return

    for idx, tile_path in enumerate(thumbnail_paths[:4]):
        with Image.open(tile_path) as tile:
            tile = tile.convert("RGB")
            width, height = tile.size
            side = min(width, height)
            left = (width - side) // 2
            top = (height - side) // 2
            tile = tile.crop((left, top, left + side, top + side))
            tile = tile.resize((tile_size, tile_size))
            mosaic.paste(tile, tile_positions[idx])

    mosaic = mosaic.resize((size, size))
    mosaic.save(thumb_path, "JPEG", quality=config.THUMB_QUALITY)


def get_thumbnail(path_rel, size=150) -> Path:
    thumb_path = config.CACHE_DIR / f"{path_rel}.thumb.{size}.jpg"

    if not thumb_path.exists():
        path_abs = config.CONTENT_DIR / path_rel

        if not path_abs.exists():
            raise FileNotFoundError("Item not found")

        if os.path.isdir(path_abs):
            generate_dir_thumbnail(path_abs, thumb_path, size)
        elif os.path.isfile(path_abs):
            mime_type = mimetypes.guess_type(path_abs)[0] or ""
            if mime_type.startswith("image"):
                generate_image_thumbnail(path_abs, thumb_path, size)
            elif mime_type.startswith("video"):
                generate_video_thumbnail(path_abs, thumb_path, size)

    return thumb_path


def get_preview_image(path_rel, max_size=(1024, 1024)) -> Path:
    mime = mimetypes.guess_type(path_rel)[0] or ""
    path_abs = config.CONTENT_DIR / path_rel

    if mime == "image/gif":
        return path_abs

    preview_path = (
        config.CACHE_DIR / f"{path_rel}.preview.{max_size[0]}x{max_size[1]}.jpg"
    )

    if not preview_path.exists():
        if not path_abs.exists():
            raise FileNotFoundError(f"File not found: {path_abs}")

        with Image.open(path_abs) as img:
            has_alpha = img.mode in ("RGBA", "LA") or (
                img.mode == "P" and "transparency" in img.info
            )

            # Blend alpha channel with fixed color
            if has_alpha:
                rgba = img.convert("RGBA")
                background = Image.new("RGB", rgba.size, (32, 32, 32))
                background.paste(rgba, mask=rgba.getchannel("A"))
                img = background
            else:
                img = img.convert("RGB")

            # Resize to preview size
            img.thumbnail(max_size)

            preview_path.parent.mkdir(parents=True, exist_ok=True)
            img.save(preview_path, "JPEG", quality=config.PREVIEW_QUALITY)

    return preview_path
