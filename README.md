# Insight Scholar

AI assistant for screening and analyzing academic and policy documents. Supports Gemini by default and optional OpenRouter models.

## Run Locally

Prerequisites: Node.js 18+

1. Install dependencies:
   `npm install`
2. Configure environment in `.env.local`:
   - Gemini only:
     `GEMINI_API_KEY=your_key`
   - OpenRouter (optional, preferred if set):
     `OPENROUTER_API_KEY=your_key`
     `OPENROUTER_MODEL=openrouter/auto`
     `OPENROUTER_BASE_URL=https://openrouter.ai/api/v1`
3. Start dev server:
   `npm run dev`

Notes:
- Env values are injected at build time by Vite. Update `.env.local` and rebuild when keys/models change.
- If both Gemini and OpenRouter are set, OpenRouter is used.

## Docker

Build:
`docker build --build-arg GEMINI_API_KEY=your_key --build-arg OPENROUTER_API_KEY=your_key --build-arg OPENROUTER_MODEL=openrouter/auto -t insight-scholar .`

Run:
`docker run -p 4173:4173 insight-scholar`