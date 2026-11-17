FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY angular.json tsconfig*.json vite.config.ts index.html ./
COPY src ./src
COPY public ./public
RUN npm run build

FROM node:22-alpine
WORKDIR /app
COPY --from=build /app/dist/analog ./dist/analog
ENV HOST=0.0.0.0
ENV PORT=3000
EXPOSE 3000
CMD ["node", "dist/analog/server/index.mjs"]
