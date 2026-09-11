"""Command-line demo for VideoFind."""

import argparse
from pathlib import Path

from .formatter import to_markdown
from .pipeline import VideoFindPipeline
from .url_loader import TranscriptUnavailableError


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Search inside a timestamped video transcript.")
    source = parser.add_mutually_exclusive_group(required=True)
    source.add_argument(
        "--transcript",
        type=Path,
        help="Path to an .srt, .txt, or .md transcript",
    )
    source.add_argument("--url", help="Public video URL with subtitles")
    parser.add_argument(
        "--cookies-from-browser",
        choices=("chrome", "safari", "firefox", "edge"),
        help="Use login cookies from a browser (often required for Bilibili subtitles)",
    )
    parser.add_argument("--question", required=True, help="Question to locate in the transcript")
    parser.add_argument("--limit", type=int, default=3, help="Maximum number of results")
    parser.add_argument(
        "--search-mode",
        choices=("semantic", "keyword"),
        default="semantic",
        help="Retrieval strategy (default: semantic)",
    )
    parser.add_argument(
        "--threshold",
        type=float,
        default=0.50,
        help="Minimum semantic Top1 score required for an answer (default: 0.50)",
    )
    return parser


def main() -> None:
    parser = build_parser()
    args = parser.parse_args()
    pipeline = VideoFindPipeline()
    options = {
        "limit": max(1, args.limit),
        "search_mode": args.search_mode,
        "threshold": args.threshold,
    }
    try:
        if args.url:
            results = pipeline.search_url(
                args.url,
                args.question,
                cookies_from_browser=args.cookies_from_browser,
                **options,
            )
        else:
            results = pipeline.search_file(args.transcript, args.question, **options)
    except (TranscriptUnavailableError, ValueError, RuntimeError) as exc:
        parser.error(str(exc))
    print(to_markdown(results))


if __name__ == "__main__":
    main()
