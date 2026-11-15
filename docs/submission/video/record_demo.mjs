// Records the EarthSignal demo scenes with Chrome DevTools screencast (headless). Output: frames + timings per scene.
import { spawn } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';

const OUT = process.argv[2];
const BASE = 'http://127.0.0.1:3000';
const W = 1600, H = 900;
const INV = {
  id: 'east-sahel-1998-2025', title: 'Eastern Sahel Rainfall', description: 'June–September rainfall and dry spells, 1998–2025.',
  researchQuestion: 'Is eastern Sahel rainfall changing, and are dry spells getting shorter?',
  region: 'Eastern Sahel', coords: '10°N–20°N, 10°E–20°E', bounds: { north: 20, south: 10, west: 10, east: 20 },
  period: '1998–2025', startYear: 1998, endYear: 2025, season: 'June–September', months: [5, 6, 7, 8],
  variable: 'Precipitation', supportingVariables: ['Atmospheric moisture'], extremesEnabled: true,
  dataset: 'GPM IMERG Final V07', supportingDatasets: ['merra2-reanalysis'], datasetStatus: 'Verified',
  stageIndex: 4, status: 'in_progress', completed: false, updatedLabel: 'Updated just now',
  updatedAt: '2026-11-15T10:00:00Z', createdAt: '2026-11-15T09:00:00Z', exactDate: '15 Nov 2026', dataGatePassed: true,
};
rmSync(OUT, { recursive: true, force: true }); mkdirSync(OUT, { recursive: true });

const chrome = spawn('google-chrome-stable', ['--headless=new', '--disable-gpu', '--no-first-run', '--hide-scrollbars',
  `--user-data-dir=${OUT}/profile`, '--remote-debugging-port=9334', `--window-size=${W},${H}`, 'about:blank'], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let target;
for (let i = 0; i < 50 && !target; i++) { await sleep(200); try { target = (await (await fetch('http://127.0.0.1:9334/json')).json()).find((t) => t.type === 'page'); } catch {} }
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((r) => (ws.onopen = r));
let id = 0; const pending = new Map(); let frames = null; let frameCount = 0;
ws.onmessage = (e) => {
  const m = JSON.parse(e.data);
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); return; }
  if (m.method === 'Page.screencastFrame') {
    send('Page.screencastFrameAck', { sessionId: m.params.sessionId });
    if (frames) { const f = `${OUT}/f${String(frameCount++).padStart(5, '0')}.jpg`; writeFileSync(f, Buffer.from(m.params.data, 'base64')); frames.push({ f, t: m.params.metadata.timestamp }); }
  }
};
const send = (method, params = {}) => new Promise((r) => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const js = async (expr) => (await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true })).result?.result?.value;
const waitText = async (text, ms = 40000) => { for (let t = 0; t < ms; t += 300) { if (await js(`document.body && document.body.innerText.includes(${JSON.stringify(text)})`)) return true; await sleep(300); } throw new Error('timeout waiting for ' + text); };
// scroll the element whose own text starts with `text` to the top (works with nested scroll containers)
const scrollTo = (text, smooth, offset = 90) => js(`(() => {
  const el = [...document.querySelectorAll('h1,h2,h3,p,div,span,summary')].find(n => n.children.length < 4 && n.innerText && n.innerText.trim().startsWith(${JSON.stringify(text)}));
  if (!el) return false;
  let c = el.parentElement; while (c && !(c.scrollHeight > c.clientHeight + 5 && /(auto|scroll)/.test(getComputedStyle(c).overflowY))) c = c.parentElement;
  const sc = c || document.scrollingElement;
  const top = el.getBoundingClientRect().top - (c ? c.getBoundingClientRect().top : 0) + sc.scrollTop - ${offset};
  sc.scrollTo({ top, behavior: ${smooth ? "'smooth'" : "'instant'"} }); return true; })()`);

// centre of the element whose text starts with `text` (viewport coordinates), with an offset
const at = (text, dx = 0, dy = 0, tag = 'h1,h2,h3,p,div,span,button,summary,label,a') => js(`(() => {
  const el = [...document.querySelectorAll(${JSON.stringify(tag)})].find(n => n.children.length < 4 && n.innerText && n.innerText.trim().startsWith(${JSON.stringify(text)}));
  if (!el) return null; const r = el.getBoundingClientRect(); return [Math.round(r.left + r.width / 2 + ${dx}), Math.round(r.top + r.height / 2 + ${dy})]; })()`);
