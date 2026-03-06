// routes/auth.js (CommonJS)
// Endpoints:
// POST /api/auth/register
// POST /api/auth/login
// POST /api/auth/logout
// GET  /api/auth/me

// routes/auth.js (CommonJS)

const express = require("express");
const bcrypt = require("bcrypt");
const { query } = require("../db");

const router = express.Router();

/* =========================
   HELPERS
========================= */

function isValidEmail(email) {
  return /^[a-zA-Z0-9._%+-]+@qiu\.edu\.my$/.test(String(email || "").trim());
}

/* =========================
   REGISTER
========================= */

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

    if (!isValidEmail(email)) {
      return res.status(400).json({ ok: false, msg: "Only @qiu.edu.my email allowed." });
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

/* =========================
   LOGIN
========================= */

router.post("/login", async (req, res) => {
  try {
    const email = String(req.body.email || "").trim().toLowerCase();
    const password = String(req.body.password || "");

    if (!email || !password) {
      return res.status(400).json({ ok: false, msg: "Email and password required." });
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

/* =========================
   LOGOUT
========================= */

router.post("/logout", (req, res) => {
  req.session.destroy(() => {
    res.clearCookie("lf_session");
    return res.json({ ok: true });
  });
});

/* =========================
   GET CURRENT USER
========================= */

router.get("/me", (req, res) => {
  const user = req.session?.user || null;

  if (!user) {
    return res.status(401).json({ ok: false, msg: "Not logged in." });
  }

  return res.json({ ok: true, user });
});

/* =========================
   UPDATE PROFILE
========================= */

router.put("/profile", async (req, res) => {
  try {
    if (!req.session?.user) {
      return res.status(401).json({ ok: false, msg: "Not logged in." });
    }

    const userId = req.session.user.id;
    const name = String(req.body.name || "").trim();
    const email = String(req.body.email || "").trim().toLowerCase();

    if (!name) {
      return res.status(400).json({ ok: false, msg: "Name is required." });
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({ ok: false, msg: "Only @qiu.edu.my email allowed." });
    }

    const existing = await query(
      "SELECT id FROM users WHERE email = ? AND id <> ? LIMIT 1",
      [email, userId]
    );

    if (existing.length) {
      return res.status(409).json({ ok: false, msg: "Email already in use." });
    }

    await query(
      "UPDATE users SET name = ?, email = ? WHERE id = ?",
      [name, email, userId]
    );

    req.session.user.name = name;
    req.session.user.email = email;

    return res.json({
      ok: true,
      user: { id: userId, name, email }
    });

  } catch (err) {
    console.error("UPDATE PROFILE ERROR:", err);
    return res.status(500).json({ ok: false, msg: "Server error." });
  }
});

/* =========================
   CHANGE PASSWORD
========================= */

router.put("/change-password", async (req, res) => {
  try {
    if (!req.session?.user) {
      return res.status(401).json({ ok: false, msg: "Not logged in." });
    }

    const userId = req.session.user.id;
    const currentPassword = String(req.body.currentPassword || "");
    const newPassword = String(req.body.newPassword || "");

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ ok: false, msg: "Password required." });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ ok: false, msg: "New password must be at least 6 characters." });
    }

    const rows = await query(
      "SELECT password_hash FROM users WHERE id = ? LIMIT 1",
      [userId]
    );

    if (!rows.length) {
      return res.status(404).json({ ok: false, msg: "User not found." });
    }

    const match = await bcrypt.compare(currentPassword, rows[0].password_hash);

    if (!match) {
      return res.status(400).json({ ok: false, msg: "Current password incorrect." });
    }

    const newHash = await bcrypt.hash(newPassword, 10);

    await query(
      "UPDATE users SET password_hash = ? WHERE id = ?",
      [newHash, userId]
    );

    return res.json({ ok: true, msg: "Password updated." });

  } catch (err) {
    console.error("CHANGE PASSWORD ERROR:", err);
    return res.status(500).json({ ok: false, msg: "Server error." });
  }
});

module.exports = router;