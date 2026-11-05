import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import basicSsl from '@vitejs/plugin-basic-ssl';

// `npm run dev:https` serves over HTTPS with a self-signed certificate so that a
// phone on the same Wi-Fi gets a secure context (AudioWorklet requires one).
export default defineConfig(({ mode }) => ({
  base: './',
  plugins: [react(), ...(mode === 'https' ? [basicSsl()] : [])],
  worker: { format: 'es' },
  build: { target: 'es2020', sourcemap: false },
  server: { host: true, port: 5173 },
  preview: { host: true, port: 4173 },
}));
