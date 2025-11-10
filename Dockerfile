# Build do Flutter/Web/Node
FROM node:18 AS builder
WORKDIR /app

COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Rodar servidor Express
FROM node:18
WORKDIR /app

COPY --from=builder /app/dist ./dist
COPY server.js ./server.js

RUN npm install express node-fetch

EXPOSE 3000
CMD ["node", "server.js"]
