import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');

    const dynamicKeys = Object.entries(env).reduce((acc, [key, value]) => {
      if (key.startsWith('GEMINI_API_KEY_') || key.startsWith('OPENROUTER_API_KEY_')) {
        acc[`process.env.${key}`] = JSON.stringify(value);
      }
      return acc;
    }, {} as Record<string, string>);

    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY || env.GEMINI_API_KEYS),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEYS': JSON.stringify(env.GEMINI_API_KEYS),
        'process.env.OPENROUTER_API_KEY': JSON.stringify(env.OPENROUTER_API_KEY),
        'process.env.OPENROUTER_MODEL': JSON.stringify(env.OPENROUTER_MODEL),
        'process.env.LLM_PROVIDER_ORDER': JSON.stringify(env.LLM_PROVIDER_ORDER),
        'process.env.E2E_MODE': JSON.stringify(env.E2E_MODE || 'false'),
        ...dynamicKeys,
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
