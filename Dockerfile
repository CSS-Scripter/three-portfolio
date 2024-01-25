FROM node:21.6-slim as build
WORKDIR /build
COPY . .
RUN yarn && yarn build

FROM nginx:1.25.2
WORKDIR /app
COPY --from=build /build/dist /var/www/html
COPY nginx.conf /etc/nginx/conf.d/default.conf