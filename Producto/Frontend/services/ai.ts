import { GoogleGenAI } from "@google/genai";

// Priority to the platform-injected GEMINI_API_KEY, falling back to Next.js public prefix
const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || process.env.GEMINI_API_KEY || "";
const ai = new GoogleGenAI({ apiKey });

export const getGeminiResponse = async (prompt: string, systemInstruction: string) => {
  if (!apiKey) {
    console.error("Gemini API Key is not defined. Please check AI Studio Secrets.");
    return "Error: Configuración de Gemini faltante. Verifica los secretos del proyecto.";
  }
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        systemInstruction: systemInstruction,
      }
    });
    
    return response.text || "Lo siento, no pude generar una respuesta.";
  } catch (error) {
    console.error("Error calling Gemini:", error);
    return "Lo siento, hubo un error al procesar tu solicitud. Por favor, intenta de nuevo.";
  }
};
