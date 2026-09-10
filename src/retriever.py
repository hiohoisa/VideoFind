"""Dependency-free retrieval baseline, designed to be replaced by embeddings."""

import re
from collections import Counter

from .models import Segment
from .semantic_search import semantic_search


STOPWORDS = set("的了吗呢是和与或在把被也都就要怎么如何什么这个那个一个可以应该" )

# A tiny, inspectable query-expansion layer for the demo. Replace with embeddings
# or an LLM query rewriter when the product connects to model infrastructure.
SEMANTIC_HINTS = {
    "项目经历": ("项目", "负责", "职责", "行动", "结果", "STAR", "量化", "成果", "贡献"),
    "简历": ("简历", "求职"),
}


def _terms(text: str) -> Counter[str]:
    normalized = re.sub(r"[^\w\u4e00-\u9fff]", "", text.lower())
    latin = re.findall(r"[a-z0-9]+", normalized)
    chinese = [char for char in normalized if "\u4e00" <= char <= "\u9fff" and char not in STOPWORDS]
    chinese += [
        normalized[index : index + 2]
        for index in range(max(0, len(normalized) - 1))
        if all("\u4e00" <= char <= "\u9fff" for char in normalized[index : index + 2])
    ]
    return Counter(latin + chinese)


def score_segment(question: str, segment: Segment) -> float:
    """Score token coverage with a small bonus for repeated evidence."""
    expanded_question = question
    active_hints: list[str] = []
    for phrase, hints in SEMANTIC_HINTS.items():
        if phrase in question:
            active_hints.extend(hints)
            expanded_question = f"{expanded_question} {' '.join(hints)}"
    query_terms = _terms(expanded_question)
    text_terms = _terms(segment.text)
    if not query_terms:
        return 0.0
    overlap = sum(min(count, text_terms[term]) for term, count in query_terms.items())
    coverage = overlap / sum(query_terms.values())
    density = overlap / max(1, sum(text_terms.values()))
    concept_bonus = 0.06 * sum(hint.lower() in segment.text.lower() for hint in active_hints)
    return round(coverage + 0.25 * density + concept_bonus, 4)


def keyword_search(
    question: str,
    segments: list[Segment],
    limit: int = 3,
    minimum_score: float = 0.08,
) -> list[tuple[Segment, float]]:
    """Return the strongest positive-scoring transcript segments."""
    ranked = sorted(
        ((segment, score_segment(question, segment)) for segment in segments),
        key=lambda item: item[1],
        reverse=True,
    )
    return [item for item in ranked if item[1] >= minimum_score][:limit]


def retrieve(
    question: str,
    segments: list[Segment],
    limit: int = 3,
    search_mode: str = "semantic",
) -> list[tuple[Segment, float]]:
    """Retrieve segments in semantic mode by default, retaining keyword search."""
    if search_mode == "semantic":
        return semantic_search(question, segments, limit)
    if search_mode == "keyword":
        return keyword_search(question, segments, limit)
    raise ValueError("search_mode must be 'keyword' or 'semantic'")
