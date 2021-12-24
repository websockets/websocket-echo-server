'use strict';

const assert = require('assert');
const crypto = require('crypto');
const http = require('http');
const path = require('path');
const WebSocket = require('ws');
const { fork } = require('child_process');

const { server, wss } = require('.');

before(function (done) {
  server.listen(done);
});

after(function (done) {
  server.close(done);
});

it('responds with 426 to non-Upgrade requests', function (done) {
  http.get(`http://localhost:${server.address().port}`, function (res) {
    let body = '';

    res.setEncoding('utf8');
    res.on('data', function (chunk) {
      body += chunk;
    });

    res.on('end', function () {
      assert.strictEqual(body, http.STATUS_CODES[426]);
      done();
    });
  });
});

it('handles binary and text messages', function (done) {
  const messages = [];
  const message1 = Buffer.from('foo');
  const message2 = Buffer.from('bar');
  const ws = new WebSocket(`ws://localhost:${server.address().port}`);

  ws.on('open', function () {
    ws.send(message1.toString());
    ws.send(message2);
    ws.close();
  });

  ws.on('message', function (data, isBinary) {
    messages.push(data, isBinary);
  });

  ws.on('close', function () {
    assert.deepStrictEqual(messages, [message1, false, message2, true]);
    done();
  });
});

it('handles backpressure', function (done) {
  let serverClientPaused = false;

  wss.once('connection', function (websocket) {
    websocket.once('pause', function () {
      serverClientPaused = true;
      ws.resume();
      ws.close();
    });
  });

  const ws = new WebSocket(`ws://localhost:${server.address().port}`);

  ws.on('open', function () {
    ws.pause();

    function send() {
      if (serverClientPaused) return;

      const size = crypto.randomInt(100, 8193);
      const chunk = crypto.randomBytes(size);

      ws.send(chunk, send);
    }

    send();
  });

  ws.on('close', function (code) {
    assert.strictEqual(code, 1005);
    done();
  });
});

it('detects and closes unresponsive connections', function (done) {
  const subprocess = fork(path.join(__dirname, 'index.js'), {
    env: {
      BIND_PORT: '0',
      HEARTBEAT_INTERVAL: '100'
    },
    stdio: 'pipe'
  });

  subprocess.stdout.setEncoding('utf8');
  subprocess.stdout.on('data', function (chunk) {
    assert.ok(chunk.startsWith('Server listening on'));

    const port = chunk.slice(chunk.lastIndexOf(':') + 1);
    const ws = new WebSocket(`ws://localhost:${port}`);

    const pong = ws.pong;

    ws.pong = function () {
      pong.apply(ws, arguments);
      ws.pong = function () {};
    };

    ws.on('open', function () {
      ws.on('close', function (code) {
        assert.strictEqual(code, 1006);

        subprocess.on('close', function (code) {
          assert.notStrictEqual(code, 0);
          done();
        });

        subprocess.kill();
      });
    });
  });
});
