"""Inspect and safely remove VideoFind cache entries."""

import json
from pathlib import Path
import re
import shutil

from .cache import DEFAULT_CACHE_ROOT


def _safe_video_id(video_id: str) -> str:
    if not re.fullmatch(r"[0-9A-Za-z_-]+", video_id):
        raise ValueError("VIDEO_ID 只能包含字母、数字、下划线和连字符")
    return video_id


def cache_info(root: str | Path = DEFAULT_CACHE_ROOT) -> dict:
    root_path = Path(root)
    entries = []
    if root_path.exists():
        for directory in sorted(path for path in root_path.iterdir() if path.is_dir()):
            metadata_path = directory / "metadata.json"
            if not metadata_path.exists():
                continue
            try:
                metadata = json.loads(metadata_path.read_text(encoding="utf-8"))
            except (OSError, json.JSONDecodeError):
                continue
            entries.append({"video_id": directory.name, **metadata})
    total_size = sum(path.stat().st_size for path in root_path.rglob("*") if path.is_file()) if root_path.exists() else 0
    return {"video_count": len(entries), "total_size": total_size, "videos": entries}


def clear_cache(root: str | Path = DEFAULT_CACHE_ROOT) -> None:
    root_path = Path(root)
    if root_path.exists():
        shutil.rmtree(root_path)


def remove_cache(video_id: str, root: str | Path = DEFAULT_CACHE_ROOT) -> bool:
    target = Path(root) / _safe_video_id(video_id)
    if not target.exists():
        return False
    shutil.rmtree(target)
    return True


def format_cache_info(info: dict) -> str:
    lines = [
        "# VideoFind 缓存信息",
        "",
        f"- 缓存视频数量：{info['video_count']}",
        f"- 总缓存大小：{info['total_size'] / 1024 / 1024:.2f} MB",
    ]
    for video in info["videos"]:
        lines.extend([
            "",
            f"## {video['video_id']}",
            f"- 视频标题：{video.get('video_title', '未知标题')}",
            f"- 视频平台：{video.get('video_platform', '未知平台')}",
            f"- 创建时间：{video.get('created_at', '未知')}",
            f"- Whisper模型：{video.get('whisper_model') or '未使用'}",
        ])
    return "\n".join(lines)
