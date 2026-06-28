# Suno Prompt Studio V2 Release Notes

Release date: 2026-06-28
Suggested tag: v2.0.0

## Highlights

- Added restrained Lyrics completion workflow.
- Added required Song Title, Feeling, Story, Scene, Verse, and Chorus gates before completion.
- Added always-visible LLM data sending notice.
- Added cross-language rewrite guidance: user input can be any language; selected Language controls final lyrics output.
- Added completion suggestion panel with Understanding, Target Language Plan, Suggested Lyrics, and Notes.
- Completion suggestions do not overwrite Lyrics Draft automatically.
- Added local LLM config example via `config.example.js`; real `config.js` is ignored by git.
- Preserved static deployment: no build step, no npm dependencies.

## Files

```text
index.html
styles.css
app.js
main.js
config.example.js
README.md
.gitignore
```

## Verification

- `main.js` syntax check passed.
- `app.js` JSON parsed successfully.
- Prompt library contains 133 terms and 8 built-in presets.
- Local HTTP preview passed at `http://127.0.0.1:4175/`.
- Lyrics completion gate rejects missing input without calling LLM.
- Cross-language hint appears for Chinese material with Korean / English target.
- Unconfigured LLM endpoint enters Error state without modifying draft.

## GitHub Release Body

Suno Prompt Studio V2 is a static browser tool for building Suno style prompts, searching a prompt library, and preparing structured lyrics prompts.

This release adds a restrained Lyrics completion workflow. The completion feature is intentionally not a one-click generator: it requires user-provided song title, feeling, story, scene, Verse content, and Chorus content before any LLM endpoint can be called. It can understand source material in one language and rewrite it into the selected target language, while preserving the user's core intent.

For public deployment, do not expose API keys in frontend files. Use a backend proxy for LLM completion, or keep the completion endpoint disabled.
