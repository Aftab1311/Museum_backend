import express from "express";
import Artifact from "../models/Artifact.js";

const router = express.Router();

const MAX_HISTORY_MESSAGES = 8;
const MAX_CONTEXT_ARTIFACTS = 20;

const getAiConfig = () => {
  // // Prefer Gemini when configured
  // if (process.env.GEMINI_API_KEY) {
  //   return {
  //     apiKey: process.env.GEMINI_API_KEY,
  //     baseUrl:
  //       process.env.GEMINI_BASE_URL ||
  //       "https://generativelanguage.googleapis.com/v1beta",
  //     model: process.env.GEMINI_MODEL || "gemini-2.5-flash",
  //     provider: "gemini",
  //   };
  // }

  // Next, prefer NVIDIA
  if (process.env.NVIDIA_API_KEY) {
    return {
      apiKey: process.env.NVIDIA_API_KEY,
      baseUrl:
        process.env.NVIDIA_BASE_URL || "https://integrate.api.nvidia.com/v1",
      model: process.env.NVIDIA_MODEL || "openai/gpt-oss-20b",
      provider: "nvidia",
    };
  }

  // Fallback to OpenAI
  return {
    apiKey: process.env.OPENAI_API_KEY,
    baseUrl: process.env.OPENAI_BASE_URL || "https://api.openai.com/v1",
    model: process.env.OPENAI_MODEL || "gpt-4o-mini",
    provider: "openai",
  };
};

const sanitizeHistory = (history) => {
  if (!Array.isArray(history)) {
    return [];
  }

  return history
    .filter(
      (item) =>
        item &&
        (item.role === "user" || item.role === "assistant") &&
        typeof item.content === "string" &&
        item.content.trim().length > 0,
    )
    .slice(-MAX_HISTORY_MESSAGES)
    .map((item) => ({
      role: item.role,
      content: item.content.trim(),
    }));
};

const buildArtifactsContext = async () => {
  const artifacts = await Artifact.find({})
    .sort({ updatedAt: -1 })
    .limit(MAX_CONTEXT_ARTIFACTS)
    .lean();

  if (!artifacts.length) {
    return "No artifact records are currently available in the database.";
  }

  return artifacts
    .map((artifact, index) => {
      return [
        `${index + 1}. ${artifact.name}`,
        `Category: ${artifact.category}`,
        `Origin tribe: ${artifact.originTribe}`,
        `Material: ${artifact.material}`,
        `Year discovered: ${artifact.yearDiscovered}`,
        `Description: ${artifact.description}`,
        `Historical significance: ${artifact.historicalSignificance}`,
      ].join("\n");
    })
    .join("\n\n");
};

router.post("/", async (req, res) => {
  try {
    const { message, history } = req.body || {};

    if (typeof message !== "string" || !message.trim()) {
      return res.status(400).json({
        message: "A valid message is required.",
      });
    }

    const aiConfig = getAiConfig();

    if (!aiConfig.apiKey) {
      return res.status(500).json({
        message:
          "Chatbot is not configured. Add GEMINI_API_KEY (preferred) or NVIDIA_API_KEY or OPENAI_API_KEY in backend environment variables.",
      });
    }

    const artifactsContext = await buildArtifactsContext();
    const conversationHistory = sanitizeHistory(history);

   const systemPrompt = [
  "You are NaijaHeritage's museum AI guide.",
  "Keep answers concise, friendly, and educational.",
  "",
  "You may answer in two ways:",
  "1. For artifact-specific questions, use ONLY the provided Artifact Context.",
  "2. For broader questions about Nigerian history, culture, tribes, kingdoms, languages, politics, colonial history, independence, religion, festivals, art, music, geography, or current events, use ONLY verified web search results.",
  "",
  "Strict Rules:",
  "- Never invent or guess artifact names, dates, tribes, rulers, political leaders, offices, or historical facts.",
  "- For artifact-specific facts, if the information is not present in Artifact Context, explicitly say: 'That information is not available in the current artifact records.'",
  "- For general Nigerian knowledge, answer only if the information can be verified from reliable web search sources.",
  "- Prefer official government sites, museums, universities, encyclopedias, and reputable news organizations.",
  "- If web results are missing, conflicting, or unclear, say: 'I could not verify that information from reliable sources.'",
  "- Clearly label which parts of the answer come from Artifact Context and which come from General Nigerian History.",
  "- Do not make up names or fill gaps with plausible-sounding information.",
  "- If a question combines an artifact and wider Nigerian history, answer each part separately.",
  "",
  "Response format:",
  "- Start artifact-based answers with 'Artifact Context:'",
  "- Start broader history or current-affairs answers with 'General Nigerian History:'",
  "- Return plain text only.",
  "",
  "Artifact Context:",
  artifactsContext || "No artifact context available."
].join("\n");

    let reply = "";

    if (aiConfig.provider === "gemini") {
      const contents = [
        ...conversationHistory.map((item) => ({
          role: item.role === "assistant" ? "model" : "user",
          parts: [{ text: item.content }],
        })),
        { role: "user", parts: [{ text: message.trim() }] },
      ];

      const geminiResponse = await fetch(
        `${aiConfig.baseUrl}/models/${encodeURIComponent(aiConfig.model)}:generateContent?key=${aiConfig.apiKey}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            system_instruction: { parts: [{ text: systemPrompt }] },
            contents,
            safetySettings: [],
            generationConfig: {
              temperature: 0.4,
            },
          }),
        },
      );

      if (!geminiResponse.ok) {
        const errorText = await geminiResponse.text();
        console.error("Gemini API error:", errorText);
        return res.status(502).json({
          message:
            "The AI service could not respond right now. Please try again.",
        });
      }

      const data = await geminiResponse.json();
      reply =
        data?.candidates?.[0]?.content?.parts
          ?.map((part) => part.text)
          .join("\n")
          ?.trim() || "";
    } else {
      const completionResponse = await fetch(
        `${aiConfig.baseUrl}/chat/completions`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${aiConfig.apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: aiConfig.model,
            temperature: 0.4,
            messages: [
              { role: "system", content: systemPrompt },
              ...conversationHistory,
              { role: "user", content: message.trim() },
            ],
          }),
        },
      );

      if (!completionResponse.ok) {
        const errorText = await completionResponse.text();
        console.error("AI provider error:", errorText);
        return res.status(502).json({
          message:
            "The AI service could not respond right now. Please try again.",
        });
      }

      const completionData = await completionResponse.json();
      reply = completionData?.choices?.[0]?.message?.content?.trim() || "";
    }

    if (!reply) {
      return res.status(502).json({
        message: "The AI service returned an empty response. Please try again.",
      });
    }

    return res.json({ reply });
  } catch (error) {
    console.error("Chatbot route error:", error);
    return res.status(500).json({
      message: "Failed to generate chatbot response.",
    });
  }
});

export default router;
