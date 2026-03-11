FROM node:24-alpine
RUN apk add --no-cache openssl
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npx prisma generate
RUN npm install -g ts-node typescript
EXPOSE 3001
CMD ["sh", "-c", "npx prisma migrate deploy && ts-node src/index.ts"]