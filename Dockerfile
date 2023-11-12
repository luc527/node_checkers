FROM docker.io/node:20.9.0-alpine3.18

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm ci

COPY . .

USER node

EXPOSE 8080