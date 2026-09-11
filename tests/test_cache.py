"""Tests for the per-video transcript cache."""

import json
from pathlib import Path
from tempfile import TemporaryDirectory
import unittest
from unittest.mock import patch

from src.cache import VideoCache
from src.models import Segment
from src.pipeline import VideoFindPipeline


class CacheTests(unittest.TestCase):
    def test_first_run_creates_cache_files(self) -> None:
        with TemporaryDirectory() as directory:
            cache = VideoCache("https://youtu.be/video-one", directory)
            cache.directory.mkdir(parents=True)
            cache.audio_path.write_bytes(b"audio")
            cache.save([Segment("00:01", "00:03", "测试")], "Whisper", "标题", "YouTube", "small")

            self.assertTrue(cache.metadata_path.exists())
            self.assertTrue(cache.audio_path.exists())
            self.assertTrue(cache.transcript_path.exists())
            metadata = json.loads(cache.metadata_path.read_text(encoding="utf-8"))
            self.assertEqual(metadata["whisper_model"], "small")

    def test_second_run_reads_cached_transcript(self) -> None:
        with TemporaryDirectory() as directory:
            cache = VideoCache("https://youtu.be/video-one", directory)
            cache.save([Segment("00:01", "00:03", "缓存文本")], "Whisper", "标题", "YouTube", "small")

            segments, source = cache.load("small")
            self.assertEqual(segments[0].text, "缓存文本")
            self.assertEqual(source, "Whisper")
            self.assertIsNone(cache.load("base"))

    def test_pipeline_cache_hit_skips_original_flow(self) -> None:
        with TemporaryDirectory() as directory:
            url = "https://youtu.be/cached-video"
            cache = VideoCache(url, directory)
            cache.save(
                [Segment("00:01", "00:03", "直接读取缓存")],
                "platform subtitle",
                "标题",
                "YouTube",
                None,
            )
            with patch("src.pipeline.extract_subtitle_data") as extract:
                results = VideoFindPipeline(directory).search_url(
                    url, "缓存", search_mode="keyword"
                )
                self.assertEqual(results[0].segment.text, "直接读取缓存")
                extract.assert_not_called()

    def test_missing_cache_returns_none(self) -> None:
        with TemporaryDirectory() as directory:
            cache = VideoCache("https://youtu.be/missing", directory)
            self.assertIsNone(cache.load("small"))

    def test_cache_miss_runs_existing_subtitle_flow(self) -> None:
        subtitle = type("Subtitle", (), {
            "text": "1\n00:00:01,000 --> 00:00:03,000\n缓存未命中\n",
            "title": "标题",
            "platform": "YouTube",
            "duration": 60,
        })()
        with TemporaryDirectory() as directory, patch(
            "src.pipeline.extract_subtitle_data", return_value=subtitle
        ) as extract:
            results = VideoFindPipeline(directory).search_url(
                "https://youtu.be/cache-miss", "缓存", search_mode="keyword"
            )
            self.assertEqual(results[0].segment.text, "缓存未命中")
            extract.assert_called_once()

    def test_video_ids_use_isolated_directories(self) -> None:
        with TemporaryDirectory() as directory:
            first = VideoCache("https://youtube.com/watch?v=first", directory)
            second = VideoCache("https://youtube.com/watch?v=second", directory)
            self.assertNotEqual(first.directory, second.directory)

    def test_unsafe_video_id_falls_back_to_hash(self) -> None:
        with TemporaryDirectory() as directory:
            cache = VideoCache("https://youtube.com/watch?v=../../escape", directory)
            self.assertEqual(cache.directory.parent, Path(directory))


if __name__ == "__main__":
    unittest.main()
