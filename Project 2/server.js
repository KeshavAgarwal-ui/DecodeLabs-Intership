/**
 * server.js
 * ------------------------------------------------------------
 * DecodeLabs Full Stack Training Kit -- Project 2
 * Backend API Development
 *
 * A zero-dependency REST API built on Node's built-in `http`
 * module (no Express, no npm install required -- just
 * `node server.js`). It implements everything called out in
 * the project brief:
 *
 *   - API endpoints for GET and POST (plus PUT/PATCH/DELETE
 *     to round out full CRUD)
 *   - Handling of user input and responses
 *   - Basic + semantic data validation ("the gatekeeper rule")
 *   - Correct, meaningful HTTP status codes
 *   - JSON request/response bodies
 *   - Centralized error handling (a bad request never crashes
 *     the server -- "statelessness / resilience")
 * ------------------------------------------------------------
 */

const http = require('http');
const { URL } = require('url');

const tasks = require('./routes/tasks');
const { sendJSON, sendError } = require('./utils/respond');
const { isRateLimited } = require('./utils/rateLimit');

const PORT = process.env.PORT || 3000;
const MAX_BODY_BYTES = 1e6; // 1 MB safety cap against oversized payloads

/**
 * Reads and parses a JSON body from the request stream.
 * Resolves to `null` if there is no body at all (e.g. GET/DELETE),
 * or rejects with a descriptive error for malformed JSON /
 * oversized payloads -- never trust the client's Content-Type
 * claim blindly either.
 */
function readJSONBody(req) {
  return new Promise((resolve, reject) => {
    let received = 0;
    const chunks = [];

    req.on('data', (chunk) => {
      received += chunk.length;
      if (received > MAX_BODY_BYTES) {
        reject({ status: 413, message: 'Request body too large.' });
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });

    req.on('end', () => {
      if (chunks.length === 0) return resolve(null);
      const raw = Buffer.concat(chunks).toString('utf8').trim();
      if (raw.length === 0) return resolve(null);
      try {
        resolve(JSON.parse(raw));
      } catch {
        reject({ status: 400, message: 'Request body is not valid JSON.' });
      }
    });

    req.on('error', () => {
      reject({ status: 400, message: 'Error reading request body.' });
    });
  });
}

async function router(req, res) {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const segments = url.pathname.split('/').filter(Boolean); // e.g. ['tasks', '3']
  const query = Object.fromEntries(url.searchParams);

  // --- Health check: simple, unauthenticated, always-on route ---
  if (segments.length === 0 || (segments.length === 1 && segments[0] === 'health')) {
    return sendJSON(res, 200, {
      status: 'ok',
      service: 'decodelabs-project2-backend-api',
      time: new Date().toISOString(),
    });
  }

  // --- Only the /tasks resource is exposed by this API ---
  if (segments[0] !== 'tasks') {
    return sendError(res, 404, `Route not found: ${req.method} ${url.pathname}`);
  }

  // GET /tasks , POST /tasks
  if (segments.length === 1) {
    if (req.method === 'GET') return tasks.listTasks(req, res, query);
    if (req.method === 'POST') {
      const body = await readJSONBody(req);
      return tasks.createTask(req, res, body ?? {});
    }
    res.setHeader('Allow', 'GET, POST');
    return sendError(res, 405, `Method ${req.method} not allowed on /tasks.`);
  }

  // /tasks/:id
  if (segments.length === 2) {
    const id = segments[1];

    if (req.method === 'GET') return tasks.getTask(req, res, id);
    if (req.method === 'PUT') {
      const body = await readJSONBody(req);
      return tasks.replaceTask(req, res, id, body ?? {});
    }
    if (req.method === 'PATCH') {
      const body = await readJSONBody(req);
      return tasks.patchTask(req, res, id, body ?? {});
    }
    if (req.method === 'DELETE') return tasks.deleteTask(req, res, id);

    res.setHeader('Allow', 'GET, PUT, PATCH, DELETE');
    return sendError(
      res,
      405,
      `Method ${req.method} not allowed on /tasks/:id.`
    );
  }

  return sendError(res, 404, `Route not found: ${req.method} ${url.pathname}`);
}

const server = http.createServer(async (req, res) => {
  const clientId = req.socket.remoteAddress || 'unknown';

  // --- Rate limiting (429) ---
  if (isRateLimited(clientId)) {
    res.setHeader('Retry-After', '10');
    return sendError(res, 429, 'Too many requests. Please slow down.');
  }

  // --- Centralized error handling: one bad request never takes
  //     the whole server down (500 is the true "we messed up"
  //     signal, everything else is a handled, expected case) ---
  try {
    await router(req, res);
  } catch (err) {
    if (err && err.status) {
      return sendError(res, err.status, err.message);
    }
    console.error('Unhandled server error:', err);
    return sendError(res, 500, 'Internal server error.');
  }
});

// Only auto-start the server when this file is run directly
// (e.g. `node server.js`). When it's `require()`'d — for example
// by the smoke test — the caller controls when/where it listens.
if (require.main === module) {
  server.listen(PORT, () => {
    console.log(`DecodeLabs Project 2 API listening on http://localhost:${PORT}`);
    console.log(`Try:  curl http://localhost:${PORT}/tasks`);
  });
}

module.exports = server;
