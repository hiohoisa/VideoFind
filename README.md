# VideoFind 🎬

**一个面向 AI Agent 的单视频知识检索 Skill，让长视频内容变得可搜索。**

![VideoFind Banner](docs/banner.png)

> **Banner 设计说明**：以视频时间轴、搜索定位和知识片段为核心视觉元素，表达“让长视频内容变得可搜索”的产品定位。Banner 仅用于项目展示，不代表独立 Web UI 已实现。

VideoFind 接收 Bilibili、YouTube 视频 URL 或本地字幕，通过平台字幕、Whisper ASR、Semantic Retrieval 和 Answerability 判断，返回带时间戳的原文证据与结构化 Markdown 结果。

## 为什么做这个项目

长视频包含大量有价值的信息，但用户通常只关心其中几个知识点。面对课程、访谈、求职经验或产品分享，手动观看 30–60 分钟视频、反复拖动进度条，成本很高。

VideoFind 解决一个具体问题：

> “视频中关于这个问题的内容在哪里？”

用户输入视频和自然语言问题，即可快速获得相关时间位置、字幕原文和简短说明。

## Product Research / 产品研究

VideoFind 的产品方向来自第一轮用户调研。调研共收到 9 份回答，去除 1 份重复回答后，共纳入 8 份独立有效样本。

调研发现，核心问题并不是用户单纯“不愿意看长视频”，而是：

> **长视频中的信息容易消费，但难以快速筛选、定位和复用。**

因此，VideoFind 当前重点解决：

- 长视频重点提炼
- 内容结构化
- 时间戳定位
- 原视频回溯
- 信息检索

产品研究路径：

```text
用户调研
   ↓
Problem Statement
   ↓
竞品分析
   ↓
产品机会
   ↓
MVP 定义
   ↓
VideoFind
```

完整研究记录：

- [第一轮用户调研](docs/user-research.md)
- [竞品分析、产品机会与 MVP 定义](docs/competitor-analysis-mvp.md)

## 核心能力

### 1. 视频 URL 输入

支持 Bilibili、YouTube，以及本地 `.srt`、`.txt`、`.md` 字幕或文本。需要登录态的 B站字幕，可在用户明确授权后通过 `--cookies-from-browser` 获取。

### 2. 智能字幕获取

VideoFind 采用字幕优先策略：

1. 优先获取平台人工字幕或自动字幕。
2. 没有可用字幕时，只下载音频并调用本地 Whisper ASR。
3. Whisper 输出统一转换为带开始时间、结束时间和原文的 Segment。

默认 Whisper 模型为 `small`，可通过 `--model` 切换。VideoFind 不下载完整视频，也不分析视频画面。

### 3. 语义检索

用户输入问题后，VideoFind 对字幕 Segment 进行召回和排序：

- 默认使用多语言 MiniLM Embedding 与 cosine similarity
- 支持独立 Keyword Retrieval
- MiniLM 不可用时降级为本地 character n-gram
- Answerability 根据相似度、候选差距和关键词覆盖判断证据是否充分

有效结果返回时间戳、字幕原文、基于原文的简短说明和匹配分数。证据不足时返回：

> 未找到与该问题高度相关的视频内容

### 4. AI辅助视频笔记生成

检索结果会整理为结构化 Markdown，包含视频信息、问题、推荐观看位置、原文依据和内容总结，并可通过 `--output` 保存。

当前版本基于检索片段生成结构化 Markdown 笔记，不支持完整视频级总结，也未接入 LLM 生成。

### 5. 缓存和结果管理

VideoFind 按视频 ID 缓存元数据、字幕、ASR 音频和转录结果，避免重复下载与重复 Whisper 转写。

```text
cache/<video_id>/
├── metadata.json
├── audio.wav
└── transcript.json
```

```bash
python3 -m src.cli --cache-info
python3 -m src.cli --remove-cache VIDEO_ID
python3 -m src.cli --clear-cache
```

平台字幕缓存可以直接复用；Whisper 缓存仅在模型一致时命中。切换模型会复用已有音频重新转写。

## Demo

![VideoFind Demo](docs/demo.png)

> **截图说明**：上图是当前 CLI 检索结果的界面化展示，内容来自仓库中的真实 Demo 字幕，不代表 Web UI 已实现。

### 完整案例：求职学习视频

**场景**

用户正在观看《找工作，看这个视频就够了》，希望跳过无关内容，直接定位简历项目经历的写法。

**输入视频**

```text
《找工作，看这个视频就够了》
字幕样本：demo/sample_subtitles.srt
```

**输入问题**

```text
简历项目经历怎么写？
```

**运行方式**

```bash
python3 -m src.cli \
  --transcript demo/sample_subtitles.srt \
  --question "简历项目经历怎么写？"
```

