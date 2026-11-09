FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY angular.json tsconfig*.json ./
COPY src ./src
COPY public ./public
RUN npm run build

FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist/lab4-client/browser /usr/share/nginx/html
