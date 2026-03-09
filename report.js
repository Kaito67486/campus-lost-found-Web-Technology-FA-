// report.js - Create/Edit item report (MySQL-only, session auth) + photo upload

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("reportForm");
  if (!form) return;

  // Footer year
  const yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // Logout button
  const logoutBtn = document.getElementById("btnLogout");
  if (logoutBtn) logoutBtn.addEventListener("click", logout);

  // Must be logged in to use this page
  requireLogin().then(() => initForm());

  function initForm() {
    const qs = new URLSearchParams(window.location.search);
    const editId = qs.get("id"); // report.html?id=123

    // Elements
    const titleEl = document.getElementById("title");
    const descEl = document.getElementById("description");
    const categoryEl = document.getElementById("category");
    const locationEl = document.getElementById("location");
    const dateEl = document.getElementById("date");
    const contactEl = document.getElementById("contact");
    const statusEl = document.getElementById("status");
    const confirmEl = document.getElementById("confirm");

    const photoEl = document.getElementById("photo"); // file input
    const previewEl = document.getElementById("photoPreview"); //  optional img preview

    const formTitle = document.getElementById("formTitle");
    const modeHint = document.getElementById("modeHint");
    const btnSubmit = document.getElementById("btnSubmit");

    // Prevent future date
    const today = new Date().toISOString().slice(0, 10);
    if (dateEl) dateEl.max = today;

    // Photo preview (create + edit mode)
    const placeholderEl = document.getElementById("imagePlaceholder");

    if (photoEl && previewEl) {
      photoEl.addEventListener("change", () => {
        const file = photoEl.files?.[0];

        if (!file) {
          previewEl.src = "";
          previewEl.style.display = "none";
          if (placeholderEl) placeholderEl.style.display = "block";
          return;
        }

        if (!file.type.startsWith("image/")) {
          toast("Please choose a valid image file.", "error");
          photoEl.value = "";
          previewEl.src = "";
          previewEl.style.display = "none";
          if (placeholderEl) placeholderEl.style.display = "block";
          return;
        }

        previewEl.src = URL.createObjectURL(file);
        previewEl.style.display = "block";
        if (placeholderEl) placeholderEl.style.display = "none";
      });
    }
    // Mode UI
    if (editId) {
      formTitle.textContent = "Edit Report";
      modeHint.textContent = "Edit mode";
      btnSubmit.textContent = "Save Changes";
      loadExisting(editId);
    } else {
      formTitle.textContent = "Submit New Report";
      modeHint.textContent = "Create mode";
      btnSubmit.textContent = "Submit";
    }

    // Submit handler
    form.addEventListener("submit", async (e) => {
      e.preventDefault();

      // Build "payload" only for validation
      const payload = {
        category: categoryEl.value,
        status: statusEl.value,
        title: titleEl.value.trim(),
        description: descEl.value.trim(),
        location: locationEl.value.trim(),
        date: dateEl.value,
        contact: contactEl.value.trim(),
      };

      const error = validatePayload(payload, confirmEl.checked, photoEl);
      if (error) return toast(error, "error");

      btnSubmit.disabled = true;
      btnSubmit.textContent = editId ? "Saving..." : "Submitting...";

      try {
        const url = editId ? `/api/items/${encodeURIComponent(editId)}` : `/api/items`;
        const method = editId ? "PUT" : "POST";

        // Use FormData so file can be uploaded
        const fd = new FormData();
        fd.append("category", payload.category);
        fd.append("status", payload.status);
        fd.append("title", payload.title);
        fd.append("description", payload.description);
        fd.append("location", payload.location);
        fd.append("date", payload.date);
        fd.append("contact", payload.contact);

        // attach photo if selected
        if (photoEl && photoEl.files && photoEl.files[0]) {
          fd.append("photo", photoEl.files[0]); // must match upload.single("photo")
        }

        const res = await fetch(url, {
          method,
          credentials: "include",
          body: fd,
        });

        const data = await res.json().catch(() => ({}));

        if (!res.ok || !data.ok) {
          const msg = data?.msg || data?.errors?.[0]?.msg || "Request failed.";
          throw new Error(msg);
        }

        toast(editId ? "Updated successfully!" : "Submitted successfully!", "success");

        const newId = editId || data.item?.id;
        setTimeout(() => {
          window.location.href = `details.html?id=${encodeURIComponent(newId)}`;
        }, 2000);

      } catch (err) {
        toast(err.message || "Something went wrong.", "error");
        console.error("REPORT SUBMIT ERROR:", err);
      } finally {
        btnSubmit.disabled = false;
        btnSubmit.textContent = editId ? "Save Changes" : "Submit";
      }
    });

    async function loadExisting(id) {
      try {
        const [itemRes, meRes] = await Promise.all([
          fetch(`/api/items/${encodeURIComponent(id)}`, { credentials: "include" }),
          fetch("/api/auth/me", { credentials: "include" })
        ]);

        const itemData = await itemRes.json().catch(() => ({}));
        const meData = await meRes.json().catch(() => ({}));

        if (!itemRes.ok || !itemData.ok || !itemData.item) {
          throw new Error("Item not found");
        }

        if (!meRes.ok || !meData.ok || !meData.user) {
          throw new Error("Not logged in");
        }

        const item = itemData.item;
        const currentUserId = Number(meData.user.id);
        const ownerId = Number(item.ownerUserId || item.owner_user_id);

        if (currentUserId !== ownerId) {
          toast("You are not allowed to edit this report.", "error");
          setTimeout(() => {
            window.location.href = `details.html?id=${encodeURIComponent(id)}`;
          }, 1200);
          return;
        }

        titleEl.value = item.title || "";
        descEl.value = item.description || "";
        categoryEl.value = item.category || "";
        locationEl.value = item.location || "";
        dateEl.value = (item.date || "").slice(0, 10);
        contactEl.value = item.contact || "";
        statusEl.value = item.status || "Active";

        categoryEl.disabled = true;

        if (previewEl && item.imagePath) {
          previewEl.src = item.imagePath;
          previewEl.style.display = "block";

          const placeholderEl = document.getElementById("imagePlaceholder");
          if (placeholderEl) placeholderEl.style.display = "none";
        }
      } catch (err) {
        toast("Failed to load item for editing.", "error");
        console.error("LOAD EXISTING ERROR:", err);
      }
    }
  }

  function validatePayload(p, confirmed, photoEl) {
    if (!confirmed) return "Please confirm the information is accurate.";
    if (!["Lost", "Found"].includes(p.category)) return "Please select Lost or Found.";
    if (!["Active", "Claimed", "Resolved"].includes(p.status)) return "Invalid status.";

    if (p.title.length < 3 || p.title.length > 60) return "Title must be 3–60 characters.";
    if (p.description.length < 10 || p.description.length > 500) return "Description must be 10–500 characters.";
    if (p.location.length < 3 || p.location.length > 80) return "Location must be 3–80 characters.";
    if (!p.date) return "Please select a date.";

    const today = new Date().toISOString().slice(0, 10);
    if (p.date > today) return "Date cannot be in the future.";

    if (p.contact.length < 3 || p.contact.length > 120) return "Contact must be 3–120 characters.";

    // Optional client-side file checks
    if (photoEl && photoEl.files && photoEl.files[0]) {
      const f = photoEl.files[0];
      const okTypes = ["image/jpeg", "image/png", "image/webp"];
      if (!okTypes.includes(f.type)) return "Photo must be JPG, PNG, or WEBP.";
      const max = 3 * 1024 * 1024;
      if (f.size > max) return "Photo must be 3MB or less.";
    }

    return null;
  }

  async function requireLogin() {
    try {
      const res = await fetch("/api/auth/me", { credentials: "include" });
      if (res.status === 401) throw new Error();
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok || !data.user) throw new Error();
    } catch (_) {
      window.location.href = "login.html";
    }
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    window.location.href = "index.html";
  }

  function toast(message, type) {
    const el = document.getElementById("toast");
    if (!el) return;
    el.textContent = message;
    el.style.display = "block";
    el.className = `toast ${type || ""}`;
    setTimeout(() => {
      el.style.display = "none";
    }, 2800);
  }
});