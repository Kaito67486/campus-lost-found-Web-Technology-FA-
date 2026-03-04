const mysql = require("mysql2/promise");
require("dotenv").config();

const useSSL =
  String(process.env.DB_SSL || "").toLowerCase() === "1" ||
  String(process.env.DB_SSL || "").toLowerCase() === "true" ||
  !!process.env.DB_CA_PEM;

const sslConfig = useSSL
  ? {
      ca: process.env.DB_CA_PEM ? process.env.DB_CA_PEM : undefined,
      rejectUnauthorized: process.env.DB_CA_PEM ? true : false,
    }
  : undefined;

const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASS || "",
  database: process.env.DB_NAME || "campus_lost_found",
  port: Number(process.env.DB_PORT || 3306),
  ...(sslConfig ? { ssl: sslConfig } : {}),
  waitForConnections: true,
  connectionLimit: Number(process.env.DB_CONN_LIMIT || 10),
  queueLimit: 0,
});

async function query(sql, params = []) {
  const [rows] = await pool.execute(sql, params);
  return rows;
}

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

async function ping() {
  const rows = await query("SELECT 1 AS ok");
  return rows?.[0]?.ok === 1;
}

module.exports = { pool, query, transaction, ping };