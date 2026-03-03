// details.js - clean details page + owner actions + sidebar highlight

document.addEventListener("DOMContentLoaded", () => {
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
  if (!id) return showError();

  ensureLoggedIn(); // sets welcome text (doesn't block UI)
  loadItem(id);
});

async function ensureLoggedIn() {
  const welcomeText = document.getElementById("welcomeText");
  try {
    const res = await fetch("/api/auth/me", { credentials: "include" });
    if (res.status === 401) return; // allow viewing without login if you want
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

  const ref = document.getElementById("refCode");
  const status = document.getElementById("itemStatus");
  const title = document.getElementById("itemTitle");
  const metaTop = document.getElementById("itemMetaTop");
  const desc = document.getElementById("itemDescription");
  const contact = document.getElementById("itemContact");

  if (ref) ref.textContent = item.referenceCode || "";
  if (status) status.textContent = item.status || "";
  if (title) title.textContent = item.title || "";
  if (desc) desc.textContent = item.description || "";
  if (contact) contact.textContent = item.contact || "";

  const meta = [
    item.category || "",
    item.location || "",
    (item.date || "").slice(0, 10),
  ].filter(Boolean).join(" • ");

  if (metaTop) metaTop.textContent = meta;

  // photo
  const photoEl = document.getElementById("itemPhoto");
  if (photoEl) {
    if (item.imagePath) {
      photoEl.src = item.imagePath;
      photoEl.style.display = "block";
    } else {
      photoEl.style.display = "none";
      photoEl.removeAttribute("src");
    }
  }

  // edit link
  const btnEdit = document.getElementById("btnEdit");
  if (btnEdit) btnEdit.href = `report.html?id=${encodeURIComponent(item.id)}`;

  // actions
  const btnToggle = document.getElementById("btnToggleStatus");
  if (btnToggle) {
    btnToggle.onclick = () => toggleStatus(item);
  }

  const btnDelete = document.getElementById("btnDelete");
  if (btnDelete) {
    btnDelete.onclick = () => deleteItem(item.id);
  }
}

async function checkOwnership(item) {
  try {
    const res = await fetch("/api/auth/me", { credentials: "include" });
    if (res.status === 401) return;

    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.ok || !data.user) return;

    const ownerId = item.ownerUserId ?? item.owner_user_id;
    if (ownerId && data.user.id === ownerId) {
      const actions = document.getElementById("ownerActions");
      if (actions) actions.style.display = "block";
    }
  } catch {
    // ignore
  }
}

async function toggleStatus(item) {
  const current = item.status || "Active";
  const next =
    current === "Active" ? "Claimed" :
    current === "Claimed" ? "Resolved" :
    "Active";

  try {
    const res = await fetch(`/api/items/${encodeURIComponent(item.id)}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ status: next }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.ok) throw new Error(data.msg || "Failed to update status");

    // simplest: reload to reflect new status
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
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
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