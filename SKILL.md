---
name: videofind
description: Locate question-relevant moments in a video URL, subtitle transcript, or timestamped video text and return timestamps, section titles, concise summaries, and verbatim evidence. Use when a user wants to search inside long-form video content rather than receive a whole-video summary.
---

# VideoFind

Turn a natural-language question into traceable moments inside a video.

## Inputs

Accept both fields:

- `video`: a public video URL, `.srt` subtitle, `.txt`/`.md` transcript, or pasted video text. Prefer timestamped text when the user provides it.
- `question`: the specific information the user wants to find.

Optional preferences may include language, maximum number of results, or a desired level of detail. Do not invent preferences that were not provided.

## Output

Return the most relevant results first. Each result must contain:

1. **相关时间戳**: `MM:SS–MM:SS` or `HH:MM:SS–HH:MM:SS`.
2. **内容标题**: a short label describing the matched idea.
3. **内容摘要**: a faithful explanation of how the segment answers the question.
4. **原文依据**: a brief verbatim excerpt from the transcript.

If the source has no timestamps, explicitly mark the timestamp as `未提供`, while still returning the best matching passage. If no passage adequately answers the question, say so instead of fabricating evidence.

## Workflow

1. Identify whether the source is a URL or pasted text.
2. For a URL, obtain an accessible transcript or subtitles. For a local input, parse `.srt`, `.txt`, or `.md` into `start_time`, `end_time`, and `text`. Preserve source timestamps. If URL content cannot be accessed, ask the user for subtitles or transcript text.
3. Normalize obvious transcription noise without changing meaning. Keep a copy of the original wording for evidence.
4. Split the transcript into coherent, overlapping segments. Avoid cutting a sentence or speaker idea in half.
5. Retrieve candidate segments with `paraphrase-multilingual-MiniLM-L12-v2` embeddings by default. Use keyword mode only when explicitly requested or when comparing retrieval strategies.
6. Assess answerability using the Top1 similarity score, the Top1–Top2 score gap, and explicit query-keyword coverage. Use the configured threshold, defaulting to `0.50`.
7. If answerability fails, return exactly `未找到与该问题高度相关的视频内容` without a timestamp or forced candidate.
8. Re-rank answerable candidates for directness, evidence quality, and coverage of the question.
9. Merge adjacent candidates when they express one continuous answer.
10. Produce up to five concise results in the required format. Quote only text supported by the source.

## Quality Rules

- Treat timestamps and quotations as evidence: never guess them.
- Distinguish the speaker's claims from VideoFind's summary.
- Prefer a smaller number of strong matches over many weak matches.
- Never force a timestamp when the answerability gate rejects all candidates.
- Retain caveats, conditions, and negations that affect meaning.
- For conflicting passages, surface the disagreement rather than silently choosing one.
- Keep evidence excerpts short and sufficient for verification.

## Local MVP

For pasted timestamped text, run:

```bash
python3 -m src.cli --transcript demo/sample_transcript.md --question "简历项目经历怎么写？"
```

Install `sentence-transformers` to use the default multilingual embedding backend. When that optional dependency is unavailable, the local implementation uses a clearly identified character n-gram fallback so the workflow remains testable. Production versions should add platform-specific transcript adapters and persistent vector storage.
