'use strict';

const crypto = require('crypto');
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
const maxPingPerHeartbeat = +env.MAX_PINGS_PER_HEARTBEAT || 60;
const maxRandomInt = 2 ** 32;

let heartbeatRound = 0;

const wss = new WebSocket.Server({
  maxFragments: +env.MAX_FRAGMENTS || 256,
  maxPayload: +env.MAX_MESSAGE_SIZE || 64 * 1024,
  server
});

wss.on('connection', function connection(ws) {
  ws.heartbeatNonce = crypto.randomInt(maxRandomInt);
  ws.heartbeatRound = 0;
  ws.isAlive = true;
  ws.messageCount = 0;
  ws.pingCount = 0;

  ws.on('error', console.error);
  ws.on('message', message);
  ws.on('ping', ping);
  ws.on('pong', heartbeat);
});

function message(data, binary) {
  this.messageCount++;
  this.send(data, { binary }, (err) => {
    /* istanbul ignore if */
    if (err) {
      return;
    }

    if (--this.messageCount === 0 && this.isPaused) {
      this.resume();
    }
  });

  if (this.bufferedAmount >= highWaterMark && !this.isPaused) {
    this.pause();

    // This is used only for testing.
    this.emit('pause');
  }
}

function ping() {
  if (this.heartbeatRound !== heartbeatRound) {
    this.heartbeatRound = heartbeatRound;
    this.pingCount = 1;
    return;
  }

  if (++this.pingCount > maxPingPerHeartbeat) {
    this.terminate();
  }
}

function heartbeat(data) {
  if (data.length >= 4 && data.readUInt32BE() === this.heartbeatNonce) {
    this.isAlive = true;
  }
}

setInterval(function interval() {
  heartbeatRound++;

  for (const ws of wss.clients) {
    if (ws.isAlive === false) {
      ws.terminate();
      continue;
    }

    const nonce = crypto.randomInt(maxRandomInt);
    const buf = Buffer.allocUnsafe(4);

    buf.writeUInt32BE(nonce);

    ws.isAlive = false;
    ws.heartbeatNonce = nonce;
    ws.ping(buf);
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
