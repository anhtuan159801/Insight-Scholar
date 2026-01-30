# syntax=docker/dockerfile:1

# --- Build stage ---
FROM node:20-alpine AS builder
WORKDIR /app

# Build-time env (baked into bundle by Vite)
ARG GEMINI_API_KEYS
ARG GEMINI_API_KEY
ARG GEMINI_API_KEY_1
ARG GEMINI_API_KEY_2
ARG GEMINI_API_KEY_3
ARG OPENROUTER_API_KEY
ARG OPENROUTER_API_KEY_1
ARG OPENROUTER_API_KEY_2
ARG OPENROUTER_MODEL
ARG LLM_PROVIDER_ORDER
ENV GEMINI_API_KEYS=${GEMINI_API_KEYS}
ENV GEMINI_API_KEY=${GEMINI_API_KEY}
ENV GEMINI_API_KEY_1=${GEMINI_API_KEY_1}
ENV GEMINI_API_KEY_2=${GEMINI_API_KEY_2}
ENV GEMINI_API_KEY_3=${GEMINI_API_KEY_3}
ENV OPENROUTER_API_KEY=${OPENROUTER_API_KEY}
ENV OPENROUTER_API_KEY_1=${OPENROUTER_API_KEY_1}
ENV OPENROUTER_API_KEY_2=${OPENROUTER_API_KEY_2}
ENV OPENROUTER_MODEL=${OPENROUTER_MODEL}
ENV LLM_PROVIDER_ORDER=${LLM_PROVIDER_ORDER}

# Install dependencies
COPY package*.json ./
RUN npm install --include=dev

# Build
COPY . .
RUN npm run build

# --- Runtime stage ---
FROM nginx:1.27-alpine AS runtime
WORKDIR /usr/share/nginx/html

# Copy static build
COPY --from=builder /app/dist ./

# Nginx SPA routing
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
