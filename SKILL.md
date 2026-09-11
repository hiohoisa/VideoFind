---
name: videofind
description: Search a local SRT, TXT, or Markdown video transcript for question-relevant moments and return timestamped evidence. Use when a user needs to locate specific information inside a long video's existing subtitles or transcript; video URL ingestion, ASR, and whole-video summarization are not supported.
---

# VideoFind

Use VideoFind as an AI-powered video knowledge retrieval skill for locating information in an existing video transcript.

## When to use

Use this skill when a user wants to find where a topic or answer appears in a long video and can provide one of these inputs:

- an `.srt` subtitle file;
- a `.txt` or `.md` transcript;
- pasted transcript text, optionally with timestamps.

Do not claim to download video URLs, transcribe audio, analyze frames, or generate LLM summaries. Ask the user for a supported subtitle or transcript when only a video URL is available.

## Inputs

Require:

- **Transcript**: local subtitle file or transcript text.
- **Question**: the information the user wants to locate.

Optional retrieval settings are result limit, `semantic` or `keyword` search mode, and answerability threshold. Preserve defaults unless the user requests a change.

## Output

For an answerable query, return the strongest matches with:

- **相关时间戳**: the Segment start and end time, or `未提供` for untimed text;
- **相关文本片段**: the matched Segment text;
- **原文依据**: text taken directly from that Segment;
- **匹配分数**: the retrieval score.

The current formatter also produces a question-derived title and an extractive summary. Do not present either as an LLM-generated interpretation.

For an unanswerable query, return exactly:

`未找到与该问题高度相关的视频内容`

Do not attach a forced timestamp or weak candidate to a rejected query.

## Workflow

1. Parse the `.srt`, `.txt`, `.md`, or pasted text with `src/transcript.py`.
2. Convert the input into `Segment(start_time, end_time, text)` records. Plain text without timestamps remains searchable and uses `未提供` for time fields.
3. Retrieve Top-K candidates. Use MiniLM embeddings in the default `semantic` mode when the model loads successfully. If it does not, use the implemented character n-gram fallback. Use the separate `keyword` mode only when requested or useful for comparison.
4. In semantic mode, evaluate answerability using the Top1 score, Top1–Top2 gap, keyword coverage, and configured threshold (`0.50` by default).
5. Return accepted matches through the formatter, or the no-answer response when evidence is insufficient.

## Local usage

Run from the VideoFind repository root:

```bash
python3 -m src.cli \
  --transcript demo/sample_subtitles.srt \
  --question "简历项目经历怎么写？"
```

Prefer evidence fidelity over broad interpretation. Never invent timestamps, quotes, or capabilities that are absent from the source and current implementation.
