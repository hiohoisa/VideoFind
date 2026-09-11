# VideoFind 🎬

**A subtitle-first single-video understanding skill for semantic retrieval, timestamped evidence, and learning assistance.**

VideoFind 从单个长视频的已有字幕或文本中定位关键内容，让用户通过自然语言问题快速找到对应时间、原文片段和匹配分数。

> **MVP status:** 当前已实现字幕解析、语义/关键词检索、时间戳定位和无答案判断；视频 URL、ASR、LLM 问答、学习笔记与 Web UI 尚在规划中。

---

## 🔎 Overview

面对 30–60 分钟的求职经验、技术课程、产品分享或会议访谈，用户通常只需要其中几个关键片段，却不得不反复拖动进度条、依赖标题猜测，甚至重新观看整条视频。

VideoFind 希望把长视频变成可检索的知识来源：先将已有字幕整理为带时间信息的 Segment，再使用语义检索理解用户问题，最后返回可定位、可核验的内容证据。项目的长期目标是进一步支持基于视频证据的学习笔记与问答；当前版本专注于把“找到相关内容”这一步做成可运行的本地 MVP。

### 用户可以得到什么？

- ⏱️ 相关片段的起止时间
- 📝 与问题匹配的字幕内容
- 🔗 可核验的原始文本依据
- 📊 检索匹配分数
- 🛡️ 证据不足时的明确拒答

## ✨ Features

| 用户价值 | 状态 | 当前能力 |
|---|:---:|---|
| **视频内容解析** | 🟡 字幕级 | 处理单个视频的已有字幕或文本；暂不下载视频、不分析音频和画面 |
| **字幕处理** | ✅ | 支持 `.srt`、`.txt`、`.md` 及带时间戳文本，统一转换为结构化 Segment |
| **时间戳检索** | ✅ | 返回匹配 Segment 的 `start_time` 和 `end_time`；纯文本无时间信息时标记为 `未提供` |
| **语义搜索** | ✅ | 默认使用多语言 MiniLM Embedding 和余弦相似度排序；模型不可用时降级为 character n-gram |
| **关键词搜索** | ✅ | 提供独立 `keyword` 模式，用于简单检索或策略对照 |
| **基于上下文的问答** | 🟡 检索式 | 根据问题返回字幕证据，并通过 Answerability 判断是否可回答；尚无 LLM 生成层 |
| **学习笔记生成** | 🧭 规划中 | 尚未实现，计划在 grounded LLM 阶段基于检索证据生成 |

### Subtitle Parsing

字幕和文本会被统一转换为：

```python
Segment(
    start_time="08:14",
    end_time="08:30",
    text="项目经历应该突出个人贡献",
)
```

支持 `[00:08:14]`、`[00:08:14 - 00:08:30]` 等时间戳格式。单时间点文本会使用下一条时间或默认片段长度补全结束时间。

### Semantic Retrieval

- 默认模型：`paraphrase-multilingual-MiniLM-L12-v2`
- 检索方式：Query/Segment Embedding + cosine similarity + Top-K ranking
- 模型或依赖加载失败：自动切换为本地 character n-gram fallback
- 可选模式：独立关键词检索

### Answerability Checking

系统综合 Top1 相似度、Top1/Top2 分差和查询关键词覆盖情况判断证据是否充分，默认阈值为 `0.50`。判断无答案时不会强制返回一个“最相似”时间段，而是输出：

> 未找到与该问题高度相关的视频内容

## 🧭 Architecture

```text
Input Subtitle / Text
          ↓
Transcript Parser
          ↓
Segment Builder
          ↓
Embedding / Keyword Retrieval
          ↓
Top-K Candidates
          ↓
Answerability Check
          ↓
Timestamp-based Result / No-answer Response
```

当前 Segment 和 Embedding 在单次本地进程中处理，没有持久化向量数据库，也没有 LLM 生成步骤。模块级流程与职责见 **[Architecture Documentation](docs/architecture.md)**。

## 🖥️ Demo

> 📷 **Screenshot placeholder** — 当前项目提供 CLI Demo；Web UI 完成后将在此补充交互截图。

**用户输入**

> 找一下视频中讲项目经历的部分

**VideoFind 输出**

