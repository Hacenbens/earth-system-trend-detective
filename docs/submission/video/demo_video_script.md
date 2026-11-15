# EarthSignal 30-second demo: script and production notes

Drafted with AI assistance (Claude Code). See docs/submission/si_usage.md.

File on the website: `frontend/public/demo/earthsignal-demo.mp4` (1600×900, H.264, 30.0 s, captions burned in).
Shown on the landing page in the "See it in 30 seconds" section (`frontend/src/app/pages/landing/DemoVideoSection.js`).

## Voice-over (narrative, presenter tone; ~75 words)

| Time | Scene (live app, Eastern Sahel 1998–2025) | Narration |
|---|---|---|
| 0.0–5.0 | Landing page | Is the Sahel getting wetter? EarthSignal turns 28 years of NASA rainfall data into an investigation. |
| 5.0–11.0 | Detect: rainfall series, then the statistical-tests panel | In the eastern Sahel, dry spells are shrinking by nearly 10 % a decade, and the result holds in every test. |
| 11.0–17.0 | Investigate: co-variation chart, then correlation bars | NASA's MERRA-2 shows the rain moving with moisture and wetter soils: associations, not causes. |
| 17.0–22.0 | Project: scenarios to 2050 | Scenarios to 2050 stay what-ifs, never forecasts. |
| 22.0–28.0 | Report: key findings, then the AI narrative | Every report leads with the key findings, and an AI narrative whose numbers are checked against the data. |
| 28.0–30.0 | End card | EarthSignal. Evidence first. |

Facts behind the narration (API, Eastern Sahel 1998–2025): longest dry spell −9.6 %/decade, Mann–Kendall p = 0.001,
robust in every test of E-007; rainfall +8.7 %/decade, p = 0.055 (not significant, not claimed); 7 of 12 MERRA-2
variables move with rainfall (topsoil wetness ρ 0.83, column water vapour ρ 0.70).

## How it was made
- `record_demo.mjs`: drives headless Chrome through the running app (Chrome DevTools screencast), one scene at a time,
  recording only once the live data has loaded. Needs the API on :8000 and the front end on :3000.
- ffmpeg assembles the frames with their real timings, adds the end card, captions and the watermark
  "AI-assisted production (Claude Code) · NASA Space Apps 2026" (challenge rule: visible watermark on AI-assisted video;
  also written in the file metadata).
- Voice-over: to be generated with ElevenLabs from the table above and mixed in; the acknowledgement will then name it.
