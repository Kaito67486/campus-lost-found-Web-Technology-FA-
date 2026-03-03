// routes/auth.js (CommonJS)
// Endpoints:
// POST /api/auth/register
// POST /api/auth/login
// POST /api/auth/logout
// GET  /api/auth/me

const express = require("express");
const bcrypt = require("bcrypt");
const { query } = require("../db");

const router = express.Router();

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || "").trim());
}

// Register
router.post("/register", async (req, res) => {
  try {
    const name = String(req.body.name || "").trim();
    const email = String(req.body.email || "").trim().toLowerCase();
    const password = String(req.body.password || "");

    if (!name) {
      return res.status(400).json({ ok: false, msg: "Name is required." });
    }

    if (!email || !password) {
      return res.status(400).json({ ok: false, msg: "Email and password are required." });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ ok: false, msg: "Invalid email format." });
    }

    if (password.length < 6) {
      return res.status(400).json({ ok: false, msg: "Password must be at least 6 characters." });
    }

    const existing = await query(
      "SELECT id FROM users WHERE email = ? LIMIT 1",
      [email]
    );

    if (existing.length) {
      return res.status(409).json({ ok: false, msg: "Email already registered." });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const now = Date.now();

    const result = await query(
      "INSERT INTO users (name, email, password_hash, created_at) VALUES (?, ?, ?, ?)",
      [name, email, passwordHash, now]
    );

    const user = { id: result.insertId, name, email };
    req.session.user = user;

    return res.json({ ok: true, user });

  } catch (err) {
    console.error("REGISTER ERROR:", err);
    return res.status(500).json({ ok: false, msg: "Server error." });
  }
});

// Login
router.post("/login", async (req, res) => {
  try {
    const email = String(req.body.email || "").trim().toLowerCase();
    const password = String(req.body.password || "");

    if (!email || !password) {
      return res.status(400).json({ ok: false, msg: "Email and password are required." });
    }

    const rows = await query(
      "SELECT id, name, email, password_hash FROM users WHERE email = ? LIMIT 1",
      [email]
    );

    if (!rows.length) {
      return res.status(401).json({ ok: false, msg: "Invalid email or password." });
    }

    const userRow = rows[0];
    const match = await bcrypt.compare(password, userRow.password_hash);

    if (!match) {
      return res.status(401).json({ ok: false, msg: "Invalid email or password." });
    }

    const user = { id: userRow.id, name: userRow.name, email: userRow.email };
    req.session.user = user;

    return res.json({ ok: true, user });
  } catch (err) {
    console.error("LOGIN ERROR:", err);
    return res.status(500).json({ ok: false, msg: "Server error." });
  }
});

// Logout
router.post("/logout", (req, res) => {
  req.session.destroy(() => {
    res.clearCookie("lf_session");
    return res.json({ ok: true });
  });
});

// Who am I
router.get("/me", (req, res) => {
  const user = req.session?.user || null;
  if (!user) return res.status(401).json({ ok: false, msg: "Not logged in." });
  return res.json({ ok: true, user });
});

module.exports = router;