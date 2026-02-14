FROM node:20-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm install

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

FROM node:20-alpine AS runtime
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm install

COPY --from=build /app/dist ./dist

EXPOSE 4173
CMD ["npm","run","preview","--","--host","0.0.0.0","--port","4173"]
