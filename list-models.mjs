import "dotenv/config";

const key = process.env.GEMINI_API_KEY;
const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`;

try {
  const resp = await fetch(url);
  const data = await resp.json();
  if (data.models) {
    console.log("AVAILABLE MODELS:");
    data.models.forEach(m => console.log(m.name, m.supportedGenerationMethods));
  } else {
    console.log("Response:", JSON.stringify(data, null, 2));
  }
} catch (e) {
  console.error("Error listing models:", e);
}