```text
时间戳：03:18–04:12
相关文本：项目经历是简历最重要的部分。不要只写参与了某项目，
          要说清楚你负责什么、采取了什么行动，以及最后带来了什么结果。
匹配结果：定位到 STAR 项目经历写法相关字幕
匹配分数：0.7407
```

更多直接命中、同义搜索和无答案拒答案例见 **[完整 Demo](docs/demo.md)**。

## 📦 Installation

### Install as a Codex Skill

在 Codex 中输入：

```text
帮我安装这个 skill：
https://github.com/hiohoisa/VideoFind
```

也可以手动安装：

```bash
mkdir -p ~/.agents/skills
git clone https://github.com/hiohoisa/VideoFind.git ~/.agents/skills/videofind
```

如果安装后没有立即显示，请重启 Codex。Skill 安装与发现规则可参考 [OpenAI 官方文档](https://developers.openai.com/codex/skills)。

### Set up the Python environment

```bash
cd ~/.agents/skills/videofind
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

首次运行语义检索时需要下载 MiniLM 模型。如果模型加载失败，CLI 会显示 warning 并自动使用 character fallback。

## 🚀 Usage

在仓库根目录运行默认语义检索：

```bash
python3 -m src.cli \
  --transcript demo/sample_subtitles.srt \
  --question "简历项目经历怎么写？"
```

调整模式、返回数量和 Answerability 阈值：

```bash
python3 -m src.cli \
  --transcript demo/sample_subtitles.srt \
  --question "简历项目经历怎么写？" \
  --search-mode semantic \
  --limit 3 \
  --threshold 0.50
```

关键词模式：

```bash
python3 -m src.cli \
  --transcript demo/sample_subtitles.srt \
  --question "项目经历" \
  --search-mode keyword
```

CLI 实际输出包含内容标题、提取式摘要、原文依据和匹配分数。当前标题由问题生成，摘要直接使用命中的字幕 Segment，不是 LLM 生成结果。

## 🧰 Tech Stack

### Current

- **Python**：字幕解析、检索 Pipeline、CLI 与自动化测试
- **Embedding**：Sentence Transformers + multilingual MiniLM
- **Semantic Search**：向量归一化、余弦相似度与 Top-K 排序
- **Retrieval reliability**：相似度、候选分差、关键词覆盖与可调阈值
- **RAG foundation**：已实现检索与证据层，尚未接入 Generation 层

### Planned

- **LLM**：基于召回字幕生成 grounded answer、摘要和学习笔记
- **Streamlit**：视频输入、查询与时间戳结果展示
- **ASR**：为无字幕视频生成带时间信息的转写

## 📈 Evaluation

当前评测使用 [`demo/sample_subtitles.srt`](demo/sample_subtitles.srt) 和 10 个问题，覆盖直接命中、同义改写与视频中不存在三类场景。评测采用人工预期时间段进行判定，完整记录见 [evaluation.md](evaluation.md)。

| 测试类型 | Answerability 优化前 | 优化后 |
|---|---:|---:|
| 直接命中 | 4/4 | 4/4 |
| 同义改写 | 2/3 | 2/3 |
| 无答案拒答 | 0/3 | 3/3 |
| **合计** | **6/10** | **9/10** |

现有验证包括 `tests/test_answerability.py` 中的 3 个自动化测试、MiniLM Top1 语义检索记录，以及 3 个无答案问题的拒答回归。`9/10` 仅代表当前小型 Demo 数据集，不代表真实长视频或跨领域泛化准确率；已知失败案例是一个有效同义问题被错误排序并拒答。

## 🗺️ Roadmap

以下能力均为未来方向，**当前尚未实现**：

- [ ] 视频 URL 自动解析
- [ ] 自动获取公开视频字幕
- [ ] Whisper ASR 处理无字幕视频
- [ ] LLM grounded answering 与摘要
- [ ] 自动生成结构化学习笔记
- [ ] Streamlit Web UI 与时间戳跳转
- [ ] Segment Embedding 持久化与更大规模评测

## Requirements

- Python 3.10+
- `sentence-transformers`
- `torch`
- `numpy`

完整依赖见 [`requirements.txt`](requirements.txt)。