**返回时间戳**

| 时间 | 相关内容 |
|---|---|
| `03:18–04:12` | 项目经历应说明个人职责、行动和最终结果。 |
| `04:12–05:02` | 项目成果应尽量使用数据量化。 |

**原文依据**

> 项目经历是简历最重要的部分。不要只写参与了某项目，要说清楚你负责什么、采取了什么行动，以及最后带来了什么结果。

> 结果一定尽量量化，比如效率提升百分之三十、转化率增加八个百分点，或者服务了多少用户。

**结构化 Markdown 结果**

结果包含视频信息、查询问题、推荐观看位置、带时间戳原文和提取式内容总结，并可通过 `--output` 保存为笔记文件。截图中的时间戳与原文均可在 [`demo/sample_subtitles.srt`](demo/sample_subtitles.srt) 中核对。

更多直接命中、同义检索和无答案拒答案例见 [docs/demo.md](docs/demo.md)。

## Architecture

![VideoFind Architecture](docs/architecture.png)

```text
视频 URL / 本地字幕
        ↓
检查 video_id 缓存
        ├── 命中 → 读取 transcript.json
        │
        └── 未命中
               ↓
        人工字幕 / 自动字幕
               ↓ 无字幕
        audio.wav → Whisper ASR
               ↓
        Timestamped Segment
               ↓
        Embedding / Keyword Retrieval
               ↓
        Answerability
               ↓
        结构化 Markdown
               ↓
        终端输出 + 可选结果文件
```

当前重点是 **Retrieval + Evidence Layer**，模块职责和详细数据流见 [docs/architecture.md](docs/architecture.md)。

## Installation

### 安装为 Codex Skill

在 Codex 中输入：

```text
帮我安装这个 skill：
https://github.com/hiohoisa/VideoFind
```

也可以手动安装：

```bash
mkdir -p ~/.codex/skills
git clone https://github.com/hiohoisa/VideoFind.git ~/.codex/skills/videofind
cd ~/.codex/skills/videofind
```

### 安装 Python 环境

推荐使用 Python 3.10–3.12：

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

Whisper 需要本机安装 `ffmpeg`。macOS：

```bash
brew install ffmpeg
```

首次使用 MiniLM 或 Whisper 时需要下载对应模型。

## CLI Usage

### 搜索 URL 视频

```bash
python3 -m src.cli \
  --url "VIDEO_URL" \
  --question "视频中什么时候讲到了项目经历？"
```

VideoFind 会自动选择平台字幕或 Whisper。

### 使用 B站登录字幕

```bash
python3 -m src.cli \
  --url "BILIBILI_URL" \
  --cookies-from-browser chrome \
  --question "问题"
```

支持 `chrome`、`safari`、`firefox` 和 `edge`。VideoFind 不会默认读取浏览器 cookies。

### 切换 Whisper 模型

```bash
python3 -m src.cli \
  --url "VIDEO_URL" \
  --question "问题" \
  --model medium
```

`base` 更快、准确率较低；`small` 平衡速度与效果并作为默认值；`medium` 更慢、通常更准确。

### 搜索本地字幕

```bash
python3 -m src.cli \
  --transcript demo/sample_subtitles.srt \
  --question "简历项目经历怎么写？"
```

### 保存 Markdown 结果

```bash
python3 -m src.cli \
  --url "VIDEO_URL" \
  --question "问题" \
  --output result.md
```

使用裸 `--output` 时，结果自动保存到 `outputs/<视频标题>_<问题>.md`，终端仍显示完整结果。

### 调整检索参数

```bash
python3 -m src.cli \
  --transcript demo/sample_subtitles.srt \
  --question "简历项目经历怎么写？" \
  --search-mode semantic \
  --limit 3 \
  --threshold 0.50
```

## Limitations

- **不支持视频画面理解**：Whisper 仅处理音频，无法理解画面、图表、屏幕文字或手势。
- **不支持完整视频 LLM 总结**：当前内容总结只整理检索命中的字幕片段，不是完整视频级 grounded LLM summary。
- **不支持多视频知识库**：当前检索范围是单个视频，不能跨多个视频建立统一知识库。
- **不支持实时视频分析**：必须先获取字幕或完成音频转写，不能对直播或播放中的视频进行实时检索。
- MiniLM/Whisper 首次运行需要下载模型，长视频 ASR 会占用较多时间和内存。
- `cache/audio.wav` 可能占用较多磁盘空间，可使用缓存管理命令清理。
- Embedding 仅在单次运行中计算，尚未持久化到向量数据库。
- 当前没有 Web UI 或时间戳跳转界面。

后续方向包括画面理解、grounded LLM answer、完整学习笔记、向量数据库和 Web UI。以上均属于规划，不是当前能力。
