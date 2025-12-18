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
  // No secrets should be injected client-side. Gemini calls should go through serverless `/api/*` routes.
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
}));
