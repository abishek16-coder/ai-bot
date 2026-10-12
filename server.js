import "dotenv/config";
import express from "express";
import cors from "cors";
import {
  GoogleGenerativeAI,
} from "@google/generative-ai";

/* =========================================================
   CONFIG
========================================================= */

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3001;
const API_KEY = process.env.GEMINI_API_KEY;

if (!API_KEY) {
  console.error(
    "❌ GEMINI_API_KEY is missing in .env file!"
  );
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(API_KEY);

/* =========================================================
   SYSTEM PROMPT
========================================================= */

const SYSTEM_PROMPT = `You are "Navarathiri AI", a deeply knowledgeable and culturally respectful voice assistant specialized in Hindu festivals, epics, and scriptures.

Your expertise areas:
- Navarathiri / Navaratri (9-day festival, Golu/Kolu traditions, daily goddess worship, Durga, Lakshmi, Saraswati, regional practices across India)
- Ramayana (all kandas including Bala, Ayodhya, Aranya, Kishkindha, Sundara, Yuddha, Uttara — characters, events, teachings)
- Sundarakanda (Hanuman's journey to Lanka, ocean crossing, Lankini, Surasa, Simhika, Mainaka, finding Sita in Ashoka Vatika, Chudamani, burning Lanka, return)
- Mahabharata (Pandavas, Kauravas, Kurukshetra war, dice game, exile, key events and characters)
- Bhagavad Gita (Krishna-Arjuna dialogue on the battlefield, key chapters, Karma Yoga, Bhakti Yoga, Jnana Yoga, key shlokas)
- Hindu deities, temples, festivals, and cultural practices

Response Rules:
1. If the user's language preference is "tamil", respond ENTIRELY in Tamil script (தமிழ்). Do NOT mix English words unless they are universally known proper nouns.
2. If the language preference is "english", respond in clear, simple English.
3. Keep answers concise — 2 to 4 short paragraphs maximum. This is CRITICAL because your answers will be read aloud by text-to-speech, so they must sound natural when spoken.
4. Be culturally respectful, reverent, and accurate.
5. For questions outside Hindu mythology/festivals/scriptures, politely say this is outside your expertise and suggest the user ask about Navarathiri, Ramayana, Mahabharata, or related topics.
6. Do NOT use any markdown formatting (no **, ##, bullet points, numbered lists, etc.) since the answer is displayed as plain text and spoken aloud. Write in natural flowing paragraphs.
7. Do NOT start with filler phrases like "Great question!", "Sure!", "Of course!" — just answer directly and respectfully.
8. When discussing scriptures, note that traditions and interpretations can vary by region and text.`;

/* =========================================================
   CHAT ENDPOINT
========================================================= */

app.post("/api/chat", async (req, res) => {
  try {
    const { question, language, history } =
      req.body;

    if (!question || !question.trim()) {
      return res
        .status(400)
        .json({
          error: "Question is required",
        });
    }

    const model =
      genAI.getGenerativeModel({
        model: "gemini-2.0-flash",
        systemInstruction: SYSTEM_PROMPT,
      });

    /* Build conversation history for multi-turn context */
    const contents = [];

    if (
      history &&
      Array.isArray(history)
    ) {
      for (const turn of history.slice(
        -5
      )) {
        if (turn.question) {
          contents.push({
            role: "user",
            parts: [
              { text: turn.question },
            ],
          });
        }

        if (turn.answer) {
          contents.push({
            role: "model",
            parts: [
              { text: turn.answer },
            ],
          });
        }
      }
    }

    /* Current question with language context */
    const userMessage = `[User's preferred language: ${language || "english"}]\n\nQuestion: ${question}`;

    contents.push({
      role: "user",
      parts: [{ text: userMessage }],
    });

    const result =
      await model.generateContent({
        contents,
      });

    const response =
      result.response.text();

    res.json({ answer: response });
  } catch (error) {
    console.error(
      "Gemini API Error:",
      error.message
    );

    res.status(500).json({
      error:
        "Failed to get response from AI",
      details: error.message,
    });
  }
});

/* =========================================================
   HEALTH CHECK
========================================================= */

app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    message: "Navarathiri AI Backend is running",
  });
});

/* =========================================================
   START
========================================================= */

app.listen(PORT, () => {
  console.log(
    `\n🙏 Navarathiri AI Backend running on http://localhost:${PORT}`
  );
  console.log(
    `   Health check: http://localhost:${PORT}/api/health\n`
  );
});
