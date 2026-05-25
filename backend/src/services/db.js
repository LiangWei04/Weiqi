const { Pool } = require("pg");
require("dotenv").config();

const databaseName = process.env.DB_DATABASE;
const poolConfig = {
  connectionString: process.env.DATABASE_URL || undefined,
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
  poolConfig.ssl = {
    rejectUnauthorized: false,
  };
}

const pool = new Pool(poolConfig);

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
  connect: () => pool.connect(),
  query: (text, params, callback) => {
    if (typeof params === "function") {
      return pool.query(text, params);
    }

    return pool.query(text, params, callback);
  },
};
