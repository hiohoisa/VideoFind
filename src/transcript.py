"""Parse SRT, TXT, and Markdown transcripts into a common Segment model."""

from pathlib import Path
import re

from .models import Segment


SUPPORTED_SUFFIXES = {".srt", ".txt", ".md"}
DEFAULT_SEGMENT_SECONDS = 16
TIME_TOKEN = r"\d{1,2}:\d{2}(?::\d{2})?(?:[,.]\d{1,3})?"
RANGE_LINE = re.compile(
    rf"^\[(?P<start>{TIME_TOKEN})\s*(?:-|–|—|-->)\s*(?P<end>{TIME_TOKEN})\]\s*(?P<text>.*)$"
)
SINGLE_TIME_LINE = re.compile(rf"^\[(?P<start>{TIME_TOKEN})\]\s*(?P<text>.*)$")
SRT_RANGE = re.compile(
    rf"^(?P<start>{TIME_TOKEN})\s*-->\s*(?P<end>{TIME_TOKEN})",
    re.MULTILINE,
)


def _time_to_seconds(value: str) -> float:
    parts = value.replace(",", ".").split(":")
    if len(parts) == 2:
        minutes, seconds = parts
        return int(minutes) * 60 + float(seconds)
    hours, minutes, seconds = parts
    return int(hours) * 3600 + int(minutes) * 60 + float(seconds)


def _format_time(seconds: float) -> str:
    total = max(0, int(seconds))
    hours, remainder = divmod(total, 3600)
    minutes, secs = divmod(remainder, 60)
    if hours:
        return f"{hours:02d}:{minutes:02d}:{secs:02d}"
    return f"{minutes:02d}:{secs:02d}"


def _normalize_time(value: str) -> str:
    return _format_time(_time_to_seconds(value))


def _clean_text(lines: list[str]) -> str:
    return " ".join(line.strip() for line in lines if line.strip()).strip()


def _parse_srt(content: str) -> list[Segment]:
    segments: list[Segment] = []
    blocks = re.split(r"\n\s*\n", content.strip())
    for block in blocks:
        lines = [line.strip("\ufeff ") for line in block.splitlines() if line.strip()]
        range_index = next((i for i, line in enumerate(lines) if SRT_RANGE.match(line)), None)
        if range_index is None:
            continue
        match = SRT_RANGE.match(lines[range_index])
        if match is None:
            continue
        text = _clean_text(lines[range_index + 1 :])
        if text:
            segments.append(
                Segment(
                    start_time=_normalize_time(match.group("start")),
                    end_time=_normalize_time(match.group("end")),
                    text=text,
                )
            )
    return segments


def _parse_bracketed(content: str) -> list[Segment]:
    raw_segments: list[dict[str, str | None]] = []
    current: dict[str, str | None] | None = None

    for raw_line in content.splitlines():
        line = raw_line.strip()
        range_match = RANGE_LINE.match(line)
        single_match = SINGLE_TIME_LINE.match(line)
        match = range_match or single_match
        if match:
            if current:
                raw_segments.append(current)
            current = {
                "start": match.group("start"),
                "end": match.groupdict().get("end"),
                "text": match.groupdict().get("text", "").strip(),
            }
        elif current and line and not line.startswith("#"):
            current["text"] = f"{current['text']} {line}".strip()

    if current:
        raw_segments.append(current)

    segments: list[Segment] = []
    for index, item in enumerate(raw_segments):
        text = str(item["text"] or "").strip()
        if not text:
            continue
        start_seconds = _time_to_seconds(str(item["start"]))
        if item["end"]:
            end_seconds = _time_to_seconds(str(item["end"]))
        elif index + 1 < len(raw_segments):
            end_seconds = _time_to_seconds(str(raw_segments[index + 1]["start"]))
        else:
            end_seconds = start_seconds + DEFAULT_SEGMENT_SECONDS
        segments.append(
            Segment(
                start_time=_format_time(start_seconds),
                end_time=_format_time(max(start_seconds, end_seconds)),
                text=text,
            )
        )
    return segments


def _parse_plain_text(content: str) -> list[Segment]:
    paragraphs = re.split(r"\n\s*\n", content.strip())
    return [
        Segment(start_time="未提供", end_time="未提供", text=text)
        for paragraph in paragraphs
        if (text := _clean_text([line for line in paragraph.splitlines() if not line.startswith("#")]))
    ]


def parse_transcript(content: str, source_format: str | None = None) -> list[Segment]:
    """Parse transcript content, optionally using a file suffix such as ``.srt``."""
    normalized_format = source_format.lower() if source_format else None
    if normalized_format and normalized_format not in SUPPORTED_SUFFIXES:
        raise ValueError(f"Unsupported transcript format: {normalized_format}")

    if normalized_format == ".srt" or SRT_RANGE.search(content):
        segments = _parse_srt(content)
    else:
        segments = _parse_bracketed(content)
    return segments or _parse_plain_text(content)


def parse_transcript_file(path: str | Path) -> list[Segment]:
    """Read and parse a supported subtitle or transcript file."""
    transcript_path = Path(path)
    suffix = transcript_path.suffix.lower()
    if suffix not in SUPPORTED_SUFFIXES:
        supported = ", ".join(sorted(SUPPORTED_SUFFIXES))
        raise ValueError(f"Unsupported transcript file '{suffix}'. Expected one of: {supported}")
    return parse_transcript(transcript_path.read_text(encoding="utf-8-sig"), suffix)
