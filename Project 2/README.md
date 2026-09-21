# DecodeLabs — Project 2: Backend API Development

**Industrial Training Kit · Batch 2026 · Powered by DecodeLabs**

> "Project 1 was the skin. Project 2 is the life." — the nervous system that
> connects user interaction to server-side processing through pure API logic.

A small, zero-dependency REST API (built on Node's native `http` module —
no Express, no `npm install` required) that manages a **Task** resource with
full CRUD, input validation, authentication/authorization, rate limiting,
and consistent, meaningful HTTP status codes.

---

## 1. Quick start

```bash
node server.js
# DecodeLabs Project 2 API listening on http://localhost:3000
```

Run the automated test suite (spins up the real server and exercises every
route and status code):

```bash
npm test
```

No `npm install` is needed — the project has zero external dependencies.

---

## 2. How this satisfies the Project 2 brief

| Requirement (from the brief)      | Where it's implemented                                             |
|------------------------------------|----------------------------------------------------------------------|
| Create API endpoints (GET / POST) | `routes/tasks.js` — GET, POST, plus PUT/PATCH/DELETE for full CRUD  |
| Handle user input and responses   | `server.js` `readJSONBody()`, `utils/respond.js`                    |
| Validate basic data                | `utils/validation.js` — syntactic + semantic ("gatekeeper") checks  |
| RESTful naming (nouns, not verbs)  | `/tasks`, `/tasks/:id` — never `/getTasks` or `/createTask`         |
| Correct HTTP status codes          | 200, 201, 204, 400, 401, 403, 404, 405, 429, 500 — see §5           |
| JSON data exchange                 | All request/response bodies are JSON                                |
| Resilience / error handling        | Central `try/catch` in `server.js`; malformed JSON never crashes it |

---

## 3. Project structure

```
project2-backend-api/
├── server.js            # HTTP server, routing, body parsing, error handling
├── routes/
│   └── tasks.js         # Endpoint handlers for the /tasks resource
├── utils/
│   ├── validation.js    # Syntactic + semantic input validation (gatekeeper)
│   ├── respond.js       # Consistent JSON response helpers
│   ├── auth.js          # Demo API-key auth (401 vs 403)
│   └── rateLimit.js     # Fixed-window rate limiter (429)
├── data/
│   └── store.js         # In-memory "database" for tasks
├── test/
│   └── smoke-test.js    # End-to-end tests for every endpoint/status code
└── package.json
```

---

## 4. API reference

Base URL: `http://localhost:3000`

### `GET /health`
Unauthenticated liveness check.
```
200 OK
{ "status": "ok", "service": "decodelabs-project2-backend-api", "time": "..." }
```

### `GET /tasks`
List all tasks. Optional query filter: `?completed=true|false`.
```bash
curl http://localhost:3000/tasks
curl http://localhost:3000/tasks?completed=true
```
`200 OK` → `{ "count": 3, "tasks": [ { "id": 1, "title": "...", "completed": false }, ... ] }`

### `GET /tasks/:id`
Fetch a single task.
```bash
curl http://localhost:3000/tasks/1
```
`200 OK` with the task, or `404 Not Found` / `400 Bad Request` (non-numeric id).

### `POST /tasks` 🔒
Create a task. **Requires** header `x-api-key: demo-write-key`.
```bash
curl -X POST http://localhost:3000/tasks \
  -H "Content-Type: application/json" \
  -H "x-api-key: demo-write-key" \
  -d '{"title": "Ship the API"}'
```
`201 Created` (with a `Location` header) or `400 Bad Request` with a list of
validation errors, e.g.:
```json
{ "error": { "status": 400, "message": "Validation failed.",
             "details": ["\"title\" is required."] } }
```

### `PUT /tasks/:id` 🔒
Full replace — body must include **both** `title` and `completed`.
```bash
curl -X PUT http://localhost:3000/tasks/1 \
  -H "Content-Type: application/json" \
  -H "x-api-key: demo-write-key" \
  -d '{"title": "Renamed task", "completed": true}'
```

### `PATCH /tasks/:id` 🔒
Partial update — send only the field(s) you want to change.
```bash
curl -X PATCH http://localhost:3000/tasks/1 \
  -H "Content-Type: application/json" \
  -H "x-api-key: demo-write-key" \
  -d '{"completed": true}'
```

### `DELETE /tasks/:id` 🔒
```bash
curl -X DELETE http://localhost:3000/tasks/1 -H "x-api-key: demo-write-key"
```
`204 No Content` on success.

🔒 = requires the `x-api-key` header. Two demo keys are pre-configured for
testing the AuthN/AuthZ split:
- `demo-write-key` — full read/write access
- `demo-readonly-key` — authenticated, but **write returns 403**
- no key at all on a write route → **401**

---

## 5. Status codes used (and why)

| Code | Meaning            | When this API sends it                                   |
|------|---------------------|------------------------------------------------------------|
| 200  | OK                  | Successful GET / PUT / PATCH                               |
| 201  | Created             | Successful POST (new task created)                         |
| 204  | No Content          | Successful DELETE                                           |
| 400  | Bad Request         | Invalid JSON, failed validation, bad id format              |
| 401  | Unauthorized        | Write request with no / invalid API key                     |
| 403  | Forbidden           | Authenticated, but the key lacks write permission           |
| 404  | Not Found           | Unknown route, or task id doesn't exist                     |
| 405  | Method Not Allowed  | e.g. `DELETE /tasks` (no id given)                          |
| 429  | Too Many Requests   | More than 20 requests from one client in a 10s window       |
| 500  | Internal Server Error | Any unexpected, unhandled error (never lets the process crash) |

---

## 6. Design notes ("Build with Integrity")

- **Never trust the client.** Every write endpoint runs a two-layer
  gatekeeper check: syntactic (right types, right shape) then semantic
  (non-empty title, no unknown fields, correct length). See
  `utils/validation.js`.
- **Resources are nouns, methods are verbs.** Routes are `/tasks` and
  `/tasks/:id` — the HTTP verb (GET/POST/PUT/PATCH/DELETE) carries the
  action, never the URL.
- **Statelessness & resilience.** Every request is handled independently;
  a single bad request (malformed JSON, oversized body, wrong types) is
  caught and answered with a clean 4xx — it can never take the server down.
  Only a genuinely unexpected bug surfaces as 500.
- **Predictable responses.** All success and error bodies are shaped the
  same way everywhere (`utils/respond.js`), so a client never has to guess
  what a response will look like.

## 7. Ideas to extend this (per the brief's conclusion)

The conclusion slide encourages experimenting further rather than stopping
at "done." Natural next steps:
- Swap `data/store.js` for a real database (SQLite/Postgres/Mongo).
- Add pagination (`?page=`, `?limit=`) to `GET /tasks`.
- Replace the demo API keys with real token-based auth (JWT).
- Add a `PATCH` bulk-update or a `/tasks/:id/complete` action-style
  sub-resource for a common one-click "mark done" operation.
