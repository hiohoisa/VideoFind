"""End-to-end orchestration for the local VideoFind MVP."""

from pathlib import Path

from .answerability import AnswerabilityConfig, assess_answerability
from .models import SearchResult, Segment
from .retriever import retrieve
from .transcript import parse_transcript, parse_transcript_file
from .url_loader import load_transcript_from_url


class VideoFindPipeline:
    """Search timestamped text now; expose stable seams for future AI modules."""

    def search(
        self,
        transcript: str,
        question: str,
        limit: int = 3,
        search_mode: str = "semantic",
        threshold: float = 0.50,
    ) -> list[SearchResult]:
        segments = parse_transcript(transcript)
        return self.search_segments(segments, question, limit, search_mode, threshold)

    def search_file(
        self,
        path: str | Path,
        question: str,
        limit: int = 3,
        search_mode: str = "semantic",
        threshold: float = 0.50,
    ) -> list[SearchResult]:
        """Parse a subtitle/text file, then retrieve relevant segments."""
        segments = parse_transcript_file(path)
        return self.search_segments(segments, question, limit, search_mode, threshold)

    def search_url(
        self,
        url: str,
        question: str,
        limit: int = 3,
        search_mode: str = "semantic",
        threshold: float = 0.50,
        cookies_from_browser: str | None = None,
    ) -> list[SearchResult]:
        """Load a public video's existing subtitles, then search them."""
        transcript = load_transcript_from_url(url, cookies_from_browser)
        return self.search(transcript, question, limit, search_mode, threshold)

    def search_segments(
        self,
        segments: list[Segment],
        question: str,
        limit: int = 3,
        search_mode: str = "semantic",
        threshold: float = 0.50,
    ) -> list[SearchResult]:
        candidate_limit = max(limit, 2) if search_mode == "semantic" else limit
        matches = retrieve(
            question,
            segments,
            limit=candidate_limit,
            search_mode=search_mode,
        )
        if search_mode == "semantic":
            decision = assess_answerability(
                question,
                matches,
                AnswerabilityConfig(threshold=threshold),
            )
            if not decision.answerable:
                return []
            matches = matches[:limit]
        return [self._present(segment, score, question) for segment, score in matches]

    @staticmethod
    def _present(segment, score: float, question: str) -> SearchResult:
        # Production version: replace these extractive fields with a grounded LLM call.
        topic = question.rstrip("？?。 ") or "相关内容"
        return SearchResult(
            segment=segment,
            score=score,
            title=f"关于“{topic}”的相关片段",
            summary=segment.text,
            evidence=segment.text,
        )
