import { GoogleGenAI } from "@google/genai/web";

declare const __GEMINI_API_KEY__: string;

// Initialize AI safely.
// We use a Vite-injected constant instead of relying on a `process` polyfill in the browser.
const apiKey = typeof __GEMINI_API_KEY__ === 'string' ? __GEMINI_API_KEY__ : '';
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

export const generateTraceEnhancement = async (originalText: string): Promise<string> => {
  if (!ai) return originalText;
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Estamos numa festa de reencontro de amigos que viveram juntos há 25 anos. 
      O nome do grupo é "Nível X". 
      Reescreva a seguinte memória/traço para ser mais nostálgica, engraçada ou poética, em Português de Portugal/Angola (evita termos brasileiros como "galera", "time", "atual" sem c, "planejamento"), mantenha curto (menos de 50 palavras).
      
      Original: "${originalText}"`,
    });
    return (response as any).text ?? originalText;
  } catch (error) {
    console.error("Gemini enhancement failed", error);
    return originalText;
  }
};

export const suggestCocktail = async (ingredients: string[]): Promise<string> => {
  if (!ai) return "O Especial Nível X";
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Crie um nome de cocktail personalizado e uma breve descrição para o nosso reencontro "Nível X" com base nestes ingredientes disponíveis: ${ingredients.join(', ')}. Faça soar lendário. Responda em Português de Portugal/Angola (use "actual", "húmido", etc).`,
    });
    return (response as any).text ?? "O Especial Nível X";
  } catch (error) {
    return "A Mistura Misteriosa";
  }
};

export const analyzePartyPhoto = async (base64Image: string): Promise<string> => {
    if (!ai) return "Memórias Nível X";
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: {
                parts: [
                    {
                        inlineData: {
                            mimeType: 'image/jpeg',
                            data: base64Image
                        }
                    },
                    {
                        text: "Analise esta foto de festa. Gere uma legenda curta, engraçada, de uma frase para um álbum de recortes sobre amigos que se conhecem há 25 anos. Responda em Português de Portugal/Angola."
                    }
                ]
            }
        });
        return (response as any).text ?? "Um momento para recordar.";
    } catch (error) {
        console.error("Photo analysis failed", error);
        return "Memórias Nível X";
    }
}