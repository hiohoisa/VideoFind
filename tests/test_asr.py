"""Tests for subtitle-first URL processing and Whisper fallback."""

from contextlib import contextmanager
from pathlib import Path
import sys
from types import SimpleNamespace
import unittest
from unittest.mock import Mock, patch

from src.asr import transcribe_audio
from src.pipeline import VideoFindPipeline


@contextmanager
def _fake_audio(*_args):
    yield Path("audio.mp3")


class ASRTests(unittest.TestCase):
    @patch("src.pipeline.transcribe_audio")
    @patch("src.pipeline.download_audio")
    @patch("src.pipeline.extract_subtitle")
    def test_existing_subtitle_skips_whisper(self, subtitle, audio, transcribe) -> None:
        subtitle.return_value = "1\n00:00:01,000 --> 00:00:03,000\n鼻影画法\n"
        results = VideoFindPipeline().search_url("https://example.com/video", "鼻影", search_mode="keyword")
        self.assertEqual(results[0].segment.start_time, "00:01")
        audio.assert_not_called()
        transcribe.assert_not_called()

    @patch("src.pipeline.transcribe_audio")
    @patch("src.pipeline.download_audio", side_effect=_fake_audio)
    @patch("src.pipeline.extract_subtitle", return_value=None)
    def test_missing_subtitle_uses_whisper(self, _subtitle, _audio, transcribe) -> None:
        transcribe.return_value = [{"start": 65.0, "end": 70.0, "text": "现在开始画鼻影"}]
        results = VideoFindPipeline().search_url("https://example.com/video", "鼻影", search_mode="keyword")
        self.assertEqual(results[0].segment.start_time, "01:05")
        transcribe.assert_called_once_with(Path("audio.mp3"))

    def test_transcribe_audio_returns_timestamped_segments(self) -> None:
        model = Mock()
        model.transcribe.return_value = {
            "segments": [{"start": 1.5, "end": 3.0, "text": " 测试文本 "}],
        }
        fake_whisper = SimpleNamespace(load_model=Mock(return_value=model))
        with patch.dict(sys.modules, {"whisper": fake_whisper}):
            segments = transcribe_audio("audio.mp3")
        self.assertEqual(segments, [{"start": 1.5, "end": 3.0, "text": "测试文本"}])


if __name__ == "__main__":
    unittest.main()
