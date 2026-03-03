// home.js - Works with your CURRENT backend (routes/items.js)
// - No backend changes needed
// - Uses /api/items?q=... (already supported)
// - Computes stats on frontend (since no /api/items/stats)
// - Shows only 8 recent items via slice(0, 8)

document.addEventListener("DOMContentLoaded", () => {
  // year
  const yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // logout (if script.js already does this, it's still fine)
  const btnLogout = document.getElementById("btnLogout");
  if (btnLogout) {
    btnLogout.addEventListener("click", async () => {
      try {
        await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
      } catch (e) {}
      window.location.href = "login.html";
    });
  }

  init();
});

async function init() {
  await loadMe();
  await loadStatsAndRecent(""); // load stats + recent items (no search)
  wireSearch();
}

async function loadMe() {
  try {
    const res = await fetch("/api/auth/me", { credentials: "include" });

    if (res.status === 401) {
      window.location.href = "login.html";
      return;
    }

    const data = await res.json();
    if (data.ok && data.user) {
      const welcomeEl = document.getElementById("welcomeText");
      if (welcomeEl) welcomeEl.textContent = `Welcome, ${data.user.name} 👋`;
    }
  } catch (err) {
    console.error("HOME ME ERROR:", err);
  }
}

/**
 * Your backend supports:
 * GET /api/items?category=Lost|Found&status=Active|Claimed|Resolved&q=...
 * It returns: { ok:true, items:[{ category, status, imagePath, createdAt, ...}] }
 * Source: routes/items.js :contentReference[oaicite:1]{index=1}
 *
 * We use /api/items once and:
 * - compute stats
 * - display first 8 items
 */
async function loadStatsAndRecent(searchQuery) {
  const grid = document.getElementById("itemsGrid");
  const empty = document.getElementById("emptyState");
  const count = document.getElementById("itemsCount");

  if (!grid) return;
  grid.innerHTML = "";
  if (empty) empty.style.display = "none";
  if (count) count.textContent = "Loading...";

  try {
    const url = new URL("/api/items", window.location.origin);
    if (searchQuery && searchQuery.trim()) url.searchParams.set("q", searchQuery.trim());

    const res = await fetch(url.toString(), { credentials: "include" });
    if (!res.ok) throw new Error("Failed to load items");

    const data = await res.json();
    const allItems = Array.isArray(data.items) ? data.items : [];

    // ---- compute stats from ALL items (not just first 8) ----
    computeAndRenderStats(allItems);

    // ---- show only first 8 in UI ----
    const items = allItems.slice(0, 8);

    if (count) count.textContent = `Showing ${items.length} of ${allItems.length} item${allItems.length === 1 ? "" : "s"}`;

    if (!items.length) {
      if (empty) empty.style.display = "block";
      return;
    }

    for (const it of items) {
      grid.appendChild(renderItemCard(it));
    }
  } catch (err) {
    console.error("Items load error:", err);
    if (count) count.textContent = "Showing 0 items";
    if (empty) empty.style.display = "block";

    // set stats to 0 if error
    setText("statTotal", 0);
    setText("statLost", 0);
    setText("statFound", 0);
    setText("statActive", 0);
  }
}

function computeAndRenderStats(items) {
  let total = items.length;
  let lost = 0;
  let found = 0;
  let active = 0;

  for (const it of items) {
    const cat = String(it.category || "").toLowerCase();   // "lost" | "found"
    const st = String(it.status || "").toLowerCase();      // "active" | "claimed" | "resolved"

    if (cat === "lost") lost++;
    if (cat === "found") found++;
    if (st === "active") active++;
  }

  setText("statTotal", total);
  setText("statLost", lost);
  setText("statFound", found);
  setText("statActive", active);
}

function wireSearch() {
  const q = document.getElementById("q");
  const btnSearch = document.getElementById("btnSearch");
  const btnClear = document.getElementById("btnClear");
  const imgFile = document.getElementById("imgFile");

  if (btnSearch && q) {
    btnSearch.addEventListener("click", () => loadStatsAndRecent(q.value));
  }

  if (q) {
    q.addEventListener("keydown", (e) => {
      if (e.key === "Enter") loadStatsAndRecent(q.value);
    });
  }

  if (btnClear && q) {
    btnClear.addEventListener("click", () => {
      q.value = "";
      loadStatsAndRecent("");
      if (imgFile) imgFile.value = "";
    });
  }

  // Image search is NOT implemented in your backend right now.
  // We'll keep the UI button but show a friendly message if used.
  if (imgFile) {
    imgFile.addEventListener("change", () => {
      if (!imgFile.files || !imgFile.files[0]) return;
      alert("Image search is not implemented yet in the backend.");
      imgFile.value = "";
    });
  }
}

function renderItemCard(it) {
  // Backend fields (from your routes/items.js):
  // - category: "Lost" | "Found"
  // - status: "Active" | "Claimed" | "Resolved"
  // - imagePath: "/uploads/..."
  // - createdAt: stored as number (Date.now())
  const id = it.id ?? "";
  const title = it.title ?? "Untitled";
  const category = String(it.category || "Lost"); // "Lost" | "Found"
  const status = String(it.status || "Active");   // keep original case
  const location = it.location ?? "Unknown location";
  const imageUrl = it.imagePath || "";            // use imagePath from backend
  const createdAtMs = Number(it.createdAt);

  const createdAtText = Number.isFinite(createdAtMs) ? timeAgo(new Date(createdAtMs)) : "";

  const a = document.createElement("a");
  a.className = "item-card";
  a.href = id ? `details.html?id=${encodeURIComponent(id)}` : "#";

  const img = document.createElement("img");
  img.className = "item-img";
  img.alt = title;
  img.loading = "lazy";
  img.src = imageUrl || "https://via.placeholder.com/600x400?text=Item";

  const body = document.createElement("div");
  body.className = "item-body";

  const top = document.createElement("div");
  top.className = "item-top";

  const badge = document.createElement("span");
  const isFound = category.toLowerCase() === "found";
  badge.className = `badge ${isFound ? "found" : "lost"}`;
  badge.textContent = isFound ? "Found" : "Lost";

  const st = document.createElement("span");
  st.className = "status";
  st.textContent = status; // "Active", "Claimed", "Resolved"

  top.appendChild(badge);
  top.appendChild(st);

  const h = document.createElement("div");
  h.className = "item-title";
  h.textContent = title;

  const meta = document.createElement("div");
  meta.className = "item-meta";
  meta.textContent = createdAtText ? `${location} • ${createdAtText}` : location;

  body.appendChild(top);
  body.appendChild(h);
  body.appendChild(meta);

  a.appendChild(img);
  a.appendChild(body);

  return a;
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = String(value);
}

function timeAgo(date) {
  const diff = Date.now() - date.getTime();
  const sec = Math.floor(diff / 1000);
  const min = Math.floor(sec / 60);
  const hr = Math.floor(min / 60);
  const day = Math.floor(hr / 24);

  if (day > 0) return `${day} day${day === 1 ? "" : "s"} ago`;
  if (hr > 0) return `${hr} hour${hr === 1 ? "" : "s"} ago`;
  if (min > 0) return `${min} min ago`;
  return "just now";
}