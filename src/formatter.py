"""Render search results as user-facing Markdown."""

from .models import SearchResult


def to_markdown(results: list[SearchResult]) -> str:
    if not results:
        return "未找到与该问题高度相关的视频内容"

    blocks: list[str] = []
    for index, result in enumerate(results, start=1):
        segment = result.segment
        timestamp = (
            segment.start_time
            if segment.start_time == segment.end_time
            else f"{segment.start_time}–{segment.end_time}"
        )
        blocks.append(
            f"## 结果 {index}\n\n"
            f"- **相关时间戳**：{timestamp}\n"
            f"- **内容标题**：{result.title}\n"
            f"- **内容摘要**：{result.summary}\n"
            f"- **相关依据**：“{result.evidence}”\n"
            f"- **匹配分数**：{result.score:.4f}"
        )
    return "\n\n".join(blocks)
