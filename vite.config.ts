import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    const openRouterModelEntries = Object.entries(env)
      .filter(([key]) => key === 'OPENROUTER_MODEL' || key.startsWith('OPENROUTER_MODEL_'))
      .reduce((acc, [key, value]) => ({
        ...acc,
        [`process.env.${key}`]: JSON.stringify(value)
      }), {});
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
        strictPort: false,
        // Disable host check to avoid Render proxy block
        allowedHosts: true,
      },
      preview: {
        host: '0.0.0.0',
        strictPort: false,
        // Disable host check to avoid Render proxy block
        allowedHosts: true,
      },
      build: {
        // Raise chunk size warning threshold to reduce noisy logs in Render
        chunkSizeWarningLimit: 2000, // in kB
      },
      plugins: [react()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.OPENROUTER_API_KEY': JSON.stringify(env.OPENROUTER_API_KEY),
        'process.env.OPENROUTER_MODEL': JSON.stringify(env.OPENROUTER_MODEL),
        'process.env.OPENROUTER_BASE_URL': JSON.stringify(env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1'),
        ...openRouterModelEntries
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
