FROM node:20-alpine

WORKDIR /app

ARG VITE_DOMAIN=localhost
ENV VITE_DOMAIN=$VITE_DOMAIN

COPY package*.json ./
RUN npm ci && npm cache clean --force

COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=0 /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 3000

CMD ["nginx", "-g", "daemon off;"]
