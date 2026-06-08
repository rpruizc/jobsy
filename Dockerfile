# --- Build stage: full image so better-sqlite3's native addon compiles ---
FROM node:22-bookworm AS build
WORKDIR /app
COPY package.json package-lock.json ./
# Production deps only. tsx (the TS runner) and better-sqlite3 are runtime deps.
RUN npm ci --omit=dev
COPY . .

# --- Runtime stage: slim image, reuse the compiled node_modules ---
FROM node:22-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=8080
# DB lives on a mounted Fly volume; see fly.toml [mounts].
ENV DB_PATH=/data/jobsy.db
COPY --from=build /app/node_modules ./node_modules
COPY package.json ./
COPY src ./src
COPY public ./public
EXPOSE 8080
CMD ["npm", "start"]
