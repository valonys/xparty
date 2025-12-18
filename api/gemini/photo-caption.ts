import type { VercelRequest, VercelResponse } from '@vercel/node';
import { withCors } from '../_lib/http';
import { getGenAI, getModel } from '../_lib/genai';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (withCors(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { base64Image } = (req.body ?? {}) as { base64Image?: string };
  if (!base64Image) return res.status(200).json({ text: '' });

  try {
    const ai = getGenAI();
    const response = await ai.models.generateContent({
      model: getModel(),
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: 'image/jpeg',
              data: base64Image,
            },
          },
          {
            text: 'Analise esta foto de festa. Gere uma legenda curta, engraçada, de uma frase para um álbum de recortes sobre amigos que se conhecem há 25 anos. Responda em Português de Portugal/Angola.',
          },
        ],
      } as any,
    });
    return res.status(200).json({ text: (response as any).text ?? '' });
  } catch {
    return res.status(200).json({ text: 'Memórias Nível X' });
  }
}


