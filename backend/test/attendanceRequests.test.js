const assert = require("node:assert/strict");
const { before, after, test } = require("node:test");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const { randomUUID } = require("node:crypto");
const { Pool } = require("pg");
const express = require("express");
const jwt = require("jsonwebtoken");

// Never load the application's db service or .env. Only the dedicated local
// test instance is accepted; each run owns one disposable schema inside it.
const port = Number(process.env.ATTENDANCE_TEST_PORT);
assert.ok(Number.isInteger(port) && port >= 1024 && port <= 65535 && port !== 5432,
  "Set ATTENDANCE_TEST_PORT to a dedicated disposable PostgreSQL instance (not 5432).");
const schema = `attendance_test_${randomUUID().replaceAll("-", "")}`;
const pool = new Pool({
  host: "127.0.0.1",
  port,
  user: "attendance_test",
  database: "attendance_test",
  password: "",
  ssl: false,
  options: `-c search_path=${schema} -c statement_timeout=5000`,
  connectionTimeoutMillis: 5000,
});
const dbPath = require.resolve("../src/services/db");
const originalDb = require.cache[dbPath];
let model;
let schemaCreated = false;
let server;
let baseUrl;
const testSigningKey = randomUUID();
const auditSql = readFileSync(path.join(__dirname, "../src/configs/attendanceRequestAudit.sql"), "utf8");

before(async () => {
  await pool.query(`CREATE SCHEMA "${schema}"`);
  schemaCreated = true;
  await pool.query(readFileSync(path.join(__dirname, "../DDL.sql"), "utf8"));
  await pool.query(auditSql);
  // Replace only the connection adapter. Model SQL executes in real PostgreSQL.
  require.cache[dbPath] = { id: dbPath, filename: dbPath, loaded: true, exports: pool };
  model = require("../src/models/attendanceRequestModel");
  // Exercise real JWT verification and role middleware with test-only identities.
  // Block dotenv loading so API tests cannot read the application's credentials.
  const dotenvPath = require.resolve("dotenv");
  require.cache[dotenvPath] = { id: dotenvPath, filename: dotenvPath, loaded: true, exports: { config() {} } };
  process.env.JWT_SECRET_KEY = testSigningKey;
  process.env.JWT_ALGORITHM = "HS256";
  const app = express();
  app.use(express.json());
  app.use("/attendance-requests", require("../src/routes/attendanceRequestRoutes"));
  await new Promise((resolve) => { server = app.listen(0, "127.0.0.1", resolve); });
  baseUrl = `http://127.0.0.1:${server.address().port}/attendance-requests`;
});

after(async () => {
  try {
    if (server) await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    if (schemaCreated) await pool.query(`DROP SCHEMA "${schema}" CASCADE`);
  } finally {
    await pool.end();
    if (originalDb) require.cache[dbPath] = originalDb;
    else delete require.cache[dbPath];
  }
});

const submit = (data) => new Promise((resolve, reject) => {
  model.insertEventRequest(data, (error, result) => {
    if (error) reject(error);
    else resolve(result.rows[0]);
  });
});

async function fixture() {
  const suffix = randomUUID();
  const users = await pool.query(`
    INSERT INTO users (email, role) VALUES
      ($1, 'Member'), ($2, 'Secretary'), ($3, 'Captain') RETURNING id;
  `, [`member-${suffix}@example.invalid`, `secretary-${suffix}@example.invalid`, `captain-${suffix}@example.invalid`]);
  const [member, secretary, captain] = users.rows.map((row) => row.id);
  const event = await pool.query(`
    INSERT INTO events (title, event_date, capacity, status)
    VALUES ('Test past event', CURRENT_DATE - 7, 10, 'Completed') RETURNING id;
  `);
  const registration = await pool.query(`
    INSERT INTO event_registrations (user_id, event_id, attended)
    VALUES ($1, $2, false) RETURNING id;
  `, [member, event.rows[0].id]);
  const data = {
    registration_id: registration.rows[0].id,
    requested_attended: true,
    reason: "Attendance was missed",
    requested_by: secretary,
  };
  const request = await submit(data);
  assert.ok(request, "Fixture must create a pending correction");
  return { data, request, captain, member, secretary };
}

async function state(requestId) {
  const result = await pool.query(`
    SELECT acr.status, acr.reviewed_by, acr.reviewed_at, er.attended
    FROM attendance_change_requests acr
    JOIN event_registrations er ON er.id = acr.event_registration_id
    WHERE acr.id = $1;
  `, [requestId]);
  return result.rows[0];
}

