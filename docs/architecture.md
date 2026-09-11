# VideoFind Architecture

VideoFind 优先从公开视频 URL 获取已有字幕；没有可用字幕时，下载临时音频并使用本地 Whisper ASR 转写。系统也可直接读取本地字幕文件，并统一完成 Segment 检索、证据判断和时间戳输出。

```mermaid
flowchart LR
    U[Public Video URL] --> Z[cache.py / video_id]
    Z -->|Cache hit| C[Segment List]
    Z -->|Cache miss| V[url_loader.py / yt-dlp]
    V -->|Subtitle available| B[transcript.py]
    V -->|No subtitle| X[audio_loader.py / cached audio.wav]
    X --> W[asr.py / Whisper small by default]
    W --> C
    B --> Z2[metadata.json / transcript.json]
    W --> Z2
    Z2 --> C
    A[Subtitle or Text File] --> B
    B --> C[Segment List]
    Q[User Question] --> D[retriever.py]
    C --> D
    D -->|semantic| E[MiniLM Embedding]
    E -.->|model unavailable| F[Character n-gram]
    D -->|keyword| G[Keyword Scoring]
    E --> H[Top-K Candidates]
    F --> H
    G --> H
    H --> I[answerability.py]
    I -->|accepted| J[pipeline.py]
    I -->|rejected| K[No-answer Response]
    J --> L[formatter.py]
    L --> M[Query / Watch Table / Evidence / Extractive Summary]
    M --> T[Terminal]
    M -->|--output| O[outputs / Markdown]
    CM[cache_manager.py] -->|inspect / remove| Z
```

## Module responsibilities

| Module | Responsibility |
|---|---|
| `url_loader.py` | Use `yt-dlp` to fetch an existing manual or automatic subtitle track from a public video URL |
| `audio_loader.py` | Download temporary audio only when no usable subtitle track exists |
| `asr.py` | Use local Whisper to create timestamped text from temporary audio |
| `cache.py` | Isolate cache entries by video ID and persist metadata, audio, and timestamped transcripts |
| `cache_manager.py` | Report cache count and size, or safely clear all/one validated video ID |
| `transcript.py` | Parse `.srt`, `.txt`, `.md`, and timestamped text into `Segment` objects |
| `semantic_search.py` | Rank Segment objects with MiniLM; fall back to character n-gram when necessary |
| `retriever.py` | Select semantic or keyword retrieval mode |
| `answerability.py` | Decide whether retrieved evidence is strong enough to return |
| `pipeline.py` | Orchestrate parsing, retrieval, gating, and result construction |
| `formatter.py` | Render a structured Markdown result with query, watch-position table, timestamped evidence, scores, and an extractive summary |
| `output.py` | Save the rendered Markdown to an explicit path or a sanitized name under `outputs/` |
| `cli.py` | Expose the local command-line interface |

## Current boundary

The current pipeline can start with a public URL regardless of subtitle availability: it checks the local per-video cache, uses platform captions first, and falls back to Whisper `small`. ASR audio is cached for reuse by other Whisper models. It does not inspect visual frames, call an LLM, or persist embeddings.
