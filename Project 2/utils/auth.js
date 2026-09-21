/**
 * utils/auth.js
 * ------------------------------------------------------------
 * A deliberately small demonstration of AuthN vs AuthZ
 * (see the "Autonomic Defense" slide):
 *
 *   - Authentication (401): "Who are you?" -- is there a
 *     recognized API key on the request at all?
 *   - Authorization  (403): "What can you do?" -- is this
 *     key allowed to perform write operations?
 *
 * Two demo keys are hard-coded purely for local testing.
 * A real system would look these up from a secrets store.
 * ------------------------------------------------------------
 */

const KEYS = {
  'demo-write-key': { role: 'editor' }, // allowed to write
  'demo-readonly-key': { role: 'viewer' }, // authenticated, but read-only
};

/**
 * Checks the x-api-key header for write operations
 * (POST / PUT / PATCH / DELETE). Read operations (GET) stay
 * open so the API is easy to explore.
 *
 * Returns { ok: true } or { ok: false, status, message }
 */
function authorizeWrite(headers) {
  const key = headers['x-api-key'];

  if (!key) {
    return {
      ok: false,
      status: 401,
      message: 'Missing API key. Send an "x-api-key" header.',
    };
  }

  const account = KEYS[key];
  if (!account) {
    return { ok: false, status: 401, message: 'Invalid API key.' };
  }

  if (account.role !== 'editor') {
    return {
      ok: false,
      status: 403,
      message: 'This API key does not have write permission.',
    };
  }

  return { ok: true };
}

module.exports = { authorizeWrite };
