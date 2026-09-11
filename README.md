# VideoFind 🎬

![VideoFind：AI 视频理解与知识检索工具](docs/banner.png)

**VideoFind 是一个面向 AI Agent / Codex 的单视频理解 Skill，支持从视频字幕中进行语义检索，并定位关键内容时间戳。**

> 当前版本是 subtitle-first MVP：优先使用平台字幕；没有可用字幕时，仅下载临时音频并使用本地 Whisper ASR 转写。系统不分析视频画面，也不执行 LLM 生成。

## 项目背景

在 30–60 分钟的长视频学习场景中，用户往往只关注其中几个知识点，却需要观看完整视频或反复拖动进度条。

VideoFind 希望解决一个具体问题：

> “我想找到视频中关于某个问题的内容在哪里？”

用户提供带字幕的公开视频 URL、字幕文件或文本，再用自然语言提问；VideoFind 将问题与字幕片段进行匹配，快速返回相关内容及其时间位置。适用内容包括求职经验、技术课程、产品分享和会议访谈。

## 核心能力

### ✅ 视频 URL 字幕获取

使用 `yt-dlp` 获取公开视频已有的人工字幕或平台自动字幕。Bilibili 字幕可显式复用浏览器登录 cookies。

### ✅ Whisper ASR fallback

没有可用字幕时，VideoFind 自动提取音频并使用本地 Whisper 生成带时间戳文本。默认模型为 `small`；只下载音频，不下载完整视频。

### ✅ 字幕解析

支持 `.srt`、`.txt`、`.md` 以及带时间戳文本，例如 `[00:08:14]` 和 `[00:08:14 - 00:08:30]`。没有时间信息的纯文本也可以检索，时间字段会显示为 `未提供`。

### ✅ Segment 构建

将不同格式统一转换为结构化片段：

```python
Segment(
    start_time="08:14",
    end_time="08:30",
    text="项目经历应该突出个人贡献",
)
```

### ✅ 语义检索

默认使用 `paraphrase-multilingual-MiniLM-L12-v2` 生成 Query 与 Segment Embedding，并通过 cosine similarity 完成 Semantic Retrieval 和 Top-K 排序。

### ✅ Keyword / 本地 fallback

提供独立 `keyword` 检索模式；当 MiniLM 或相关依赖无法加载时，语义模式会自动降级为本地 character n-gram。两者是不同的检索路径。

### ✅ Answerability 判断

综合 Top1 相似度、Top1/Top2 分差和查询关键词覆盖情况，判断候选片段是否包含足够证据。默认阈值为 `0.50`；证据不足时不会强制返回一个时间段。

### ✅ 时间戳与证据返回

有效结果包含：

- 开始时间与结束时间
- 匹配字幕 Segment
- 原始字幕证据
- 检索匹配分数
- 基于命中字幕生成的提取式总结

CLI 使用结构化 Markdown 展示查询问题、推荐观看位置表格、带时间戳的原文依据和简短总结。总结只组合已命中的字幕文本，不调用 LLM，也不会补充来源中不存在的信息。

无答案时返回：

> 未找到与该问题高度相关的视频内容

## 功能演示

![VideoFind 字幕语义检索演示](docs/demo.png)

> 图片是当前 CLI 能力的界面化展示，不代表 Web UI 已实现。图中的时间戳和原文均来自 [`demo/sample_subtitles.srt`](demo/sample_subtitles.srt)。

**用户问题**

> 这个视频讲了哪些求职技巧？

**检索结果**

| 时间戳 | 相关内容 | 原始字幕依据 |
|---|---|---|
| `00:00–00:42` | 求职完整流程 | 从岗位选择、简历准备，一直到面试复盘。 |
| `03:18–04:12` | 简历项目经历 | 要说清楚你负责什么、采取了什么行动，以及最后带来了什么结果。 |
| `04:12–05:02` | 量化项目成果 | 结果一定尽量量化，比如效率提升百分之三十。 |

直接命中、同义搜索和无答案拒答的详细案例见 **[完整 Demo](docs/demo.md)**。

## 系统架构

![VideoFind 系统架构](docs/architecture.png)

```text
公开视频 URL
      ↓
人工字幕 / 自动字幕优先
      ↓ 无可用字幕
临时音频 → Whisper ASR
      ↓
统一字幕文本
      ↓
字幕解析
      ↓
Segment 构建
      ↓
Embedding / Keyword Retrieval
      ↓
Top-K 候选
      ↓
Answerability 判断
      ↓
时间戳证据 / 无答案拒答
```

