/**
 * Generate a sample clip for each OpenAI TTS voice.
 * Run: node scripts/preview-voices.js
 * Outputs to promo-video/public/vo/voice-samples/
 */

require("dotenv").config();
const OpenAI = require("openai");
const fs = require("fs");
const path = require("path");

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const OUT_DIR = path.join(__dirname, "../promo-video/public/vo/voice-samples");

const SAMPLE_TEXT =
  "Still rehearsing interview answers in your head? Good Chat puts you in a real interview room — live AI interviewer, instant debrief, per-word coaching. Practice out loud. Walk in ready.";

const VOICES = ["alloy", "echo", "fable", "onyx", "nova", "shimmer"];

async function generate(voice) {
  const file = `sample-${voice}.mp3`;
  const outPath = path.join(OUT_DIR, file);
  console.log(`  gen   ${file} …`);
  const response = await client.audio.speech.create({
    model: "tts-1-hd",
    voice,
    input: SAMPLE_TEXT,
    response_format: "mp3",
  });
  const buffer = Buffer.from(await response.arrayBuffer());
  fs.writeFileSync(outPath, buffer);
  console.log(`  done  ${file}`);
}

(async () => {
  if (!process.env.OPENAI_API_KEY) {
    console.error("OPENAI_API_KEY is not set.");
    process.exit(1);
  }
  fs.mkdirSync(OUT_DIR, { recursive: true });
  console.log(`Generating samples for: ${VOICES.join(", ")}\n`);
  for (const voice of VOICES) {
    await generate(voice);
  }
  console.log(`\nAll done → ${OUT_DIR}`);
  console.log("\nVoices to compare:");
  console.log("  alloy   — neutral, balanced (male/androgynous)");
  console.log("  echo    — warm, natural (male)");
  console.log("  fable   — expressive, storytelling feel (male, slight British)");
  console.log("  onyx    — deep, authoritative (male) ← current");
  console.log("  nova    — warm, energetic (female)");
  console.log("  shimmer — clear, bright (female)");
})();
