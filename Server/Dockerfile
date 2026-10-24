FROM node:20-alpine AS base
WORKDIR /app

COPY package*.json ./
RUN npm ci && npm cache clean --force

COPY . .

RUN npx prisma generate

RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 -G nodejs

RUN mkdir -p logs && chown -R nodejs:nodejs /app

COPY docker-entrypoint.sh /app/
RUN chmod +x /app/docker-entrypoint.sh

USER nodejs

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD wget -qO- http://localhost:3001/health || exit 1

CMD ["/app/docker-entrypoint.sh"]
