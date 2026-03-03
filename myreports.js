// myreports.js - show ONLY logged-in user's items; View (details) + Edit (report) + optional Delete

document.addEventListener("DOMContentLoaded", () => {
  const grid = document.getElementById("grid");
  const emptyState = document.getElementById("emptyState");
  const resultCount = document.getElementById("resultCount");
  const welcomeText = document.getElementById("welcomeText");
  const btnLogout = document.getElementById("btnLogout");

  highlightSidebar();
  init();

  btnLogout?.addEventListener("click", logout);

  async function init() {
    const user = await ensureLoggedIn();
    if (!user) return;
    await loadMyItems(user.id);
  }

  async function ensureLoggedIn() {
    try {
      const res = await fetch("/api/auth/me", { credentials: "include" });
      if (res.status === 401) {
        window.location.href = "login.html";
        return null;
      }
      const data = await res.json();
      if (data?.ok && data?.user) {
        if (welcomeText && data.user.name) {
          welcomeText.textContent = `Welcome, ${data.user.name} 👋`;
        }
        return data.user; // {id, name, ...}
      }
      return null;
    } catch (err) {
      console.error("AUTH ERROR:", err);
      return null;
    }
  }

  async function loadMyItems(userId) {
    if (!grid) return;

    grid.innerHTML = `<div class="muted" style="padding:10px 0;">Loading...</div>`;
    if (emptyState) emptyState.style.display = "none";
    if (resultCount) resultCount.textContent = "";

    try {
      const res = await fetch("/api/items", { credentials: "include" });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.msg || "Failed to load items");

      const all = Array.isArray(data.items) ? data.items : [];
      const mine = all
        .filter((it) => Number(it.ownerUserId) === Number(userId))
        .sort((a, b) => (Number(b.createdAt) || 0) - (Number(a.createdAt) || 0));

      render(mine);
    } catch (err) {
      console.error("LOAD MY REPORTS ERROR:", err);
      grid.innerHTML = `<div class="muted" style="padding:10px 0;">${escapeHtml(err.message || "Error loading items.")}</div>`;
      if (resultCount) resultCount.textContent = "0 items";
    }
  }

  function render(items) {
    if (!grid) return;

    if (!items.length) {
      grid.innerHTML = "";
      if (emptyState) emptyState.style.display = "block";
      if (resultCount) resultCount.textContent = "0 items";
      return;
    }

    if (emptyState) emptyState.style.display = "none";
    if (resultCount) resultCount.textContent = `${items.length} item${items.length === 1 ? "" : "s"}`;

    grid.innerHTML = items.map((item) => {
      const title = item.title || "Untitled";
      const location = item.location || "Unknown location";
      const whenText = item.createdAt ? timeAgo(Number(item.createdAt)) : (item.date || "");
      const cat = (item.category || "").toLowerCase(); // lost/found
      const status = (item.status || "Active").toLowerCase(); // active/claimed/resolved

      const catClass = cat === "found" ? "found" : "lost";
      const statusClass =
        status === "claimed" ? "claimed" : status === "resolved" ? "resolved" : "active";

      const media = item.imagePath
        ? `<img class="item-img" src="${escapeAttr(item.imagePath)}" alt="${escapeAttr(title)}">`
        : `<div class="item-img"></div>`;

      return `
        <div class="item-card my-card" data-id="${escapeAttr(item.id)}" role="button" tabindex="0">
          ${media}

          <div class="item-body">
            <div class="item-top" style="display:flex; gap:8px; align-items:center; justify-content:space-between;">
              <div style="display:flex; gap:8px; align-items:center;">
                <span class="badge ${catClass}">${escapeHtml(item.category || (catClass === "found" ? "Found" : "Lost"))}</span>
                <span class="badge-status ${statusClass}">${escapeHtml(item.status || "Active")}</span>
              </div>
              <span class="muted small">${escapeHtml(whenText)}</span>
            </div>

            <div class="item-title" style="margin-top:10px;">${escapeHtml(title)}</div>
            <div class="item-meta">${escapeHtml(location)}</div>

            <div class="my-actions" style="display:flex; gap:10px; margin-top:12px;">
              <button class="btn btn-light btn-view" type="button" data-action="view" data-id="${escapeAttr(item.id)}">View</button>
              <button class="btn btn-primary btn-edit" type="button" data-action="edit" data-id="${escapeAttr(item.id)}">Edit</button>
              <button class="btn btn-ghost btn-del" type="button" data-action="delete" data-id="${escapeAttr(item.id)}">Delete</button>
            </div>
          </div>
        </div>
      `;
    }).join("");

    // Card click -> view/manage details
    grid.querySelectorAll(".my-card").forEach((card) => {
      card.addEventListener("click", (e) => {
        // If clicked a button, let button handler handle it
        const btn = e.target.closest("button[data-action]");
        if (btn) return;
        const id = card.getAttribute("data-id");
        if (!id) return;
        window.location.href = `details.html?id=${encodeURIComponent(id)}`;
      });

      card.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          const id = card.getAttribute("data-id");
          if (!id) return;
          window.location.href = `details.html?id=${encodeURIComponent(id)}`;
        }
      });
    });

    // Button actions
    grid.querySelectorAll("button[data-action]").forEach((btn) => {
      btn.addEventListener("click", async (e) => {
        e.stopPropagation();
        const action = btn.getAttribute("data-action");
        const id = btn.getAttribute("data-id");
        if (!id) return;

        if (action === "view") {
          window.location.href = `details.html?id=${encodeURIComponent(id)}`;
          return;
        }
        if (action === "edit") {
          window.location.href = `report.html?id=${encodeURIComponent(id)}`;
          return;
        }
        if (action === "delete") {
          const ok = confirm("Delete this report? This cannot be undone.");
          if (!ok) return;

          try {
            const res = await fetch(`/api/items/${encodeURIComponent(id)}`, {
              method: "DELETE",
              credentials: "include",
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok || data.ok === false) throw new Error(data.msg || "Delete failed");

            // Remove card instantly
            const card = grid.querySelector(`.my-card[data-id="${CSS.escape(id)}"]`);
            card?.remove();

            // Update count
            const remaining = grid.querySelectorAll(".my-card").length;
            if (resultCount) resultCount.textContent = `${remaining} item${remaining === 1 ? "" : "s"}`;
            if (remaining === 0 && emptyState) emptyState.style.display = "block";
          } catch (err) {
            alert(err.message || "Could not delete.");
          }
        }
      });
    });
  }

  async function logout() {
    try {
      await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    } catch (_) {}
    window.location.href = "login.html";
  }

  function highlightSidebar() {
    const current = location.pathname.split("/").pop().split("?")[0];
    document.querySelectorAll(".side-nav .side-link").forEach((a) => {
      a.classList.toggle("active", a.getAttribute("href") === current);
    });
  }

  function timeAgo(ts) {
    if (!ts || !Number.isFinite(ts)) return "";
    const diff = Date.now() - ts;
    const sec = Math.floor(diff / 1000);
    const min = Math.floor(sec / 60);
    const hr = Math.floor(min / 60);
    const day = Math.floor(hr / 24);

    if (day > 0) return `${day} day${day === 1 ? "" : "s"} ago`;
    if (hr > 0) return `${hr} hour${hr === 1 ? "" : "s"} ago`;
    if (min > 0) return `${min} minute${min === 1 ? "" : "s"} ago`;
    return "just now";
  }

  function escapeHtml(s) {
    return String(s ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function escapeAttr(s) {
    return escapeHtml(s);
  }
});