# EarthSignal 30-second demo: script and production notes

Drafted with AI assistance (Claude Code). See docs/submission/si_usage.md.

File on the website: `frontend/public/demo/earthsignal-demo.mp4` (1600×900, H.264 + AAC voice-over, 29.6 s, captions burned in, animated cursor).
Shown on the landing page in the "See it in 30 seconds" section (`frontend/src/app/pages/landing/DemoVideoSection.js`).

## Voice-over (ElevenLabs, voice "George – Warm, Captivating Storyteller", eleven_multilingual_v2, +8 % tempo)

| Time | Scene (live app, Eastern Sahel 1998–2025) and cursor | Narration |
|---|---|---|
| 0.0–5.4 | Landing page; cursor glides to "Start an investigation" and clicks | Is the Sahel getting wetter? EarthSignal turns NASA rainfall data into an investigation. |
| 5.4–11.6 | Detect: cursor follows the series to the Sen line, then the statistical-tests panel | In the eastern Sahel, dry spells shrink by nearly ten percent a decade, and the result holds in every test. |
| 11.6–17.9 | Investigate: cursor clicks "Topsoil wetness" (real click), then the correlation bars | NASA's MERRA-2 shows the rain moving with moisture and wetter soils. Associations, not causes. |
| 17.9–21.3 | Project: cursor traces the fan toward 2050 | Scenarios to 2050 stay what-ifs, never forecasts. |
| 21.3–27.2 | Report: key findings, cursor clicks "Generate narrative" (real), then the verified narrative | Every report leads with the key findings, and an AI narrative whose numbers are checked against the data. |
| 27.2–29.6 | End card | EarthSignal. Evidence first. |

Facts behind the narration (API, Eastern Sahel 1998–2025): longest dry spell −9.6 %/decade, Mann–Kendall p = 0.001,
robust in every test of E-007; rainfall +8.7 %/decade, p = 0.055 (not significant, not claimed); 7 of 12 MERRA-2
variables move with rainfall (topsoil wetness ρ 0.83, column water vapour ρ 0.70).

## How it was made
- `record_demo.mjs`: drives headless Chrome through the running app (Chrome DevTools screencast), one scene at a time,
  recording only once the live data has loaded. Needs the API on :8000 and the front end on :3000.
- ffmpeg assembles the frames with their real timings, adds the end card, captions and the watermark
  "AI-assisted production (Claude Code) · NASA Space Apps 2026" (challenge rule: visible watermark on AI-assisted video;
  also written in the file metadata).
- Cursor: headless recordings have no pointer, so the recorder injects an SVG cursor and a click ripple into the page; two clicks are real (variable choice, narrative generation).
- Voice-over: six lines generated with ElevenLabs (one per scene), trailing silence trimmed, tempo +8 %, placed at each scene start, loudness-normalised (−16 LUFS). Scene lengths were set from the line lengths.
- Watermark and metadata name both AI tools: "AI-assisted production · voice: ElevenLabs AI (George) · Claude Code".
