// routes/items.js (CommonJS) - MySQL + session auth + photo upload (multer)
//
// Endpoints:
// GET    /api/items?category=Lost|Found&status=Active|Claimed|Resolved&q=...
// GET    /api/items/:id
// POST   /api/items              (login required) multipart/form-data (photo optional)
// PUT    /api/items/:id          (login + owner)  multipart/form-data (photo optional)
// PATCH  /api/items/:id/status   (login + owner)
// DELETE /api/items/:id          (login + owner)

const express = require("express");
const path = require("path");
const multer = require("multer");
const { query, transaction } = require("../db");
const requireLogin = require("../middleware/requireLogin");

const router = express.Router();

const CATEGORIES = new Set(["Lost", "Found"]);
const STATUSES = new Set(["Active", "Claimed", "Resolved"]);

function sanitizeText(v, maxLen) {
  const s = String(v ?? "").trim();
  if (maxLen && s.length > maxLen) return s.slice(0, maxLen);
  return s;
}

function isISODate(yyyy_mm_dd) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(yyyy_mm_dd || ""));
}

async function getItemById(id) {
  const rows = await query("SELECT * FROM items WHERE id = ? LIMIT 1", [id]);
  return rows[0] || null;
}

function toApiItem(row) {
  return {
    id: row.id,
    referenceCode: row.reference_code,
    category: row.category,
    status: row.status,
    title: row.title,
    description: row.description,
    location: row.location,
    date: row.date,
    contact: row.contact,
    imagePath: row.image_path || null, // ✅ NEW
    ownerUserId: row.owner_user_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ---------- multer (photo upload) ----------
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, "..", "uploads")),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || "").toLowerCase();
    const safe = [".jpg", ".jpeg", ".png", ".webp"].includes(ext) ? ext : ".jpg";
    cb(null, `${Date.now()}-${Math.random().toString(16).slice(2)}${safe}`);
  },
});

function fileFilter(req, file, cb) {
  const okTypes = ["image/jpeg", "image/png", "image/webp"];
  if (!okTypes.includes(file.mimetype)) {
    return cb(new Error("Only JPG, PNG, WEBP images are allowed."));
  }
  cb(null, true);
}

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 3 * 1024 * 1024 }, // 3MB
});

// ---------- reference code generator ----------
async function nextRefCode(category) {
  const key = category === "Lost" ? "lost" : "found";
  const prefix = category === "Lost" ? "L" : "F";

  return transaction(async (conn) => {
    const [rows] = await conn.execute(
      "SELECT seq FROM counters WHERE name = ? FOR UPDATE",
      [key]
    );

    const current = rows.length ? Number(rows[0].seq) : 0;
    const next = current + 1;

    await conn.execute("UPDATE counters SET seq = ? WHERE name = ?", [next, key]);

    return `${prefix}-${String(next).padStart(3, "0")}`;
  });
}

// ---------- owner guard ----------
async function requireOwner(req, res, next) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ ok: false, msg: "Invalid id." });
  }

  const item = await getItemById(id);
  if (!item) return res.status(404).json({ ok: false, msg: "Item not found." });

  if (item.owner_user_id !== req.user.id) {
    return res.status(403).json({ ok: false, msg: "Forbidden." });
  }

  req.item = item;
  next();
}

// ---------- GET list ----------
router.get("/", async (req, res) => {
  try {
    const category = req.query.category ? String(req.query.category) : "";
    const status = req.query.status ? String(req.query.status) : "";
    const q = req.query.q ? String(req.query.q).trim() : "";

    const where = [];
    const params = [];

    if (category) {
      if (!CATEGORIES.has(category)) return res.status(400).json({ ok: false, msg: "Invalid category." });
      where.push("category = ?");
      params.push(category);
    }

    if (status) {
      if (!STATUSES.has(status)) return res.status(400).json({ ok: false, msg: "Invalid status." });
      where.push("status = ?");
      params.push(status);
    }

    if (q) {
      where.push("(reference_code LIKE ? OR title LIKE ? OR description LIKE ? OR location LIKE ?)");
      const like = `%${q}%`;
      params.push(like, like, like, like);
    }

    const sql =
      "SELECT * FROM items" +
      (where.length ? ` WHERE ${where.join(" AND ")}` : "") +
      " ORDER BY created_at DESC";

    const rows = await query(sql, params);
    return res.json({ ok: true, items: rows.map(toApiItem) });
  } catch (err) {
    console.error("GET /items ERROR:", err);
    return res.status(500).json({ ok: false, msg: "Server error." });
  }
});

// ---------- GET single ----------
router.get("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ ok: false, msg: "Invalid id." });
    }

    const row = await getItemById(id);
    if (!row) return res.status(404).json({ ok: false, msg: "Item not found." });

    return res.json({ ok: true, item: toApiItem(row) });
  } catch (err) {
    console.error("GET /items/:id ERROR:", err);
    return res.status(500).json({ ok: false, msg: "Server error." });
  }
});

