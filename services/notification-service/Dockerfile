FROM node:24-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install 
COPY . .
RUN npm install -g ts-node typescript
EXPOSE 3003
CMD ["ts-node", "src/index.ts"]