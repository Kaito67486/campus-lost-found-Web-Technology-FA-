// maps.js — Map Overview (building images + location counts + click-to-filter)

document.addEventListener("DOMContentLoaded", () => {
  const welcomeText = document.getElementById("welcomeText");
  const btnLogout = document.getElementById("btnLogout");

  const locCount = document.getElementById("locCount");
  const resultCount = document.getElementById("resultCount");
  const locationsList = document.getElementById("locationsList");

  const floorMap = document.getElementById("floorMap");
  const floorBtns = document.querySelectorAll(".floor-btn");

  // 1) Sidebar auto-highlight (optional but useful)
  highlightSidebar();

  // 2) Auth + welcome
  ensureLoggedIn();

  // 3) Logout
  btnLogout?.addEventListener("click", logout);

  // 4) Floor switching (TTS GF / L3 / L4)
  if (floorMap && floorBtns.length) {
    floorBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        floorBtns.forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");

        const floor = btn.dataset.floor; // gf / l3 / l4
        // Make sure your files are in /public/images/:
        // images/tts-gf.png, images/tts-l3.png, images/tts-l4.png
        floorMap.src = `images/tts-${floor}.png`;
      });
    });
  }

  // 5) Load location summary
  loadLocationSummary();

  // -------------------------
  // Functions
  // -------------------------

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
      // Let UI render even if auth check fails
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

  async function loadLocationSummary() {
    if (!locationsList) return;

    locationsList.innerHTML = `<div class="muted small" style="padding:12px 14px;">Loading locations...</div>`;
    if (locCount) locCount.textContent = "";
    if (resultCount) resultCount.textContent = "";

    try {
      // Pull all items, then compute counts by location (lost + found)
      const res = await fetch("/api/items", { credentials: "include" });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.msg || "Failed to load items.");

      const items = Array.isArray(data.items) ? data.items : [];

      const stats = buildLocationStats(items);
      renderLocationStats(stats);
    } catch (err) {
      console.error("MAPS LOAD ERROR:", err);
      locationsList.innerHTML = `<div class="muted small" style="padding:12px 14px;">${escapeHtml(
        err.message || "Error loading locations."
      )}</div>`;
      if (locCount) locCount.textContent = "0 places";
      if (resultCount) resultCount.textContent = "0 places";
    }
  }

  function buildLocationStats(items) {
    // Map: location -> { lost: n, found: n, total: n }
    const map = new Map();

    for (const it of items) {
      const location = (it.location || "").trim() || "Unknown location";
      const category = (it.category || "").toLowerCase(); // "lost" / "found"

      if (!map.has(location)) map.set(location, { lost: 0, found: 0, total: 0 });

      const row = map.get(location);
      if (category === "lost") row.lost += 1;
      else if (category === "found") row.found += 1;

      row.total += 1;
    }

    // Convert to array and sort by total desc
    const arr = Array.from(map.entries()).map(([location, v]) => ({
      location,
      lost: v.lost,
      found: v.found,
      total: v.total,
    }));

    arr.sort((a, b) => b.total - a.total || a.location.localeCompare(b.location));
    return arr;
  }

  function renderLocationStats(stats) {
    if (!locationsList) return;

    if (!stats.length) {
      locationsList.innerHTML = `<div class="muted small" style="padding:12px 14px;">No items yet — locations will appear once reports exist.</div>`;
      if (locCount) locCount.textContent = "0 places";
      if (resultCount) resultCount.textContent = "0 places";
      return;
    }

    if (locCount) locCount.textContent = `${stats.length} ${stats.length === 1 ? "place" : "places"}`;
    if (resultCount) resultCount.textContent = `${stats.length} ${stats.length === 1 ? "place" : "places"}`;

    // Cards/rows for locations (click -> go to lost/found filtered)
    locationsList.innerHTML = stats
      .map((s) => {
        return `
          <button class="loc-row" type="button" data-loc="${escapeAttr(s.location)}"
            style="width:100%; text-align:left; border:0; background:transparent; padding:0;">
            <div class="loc-item" style="display:flex; align-items:center; justify-content:space-between; gap:12px; padding:12px 14px; border:1px solid #e6eaf2; border-radius:12px;">
              <div style="display:flex; align-items:center; gap:10px;">
                <span class="icon" style="width:18px; height:18px; display:inline-flex;">
                  <svg viewBox="0 0 24 24" style="width:18px;height:18px;">
                    <path d="M12 22s7-4.4 7-12a7 7 0 1 0-14 0c0 7.6 7 12 7 12zm0-10a2 2 0 1 0 0-4a2 2 0 0 0 0 4z"/>
                  </svg>
                </span>
                <div>
                  <div style="font-weight:700;">${escapeHtml(s.location)}</div>
                  <div class="muted small">Lost: ${s.lost} • Found: ${s.found}</div>
                </div>
              </div>

              <div class="muted small" style="white-space:nowrap;">
                Total ${s.total}
              </div>
            </div>
          </button>
        `;
      })
      .join("");

    // Click handlers
    locationsList.querySelectorAll(".loc-row").forEach((btn) => {
      btn.addEventListener("click", () => {
        const loc = btn.getAttribute("data-loc") || "";
        // Send user to LOST list filtered by location
        // If you prefer Found list, swap to found.html
        window.location.href = `lost.html?location=${encodeURIComponent(loc)}`;
      });
    });
  }

  function highlightSidebar() {
    const current = location.pathname.split("/").pop().split("?")[0];
    document.querySelectorAll(".side-nav .side-link").forEach((a) => {
      a.classList.toggle("active", a.getAttribute("href") === current);
    });
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