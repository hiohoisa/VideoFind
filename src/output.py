"""Save rendered VideoFind Markdown with safe automatic filenames."""

from pathlib import Path
import re


def _safe_filename(value: str) -> str:
    cleaned = re.sub(r"[^\w\u4e00-\u9fff-]+", "_", value, flags=re.UNICODE).strip("_")
    return (cleaned[:80] or "videofind_result") + ".md"


def save_markdown(
    content: str,
    title: str,
    question: str,
    path: str | Path | None = None,
    output_dir: str | Path = "outputs",
) -> Path:
    target = Path(path) if path else Path(output_dir) / _safe_filename(f"{title}_{question}")
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(content, encoding="utf-8")
    return target
