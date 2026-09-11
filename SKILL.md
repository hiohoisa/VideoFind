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

Do not claim to analyze video frames or generate LLM summaries. For a URL without usable subtitles, download audio only, transcribe it locally with Whisper, and delete the temporary audio after processing.

## Inputs

Require:

- **Source**: public video URL, local subtitle file, or transcript text.
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

1. For a URL, use `src/url_loader.py` and `yt-dlp` to obtain an existing manual or automatic subtitle track. Use browser cookies only with explicit user authorization.
2. If no subtitle is available, use `src/audio_loader.py` to download temporary audio only and `src/asr.py` to create timestamped text with local Whisper. Do not download the complete video; always clean up temporary audio.
3. Parse the downloaded subtitle, `.srt`, `.txt`, `.md`, or pasted text with `src/transcript.py`. Whisper output is converted directly into the same Segment model.
4. Convert the input into `Segment(start_time, end_time, text)` records. Plain text without timestamps remains searchable and uses `未提供` for time fields.
5. Retrieve Top-K candidates. Use MiniLM embeddings in the default `semantic` mode when the model loads successfully. If it does not, use the implemented character n-gram fallback. Use the separate `keyword` mode only when requested or useful for comparison.
6. In semantic mode, evaluate answerability using the Top1 score, Top1–Top2 gap, keyword coverage, and configured threshold (`0.50` by default).
7. Return accepted matches through the formatter, or the no-answer response when evidence is insufficient.

## Local usage

Run from the VideoFind repository root:

```bash
python3 -m src.cli \
  --transcript demo/sample_subtitles.srt \
  --question "简历项目经历怎么写？"
```

For a public video with subtitles, replace `--transcript` with `--url URL`.

Prefer evidence fidelity over broad interpretation. Never invent timestamps, quotes, or capabilities that are absent from the source and current implementation.
