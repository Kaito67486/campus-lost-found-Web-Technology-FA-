// ===== INDEX PAGE AUTH CHECK =====

document.addEventListener("DOMContentLoaded", () => {
  const yearEl = document.getElementById("year");
  if (yearEl) {
    yearEl.textContent = new Date().getFullYear();
  }

  const guestActions = document.getElementById("guestActions");
  const userActions = document.getElementById("userActions");
  const logoutBtn = document.getElementById("btnLogout");

  if (guestActions && userActions) {
    checkAuth();
  }

  if (logoutBtn) {
    logoutBtn.addEventListener("click", logout);
  }
});

async function checkAuth() {
  try {
    const res = await fetch("/api/auth/me", {
      credentials: "include"
    });

    if (!res.ok) throw new Error();

    const data = await res.json();

    if (data.ok && data.user) {
      document.getElementById("guestActions").style.display = "none";
      document.getElementById("userActions").style.display = "block";
    }
  } catch (err) {
    // Not logged in → do nothing
  }
}

async function logout() {
  await fetch("/api/auth/logout", {
    method: "POST",
    credentials: "include"
  });

  window.location.reload();
}

// ===== HOME PAGE LOGIC =====

document.addEventListener("DOMContentLoaded", () => {

  // Set year
  const yearEl = document.getElementById("year");
  if (yearEl) {
    yearEl.textContent = new Date().getFullYear();
  }

  // Logout
  const logoutBtn = document.getElementById("btnLogout");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", logout);
  }

  // Only run stats if stats elements exist
  if (document.getElementById("statTotal")) {
    requireLogin();
    loadStats();
  }
});

async function requireLogin() {
  try {
    const res = await fetch("/api/auth/me", {
      credentials: "include"
    });

    if (!res.ok) throw new Error();

  } catch (err) {
    window.location.href = "login.html";
  }
}

async function loadStats() {
  try {
    const res = await fetch("/api/items");
    const data = await res.json();

    if (!data.ok) return;

    const items = data.items || [];

    document.getElementById("statTotal").textContent = items.length;
    document.getElementById("statLost").textContent =
      items.filter(i => i.category === "Lost").length;

    document.getElementById("statFound").textContent =
      items.filter(i => i.category === "Found").length;

    document.getElementById("statActive").textContent =
      items.filter(i => i.status === "Active").length;

  } catch (err) {
    console.error("Failed to load stats:", err);
  }
}

async function logout() {
  await fetch("/api/auth/logout", {
    method: "POST",
    credentials: "include"
  });

  window.location.href = "index.html";
}

// ===== LOST PAGE LOGIC =====

