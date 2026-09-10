"""Decide whether retrieved video segments contain a credible answer."""

from dataclasses import dataclass
import re

from .models import Segment


STOPWORDS = set("的了吗呢是和与或在把被也都就要怎么如何什么这个那个一个应该需要")


@dataclass(frozen=True)
class AnswerabilityConfig:
    """Tunable gates for accepting a semantic retrieval result."""

    threshold: float = 0.50
    minimum_score_gap: float = 0.05
    minimum_keyword_coverage: float = 0.10


@dataclass(frozen=True)
class AnswerabilityDecision:
    answerable: bool
    top1_score: float
    score_gap: float
    keyword_coverage: float


def _query_terms(text: str) -> set[str]:
    normalized = re.sub(r"[^a-z0-9\u4e00-\u9fff]", "", text.lower())
    latin = set(re.findall(r"[a-z0-9]+", text.lower()))
    chinese_chars = [char for char in normalized if "\u4e00" <= char <= "\u9fff"]
    chinese = {
        "".join(chinese_chars[index : index + 2])
        for index in range(len(chinese_chars) - 1)
        if not any(char in STOPWORDS for char in chinese_chars[index : index + 2])
    }
    return latin | chinese


def keyword_coverage(question: str, segment: Segment) -> float:
    """Measure how much explicit query evidence appears in the candidate."""
    terms = _query_terms(question)
    if not terms:
        return 0.0
    text = segment.text.lower()
    return sum(term in text for term in terms) / len(terms)


def assess_answerability(
    question: str,
    candidates: list[tuple[Segment, float]],
    config: AnswerabilityConfig | None = None,
) -> AnswerabilityDecision:
    """Accept Top1 only when similarity and at least one support signal are strong."""
    settings = config or AnswerabilityConfig()
    if not candidates:
        return AnswerabilityDecision(False, 0.0, 0.0, 0.0)

    top1_segment, top1_score = candidates[0]
    top2_score = candidates[1][1] if len(candidates) > 1 else 0.0
    score_gap = max(0.0, top1_score - top2_score)
    coverage = keyword_coverage(question, top1_segment)
    support_signal = (
        score_gap >= settings.minimum_score_gap
        or coverage >= settings.minimum_keyword_coverage
    )
    answerable = top1_score >= settings.threshold and support_signal
    return AnswerabilityDecision(
        answerable=answerable,
        top1_score=round(top1_score, 4),
        score_gap=round(score_gap, 4),
        keyword_coverage=round(coverage, 4),
    )
