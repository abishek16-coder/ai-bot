import "dotenv/config";
import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { GoogleGenAI } from "@google/genai";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3001;
const API_KEY = process.env.GEMINI_API_KEY;
const MODEL = process.env.GEMINI_MODEL || "gemini-3.5-flash-lite";

if (!API_KEY) {
  console.error("GEMINI_API_KEY is missing in .env file!");
  process.exit(1);
}

const app = express();
app.use(cors());
app.use(express.json({ limit: "100kb" }));

/* ---------- Created once at startup ---------- */
const ai = new GoogleGenAI({ apiKey: API_KEY });

const KNOWLEDGE_PATH = path.join(__dirname, "knowledge.txt"); // your Navarathiri facts
const KNOWLEDGE = fs.existsSync(KNOWLEDGE_PATH)
  ? fs.readFileSync(KNOWLEDGE_PATH, "utf8").trim()
  : "";
if (!KNOWLEDGE) console.warn("WARNING: knowledge.txt missing or empty.");

const SYSTEM_PROMPT = `You are Navarathiri AI, a warm, friendly woman who loves Hindu festivals, epics and scriptures. You are talking out loud with someone, so write exactly the way a person would speak.

LANGUAGE
- Reply in the language the user used. Tamil script in, Tamil out (natural spoken Tamil, not stiff written Tamil). English in, English out.
- If they naturally mix Tamil and English, reply in the same natural mix.
- If they type Tamil in English letters, reply in Tamil script.

STYLE (this is spoken aloud)
- One to three short sentences, four at most. Lead with the answer.
- Sound like a kind friend, not a textbook. Contractions and soft connectors are fine.
- No markdown, lists, emojis, brackets, or symbols. Write numbers and dates the way you would say them.
- Don't open with "Great question", "Sure", or "Of course". Don't repeat the question back.

ACCURACY
- Use the KNOWLEDGE section first.
- If it doesn't cover the question, answer from well-established general knowledge only when you are confident, and mention that customs vary by region and family when it matters.
- If you are not confident, say so in one short sentence in the user's language and suggest asking a temple priest or scholar. Never invent details.
- If the question is unrelated to Hindu festivals, epics or scriptures, say kindly that it's outside what you cover and invite a question about Navarathiri, Ramayana or Mahabharata.`;

// Identical on every request -> enables implicit caching on the prefix
const SYSTEM_INSTRUCTION = `${SYSTEM_PROMPT}\n\nKNOWLEDGE:\n${KNOWLEDGE}`;

const GEN_CONFIG = {
  systemInstruction: SYSTEM_INSTRUCTION,
  temperature: 0.7,
  topP: 0.9,
  maxOutputTokens: 256,
  // Biggest latency win. If your SDK version rejects this, use { thinkingBudget: 0 }
  thinkingConfig: { thinkingLevel: "minimal" },
};

function buildContents(question, history) {
  const contents = [];
  const recent = Array.isArray(history) ? history.slice(-3) : [];
  for (const t of recent) {
    if (t?.question) contents.push({ role: "user", parts: [{ text: String(t.question) }] });
    if (t?.answer) contents.push({ role: "model", parts: [{ text: String(t.answer) }] });
  }
  contents.push({ role: "user", parts: [{ text: question }] });
  return contents;
}

/* ---------- Streaming endpoint (use this for voice) ---------- */
app.post("/api/chat/stream", async (req, res) => {
  const question = req.body?.question?.trim();
  if (!question) return res.status(400).json({ error: "Question is required" });

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  const controller = new AbortController();
  res.on("close", () => controller.abort()); // user interrupted or left

  try {
    const stream = await ai.models.generateContentStream({
      model: MODEL,
      contents: buildContents(question, req.body.history),
      config: { ...GEN_CONFIG, abortSignal: controller.signal },
    });

    for await (const chunk of stream) {
      const text = chunk.text;
      if (text) res.write(`data: ${JSON.stringify({ text })}\n\n`);
    }
    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
  } catch (err) {
    if (!controller.signal.aborted) {
      console.error("Gemini API Error:", err.message);
      res.write(`data: ${JSON.stringify({ error: "Failed to get response" })}\n\n`);
    }
  } finally {
    res.end();
  }
});

/* ---------- Non-streaming fallback (same behaviour, one JSON reply) ---------- */
app.post("/api/chat", async (req, res) => {
  const question = req.body?.question?.trim();
  if (!question) return res.status(400).json({ error: "Question is required" });
  try {
    const result = await ai.models.generateContent({
      model: MODEL,
      contents: buildContents(question, req.body.history),
      config: GEN_CONFIG,
    });
    res.json({ answer: (result.text || "").trim() });
  } catch (err) {
    console.error("Gemini API Error:", err.message);
    res.status(500).json({ error: "Failed to get response from AI", details: err.message });
  }
});

app.get("/api/health", (_req, res) =>
  res.json({ status: "ok", message: "Navarathiri AI Backend is running", knowledgeChars: KNOWLEDGE.length })
);

app.listen(PORT, () => {
  console.log(`\nNavarathiri AI Backend running on http://localhost:${PORT}`);
  console.log(`   Health check: http://localhost:${PORT}/api/health\n`);
});
