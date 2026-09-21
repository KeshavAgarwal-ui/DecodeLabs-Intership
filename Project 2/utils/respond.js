/**
 * utils/respond.js
 * ------------------------------------------------------------
 * Every response the API sends goes through this one function
 * so that headers, JSON formatting, and status codes stay
 * consistent everywhere ("Communicating State: The Server's
 * Tone" -- don't force the client to guess).
 * ------------------------------------------------------------
 */

function sendJSON(res, statusCode, payload) {
  const body = payload === undefined ? '' : JSON.stringify(payload, null, 2);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
  });
  res.end(body);
}

function sendNoContent(res) {
  res.writeHead(204);
  res.end();
}

function sendError(res, statusCode, message, details) {
  sendJSON(res, statusCode, {
    error: {
      status: statusCode,
      message,
      ...(details ? { details } : {}),
    },
  });
}

module.exports = { sendJSON, sendNoContent, sendError };