当前实现重点是 **Retrieval + Evidence Layer**：Segment 与 Embedding 在单次本地进程中处理，没有持久化向量数据库，也没有接入 LLM Agent。模块职责见 [docs/architecture.md](docs/architecture.md)。

## Skill 安装

当前仓库根目录包含 [`SKILL.md`](SKILL.md)，其中定义了 Skill 的触发场景、输入、输出、工作流程和能力边界。

### 使用 Codex 安装

在 Codex 中输入：

```text
帮我安装这个 skill：
https://github.com/hiohoisa/VideoFind
```

安装后，Codex 可以读取 `SKILL.md`，识别用户提供的字幕文件和问题，并按照 VideoFind 工作流调用本地检索能力。

### 手动安装

```bash
mkdir -p ~/.codex/skills
git clone https://github.com/hiohoisa/VideoFind.git ~/.codex/skills/videofind
```

内置 Skill Installer 安装到 `$CODEX_HOME/skills`；未设置 `CODEX_HOME` 时默认使用 `~/.codex/skills`。如果安装后没有立即显示，请重启 Codex。Skill 格式与发现规则见 [OpenAI 官方文档](https://developers.openai.com/codex/skills)。

### 安装 Python 环境

```bash
cd ~/.codex/skills/videofind
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

首次使用 MiniLM 时需要下载模型。如果加载失败，CLI 会显示 warning 并切换到 character fallback。

## 使用方法

输入带字幕的公开视频 URL：

```bash
python3 -m src.cli \
  --url "https://b23.tv/tNGIF4B" \
  --question "为什么非洲旅行成本这么高？"
```

`--url` 与 `--transcript` 二选一。URL 视频优先使用平台字幕；没有可用字幕时自动进入 Whisper ASR，无需更改命令。

B站自动字幕可能需要登录。此时可显式复用已登录浏览器的 cookies：

```bash
python3 -m src.cli \
  --url "https://www.bilibili.com/video/BV..." \
  --cookies-from-browser chrome \
  --question "视频讲了什么？"
```

支持 `chrome`、`safari`、`firefox` 和 `edge`；VideoFind 不会默认读取浏览器 cookies。

在仓库根目录运行默认语义检索：

```bash
python3 -m src.cli \
  --transcript demo/sample_subtitles.srt \
  --question "简历项目经历怎么写？"
```

调整检索模式、结果数量和 Answerability 阈值：

```bash
python3 -m src.cli \
  --transcript demo/sample_subtitles.srt \
  --question "简历项目经历怎么写？" \
  --search-mode semantic \
  --limit 3 \
  --threshold 0.50
```

使用关键词模式：

```bash
python3 -m src.cli \
  --transcript demo/sample_subtitles.srt \
  --question "项目经历" \
  --search-mode keyword
```

CLI 输出结构化 Markdown，包括查询问题、推荐观看位置、带时间戳的原文依据、匹配分数和提取式 AI总结。当前总结直接组合命中的字幕 Segment，不是 LLM 生成内容。

## Whisper模型说明

无字幕视频默认使用 Whisper `small`。它比 `base` 更准确，但转写速度更慢、占用内存更多；`medium` 通常能进一步提升识别质量，同时需要更长处理时间和更多资源。

| 模型 | 相对速度 | 相对准确率 | 适用场景 |
|---|---|---|---|
| `base` | 快 | 基础 | 快速预览、清晰人声 |
| `small` | 中等 | 较高 | 默认选择，平衡速度与效果 |
| `medium` | 慢 | 更高 | 口音、噪声或准确率优先 |

CLI 接口保持不变；需要切换模型时增加可选参数：

```bash
python3 -m src.cli \
  --url "VIDEO_URL" \
  --question "问题" \
  --model medium
```

`--model` 仅在 Whisper ASR 路径中生效。还支持 `tiny`、`large` 和 `turbo`。

## 缓存机制说明

VideoFind 按 YouTube/Bilibili 视频 ID 缓存结果，避免同一视频重复获取字幕、下载音频或执行 Whisper。默认目录为 `cache/<video_id>/`，并已加入 `.gitignore`：

```text
cache/<video_id>/
├── metadata.json
├── audio.wav
└── transcript.json
```

- `metadata.json`：视频 URL、标题、平台、创建时间和 Whisper 模型。
- `audio.wav`：仅无字幕 ASR 路径生成，供后续更换模型时复用。
- `transcript.json`：字幕来源以及带开始时间、结束时间和原文的 Segment。

平台字幕缓存可直接复用；Whisper 缓存仅在模型一致时命中。更换 `--model` 会复用已有音频并重新转写。

### 缓存管理 CLI

```bash
# 查看视频数量、总大小和各缓存元数据
python3 -m src.cli --cache-info

# 删除指定视频缓存
python3 -m src.cli --remove-cache VIDEO_ID

# 清理全部缓存
python3 -m src.cli --clear-cache
```

`--remove-cache` 只接受字母、数字、下划线和连字符组成的视频 ID，防止缓存目录路径逃逸。

## 输出文件

终端始终显示完整结果。传入路径可额外保存 Markdown：

```bash
python3 -m src.cli \
  --url "VIDEO_URL" \
  --question "问题" \
  --output result.md
```

只写 `--output` 时，结果自动保存到 `outputs/<视频标题>_<问题>.md`；目录自动创建，自动文件名会过滤不安全字符。

Markdown 结果结构：

```text
# VideoFind 检索结果
## 🎬 视频信息
  标题 / URL / 平台 / 时长 / 字幕来源 / Whisper模型
## 🔍 查询问题
## 📍 推荐观看位置
## 📝 原文依据
## 🤖 内容总结
```

## 数据流程图

```text
URL 输入
   ↓
检查 video_id 缓存 ── 命中 ──→ 读取 transcript.json
   ↓ 未命中
获取人工字幕 / 自动字幕
   ↓ 无字幕
下载并缓存 audio.wav → Whisper ASR
   ↓
保存 transcript.json
   ↓
Segment → Embedding → Semantic Retrieval → Answerability → Markdown 输出
                                                           ↓
                                                  终端 + 可选 outputs/*.md
```

## 技术实现

| 技术 | 当前用途 |
|---|---|
| **Python** | 字幕解析、检索 Pipeline、CLI 与自动化测试 |
| **yt-dlp** | 获取平台字幕；无字幕时只下载临时音频，不下载完整视频 |
| **Whisper ASR** | 无字幕时使用默认 `small` 模型生成带时间戳转录 |
| **Local Cache** | 按视频 ID 缓存字幕、ASR 音频、转录与元数据 |
| **Embedding** | 将用户问题和字幕 Segment 转换为语义向量 |
| **MiniLM** | 提供支持中文的轻量多语言表示 |
| **Semantic Retrieval** | 使用 cosine similarity 和 Top-K 进行候选排序 |
| **Answerability** | 基于分数、候选差距和关键词覆盖进行拒答判断 |
| **RAG Retrieval Layer** | 已完成 Retrieval 与 Evidence 层，尚未接入 LLM Generation |

## 效果评测

当前评测基于 [`demo/sample_subtitles.srt`](demo/sample_subtitles.srt) 和 10 个问题，覆盖直接命中、同义改写与视频中不存在三类场景。结果使用人工预期时间段判定，完整记录见 [evaluation.md](evaluation.md)。

| 测试类型 | Answerability 优化前 | 优化后 |
|---|---:|---:|
| 直接命中 | 4/4 | 4/4 |
| 同义改写 | 2/3 | 2/3 |
| 无答案拒答 | 0/3 | 3/3 |
| **合计** | **6/10** | **9/10** |

现有验证包括 `tests/test_answerability.py` 中的 3 个自动化测试、MiniLM Top1 语义检索记录，以及 3 个无答案问题的拒答回归。`9/10` 仅代表当前小型 Demo 数据集，不代表真实长视频或跨领域泛化准确率。

## 当前限制

当前尚未实现：

- 视频画面理解
- LLM 自动总结或 grounded answer
- 自动生成学习笔记
- Web UI 与时间戳跳转
- Segment Embedding 持久化

后续将沿着 `grounded LLM answer → 学习笔记生成 → Web UI` 的方向逐步扩展。以上均为规划，不属于当前版本能力。

## 环境要求

- Python 3.10+
- `sentence-transformers`
- `torch`
- `numpy`
- `yt-dlp`
- `openai-whisper`
- `ffmpeg-python`

Whisper 依赖本机 `ffmpeg`。macOS 可使用 Homebrew 安装：

```bash
brew install ffmpeg
```

完整依赖见 [`requirements.txt`](requirements.txt)。
