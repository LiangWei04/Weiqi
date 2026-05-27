const fs = require("fs");
const path = require("path");
const { Pool } = require("pg");
require("dotenv").config();

const initTables = require("../src/configs/initTables");

const databaseName = process.env.DB_DATABASE;
const tableOrder = [
  "users",
  "roles",
  "user_roles",
  "user_settings",
  "venues",
  "tournament_formats",
  "scoring_systems",
  "player_profiles",
  "events",
  "event_registrations",
  "notifications",
  "attendance_change_requests",
  "competitions",
  "competition_categories",
  "competition_settings",
  "competition_registrations",
  "competition_rounds",
  "competition_matches",
  "competition_ranking_records",
  "event_comments",
  "event_reactions",
];

const serialTables = [
  "users",
  "events",
  "event_registrations",
  "event_comments",
  "event_reactions",
  "roles",
  "notifications",
  "attendance_change_requests",
  "venues",
  "tournament_formats",
  "scoring_systems",
  "competitions",
  "competition_categories",
  "competition_registrations",
  "competition_rounds",
  "competition_matches",
  "competition_ranking_records",
];

const quoteIdentifier = (value) => `"${String(value).replace(/"/g, '""')}"`;

const makePool = (database) => new Pool({
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  host: process.env.DB_HOST || "localhost",
  database,
  port: Number(process.env.DB_PORT || 5432),
  max: 1,
});

const exportData = async () => {
  const pool = makePool(databaseName);
  try {
    const encoding = await pool.query("SHOW server_encoding;");
    const data = {
      exportedAt: new Date().toISOString(),
      database: databaseName,
      sourceEncoding: encoding.rows[0].server_encoding,
      tables: {},
    };

    for (const table of tableOrder) {
      const result = await pool.query(`SELECT * FROM ${quoteIdentifier(table)};`);
      data.tables[table] = result.rows;
    }

    return data;
  } finally {
    await pool.end();
  }
};

const recreateDatabase = async () => {
  const adminPool = makePool(process.env.DB_MAINTENANCE_DATABASE || "postgres");
  try {
    await adminPool.query(
      "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = $1 AND pid <> pg_backend_pid();",
      [databaseName]
    );
    await adminPool.query(`DROP DATABASE IF EXISTS ${quoteIdentifier(databaseName)};`);
    await adminPool.query(
      `CREATE DATABASE ${quoteIdentifier(databaseName)} WITH TEMPLATE template0 ENCODING 'UTF8' LC_COLLATE 'C' LC_CTYPE 'C';`
    );
  } finally {
    await adminPool.end();
  }
};

const restoreData = async (backup) => {
  const db = require("../src/services/db");
  await initTables();
  const client = await db.connect();

  try {
    await client.query("BEGIN");
    await client.query(`TRUNCATE ${tableOrder.map(quoteIdentifier).join(", ")} RESTART IDENTITY CASCADE;`);

    for (const table of tableOrder) {
      const rows = backup.tables[table] || [];
      for (const row of rows) {
        const columns = Object.keys(row);
        if (columns.length === 0) {
          continue;
        }

        const placeholders = columns.map((_, index) => `$${index + 1}`).join(", ");
        const values = columns.map((column) => row[column]);
        await client.query(
          `INSERT INTO ${quoteIdentifier(table)} (${columns.map(quoteIdentifier).join(", ")}) VALUES (${placeholders});`,
          values
        );
      }
    }

    for (const table of serialTables) {
      await client.query(`
        SELECT setval(
          pg_get_serial_sequence('${table}', 'id'),
          COALESCE((SELECT MAX(id) FROM ${quoteIdentifier(table)}), 0) + 1,
          false
        );
      `);
    }

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

const main = async () => {
  if (!databaseName) {
    throw new Error("DB_DATABASE is not configured.");
  }

  const restoreFromPath = process.argv[2];
  const backup = restoreFromPath
    ? JSON.parse(fs.readFileSync(restoreFromPath, "utf8"))
    : await exportData();
  const backupDir = path.join(__dirname, "../backups");
  fs.mkdirSync(backupDir, { recursive: true });
  const backupPath = restoreFromPath || path.join(backupDir, `${databaseName}-before-utf8-${Date.now()}.json`);
  if (!restoreFromPath) {
    fs.writeFileSync(backupPath, JSON.stringify(backup, null, 2));
  }

  await recreateDatabase();
  await restoreData(backup);

  const pool = makePool(databaseName);
  try {
    const encoding = await pool.query("SHOW server_encoding;");
    console.log(JSON.stringify({
      backupPath,
      sourceEncoding: backup.sourceEncoding,
      targetEncoding: encoding.rows[0].server_encoding,
    }, null, 2));
  } finally {
    await pool.end();
  }
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
