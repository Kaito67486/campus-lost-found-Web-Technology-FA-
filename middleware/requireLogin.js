// middleware/requireLogin.js
// Server-side middleware (Express) - session-based auth guard

module.exports = function requireLogin(req, res, next) {
  if (!req.session || !req.session.user) {
    return res.status(401).json({ ok: false, msg: "Login required." });
  }

  req.user = req.session.user;
  next();
};