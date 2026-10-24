/**
 * API Cost Tracker
 * Logs every OpenAI call (chat + TTS) to logs/api-costs.jsonl.
 * Run `node scripts/cost-report.js` to see aggregate stats.
 *
 * Pricing last verified: June 2026 — check https://openai.com/pricing if rates change.
 */

const fs   = require('fs');
const path = require('path');

// ── Pricing table (USD per unit) ─────────────────────────────────────────────
const PRICING = {
  // Chat completions — per token
  'gpt-4o':              { input: 2.50  / 1_000_000, output: 10.00 / 1_000_000 },
  'gpt-4o-mini':         { input: 0.150 / 1_000_000, output: 0.600 / 1_000_000 },
  'gpt-4o-audio-preview':{ input: 2.50  / 1_000_000, output: 10.00 / 1_000_000 },

  // TTS — per character of input text
  'tts-1':    { char: 15.00 / 1_000_000 },
  'tts-1-hd': { char: 30.00 / 1_000_000 },

  // Whisper STT — per second of audio (if ever used server-side)
  'whisper-1': { second: 0.006 / 60 },
};

const LOG_PATH = path.join(__dirname, '../logs/api-costs.jsonl');

class CostTracker {
  /**
   * Record a chat completion call.
   * Call this right after `openai.chat.completions.create()` — pass the full response.
   *
   * @param {object} opts
   * @param {string}  opts.model      — e.g. 'gpt-4o' or 'gpt-4o-mini'
   * @param {object}  opts.usage      — completion.usage from the OpenAI response
   * @param {string}  [opts.purpose]  — human label, e.g. 'practice-question' or 'feedback'
   * @param {string}  [opts.sessionId]
   */
  recordChat({ model, usage, purpose = '', sessionId = null }) {
    if (!usage) return;
    const rates = PRICING[model];
    if (!rates) { console.warn(`[costTracker] unknown model: ${model}`); return; }

    const inputCost  = usage.prompt_tokens     * rates.input;
    const outputCost = usage.completion_tokens * rates.output;
    const totalCost  = inputCost + outputCost;

    const entry = {
      type:             'chat',
      model,
      purpose,
      sessionId,
      prompt_tokens:    usage.prompt_tokens,
      completion_tokens:usage.completion_tokens,
      total_tokens:     usage.total_tokens,
      input_cost_usd:   inputCost,
      output_cost_usd:  outputCost,
      total_cost_usd:   totalCost,
      ts:               new Date().toISOString(),
    };

    this._append(entry);
    this._print(entry);
  }

  /**
   * Record a TTS call.
   * Call this right after `openai.audio.speech.create()`.
   *
   * @param {object} opts
   * @param {number}  opts.chars      — input text length (text.length)
   * @param {string}  [opts.model]    — defaults to 'tts-1'
   * @param {string}  [opts.purpose]
   * @param {string}  [opts.sessionId]
   */
  recordTts({ chars, model = 'tts-1', purpose = 'tts', sessionId = null }) {
    const rates = PRICING[model];
    if (!rates?.char) { console.warn(`[costTracker] no TTS rate for: ${model}`); return; }

    const totalCost = chars * rates.char;

    const entry = {
      type:          'tts',
      model,
      purpose,
      sessionId,
      chars,
      total_cost_usd: totalCost,
      ts:             new Date().toISOString(),
    };

    this._append(entry);
    this._print(entry);
  }

  /**
   * Record a Whisper STT call (if used server-side).
   *
   * @param {object} opts
   * @param {number}  opts.audioSeconds
   * @param {string}  [opts.purpose]
   * @param {string}  [opts.sessionId]
   */
  recordWhisper({ audioSeconds, purpose = 'stt', sessionId = null }) {
    const rates = PRICING['whisper-1'];
    const totalCost = audioSeconds * rates.second;

    const entry = {
      type:           'stt',
      model:          'whisper-1',
      purpose,
      sessionId,
      audio_seconds:  audioSeconds,
      total_cost_usd: totalCost,
      ts:             new Date().toISOString(),
    };

    this._append(entry);
    this._print(entry);
  }

  // ── internals ──────────────────────────────────────────────────────────────

  _append(entry) {
    try {
      fs.appendFileSync(LOG_PATH, JSON.stringify(entry) + '\n');
    } catch (e) {
      console.error('[costTracker] failed to write log:', e.message);
    }
  }

  _print(entry) {
    const cost = `$${entry.total_cost_usd.toFixed(6)}`;
    if (entry.type === 'chat') {
      console.log(`[cost] ${entry.model} | ${entry.purpose} | in:${entry.prompt_tokens} out:${entry.completion_tokens} | ${cost}`);
    } else if (entry.type === 'tts') {
      console.log(`[cost] ${entry.model} | ${entry.purpose} | ${entry.chars} chars | ${cost}`);
    } else {
      console.log(`[cost] ${entry.model} | ${entry.purpose} | ${cost}`);
    }
  }
}

module.exports = new CostTracker();
