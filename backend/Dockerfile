# backend/Dockerfile — bouw en run de NestJS API
FROM node:18-alpine AS builder

# werkdirectory instellen
WORKDIR /usr/src/app

# alleen package.json en lockfile kopiëren voor caching
COPY package*.json ./

# dependencies installeren
RUN npm ci

# rest van de code kopiëren
COPY . .

# productie–build aanmaken
RUN npm run build

# --- runtime image ---
FROM node:18-alpine

WORKDIR /usr/src/app

# alleen runtime-dependencies installeren
COPY package*.json ./
RUN npm ci --omit=dev

# gebouwd artefact van builder kopiëren
COPY --from=builder /usr/src/app/dist ./dist

# poort waarop NestJS luistert
EXPOSE 3000

# start de API in productie-mode
CMD ["node", "dist/main.js"]
