// routes/contact.js (CommonJS)
// POST /api/contact
// Stores message in contact_messages table (optional)

const express = require("express");
const { query } = require("../db");

const router = express.Router();

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || "").trim());
}

router.post("/", async (req, res) => {
  try {
    const name = String(req.body.name || "").trim();
    const email = String(req.body.email || "").trim().toLowerCase();
    const message = String(req.body.message || "").trim();

    if (name.length < 2) return res.status(400).json({ ok: false, msg: "Name is too short." });
    if (!isValidEmail(email)) return res.status(400).json({ ok: false, msg: "Invalid email." });
    if (message.length < 5) return res.status(400).json({ ok: false, msg: "Message is too short." });

    const now = Date.now();

    await query(
      "INSERT INTO contact_messages (name, email, message, created_at) VALUES (?, ?, ?, ?)",
      [name, email, message, now]
    );

    return res.json({ ok: true, msg: "Message received." });
  } catch (err) {
    console.error("POST /contact ERROR:", err);
    return res.status(500).json({ ok: false, msg: "Server error." });
  }
});

module.exports = router;