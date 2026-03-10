FROM node:24-alpine
RUN apk add --no-cache openssl
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npx prisma generate
RUN npm install -g ts-node typescript
EXPOSE 3000
CMD ["ts-node", "src/index.ts"]