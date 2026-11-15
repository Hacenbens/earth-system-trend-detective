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

await send('Page.enable'); await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 1, mobile: false });
await send('Page.addScriptToEvaluateOnNewDocument', { source: `try {
  if (location.origin === ${JSON.stringify(BASE)}) {
    localStorage.setItem('earthsignal_investigations_v2', ${JSON.stringify(JSON.stringify([INV]))});
    localStorage.setItem('earthsignal_session', JSON.stringify({ mode: 'guest', name: 'Guest researcher' }));
    localStorage.setItem('earthsignal_tour_dismissed_v1', '1');
  } } catch (e) {}` });

const scenes = [];
async function record(name, act) {
  frames = []; const t0 = Date.now() / 1000;
  await send('Page.startScreencast', { format: 'jpeg', quality: 90, maxWidth: W, maxHeight: H, everyNthFrame: 1 });
  await act();
  await send('Page.stopScreencast');
  scenes.push({ name, start: t0, end: Date.now() / 1000, frames }); frames = null;
}
async function go(path, readyText) { await send('Page.navigate', { url: BASE + path }); await waitText(readyText); await sleep(1200); }

// 1. landing
await go('/', 'EarthSignal');
await record('landing', () => sleep(5000));
// 2. detect: chart, then the tests panel
await go(`/investigations/${INV.id}/detect`, 'Is the change real?');
await scrollTo('June–September precipitation series', false, 110); await sleep(600);
await record('detect', async () => { await sleep(2600); await scrollTo('STATISTICAL TESTS', true, 40); await sleep(3400); });
// 3. investigate: co-variation, then correlation bars
await go(`/investigations/${INV.id}/investigate`, 'Which variables move with the rain?');
await scrollTo('LAYER 02', false, 40); await sleep(600);
await record('investigate', async () => { await sleep(2400); await scrollTo('Which variables move with the rain?', true, 30); await sleep(3600); });
// 4. project
await go(`/investigations/${INV.id}/project`, 'history | scenarios');
await scrollTo('CONDITIONAL SCENARIOS, NEVER FORECASTS', false, 30); await sleep(600);
await record('project', () => sleep(5000));
// 5. report: key findings, then the AI narrative (generation itself not recorded)
await go(`/investigations/${INV.id}/report`, 'KEY FINDINGS');
await scrollTo('KEY FINDINGS', false, 60); await sleep(600);
await record('report_findings', () => sleep(2800));
await js(`[...document.querySelectorAll('button')].find(b => b.textContent.includes('Generate narrative')).click()`);
await waitText('AI-generated · ', 90000); await sleep(800);
await scrollTo('ASK THE DATA', false, 30); await sleep(600);
await record('report_narrative', () => sleep(3200));

writeFileSync(`${OUT}/scenes.json`, JSON.stringify(scenes, null, 1));
console.log(scenes.map((s) => `${s.name}: ${s.frames.length} frames, ${(s.end - s.start).toFixed(1)} s`).join('\n'));
console.log('narrative:', (await js(`(document.body.innerText.match(/ASK THE DATA[\\s\\S]{0,1400}/)||[''])[0].replace(/\\s+/g,' ')`)).slice(0, 900));
ws.close(); chrome.kill();
