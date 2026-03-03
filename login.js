// ===== LOGIN PAGE =====

document.addEventListener("DOMContentLoaded", () => {

  const form = document.getElementById("loginForm");
  const emailEl = document.getElementById("email");
  const passEl = document.getElementById("password");
  const btn = document.getElementById("btnLogin");
  const toastEl = document.getElementById("toast");

  // Auto redirect if already logged in
  checkLoggedIn();

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = emailEl.value.trim();
    const password = passEl.value;

    if (!email || !password) {
      return showToast("Please enter email and password.", "error");
    }

    btn.disabled = true;
    btn.textContent = "Logging in...";

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        credentials: "include",
        body: JSON.stringify({ email, password })
      });

      const data = await res.json();

      if (!res.ok || !data.ok) {
        throw new Error(data.msg || "Invalid credentials.");
      }

      showToast("Login successful!", "success");

      setTimeout(() => {
        window.location.href = "home.html";
      }, 500);

    } catch (err) {
      showToast(err.message || "Login failed.", "error");
    } finally {
      btn.disabled = false;
      btn.textContent = "Login";
    }
  });

  async function checkLoggedIn() {
    try {
      const res = await fetch("/api/auth/me", {
        credentials: "include"
      });

      const data = await res.json();

      if (res.ok && data.ok && data.user) {
        window.location.href = "home.html";
      }
    } catch (err) {
      // Not logged in
    }
  }

  function showToast(message, type) {
    toastEl.textContent = message;
    toastEl.style.display = "block";
    toastEl.className = `toast ${type}`;

    setTimeout(() => {
      toastEl.style.display = "none";
    }, 2500);
  }

});