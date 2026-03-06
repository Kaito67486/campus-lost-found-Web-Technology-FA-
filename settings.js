// settings.js
// Handles profile update and password change

document.addEventListener("DOMContentLoaded", () => {

  const welcomeText = document.getElementById("welcomeText");
  const btnLogout = document.getElementById("btnLogout");
  const toast = document.getElementById("toast");

  const profileForm = document.getElementById("profileForm");
  const nameEl = document.getElementById("name");
  const emailEl = document.getElementById("email");

  const passwordForm = document.getElementById("passwordForm");
  const currentPasswordEl = document.getElementById("currentPassword");
  const newPasswordEl = document.getElementById("newPassword");
  const confirmPasswordEl = document.getElementById("confirmPassword");


  highlightSidebar();
  loadCurrentUser();


  /* ======================
     LOGOUT
  ====================== */

  btnLogout?.addEventListener("click", async () => {

    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include"
      });
    } catch (e) {}

    window.location.href = "login.html";
  });


  /* ======================
     UPDATE PROFILE
  ====================== */

  profileForm?.addEventListener("submit", async (e) => {

    e.preventDefault();

    const name = nameEl.value.trim();
    const email = emailEl.value.trim();


    if (!name) {
      showToast("Please enter your name.", "error");
      return;
    }

    if (!email) {
      showToast("Please enter your email.", "error");
      return;
    }

    if (!isValidEmail(email)) {
      showToast("Only @qiu.edu.my email addresses are allowed.", "error");
      return;
    }


    setFormBusy(profileForm, true);

    try {

      const res = await fetch("/api/auth/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json"
        },
        credentials: "include",
        body: JSON.stringify({
          name,
          email
        })
      });

      const data = await safeJson(res);

      if (!res.ok || data?.ok === false) {
        throw new Error(data?.msg || "Profile update failed");
      }

      showToast("Profile updated successfully.", "success");

      if (welcomeText) {
        welcomeText.textContent = `Welcome, ${name} 👋`;
      }

    } catch (err) {

      console.error(err);
      showToast(err.message || "Could not update profile.", "error");

    } finally {

      setFormBusy(profileForm, false);

    }

  });


  /* ======================
     CHANGE PASSWORD
  ====================== */

  passwordForm?.addEventListener("submit", async (e) => {

    e.preventDefault();

    const currentPassword = currentPasswordEl.value;
    const newPassword = newPasswordEl.value;
    const confirmPassword = confirmPasswordEl.value;


    if (!currentPassword) {
      showToast("Please enter your current password.", "error");
      return;
    }

    if (newPassword.length < 6) {
      showToast("Password must be at least 6 characters.", "error");
      return;
    }

    if (newPassword !== confirmPassword) {
      showToast("Passwords do not match.", "error");
      return;
    }


    setFormBusy(passwordForm, true);

    try {

      const res = await fetch("/api/auth/change-password", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json"
        },
        credentials: "include",
        body: JSON.stringify({
          currentPassword,
          newPassword
        })
      });

      const data = await safeJson(res);

      if (!res.ok || data?.ok === false) {
        throw new Error(data?.msg || "Password update failed");
      }

      showToast("Password updated successfully.", "success");

      passwordForm.reset();

    } catch (err) {

      console.error(err);
      showToast(err.message || "Could not update password.", "error");

    } finally {

      setFormBusy(passwordForm, false);

    }

  });


  /* ======================
     LOAD CURRENT USER
  ====================== */

  async function loadCurrentUser() {

    try {

      const res = await fetch("/api/auth/me", {
        credentials: "include"
      });

      if (res.status === 401) {
        window.location.href = "login.html";
        return;
      }

      const data = await safeJson(res);

      if (!data?.user) return;

      const user = data.user;

      nameEl.value = user.name || "";
      emailEl.value = user.email || "";

      if (welcomeText) {
        welcomeText.textContent = user.name
          ? `Welcome, ${user.name} 👋`
          : "Welcome 👋";
      }

    } catch (err) {

      console.error("Load user error:", err);

    }

  }


  /* ======================
     UTILITIES
  ====================== */

  function isValidEmail(email) {
    return /^[a-zA-Z0-9._%+-]+@qiu\.edu\.my$/.test(email);
  }


  function showToast(message, type = "success") {

    if (!toast) return;

    toast.style.display = "block";
    toast.className = `toast ${type}`;
    toast.textContent = message;

    setTimeout(() => {
      toast.style.display = "none";
    }, 3000);
  }


  function setFormBusy(form, busy) {

    const controls = form.querySelectorAll("input, button");

    controls.forEach(el => {
      el.disabled = busy;
    });

  }


  function highlightSidebar() {

    const current = location.pathname.split("/").pop();

    document.querySelectorAll(".side-link").forEach(link => {

      if (link.getAttribute("href") === current) {
        link.classList.add("active");
      }

    });

  }


  async function safeJson(res) {

    try {
      return await res.json();
    } catch {
      return null;
    }

  }

});