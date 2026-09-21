/**
 * data/store.js
 * ------------------------------------------------------------
 * A tiny in-memory "database" for the Task resource.
 * In a real-world project this file would be replaced by a
 * proper database layer (Postgres, Mongo, etc). Keeping it as
 * a simple module means the rest of the app never needs to
 * know HOW the data is persisted -- only that it can
 * list / find / create / update / delete tasks.
 * ------------------------------------------------------------
 */

let tasks = [
  { id: 1, title: 'Design API endpoints', completed: true },
  { id: 2, title: 'Add validation middleware', completed: false },
  { id: 3, title: 'Write documentation', completed: false },
];

let nextId = 4;

function getAll() {
  return tasks;
}

function getById(id) {
  return tasks.find((t) => t.id === id);
}

function create({ title, completed = false }) {
  const task = { id: nextId++, title, completed };
  tasks.push(task);
  return task;
}

function replace(id, { title, completed }) {
  const index = tasks.findIndex((t) => t.id === id);
  if (index === -1) return null;
  tasks[index] = { id, title, completed };
  return tasks[index];
}

function patch(id, changes) {
  const task = getById(id);
  if (!task) return null;
  Object.assign(task, changes);
  return task;
}

function remove(id) {
  const index = tasks.findIndex((t) => t.id === id);
  if (index === -1) return false;
  tasks.splice(index, 1);
  return true;
}

module.exports = { getAll, getById, create, replace, patch, remove };
