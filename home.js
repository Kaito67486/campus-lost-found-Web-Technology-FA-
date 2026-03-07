// home.js - Works with your CURRENT backend
// - Uses /api/auth/me and /api/items?q=...
// - Computes stats on frontend
// - Shows only 8 recent items
// - Adds smooth page transition + animated counters

document.addEventListener("DOMContentLoaded", () => {

  // ✅ Trigger smooth page transition
  document.body.classList.add("page-ready");

  // year
  const yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // logout
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
  await loadStatsAndRecent(""); // load stats + recent items
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

/* =========================
   ✅ Animated Counters
========================= */
function animateNumber(el, to, duration = 650) {
  if (!el) return;

  const target = Number(to) || 0;
  const startValue = Number(el.textContent) || 0;

  if (startValue === target) return;

  const start = performance.now();

  // remove class so animation can re-run every time
  el.classList.remove("pop");

  function tick(now) {
    const t = Math.min(1, (now - start) / duration);
    const eased = 1 - Math.pow(1 - t, 3);
    const value = Math.round(startValue + (target - startValue) * eased);
    el.textContent = String(value);

    if (t < 1) {
      requestAnimationFrame(tick);
    } else {
      // trigger pop when finished
      el.classList.add("pop");
      el.addEventListener("animationend", () => el.classList.remove("pop"), { once: true });
    }
  }

  requestAnimationFrame(tick);
}

async function loadStatsAndRecent(searchQuery) {
  const grid = document.getElementById("itemsGrid");
  const empty = document.getElementById("emptyState");
  const count = document.getElementById("itemsCount");
  const filterCategory = document.getElementById("filterCategory");
  const filterStatus = document.getElementById("filterStatus");
  const filterSort = document.getElementById("filterSort");

  if (!grid) return;
  grid.innerHTML = "";
  if (empty) empty.style.display = "none";
  if (count) count.textContent = "Loading...";

  try {
    const url = new URL("/api/items", window.location.origin);

    const q = (searchQuery || "").trim();
    const category = filterCategory?.value || "";
    const status = filterStatus?.value || "";

    if (q) url.searchParams.set("q", q);
    if (category) url.searchParams.set("category", category);
    if (status) url.searchParams.set("status", status);

    const res = await fetch(url.toString(), { credentials: "include" });
    if (!res.ok) throw new Error("Failed to load items");

    const data = await res.json();
    let allItems = Array.isArray(data.items) ? data.items : [];

    const sortValue = filterSort?.value || "newest";
    allItems = sortItems(allItems, sortValue);

    computeAndRenderStats(allItems);

    const items = allItems.slice(0, 8);

    if (count) {
      count.textContent = `Showing ${items.length} of ${allItems.length} item${allItems.length === 1 ? "" : "s"}`;
    }

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

    computeAndRenderStats([]);
  }
}

function computeAndRenderStats(items) {
  let total = items.length;
  let lost = 0;
  let found = 0;
  let active = 0;

  for (const it of items) {
    const cat = String(it.category || "").toLowerCase();
    const st = String(it.status || "").toLowerCase();

    if (cat === "lost") lost++;
    if (cat === "found") found++;
    if (st === "active") active++;
  }

  // ✅ animate numbers
  animateNumber(document.getElementById("statTotal"), total);
  animateNumber(document.getElementById("statLost"), lost);
  animateNumber(document.getElementById("statFound"), found);
  animateNumber(document.getElementById("statActive"), active);
}

function wireSearch() {
  const q = document.getElementById("q");
  const btnClear = document.getElementById("btnClear");
  const btnApplyFilters = document.getElementById("btnApplyFilters");
  const filterCategory = document.getElementById("filterCategory");
  const filterStatus = document.getElementById("filterStatus");
  const filterSort = document.getElementById("filterSort");
  const imgFile = document.getElementById("imgFile");

  if (!q) return;

  function toggleClear() {
    if (!btnClear) return;
    if (q.value.trim()) {
      btnClear.classList.add("show");
    } else {
      btnClear.classList.remove("show");
    }
  }

  function runSearch() {
    loadStatsAndRecent(q.value);
  }

  q.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      runSearch();
    }
  });

  q.addEventListener("input", () => {
    toggleClear();
  });

  if (btnClear) {
    btnClear.addEventListener("click", () => {
      q.value = "";
      toggleClear();

      if (filterCategory) filterCategory.value = "";
      if (filterStatus) filterStatus.value = "";
      if (filterSort) filterSort.value = "newest";

      loadStatsAndRecent("");
      q.focus();

      if (imgFile) imgFile.value = "";
    });
  }

  if (btnApplyFilters) {
    btnApplyFilters.addEventListener("click", runSearch);
  }

  if (filterCategory) {
    filterCategory.addEventListener("change", runSearch);
  }

  if (filterStatus) {
    filterStatus.addEventListener("change", runSearch);
  }

  if (filterSort) {
    filterSort.addEventListener("change", runSearch);
  }

  if (imgFile) {
    imgFile.addEventListener("change", () => {
      if (!imgFile.files || !imgFile.files[0]) return;
      alert("Image search is not implemented yet in the backend.");
      imgFile.value = "";
    });
  }

  toggleClear();
}

function renderItemCard(it) {
  const id = it.id ?? "";
  const title = it.title ?? "Untitled";
  const category = String(it.category || "Lost");
  const status = String(it.status || "Active");
  const location = it.location ?? "Unknown location";
  const imageUrl = it.imagePath || "";
  const createdAtMs = Number(it.createdAt);

  const createdAtText =
    Number.isFinite(createdAtMs)
      ? timeAgo(new Date(createdAtMs))
      : "";

  const a = document.createElement("a");
  a.className = "item-card";
  a.href = id ? `details.html?id=${encodeURIComponent(id)}&from=home.html` : "#";

  const img = document.createElement("img");
  img.className = "item-img";
  img.alt = title;
  img.loading = "lazy";
  img.src = imageUrl || "/images/placeholder.png";
  img.onerror = () => { img.src = "/images/placeholder.png"; }; 

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
  st.textContent = status;

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

function sortItems(items, sortValue) {
  const arr = [...items];

  if (sortValue === "oldest") {
    arr.sort((a, b) => (Number(a.createdAt) || 0) - (Number(b.createdAt) || 0));
  } else if (sortValue === "az") {
    arr.sort((a, b) => String(a.title || "").localeCompare(String(b.title || "")));
  } else if (sortValue === "za") {
    arr.sort((a, b) => String(b.title || "").localeCompare(String(a.title || "")));
  } else {
    // newest default
    arr.sort((a, b) => (Number(b.createdAt) || 0) - (Number(a.createdAt) || 0));
  }

  return arr;
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