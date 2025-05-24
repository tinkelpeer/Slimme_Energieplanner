# frontend/Dockerfile — bouw de Vite-React app en serveer via nginx

# 1) Build‐stage
FROM node:18-alpine AS build

WORKDIR /usr/src/app

# alleen package.json en lockfile kopiëren voor caching
COPY package*.json ./

# dependencies installeren
RUN npm ci

# broncode kopiëren
COPY . .

# productie‐build uitvoeren (resultaat in /dist)
RUN npm run build

# 2) Serve‐stage
FROM nginx:stable-alpine

# verwijder standaard nginx pagina
RUN rm -rf /usr/share/nginx/html/*

# kopieer de gegenereerde build naar nginx html folder
COPY --from=build /usr/src/app/dist /usr/share/nginx/html

# expose poort 80 voor HTTP
EXPOSE 80

# nginx in de voorgrond draaien
CMD ["nginx", "-g", "daemon off;"]
