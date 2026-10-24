/**
 * Generate voiceovers for IGReels using OpenAI TTS.
 * Run from the project root: node scripts/generate-reel-vos.js
 *
 * Outputs MP3s to promo-video/public/vo/
 * Model: tts-1-hd
 * Reel 1 & 2: nova (warm, energetic female)
 * Reel 3:     echo (warm, authoritative male)
 */

require("dotenv").config();
const OpenAI = require("openai");
const fs = require("fs");
const path = require("path");

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const OUT_DIR = path.join(__dirname, "../promo-video/public/vo");

// Scene durations at 30fps (for reference — scripts are calibrated to fit)
// R1_Hook: 100f=3.3s  R1_Live: 170f=5.7s  R1_Debrief: 90f=3.0s  CTA: 60f=2.0s
// R2_Hook:  80f=2.7s  R2_Words: 210f=7.0s  CTA: 70f=2.3s
// R3_Question: 80f=2.7s  R3_Price: 150f=5.0s  CTA: 70f=2.3s

const SCRIPTS = [
  // ── Reel 1: "Still rehearsing in your head?" — voice: nova ─────────────────
  {
    file: "reel1-hook.mp3",
    voice: "nova",
    text: "Still rehearsing interview answers in your head? Good Chat gives you a better way to prepare.",
  },
  {
    file: "reel1-live.mp3",
    voice: "nova",
    text: "Step into the interview room and meet Daniel, your AI interviewer — focused questions, real pressure, whenever you need it.",
  },
  {
    file: "reel1-debrief.mp3",
    voice: "nova",
    text: "Finish the session and your debrief is instantly ready with your score, pace, filler words, and confidence.",
  },
  {
    file: "reel1-cta.mp3",
    voice: "nova",
    text: "Good Chat — practice out loud and walk in ready.",
  },

  // ── Reel 2: "You said um 11 times" — voice: nova ───────────────────────────
  {
    file: "reel2-hook.mp3",
    voice: "nova",
    text: "You said um eleven times in your last interview and you probably didn't even notice — but your interviewer did.",
  },
  {
    file: "reel2-words.mp3",
    voice: "nova",
    text: "Good Chat highlights your strong answers, flags the vague ones, and calls out every filler word in red, then gives you the one thing to fix.",
  },
  {
    file: "reel2-cta.mp3",
    voice: "nova",
    text: "Fix it before the real thing with Good Chat.",
  },

  // ── Reel 3: "£6.99 for a full mock interview" — voice: echo ────────────────
  {
    file: "reel3-question.mp3",
    voice: "echo",
    text: "How much does serious interview prep cost? A coach is up to three hundred an hour, and a professional mock service is up to a hundred.",
  },
  {
    file: "reel3-price.mp3",
    voice: "echo",
    text: "Good Chat is six ninety-nine a month — fifty mock interviews tailored to your CV, a live AI interviewer, per-word coaching, and a full debrief with your score.",
  },
  {
    file: "reel3-cta.mp3",
    voice: "echo",
    text: "Serious prep, not serious money.",
  },
];

async function generate(entry) {
  const outPath = path.join(OUT_DIR, entry.file);
  if (fs.existsSync(outPath)) {
    console.log(`  skip  ${entry.file} (already exists)`);
    return;
  }
  console.log(`  gen   ${entry.file} …`);
  const response = await client.audio.speech.create({
    model: "tts-1-hd",
    voice: entry.voice,
    input: entry.text,
    response_format: "mp3",
  });
  const buffer = Buffer.from(await response.arrayBuffer());
  fs.writeFileSync(outPath, buffer);
  console.log(`  done  ${entry.file} (${buffer.length} bytes)`);
}

(async () => {
  if (!process.env.OPENAI_API_KEY) {
    console.error("OPENAI_API_KEY is not set.");
    process.exit(1);
  }
  fs.mkdirSync(OUT_DIR, { recursive: true });
  console.log(`Generating ${SCRIPTS.length} voiceovers → ${OUT_DIR}\n`);
  for (const entry of SCRIPTS) {
    await generate(entry);
  }
  console.log("\nAll done.");
})();
