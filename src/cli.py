"""Command-line demo for VideoFind."""

import argparse
from pathlib import Path

from .cache_manager import cache_info, clear_cache, format_cache_info, remove_cache
from .formatter import to_markdown
from .output import save_markdown
from .pipeline import VideoFindPipeline
from .url_loader import TranscriptUnavailableError


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Search inside a timestamped video transcript.")
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument(
        "--transcript",
        type=Path,
        help="Path to an .srt, .txt, or .md transcript",
    )
    mode.add_argument("--url", help="Public video URL")
    mode.add_argument("--cache-info", action="store_true", help="Show local video cache information")
    mode.add_argument("--clear-cache", action="store_true", help="Delete all local video cache entries")
    mode.add_argument("--remove-cache", metavar="VIDEO_ID", help="Delete one local video cache entry")
    parser.add_argument(
        "--cookies-from-browser",
        choices=("chrome", "safari", "firefox", "edge"),
        help="Use login cookies from a browser (often required for Bilibili subtitles)",
    )
    parser.add_argument("--question", help="Question to locate in the transcript")
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
    parser.add_argument(
        "--model",
        choices=("tiny", "base", "small", "medium", "large", "turbo"),
        default="small",
        help="Whisper model used only when a video has no subtitles (default: small)",
    )
    parser.add_argument(
        "--output",
        nargs="?",
        const="",
        metavar="PATH",
        help="Save Markdown to PATH, or use outputs/<title>_<question>.md when omitted",
    )
    return parser


def main() -> None:
    parser = build_parser()
    args = parser.parse_args()
    if args.cache_info:
        print(format_cache_info(cache_info()))
        return
    if args.clear_cache:
        clear_cache()
        print("已清理全部 VideoFind 缓存")
        return
    if args.remove_cache:
        removed = remove_cache(args.remove_cache)
        print("缓存已删除" if removed else "未找到指定缓存")
        return
    if not args.question:
        parser.error("--question is required with --url or --transcript")

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
                model_name=args.model,
                **options,
            )
        else:
            results = pipeline.search_file(args.transcript, args.question, **options)
    except (TranscriptUnavailableError, ValueError, RuntimeError) as exc:
        parser.error(str(exc))
    markdown = to_markdown(results, args.question, pipeline.last_video_info)
    print(markdown)
    if args.output is not None:
        target = save_markdown(
            markdown,
            title=(pipeline.last_video_info or {}).get("title", "VideoFind"),
            question=args.question,
            path=args.output or None,
        )
        print(f"\n结果已保存：{target}")


if __name__ == "__main__":
    main()
