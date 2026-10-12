import "dotenv/config";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const candidateModels = [
  "gemini-3.8-flash",
  "gemini-2.5-flash",
  "gemini-1.5-flash",
  "gemini-1.5-pro",
  "gemini-pro"
];

for (const m of candidateModels) {
  try {
    const model = genAI.getGenerativeModel({ model: m });
    const res = await model.generateContent("Hello, say Jai Shri Ram in 3 words.");
    console.log(`\n>>> SUCCESS with model: ${m}\nResponse: ${res.response.text()}\n`);
    break;
  } catch (e) {
    console.log(`FAILED with model ${m}: ${e.message}`);
  }
}
