"""Download only a video's audio into an automatically cleaned temporary directory."""

from contextlib import contextmanager
from pathlib import Path
from tempfile import TemporaryDirectory
from typing import Iterator

from .url_loader import TranscriptUnavailableError


@contextmanager
def download_audio(url: str, cookies_from_browser: str | None = None) -> Iterator[Path]:
    """Yield a temporary MP3 downloaded with yt-dlp, then delete it."""
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
                "preferredcodec": "mp3",
                "preferredquality": "192",
            }],
        }
        if cookies_from_browser:
            options["cookiesfrombrowser"] = (cookies_from_browser, None, None, None)
        try:
            with yt_dlp.YoutubeDL(options) as downloader:
                downloader.extract_info(url, download=True)
        except Exception as exc:
            raise TranscriptUnavailableError(f"音频提取失败：{exc}") from exc

        audio_path = Path(directory) / "audio.mp3"
        if not audio_path.exists():
            raise TranscriptUnavailableError("音频提取失败：未生成 MP3 文件")
        yield audio_path
