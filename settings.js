// settings.js - Profile + Password + Logout (safe even if backend endpoints are missing)

document.addEventListener("DOMContentLoaded", () => {
  const welcomeText = document.getElementById("welcomeText");
  const btnLogout = document.getElementById("btnLogout");
  const btnLogout2 = document.getElementById("btnLogout2");

  const toast = document.getElementById("toast");

  const profileForm = document.getElementById("profileForm");
  const nameEl = document.getElementById("name");
  const emailEl = document.getElementById("email");

  const passwordForm = document.getElementById("passwordForm");
  const currentPasswordEl = document.getElementById("currentPassword");
  const newPasswordEl = document.getElementById("newPassword");
  const confirmPasswordEl = document.getElementById("confirmPassword");

  highlightSidebar();
  ensureLoggedInAndLoadProfile();

  btnLogout?.addEventListener("click", logout);
  btnLogout2?.addEventListener("click", logout);

  profileForm?.addEventListener("submit", async (e) => {
    e.preventDefault();

    const payload = {
      name: (nameEl?.value || "").trim(),
      email: (emailEl?.value || "").trim(),
    };

    if (!payload.name) return showToast("Please enter your name.", "error");
    if (!payload.email) return showToast("Please enter your email.", "error");

    // Try common endpoints (won't break if not implemented)
    const attempts = [
      { url: "/api/auth/profile", method: "PUT" },
      { url: "/api/auth/profile", method: "POST" },
      { url: "/api/auth/update-profile", method: "PUT" },
      { url: "/api/auth/update-profile", method: "POST" },
    ];

    const ok = await tryAny(attempts, payload);

    if (ok) {
      showToast("Profile saved.", "success");
      // refresh welcome text
      ensureLoggedInAndLoadProfile(true);
    } else {
      showToast("Profile update endpoint not available on server yet.", "error");
    }
  });

  passwordForm?.addEventListener("submit", async (e) => {
    e.preventDefault();

    const currentPassword = currentPasswordEl?.value || "";
    const newPassword = newPasswordEl?.value || "";
    const confirmPassword = confirmPasswordEl?.value || "";

    if (!currentPassword) return showToast("Enter current password.", "error");
    if (newPassword.length < 6) return showToast("New password must be at least 6 characters.", "error");
    if (newPassword !== confirmPassword) return showToast("Passwords do not match.", "error");

    const payload = { currentPassword, newPassword };

    const attempts = [
      { url: "/api/auth/password", method: "PUT" },
      { url: "/api/auth/change-password", method: "PUT" },
      { url: "/api/auth/change-password", method: "POST" },
    ];

    const ok = await tryAny(attempts, payload);

    if (ok) {
      showToast("Password updated.", "success");
      passwordForm.reset();
    } else {
      showToast("Password update endpoint not available on server yet.", "error");
    }
  });

  async function ensureLoggedInAndLoadProfile(silent = false) {
    try {
      const res = await fetch("/api/auth/me", { credentials: "include" });
      if (res.status === 401) {
        window.location.href = "login.html";
        return;
      }

      const data = await res.json();

      if (data?.ok && data?.user) {
        const name = data.user.name || "";
        const email = data.user.email || "";

        if (welcomeText) {
          welcomeText.textContent = name ? `Welcome, ${name} 👋` : "Welcome 👋";
        }

        if (nameEl) nameEl.value = name;
        if (emailEl) emailEl.value = email;

        if (!silent) showToast("Loaded your account info.", "success");
      }
    } catch (err) {
      console.error("AUTH ME ERROR:", err);
      if (!silent) showToast("Could not load user info (server error).", "error");
    }
  }

  async function logout() {
    try {
      await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    } catch (_) {
      // ignore
    }
    window.location.href = "login.html";
  }

  function highlightSidebar() {
    const current = location.pathname.split("/").pop().split("?")[0];
    document.querySelectorAll(".side-nav .side-link").forEach((a) => {
      a.classList.toggle("active", a.getAttribute("href") === current);
    });
  }

  function showToast(message, type) {
    if (!toast) return;
    toast.style.display = "block";
    toast.className = `toast ${type === "success" ? "success" : "error"}`;
    toast.textContent = message;

    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => {
      toast.style.display = "none";
    }, 3000);
  }

  async function tryAny(attempts, payload) {
    for (const a of attempts) {
      try {
        const res = await fetch(a.url, {
          method: a.method,
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(payload),
        });

        // If endpoint exists and returns ok, accept it
        const ct = res.headers.get("content-type") || "";
        const data = ct.includes("application/json") ? await res.json().catch(() => null) : null;

        if (res.ok && (data?.ok === undefined || data?.ok === true)) return true;

        // If 404, try next endpoint
        if (res.status === 404) continue;

        // If endpoint exists but returns error, stop early
        return false;
      } catch (err) {
        // network error -> try next
        continue;
      }
    }
    return false;
  }
});