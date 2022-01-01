'use strict';

const http = require('http');
const WebSocket = require('ws');

const server = http.createServer();

server.on('request', function request(req, res) {
  const body = http.STATUS_CODES[426];

  res.writeHead(426, {
    Connection: 'close',
    'Content-Length': body.length,
    'Content-Type': 'text/plain'
  });

  res.end(body);
});

const { env } = process;
const highWaterMark = +env.HIGH_WATER_MARK || 16384;

const wss = new WebSocket.Server({
  maxPayload: +env.MAX_MESSAGE_SIZE || 64 * 1024,
  server
});

wss.on('connection', function connection(ws) {
  ws.isAlive = true;
  ws.message = 0;

  ws.on('error', console.error);
  ws.on('message', message);
  ws.on('pong', heartbeat);
});

function message(data, binary) {
  this.isAlive = true;
  this.message++;
  this.send(data, { binary }, (err) => {
    /* istanbul ignore if */
    if (err) {
      return;
    }

    if (--this.message === 0 && this.isPaused) {
      this.resume();
    }
  });

  if (this.bufferedAmount >= highWaterMark && !this.isPaused) {
    this.pause();

    // This is used only for testing.
    this.emit('pause');
  }
}

function heartbeat() {
  this.isAlive = true;
}

setInterval(function interval() {
  for (const ws of wss.clients) {
    if (ws.isAlive === false) {
      ws.terminate();
      continue;
    }

    ws.isAlive = false;
    ws.ping();
  }
}, +env.HEARTBEAT_INTERVAL || 30000).unref();

if (require.main === module) {
  server.on('listening', function listening() {
    const { address, family, port } = server.address();
    console.log(
      'Server listening on %s:%d',
      family === 'IPv6' ? `[${address}]` : address,
      port
    );
  });

  server.listen(+env.BIND_PORT || 1337, env.BIND_ADDRESS || '::');
}

module.exports = { server, wss };
