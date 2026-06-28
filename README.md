# Suno Prompt Studio

A browser-based workspace for assembling, validating, and copying **Suno AI** style prompts, exclude lists, and lyrics structure.

No build step. No backend. No dependencies. Open `index.html` over HTTP and it works.

## Features

- **Style Builder** — Browse 130+ style prompts across 10 categories. Click to assemble your combination into a copyable prompt string.
- **BPM Fader** — Set tempo as an exact BPM value or a natural-language descriptor (*slow tempo*, *upbeat tempo*, etc.).
- **Quality Check** — Real-time conflict detection. Flags combinations like "acoustic + heavy EDM" or "slow + aggressive" before you copy.
- **Exclude Styles** — Auto-suggested exclude list based on your selection, copyable directly into Suno.
- **Prompt Library** — Search and filter all 130+ terms by category, source reliability, and keyword. Each term includes reference songs and pairing suggestions.
- **Lyrics Builder** — Structured lyrics prompt builder supporting 9 languages (ZH / EN / Bilingual / JA / KO / PT / ES / JA+EN / KO+EN).
- **Presets** — Save and restore your complete workspace state, including selected prompts, BPM, and category visibility. Stored in `localStorage`.

## Data Sources

Prompt terms use a three-tier reliability system:

| Label | Source |
|---|---|
| Official terms | [Suno Help Center](https://help.suno.com/en/) and [Music Glossary](https://help.suno.com/en/articles/9010177) |
| Community high-frequency | [AIMS: An AI Music Scholar](https://arxiv.org/abs/2509.11824) — a 2025 paper analyzing real Suno/Udio prompt usage data |
| Inferred | Music theory and genre semantics |

## Usage

### Local preview

```bash
python3 -m http.server 4173
```

Then open `http://127.0.0.1:4173/`.

Do not open with `file://` — the app uses `fetch("./app.js")` to load prompt data, which requires HTTP.

### Deploy to a server

Copy all four files to a static web directory: