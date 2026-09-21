# ===== ETAPA DE DEPENDENCIAS =====
FROM node:20-alpine AS deps
WORKDIR /app/backend-feria

COPY backend-feria/package.json backend-feria/package-lock.json ./
RUN npm ci --omit=dev

# ===== ETAPA RUNTIME =====
FROM node:20-alpine AS runtime
WORKDIR /app

ENV NODE_ENV=production \
    PORT=3000

# Usuario no-root
RUN addgroup -g 1001 -S nodejs && adduser -S appuser -u 1001

COPY --from=deps /app/backend-feria/node_modules ./backend-feria/node_modules

COPY . .

COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh && chown -R appuser:nodejs /app /entrypoint.sh

USER appuser

EXPOSE 3000
CMD ["/entrypoint.sh"]