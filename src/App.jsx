import {
  useEffect,
  useRef,
  useState,
} from "react";

import "./App.css";
import "./sundarakanda.css";

import { askGemini } from "./services/geminiService";

/* =========================================================
   NAVARATHIRI DAY DATA (for visual cards only)
========================================================= */

const NAVARATHIRI_DAYS = {
  1: {
    goddess: "Shailaputri",
    goddessTamil: "சைலபுத்திரி",
  },
  2: {
    goddess: "Brahmacharini",
    goddessTamil: "பிரம்மசாரிணி",
  },
  3: {
    goddess: "Chandraghanta",
    goddessTamil: "சந்திரகாந்தா",
  },
  4: {
    goddess: "Kushmanda",
    goddessTamil: "கூஷ்மாண்டா",
  },
  5: {
    goddess: "Skandamata",
    goddessTamil: "ஸ்கந்தமாதா",
  },
  6: {
    goddess: "Katyayani",
    goddessTamil: "காத்யாயினி",
  },
  7: {
    goddess: "Kalaratri",
    goddessTamil: "காலராத்திரி",
  },
  8: {
    goddess: "Mahagauri",
    goddessTamil: "மஹாகௌரி",
  },
  9: {
    goddess: "Siddhidatri",
    goddessTamil: "சித்திதாத்ரி",
  },
};

/* =========================================================
   VISUAL DETECTION  
   Simple keyword detection to show the right visual card.
   The actual ANSWER comes from Gemini — this just picks
   which decorative card to display alongside it.
========================================================= */

const detectVisual = (question) => {
  const q = String(
    question || ""
  ).toLowerCase();

  /* Navarathiri day */
  const dayMatch = q.match(
    /(?:day|நாள்)\s*(\d)/
  );

  if (dayMatch) {
    const day = parseInt(
      dayMatch[1],
      10
    );

    if (day >= 1 && day <= 9) {
      const info =
        NAVARATHIRI_DAYS[day];

      return {
        type: "navarathiri-day",
        day,
        goddess: info?.goddess,
        goddessTamil:
          info?.goddessTamil,
      };
    }
  }

  /* Tamil day words */
  const tamilDayWords = {
    முதல்: 1,
    முதலா: 1,
    இரண்டா: 2,
    மூன்றா: 3,
    நான்கா: 4,
    ஐந்தா: 5,
    ஆறா: 6,
    ஏழா: 7,
    எட்டா: 8,
    ஒன்பதா: 9,
  };

  for (const [
    word,
    day,
  ] of Object.entries(
    tamilDayWords
  )) {
    if (
      q.includes(word) &&
      (q.includes("நாள்") ||
        q.includes("நவராத்திரி"))
    ) {
      const info =
        NAVARATHIRI_DAYS[day];

      return {
        type: "navarathiri-day",
        day,
        goddess: info?.goddess,
        goddessTamil:
          info?.goddessTamil,
      };
    }
  }

  /* Sundarakanda */
  if (
    q.includes("sundarakanda") ||
    q.includes("sundara kanda") ||
    q.includes("சுந்தரகாண்டம்") ||
    q.includes("சுந்தர காண்டம்")
  ) {
    return {
      type: "sundarakanda",
    };
  }

  /* Ramayana */
  if (
    q.includes("ramayana") ||
    q.includes("ராமாயணம்")
  ) {
    return { type: "ramayana" };
  }

  /* Mahabharata */
  if (
    q.includes("mahabharata") ||
    q.includes("மகாபாரதம்") ||
    q.includes("kurukshetra") ||
    q.includes("குருக்ஷேத்திரம்")
  ) {
    return {
      type: "mahabharata",
    };
  }

  /* Bhagavad Gita */
  if (
    q.includes("gita") ||
    q.includes("கீதை")
  ) {
    return { type: "gita" };
  }

  /* Navarathiri general */
  if (
    q.includes("navarathiri") ||
    q.includes("navaratri") ||
    q.includes("navratri") ||
    q.includes("நவராத்திரி") ||
    q.includes("golu") ||
    q.includes("kolu") ||
    q.includes("கொலு") ||
    q.includes("கோலு")
  ) {
    return {
      type: "navarathiri",
    };
  }

  return null;
};

/* =========================================================
   APP
========================================================= */

