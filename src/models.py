"""Core domain models for VideoFind."""

from dataclasses import dataclass


@dataclass(frozen=True)
class Segment:
    start_time: str
    end_time: str
    text: str


@dataclass(frozen=True)
class SearchResult:
    segment: Segment
    score: float
    title: str
    summary: str
    evidence: str
