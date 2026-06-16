import { GoogleGenAI } from "@google/genai";
import { Message } from "../types";

const SYSTEM_PROMPT = `
Rol: Eres el motor de inteligencia de un avatar virtual de video para el software Korely. Tu función es actuar como un Headhunter experto que realiza entrevistas iniciales para Cipress.

Dinámica de la situación:
1. Formato de Audio/Video: Tus respuestas deben ser BREVES (máximo 3 frases). Esto es crucial porque tus respuestas serán leídas por un avatar digital. No uses listas largas ni textos densos.
2. Interacción Activa: No lances todas las preguntas juntas. Haz una pregunta, escucha la respuesta del candidato y reacciona a ella antes de pasar a la siguiente.
3. Objetivo Técnico y Blando: Debes validar la experiencia técnica que el candidato mencione, pero sobre todo evaluar su claridad al hablar, su seguridad y su capacidad de síntesis (Habilidades Blandas).
4. Adaptabilidad: Si el candidato da una respuesta muy corta o ambigua, tu siguiente pregunta debe ser una contrapregunta para profundizar en un "episodio diferenciador" (ej: "Cuéntame un momento específico donde aplicaste esa habilidad").
5. Tono: Profesional, tecnológico, cordial y muy observador.

Instrucciones adicionales:
- Saluda profesionalmente al inicio como Korely.
- Indica que la entrevista durará unos 10 minutos.
- Mantén el idioma en el que el candidato te hable (preferiblemente Español como se solicitó).
- Si el candidato pregunta si puedes escucharlo, confirma que sí y que puedes ver su transcripción en tiempo real, luego retoma la entrevista.
`;

export class GeminiService {
  private ai: GoogleGenAI | null = null;
  private model = "gemini-3-flash-preview";

  init() {
    if (typeof window === 'undefined') return;
    if (this.ai) return;
    
    const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || process.env.GEMINI_API_KEY || "";
    if (apiKey) {
      this.ai = new GoogleGenAI({ apiKey });
    }
  }

  async *getResponseStream(history: Message[], vacancyInfo?: { title: string; description?: string }): AsyncGenerator<string> {
    this.init();
    try {
      if (!this.ai) {
        yield "Error: No se detecta la clave de API. Por favor, asegúrate de que el Secret 'GEMINI_API_KEY' tenga el código de la API.";
        return;
      }

      const contents = history.map(msg => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }]
      }));

      const customPrompt = vacancyInfo 
        ? `${SYSTEM_PROMPT}\nLa entrevista es para el cargo de: **${vacancyInfo.title}**.\nDescripción del cargo: ${vacancyInfo.description || 'No especificada'}.\nTu rol es realizar preguntas enfocadas en validar sus competencias para esta posición.`
        : SYSTEM_PROMPT;

      const responseStream = await this.ai.models.generateContentStream({
        model: this.model,
        contents: contents,
        config: {
          systemInstruction: customPrompt,
          temperature: 0.7,
          topP: 0.8,
          topK: 40,
        }
      });

      for await (const chunk of responseStream) {
        const text = chunk.text;
        if (text) {
          yield text;
        }
      }
    } catch (error: any) {
      console.error("Gemini API Error:", error);
      if (error?.message?.includes("API key not valid")) {
        yield "Error: La clave de API de Gemini no es válida.";
      } else if (error?.message?.includes("quota")) {
        yield "He alcanzado mi límite de mensajes por ahora. Por favor, intenta de nuevo en unos minutos.";
      } else {
        yield "Tuve un pequeño tropiezo técnico al procesar eso. ¿Podrías intentar decírmelo de nuevo?";
      }
    }
  }

  async getResponse(history: Message[], vacancyInfo?: { title: string; description?: string }): Promise<string> {
    let fullText = "";
    for await (const chunk of this.getResponseStream(history, vacancyInfo)) {
      fullText += chunk;
    }
    return fullText;
  }
}

export const geminiService = new GeminiService();
