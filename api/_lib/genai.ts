import { GoogleGenAI } from '@google/genai';
import { requireEnv, optionalEnv } from './env';

export function getGenAI() {
  const apiKey = requireEnv('GEMINI_API_KEY');
  return new GoogleGenAI({ apiKey });
}

export function getModel() {
  return optionalEnv('VERTEX_AI_MODEL', 'gemini-2.5-flash');
}


