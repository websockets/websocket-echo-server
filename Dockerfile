FROM node:18-slim

USER node

RUN set -ex && mkdir /home/node/websocket-echo-server
WORKDIR /home/node/websocket-echo-server

COPY package*.json ./
RUN set -ex && npm ci --production

COPY --chown=node:node . .

CMD ["node", "index.js"]
