// details.js - polished details page + owner actions + image status badge

document.addEventListener("DOMContentLoaded", () => {
  // page transition
  document.body.classList.add("page-ready");

  // footer year
  const yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // sidebar highlight
  highlightSidebar();

  // logout
  const logoutBtn = document.getElementById("btnLogout");
  if (logoutBtn) logoutBtn.addEventListener("click", logout);

  // load item by id
  const qs = new URLSearchParams(window.location.search);
  const id = qs.get("id");
  if (!id) {
    showError();
    return;
  }

  ensureLoggedIn();
  loadItem(id);
});

async function ensureLoggedIn() {
  const welcomeText = document.getElementById("welcomeText");

  try {
    const res = await fetch("/api/auth/me", { credentials: "include" });
    if (res.status === 401) return;

    const data = await res.json().catch(() => ({}));
    if (data?.ok && data?.user?.name && welcomeText) {
      welcomeText.textContent = `Welcome, ${data.user.name} 👋`;
    }
  } catch {
    // ignore
  }
}

async function loadItem(id) {
  try {
    const res = await fetch(`/api/items/${encodeURIComponent(id)}`, {
      credentials: "include",
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok || !data.ok || !data.item) {
      throw new Error(data.msg || "Item not found");
    }

    const item = data.item;
    renderItem(item);
    checkOwnership(item);
  } catch (err) {
    console.error("LOAD ITEM ERROR:", err);
    showError();
  }
}

function renderItem(item) {
  const loading = document.getElementById("loading");
  const detailContent = document.getElementById("detailContent");
  const errorState = document.getElementById("errorState");

  if (loading) loading.style.display = "none";
  if (errorState) errorState.style.display = "none";
  if (detailContent) detailContent.style.display = "block";

  // main fields
  const ref = document.getElementById("refCode");
  const statusTop = document.getElementById("itemStatus");
  const photoStatus = document.querySelector(".details-photo-status");
  const title = document.getElementById("itemTitle");
  const metaTop = document.getElementById("itemMetaTop");
  const desc = document.getElementById("itemDescription");
  const contact = document.getElementById("itemContact");
  const categoryEl = document.getElementById("itemCategory");
  const locationEl = document.getElementById("itemLocation");
  const dateEl = document.getElementById("itemDate");

  const titleText = item.title || "Untitled";
  const categoryText = item.category || "-";
  const locationText = item.location || "-";
  const dateText = (item.date || "").slice(0, 10) || "-";
  const contactText = item.contact || "-";
  const descriptionText = item.description || "-";
  const referenceText = item.referenceCode || "";
  const statusText = item.status || "Active";

  if (ref) {
    ref.textContent = referenceText;
    ref.className = `badge ${String(categoryText).toLowerCase() === "found" ? "found" : "lost"}`;
  }

  if (title) title.textContent = titleText;
  if (desc) desc.textContent = descriptionText;
  if (contact) contact.textContent = contactText;
  if (categoryEl) categoryEl.textContent = categoryText;
  if (locationEl) locationEl.textContent = locationText;
  if (dateEl) dateEl.textContent = dateText;

  // top-right meta text
  const meta = [categoryText, locationText, dateText].filter(Boolean).join(" • ");
  if (metaTop) metaTop.textContent = meta;

  // right-panel status
  if (statusTop) statusTop.textContent = statusText;

  // image corner badge
if (photoStatus) {
  const s = String(statusText).toLowerCase();
  const c = String(categoryText).toLowerCase();

  photoStatus.textContent = `${categoryText} • ${statusText}`;

  // default
  photoStatus.style.background = "#eef2ff";
  photoStatus.style.color = "#1d4ed8";
  photoStatus.style.borderColor = "#dbe7ff";
  photoStatus.style.boxShadow = "0 8px 18px rgba(37,99,235,.12)";

  // category color base
  if (c === "lost") {
    photoStatus.style.background = "#fef2f2";
    photoStatus.style.color = "#b91c1c";
    photoStatus.style.borderColor = "#fecaca";
    photoStatus.style.boxShadow = "0 8px 18px rgba(185,28,28,.12)";
  } else if (c === "found") {
    photoStatus.style.background = "#ecfdf3";
    photoStatus.style.color = "#15803d";
    photoStatus.style.borderColor = "#bbf7d0";
    photoStatus.style.boxShadow = "0 8px 18px rgba(21,128,61,.12)";
  }

  // status override / refine
  if (s === "claimed") {
    photoStatus.style.background = "#fff7ed";
    photoStatus.style.color = "#c2410c";
    photoStatus.style.borderColor = "#fed7aa";
    photoStatus.style.boxShadow = "0 8px 18px rgba(194,65,12,.12)";
  } else if (s === "resolved") {
    photoStatus.style.background = "#f3f4f6";
    photoStatus.style.color = "#374151";
    photoStatus.style.borderColor = "#e5e7eb";
    photoStatus.style.boxShadow = "0 8px 18px rgba(55,65,81,.10)";
  }
}
  // photo + fallback
  const photoEl = document.getElementById("itemPhoto");

if (photoEl) {
  if (item.imagePath) {
    photoEl.src = item.imagePath;
  } else {
    photoEl.src = "https://via.placeholder.com/600x400?text=No+Image";
  }

  photoEl.onerror = () => {
    photoEl.src = "https://via.placeholder.com/600x400?text=No+Image";
  };
}

  // edit link
  const btnEdit = document.getElementById("btnEdit");
  if (btnEdit) btnEdit.href = `report.html?id=${encodeURIComponent(item.id)}`;

  // owner actions
  const btnToggle = document.getElementById("btnToggleStatus");
  if (btnToggle) {
    btnToggle.onclick = () => toggleStatus(item);
  }

  const btnDelete = document.getElementById("btnDelete");
  if (btnDelete) {
    btnDelete.onclick = () => deleteItem(item.id);
  }
}

  const ownerActions = document.getElementById("ownerActions");
const btnEdit = document.getElementById("btnEdit");

if (ownerActions) ownerActions.style.display = "none";

async function checkOwnership(item) {
  try {
    const res = await fetch("/api/auth/me", { credentials: "include" });
    if (res.status === 401) return;

    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.ok || !data.user) return;

    const currentUserId = Number(data.user.id);
    const ownerId = Number(item.ownerUserId || item.owner_user_id);

    if (currentUserId === ownerId) {
      if (ownerActions) ownerActions.style.display = "flex";
      if (btnEdit) btnEdit.href = `report.html?id=${encodeURIComponent(item.id)}`;
    }
  } catch (err) {
    console.error("OWNERSHIP CHECK ERROR:", err);
  }
}

async function toggleStatus(item) {
  const current = item.status || "Active";
  const next =
    current === "Active"
      ? "Claimed"
      : current === "Claimed"
      ? "Resolved"
      : "Active";

  try {
    const res = await fetch(`/api/items/${encodeURIComponent(item.id)}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ status: next }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.ok) throw new Error(data.msg || "Failed to update status");

    window.location.reload();
  } catch (err) {
    alert(err.message);
  }
}

async function deleteItem(id) {
  if (!confirm("Are you sure you want to delete this item?")) return;

  try {
    const res = await fetch(`/api/items/${encodeURIComponent(id)}`, {
      method: "DELETE",
      credentials: "include",
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.ok) throw new Error(data.msg || "Delete failed");

    window.location.href = "home.html";
  } catch (err) {
    alert(err.message);
  }
}

function showError() {
  const loading = document.getElementById("loading");
  const errorState = document.getElementById("errorState");
  const detailContent = document.getElementById("detailContent");

  if (loading) loading.style.display = "none";
  if (detailContent) detailContent.style.display = "none";
  if (errorState) errorState.style.display = "block";
}

async function logout() {
  try {
    await fetch("/api/auth/logout", {
      method: "POST",
      credentials: "include",
    });
  } catch {
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