"""Multilingual semantic retrieval with a dependency-free fallback."""

from __future__ import annotations

from collections import Counter
from functools import lru_cache
import math
import re
import sys
from typing import Iterable

from .models import Segment


MODEL_NAME = "paraphrase-multilingual-MiniLM-L12-v2"
FALLBACK_QUERY_HINTS = {
    "项目经历": "项目 负责 职责 行动 结果 STAR 量化 成果 贡献",
    "简历": "简历 求职",
}


class SemanticSearchUnavailable(RuntimeError):
    """Raised when the requested sentence-transformers backend is unavailable."""


@lru_cache(maxsize=1)
def _load_model():
    try:
        from sentence_transformers import SentenceTransformer
    except ImportError as exc:
        raise SemanticSearchUnavailable(
            "sentence-transformers is not installed; using the lightweight fallback"
        ) from exc
    return SentenceTransformer(MODEL_NAME)


def _cosine(left: Iterable[float], right: Iterable[float]) -> float:
    left_values = list(left)
    right_values = list(right)
    numerator = sum(a * b for a, b in zip(left_values, right_values))
    left_norm = math.sqrt(sum(value * value for value in left_values))
    right_norm = math.sqrt(sum(value * value for value in right_values))
    if not left_norm or not right_norm:
        return 0.0
    return numerator / (left_norm * right_norm)


def _char_ngram_vector(text: str) -> Counter[str]:
    """Create a stable local vector for environments without ML dependencies."""
    normalized = re.sub(r"\s+", "", text.lower())
    vector: Counter[str] = Counter()
    for width in (1, 2, 3):
        vector.update(normalized[index : index + width] for index in range(len(normalized) - width + 1))
    return vector


def _fallback_score(question: str, text: str) -> float:
    expanded_question = question
    for phrase, hints in FALLBACK_QUERY_HINTS.items():
        if phrase in question:
            expanded_question = f"{expanded_question} {hints}"
    query_vector = _char_ngram_vector(expanded_question)
    text_vector = _char_ngram_vector(text)
    keys = query_vector.keys() | text_vector.keys()
    return _cosine((query_vector[key] for key in keys), (text_vector[key] for key in keys))


class SemanticSearcher:
    """Rank transcript segments with MiniLM, falling back to local n-gram vectors."""

    def __init__(self, allow_fallback: bool = True) -> None:
        self.allow_fallback = allow_fallback
        self.backend = "not-loaded"

    def search(
        self, question: str, segments: list[Segment], limit: int = 3
    ) -> list[tuple[Segment, float]]:
        if not question.strip() or not segments:
            return []

        try:
            model = _load_model()
            embeddings = model.encode(
                [question, *(segment.text for segment in segments)],
                normalize_embeddings=True,
            )
            query_embedding = embeddings[0]
            scores = [float(query_embedding @ embedding) for embedding in embeddings[1:]]
            self.backend = MODEL_NAME
            print("[OK] Using MiniLM Embedding Search", file=sys.stderr)
        except Exception:
            if not self.allow_fallback:
                raise
            scores = [_fallback_score(question, segment.text) for segment in segments]
            self.backend = "character-ngram-fallback"
            print("[Warning] Using character fallback", file=sys.stderr)

        ranked = sorted(zip(segments, scores), key=lambda item: item[1], reverse=True)
        return [(segment, round(max(0.0, score), 4)) for segment, score in ranked[:limit]]


def semantic_search(
    question: str, segments: list[Segment], limit: int = 3
) -> list[tuple[Segment, float]]:
    """Convenience API returning segments ordered by semantic similarity."""
    return SemanticSearcher().search(question, segments, limit)
