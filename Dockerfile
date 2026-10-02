FROM node:24-slim AS build
WORKDIR /build
RUN npm install -g pnpm@12.8.1
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm build

FROM nginx:1.29-alpine
COPY --from=build /build/dist /var/www/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
