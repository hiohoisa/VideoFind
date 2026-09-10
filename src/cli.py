"""Command-line demo for VideoFind."""

import argparse
from pathlib import Path

from .formatter import to_markdown
from .pipeline import VideoFindPipeline


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Search inside a timestamped video transcript.")
    parser.add_argument(
        "--transcript",
        type=Path,
        required=True,
        help="Path to an .srt, .txt, or .md transcript",
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
    args = build_parser().parse_args()
    results = VideoFindPipeline().search_file(
        args.transcript,
        args.question,
        limit=max(1, args.limit),
        search_mode=args.search_mode,
        threshold=args.threshold,
    )
    print(to_markdown(results))


if __name__ == "__main__":
    main()
