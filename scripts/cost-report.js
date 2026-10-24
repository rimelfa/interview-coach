/**
 * API Cost Report
 * Run: node scripts/cost-report.js
 * Optional flags:
 *   --last 7          show only last N days  (default: all time)
 *   --session <id>    show a single session
 *   --by session      group by sessionId
 */

const fs   = require('fs');
const path = require('path');

const LOG_PATH = path.join(__dirname, '../logs/api-costs.jsonl');

// ── Parse args ────────────────────────────────────────────────────────────────
const args    = process.argv.slice(2);
const lastIdx = args.indexOf('--last');
const sesIdx  = args.indexOf('--session');
const byIdx   = args.indexOf('--by');

const lastDays    = lastIdx >= 0  ? parseInt(args[lastIdx + 1])  : null;
const filterSid   = sesIdx >= 0   ? args[sesIdx + 1]             : null;
const groupBy     = byIdx >= 0    ? args[byIdx + 1]              : 'purpose';

// ── Load log ──────────────────────────────────────────────────────────────────
if (!fs.existsSync(LOG_PATH)) {
  console.log('No cost log found yet. Run a simulator session first.');
  process.exit(0);
}

const raw     = fs.readFileSync(LOG_PATH, 'utf8').trim();
const allEntries = raw
  .split('\n')
  .filter(Boolean)
  .map(l => { try { return JSON.parse(l); } catch { return null; } })
  .filter(Boolean);

// ── Filter ────────────────────────────────────────────────────────────────────
let entries = allEntries;

if (lastDays !== null) {
  const cutoff = new Date(Date.now() - lastDays * 86_400_000).toISOString();
  entries = entries.filter(e => e.ts >= cutoff);
}
if (filterSid) {
  entries = entries.filter(e => e.sessionId === filterSid);
}

// ── Aggregate helpers ─────────────────────────────────────────────────────────
function sum(arr, key) {
  return arr.reduce((a, e) => a + (e[key] || 0), 0);
}

function groupAndSum(entries, keyFn) {
  const map = {};
  for (const e of entries) {
    const k = keyFn(e) || '(unknown)';
    if (!map[k]) map[k] = { entries: [], cost: 0 };
    map[k].entries.push(e);
    map[k].cost += e.total_cost_usd || 0;
  }
  return map;
}

function fmt(usd) {
  return usd < 0.01 ? `$${usd.toFixed(6)}` : `$${usd.toFixed(4)}`;
}

function divider(char = '─', len = 60) {
  return char.repeat(len);
}

// ── Print ─────────────────────────────────────────────────────────────────────
const totalCost   = sum(entries, 'total_cost_usd');
const totalTokens = sum(entries, 'total_tokens');
const totalChars  = sum(entries, 'chars');
const dateRange   = lastDays ? `last ${lastDays} days` : 'all time';
const sessionNote = filterSid ? ` | session: ${filterSid}` : '';

console.log('');
console.log(`  API Cost Report — ${dateRange}${sessionNote}`);
console.log(`  ${entries.length} calls  |  ${allEntries.length} total in log`);
console.log(divider());

// By model
console.log('\n  BY MODEL\n');
const byModel = groupAndSum(entries, e => e.model);
for (const [model, data] of Object.entries(byModel).sort((a, b) => b[1].cost - a[1].cost)) {
  const chatEntries = data.entries.filter(e => e.type === 'chat');
  const ttsEntries  = data.entries.filter(e => e.type === 'tts');
  const inTok  = sum(chatEntries, 'prompt_tokens');
  const outTok = sum(chatEntries, 'completion_tokens');
  const chars  = sum(ttsEntries, 'chars');

  let detail = chatEntries.length ? `in:${inTok.toLocaleString()} out:${outTok.toLocaleString()} tokens` : '';
  if (ttsEntries.length) detail += (detail ? '  |  ' : '') + `${chars.toLocaleString()} chars`;

  console.log(`  ${model.padEnd(22)} ${fmt(data.cost).padStart(10)}   ${data.entries.length} calls   ${detail}`);
}

// By purpose
console.log('\n  BY PURPOSE\n');
const byPurpose = groupAndSum(entries, e => e.purpose);
for (const [purpose, data] of Object.entries(byPurpose).sort((a, b) => b[1].cost - a[1].cost)) {
  console.log(`  ${purpose.padEnd(26)} ${fmt(data.cost).padStart(10)}   ${data.entries.length} calls`);
}

// By session (if multiple sessions exist and no filter applied)
if (!filterSid) {
  const sessions = [...new Set(entries.map(e => e.sessionId).filter(Boolean))];
  if (sessions.length > 1) {
    console.log('\n  BY SESSION (most expensive first)\n');
    const bySid = groupAndSum(entries.filter(e => e.sessionId), e => e.sessionId);
    for (const [sid, data] of Object.entries(bySid).sort((a, b) => b[1].cost - a[1].cost)) {
      const first = data.entries[0]?.ts?.slice(0, 16).replace('T', ' ') || '';
      console.log(`  ${sid.slice(0, 8)}…  ${fmt(data.cost).padStart(10)}   ${data.entries.length} calls   ${first}`);
    }
  }
}

// Cost per session (estimate — across all sessions)
const sessionCount = new Set(entries.map(e => e.sessionId).filter(Boolean)).size;
if (sessionCount > 0) {
  console.log('');
  console.log(divider());
  console.log(`  Average cost per tracked session: ${fmt(totalCost / sessionCount)}`);
}

// Grand total
console.log('');
console.log(divider('═'));
console.log(`  TOTAL  ${fmt(totalCost).padStart(52)}`);
console.log(divider('═'));
console.log('');
