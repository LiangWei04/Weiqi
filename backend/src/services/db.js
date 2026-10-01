const { Pool } = require("pg");
const context = require("./demoContext");
require("dotenv").config();

const databaseName = process.env.DB_DATABASE;
const poolConfig = {
  connectionString: process.env.DATABASE_URL || undefined,
  max: Number(process.env.DB_CONNECTION_LIMIT || 5),
  connectionTimeoutMillis: 10000,
  statement_timeout: 10000,
};

if (!poolConfig.connectionString) {
  poolConfig.user = process.env.DB_USER;
  poolConfig.password = process.env.DB_PASSWORD;
  poolConfig.host = process.env.DB_HOST || "localhost";
  poolConfig.database = process.env.DB_DATABASE;
  poolConfig.port = Number(process.env.DB_PORT || 5432);
  poolConfig.max = Number(process.env.DB_CONNECTION_LIMIT || 10);
}

if (process.env.DATABASE_SSL === "true") {
  if (poolConfig.connectionString) {
    const url = new URL(poolConfig.connectionString);
    // URL SSL flags otherwise override pg's explicit certificate validation.
    for (const name of ['sslmode','sslcert','sslkey','sslrootcert']) url.searchParams.delete(name);
    poolConfig.connectionString = url.toString();
  }
  poolConfig.ssl = {
    rejectUnauthorized: true,
  };
}

if (process.env.DEMO_MODE === 'true' && poolConfig.connectionString) {
  const url = new URL(poolConfig.connectionString);
  if (url.hostname.includes('-pooler')) throw new Error('Demo isolation requires a direct PostgreSQL endpoint');
  if (!['127.0.0.1','localhost'].includes(url.hostname) && process.env.DATABASE_SSL !== 'true') throw new Error('Hosted demo requires verified database TLS');
}

const pool = new Pool(poolConfig);
pool.on("error", () => console.error("Database connection lost"));

// All application queries, including model-owned transactions, use this adapter.
// The session lock prevents cleanup/reset while a checked-out client is in use.
const connect = async () => {
  const session = context.getStore();
  if (process.env.DEMO_MODE === "true" && !session) {
    throw new Error("Demo database access requires a session context");
  }
  const client = await pool.connect();
  if (!session) return client;
  const release = client.release.bind(client);
  try {
    await client.query("SELECT pg_advisory_lock_shared(hashtextextended($1, 0))", [session.id]);
    const result = await client.query("SELECT schema_name FROM demo_control.sessions WHERE id=$1 AND expires_at > now()", [session.id]);
    const schema = result.rows[0]?.schema_name;
    if (!schema || !/^demo_[a-f0-9]{32}$/.test(schema)) throw new Error("Demo session expired");
    await client.query("SELECT set_config('search_path', $1, false)", [schema]);
  } catch (error) {
    release(true);
    throw error;
  }
  let released = false;
  client.release = async () => {
    if (released) return;
    released = true;
    try {
      await client.query("ROLLBACK");
      await client.query("RESET ALL");
      await client.query("SELECT pg_advisory_unlock_all()");
      release();
    } catch {
      release(true);
    }
  };
  return client;
};

const query = (text, params, callback) => {
  if (typeof params === "function") { callback = params; params = undefined; }
  const promise = (async () => {
    const client = await connect();
    try { return await client.query(text, params); }
    finally { await client.release(); }
  })();
  if (callback) { promise.then((result) => callback(null, result), (error) => callback(error)); return; }
  return promise;
};

const quoteIdentifier = (value) => `"${String(value).replace(/"/g, '""')}"`;

const ensureDatabase = async () => {
  if (process.env.DATABASE_URL || !databaseName) {
    return;
  }

  const adminPool = new Pool({
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    host: process.env.DB_HOST || "localhost",
    database: process.env.DB_MAINTENANCE_DATABASE || "postgres",
    port: Number(process.env.DB_PORT || 5432),
    max: 1,
  });

  try {
    const result = await adminPool.query("SELECT 1 FROM pg_database WHERE datname = $1", [databaseName]);
    if (result.rowCount === 0) {
      await adminPool.query(`CREATE DATABASE ${quoteIdentifier(databaseName)}`);
    }
  } finally {
    await adminPool.end();
  }
};

module.exports = {
  ensureDatabase,
  connect,
  query,
  control: pool,
  end: () => pool.end(),
};