test("approval commits attendance and the review together", async () => {
  const { request, captain } = await fixture();
  const approved = await model.approve({ request_id: request.id, reviewed_by: captain });
  assert.equal(approved.status, "Approved");
  const saved = await state(request.id);
  assert.equal(saved.attended, true);
  assert.equal(saved.status, "Approved");
  assert.equal(saved.reviewed_by, captain);
  assert.ok(saved.reviewed_at);
});

test("two approvals of the same pending request produce only one transition", async () => {
  const { request, captain } = await fixture();
  const outcomes = await Promise.all([
    model.approve({ request_id: request.id, reviewed_by: captain }),
    model.approve({ request_id: request.id, reviewed_by: captain }),
  ]);
  assert.equal(outcomes.filter(Boolean).length, 1);
  assert.equal(outcomes.filter((value) => value === null).length, 1);
  assert.equal((await state(request.id)).attended, true);
});

test("attendance write failure rolls back the approval record", async () => {
  const { data, request, captain } = await fixture();
  // Deliberately reject this fixture's attendance write in the disposable schema.
  const registrationId = Number(data.registration_id);
  assert.ok(Number.isSafeInteger(registrationId));
  await pool.query(`ALTER TABLE event_registrations ADD CONSTRAINT reject_test_${registrationId}
    CHECK (id <> ${registrationId} OR attended = false)`);
  await assert.rejects(
    model.approve({ request_id: request.id, reviewed_by: captain }),
    (error) => error.code === "23514"
  );
  const saved = await state(request.id);
  assert.equal(saved.status, "Pending");
  assert.equal(saved.attended, false);
  assert.equal(saved.reviewed_by, null);
  assert.equal(saved.reviewed_at, null);
});

test("stale approval cannot apply content changed after the captain read it", async () => {
  const { data, request, captain } = await fixture();
  const displayedRequestId = request.id;
  const revised = await model.replace({ request_id: request.id, requested_by: data.requested_by, requested_attended: false, reason: "Correction withdrawn" });
  assert.ok(revised);
  // The old ID must never approve the replacement's unseen content.
  const result = await model.approve({ request_id: displayedRequestId, reviewed_by: captain });
  assert.equal(result, null, "Stale approval must be refused, not approve unseen content");
  const pending = await state(revised.id);
  assert.equal(pending.status, "Pending");
  assert.equal(pending.attended, false);
  assert.notEqual(revised.id, request.id);
  assert.equal(revised.replaces_request_id, request.id);
  const original = (await pool.query("SELECT * FROM attendance_change_requests WHERE id = $1", [request.id])).rows[0];
  assert.equal(original.status, "Superseded");
  assert.equal(original.reason, request.reason);
  assert.equal(original.requested_attended, true);
  assert.equal(original.requested_by, request.requested_by);
  assert.deepEqual(original.created_at, request.created_at);
  assert.ok(original.superseded_at);
});

const rejectRequest = (data) => new Promise((resolve, reject) => {
  model.reject(data, (error, result) => error ? reject(error) : resolve(result.rows[0]));
});

for (const decision of ["Approved", "Rejected"]) {
  test(`revision after ${decision} is refused without creating a new request`, async () => {
    const { data, request, captain } = await fixture();
    if (decision === "Approved") await model.approve({ request_id: request.id, reviewed_by: captain });
    else await rejectRequest({ request_id: request.id, reviewed_by: captain });
    const original = await state(request.id);
    const revised = await model.replace({ request_id: request.id, requested_by: data.requested_by, requested_attended: false, reason: "Late edit" });
    assert.equal(revised, null);
    assert.deepEqual(await state(request.id), original);
    const count = await pool.query("SELECT count(*)::int AS count FROM attendance_change_requests WHERE event_registration_id = $1", [data.registration_id]);
    assert.equal(count.rows[0].count, 1);
    // Only a separate create operation starts another correction after a decision.
    const next = await submit({ ...data, requested_attended: false, reason: "Explicit new correction" });
    assert.notEqual(next.id, request.id);
    assert.equal(next.status, "Pending");
    assert.deepEqual(await state(request.id), original);
  });
}

test("new submission cannot overwrite an existing pending request", async () => {
  const { data, request } = await fixture();
  await assert.rejects(submit({ ...data, reason: "Overwrite" }), (error) => error.code === "23505");
  const original = await pool.query("SELECT * FROM attendance_change_requests WHERE id = $1", [request.id]);
  assert.deepEqual(original.rows[0], request);
});

