# Stage 1: Build stage — dependencies install + prisma generate
FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npx prisma generate

# Stage 2: Production stage — sirf runtime chahine chij matra
FROM node:22-alpine AS production

WORKDIR /app

ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY . .

EXPOSE 3000

CMD ["npx", "tsx", "src/server.ts"]
