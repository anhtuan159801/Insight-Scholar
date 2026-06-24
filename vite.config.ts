import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    const unifiedModelEntries = Object.entries(env)
      .filter(([key]) => key === 'UNIFIED_MODEL' || key === 'FREELLMAPI_MODEL' || key.startsWith('UNIFIED_MODEL_') || key.startsWith('FREELLMAPI_MODEL_'))
      .reduce((acc, [key, value]) => ({
        ...acc,
        [`process.env.${key}`]: JSON.stringify(value)
      }), {});
    const ollamaEntries = {
      'process.env.OLLAMA_MODEL': JSON.stringify(env.OLLAMA_MODEL),
      'process.env.OLLAMA_BASE_URL': JSON.stringify(env.OLLAMA_BASE_URL)
    };
    const clientEnv = Object.fromEntries(
      Object.entries(env).filter(([key]) =>
        key === 'API_KEY' ||
        key === 'UNIFIED_API_KEY' ||
        key === 'UNIFIED_API_KEYS' ||
        key === 'UNIFIED_BASE_URL' ||
        key === 'UNIFIED_MODEL' ||
        key === 'FREELLMAPI_API_KEY' ||
        key === 'FREELLMAPI_API_KEYS' ||
        key === 'FREELLMAPI_BASE_URL' ||
        key === 'FREELLMAPI_MODEL' ||
        key === 'OPENAI_API_KEY' ||
        key === 'LLM_PROVIDER_ORDER' ||
        key === 'E2E_MODE' ||
        key === 'OLLAMA_MODEL' ||
        key === 'OLLAMA_BASE_URL' ||
        key.startsWith('UNIFIED_API_KEY_') ||
        key.startsWith('FREELLMAPI_API_KEY_') ||
        key.startsWith('UNIFIED_MODEL_') ||
        key.startsWith('FREELLMAPI_MODEL_')
      )
    );
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
        'process.env': JSON.stringify(clientEnv),
        'process.env.API_KEY': JSON.stringify(env.UNIFIED_API_KEY || env.FREELLMAPI_API_KEY),
        'process.env.UNIFIED_API_KEY': JSON.stringify(env.UNIFIED_API_KEY),
        'process.env.UNIFIED_API_KEYS': JSON.stringify(env.UNIFIED_API_KEYS),
        'process.env.UNIFIED_BASE_URL': JSON.stringify(env.UNIFIED_BASE_URL || 'https://freellmapi-vercel.onrender.com/v1'),
        'process.env.UNIFIED_MODEL': JSON.stringify(env.UNIFIED_MODEL),
        'process.env.FREELLMAPI_API_KEY': JSON.stringify(env.FREELLMAPI_API_KEY),
        'process.env.FREELLMAPI_API_KEYS': JSON.stringify(env.FREELLMAPI_API_KEYS),
        'process.env.FREELLMAPI_BASE_URL': JSON.stringify(env.FREELLMAPI_BASE_URL || 'https://freellmapi-vercel.onrender.com/v1'),
        'process.env.FREELLMAPI_MODEL': JSON.stringify(env.FREELLMAPI_MODEL),
        'process.env.OPENAI_API_KEY': JSON.stringify(env.OPENAI_API_KEY),
        'process.env.LLM_PROVIDER_ORDER': JSON.stringify(env.LLM_PROVIDER_ORDER),
        'process.env.E2E_MODE': JSON.stringify(env.E2E_MODE || 'false'),
        ...unifiedModelEntries,
        ...ollamaEntries
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, 'src'),
        }
      }
    };
});
