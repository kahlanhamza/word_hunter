const assert = require('node:assert/strict');
const { test } = require('node:test');
const { HealthController } = require('../dist/health.controller');
const { bootstrap } = require('../dist/main');

test('controller returns the exact health payload', () => {
  assert.deepEqual(new HealthController().health(), { status: 'ok' });
});

test('compiled Nest bootstrap serves unauthenticated GET /health and 404 for unknown routes', async (t) => {
  const previousPort = process.env.PORT;
  const previousHost = process.env.HOST;
  process.env.PORT = '0';
  process.env.HOST = '127.0.0.1';
  t.after(() => {
    if (previousPort === undefined) delete process.env.PORT;
    else process.env.PORT = previousPort;
    if (previousHost === undefined) delete process.env.HOST;
    else process.env.HOST = previousHost;
  });
  const app = await bootstrap();
  t.after(() => app.close());
  const base = await app.getUrl();
  const response = await fetch(`${base}/health`);
  assert.equal(response.status, 200);
  assert.match(response.headers.get('content-type'), /application\/json/);
  assert.deepEqual(await response.json(), { status: 'ok' });
  assert.equal((await fetch(`${base}/missing`)).status, 404);
});

test('invalid PORT fails before opening a listener', async (t) => {
  const previousPort = process.env.PORT;
  t.after(() => {
    if (previousPort === undefined) delete process.env.PORT;
    else process.env.PORT = previousPort;
  });
  for (const port of ['invalid', '-1', '65536', '1.5', '']) {
    process.env.PORT = port;
    await assert.rejects(bootstrap(), /PORT must be an integer/);
  }
});