test("a failed replacement insert restores the original Pending request", async () => {
  const { data, request } = await fixture();
  await assert.rejects(model.replace({ request_id: request.id, requested_by: data.requested_by, requested_attended: null, reason: "Insert must fail" }),
    (error) => error.code === "23502");
  const original = (await pool.query("SELECT * FROM attendance_change_requests WHERE id = $1", [request.id])).rows[0];
  assert.deepEqual(original, request);
});

test("competing replacements preserve a single successor", async () => {
  const { data, request } = await fixture();
  const edit = { request_id: request.id, requested_by: data.requested_by, requested_attended: false, reason: "Revised" };
  const results = await Promise.all([model.replace(edit), model.replace(edit)]);
  assert.equal(results.filter(Boolean).length, 1);
  assert.equal(results.filter((result) => result === null).length, 1);
  const rows = await pool.query("SELECT status FROM attendance_change_requests WHERE event_registration_id = $1", [data.registration_id]);
  assert.deepEqual(rows.rows.map((row) => row.status).sort(), ["Pending", "Superseded"]);
});

test("approval racing replacement yields one coherent winner", async () => {
  const { data, request, captain } = await fixture();
  const [approved, replaced] = await Promise.all([
    model.approve({ request_id: request.id, reviewed_by: captain }),
    model.replace({ request_id: request.id, requested_by: data.requested_by, requested_attended: false, reason: "Racing revision" }),
  ]);
  assert.equal(Number(Boolean(approved)) + Number(Boolean(replaced)), 1);
  const saved = await state(request.id);
  assert.equal(saved.status, approved ? "Approved" : "Superseded");
  assert.equal(saved.attended, Boolean(approved));
});

test("audit guards reject content rewrites, finalized edits, and cascading deletion", async () => {
  const { request, captain, member } = await fixture();
  await assert.rejects(pool.query("UPDATE attendance_change_requests SET reason = 'Changed' WHERE id = $1", [request.id]), (error) => error.code === "23514");
  await model.approve({ request_id: request.id, reviewed_by: captain });
  await assert.rejects(pool.query("UPDATE attendance_change_requests SET status = 'Pending' WHERE id = $1", [request.id]), (error) => error.code === "23514");
  await assert.rejects(pool.query("DELETE FROM users WHERE id = $1", [member]), (error) => error.code === "23514");
  assert.equal((await state(request.id)).status, "Approved");
});

