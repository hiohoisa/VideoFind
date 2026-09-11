"""Tests for cache inspection and safe removal."""

from pathlib import Path
from tempfile import TemporaryDirectory
import unittest

from src.cache import VideoCache
from src.cache_manager import cache_info, clear_cache, format_cache_info, remove_cache
from src.models import Segment


class CacheManagerTests(unittest.TestCase):
    def _create_cache(self, root: str, url: str = "https://youtu.be/cache-one") -> VideoCache:
        cache = VideoCache(url, root)
        cache.save([Segment("00:01", "00:03", "文本")], "Whisper", "测试标题", "YouTube", "small", 60)
        return cache

    def test_cache_info(self) -> None:
        with TemporaryDirectory() as directory:
            self._create_cache(directory)
            info = cache_info(directory)
            self.assertEqual(info["video_count"], 1)
            self.assertEqual(info["videos"][0]["video_title"], "测试标题")
            self.assertIn("Whisper模型：small", format_cache_info(info))

    def test_clear_cache(self) -> None:
        with TemporaryDirectory() as directory:
            self._create_cache(directory)
            clear_cache(directory)
            self.assertFalse(Path(directory).exists())

    def test_remove_cache(self) -> None:
        with TemporaryDirectory() as directory:
            cache = self._create_cache(directory)
            self.assertTrue(remove_cache(cache.video_id, directory))
            self.assertFalse(cache.directory.exists())
            self.assertFalse(remove_cache(cache.video_id, directory))

    def test_remove_cache_rejects_unsafe_id(self) -> None:
        with TemporaryDirectory() as directory:
            with self.assertRaises(ValueError):
                remove_cache("../escape", directory)


if __name__ == "__main__":
    unittest.main()
