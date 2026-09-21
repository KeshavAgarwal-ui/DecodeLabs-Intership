/**
 * utils/validation.js
 * ------------------------------------------------------------
 * "Never trust the client." Every payload coming in from the
 * network is treated as hostile until proven otherwise. This
 * module performs two layers of checking, mirroring the
 * training-kit slide "The Gatekeeper Rule":
 *
 *   1. Syntactic validation -- is the shape/type correct?
 *   2. Semantic validation  -- does the value make sense?
 * ------------------------------------------------------------
 */

/**
 * Validates the body for creating a task (POST /tasks).
 * Returns { valid: true } or { valid: false, errors: [...] }
 */
function validateNewTask(body) {
  const errors = [];

  if (body === null || typeof body !== 'object' || Array.isArray(body)) {
    return { valid: false, errors: ['Request body must be a JSON object.'] };
  }

  // --- title: required, non-empty string ---
  if (!('title' in body)) {
    errors.push('"title" is required.');
  } else if (typeof body.title !== 'string') {
    errors.push('"title" must be a string.');
  } else if (body.title.trim().length === 0) {
    errors.push('"title" cannot be empty.');
  } else if (body.title.length > 140) {
    errors.push('"title" must be 140 characters or fewer.');
  }

  // --- completed: optional, must be boolean if present ---
  if ('completed' in body && typeof body.completed !== 'boolean') {
    errors.push('"completed" must be a boolean (true/false).');
  }

  // --- reject unknown fields to keep the resource shape predictable ---
  const allowedFields = new Set(['title', 'completed']);
  Object.keys(body).forEach((key) => {
    if (!allowedFields.has(key)) {
      errors.push(`Unknown field "${key}" is not allowed.`);
    }
  });

  return { valid: errors.length === 0, errors };
}

/**
 * Validates the body for a full replace (PUT /tasks/:id).
 * PUT requires the complete representation of the resource.
 */
function validateFullTask(body) {
  const result = validateNewTask(body);
  if (!('completed' in (body || {}))) {
    result.valid = false;
    result.errors.push('"completed" is required for a full update (PUT).');
  }
  return result;
}

/**
 * Validates the body for a partial update (PATCH /tasks/:id).
 * At least one recognized, correctly-typed field must be present.
 */
function validatePatch(body) {
  const errors = [];

  if (body === null || typeof body !== 'object' || Array.isArray(body)) {
    return { valid: false, errors: ['Request body must be a JSON object.'] };
  }

  if (Object.keys(body).length === 0) {
    errors.push('Request body must include at least one field to update.');
  }

  if ('title' in body) {
    if (typeof body.title !== 'string' || body.title.trim().length === 0) {
      errors.push('"title" must be a non-empty string.');
    } else if (body.title.length > 140) {
      errors.push('"title" must be 140 characters or fewer.');
    }
  }

  if ('completed' in body && typeof body.completed !== 'boolean') {
    errors.push('"completed" must be a boolean (true/false).');
  }

  const allowedFields = new Set(['title', 'completed']);
  Object.keys(body).forEach((key) => {
    if (!allowedFields.has(key)) {
      errors.push(`Unknown field "${key}" is not allowed.`);
    }
  });

  return { valid: errors.length === 0, errors };
}

/**
 * Validates a route param that is supposed to be a positive integer id.
 */
function validateIdParam(rawId) {
  const id = Number(rawId);
  if (!Number.isInteger(id) || id <= 0) {
    return { valid: false, id: null };
  }
  return { valid: true, id };
}

module.exports = {
  validateNewTask,
  validateFullTask,
  validatePatch,
  validateIdParam,
};
