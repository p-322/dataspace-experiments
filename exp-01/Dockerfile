FROM node:24-alpine

WORKDIR /app

# alleen runtime deps
COPY package.json package-lock.json* ./
RUN npm install --omit=dev

COPY src ./src

EXPOSE 7070

CMD ["node", "src/server.ts"]