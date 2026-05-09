FROM --platform=$BUILDPLATFORM node:20-alpine AS builder
WORKDIR /app
COPY package.json ./
RUN npm install --production
COPY . .

FROM node:20-alpine
WORKDIR /app
RUN apk add --no-cache python3 make g++ && mkdir -p /app/data
COPY --from=builder /app .
RUN npm rebuild better-sqlite3
EXPOSE 8794
CMD ["node", "src/index.js"]