const move = async (xy, ms = 900) => { if (xy) await js(`window.__cur.moveTo(${xy[0]}, ${xy[1]}, ${ms})`); };
const ripple = () => js('window.__cur.ripple()');
const clickText = (text, tag = 'button') => js(`[...document.querySelectorAll(${JSON.stringify(tag)})].find(b => b.textContent.trim().startsWith(${JSON.stringify(text)})).click()`);
await send('Page.enable'); await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 1, mobile: false });
await send('Page.addScriptToEvaluateOnNewDocument', { source: `try {
  if (location.origin === ${JSON.stringify(BASE)}) {
    localStorage.setItem('earthsignal_investigations_v2', ${JSON.stringify(JSON.stringify([INV]))});
    localStorage.setItem('earthsignal_session', JSON.stringify({ mode: 'guest', name: 'Guest researcher' }));
    localStorage.setItem('earthsignal_tour_dismissed_v1', '1');
  } } catch (e) {}
  // demo cursor: fixed SVG arrow + click ripple (headless recordings have no pointer)
  const mk = () => {
    if (document.getElementById('__democursor')) return;
    const c = document.createElement('div'); c.id = '__democursor';
    c.style.cssText = 'position:fixed;left:0;top:0;z-index:2147483647;pointer-events:none;width:30px;height:30px;transform:translate(' + (window.__cx||800) + 'px,' + (window.__cy||450) + 'px);transition:transform 900ms cubic-bezier(.22,.8,.26,1);filter:drop-shadow(0 3px 5px rgba(11,18,36,.45))';
    c.innerHTML = '<svg width="30" height="30" viewBox="0 0 24 24"><path d="M3 2 L3 19 L7.6 14.8 L10.6 21.5 L13.4 20.3 L10.4 13.7 L16.6 13.6 Z" fill="#ffffff" stroke="#131D38" stroke-width="1.6" stroke-linejoin="round"/></svg>';
    document.documentElement.appendChild(c);
  };
  window.__cur = {
    moveTo(x, y, ms = 900) { mk(); const c = document.getElementById('__democursor'); c.style.transitionDuration = ms + 'ms'; c.style.transform = 'translate(' + x + 'px,' + y + 'px)'; window.__cx = x; window.__cy = y; },
    ripple() { const r = document.createElement('div'); const x = window.__cx, y = window.__cy;
      r.style.cssText = 'position:fixed;left:' + (x - 18) + 'px;top:' + (y - 18) + 'px;width:36px;height:36px;border-radius:50%;border:3px solid #ffc20d;background:rgba(255,194,13,.25);z-index:2147483646;pointer-events:none;transform:scale(.3);opacity:1;transition:transform 520ms ease-out,opacity 520ms ease-out';
      document.documentElement.appendChild(r); requestAnimationFrame(() => { r.style.transform = 'scale(1.6)'; r.style.opacity = '0'; }); setTimeout(() => r.remove(), 600); },
  };
  document.addEventListener('DOMContentLoaded', mk);` });

const scenes = [];
async function record(name, act) {
  frames = []; const t0 = Date.now() / 1000;
  await send('Page.startScreencast', { format: 'jpeg', quality: 90, maxWidth: W, maxHeight: H, everyNthFrame: 1 });
  await act();
  await send('Page.stopScreencast');
  scenes.push({ name, start: t0, end: Date.now() / 1000, frames }); frames = null;
}
async function go(path, readyText) { await send('Page.navigate', { url: BASE + path }); await waitText(readyText); await sleep(1200); }

// 1. landing (5.4 s): glide to "Start an investigation", hover, click ripple
await go('/', 'EarthSignal');
await move([1150, 520], 10); await sleep(400);
await record('landing', async () => { await sleep(500); await move(await at('Start an investigation', 0, 4, 'a,button'), 2000); await sleep(2300); await ripple(); await sleep(2600); });
// 2. detect (6.2 s): follow the series to its Sen line, scroll to the tests, point at the alpha line
await go(`/investigations/${INV.id}/detect`, 'Is the change real?');
await scrollTo('June–September precipitation series', false, 110); await sleep(500);
await move([560, 470], 10); await sleep(300);
await record('detect', async () => {
  await sleep(200); await move([1010, 320], 1500); await sleep(1500);
  await scrollTo('STATISTICAL TESTS', true, 40); await sleep(900);
  await move(await at('SIGNIFICANCE OF', 40, 70), 1200); await sleep(2300); });
// 3. investigate (6.3 s): click "Topsoil wetness", then the correlation bars
await go(`/investigations/${INV.id}/investigate`, 'Which variables move with the rain?');
await scrollTo('LAYER 02', false, 40); await sleep(500);
await move([900, 560], 10); await sleep(300);
await record('investigate', async () => {
  await sleep(200); await move(await at('Topsoil wetness', 0, 0, 'button'), 1100); await sleep(1200); await ripple(); await clickText('Topsoil wetness'); await sleep(1300);
  await scrollTo('Which variables move with the rain?', true, 30); await sleep(800);
  await move(await at('Which variables move with the rain?', 380, 110), 1000); await sleep(1700); });
// 4. project (3.4 s): trace the fan toward 2050
await go(`/investigations/${INV.id}/project`, 'history | scenarios');
await scrollTo('CONDITIONAL SCENARIOS, NEVER FORECASTS', false, 30); await sleep(500);
await move(await at('HISTORICAL BASELINE', -40, 160), 10); await sleep(300);
await record('project', async () => { await sleep(200); await move(await at('HISTORICAL BASELINE', 300, 70), 1800); await sleep(1400); });
// 5. report (5.9 s): key findings, click "Generate narrative" (generation not recorded), then the verified narrative
await go(`/investigations/${INV.id}/report`, 'KEY FINDINGS');
await scrollTo('KEY FINDINGS', false, 60); await sleep(500);
await move([780, 210], 10); await sleep(300);
await record('report_findings', async () => { await sleep(200); await move([1050, 360], 900); await sleep(700); await move(await at('Generate narrative', 0, 0, 'button'), 900); await sleep(400); await ripple(); await sleep(400); });
await clickText('Generate narrative');
await waitText('AI-generated · ', 90000); await sleep(800);
await scrollTo('ASK THE DATA', false, 30); await sleep(600);
await move(await at('Regenerate', 0, 0, 'button'), 10); await sleep(300);
await record('report_narrative', async () => { await sleep(200); await move(await at('All numbers match the data', 0, 0, 'span'), 1100); await sleep(1900); });

writeFileSync(`${OUT}/scenes.json`, JSON.stringify(scenes, null, 1));
console.log(scenes.map((s) => `${s.name}: ${s.frames.length} frames, ${(s.end - s.start).toFixed(1)} s`).join('\n'));
console.log('narrative:', (await js(`(document.body.innerText.match(/ASK THE DATA[\\s\\S]{0,1400}/)||[''])[0].replace(/\\s+/g,' ')`)).slice(0, 900));
ws.close(); chrome.kill();
