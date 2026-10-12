/* =========================================================
   GEMINI SERVICE
   
   Calls the backend proxy server which securely 
   communicates with Google Gemini API.
========================================================= */

export async function askGemini(
  question,
  language = "english",
  history = []
) {
  const response = await fetch(
    "/api/chat",
    {
      method: "POST",

      headers: {
        "Content-Type":
          "application/json",
      },

      body: JSON.stringify({
        question,
        language,
        history,
      }),
    }
  );

  if (!response.ok) {
    const errorData = await response
      .json()
      .catch(() => ({}));

    throw new Error(
      errorData.error ||
        `Server error: ${response.status}`
    );
  }

  const data = await response.json();
  return data.answer;
}
