"""Unit tests for URL subtitle loading without network access."""

from pathlib import Path
import sys
from types import SimpleNamespace
import unittest
from unittest.mock import patch

from src.url_loader import TranscriptUnavailableError, _choose_language, load_transcript_from_url


class _FakeYoutubeDL:
    info = {"subtitles": {"zh": [{}]}, "automatic_captions": {}}
    options_seen = []

    def __init__(self, options):
        self.options = options
        self.options_seen.append(options)

    def __enter__(self):
        return self

    def __exit__(self, *_args):
        return None

    def extract_info(self, _url, download=False):
        if download:
            path = Path(self.options["outtmpl"].replace("%(ext)s", "zh.srt"))
            path.write_text(
                "1\n00:00:01,000 --> 00:00:03,000\n测试字幕\n",
                encoding="utf-8",
            )
        return self.info


class URLLoaderTests(unittest.TestCase):
    def test_prefers_supported_subtitle_languages_in_order(self) -> None:
        info = {
            "subtitles": {"en": [{}], "zh": [{}]},
            "automatic_captions": {"ai-zh": [{}], "zh-Hans": [{}]},
        }
        self.assertEqual(_choose_language(info), "zh-Hans")

        del info["automatic_captions"]["zh-Hans"]
        self.assertEqual(_choose_language(info), "zh")

        del info["subtitles"]["zh"]
        self.assertEqual(_choose_language(info), "ai-zh")

        del info["automatic_captions"]["ai-zh"]
        self.assertEqual(_choose_language(info), "en")

        self.assertIsNone(_choose_language({"subtitles": {"danmaku": [{}]}}))

    def test_loads_existing_subtitle(self) -> None:
        fake_module = SimpleNamespace(YoutubeDL=_FakeYoutubeDL)
        with patch.dict(sys.modules, {"yt_dlp": fake_module}):
            transcript = load_transcript_from_url("https://example.com/video")
        self.assertIn("测试字幕", transcript)

    def test_passes_browser_cookies_to_yt_dlp(self) -> None:
        _FakeYoutubeDL.options_seen.clear()
        fake_module = SimpleNamespace(YoutubeDL=_FakeYoutubeDL)
        with patch.dict(sys.modules, {"yt_dlp": fake_module}):
            load_transcript_from_url("https://example.com/video", "chrome")
        self.assertEqual(
            _FakeYoutubeDL.options_seen[0]["cookiesfrombrowser"],
            ("chrome", None, None, None),
        )

    def test_rejects_video_without_subtitles(self) -> None:
        class NoSubtitleYoutubeDL(_FakeYoutubeDL):
            info = {"subtitles": {}, "automatic_captions": {}}

        fake_module = SimpleNamespace(YoutubeDL=NoSubtitleYoutubeDL)
        with patch.dict(sys.modules, {"yt_dlp": fake_module}):
            with self.assertRaises(TranscriptUnavailableError):
                load_transcript_from_url("https://example.com/video")

    def test_rejects_non_http_url(self) -> None:
        with self.assertRaises(ValueError):
            load_transcript_from_url("not-a-url")


if __name__ == "__main__":
    unittest.main()
