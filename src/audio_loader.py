"""Download video audio with temporary staging and optional cache persistence."""

from contextlib import contextmanager
from pathlib import Path
import shutil
from tempfile import TemporaryDirectory
from typing import Iterator

from .url_loader import TranscriptUnavailableError


@contextmanager
def download_audio(
    url: str,
    cookies_from_browser: str | None = None,
    destination: str | Path | None = None,
) -> Iterator[Path]:
    """Yield WAV audio, optionally persisting it at a cache destination."""
    destination_path = Path(destination) if destination else None
    if destination_path and destination_path.exists():
        yield destination_path
        return
    try:
        import yt_dlp
    except ImportError as exc:
        raise RuntimeError("yt-dlp is required for URL audio extraction") from exc

    with TemporaryDirectory(prefix="videofind-audio-") as directory:
        options = {
            "quiet": True,
            "no_warnings": True,
            "ignoreconfig": True,
            "noplaylist": True,
            "format": "bestaudio/best",
            "outtmpl": str(Path(directory) / "audio.%(ext)s"),
            "postprocessors": [{
                "key": "FFmpegExtractAudio",
                "preferredcodec": "wav",
            }],
        }
        if cookies_from_browser:
            options["cookiesfrombrowser"] = (cookies_from_browser, None, None, None)
        try:
            with yt_dlp.YoutubeDL(options) as downloader:
                downloader.extract_info(url, download=True)
        except Exception as exc:
            raise TranscriptUnavailableError(f"音频提取失败：{exc}") from exc

        audio_path = Path(directory) / "audio.wav"
        if not audio_path.exists():
            raise TranscriptUnavailableError("音频提取失败：未生成 WAV 文件")
        if destination_path:
            destination_path.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(audio_path, destination_path)
            yield destination_path
        else:
            yield audio_path
