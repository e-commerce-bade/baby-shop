FROM node:22-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM node:22-alpine

WORKDIR /app
ENV NODE_ENV=production

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY --from=build /app/.next-build ./.next-build
COPY --from=build /app/public ./public
COPY --from=build /app/next.config.ts ./next.config.ts

CMD ["npm", "run", "start"]
