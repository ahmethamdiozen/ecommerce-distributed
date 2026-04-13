FROM node:24-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
ARG VITE_AUTH_URL=""
ARG VITE_ORDER_URL=""
ENV VITE_AUTH_URL=$VITE_AUTH_URL
ENV VITE_ORDER_URL=$VITE_ORDER_URL
RUN npm run build

FROM nginx:1.27-alpine AS runner
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
