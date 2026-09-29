FROM node:22-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci --include=dev
COPY . .
RUN npm run build

# ── Production image ──────────────────────────────────────────────────────────
FROM node:22-alpine AS production

WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=builder /app/dist ./dist

# Create uploads directory
RUN mkdir -p uploads

EXPOSE 5000
ENV NODE_ENV=production

CMD ["node", "dist/index.js"]
