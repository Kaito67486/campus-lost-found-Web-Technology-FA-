// db.js (CommonJS) - MySQL pool helper using mysql2/promise

const mysql = require("mysql2/promise");
const dotenv = require("dotenv");

dotenv.config();

// Use either a single DATABASE_URL or host/user/pass/db fields
// Recommended env vars:
// DB_HOST, DB_USER, DB_PASS, DB_NAME, DB_PORT (optional)

const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASS || "",
  database: process.env.DB_NAME || "campus_lost_found",
  port: Number(process.env.DB_PORT || 3306),

  waitForConnections: true,
  connectionLimit: Number(process.env.DB_CONN_LIMIT || 10),
  queueLimit: 0,

  // Optional: if you want dates returned as strings
  // dateStrings: true,
});

/**
 * Run a SQL query with params (safe against SQL injection when using ? placeholders)
 * @param {string} sql
 * @param {any[]} params
 * @returns {Promise<any>}
 */
async function query(sql, params = []) {
  const [rows] = await pool.execute(sql, params);
  return rows;
}

/**
 * Run a transaction:
 * await transaction(async (conn) => { ... })
 * @param {(conn: import("mysql2/promise").PoolConnection) => Promise<any>} fn
 */
async function transaction(fn) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const result = await fn(conn);
    await conn.commit();
    return result;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

/**
 * Quick health check
 */
async function ping() {
  const rows = await query("SELECT 1 AS ok");
  return rows?.[0]?.ok === 1;
}

module.exports = {
  pool,
  query,
  transaction,
  ping,
};