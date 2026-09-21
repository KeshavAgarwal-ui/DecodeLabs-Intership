/**
 * routes/tasks.js
 * ------------------------------------------------------------
 * RESTful handlers for the "tasks" resource.
 *
 * Follows the naming rules from "The Language of Nerves":
 *   - Resources are NOUNS   -> /tasks, /tasks/:id
 *   - Methods are VERBS     -> GET, POST, PUT, PATCH, DELETE
 *   - No verbs in the URL   -> never /getTasks or /createTask
 * ------------------------------------------------------------
 */

const store = require('../data/store');
const {
  validateNewTask,
  validateFullTask,
  validatePatch,
  validateIdParam,
} = require('../utils/validation');
const { sendJSON, sendNoContent, sendError } = require('../utils/respond');
const { authorizeWrite } = require('../utils/auth');

// GET /tasks  (supports optional ?completed=true|false filter)
function listTasks(req, res, query) {
  let tasks = store.getAll();

  if (query.completed !== undefined) {
    if (query.completed !== 'true' && query.completed !== 'false') {
      return sendError(
        res,
        400,
        'Query parameter "completed" must be "true" or "false".'
      );
    }
    const wanted = query.completed === 'true';
    tasks = tasks.filter((t) => t.completed === wanted);
  }

  return sendJSON(res, 200, { count: tasks.length, tasks });
}

// GET /tasks/:id
function getTask(req, res, rawId) {
  const { valid, id } = validateIdParam(rawId);
  if (!valid) {
    return sendError(res, 400, 'Task id must be a positive integer.');
  }

  const task = store.getById(id);
  if (!task) {
    return sendError(res, 404, `No task found with id ${rawId}.`);
  }

  return sendJSON(res, 200, task);
}

// POST /tasks
function createTask(req, res, body) {
  const auth = authorizeWrite(req.headers);
  if (!auth.ok) return sendError(res, auth.status, auth.message);

  const { valid, errors } = validateNewTask(body);
  if (!valid) {
    return sendError(res, 400, 'Validation failed.', errors);
  }

  const task = store.create(body);
  res.setHeader('Location', `/tasks/${task.id}`);
  return sendJSON(res, 201, task);
}

// PUT /tasks/:id  (full replace)
function replaceTask(req, res, rawId, body) {
  const auth = authorizeWrite(req.headers);
  if (!auth.ok) return sendError(res, auth.status, auth.message);

  const { valid: idValid, id } = validateIdParam(rawId);
  if (!idValid) {
    return sendError(res, 400, 'Task id must be a positive integer.');
  }

  const { valid, errors } = validateFullTask(body);
  if (!valid) {
    return sendError(res, 400, 'Validation failed.', errors);
  }

  const updated = store.replace(id, body);
  if (!updated) {
    return sendError(res, 404, `No task found with id ${rawId}.`);
  }

  return sendJSON(res, 200, updated);
}

// PATCH /tasks/:id  (partial update)
function patchTask(req, res, rawId, body) {
  const auth = authorizeWrite(req.headers);
  if (!auth.ok) return sendError(res, auth.status, auth.message);

  const { valid: idValid, id } = validateIdParam(rawId);
  if (!idValid) {
    return sendError(res, 400, 'Task id must be a positive integer.');
  }

  const { valid, errors } = validatePatch(body);
  if (!valid) {
    return sendError(res, 400, 'Validation failed.', errors);
  }

  const updated = store.patch(id, body);
  if (!updated) {
    return sendError(res, 404, `No task found with id ${rawId}.`);
  }

  return sendJSON(res, 200, updated);
}

// DELETE /tasks/:id
function deleteTask(req, res, rawId) {
  const auth = authorizeWrite(req.headers);
  if (!auth.ok) return sendError(res, auth.status, auth.message);

  const { valid, id } = validateIdParam(rawId);
  if (!valid) {
    return sendError(res, 400, 'Task id must be a positive integer.');
  }

  const removed = store.remove(id);
  if (!removed) {
    return sendError(res, 404, `No task found with id ${rawId}.`);
  }

  return sendNoContent(res);
}

module.exports = {
  listTasks,
  getTask,
  createTask,
  replaceTask,
  patchTask,
  deleteTask,
};
