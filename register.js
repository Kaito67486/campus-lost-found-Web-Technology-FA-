// register.js - Register new user (MySQL + session auth with name)

document.addEventListener("DOMContentLoaded", () => {

  // Prevent file:// usage
  if (location.protocol === "file:") {
    const page = location.pathname.split("/").pop();
    location.replace(`http://localhost:3000/${page}${location.search || ""}`);
    return;
  }

  const form = document.getElementById("registerForm");
  if (!form) return;

  // Footer year
  const yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  const nameEl = document.getElementById("name");
  const emailEl = document.getElementById("email");
  const passEl = document.getElementById("password");
  const confirmEl = document.getElementById("confirmPassword");
  const agreeEl = document.getElementById("agree");
  const btn = document.getElementById("btnRegister");

  // Redirect if already logged in
  redirectIfLoggedIn();

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const name = (nameEl?.value || "").trim();
    const email = (emailEl?.value || "").trim().toLowerCase();
    const password = passEl?.value || "";
    const confirmPassword = confirmEl?.value || "";
    const agree = !!agreeEl?.checked;

    const error = validate(name, email, password, confirmPassword, agree);
    if (error) return toast(error, "error");

    btn.disabled = true;
    btn.textContent = "Creating...";

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name, email, password }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.ok) {
        throw new Error(data.msg || "Registration failed.");
      }

      toast("Account created! Redirecting...", "success");

      setTimeout(() => {
        window.location.href = "home.html";
      }, 500);

    } catch (err) {
      toast(err.message || "Registration failed.", "error");
      console.error("REGISTER ERROR:", err);
    } finally {
      btn.disabled = false;
      btn.textContent = "Register";
    }
  });

  // ===============================
  // Validation
  // ===============================

  function validate(name, email, password, confirmPassword, agree) {
    if (!name) return "Please enter your full name.";
    if (name.length < 2) return "Name must be at least 2 characters.";
    if (!email) return "Please enter your email.";
    if (!/^[^\s@]+@qiu\.edu\.my$/.test(email))
      return "Please use your QIU email (example: ong@qiu.edu.my).";
    if (!password) return "Please enter a password.";
    if (password.length < 6)
      return "Password must be at least 6 characters.";
    if (password !== confirmPassword)
      return "Passwords do not match.";
    if (!agree)
      return "Please tick the agreement checkbox.";
    return null;
  }

  // ===============================
  // Redirect if logged in
  // ===============================

  async function redirectIfLoggedIn() {
    try {
      const res = await fetch("/api/auth/me", { credentials: "include" });

      if (res.status === 401) return; // normal if not logged in

      const data = await res.json().catch(() => ({}));

      if (res.ok && data.ok && data.user) {
        window.location.href = "home.html";
      }
    } catch (_) {}
  }

  // ===============================
  // Toast
  // ===============================

  function toast(message, type) {
    const el = document.getElementById("toast");

    if (!el) {
      alert(message);
      return;
    }

    el.textContent = message;
    el.style.display = "block";
    el.className = `toast ${type || ""}`;

    setTimeout(() => {
      el.style.display = "none";
    }, 2800);
  }

});