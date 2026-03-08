const express = require("express");
const session = require("express-session");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config();

const authRoutes = require("./routes/auth");
const itemRoutes = require("./routes/items");

const app = express();

// =========================
// MIDDLEWARE
// =========================

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.set("trust proxy", 1);

app.use(
  session({
    name: "lf_session",
    secret: process.env.SESSION_SECRET || "supersecretkey",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "none",
      secure: true
    }
  })
);

// =========================
// STATIC FILES
// =========================

app.use(express.static(path.join(__dirname)));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// =========================
// ROUTES
// =========================

app.use("/api/auth", authRoutes);
app.use("/api/items", itemRoutes);
app.use("/api/contact", contactRoutes);

// =========================
// HEALTH CHECK
// =========================

app.get("/api/ping", (req, res) => {
  res.json({ ok: true, message: "Server running" });
});

// =========================
// 404
// =========================

app.use((req, res) => {
  res.status(404).json({ ok: false, msg: "Route not found" });
});

// =========================
// ERROR HANDLER
// =========================

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ ok: false, msg: "Server error" });
});

// =========================
// START SERVER
// =========================

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});