/**
 * test/smoke-test.js
 * ------------------------------------------------------------
 * A dependency-free smoke test. Boots the real server on an
 * ephemeral port, fires requests at every endpoint, and checks
 * that each one returns the status code the brief calls for.
 * Run with: npm test
 * ------------------------------------------------------------
 */

const http = require('http');
const assert = require('assert');
const server = require('../server');

const WRITE_KEY = 'demo-write-key';
let baseUrl;
let passed = 0;
let failed = 0;

function request(method, path, { body, headers = {} } = {}) {
  return new Promise((resolve, reject) => {
    const payload = body !== undefined ? JSON.stringify(body) : null;
    const req = http.request(
      `${baseUrl}${path}`,
      {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {}),
          ...headers,
        },
      },
      (res) => {
        let raw = '';
        res.on('data', (c) => (raw += c));
        res.on('end', () => {
          let json = null;
          try {
            json = raw ? JSON.parse(raw) : null;
          } catch {
            /* non-JSON body is fine for some responses */
          }
          resolve({ status: res.statusCode, body: json, headers: res.headers });
        });
      }
    );
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

async function check(name, fn) {
  try {
    await fn();
    console.log(`  PASS  ${name}`);
    passed += 1;
  } catch (err) {
    console.log(`  FAIL  ${name}`);
    console.log(`        ${err.message}`);
    failed += 1;
  }
}

async function run() {
  console.log('Running smoke tests against the live server...\n');

  await check('GET /health -> 200', async () => {
    const r = await request('GET', '/health');
    assert.strictEqual(r.status, 200);
    assert.strictEqual(r.body.status, 'ok');
  });

  await check('GET /tasks -> 200 with seeded tasks', async () => {
    const r = await request('GET', '/tasks');
    assert.strictEqual(r.status, 200);
    assert.ok(Array.isArray(r.body.tasks));
    assert.ok(r.body.tasks.length >= 3);
  });

  await check('GET /tasks/1 -> 200', async () => {
    const r = await request('GET', '/tasks/1');
    assert.strictEqual(r.status, 200);
    assert.strictEqual(r.body.id, 1);
  });

  await check('GET /tasks/999 -> 404 (not found)', async () => {
    const r = await request('GET', '/tasks/999');
    assert.strictEqual(r.status, 404);
  });

  await check('GET /tasks/abc -> 400 (bad id)', async () => {
    const r = await request('GET', '/tasks/abc');
    assert.strictEqual(r.status, 400);
  });

  await check('POST /tasks with no API key -> 401', async () => {
    const r = await request('POST', '/tasks', { body: { title: 'Ship it' } });
    assert.strictEqual(r.status, 401);
  });

  await check('POST /tasks with read-only key -> 403', async () => {
    const r = await request('POST', '/tasks', {
      body: { title: 'Ship it' },
      headers: { 'x-api-key': 'demo-readonly-key' },
    });
    assert.strictEqual(r.status, 403);
  });

  await check('POST /tasks missing title -> 400 (validation)', async () => {
    const r = await request('POST', '/tasks', {
      body: {},
      headers: { 'x-api-key': WRITE_KEY },
    });
    assert.strictEqual(r.status, 400);
    assert.ok(r.body.error.details.length > 0);
  });

  await check('POST /tasks with wrong type -> 400 (validation)', async () => {
    const r = await request('POST', '/tasks', {
      body: { title: 'Valid title', completed: 'yes' },
      headers: { 'x-api-key': WRITE_KEY },
    });
    assert.strictEqual(r.status, 400);
  });

  let createdId;
  await check('POST /tasks valid -> 201 Created', async () => {
    const r = await request('POST', '/tasks', {
      body: { title: 'Write the smoke test' },
      headers: { 'x-api-key': WRITE_KEY },
    });
    assert.strictEqual(r.status, 201);
    assert.strictEqual(r.body.title, 'Write the smoke test');
    assert.strictEqual(r.body.completed, false);
    createdId = r.body.id;
  });

  await check('PATCH /tasks/:id -> 200', async () => {
    const r = await request('PATCH', `/tasks/${createdId}`, {
      body: { completed: true },
      headers: { 'x-api-key': WRITE_KEY },
    });
    assert.strictEqual(r.status, 200);
    assert.strictEqual(r.body.completed, true);
  });

  await check('PUT /tasks/:id missing field -> 400', async () => {
    const r = await request('PUT', `/tasks/${createdId}`, {
      body: { title: 'Only a title' },
      headers: { 'x-api-key': WRITE_KEY },
    });
    assert.strictEqual(r.status, 400);
  });

  await check('PUT /tasks/:id full replace -> 200', async () => {
    const r = await request('PUT', `/tasks/${createdId}`, {
      body: { title: 'Fully replaced', completed: false },
      headers: { 'x-api-key': WRITE_KEY },
    });
    assert.strictEqual(r.status, 200);
    assert.strictEqual(r.body.title, 'Fully replaced');
  });

  await check('GET /tasks?completed=true -> filters correctly', async () => {
    const r = await request('GET', '/tasks?completed=true');
    assert.strictEqual(r.status, 200);
    assert.ok(r.body.tasks.every((t) => t.completed === true));
  });

  await check('DELETE /tasks/:id -> 204 No Content', async () => {
    const r = await request('DELETE', `/tasks/${createdId}`, {
      headers: { 'x-api-key': WRITE_KEY },
    });
    assert.strictEqual(r.status, 204);
  });

  await check('GET deleted task -> 404', async () => {
    const r = await request('GET', `/tasks/${createdId}`);
    assert.strictEqual(r.status, 404);
  });

  await check('POST malformed JSON -> 400', async () => {
    const r = await new Promise((resolve, reject) => {
      const req = http.request(
        `${baseUrl}/tasks`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': WRITE_KEY,
          },
        },
        (res) => {
          let raw = '';
          res.on('data', (c) => (raw += c));
          res.on('end', () => resolve({ status: res.statusCode }));
        }
      );
      req.on('error', reject);
      req.write('{ not valid json');
      req.end();
    });
    assert.strictEqual(r.status, 400);
  });

  await check('GET /unknown-route -> 404', async () => {
    const r = await request('GET', '/unknown-route');
    assert.strictEqual(r.status, 404);
  });

  await check('unsupported method on /tasks -> 405', async () => {
    const r = await request('DELETE', '/tasks');
    assert.strictEqual(r.status, 405);
  });

  console.log(`\n${passed} passed, ${failed} failed`);
  server.close(() => process.exit(failed > 0 ? 1 : 0));
}

server.listen(0, () => {
  const { port } = server.address();
  baseUrl = `http://localhost:${port}`;
  run();
});
