"""Unit tests for answerability gating without loading an embedding model."""

import unittest

from src.answerability import AnswerabilityConfig, assess_answerability
from src.models import Segment


class AnswerabilityTests(unittest.TestCase):
    def setUp(self) -> None:
        self.relevant = Segment(
            start_time="03:18",
            end_time="04:12",
            text="项目经历要说清楚自己的职责、行动和结果。",
        )
        self.unrelated = Segment(
            start_time="00:00",
            end_time="00:42",
            text="今天介绍找工作的完整流程。",
        )

    def test_accepts_strong_supported_candidate(self) -> None:
        decision = assess_answerability(
            "项目经历怎么写？",
            [(self.relevant, 0.74), (self.unrelated, 0.55)],
        )
        self.assertTrue(decision.answerable)

    def test_rejects_low_similarity_candidate(self) -> None:
        decision = assess_answerability(
            "Offer 应该如何选择？",
            [(self.unrelated, 0.27), (self.relevant, 0.20)],
        )
        self.assertFalse(decision.answerable)

    def test_threshold_is_configurable(self) -> None:
        decision = assess_answerability(
            "项目经历怎么写？",
            [(self.relevant, 0.74), (self.unrelated, 0.55)],
            AnswerabilityConfig(threshold=0.80),
        )
        self.assertFalse(decision.answerable)


if __name__ == "__main__":
    unittest.main()
