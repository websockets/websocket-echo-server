# websocket-echo-server

[![CI](https://img.shields.io/github/actions/workflow/status/websockets/websocket-echo-server/ci.yml?branch=master&label=CI&logo=github)](https://github.com/websockets/websocket-echo-server/actions?query=workflow%3ACI+branch%3Amaster)
[![Coverage Status](https://img.shields.io/coveralls/websockets/websocket-echo-server/master.svg?logo=coveralls)](https://coveralls.io/github/websockets/websocket-echo-server)

Simple WebSocket echo server.

## Configuration

- The `BIND_ADDRESS` environment variable specifes the address on which the
  server will start listening for connections. The default value is `::`.
- The `BIND_PORT` environment variable specifies the port on which the server
  will start listening for connections. The default value is `1337`.
- The `HEARTBEAT_INTERVAL` environment variable specifies the interval, in
  milliseconds, at which the server sends a ping message to all connected
  clients to detect and close unresponsive connections. The default value is
  `30000`.
- The `HIGH_WATER_MARK` environment variable specifies a threshold in bytes for
  the outgoing buffered data of each connection. If the threshold is exceeded no
  more data is read until all the outgoing buffered data is flushed. The default
  value is `16384`.
- The `MAX_MESSAGE_SIZE` environment variable specifies the maximum allowed
  message size in bytes. The default value is `65536`.

## Running the server locally

```
git clone https://github.com/websockets/websocket-echo-server.git
cd websocket-echo-server
npm ci --production
node index.js
```

## Running the server in a Docker container

```
git clone https://github.com/websockets/websocket-echo-server.git
cd websocket-echo-server
docker build -t websocket-echo-server .
docker run -e BIND_PORT=8080 --expose 8080 -d -p 8080:8080 websocket-echo-server
```

## License

[MIT](LICENSE)
