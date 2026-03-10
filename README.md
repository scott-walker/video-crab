<p align="center">
  <img src="https://raw.githubusercontent.com/scott-walker/video-crab/main/.github/logo.svg" width="120" alt="VideoCrab" />
</p>

<h1 align="center">VideoCrab</h1>

<p align="center">
  <strong>AI-powered video analysis & trimming tool</strong><br/>
  <sub>Transcribe, analyze, clip, and narrate — all from a single desktop app.</sub>
</p>

<p align="center">
  <a href="#features">Features</a> ·
  <a href="#quick-start">Quick Start</a> ·
  <a href="#configuration">Configuration</a> ·
  <a href="#architecture">Architecture</a> ·
  <a href="#license">License</a>
</p>

---

## What is VideoCrab?

VideoCrab is a desktop application for working with long-form video content. Instead of watching a 2-hour recording, drop it into VideoCrab and get a detailed, structured breakdown of everything that was discussed — with timestamps, topic segmentation, and suggested clips.

Built with **Electron + SolidJS**, powered by **OpenAI Whisper**, **Groq LLMs**, and **ElevenLabs TTS**.

## Features

### Video Trimming
- Drag-and-drop or file picker to load video
- Visual waveform timeline with draggable trim handles
- Click-and-drag range selection on the timeline
- Precise timecode display (in/out/current position)
- Clip management — save, name, and navigate between clips
- FFmpeg-based export of trimmed segments

### AI Transcription
- Speech-to-text via **OpenAI Whisper API**
- Per-region transcription — transcribe specific timeline segments
- Transcript sidebar with clickable segments that seek to timestamp
- Multi-language support (auto-detect or manual selection)

### Semantic Analysis
- **3-stage deep analysis** powered by Groq LLMs:
  1. **Context extraction** — understands the overall topic, participants, and narrative
  2. **Parallel chunk analysis** — detailed breakdown of 10-minute segments with full context
  3. **Synthesis** — combines chunks into a cohesive, exhaustive analysis
- Custom query support — ask about specific aspects (e.g., *"Focus on financial decisions"*)
- Voice input for queries via microphone (Whisper-powered)
- Analysis includes: summary, detailed chronological narrative, topics with timestamps, key moments, and suggested clips
- Clickable timestamps in analysis results — jump to any moment
- Progress bar showing analysis stages

### Text-to-Speech
- **ElevenLabs TTS** integration for reading analyses aloud
- Section-based parallel fetching for fast playback start
- Mini-player with play/pause, seek, skip ±5s controls
- Per-analysis caching — instant replay without re-fetching
- HTTP proxy support (CONNECT tunnel) for restricted networks

### Project Management
- Multiple projects with persistent storage
- Auto-save with debounce
- Transcript and analysis history saved per project
- Region-based organization (multiple transcription/analysis sessions)

## Quick Start

### Prerequisites

- **Node.js** 18+ and **npm**
- **FFmpeg** installed and available in `PATH`
- API keys for services you want to use:
  - [OpenAI](https://platform.openai.com/api-keys) — for Whisper transcription
  - [Groq](https://console.groq.com/keys) — for semantic analysis (free tier available)
  - [ElevenLabs](https://elevenlabs.io/) — for TTS narration (optional)

### Install & Run

```bash
# Clone the repository
git clone https://github.com/scott-walker/video-crab.git
cd video-crab

# Install dependencies
npm install

# Run in development mode
npm run dev
```

### Build for Production

```bash
# Build and package
npm run dist
```

## Configuration

Open **Settings** (gear icon in the titlebar) to configure:

| Setting | Description |
|---------|-------------|
| **OpenAI API Key** | Required for Whisper transcription and voice input |
| **Groq API Key** | Required for semantic analysis |
| **Groq Model** | LLM model for analysis (default: `llama-3.3-70b-versatile`) |
| **Language** | Transcription language (auto-detect or specific) |
| **ElevenLabs API Key** | For TTS narration (optional) |
| **ElevenLabs Voice** | Voice selection (Rachel, Sarah, Adam, etc.) |
| **Speech Speed** | TTS playback speed (0.7–1.2x) |
| **ElevenLabs Proxy** | HTTP proxy URL for restricted networks |

All settings are stored locally in `~/.videocrab/settings.json`.

## Architecture

```
src/
├── main.js              # Electron main process
│                        #   - FFmpeg audio/video extraction
│                        #   - OpenAI Whisper API integration
│                        #   - Groq LLM API integration
│                        #   - ElevenLabs TTS with CONNECT tunnel
│                        #   - Project file storage
├── preload.js           # Secure IPC bridge
└── renderer/
    ├── App.jsx          # Root component & routing
    ├── Editor.jsx       # Main editor (video player, timeline,
    │                    #   transcription, analysis, TTS)
    ├── Titlebar.jsx     # Custom titlebar with navigation & status
    ├── Settings.jsx     # Settings panel
    ├── ProjectPicker.jsx# Project list & creation
    ├── store.js         # Global state (SolidJS signals & stores)
    ├── format.js        # Time formatting utilities
    └── global.css       # Complete design system
```

### Tech Stack

| Layer | Technology |
|-------|-----------|
| Desktop runtime | Electron 33 |
| UI framework | SolidJS 1.9 |
| Build tool | Vite 6 |
| Styling | Custom CSS design system (no frameworks) |
| Transcription | OpenAI Whisper API |
| Analysis | Groq Cloud (Llama 3.3 70B) |
| TTS | ElevenLabs (Flash v2.5) |
| Media processing | FFmpeg |

### How Analysis Works

For long videos, VideoCrab uses a 3-stage pipeline:

```
┌─────────────────┐
│  Full Transcript │
└────────┬────────┘
         ▼
┌─────────────────┐
│ Context Extract  │  → "This video is about X, participants are Y..."
└────────┬────────┘
         ▼
┌─────────────────┐
│  Chunk Analysis  │  → 10-min chunks analyzed in parallel (max 5)
│  ┌──┐┌──┐┌──┐   │     each chunk receives global context
│  │C1││C2││C3│   │
│  └──┘└──┘└──┘   │
└────────┬────────┘
         ▼
┌─────────────────┐
│   Synthesis      │  → Combined into single cohesive narrative
└─────────────────┘
```

## License

[MIT](LICENSE) — use it, fork it, build on it.
