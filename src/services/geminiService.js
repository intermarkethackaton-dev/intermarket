import { GoogleGenAI } from "@google/genai";

const GEMINI_API_KEY = import.meta.env.VITE_AI_API_KEY;
const GEMINI_MODEL = import.meta.env.VITE_AI_MODEL || "gemini-2.0-flash";

const ai = new GoogleGenAI({
  apiKey: GEMINI_API_KEY,
});

export const preguntarGemini = async (contents, systemInstruction = "") => {
  try {
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents,
      config: {
        systemInstruction,
        temperature: 0.4,
        topP: 0.9,
        topK: 32,
        maxOutputTokens: 700,
      },
    });

    return response.text;
  } catch (error) {
    console.error("Gemini Error en Servicio:", error);
    throw error;
  }
};