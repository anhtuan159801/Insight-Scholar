# Insight Scholar

AI assistant for screening and analyzing academic and policy documents. Uses the unified OpenAI-compatible provider proxy by default, with optional Ollama for local analysis.

## Run Locally

Prerequisites: Node.js 18+

1. Install dependencies:
   `npm install`
2. Configure environment in `.env.local`:
   - Unified proxy:
     `UNIFIED_API_KEY=your_unified_key`
     `UNIFIED_BASE_URL=https://freellmapi-vercel.onrender.com/v1`
     `UNIFIED_MODEL=anthropic/claude-3.5-sonnet`
3. Start dev server:
   `npm run dev`

Notes:
- Env values are injected at build time by Vite. Update `.env.local` and rebuild when keys/models change.
- `FREELLMAPI_API_KEY`, `FREELLMAPI_BASE_URL`, `FREELLMAPI_MODEL`, and `OPENAI_API_KEY` are supported aliases.

## Docker

Build:
`docker build -f docker/Dockerfile --build-arg UNIFIED_API_KEY=your_key --build-arg UNIFIED_MODEL=anthropic/claude-3.5-sonnet --build-arg UNIFIED_BASE_URL=https://freellmapi-vercel.onrender.com/v1 -t insight-scholar .`

Run:
`docker run -p 4173:4173 insight-scholar`
