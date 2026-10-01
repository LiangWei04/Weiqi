const { randomUUID, createHmac } = require("node:crypto");
const jwt = require("jsonwebtoken");
const db = require("./db");
const key = require("../configs/signingKey");
const seed = require("./demoSeed");
const fail = (status, message) => Object.assign(new Error(message), { status });
const schemaIdentifier = (schema) => {
  if (!/^demo_[a-f0-9]{32}$/.test(schema)) throw new Error("Invalid managed demo schema");
  return `"${schema}"`;
};

async function assertDatabase() {
  const result = await db.control.query("SELECT current_database() AS name");
  if (!process.env.DEMO_DATABASE_NAME || !/^tourney_demo(?:_[a-z0-9_]+)?$/.test(process.env.DEMO_DATABASE_NAME) || result.rows[0].name !== process.env.DEMO_DATABASE_NAME) {
    throw new Error("Demo requires a dedicated tourney_demo database matching DEMO_DATABASE_NAME");
  }
}

async function setup() {
  await assertDatabase();
  const existing = await db.control.query("SELECT 1 FROM information_schema.tables WHERE table_schema='public' LIMIT 1");
  if (existing.rowCount) throw new Error("Refusing demo setup: public schema contains application tables");
  await db.control.query(`CREATE SCHEMA IF NOT EXISTS demo_control;
    CREATE TABLE IF NOT EXISTS demo_control.sessions(id uuid PRIMARY KEY, schema_name text UNIQUE NOT NULL, expires_at timestamptz NOT NULL, records jsonb NOT NULL);
    CREATE TABLE IF NOT EXISTS demo_control.attempts(ip_hash text NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
    CREATE INDEX IF NOT EXISTS demo_attempts_time ON demo_control.attempts(created_at);`);
}

async function clean(client) {
  const expired = await client.query("SELECT id,schema_name FROM demo_control.sessions WHERE expires_at <= now()");
  for (const row of expired.rows) {
    const lock = await client.query("SELECT pg_try_advisory_xact_lock(hashtextextended($1,0)) AS acquired", [row.id]);
    if (!lock.rows[0].acquired) continue;
    await client.query(`DROP SCHEMA ${schemaIdentifier(row.schema_name)} CASCADE`);
    await client.query("DELETE FROM demo_control.sessions WHERE id=$1", [row.id]);
  }
  await client.query("DELETE FROM demo_control.attempts WHERE created_at <= now() - interval '1 hour'");
}

async function maintenance() {
  await assertDatabase();
  const client = await db.control.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(762091)");
    await clean(client);
    await client.query("COMMIT");
  } catch (error) { await client.query("ROLLBACK"); throw error; }
  finally { client.release(); }
}

async function create(ip, previous) {
  const client = await db.control.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(762091)");
    await clean(client);
    const hash = createHmac("sha256",key).update(ip || 'unknown').digest('hex');
    const attempts = await client.query("SELECT count(*)::integer AS count FROM demo_control.attempts WHERE ip_hash=$1", [hash]);
    if (attempts.rows[0].count >= 5) throw fail(429,"You have started or reset five demos this hour. Please return later or view the portfolio walkthrough.");
    if (previous) {
      await client.query("SELECT pg_advisory_xact_lock(hashtextextended($1,0))", [previous]);
      const old = await client.query("DELETE FROM demo_control.sessions WHERE id=$1 AND expires_at > now() RETURNING schema_name", [previous]);
      if (!old.rowCount) throw fail(401,"Your demo has expired. Start a new demo.");
      await client.query(`DROP SCHEMA ${schemaIdentifier(old.rows[0].schema_name)} CASCADE`);
    }
    const count = await client.query("SELECT count(*)::integer AS count FROM demo_control.sessions");
    if (count.rows[0].count >= 10) throw fail(503,"All demo spaces are busy. Please try later or view the portfolio walkthrough.");
    const id = randomUUID();
    const schema = `demo_${id.replaceAll('-','')}`;
    await client.query(`CREATE SCHEMA ${schemaIdentifier(schema)}`);
    await client.query("SELECT set_config('search_path',$1,true)",[schema]);
    const records = await seed(client);
    const row = (await client.query("INSERT INTO demo_control.sessions(id,schema_name,expires_at,records) VALUES ($1,$2,now()+interval '1 hour',$3) RETURNING *", [id,schema,JSON.stringify(records)])).rows[0];
    await client.query("INSERT INTO demo_control.attempts(ip_hash) VALUES ($1)", [hash]);
    await client.query("COMMIT");
    return row;
  } catch (error) { await client.query("ROLLBACK"); throw error; }
  finally { client.release(); }
}

function response(session, persona) {
  const userId = session.records[persona];
  return {
    token: jwt.sign({ sid:session.id, persona, exp:Math.floor(new Date(session.expires_at).getTime()/1000) },key,{ algorithm:'HS256',audience:'tourney-demo' }),
    userId, role:persona === 'organiser' ? 'Captain' : 'Member', persona,
    expiresAt:session.expires_at, records:session.records,
  };
}

async function authenticate(token) {
  let decoded;
  try { decoded = jwt.verify(token,key,{ algorithms:['HS256'],audience:'tourney-demo' }); }
  catch { throw fail(401,"Your demo has expired. Start a new demo."); }
  if (!['organiser','member'].includes(decoded.persona) || typeof decoded.sid !== 'string' || !/^[a-f0-9-]{36}$/.test(decoded.sid)) throw fail(401,"Invalid demo session.");
  const row = (await db.control.query("SELECT * FROM demo_control.sessions WHERE id=$1 AND expires_at > now()", [decoded.sid])).rows[0];
  if (!row) throw fail(401,"Your demo has expired or was reset. Start a new demo.");
  return { row, persona:decoded.persona };
}

module.exports = { setup, maintenance, create, response, authenticate, assertDatabase };
