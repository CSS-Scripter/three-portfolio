FROM node:21.6-slim
WORKDIR /app
COPY . .
RUN yarn
CMD ["yarn", "start", "--host"]