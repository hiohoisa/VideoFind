"""Small file cache for timestamped video transcripts and ASR audio."""

from datetime import datetime, timezone
from hashlib import sha256
import json
from pathlib import Path
import re
from urllib.parse import parse_qs, urlparse

from .models import Segment

DEFAULT_CACHE_ROOT = Path(__file__).resolve().parent.parent / "cache"


def video_id_from_url(url: str) -> str:
    parsed = urlparse(url)
    host = parsed.netloc.lower()
    if "youtube.com" in host:
        video_id = parse_qs(parsed.query).get("v", [""])[0]
        if re.fullmatch(r"[0-9A-Za-z_-]+", video_id):
            return video_id
    if "youtu.be" in host:
        video_id = parsed.path.strip("/").split("/")[0]
        if re.fullmatch(r"[0-9A-Za-z_-]+", video_id):
            return video_id
    bilibili_id = re.search(r"BV[0-9A-Za-z]+", url, re.IGNORECASE)
    if bilibili_id:
        return bilibili_id.group(0)
    return sha256(url.encode("utf-8")).hexdigest()[:16]


class VideoCache:
    def __init__(self, url: str, root: str | Path = DEFAULT_CACHE_ROOT) -> None:
        self.url = url
        self.video_id = video_id_from_url(url)
        self.directory = Path(root) / self.video_id
        self.metadata_path = self.directory / "metadata.json"
        self.audio_path = self.directory / "audio.wav"
        self.transcript_path = self.directory / "transcript.json"

    def load(self, whisper_model: str) -> tuple[list[Segment], str] | None:
        if not self.metadata_path.exists() or not self.transcript_path.exists():
            return None
        try:
            metadata = json.loads(self.metadata_path.read_text(encoding="utf-8"))
            transcript = json.loads(self.transcript_path.read_text(encoding="utf-8"))
            source = transcript["source"]
            if source == "Whisper" and metadata.get("whisper_model") != whisper_model:
                return None
            segments = [
                Segment(item["start"], item["end"], item["text"])
                for item in transcript["segments"]
            ]
        except (KeyError, TypeError, ValueError, json.JSONDecodeError):
            return None
        return (segments, source) if segments else None

    def info(self, source: str) -> dict:
        metadata = json.loads(self.metadata_path.read_text(encoding="utf-8"))
        return {
            "title": metadata.get("video_title", "未知标题"),
            "url": metadata.get("video_url", self.url),
            "platform": metadata.get("video_platform", "未知平台"),
            "duration": metadata.get("video_duration"),
            "subtitle_source": source,
            "whisper_model": metadata.get("whisper_model"),
        }

    def save(
        self,
        segments: list[Segment],
        source: str,
        title: str,
        platform: str,
        whisper_model: str | None,
        duration: float | None = None,
    ) -> None:
        self.directory.mkdir(parents=True, exist_ok=True)
        metadata = {
            "video_url": self.url,
            "video_title": title,
            "video_platform": platform,
            "video_duration": duration,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "whisper_model": whisper_model,
        }
        transcript = {
            "source": source,
            "segments": [
                {"start": segment.start_time, "end": segment.end_time, "text": segment.text}
                for segment in segments
            ],
        }
        self.metadata_path.write_text(
            json.dumps(metadata, ensure_ascii=False, indent=2), encoding="utf-8"
        )
        self.transcript_path.write_text(
            json.dumps(transcript, ensure_ascii=False, indent=2), encoding="utf-8"
        )
