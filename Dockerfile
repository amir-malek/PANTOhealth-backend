FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM node:20-alpine

RUN apk add --no-cache netcat-openbsd

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/sample-xray-data.json ./sample-xray-data.json
COPY wait-for-services.sh ./wait-for-services.sh
RUN chmod +x wait-for-services.sh

EXPOSE 3001

CMD ["./wait-for-services.sh", "node", "dist/main"]