async function api(userId, method, route, body) {
  const headers = { "Content-Type": "application/json" };
  if (userId) headers.Authorization = `Bearer ${jwt.sign({ userId }, testSigningKey, { algorithm: "HS256", expiresIn: "5m" })}`;
  const response = await fetch(`${baseUrl}${route}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  return { status: response.status, body: await response.json() };
}

test("API denies unauthenticated, Member and Secretary approval without data changes", async () => {
  const { request, member, secretary } = await fixture();
  for (const [user, status] of [[null, 401], [member, 403], [secretary, 403]]) {
    const response = await api(user, "PUT", `/${request.id}/approve`);
    assert.equal(response.status, status);
    assert.equal((await state(request.id)).status, "Pending");
    assert.equal((await state(request.id)).attended, false);
  }
  assert.equal((await api(member, "POST", `/${request.id}/replacements`, { attended: false, reason: "Forbidden" })).status, 403);
});

test("API validates IDs, booleans and reasons before changing data", async () => {
  const { request, secretary, captain } = await fixture();
  assert.equal((await api(captain, "PUT", "/not-an-id/approve")).status, 400);
  for (const body of [{ attended: "false", reason: "Wrong type" }, { attended: false, reason: 5 }, { attended: true, reason: "  " }]) {
    assert.equal((await api(secretary, "POST", `/${request.id}/replacements`, body)).status, 400);
  }
  assert.equal((await state(request.id)).status, "Pending");
});

test("API replacement preserves actor identity and returns conflict for stale decisions", async () => {
  const { request, secretary, captain, member, data } = await fixture();
  const replacement = await api(secretary, "POST", `/${request.id}/replacements`, {
    attended: false, reason: "New evidence", requested_by: member,
  });
  assert.equal(replacement.status, 201);
  assert.equal(replacement.body.request.requested_by, secretary);
  assert.equal(replacement.body.request.replaces_request_id, request.id);
  for (const decision of ["approve", "reject"]) {
    const stale = await api(captain, "PUT", `/${request.id}/${decision}`);
    assert.equal(stale.status, 409);
    assert.equal(stale.body.code, "REQUEST_NOT_PENDING");
  }
  const duplicate = await api(secretary, "POST", `/events/${data.registration_id}`, { attended: true, reason: "Duplicate" });
  assert.equal(duplicate.status, 409);
  assert.equal(duplicate.body.code, "PENDING_REQUEST_EXISTS");
  const approved = await api(captain, "PUT", `/${replacement.body.request.id}/approve`, { reviewed_by: member });
  assert.equal(approved.status, 200);
  assert.equal(approved.body.request.reviewed_by, captain);
  assert.equal((await api(secretary, "POST", `/${replacement.body.request.id}/replacements`, { attended: true, reason: "Late edit" })).status, 409);
});

test("competition corrections use the same replacement and approval guarantees", async () => {
  const { member, secretary, captain } = await fixture();
  const competition = await pool.query("INSERT INTO competitions (title, start_date, end_date) VALUES ('Past competition', CURRENT_DATE - 7, CURRENT_DATE - 6) RETURNING id");
  const category = await pool.query("INSERT INTO competition_categories (competition_id, name, capacity) VALUES ($1, 'Open', 10) RETURNING id", [competition.rows[0].id]);
  const registration = await pool.query("INSERT INTO competition_registrations (user_id, category_id, status) VALUES ($1, $2, 'Registered') RETURNING id", [member, category.rows[0].id]);
  const created = await api(secretary, "POST", `/competitions/${registration.rows[0].id}`, { attended: false, reason: "Initial" });
  assert.equal(created.status, 201);
  const replacement = await api(secretary, "POST", `/${created.body.request.id}/replacements`, { attended: true, reason: "Revised" });
  assert.equal(replacement.status, 201);
  assert.equal(await model.approve({ request_id: created.body.request.id, reviewed_by: captain }), null);
  assert.equal((await api(captain, "PUT", `/${replacement.body.request.id}/approve`)).status, 200);
  assert.equal((await pool.query("SELECT attended FROM competition_registrations WHERE id = $1", [registration.rows[0].id])).rows[0].attended, true);
});

test("API returns a safe failure contract when the approval dependency fails", async (t) => {
  const { request, captain } = await fixture();
  t.mock.method(model, "approve", async () => { throw new Error("Internal connection details must not reach clients"); });
  const response = await api(captain, "PUT", `/${request.id}/approve`);
  assert.equal(response.status, 500);
  assert.deepEqual(response.body, { code: "ATTENDANCE_REQUEST_FAILED", message: "The attendance request could not be processed." });
  assert.equal((await state(request.id)).status, "Pending");
});

test("audit upgrade preserves legacy decisions and can be reapplied", async () => {
  const legacySchema = `${schema}_legacy`;
  const client = await pool.connect();
  try {
    await client.query(`CREATE SCHEMA "${legacySchema}"`);
    await client.query(`SET search_path TO "${legacySchema}"`);
    await client.query(`CREATE TABLE attendance_change_requests (
      id SERIAL PRIMARY KEY, event_registration_id INTEGER, competition_registration_id INTEGER,
      requested_attended BOOLEAN NOT NULL, reason TEXT NOT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Approved', 'Rejected')),
      requested_by INTEGER NOT NULL, reviewed_by INTEGER, reviewed_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`);
    const legacy = (await client.query(`INSERT INTO attendance_change_requests
      (event_registration_id, requested_attended, reason, status, requested_by, reviewed_by, reviewed_at)
      VALUES (1, true, 'Historic decision', 'Approved', 2, 3, CURRENT_TIMESTAMP) RETURNING *`)).rows[0];
    await client.query(auditSql);
    await client.query(auditSql);
    const upgraded = (await client.query("SELECT * FROM attendance_change_requests WHERE id = $1", [legacy.id])).rows[0];
    assert.deepEqual(upgraded, { ...legacy, replaces_request_id: null, superseded_at: null });
    await assert.rejects(client.query("UPDATE attendance_change_requests SET reason = 'Rewrite' WHERE id = $1", [legacy.id]),
      (error) => error.code === "23514");
  } finally {
    await client.query("ROLLBACK");
    await client.query(`SET search_path TO "${schema}"`);
    await client.query(`DROP SCHEMA IF EXISTS "${legacySchema}" CASCADE`);
    client.release();
  }
});
