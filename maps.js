// maps.js — Interactive Map Overview (pins + heat + tooltip + click-to-filter)

document.addEventListener("DOMContentLoaded", () => {
  document.body.classList.add("page-ready");

  const welcomeText = document.getElementById("welcomeText");
  const btnLogout = document.getElementById("btnLogout");

  const locCount = document.getElementById("locCount");
  const resultCount = document.getElementById("resultCount");
  const locationsList = document.getElementById("locationsList");

  const floorMap = document.getElementById("floorMap");
  const floorBtns = document.querySelectorAll(".floor-btn");

  const mapPins = document.getElementById("mapPins");
  const tooltip = document.getElementById("mapTooltip");
  const mapFrame = document.getElementById("mapFrame");

  const yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  highlightSidebar();
  ensureLoggedIn();
  btnLogout?.addEventListener("click", logout);

  // ---------------------------------------------
  // Pin layout configuration (EDIT these positions)
  // top/left are percentages based on your images.
  // ---------------------------------------------
  const PIN_CONFIG = {
    gf: [
      { location: "TTS Ground Floor (GF)", label: "GF", top: 18, left: 20 },
      { location: "La Place Cafe", label: "Cafe", top: 57, left: 43 },
      { location: "Discussion Area", label: "Discuss", top: 60, left: 71 },
      { location: "ATM", label: "ATM", top: 83, left: 79 }
    ],
    l3: [
      { location: "TTS Level 3 (L3)", label: "L3", top: 18, left: 20 },
      { location: "TTS Level 3", label: "L3", top: 55, left: 55 }
    ],
    l4: [
      { location: "TTS Level 4 (L4)", label: "L4", top: 18, left: 20 },
      { location: "TTS Level 4", label: "L4", top: 55, left: 55 }
    ],
  };

  let currentFloor = "gf";
  let locationStatsMap = new Map(); // location -> {lost, found, total}

  // Floor switching
  if (floorMap && floorBtns.length) {
    floorBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        floorBtns.forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");

        currentFloor = btn.dataset.floor || "gf";
        floorMap.src = `images/tts-${currentFloor}.png`;

        renderPins(); // redraw pins for this floor
      });
    });
  }

  // Load items and build stats
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
    }
  }

  async function logout() {
    try {
      await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    } catch (_) {}
    window.location.href = "login.html";
  }

  async function loadLocationSummary() {
    if (locationsList) {
      locationsList.innerHTML =
        `<div class="muted small loc-loading">Loading locations...</div>`;
    }
    if (locCount) locCount.textContent = "";
    if (resultCount) resultCount.textContent = "";

    try {
      const res = await fetch("/api/items", { credentials: "include" });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.msg || "Failed to load items.");

      const items = Array.isArray(data.items) ? data.items : [];

      const statsArr = buildLocationStats(items);
      locationStatsMap = new Map(statsArr.map(s => [s.location, s]));

      renderLocationStats(statsArr);
      renderPins();
    } catch (err) {
      console.error("MAPS LOAD ERROR:", err);
      if (locationsList) {
        locationsList.innerHTML =
          `<div class="muted small loc-loading">${escapeHtml(err.message || "Error loading locations.")}</div>`;
      }
      if (locCount) locCount.textContent = "0 places";
      if (resultCount) resultCount.textContent = "0 places";
      locationStatsMap = new Map();
      renderPins();
    }
  }

  function buildLocationStats(items) {
    const map = new Map();

    for (const it of items) {
      const location = (it.location || "").trim() || "Unknown location";
      const category = (it.category || "").toLowerCase();

      if (!map.has(location)) map.set(location, { lost: 0, found: 0, total: 0 });
      const row = map.get(location);

      if (category === "lost") row.lost += 1;
      else if (category === "found") row.found += 1;

      row.total += 1;
    }

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
      locationsList.innerHTML =
        `<div class="muted small loc-loading">No items yet — locations will appear once reports exist.</div>`;
      if (locCount) locCount.textContent = "0 places";
      if (resultCount) resultCount.textContent = "0 places";
      return;
    }

    if (locCount) locCount.textContent = `${stats.length} ${stats.length === 1 ? "place" : "places"}`;
    if (resultCount) resultCount.textContent = `${stats.length} ${stats.length === 1 ? "place" : "places"}`;

    locationsList.innerHTML = stats.map((s) => {
      return `
        <button class="loc-row" type="button" data-loc="${escapeAttr(s.location)}">
          <div class="loc-item">
            <div class="loc-left">
              <span class="loc-icon">
                <svg viewBox="0 0 24 24">
                  <path d="M12 22s7-4.4 7-12a7 7 0 1 0-14 0c0 7.6 7 12 7 12zm0-10a2 2 0 1 0 0-4a2 2 0 0 0 0 4z"/>
                </svg>
              </span>
              <div>
                <div class="loc-title">${escapeHtml(s.location)}</div>
                <div class="muted small">Lost: ${s.lost} • Found: ${s.found}</div>
              </div>
            </div>

            <div class="muted small loc-right">Total ${s.total}</div>
          </div>
        </button>
      `;
    }).join("");

    locationsList.querySelectorAll(".loc-row").forEach((btn) => {
      btn.addEventListener("click", () => {
        const loc = btn.getAttribute("data-loc") || "";
        window.location.href = `lost.html?location=${encodeURIComponent(loc)}`;
      });
    });
  }

  function renderPins() {
    if (!mapPins) return;
    mapPins.innerHTML = "";

    const pins = PIN_CONFIG[currentFloor] || [];

    // determine heat thresholds based on all totals
    const totals = Array.from(locationStatsMap.values()).map(v => v.total);
    const max = totals.length ? Math.max(...totals) : 0;

    for (const p of pins) {
      const stats = locationStatsMap.get(p.location) || { lost: 0, found: 0, total: 0 };

      const pin = document.createElement("button");
      pin.type = "button";
      pin.className = `map-pin ${heatClass(stats.total, max)}`;
      pin.style.top = `${p.top}%`;
      pin.style.left = `${p.left}%`;
      pin.setAttribute("data-location", p.location);
      pin.setAttribute("aria-label", `${p.location} (${stats.total})`);

      pin.innerHTML = `
        <span class="pin-dot"></span>
        <span class="pin-count">${stats.total}</span>
      `;

      // Hover tooltip
      pin.addEventListener("mouseenter", (e) => showTooltip(e, p.location, stats));
      pin.addEventListener("mousemove", (e) => moveTooltip(e));
      pin.addEventListener("mouseleave", hideTooltip);

      // Click -> filter items by location
      pin.addEventListener("click", () => {
        window.location.href = `lost.html?location=${encodeURIComponent(p.location)}`;
      });

      mapPins.appendChild(pin);
    }
  }

  function heatClass(total, max) {
    if (!total) return "heat-none";
    if (max <= 2) return "heat-mid";
    const ratio = total / max;

    if (ratio >= 0.66) return "heat-high";
    if (ratio >= 0.33) return "heat-mid";
    return "heat-low";
  }

  function showTooltip(evt, location, stats) {
    if (!tooltip || !mapFrame) return;

    tooltip.innerHTML = `
      <div class="tt-title">${escapeHtml(location)}</div>
      <div class="tt-sub">Lost: ${stats.lost} • Found: ${stats.found} • Total: ${stats.total}</div>
      <div class="tt-hint">Click to filter</div>
    `;

    tooltip.classList.add("show");
    tooltip.setAttribute("aria-hidden", "false");
    moveTooltip(evt);
  }

  function moveTooltip(evt) {
    if (!tooltip || !mapFrame) return;

    const rect = mapFrame.getBoundingClientRect();
    const x = evt.clientX - rect.left;
    const y = evt.clientY - rect.top;

    tooltip.style.left = `${x + 14}px`;
    tooltip.style.top = `${y + 14}px`;
  }

  function hideTooltip() {
    if (!tooltip) return;
    tooltip.classList.remove("show");
    tooltip.setAttribute("aria-hidden", "true");
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