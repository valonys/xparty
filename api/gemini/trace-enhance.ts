import type { VercelRequest, VercelResponse } from '@vercel/node';
import { withCors } from '../_lib/http';
import { getGenAI, getModel } from '../_lib/genai';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (withCors(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { originalText } = (req.body ?? {}) as { originalText?: string };
  if (!originalText) return res.status(200).json({ text: '' });

  try {
    const ai = getGenAI();
    const response = await ai.models.generateContent({
      model: getModel(),
      contents: `Estamos numa festa de reencontro de amigos que viveram juntos há 25 anos.
O nome do grupo é "Nível X".
Reescreva a seguinte memória/traço para ser mais nostálgica, engraçada ou poética, em Português de Portugal/Angola (evita termos brasileiros como "galera", "time", "atual" sem c, "planejamento"), mantenha curto (menos de 50 palavras).

Original: "${originalText}"`,
    });
    return res.status(200).json({ text: (response as any).text ?? '' });
  } catch (e: any) {
    return res.status(200).json({ text: originalText });
  }
}


