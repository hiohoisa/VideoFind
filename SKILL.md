---
name: videofind
description: AI-powered single-video understanding skill that uses platform subtitles or local Whisper ASR for a public video URL, then retrieves relevant segments with timestamps and source evidence. Also supports SRT, TXT, and Markdown transcripts. Use when a user needs to locate specific information inside a long video.
---

# VideoFind

Use VideoFind as an AI-powered video knowledge retrieval skill for locating information in an existing video transcript.

## When to use

Use this skill when a user wants to find where a topic or answer appears in a long video and can provide one of these inputs:

- an `.srt` subtitle file;
- a `.txt` or `.md` transcript;
- pasted transcript text, optionally with timestamps.
- a public video URL with an accessible subtitle or automatic-caption track.

Do not claim to analyze video frames or generate LLM summaries. For a URL without usable subtitles, download audio only and transcribe it locally with Whisper. The default model is `small`; use another supported model only when the user requests it.

## Inputs

Require:

- **Source**: public video URL, local subtitle file, or transcript text.
- **Question**: the information the user wants to locate.

Optional settings are result limit, `semantic` or `keyword` search mode, answerability threshold, and Whisper model. Preserve defaults unless the user requests a change.

Cache-management requests are independent modes: use `--cache-info` to inspect entries, `--remove-cache VIDEO_ID` for one validated ID, and `--clear-cache` only when the user explicitly requests deleting all cache data.

## Output

For an answerable query, return the strongest matches with:

- **查询问题**: the user's original question;
- **推荐观看位置**: a Markdown table containing timestamp ranges and short extractive descriptions;
- **相关时间戳**: the Segment start and end time, or `未提供` for untimed text;
- **相关文本片段**: the matched Segment text;
- **原文依据**: text taken directly from that Segment;
- **匹配分数**: the retrieval score.
- **AI总结**: a concise extractive combination of retrieved Segment text.
- **视频信息**: title, URL, platform, duration, subtitle source, and Whisper model when available.

Do not add facts, labels, or interpretations that are absent from the retrieved text. The current AI summary is deterministic and extractive; do not present it as an LLM-generated interpretation.

For an unanswerable query, return exactly:

`未找到与该问题高度相关的视频内容`

Do not attach a forced timestamp or weak candidate to a rejected query.

When the user asks to save results, pass `--output PATH`. With a bare `--output`, save under `outputs/` using the sanitized video title and question. Continue showing the result in the terminal.

## Workflow

1. For a URL, derive its video ID and check `cache/<video_id>/transcript.json`. Reuse a platform-subtitle cache across models; reuse a Whisper transcript only when its recorded model matches the requested model.
2. On a cache miss, use `src/url_loader.py` and `yt-dlp` to obtain an existing manual or automatic subtitle track. Use browser cookies only with explicit user authorization.
3. If no subtitle is available, use `src/audio_loader.py` to download audio only and `src/asr.py` to create timestamped text with local Whisper `small` by default. Cache `audio.wav` so another model can reuse it; do not download the complete video.
4. Save video metadata and timestamped Segments through `src/cache.py`, then parse local subtitle or text inputs with `src/transcript.py`. Whisper output is converted directly into the same Segment model.
5. Convert the input into `Segment(start_time, end_time, text)` records. Plain text without timestamps remains searchable and uses `未提供` for time fields.
6. Retrieve Top-K candidates. Use MiniLM embeddings in the default `semantic` mode when the model loads successfully. If it does not, use the implemented character n-gram fallback. Use the separate `keyword` mode only when requested or useful for comparison.
7. In semantic mode, evaluate answerability using the Top1 score, Top1–Top2 gap, keyword coverage, and configured threshold (`0.50` by default).
8. Return accepted matches through the formatter, or the no-answer response when evidence is insufficient.

## Local usage

Run from the VideoFind repository root:

```bash
python3 -m src.cli \
  --transcript demo/sample_subtitles.srt \
  --question "简历项目经历怎么写？"
```

For a public video, replace `--transcript` with `--url URL`. Add `--model base|small|medium` only when overriding the default Whisper `small` model.

Prefer evidence fidelity over broad interpretation. Never invent timestamps, quotes, or capabilities that are absent from the source and current implementation.
