"""Load an existing subtitle track from a public video URL with yt-dlp."""

from pathlib import Path
from tempfile import TemporaryDirectory
from urllib.parse import urlparse


class TranscriptUnavailableError(RuntimeError):
    """Raised when a URL has no subtitle track VideoFind can parse."""


def _choose_language(info: dict) -> str | None:
    available = set(info.get("subtitles") or {}) | set(info.get("automatic_captions") or {})
    for preferred in ("zh-Hans", "zh", "ai-zh", "en"):
        if preferred in available:
            return preferred
    return None


def extract_subtitle(url: str, cookies_from_browser: str | None = None) -> str | None:
    """Return an existing SRT/VTT subtitle track, or None when unavailable."""
    parsed = urlparse(url)
    if parsed.scheme not in {"http", "https"} or not parsed.netloc:
        raise ValueError("--url must be a valid HTTP or HTTPS video URL")

    try:
        import yt_dlp
    except ImportError as exc:
        raise RuntimeError("yt-dlp is required for --url; install requirements.txt") from exc

    base_options = {
        "quiet": True,
        "no_warnings": True,
        "ignoreconfig": True,
        "noplaylist": True,
        "skip_download": True,
        "writesubtitles": True,
        "writeautomaticsub": True,
    }
    if cookies_from_browser:
        base_options["cookiesfrombrowser"] = (cookies_from_browser, None, None, None)
    try:
        with yt_dlp.YoutubeDL(base_options) as downloader:
            info = downloader.extract_info(url, download=False)
    except Exception as exc:
        raise TranscriptUnavailableError(f"无法读取视频 URL：{exc}") from exc

    language = _choose_language(info or {})
    if language is None:
        return None

    with TemporaryDirectory(prefix="videofind-") as directory:
        output_template = str(Path(directory) / "subtitle.%(ext)s")
        options = {
            **base_options,
            "subtitleslangs": [language],
            "subtitlesformat": "srt/vtt/best",
            "outtmpl": output_template,
        }
        try:
            with yt_dlp.YoutubeDL(options) as downloader:
                downloader.extract_info(url, download=True)
        except Exception:
            return None

        subtitle_files = sorted(
            path
            for path in Path(directory).iterdir()
            if path.suffix.lower() in {".srt", ".vtt"}
        )
        if not subtitle_files:
            return None
        return subtitle_files[0].read_text(encoding="utf-8-sig")


def load_transcript_from_url(url: str, cookies_from_browser: str | None = None) -> str:
    """Compatibility wrapper that requires an existing subtitle track."""
    transcript = extract_subtitle(url, cookies_from_browser)
    if transcript is None:
        raise TranscriptUnavailableError("该视频没有可用字幕")
    return transcript