document.addEventListener("DOMContentLoaded", () => {
  const yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  const logoutBtn = document.getElementById("btnLogout");
  if (logoutBtn) logoutBtn.addEventListener("click", logout);

  // Only run on lost.html
  const grid = document.getElementById("grid");
  if (!grid) return;

  // Setup handlers
  const btnApply = document.getElementById("btnApply");
  const qEl = document.getElementById("q");
  const statusEl = document.getElementById("status");
  const sortEl = document.getElementById("sort");

  btnApply.addEventListener("click", () => loadLost());
  qEl.addEventListener("keydown", (e) => {
    if (e.key === "Enter") loadLost();
  });

  // Initial load
  loadLost();

  async function loadLost() {
    const q = (qEl.value || "").trim();
    const status = statusEl.value;
    const sort = sortEl.value;

    // API query (backend filter)
    const params = new URLSearchParams();
    params.set("category", "Lost");
    if (status) params.set("status", status);
    if (q) params.set("q", q);

    grid.innerHTML = `<div class="muted">Loading...</div>`;
    document.getElementById("emptyState").style.display = "none";

    try {
      const res = await fetch(`/api/items?${params.toString()}`);
      const data = await res.json();
      if (!data.ok) throw new Error("API failed");

      let items = data.items || [];

      // Frontend sort
      items = sortItems(items, sort);

      renderItems(items);
    } catch (err) {
      grid.innerHTML = `<div class="muted">Failed to load items.</div>`;
      console.error(err);
    }
  }

  function sortItems(items, sort) {
    const copy = [...items];

    if (sort === "newest") {
      copy.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    } else if (sort === "oldest") {
      copy.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
    } else if (sort === "az") {
      copy.sort((a, b) => String(a.title || "").localeCompare(String(b.title || "")));
    } else if (sort === "za") {
      copy.sort((a, b) => String(b.title || "").localeCompare(String(a.title || "")));
    }
    return copy;
  }

  function esc(s) {
    return String(s ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function renderItems(items) {
    const countEl = document.getElementById("resultCount");
    countEl.textContent = `${items.length} result${items.length === 1 ? "" : "s"}`;

    if (!items.length) {
      grid.innerHTML = "";
      document.getElementById("emptyState").style.display = "block";
      return;
    }

    document.getElementById("emptyState").style.display = "none";

    grid.innerHTML = items.map(item => {
      const id = esc(item.id);
      const code = esc(item.referenceCode || "");
      const title = esc(item.title || "");
      const location = esc(item.location || "");
      const date = esc(item.date || "");
      const status = esc(item.status || "");

      return `
        <a class="item-card" href="details.html?id=${id}">
          <div class="item-top">
            <span class="badge">${code}</span>
            <span class="status">${status}</span>
          </div>
          <h3 class="item-title">${title}</h3>
          <p class="item-meta">${location} • ${date}</p>
        </a>
      `;
    }).join("");
  }
});

// ===== FOUND PAGE LOGIC =====

document.addEventListener("DOMContentLoaded", () => {
  const yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  const logoutBtn = document.getElementById("btnLogout");
  if (logoutBtn) logoutBtn.addEventListener("click", logout);

  // Only run on found.html
  const grid = document.getElementById("grid");
  if (!grid) return;

  // Detect page by title/subtitle (simple and reliable)
  const subtitle = document.querySelector(".site-subtitle");
  const isFoundPage = subtitle && subtitle.textContent.trim() === "Found Items";
  if (!isFoundPage) return;

  const btnApply = document.getElementById("btnApply");
  const qEl = document.getElementById("q");
  const statusEl = document.getElementById("status");
  const sortEl = document.getElementById("sort");

  btnApply.addEventListener("click", () => loadFound());
  qEl.addEventListener("keydown", (e) => {
    if (e.key === "Enter") loadFound();
  });

  loadFound();

  async function loadFound() {
    const q = (qEl.value || "").trim();
    const status = statusEl.value;
    const sort = sortEl.value;

    const params = new URLSearchParams();
    params.set("category", "Found");
    if (status) params.set("status", status);
    if (q) params.set("q", q);

    grid.innerHTML = `<div class="muted">Loading...</div>`;
    document.getElementById("emptyState").style.display = "none";

    try {
      const res = await fetch(`/api/items?${params.toString()}`);
      const data = await res.json();
      if (!data.ok) throw new Error("API failed");

      let items = data.items || [];
      items = sortItems(items, sort);

      renderItems(items);
    } catch (err) {
      grid.innerHTML = `<div class="muted">Failed to load items.</div>`;
      console.error(err);
    }
  }

  function sortItems(items, sort) {
    const copy = [...items];

    if (sort === "newest") {
      copy.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    } else if (sort === "oldest") {
      copy.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
    } else if (sort === "az") {
      copy.sort((a, b) => String(a.title || "").localeCompare(String(b.title || "")));
    } else if (sort === "za") {
      copy.sort((a, b) => String(b.title || "").localeCompare(String(a.title || "")));
    }
    return copy;
  }

  function esc(s) {
    return String(s ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function renderItems(items) {
    const countEl = document.getElementById("resultCount");
    countEl.textContent = `${items.length} result${items.length === 1 ? "" : "s"}`;

    if (!items.length) {
      grid.innerHTML = "";
      document.getElementById("emptyState").style.display = "block";
      return;
    }

    document.getElementById("emptyState").style.display = "none";

    grid.innerHTML = items.map(item => {
      const id = esc(item.id);
      const code = esc(item.referenceCode || "");
      const title = esc(item.title || "");
      const location = esc(item.location || "");
      const date = esc(item.date || "");
      const status = esc(item.status || "");

      return `
        <a class="item-card" href="details.html?id=${id}">
          <div class="item-top">
            <span class="badge">${code}</span>
            <span class="status">${status}</span>
          </div>
          <h3 class="item-title">${title}</h3>
          <p class="item-meta">${location} • ${date}</p>
        </a>
      `;
    }).join("");
  }
});

// Auto highlight current sidebar link
document.addEventListener("DOMContentLoaded", () => {
  const currentPage = window.location.pathname.split("/").pop();

  document.querySelectorAll(".side-nav .side-link").forEach(link => {
    const linkPage = link.getAttribute("href");

    if (linkPage === currentPage) {
      link.classList.add("active");
    } else {
      link.classList.remove("active");
    }
  });
});

//index,register,login.html design

// Page fade-in
document.addEventListener("DOMContentLoaded", () => {
  // Add "page" class in HTML for this to work (see step 3 below)
  document.body.classList.add("page-ready");

  // Footer year
  const yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // Ripple effect on buttons/links that have .btn
  document.addEventListener("click", (e) => {
    const btn = e.target.closest(".btn");
    if (!btn) return;

    const rect = btn.getBoundingClientRect();
    const ripple = document.createElement("span");
    ripple.className = "ripple";

    const size = Math.max(rect.width, rect.height);
    ripple.style.width = ripple.style.height = size + "px";

    const x = e.clientX - rect.left - size / 2;
    const y = e.clientY - rect.top - size / 2;
    ripple.style.left = x + "px";
    ripple.style.top = y + "px";

    btn.appendChild(ripple);
    ripple.addEventListener("animationend", () => ripple.remove());
  });

  // Smooth fade-out transition on internal navigation
  document.addEventListener("click", (e) => {
    const a = e.target.closest("a");
    if (!a) return;

    const href = a.getAttribute("href");
    if (!href) return;

    const isExternal = /^https?:\/\//.test(href);
    const isAnchor = href.startsWith("#");
    const isNewTab = a.target === "_blank";

    if (isExternal || isAnchor || isNewTab) return;

    e.preventDefault();
    document.body.classList.remove("page-ready");

    setTimeout(() => {
      window.location.href = href;
    }, 180);
  });
});