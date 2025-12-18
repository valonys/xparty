import type { VercelRequest, VercelResponse } from '@vercel/node';
import { withCors } from '../_lib/http';
import { getGenAI, getModel } from '../_lib/genai';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (withCors(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { ingredients } = (req.body ?? {}) as { ingredients?: string[] };
  try {
    const ai = getGenAI();
    const response = await ai.models.generateContent({
      model: getModel(),
      contents: `Crie um nome de cocktail personalizado e uma breve descrição para o nosso reencontro "Nível X" com base nestes ingredientes disponíveis: ${(ingredients ?? []).join(', ')}. Faça soar lendário. Responda em Português de Portugal/Angola (use "actual", "húmido", etc).`,
    });
    return res.status(200).json({ text: (response as any).text ?? '' });
  } catch {
    return res.status(200).json({ text: 'O Especial Nível X' });
  }
}


