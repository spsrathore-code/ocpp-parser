// Throwaway QA harness (skill-chain /qa, Test phase) for @ador/ocpp-validation.
// Pulls real OCPP frames out of a charger session log and runs them through the
// engine's validateBatch. The engine itself does NOT parse logs (VAL-001) — this
// minimal extractor stands in for the Parser to exercise the engine on real traffic.
// Usage: node run-qa.mjs "<path-to-log>"
import { readFileSync } from 'node:fs';
import { validateBatch } from '../../dist/index.js';

const path = process.argv[2];
const text = readFileSync(path, 'utf8');
const lines = text.split(/\r?\n/);

// Balanced-bracket extraction of the [2|3|4,"…"] JSON array embedded in a line.
function extractFrame(line) {
  const m = line.match(/\[(?:2|3|4),"/);
  if (!m) return null;
  const start = m.index;
  let depth = 0, inStr = false, esc = false;
  for (let i = start; i < line.length; i++) {
    const c = line[i];
    if (esc) { esc = false; continue; }
    if (c === '\\') { esc = true; continue; }
    if (c === '"') { inStr = !inStr; continue; }
    if (inStr) continue;
    if (c === '[') depth++;
    else if (c === ']') { depth--; if (depth === 0) return line.slice(start, i + 1); }
  }
  return null;
}

const frames = [];
let parseFailures = 0, extractErrors = 0;
for (const line of lines) {
  const raw = extractFrame(line);
  if (!raw) continue;
  let frame;
  try { frame = JSON.parse(raw); }
  catch { parseFailures++; continue; }
  const tsm = line.match(/^\[(\d{4}-\d{2}-\d{2}T[\d:.]+Z)\]/);
  frames.push({ frame, ts: tsm ? tsm[1] : undefined });
}

// Robustness: the engine must never throw on any real frame.
let report;
try {
  report = validateBatch(frames);
} catch (e) {
  console.error('ENGINE THREW:', e && e.stack ? e.stack : e);
  process.exit(2);
}

const byAction = {};
for (const m of report.messages) {
  if (m.kind === 'Call' && m.action) byAction[m.action] = (byAction[m.action] || 0) + 1;
}
const violationCodes = {};
for (const m of report.messages) for (const v of m.violations) violationCodes[v.layer + '/' + v.code] = (violationCodes[v.layer + '/' + v.code] || 0) + 1;

console.log('LOG:', path.split(/[\\/]/).pop());
console.log('frames extracted :', frames.length, '| JSON parse failures:', parseFailures);
console.log('summary          :', JSON.stringify(report.summary));
console.log('call actions     :', JSON.stringify(byAction));
console.log('exchange statuses:', JSON.stringify(report.exchanges.reduce((a, e) => (a[e.status] = (a[e.status] || 0) + 1, a), {})));
console.log('message violations by code:', JSON.stringify(violationCodes));
// Show up to 5 sample schema violations to judge whether they are engine bugs or genuinely non-compliant frames.
const samples = report.messages.filter(m => m.violations.some(v => v.layer === 'L2')).slice(0, 5);
for (const m of samples) {
  console.log('  L2 sample:', m.kind, m.action ?? '', '->', m.violations.map(v => v.message + (v.path ? ' @' + v.path : '')).join('; '));
}
