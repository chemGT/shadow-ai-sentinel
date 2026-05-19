FROM node:18-alpine

WORKDIR /app

RUN addgroup -g 1001 -S appgroup \
  && adduser -u 1001 -S appuser -G appgroup

COPY package*.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src/backend ./src/backend

USER appuser

EXPOSE 3000

CMD ["npx", "tsx", "src/backend/server.ts"]
