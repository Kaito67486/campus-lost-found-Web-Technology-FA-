// myreports.js - polished My Reports page

document.addEventListener("DOMContentLoaded", () => {
  document.body.classList.add("page-ready");

  const grid = document.getElementById("grid");
  const emptyState = document.getElementById("emptyState");
  const resultCount = document.getElementById("resultCount");
  const welcomeText = document.getElementById("welcomeText");
  const btnLogout = document.getElementById("btnLogout");

  const yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

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
        return data.user;
      }
      return null;
    } catch (err) {
      console.error("AUTH ERROR:", err);
      return null;
    }
  }

  async function loadMyItems(userId) {
    if (!grid) return;

    grid.innerHTML = `<div class="muted myreports-loading">Loading your reports...</div>`;
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

      renderStats(mine);
      render(mine);
    } catch (err) {
      console.error("LOAD MY REPORTS ERROR:", err);
      grid.innerHTML = `<div class="muted myreports-loading">${escapeHtml(err.message || "Error loading items.")}</div>`;
      if (resultCount) resultCount.textContent = "0 items";
      renderStats([]);
    }
  }

  function renderStats(items) {
    const total = items.length;
    const lost = items.filter(i => String(i.category || "").toLowerCase() === "lost").length;
    const found = items.filter(i => String(i.category || "").toLowerCase() === "found").length;
    const active = items.filter(i => String(i.status || "").toLowerCase() === "active").length;

    setText("statTotalReports", total);
    setText("statLostReports", lost);
    setText("statFoundReports", found);
    setText("statActiveReports", active);
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
      const cat = String(item.category || "").toLowerCase();
      const status = String(item.status || "Active").toLowerCase();

      const catClass = cat === "found" ? "found" : "lost";
      const statusClass =
        status === "claimed" ? "claimed" :
        status === "resolved" ? "resolved" : "active";

      const media = item.imagePath
        ? `<img class="item-img" src="${escapeAttr(item.imagePath)}" alt="${escapeAttr(title)}">`
        : `<img class="item-img" src="/images/placeholder.png" alt="No image available">`;

      return `
        <article class="item-card my-card" data-id="${escapeAttr(item.id)}" role="button" tabindex="0">
          <div class="my-card-media-wrap">
            ${media}
            <span class="my-card-category-badge ${catClass}">
              ${escapeHtml(item.category || (catClass === "found" ? "Found" : "Lost"))}
            </span>
          </div>

          <div class="item-body my-card-body">
            <div class="my-card-topline">
              <span class="badge-status ${statusClass}">
                ${escapeHtml(item.status || "Active")}
              </span>
              <span class="muted small">${escapeHtml(whenText)}</span>
            </div>

            <div class="item-title my-card-title">${escapeHtml(title)}</div>
            <div class="item-meta my-card-meta">${escapeHtml(location)}</div>

            <div class="my-actions">
              <button class="btn btn-view" type="button" data-action="view" data-id="${escapeAttr(item.id)}">View</button>
              <button class="btn btn-primary btn-edit" type="button" data-action="edit" data-id="${escapeAttr(item.id)}">Edit</button>
              <button class="btn btn-del" type="button" data-action="delete" data-id="${escapeAttr(item.id)}">Delete</button>
            </div>
          </div>
        </article>
      `;
    }).join("");

    grid.querySelectorAll(".my-card").forEach((card) => {
      card.addEventListener("click", (e) => {
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
            if (!res.ok || data.ok === false) {
              throw new Error(data.msg || "Delete failed");
            }

            const card = grid.querySelector(`.my-card[data-id="${CSS.escape(id)}"]`);
            card?.remove();

            const remainingCards = grid.querySelectorAll(".my-card");
            const remaining = remainingCards.length;

            if (resultCount) {
              resultCount.textContent = `${remaining} item${remaining === 1 ? "" : "s"}`;
            }

            const remainingItems = Array.from(remainingCards).map((el) => ({
              category: el.querySelector(".my-card-category-badge")?.textContent?.trim() || "",
              status: el.querySelector(".badge-status")?.textContent?.trim() || "",
            }));

            renderStatsFromDom(remainingItems);

            if (remaining === 0 && emptyState) {
              emptyState.style.display = "block";
            }
          } catch (err) {
            alert(err.message || "Could not delete.");
          }
        }
      });
    });
  }

  function renderStatsFromDom(items) {
    const total = items.length;
    const lost = items.filter(i => String(i.category).toLowerCase() === "lost").length;
    const found = items.filter(i => String(i.category).toLowerCase() === "found").length;
    const active = items.filter(i => String(i.status).toLowerCase() === "active").length;

    setText("statTotalReports", total);
    setText("statLostReports", lost);
    setText("statFoundReports", found);
    setText("statActiveReports", active);
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

  function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = String(value);
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