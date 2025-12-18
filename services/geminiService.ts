type Json = Record<string, any>;

async function postJson<T>(path: string, body: Json): Promise<T> {
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Request failed (${res.status})`);
  return (await res.json()) as T;
}

export const generateTraceEnhancement = async (originalText: string): Promise<string> => {
  try {
    const data = await postJson<{ text?: string }>('/api/gemini/trace-enhance', { originalText });
    return data.text ?? originalText;
  } catch (error) {
    console.error("Gemini enhancement failed", error);
    return originalText;
  }
};

export const suggestCocktail = async (ingredients: string[]): Promise<string> => {
  try {
    const data = await postJson<{ text?: string }>('/api/gemini/cocktail', { ingredients });
    return data.text ?? "O Especial Nível X";
  } catch (error) {
    return "A Mistura Misteriosa";
  }
};

export const analyzePartyPhoto = async (base64Image: string): Promise<string> => {
    try {
        const data = await postJson<{ text?: string }>('/api/gemini/photo-caption', { base64Image });
        return data.text ?? "Um momento para recordar.";
    } catch (error) {
        console.error("Photo analysis failed", error);
        return "Memórias Nível X";
    }
}