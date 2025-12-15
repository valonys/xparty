import path from 'path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(() => ({
  server: {
    // Defaults for normal local dev; override with PORT/HOST (or VITE_PORT/VITE_HOST) as needed.
    port: Number(process.env.PORT ?? process.env.VITE_PORT ?? 3000),
    host: process.env.HOST ?? process.env.VITE_HOST ?? '0.0.0.0',
    strictPort: false,
  },
  plugins: [react()],
  // NOTE: Avoid reading `.env*` files in this sandbox (they're blocked); use real environment variables instead.
  define: {
    __GEMINI_API_KEY__: JSON.stringify(process.env.GEMINI_API_KEY ?? process.env.VITE_GEMINI_API_KEY ?? ''),
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
}));
