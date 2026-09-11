"""Render search results as user-facing Markdown."""

from .models import SearchResult


def _timestamp(result: SearchResult) -> str:
    segment = result.segment
    return (
        segment.start_time
        if segment.start_time == segment.end_time
        else f"{segment.start_time}–{segment.end_time}"
    )


def _brief(text: str, limit: int = 48) -> str:
    clean = " ".join(text.split()).replace("|", "\\|")
    return clean if len(clean) <= limit else f"{clean[:limit].rstrip()}…"


def _duration(value) -> str:
    if value is None:
        return "未知"
    total = max(0, int(value))
    hours, remainder = divmod(total, 3600)
    minutes, seconds = divmod(remainder, 60)
    return f"{hours:02d}:{minutes:02d}:{seconds:02d}" if hours else f"{minutes:02d}:{seconds:02d}"


def to_markdown(
    results: list[SearchResult],
    question: str | None = None,
    video_info: dict | None = None,
) -> str:
    if not results:
        return "未找到与该问题高度相关的视频内容"

    query = question or results[0].title
    rows = [
        f"| {_timestamp(result)} | {_brief(result.summary or result.evidence)} |"
        for result in results
    ]
    evidence = [
        f"**{_timestamp(result)}**\n\n> {result.evidence}\n\n匹配分数：`{result.score:.4f}`"
        for result in results
    ]
    summaries = list(
        dict.fromkeys(
            _brief(result.summary or result.evidence).rstrip("。！？!?")
            for result in results
        )
    )
    summary = "；".join(summaries)
    rows_markdown = "\n".join(rows)
    evidence_markdown = "\n\n".join(evidence)
    info = video_info or {}
    return (
        "# VideoFind 检索结果\n\n"
        "## 🎬 视频信息\n\n"
        f"- **视频标题**：{info.get('title', '未知标题')}\n"
        f"- **URL**：{info.get('url', '未提供')}\n"
        f"- **平台**：{info.get('platform', '未知平台')}\n"
        f"- **视频长度**：{_duration(info.get('duration'))}\n"
        f"- **字幕来源**：{info.get('subtitle_source', '未知')}\n"
        f"- **Whisper模型**：{info.get('whisper_model') or '未使用'}\n\n"
        "## 🔍 查询问题\n\n"
        f"{query}\n\n"
        "## 📍 推荐观看位置\n\n"
        "| 时间 | 内容 |\n"
        "| --- | --- |\n"
        f"{rows_markdown}\n\n"
        "## 📝 原文依据\n\n"
        f"{evidence_markdown}\n\n"
        "## 🤖 内容总结\n\n"
        f"这些相关片段主要介绍：{summary}。"
    )
