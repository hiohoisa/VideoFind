"""Tests for saving Markdown results."""

from pathlib import Path
from tempfile import TemporaryDirectory
import unittest

from src.output import save_markdown


class OutputTests(unittest.TestCase):
    def test_generates_safe_output_filename(self) -> None:
        with TemporaryDirectory() as directory:
            target = save_markdown(
                "# 结果",
                "视频/标题",
                "问题：怎么做？",
                output_dir=directory,
            )
            self.assertEqual(target.parent, Path(directory))
            self.assertNotIn("/", target.name)
            self.assertEqual(target.read_text(encoding="utf-8"), "# 结果")

    def test_saves_to_explicit_path(self) -> None:
        with TemporaryDirectory() as directory:
            target = save_markdown(
                "# 结果",
                "标题",
                "问题",
                path=Path(directory) / "result.md",
            )
            self.assertTrue(target.exists())


if __name__ == "__main__":
    unittest.main()