// ---------- POST create (photo optional) ----------
router.post("/", requireLogin, upload.single("photo"), async (req, res) => {
  try {
    const category = sanitizeText(req.body.category, 10);
    const status = sanitizeText(req.body.status || "Active", 10);
    const title = sanitizeText(req.body.title, 60);
    const description = sanitizeText(req.body.description, 500);
    const location = sanitizeText(req.body.location, 80);
    const date = sanitizeText(req.body.date, 10);
    const contact = sanitizeText(req.body.contact, 120);

    if (!CATEGORIES.has(category)) return res.status(400).json({ ok: false, msg: "Invalid category." });
    if (!STATUSES.has(status)) return res.status(400).json({ ok: false, msg: "Invalid status." });
    if (title.length < 3) return res.status(400).json({ ok: false, msg: "Title too short." });
    if (description.length < 10) return res.status(400).json({ ok: false, msg: "Description too short." });
    if (location.length < 3) return res.status(400).json({ ok: false, msg: "Location too short." });
    if (!isISODate(date)) return res.status(400).json({ ok: false, msg: "Date must be YYYY-MM-DD." });
    if (contact.length < 3) return res.status(400).json({ ok: false, msg: "Contact too short." });

    const referenceCode = await nextRefCode(category);
    const now = Date.now();

    const imagePath = req.file ? `/uploads/${req.file.filename}` : null;

    const result = await query(
      `INSERT INTO items
        (reference_code, category, status, title, description, location, date, contact, image_path, owner_user_id, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [referenceCode, category, status, title, description, location, date, contact, imagePath, req.user.id, now, now]
    );

    const created = await getItemById(result.insertId);
    return res.status(201).json({ ok: true, item: toApiItem(created) });
  } catch (err) {
    console.error("POST /items ERROR:", err);
    return res.status(500).json({ ok: false, msg: err.message || "Server error." });
  }
});

// ---------- PUT update (photo optional) ----------
router.put("/:id", requireLogin, requireOwner, upload.single("photo"), async (req, res) => {
  try {
    const id = Number(req.params.id);
    const existing = req.item;

    const status = sanitizeText(req.body.status || existing.status, 10);
    const title = sanitizeText(req.body.title, 60);
    const description = sanitizeText(req.body.description, 500);
    const location = sanitizeText(req.body.location, 80);
    const date = sanitizeText(req.body.date, 10);
    const contact = sanitizeText(req.body.contact, 120);

    if (!STATUSES.has(status)) return res.status(400).json({ ok: false, msg: "Invalid status." });
    if (title.length < 3) return res.status(400).json({ ok: false, msg: "Title too short." });
    if (description.length < 10) return res.status(400).json({ ok: false, msg: "Description too short." });
    if (location.length < 3) return res.status(400).json({ ok: false, msg: "Location too short." });
    if (!isISODate(date)) return res.status(400).json({ ok: false, msg: "Date must be YYYY-MM-DD." });
    if (contact.length < 3) return res.status(400).json({ ok: false, msg: "Contact too short." });

    const now = Date.now();
    const imagePath = req.file ? `/uploads/${req.file.filename}` : (existing.image_path || null);

    await query(
      `UPDATE items
       SET status = ?, title = ?, description = ?, location = ?, date = ?, contact = ?, image_path = ?, updated_at = ?
       WHERE id = ?`,
      [status, title, description, location, date, contact, imagePath, now, id]
    );

    const updated = await getItemById(id);
    return res.json({ ok: true, item: toApiItem(updated) });
  } catch (err) {
    console.error("PUT /items/:id ERROR:", err);
    return res.status(500).json({ ok: false, msg: err.message || "Server error." });
  }
});

// ---------- PATCH status ----------
router.patch("/:id/status", requireLogin, requireOwner, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const status = sanitizeText(req.body.status, 10);

    if (!STATUSES.has(status)) return res.status(400).json({ ok: false, msg: "Invalid status." });

    const now = Date.now();
    await query("UPDATE items SET status = ?, updated_at = ? WHERE id = ?", [status, now, id]);

    const updated = await getItemById(id);
    return res.json({ ok: true, item: toApiItem(updated) });
  } catch (err) {
    console.error("PATCH /items/:id/status ERROR:", err);
    return res.status(500).json({ ok: false, msg: "Server error." });
  }
});

// ---------- DELETE ----------
router.delete("/:id", requireLogin, requireOwner, async (req, res) => {
  try {
    const id = Number(req.params.id);
    await query("DELETE FROM items WHERE id = ?", [id]);
    return res.json({ ok: true });
  } catch (err) {
    console.error("DELETE /items/:id ERROR:", err);
    return res.status(500).json({ ok: false, msg: "Server error." });
  }
});

module.exports = router;