function App() {
  const [language, setLanguage] =
    useState("tamil");

  const [question, setQuestion] =
    useState("");

  const [answer, setAnswer] =
    useState("");

  const [
    isListening,
    setIsListening,
  ] = useState(false);

  const [
    isSpeaking,
    setIsSpeaking,
  ] = useState(false);

  const [isLoading, setIsLoading] =
    useState(false);

  const [textInput, setTextInput] =
    useState("");

  const [
    conversation,
    setConversation,
  ] = useState([]);

  const [
    selectedConversationId,
    setSelectedConversationId,
  ] = useState(null);

  const [
    speakingConversationId,
    setSpeakingConversationId,
  ] = useState(null);

  const [chartData, setChartData] =
    useState(null);

  const conversationEndRef =
    useRef(null);

  /* =======================================================
     AUTO SCROLL
  ======================================================= */

  useEffect(() => {
    conversationEndRef.current?.scrollIntoView(
      {
        behavior: "smooth",
        block: "end",
      }
    );
  }, [
    conversation,
    selectedConversationId,
  ]);

  /* =======================================================
     SPEECH SYNTHESIS
  ======================================================= */

  const stopSpeaking = () => {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }

    setIsSpeaking(false);
    setSpeakingConversationId(null);
  };

  const speakAnswer = (
    text,
    conversationId = null
  ) => {
    if (!window.speechSynthesis) {
      return;
    }

    window.speechSynthesis.cancel();

    setIsSpeaking(false);
    setSpeakingConversationId(null);

    const speak = () => {
      const voices =
        window.speechSynthesis.getVoices();

      const speech =
        new SpeechSynthesisUtterance(
          text
        );

      if (language === "tamil") {
        const tamilVoice =
          voices.find((voice) =>
            voice.lang?.toLowerCase().startsWith("ta") &&
            (voice.name.toLowerCase().includes("female") ||
              voice.name.toLowerCase().includes("woman") ||
              voice.name.toLowerCase().includes("anushka") ||
              voice.name.toLowerCase().includes("vasanth"))
          ) ||
          voices.find((voice) =>
            voice.lang?.toLowerCase().startsWith("ta")
          );

        if (tamilVoice) {
          speech.voice = tamilVoice;
          speech.lang = tamilVoice.lang;
        } else {
          speech.lang = "ta-IN";
        }
      } else {
        const englishVoice =
          voices.find(
            (voice) =>
              voice.lang?.toLowerCase().includes("en") &&
              (voice.name.toLowerCase().includes("female") ||
                voice.name.toLowerCase().includes("woman") ||
                voice.name.toLowerCase().includes("zira") ||
                voice.name.toLowerCase().includes("samantha") ||
                voice.name.toLowerCase().includes("amy"))
          ) ||
          voices.find((voice) =>
            voice.lang?.toLowerCase().startsWith("en")
          );

        if (englishVoice) {
          speech.voice = englishVoice;
          speech.lang = englishVoice.lang;
        } else {
          speech.lang = "en-US";
        }
      }

      speech.rate = 0.95;
      speech.pitch = 1.0;
      speech.volume = 1.0;

      speech.onstart = () => {
        setIsSpeaking(true);
        setSpeakingConversationId(
          conversationId
        );
      };

      speech.onend = () => {
        setIsSpeaking(false);
        setSpeakingConversationId(
          null
        );
      };

      speech.onerror = () => {
        setIsSpeaking(false);
        setSpeakingConversationId(
          null
        );
      };

      window.speechSynthesis.speak(
        speech
      );
    };

    if (
      window.speechSynthesis.getVoices()
        .length === 0
    ) {
      window.speechSynthesis.onvoiceschanged =
        () => {
          speak();

          window.speechSynthesis.onvoiceschanged =
            null;
        };
    } else {
      speak();
    }
  };

  /* =======================================================
     FIND ANSWER — calls Gemini API
  ======================================================= */

  const findAnswer = async (
    userQuestion
  ) => {
    const text = String(
      userQuestion || ""
    ).trim();

    if (!text || isLoading) return;

    stopSpeaking();

    const id = `${Date.now()}-${Math.random()}`;

    /* Immediately show the question + loading state */
    setQuestion(text);
    setAnswer("");
    setChartData(null);
    setIsLoading(true);

    setConversation((prev) => [
      ...prev,
      {
        id,
        question: text,
        answer: null,
        chart: null,
        language,
        isLoading: true,
      },
    ]);

    setSelectedConversationId(id);

    try {
      /* Build history for context (last 5 turns) */
      const history = conversation
        .filter(
          (c) =>
            c.answer && !c.isLoading
        )
        .slice(-5)
        .map((c) => ({
          question: c.question,
          answer: c.answer,
        }));

      /* Call Gemini via backend */
      const aiAnswer =
        await askGemini(
          text,
          language,
          history
        );

      /* Detect visual card type */
      const visual =
        detectVisual(text);

      /* Update conversation entry with the answer */
      setConversation((prev) =>
        prev.map((c) =>
          c.id === id
            ? {
                ...c,
                answer: aiAnswer,
                chart: visual,
                isLoading: false,
              }
            : c
        )
      );

      setAnswer(aiAnswer);
      setChartData(visual);
      setIsLoading(false);

      /* Speak the answer */
      speakAnswer(aiAnswer, id);
    } catch (error) {
      console.error(
        "AI Error:",
        error
      );

      const errorMsg =
        language === "tamil"
          ? "மன்னிக்கவும், AI பதில் பெற இயலவில்லை. இணைய இணைப்பை சரிபார்த்து மீண்டும் முயற்சிக்கவும்."
          : "Sorry, I couldn't get a response from AI. Please check your connection and try again.";

      setConversation((prev) =>
        prev.map((c) =>
          c.id === id
            ? {
                ...c,
                answer: errorMsg,
                isLoading: false,
                isError: true,
              }
            : c
        )
      );

      setAnswer(errorMsg);
      setIsLoading(false);
    }
  };

  /* =======================================================
     TEXT INPUT HANDLER
  ======================================================= */

  const handleTextSubmit = (e) => {
    e.preventDefault();

    const text = textInput.trim();

    if (!text || isLoading) return;

    setTextInput("");
    findAnswer(text);
  };

  /* =======================================================
     MICROPHONE
  ======================================================= */

  const startListening = () => {
    const SpeechRecognition =
      window.SpeechRecognition ||
      window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      const message =
        language === "tamil"
          ? "இந்த browser-ல் voice recognition support இல்லை."
          : "Voice recognition is not supported in this browser.";

      setAnswer(message);
      return;
    }

    if (isLoading) return;

    stopSpeaking();

    const recognition =
      new SpeechRecognition();

    recognition.lang =
      language === "tamil"
        ? "ta-IN"
        : "en-IN";

    recognition.interimResults = false;
    recognition.continuous = false;
    recognition.maxAlternatives = 1;

    setIsListening(true);

    recognition.start();

    recognition.onresult = (
      event
    ) => {
      const spokenText =
        event.results[0][0]
          .transcript;

      setIsListening(false);
      findAnswer(spokenText);
    };

    recognition.onerror = () => {
      setIsListening(false);

      setAnswer(
        language === "tamil"
          ? "Voice கேட்கும்போது ஒரு பிரச்சனை ஏற்பட்டது. மீண்டும் முயற்சி செய்."
          : "There was a problem with voice recognition. Please try again."
      );
    };

    recognition.onend = () => {
      setIsListening(false);
    };
  };

  /* =======================================================
     SUGGESTIONS
  ======================================================= */

  const suggestions = [
    [
      "🪔",
      "What is Navarathiri?",
    ],

    [
      "🌸",
      "What is Day 1 of Navarathiri?",
    ],

    [
      "🌸",
      "What is Day 2 of Navarathiri?",
    ],

    [
      "🌸",
      "What is Day 3 of Navarathiri?",
    ],

    [
      "🌸",
      "What is Day 4 of Navarathiri?",
    ],

    [
      "🌸",
      "What is Day 5 of Navarathiri?",
    ],

    [
      "🌸",
      "What is Day 6 of Navarathiri?",
    ],

    [
      "🌸",
      "What is Day 7 of Navarathiri?",
    ],

    [
      "🌸",
      "What is Day 8 of Navarathiri?",
    ],

    [
      "🌺",
      "What is Day 9 of Navarathiri?",
    ],

    [
      "🏹",
      "Tell me about Ramayana",
    ],

    [
      "🙏",
      "Tell me about Sundarakanda",
    ],

    [
      "🌊",
      "Tell me about Hanuman's great leap",
    ],

    [
      "🌸",
      "Where did Hanuman find Sita?",
    ],

    [
      "🔥",
      "Tell me about the burning of Lanka",
    ],

    [
      "💎",
      "What did Sita give Hanuman?",
    ],

    [
      "🙏",
      "What is the significance of Sundarakanda?",
    ],

    [
      "⚔️",
      "Tell me about Mahabharata",
    ],

    [
      "🙏",
      "Who is Hanuman?",
    ],

    [
      "🏹",
      "Who is Arjuna?",
    ],

    [
      "⚔️",
      "Who is Karna?",
    ],

    [
      "🛡️",
      "Who is Bhishma?",
    ],

    [
      "🛡️",
      "Who is Drona?",
    ],

    [
      "👑",
      "Who is Draupadi?",
    ],

    [
      "👑",
      "Who is Kunti?",
    ],

    [
      "🪷",
      "Who is Krishna?",
    ],

    [
      "🏹",
      "Who are the Pandavas?",
    ],

    [
      "📖",
      "What is Bhagavad Gita?",
    ],
  ];

  /* =======================================================
     SELECTED CONVERSATION
  ======================================================= */

  const selectedConversation =
    conversation.find(
      (item) =>
        item.id ===
        selectedConversationId
    );

  /* =======================================================
     HISTORY ICON
  ======================================================= */

  const getHistoryIcon = (item) => {
    const text = (
      item.question || ""
    ).toLowerCase();

    if (
      text.includes("sundarakanda")
    )
      return "🙏";

    if (text.includes("ramayana"))
      return "🏹";

    if (
      text.includes("mahabharata") ||
      text.includes("pandava")
    )
      return "⚔️";

    if (text.includes("gita"))
      return "📖";

    if (
      text.includes("navarathiri")
    )
      return "🪔";

    return "✦";
  };

  /* =======================================================
     RENDER VISUAL
  ======================================================= */

  const renderVisual = (visual) => {
    if (!visual) return null;

    /* NAVARATHIRI DAY */

    if (
      visual.type ===
      "navarathiri-day"
    ) {
      return (
        <div className="visual-card">
          <div className="visual-header">
            <span>🌸</span>
            <span>
              {language === "tamil"
                ? "நவராத்திரி நாள்"
                : "Navarathiri Day"}
            </span>
          </div>

          <div className="single-day-visual">
            <div className="single-day-number">
              {visual.day}
            </div>

            <div className="single-day-content">
              <span className="single-day-label">
                {language === "tamil"
                  ? `நாள் ${visual.day}`
                  : `Day ${visual.day}`}
              </span>

              <h3>
                {language === "tamil"
                  ? visual.goddessTamil
                  : visual.goddess}
              </h3>
            </div>
          </div>
        </div>
      );
    }

    /* SUNDARAKANDA */

    if (
      visual.type === "sundarakanda"
    ) {
      return (
        <div className="visual-card">
          <div className="visual-header">
            <span>🙏</span>
            <span>
              Sundarakanda
            </span>
          </div>

          <div className="epic-visual">
            <div className="epic-icon">
              🙏
            </div>

            <div className="epic-content">
              <h3>
                Sundarakanda
              </h3>

              <div className="epic-flow">
                <span>
                  🌊 Ocean
                </span>

                <b>→</b>

                <span>
                  🙏 Hanuman
                </span>

                <b>→</b>

                <span>
                  🌸 Sita
                </span>

                <b>→</b>

                <span>
                  🔥 Lanka
                </span>

                <b>→</b>

                <span>
                  💎 Chudamani
                </span>
              </div>

              <p>
                {language === "tamil"
                  ? "அனுமனின் பக்தி, அறிவு, துணிவு மற்றும் தூதுப் பயணத்தை மையமாகக் கொண்ட சுந்தரகாண்டம்."
                  : "A visual summary of Hanuman's mission, devotion, courage and major Sundarakanda events."}
              </p>
            </div>
          </div>
        </div>
      );
    }

    /* RAMAYANA */

    if (
      visual.type === "ramayana"
    ) {
      return (
        <div className="visual-card">
          <div className="visual-header">
            <span>🏹</span>
            <span>
              Ramayana
            </span>
          </div>

          <div className="epic-visual">
            <div className="epic-icon">
              🏹
            </div>

            <div className="epic-content">
              <h3>
                Ramayana
              </h3>

              <div className="epic-flow">
                <span>
                  👑 Rama
                </span>

                <b>→</b>

                <span>
                  🌳 Exile
                </span>

                <b>→</b>

                <span>
                  🙏 Hanuman
                </span>

                <b>→</b>

                <span>
                  🏰 Lanka
                </span>
              </div>

              <p>
                {language === "tamil"
                  ? "ராமாயணத்தின் முக்கிய கதாபாத்திரங்கள் மற்றும் நிகழ்வுகளின் சுருக்கம்."
                  : "A visual summary of the major Ramayana characters and events."}
              </p>
            </div>
          </div>
        </div>
      );
    }

    /* MAHABHARATA */

    if (
      visual.type === "mahabharata"
    ) {
      return (
        <div className="visual-card">
          <div className="visual-header">
            <span>⚔️</span>
            <span>
              Mahabharata
            </span>
          </div>

          <div className="epic-visual">
            <div className="epic-icon">
              ⚔️
            </div>

            <div className="epic-content">
              <h3>
                Mahabharata
              </h3>

              <div className="epic-flow">
                <span>
                  👑 Pandavas
                </span>

                <b>VS</b>

                <span>
                  👑 Kauravas
                </span>

                <b>→</b>

                <span>
                  ⚔️ Kurukshetra
                </span>

                <b>→</b>

                <span>
                  📖 Gita
                </span>
              </div>

              <p>
                {language === "tamil"
                  ? "மகாபாரதத்தின் முக்கிய கதைக்களம்."
                  : "A visual summary of the major Mahabharata storyline."}
              </p>
            </div>
          </div>
        </div>
      );
    }

    /* GITA */

    if (visual.type === "gita") {
      return (
        <div className="visual-card">
          <div className="visual-header">
            <span>📖</span>
            <span>
              Bhagavad Gita
            </span>
          </div>

          <div className="epic-visual">
            <div className="epic-icon">
              📖
            </div>

            <div className="epic-content">
              <h3>
                Bhagavad Gita
              </h3>

              <div className="epic-flow">
                <span>
                  🏹 Arjuna
                </span>

                <b>↔</b>

                <span>
                  🪷 Krishna
                </span>

                <b>→</b>

                <span>
                  📖 Dharma
                </span>
              </div>
            </div>
          </div>
        </div>
      );
    }

    /* NAVARATHIRI GENERAL */

    if (
      visual.type === "navarathiri"
    ) {
      return (
        <div className="visual-card">
          <div className="visual-header">
            <span>🪔</span>
            <span>
              Navarathiri
            </span>
          </div>

          <div className="epic-visual">
            <div className="epic-icon">
              🪔
            </div>

            <div className="epic-content">
              <h3>
                Navarathiri
              </h3>

              <div className="epic-flow">
                <span>
                  🌸 Durga
                </span>

                <b>→</b>

                <span>
                  💰 Lakshmi
                </span>

                <b>→</b>

                <span>
                  📚 Saraswati
                </span>
              </div>

              <p>
                {language === "tamil"
                  ? "ஒன்பது இரவுகள் சக்தி வழிபாட்டின் திருவிழா."
                  : "Nine nights celebrating the Divine Feminine."}
              </p>
            </div>
          </div>
        </div>
      );
    }

    return null;
  };

  /* =======================================================
     CLEAR HISTORY
  ======================================================= */

  const clearHistory = () => {
    stopSpeaking();

    setConversation([]);
    setSelectedConversationId(null);
    setQuestion("");
    setAnswer("");
    setChartData(null);
  };

  /* =======================================================
     LANGUAGE
  ======================================================= */

  const changeLanguage = (
    newLanguage
  ) => {
    stopSpeaking();
    setLanguage(newLanguage);
  };

  /* =======================================================
     UI
  ======================================================= */

  return (
    <div className="app">

      <div
        className="glow glow-one"
        aria-hidden="true"
      />

      <div
        className="glow glow-two"
        aria-hidden="true"
      />

      <div className="app-layout">

        {/* =================================================
            SIDEBAR
        ================================================= */}

        <aside className="history-sidebar">

          <div className="sidebar-brand">

            <div className="sidebar-logo-icon">
              ✦
            </div>

            <div>
              <h2>
                Navarathiri AI
              </h2>

              <span>
                Voice Knowledge Assistant
              </span>
            </div>

          </div>

          <div className="history-heading">

            <span>
              CHAT HISTORY
            </span>

            <span className="history-count">
              {
                conversation.length
              }
            </span>

          </div>

          <div className="history-list">

            {conversation.length ===
            0 ? (
              <div className="empty-history">

                <div className="empty-history-icon">
                  🪔
                </div>

                <p>
                  {language ===
                  "tamil"
                    ? "உங்கள் கேள்விகள் இங்கே சேமிக்கப்படும்"
                    : "Your conversations will appear here"}
                </p>

              </div>
            ) : (
              conversation.map(
                (item) => (
                  <button
                    key={
                      item.id
                    }
                    className={`history-item ${
                      selectedConversationId ===
                      item.id
                        ? "history-active"
                        : ""
                    }`}
                    onClick={() => {
                      stopSpeaking();

                      setSelectedConversationId(
                        item.id
                      );

                      setQuestion(
                        item.question
                      );

                      setAnswer(
                        item.answer ||
                          ""
                      );

                      setChartData(
                        item.chart
                      );
                    }}
                  >

                    <span className="history-item-icon">
                      {getHistoryIcon(
                        item
                      )}
                    </span>

                    <span className="history-item-text">
                      {
                        item.question
                      }
                    </span>

                  </button>
                )
              )
            )}

          </div>

          <div className="sidebar-bottom">

            <button
              className="clear-history"
              onClick={
                clearHistory
              }
              disabled={
                conversation.length ===
                0
              }
            >

              <span>
                🗑
              </span>

              <span>
                {language ===
                "tamil"
                  ? "வரலாற்றை அழி"
                  : "Clear History"}
              </span>

            </button>

            <div className="sidebar-language">

              <button
                className={
                  language ===
                  "tamil"
                    ? "sidebar-lang-active"
                    : ""
                }
                onClick={() =>
                  changeLanguage(
                    "tamil"
                  )
                }
              >
                தமிழ்
              </button>

              <span>
                |
              </span>

              <button
                className={
                  language ===
                  "english"
                    ? "sidebar-lang-active"
                    : ""
                }
                onClick={() =>
                  changeLanguage(
                    "english"
                  )
                }
              >
                English
              </button>

            </div>

          </div>

        </aside>

        {/* =================================================
            MAIN AREA
        ================================================= */}

        <div className="main-area">

          <header className="main-header">

            <div>

              <span className="main-header-label">
                ✦ VOICE AI
              </span>

              <h1>
                Navarathiri AI
              </h1>

            </div>

            <div className="header-status">

              <span className="status-dot" />

              {isLoading
                ? "AI Thinking..."
                : "AI Ready"}

            </div>

          </header>

          <main className="main">

            <div className="hero">

              <div className="badge">
                ✦ VOICE AI • NAVARATHIRI
              </div>

              <h2>

                {selectedConversation
                  ? "Your Conversation"
                  : (
                    <>
                      Your Personal{" "}
                      <span>
                        Navarathiri
                      </span>{" "}
                      Assistant
                    </>
                  )}

              </h2>

              <p>
                {language ===
                "tamil"
                  ? "நவராத்திரி, சுந்தரகாண்டம், ராமாயணம், மகாபாரதம் மற்றும் பகவத் கீதை பற்றி கேளுங்கள்."
                  : "Ask anything about Navarathiri, Sundarakanda, Ramayana, Mahabharata and Bhagavad Gita."}
              </p>

              {/* =================================================
                  CURRENT CONVERSATION
              ================================================= */}

              {selectedConversation && (

                <div className="conversation">

                  <div className="conversation-turn">

                    <div className="question-box">

                      <span>
                        🎤
                      </span>

                      <p>
                        {
                          selectedConversation.question
                        }
                      </p>

                    </div>

                    <div className="answer-box">

                      <div className="answer-top-row">

                        <div className="answer-title">
                          ✦ Navarathiri AI
                        </div>

                        {/* Only show voice button when answer is ready */}
                        {selectedConversation.answer &&
                          !selectedConversation.isLoading && (
                          <button
                            className={`answer-voice-button ${
                              isSpeaking &&
                              speakingConversationId ===
                                selectedConversation.id
                                ? "voice-playing"
                                : ""
                            }`}
                            onClick={() => {

                              if (
                                isSpeaking &&
                                speakingConversationId ===
                                  selectedConversation.id
                              ) {
                                stopSpeaking();
                              } else {
                                speakAnswer(
                                  selectedConversation.answer,
                                  selectedConversation.id
                                );
                              }

                            }}
                          >

                            <span>
                              {isSpeaking &&
                              speakingConversationId ===
                                selectedConversation.id
                                ? "🔇"
                                : "🔊"}
                            </span>

                            <span>
                              {isSpeaking &&
                              speakingConversationId ===
                                selectedConversation.id
                                ? "Stop"
                                : "Listen"}
                            </span>

                          </button>
                        )}

                      </div>

                      {/* LOADING STATE */}
                      {selectedConversation.isLoading ? (
                        <div className="ai-loading">
                          <div className="loading-dots">
                            <span />
                            <span />
                            <span />
                          </div>
                          <p className="loading-text">
                            {language === "tamil"
                              ? "AI சிந்திக்கிறது..."
                              : "AI is thinking..."}
                          </p>
                        </div>
                      ) : (
                        <p>
                          {
                            selectedConversation.answer
                          }
                        </p>
                      )}

                      {isSpeaking &&
                        speakingConversationId ===
                          selectedConversation.id &&
                        !selectedConversation.isLoading && (

                          <div className="speaking-status">

                            🔊{" "}

                            {language ===
                            "tamil"
                              ? "பதில் சொல்கிறேன்..."
                              : "Speaking answer..."}

                          </div>

                        )}

                    </div>

                    {!selectedConversation.isLoading &&
                      selectedConversation.chart &&
                      renderVisual(
                        selectedConversation.chart
                      )}

                  </div>

                  <div
                    ref={
                      conversationEndRef
                    }
                  />

                </div>

              )}

              {/* =================================================
                  MICROPHONE
              ================================================= */}

              <button
                className={`mic-button ${
                  isListening
                    ? "listening"
                    : ""
                } ${isLoading ? "mic-disabled" : ""}`}
                onClick={
                  startListening
                }
                disabled={isLoading}
              >

                <span className="mic-icon">
                  🎙
                </span>

              </button>

              <div className="mic-text">

                {isListening
                  ? language ===
                    "tamil"
                    ? "கேட்கிறேன்..."
                    : "Listening..."
                  : isLoading
                  ? language ===
                    "tamil"
                    ? "AI சிந்திக்கிறது..."
                    : "AI is thinking..."
                  : isSpeaking
                  ? language ===
                    "tamil"
                    ? "பதில் சொல்கிறேன்..."
                    : "Speaking..."
                  : language ===
                    "tamil"
                  ? "பேசுவதற்கு அழுத்தவும் அல்லது கீழே டைப் செய்யவும்"
                  : "Tap to speak or type below"}

              </div>

              {/* =================================================
                  TEXT INPUT
              ================================================= */}

              <form
                className="text-input-area"
                onSubmit={handleTextSubmit}
              >

                <input
                  type="text"
                  id="question-input"
                  value={textInput}
                  onChange={(e) =>
                    setTextInput(
                      e.target.value
                    )
                  }
                  placeholder={
                    language === "tamil"
                      ? "இங்கே உங்கள் கேள்வியை டைப் செய்யவும்..."
                      : "Type your question here..."
                  }
                  disabled={isLoading}
                  autoComplete="off"
                />

                <button
                  type="submit"
                  disabled={
                    isLoading ||
                    !textInput.trim()
                  }
                >
                  {isLoading ? "⏳" : "➤"}
                </button>

              </form>

              {/* =================================================
                  SUGGESTIONS
              ================================================= */}

              <div className="suggestions">

                {suggestions.map(
                  ([icon, text]) => (
                    <button
                      key={text}
                      onClick={() =>
                        findAnswer(
                          text
                        )
                      }
                      disabled={isLoading}
                    >
                      {icon}{" "}
                      {text}
                    </button>
                  )
                )}

              </div>

            </div>

          </main>

          <footer>

            <span>
              Navarathiri AI
            </span>

            <span>
              •
            </span>

            <span>
              Powered by Gemini AI
            </span>

          </footer>

        </div>

      </div>

    </div>
  );
}

export default App;