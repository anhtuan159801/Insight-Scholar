FROM node:20-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

ARG GEMINI_API_KEY
ARG OPENROUTER_API_KEY
ARG OPENROUTER_MODEL
ARG OPENROUTER_BASE_URL

ENV GEMINI_API_KEY=$GEMINI_API_KEY
ENV OPENROUTER_API_KEY=$OPENROUTER_API_KEY
ENV OPENROUTER_MODEL=$OPENROUTER_MODEL
ENV OPENROUTER_BASE_URL=$OPENROUTER_BASE_URL

RUN npm run build

# Runtime: static server only, avoids Vite host checks
FROM node:20-alpine AS runtime
WORKDIR /app

RUN npm install -g serve
COPY --from=build /app/dist ./dist

EXPOSE 4173
CMD ["serve", "-s", "dist", "-l", "4173"]
