/**
 * Generate voiceovers for Jureo feature promo reels.
 * Run: node scripts/generate-jureo-vos.js
 * Outputs to promo-video/public/vo/jureo/
 * Voice: echo (warm, authoritative — suits a law exam prep brand)
 */

require("dotenv").config();
const OpenAI = require("openai");
const fs = require("fs");
const path = require("path");

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const OUT_DIR = path.join(__dirname, "../promo-video/public/vo/jureo");

const SCRIPTS = [
  // ── Revision Mode ──────────────────────────────────────────────────────────
  {
    file: "revision-hook.mp3",
    text: "Studying for the SQE? Meet Jureo's Revision Mode.",
  },
  {
    file: "revision-feature.mp3",
    text: "Pick your subjects, set how many questions you want, reveal each answer when you're ready, and watch your score build in real time.",
  },

  // ── Practice Mode ──────────────────────────────────────────────────────────
  {
    file: "practice-hook.mp3",
    text: "Think you know your SQE material? This is Jureo's Practice Mode.",
  },
  {
    file: "practice-feature.mp3",
    text: "Select from five answer options, get instant feedback on every question, and track your score as you move through the session.",
  },

  // ── Exam Mode ──────────────────────────────────────────────────────────────
  {
    file: "exam-hook.mp3",
    text: "Ready to simulate the real exam? This is Jureo's Exam Mode.",
  },
  {
    file: "exam-feature.mp3",
    text: "Navigate freely between questions, flag the ones you want to revisit, and get a full results breakdown with your score the moment time's up.",
  },

  // ── Brand Reel ─────────────────────────────────────────────────────────────
  {
    file: "brand-hook.mp3",
    text: "Meet Jureo. The complete SQE1 preparation platform.",
  },
  {
    file: "brand-feature.mp3",
    text: "Three powerful modes to take you from first revision all the way to exam-day confidence.",
  },

  // ── Journey Reel ───────────────────────────────────────────────────────────
  {
    file: "journey-hook.mp3",
    text: "One platform. Three ways to master SQE1.",
  },
  {
    file: "journey-feature.mp3",
    text: "Revise at your own pace, practise with instant feedback, then simulate the full exam under real conditions.",
  },

  // ── Results Reel ───────────────────────────────────────────────────────────
  {
    file: "results-hook.mp3",
    text: "Your mock exam results are in.",
  },
  {
    file: "results-feature.mp3",
    text: "See your total score, your performance across every subject, and know exactly what to focus on before exam day.",
  },

  // ── Pressure Reel ──────────────────────────────────────────────────────────
  {
    file: "pressure-hook.mp3",
    text: "Two hours. Thirty-three minutes. Ninety questions.",
  },
  {
    file: "pressure-feature.mp3",
    text: "The SQE1 is one of the toughest professional assessments you'll face. Jureo prepares you for every second of it.",
  },
];

async function generate(entry) {
  const outPath = path.join(OUT_DIR, entry.file);
  if (fs.existsSync(outPath)) {
    console.log(`  skip  ${entry.file} (exists)`);
    return;
  }
  console.log(`  gen   ${entry.file} …`);
  const response = await client.audio.speech.create({
    model: "tts-1-hd",
    voice: "echo",
    input: entry.text,
    response_format: "mp3",
  });
  const buffer = Buffer.from(await response.arrayBuffer());
  fs.writeFileSync(outPath, buffer);
  console.log(`  done  ${entry.file} (${buffer.length} bytes)`);
}

(async () => {
  if (!process.env.OPENAI_API_KEY) { console.error("OPENAI_API_KEY not set"); process.exit(1); }
  fs.mkdirSync(OUT_DIR, { recursive: true });
  console.log(`Generating ${SCRIPTS.length} Jureo voiceovers → ${OUT_DIR}\n`);
  for (const entry of SCRIPTS) await generate(entry);
  console.log("\nAll done.");
})();
