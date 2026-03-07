// lost.js - View-only Lost Items page (no filters)

document.addEventListener("DOMContentLoaded", () => {
  const grid = document.getElementById("grid");
  const emptyState = document.getElementById("emptyState");
  const resultCount = document.getElementById("resultCount");
  const welcomeText = document.getElementById("welcomeText");
  const btnLogout = document.getElementById("btnLogout");

  highlightSidebar();
  ensureLoggedIn();

  btnLogout?.addEventListener("click", logout);

  loadItems();

  async function ensureLoggedIn() {
    try {
      const res = await fetch("/api/auth/me", { credentials: "include" });
      if (res.status === 401) {
        window.location.href = "login.html";
        return;
      }
      const data = await res.json();
      if (data?.ok && data?.user?.name && welcomeText) {
        welcomeText.textContent = `Welcome, ${data.user.name} 👋`;
      }
    } catch (err) {
      console.error("AUTH ME ERROR:", err);
    }
  }

  async function logout() {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
    } catch (_) {}
    window.location.href = "login.html";
  }

  async function loadItems() {
    if (!grid) return;

    grid.classList.add("grid");
    grid.classList.remove("items-grid");

    grid.innerHTML = `<div class="muted" style="padding:10px 0;">Loading...</div>`;
    if (emptyState) emptyState.style.display = "none";
    if (resultCount) resultCount.textContent = "";

    try {
      const res = await fetch(`/api/items?category=Lost`, {
        credentials: "include",
      });
      const data = await res.json();

      if (!res.ok || !data.ok) {
        throw new Error(data.msg || "Failed to load items.");
      }

      const items = Array.isArray(data.items) ? data.items : [];
      renderItems(items);
    } catch (err) {
      console.error("LOST LOAD ERROR:", err);
      grid.innerHTML = `<div class="muted" style="padding:10px 0;">${escapeHtml(
        err.message || "Error loading items."
      )}</div>`;
      if (resultCount) resultCount.textContent = "0 items";
    }
  }

  function renderItems(items) {
    if (!grid) return;

    if (!items.length) {
      grid.innerHTML = "";
      if (emptyState) emptyState.style.display = "block";
      if (resultCount) resultCount.textContent = "0 items";
      return;
    }

    grid.innerHTML = items
      .map((item) => {
        const title = item.title || "Untitled";
        const location = item.location || "Unknown location";
        const rawStatus = item.status || "Active";

        const whenText = item.createdAt
          ? timeAgo(Number(item.createdAt))
          : (item.date || "");

        const media = item.imagePath
        ? `<img class="item-img"
              src="${escapeAttr(item.imagePath)}"
              alt="${escapeAttr(title)}"
              onerror="this.onerror=null;this.src='/images/placeholder.png';">`
        : `<img class="item-img"
              src="/images/placeholder.png"
              alt="No image available">`;

        return `
          <div class="item-card" data-id="${escapeAttr(item.id)}">
            ${media}

            <div class="item-body">
              <div class="item-top">
                <span class="badge lost">Lost</span>
                <span class="status">${escapeHtml(rawStatus)}</span>
              </div>

              <div class="item-title">${escapeHtml(title)}</div>
              <div class="item-meta">${escapeHtml(location)} • ${escapeHtml(whenText)}</div>
            </div>
          </div>
        `;
      })
      .join("");

    if (resultCount) {
      resultCount.textContent = `${items.length} ${
        items.length === 1 ? "item" : "items"
      }`;
    }

    if (emptyState) emptyState.style.display = "none";

    grid.querySelectorAll(".item-card").forEach((card) => {
      card.addEventListener("click", () => {
        const id = card.getAttribute("data-id");
        if (!id) return;
        window.location.href = `details.html?id=${encodeURIComponent(id)}&view=1`;
      });
    });
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