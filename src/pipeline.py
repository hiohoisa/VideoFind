"""End-to-end orchestration for the local VideoFind MVP."""

from pathlib import Path

from .asr import transcribe_audio
from .audio_loader import download_audio
from .answerability import AnswerabilityConfig, assess_answerability
from .cache import DEFAULT_CACHE_ROOT, VideoCache
from .models import SearchResult, Segment
from .retriever import retrieve
from .transcript import parse_transcript, parse_transcript_file
from .url_loader import extract_subtitle_data


def _format_seconds(value: float) -> str:
    total = max(0, int(value))
    hours, remainder = divmod(total, 3600)
    minutes, seconds = divmod(remainder, 60)
    return f"{hours:02d}:{minutes:02d}:{seconds:02d}" if hours else f"{minutes:02d}:{seconds:02d}"


class VideoFindPipeline:
    """Search timestamped text now; expose stable seams for future AI modules."""

    def __init__(self, cache_dir: str | Path | None = None) -> None:
        self.cache_dir = Path(cache_dir) if cache_dir else DEFAULT_CACHE_ROOT
        self.last_video_info: dict | None = None

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
        self.last_video_info = {
            "title": Path(path).name,
            "url": "本地文件",
            "platform": "Local",
            "duration": None,
            "subtitle_source": "local transcript",
            "whisper_model": None,
        }
        print("[4/4] 生成检索结果...")
        return self.search_segments(segments, question, limit, search_mode, threshold)

    def search_url(
        self,
        url: str,
        question: str,
        limit: int = 3,
        search_mode: str = "semantic",
        threshold: float = 0.50,
        cookies_from_browser: str | None = None,
        model_name: str = "small",
    ) -> list[SearchResult]:
        """Use platform subtitles or local Whisper ASR, then search them."""
        print("[1/4] 检查缓存...")
        cache = VideoCache(url, self.cache_dir)
        cached = cache.load(model_name)
        if cached:
            segments, source = cached
            print(f"[Cache]\n来源：{source}")
            self.last_video_info = cache.info(source)
            print("[4/4] 生成检索结果...")
            return self.search_segments(segments, question, limit, search_mode, threshold)

        print("[2/4] 获取字幕...")
        subtitle = extract_subtitle_data(url, cookies_from_browser)
        if subtitle.text is not None:
            print("[Subtitle]\n来源：平台人工字幕或自动字幕")
            segments = parse_transcript(subtitle.text)
            cache.save(segments, "platform subtitle", subtitle.title, subtitle.platform, None, subtitle.duration)
            self.last_video_info = cache.info("platform subtitle")
            print("[4/4] 生成检索结果...")
            return self.search_segments(segments, question, limit, search_mode, threshold)

        print(f"[3/4] Whisper转录中...\n[ASR]\n未检测到字幕，正在使用 Whisper {model_name} 转写")
        with download_audio(url, cookies_from_browser, cache.audio_path) as audio_path:
            raw_segments = transcribe_audio(audio_path, model_name)
        segments = [
            Segment(
                start_time=_format_seconds(item["start"]),
                end_time=_format_seconds(item["end"]),
                text=item["text"],
            )
            for item in raw_segments
        ]
        if not segments:
            raise RuntimeError("Whisper 未识别到可检索文本")
        cache.save(segments, "Whisper", subtitle.title, subtitle.platform, model_name, subtitle.duration)
        self.last_video_info = cache.info("Whisper")
        print("[4/4] 生成检索结果...")
        return self.search_segments(segments, question, limit, search_mode, threshold)

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
