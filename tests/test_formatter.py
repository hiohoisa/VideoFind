"""Tests for the product-style Markdown formatter."""

import unittest

from src.formatter import to_markdown
from src.models import SearchResult, Segment


class FormatterTests(unittest.TestCase):
    def test_structured_markdown_keeps_grounded_evidence(self) -> None:
        result = SearchResult(
            segment=Segment("07:37", "07:40", "现在开始讲鼻影画法"),
            score=0.8123,
            title="鼻影相关片段",
            summary="现在开始讲鼻影画法",
            evidence="现在开始讲鼻影画法",
        )

        output = to_markdown(
            [result],
            "鼻影怎么画？",
            {
                "title": "鼻影教程",
                "url": "https://example.com/video",
                "platform": "YouTube",
                "duration": 600,
                "subtitle_source": "Whisper",
                "whisper_model": "small",
            },
        )

        self.assertIn("# VideoFind 检索结果", output)
        self.assertIn("## 🎬 视频信息", output)
        self.assertIn("视频标题**：鼻影教程", output)
        self.assertIn("视频长度**：10:00", output)
        self.assertIn("Whisper模型**：small", output)
        self.assertIn("鼻影怎么画？", output)
        self.assertIn("| 07:37–07:40 | 现在开始讲鼻影画法 |", output)
        self.assertIn("> 现在开始讲鼻影画法", output)
        self.assertIn("匹配分数：`0.8123`", output)
        self.assertIn("## 🤖 内容总结", output)


if __name__ == "__main__":
    unittest.main()
