(() => {
  "use strict";

  const CATS = window.CATEGORIES;
  const EVENTS = window.EVENTS;
  const VENUES = window.VENUES;
  const byId = Object.fromEntries(VENUES.map((v) => [v.id, v]));
  const $ = (s, r = document) => r.querySelector(s);
  const isMobile = () => matchMedia("(max-width: 860px)").matches;

  const STYLES = {
    light: "https://tiles.openfreemap.org/styles/positron",
    dark: "https://tiles.openfreemap.org/styles/dark",
    real: "https://tiles.openfreemap.org/styles/liberty",
  };
  // Режимы карты: схема (монохром), город (реалистичные цвета), спутник
  const MAP_MODES = { scheme: "Схема", real: "Город", sat: "Спутник" };
  const styleFor = () => (state.mapMode === "scheme" ? STYLES[state.theme] : STYLES.real);
  const STAMPS_GOAL = 5;

  // Зона, где есть площадки: рамка вокруг всех мест с отступом.
  const vb = VENUES.reduce((b, v) => [Math.min(b[0], v.coords[0]), Math.min(b[1], v.coords[1]), Math.max(b[2], v.coords[0]), Math.max(b[3], v.coords[1])], [180, 90, -180, -90]);
  const FOCUS = [vb[0] - 0.018, vb[1] - 0.012, vb[2] + 0.018, vb[3] + 0.012];
  const CENTER = [(FOCUS[0] + FOCUS[2]) / 2, (FOCUS[1] + FOCUS[3]) / 2];

  // ---------- Иконки (линейные, 24×24) ----------
  const ICONS = {
    cinema: '<rect x="3.5" y="5" width="17" height="14" rx="1.5"/><path d="M7.5 5v14M16.5 5v14M3.5 9.5h4M3.5 14.5h4M16.5 9.5h4M16.5 14.5h4"/>',
    theatre: '<path d="M3 4.5h18"/><path d="M4 4.5v15c3 0 4.5-3 4.5-8.5V4.5M20 4.5v15c-3 0-4.5-3-4.5-8.5V4.5"/><path d="M8.5 4.5c.6 3 2 4.5 3.5 4.5s2.9-1.5 3.5-4.5"/>',
    museum: '<path d="M3 9.5 12 4l9 5.5"/><path d="M5.5 10v8M10 10v8M14 10v8M18.5 10v8M3 20h18"/>',
    concert: '<path d="M9 18V6.5l10-2.5v12"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="16.5" cy="16" r="2.5"/>',
  };
  const icon = (t, size = 18) => `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">${ICONS[t]}</svg>`;
  const STAR = '<svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor"><path d="M12 2.8l2.8 6 6.5.7-4.9 4.4 1.4 6.4L12 17l-5.8 3.3 1.4-6.4-4.9-4.4 6.5-.7z"/></svg>';
  const SEAL = (s = 22) => `<svg viewBox="0 0 24 24" width="${s}" height="${s}" fill="none" stroke="currentColor" stroke-width="1.4"><circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="5.5" stroke-dasharray="2 2"/><path d="m9.5 12 1.8 1.8 3.2-3.6"/></svg>`;

  // ---------- Хранилище ----------
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (_) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (_) {} },
  };

  const state = {
    cat: "all", mode: "places", query: "", venue: null, day: 0,
    theme: store.get("pk-theme", null) || "dark",
    orbit: null, me: null, hover: null,
    stamps: store.get("pk-stamps", []),
    mapMode: store.get("pk-mapmode", "real"),
  };
  document.documentElement.dataset.theme = state.theme;

  // ---------- Утилиты ----------
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const fmtTime = (d) => d.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
  const fmtDay = (d) => d.toLocaleDateString("ru-RU", { day: "numeric", month: "long" });
  const dayDate = (i) => { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() + i); return d; };
  const sameDay = (a, b) => a.toDateString() === b.toDateString();
  const dayLabel = (i) => (i === 0 ? "Сегодня" : i === 1 ? "Завтра" : dayDate(i).toLocaleDateString("ru-RU", { weekday: "short" }));
  const dur = (m) => `${Math.floor(m / 60)} ч${m % 60 ? " " + (m % 60) + " мин" : ""}`;
  const plural = (n, a, b, c) => { const m = n % 10, h = n % 100; return m === 1 && h !== 11 ? a : m >= 2 && m <= 4 && (h < 10 || h >= 20) ? b : c; };
  const gradient = (p) => `linear-gradient(160deg, ${p[1]} 0%, ${p[0]} 75%)`;
  const heroFor = () => `#2b2b2e`;
  const upcoming = (v, id) => v.sessions[id].filter((s) => s.date > new Date());
  const stampedVenues = () => [...new Set(state.stamps.map((s) => s.venue))].filter((id) => byId[id]);
  const hasStamp = (id) => state.stamps.some((s) => s.venue === id);

  // Если у события есть поле image (URL постера/фото) — показываем его, иначе фирменную обложку.
  const poster = (ev, size = "sm") => ev.image
    ? `<div class="poster ${size} has-img" style="background:#111 url('${encodeURI(ev.image)}') center/cover"></div>`
    : `<div class="poster cat-poster ${size}" style="--c:${CATS[ev.type].color}">${icon(ev.type, 40)}</div>`;
  const ico = (t) => `<span class="ico" style="--c:${CATS[t].color}">${icon(t)}</span>`;

  function haversine([lng1, lat1], [lng2, lat2]) {
    const R = 6371, toR = Math.PI / 180;
    const dLat = (lat2 - lat1) * toR, dLng = (lng2 - lng1) * toR;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * toR) * Math.cos(lat2 * toR) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(a));
  }
  const fmtDist = (km) => (km < 1 ? `${Math.round((km * 1000) / 10) * 10} м` : `${km.toFixed(1).replace(".", ",")} км`);
  const travel = (km) => {
    const road = km * 1.3;
    if (road < 2) return `${Math.max(2, Math.round((road / 4.8) * 60))} мин пешком`;
    return `${Math.max(5, Math.round((road / 22) * 60 + 4))} мин в пути`;
  };

  const matchesQuery = (txt) => !state.query || txt.toLowerCase().includes(state.query);
  const venueVisible = (v) => {
    if (state.cat !== "all" && v.type !== state.cat) return false;
    if (!state.query || state.mode === "near") return true;
    return matchesQuery([v.name, v.place, v.address, ...v.events.map((e) => EVENTS[e].title)].join(" "));
  };

  // ---------- Карта (только зона с площадками) ----------
  const map = new maplibregl.Map({
    container: "map",
    style: styleFor(),
    center: CENTER, zoom: 11.8, pitch: 0, bearing: 0,
    minZoom: isMobile() ? 10.6 : 11.6, maxZoom: 18.5, maxPitch: 72,
    antialias: true,
    attributionControl: { compact: true },
    maxBounds: [[FOCUS[0] - 0.06, FOCUS[1] - 0.04], [FOCUS[2] + 0.06, FOCUS[3] + 0.04]],
  });
  let srcName = "openmaptiles";

  function homeView() {
    const cam = map.cameraForBounds([[vb[0], vb[1]], [vb[2], vb[3]]], { padding: basePadding(false) });
    if (isMobile()) return { center: cam?.center || CENTER, zoom: Math.max(map.getMinZoom(), (cam?.zoom || 12) - 0.2), pitch: 35, bearing: 0 };
    return { center: cam?.center || CENTER, zoom: Math.max(12.4, (cam?.zoom || 13) + 0.35), pitch: 52, bearing: -14 };
  }

  // Маска: всё за пределами зоны приглушено, сама зона — с тонкой золотой рамкой
  function roundedRect([x1, y1, x2, y2], r = 0.006, steps = 8) {
    const pts = [];
    const ry = r * 0.56;
    const corners = [[x2 - r, y2 - ry, 0], [x1 + r, y2 - ry, 90], [x1 + r, y1 + ry, 180], [x2 - r, y1 + ry, 270]];
    corners.forEach(([cx, cy, a0]) => { for (let i = 0; i <= steps; i++) { const a = ((a0 + (i / steps) * 90) * Math.PI) / 180; pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * ry]); } });
    pts.push(pts[0]);
    return pts;
  }
  const focusRing = roundedRect(FOCUS);
  const maskData = { type: "Feature", properties: {}, geometry: { type: "Polygon", coordinates: [[[40, 50], [60, 50], [60, 62], [40, 62], [40, 50]], focusRing.slice().reverse()] } };
  const frameData = { type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: focusRing } };

  // ---- Реальные здания площадок: контур и высота из OSM-тайлов ----
  const footprints = {};
  function pointInRing(pt, ring) {
    let inside = false;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const [xi, yi] = ring[i], [xj, yj] = ring[j];
      if (yi > pt[1] !== yj > pt[1] && pt[0] < ((xj - xi) * (pt[1] - yi)) / (yj - yi) + xi) inside = !inside;
    }
    return inside;
  }
  const polys = (g) => (g.type === "Polygon" ? [g.coordinates] : g.type === "MultiPolygon" ? g.coordinates : []);
  const ringDist = (pt, ring) => { let m = Infinity; for (const c of ring) m = Math.min(m, haversine(pt, c)); return m; };
  const ringArea = (r) => { let a = 0; for (let i = 0, j = r.length - 1; i < r.length; j = i++) a += (r[j][0] + r[i][0]) * (r[j][1] - r[i][1]); return Math.abs(a); };

  function captureFootprints() {
    if (map.getZoom() < 14) return; // на z14+ в тайлах полная геометрия и высоты
    let feats;
    try { feats = map.querySourceFeatures(srcName, { sourceLayer: "building" }); } catch (_) { return; }
    if (!feats.length) return;
    let changed = false;
    VENUES.forEach((v) => {
      if (footprints[v.id]) return;
      let hits = feats.filter((f) => polys(f.geometry).some((p) => pointInRing(v.coords, p[0])));
      if (!hits.length) {
        let best = null, bestScore = Infinity;
        feats.forEach((f) => polys(f.geometry).forEach((p) => {
          const d = ringDist(v.coords, p[0]);
          if (d > 0.08) return;
          const score = d - Math.min(0.03, Math.sqrt(ringArea(p[0])) * 30); // предпочитаем крупные здания (ТЦ)
          if (score < bestScore) { bestScore = score; best = f; }
        }));
        if (best) hits = [best];
      }
      if (!hits.length) return;
      const seed = hits.sort((a, b) => ringArea(polys(b.geometry)[0][0]) - ringArea(polys(a.geometry)[0][0]))[0];
      // все куски этого же здания (OSM id), в т.ч. на стыках тайлов
      const parts = seed.id != null ? feats.filter((f) => f.id === seed.id) : [seed];
      footprints[v.id] = parts.map((f) => ({
        type: "Feature",
        properties: { id: v.id, color: CATS[v.type].color, h: Math.max(f.properties.render_height || 12, 6), base: f.properties.render_min_height || 0 },
        geometry: f.geometry,
      }));
      changed = true;
    });
    if (changed) refreshMapData();
  }

  function venueBuildingsData() {
    const feats = [];
    VENUES.filter(venueVisible).forEach((v) => (footprints[v.id] || []).forEach((f) => feats.push({
      ...f, properties: { ...f.properties, active: state.venue?.id === v.id || state.hover === v.id ? 1 : 0, stamped: hasStamp(v.id) ? 1 : 0 },
    })));
    return { type: "FeatureCollection", features: feats };
  }
  function circle([lng, lat], r, steps = 40) {
    const pts = [], dLat = r / 111320, dLng = r / (111320 * Math.cos((lat * Math.PI) / 180));
    for (let i = 0; i <= steps; i++) { const a = (i / steps) * Math.PI * 2; pts.push([lng + Math.cos(a) * dLng, lat + Math.sin(a) * dLat]); }
    return [pts];
  }
  const glowData = () => ({
    type: "FeatureCollection",
    features: VENUES.filter(venueVisible).map((v) => ({ type: "Feature", properties: { color: CATS[v.type].color, active: state.venue?.id === v.id ? 1 : 0 }, geometry: { type: "Point", coordinates: v.coords } })),
  });
  const beamData = () => ({
    type: "FeatureCollection",
    features: state.venue ? [{ type: "Feature", properties: { color: CATS[state.venue.type].color }, geometry: { type: "Polygon", coordinates: circle(state.venue.coords, 3) } }] : [],
  });
  const routeData = () => ({
    type: "FeatureCollection",
    features: !state.me ? [] : nearestVenues().slice(0, 3).map(({ v }) => ({ type: "Feature", properties: { color: CATS[v.type].color }, geometry: { type: "LineString", coordinates: [state.me.coords, v.coords] } })),
  });

  // Солнце по текущему времени: тени и свет на 3D-зданиях выглядят естественно
  function sunLight() {
    const h = new Date().getHours() + new Date().getMinutes() / 60;
    const az = (180 + (h - 12) * 15 + 360) % 360;
    const polar = Math.min(80, Math.max(25, 30 + Math.abs(h - 13) * 6));
    return { anchor: "map", color: "#fff4e0", intensity: 0.42, position: [1.4, az, polar] };
  }

  function addMaskOnly() {
    const dark = state.theme === "dark";
    const firstSymbol = map.getStyle().layers.find((l) => l.type === "symbol")?.id;
    if (map.getLayer("pk-mask")) map.removeLayer("pk-mask");
    map.addLayer({ id: "pk-mask", type: "fill", source: "pk-mask", paint: { "fill-color": dark ? "#0f1626" : "#ebe2d0", "fill-opacity": state.mapMode === "scheme" ? 0.88 : 0.72 } }, firstSymbol);
  }

  function addLayers() {
    const style = map.getStyle();
    const firstSymbol = style.layers.find((l) => l.type === "symbol")?.id;
    const mode = state.mapMode;
    const dark = state.theme === "dark" && mode === "scheme";
    srcName = Object.keys(style.sources).find((k) => style.sources[k].type === "vector") || "openmaptiles";

    if (mode === "sat") {
      map.addSource("pk-sat", {
        type: "raster", tileSize: 256, maxzoom: 19,
        tiles: ["https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"],
        attribution: "Снимки © Esri, Maxar, Earthstar Geographics",
      });
      map.addLayer({ id: "pk-sat", type: "raster", source: "pk-sat", paint: { "raster-saturation": -0.15, "raster-contrast": 0.08 } }, style.layers[1]?.id);
    }

    style.layers.forEach((l) => {
      const id = l.id;
      if (dark && l.type === "background") map.setPaintProperty(id, "background-color", "#131c2f");
      if (dark && l.type === "fill" && /water/i.test(id)) map.setPaintProperty(id, "fill-color", "#0b1120");
      if (!dark && mode === "scheme" && l.type === "background") map.setPaintProperty(id, "background-color", "#efe7d8");
      if (!dark && mode === "scheme" && l.type === "fill" && /water/i.test(id)) map.setPaintProperty(id, "fill-color", "#c9d6d6");
      if (l["source-layer"] === "building" || l.type === "fill-extrusion") map.setLayoutProperty(id, "visibility", "none");
      if (l.type === "symbol" && /poi|transit|airport|housenumber|aerialway|highway-shield|road_shield/i.test(id)) map.setLayoutProperty(id, "visibility", "none");
      // на спутнике оставляем только снимок и подписи
      if (mode === "sat" && l.type !== "symbol" && l.type !== "background" && id !== "pk-sat") map.setLayoutProperty(id, "visibility", "none");
      // подписи — по-русски
      if (l.type === "symbol" && l.layout && l.layout["text-field"]) {
        try { map.setLayoutProperty(id, "text-field", ["coalesce", ["get", "name:ru"], ["get", "name"]]); } catch (_) {}
        if (mode === "sat") { try { map.setPaintProperty(id, "text-color", "#ffffff"); map.setPaintProperty(id, "text-halo-color", "rgba(0,0,0,.75)"); } catch (_) {} }
      }
    });

    if (mode !== "sat") {
      const real = mode === "real";
      map.addLayer({
        id: "pk-buildings", type: "fill-extrusion", source: srcName, "source-layer": "building", minzoom: 12.5,
        filter: ["!=", ["get", "hide_3d"], true],
        paint: {
          "fill-extrusion-color": real
            ? ["coalesce", ["get", "colour"], ["interpolate", ["linear"], ["coalesce", ["get", "render_height"], 8], 0, "#ece4d8", 20, "#e2d9cb", 60, "#d6d0c8", 140, "#c8cdd3"]]
            : ["interpolate", ["linear"], ["coalesce", ["get", "render_height"], 8], 0, dark ? "#1d2840" : "#e6dccb", 40, dark ? "#24304b" : "#ddd2bf", 120, dark ? "#2c3956" : "#d2c6b1"],
          "fill-extrusion-height": ["interpolate", ["linear"], ["zoom"], 12.5, 0, 13.6, ["coalesce", ["get", "render_height"], 8]],
          "fill-extrusion-base": ["coalesce", ["get", "render_min_height"], 0],
          "fill-extrusion-opacity": real ? 1 : 0.94,
          "fill-extrusion-vertical-gradient": true,
        },
      }, firstSymbol);
    }

    map.addSource("pk-route", { type: "geojson", data: routeData() });
    map.addLayer({ id: "pk-route", type: "line", source: "pk-route", paint: { "line-color": mode === "sat" ? "#ffffff" : dark ? "#f3ecdf" : "#2a2118", "line-width": 1.6, "line-dasharray": [2, 2] } }, firstSymbol);

    map.addSource("pk-mask", { type: "geojson", data: maskData });
    addMaskOnly();
    map.addSource("pk-frame", { type: "geojson", data: frameData });
    map.addLayer({ id: "pk-frame", type: "line", source: "pk-frame", paint: { "line-color": mode === "sat" ? "#ffffff" : dark ? "#f3ecdf" : "#2a2118", "line-width": 1, "line-opacity": 0.35 } });

    try { map.setLight(sunLight()); } catch (_) {}
    try {
      const sky = mode === "scheme"
        ? { c: dark ? "#0f1626" : "#ebe2d0", h: dark ? "#0f1626" : "#ebe2d0", f: dark ? "#0f1626" : "#ebe2d0" }
        : { c: "#9fbedb", h: "#e9eef2", f: "#e9eef2" };
      map.setSky?.({ "sky-color": sky.c, "horizon-color": sky.h, "fog-color": sky.f, "sky-horizon-blend": 0.5, "horizon-fog-blend": 0.4, "fog-ground-blend": 0.85 });
    } catch (_) {}
  }

  function refreshMapData() {
    map.getSource("pk-route")?.setData(routeData());
  }

  map.on("style.load", addLayers);
  let introDone = false;
  map.once("style.load", () => setTimeout(() => $("#loader").classList.add("hide"), 500));
  map.once("load", () => {
    $("#loader").classList.add("hide");
    const fromHash = location.hash.match(/venue=([\w-]+)/)?.[1];
    if (fromHash && byId[fromHash]) { introDone = true; return selectVenue(byId[fromHash]); }
    map.easeTo({ ...homeView(), padding: basePadding(), duration: 3200, easing: (t) => 1 - Math.pow(1 - t, 3) });
    map.once("moveend", () => (introDone = true));
  });
  setTimeout(() => $("#loader").classList.add("hide"), 4000);
  map.on("zoom", () => document.body.classList.toggle("map-zoomed", map.getZoom() > 15.3));

  // ---------- Маркеры ----------
  const markers = {};
  VENUES.forEach((v) => {
    const el = document.createElement("div");
    el.className = "marker";
    el.style.setProperty("--c", CATS[v.type].color);
    const today = v.events.reduce((n, id) => n + v.sessions[id].filter((s) => sameDay(s.date, new Date()) && s.date > new Date()).length, 0);
    el.innerHTML = `<div class="marker-dot"></div><div class="marker-pin"><i>${icon(v.type, 15)}</i><span>${esc(v.type === "cinema" ? v.place : v.name)}</span>${today ? `<em title="Сеансов сегодня">${today}</em>` : ""}</div>`;
    el.addEventListener("click", (e) => { e.stopPropagation(); selectVenue(v); });
    markers[v.id] = { el, m: new maplibregl.Marker({ element: el, anchor: "center" }).setLngLat(v.coords).addTo(map) };
  });
  let meMarker = null;

  // ---------- Шторки для телефона ----------
  const TOP_GAP = () => 66 + (parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--sat")) || 0);
  function makeSheet(el, { snaps, grips, onClose }) {
    const sh = { el, snap: 0 };
    const full = () => el.getBoundingClientRect().height || window.innerHeight - TOP_GAP();
    sh.heights = () => snaps().map((f) => Math.min(full(), typeof f === "function" ? f() : f));
    sh.set = (h, animate = true) => {
      el.classList.toggle("dragging", !animate);
      el.style.setProperty("--vis", `${h}px`);
      el.style.setProperty("--hidden", `${Math.max(0, full() - h)}px`);
    };
    sh.to = (i) => { const hs = sh.heights(); sh.snap = Math.max(0, Math.min(hs.length - 1, i)); sh.set(hs[sh.snap]); sh.onSnap?.(hs[sh.snap]); };
    sh.vis = () => sh.heights()[sh.snap];

    let startY = 0, startH = 0, dragging = false, tracking = false, fromBody = null;
    const onStart = (e, body) => {
      if (!isMobile()) return;
      const t = e.touches[0];
      if (body && body.scrollTop > 2) return; // список прокручен — даём ему скроллиться
      if (e.target.closest("input, .chips")) return;
      tracking = true; dragging = false; fromBody = body;
      startY = t.clientY; startH = sh.vis();
    };
    const onMove = (e) => {
      if (!tracking) return;
      const dy = e.touches[0].clientY - startY;
      if (!dragging) {
        if (Math.abs(dy) < 8) return;
        if (fromBody && (dy < 0 || fromBody.scrollTop > 2)) { tracking = false; return; } // вверх по списку = обычный скролл
        dragging = true;
      }
      e.preventDefault();
      const hs = sh.heights();
      sh.set(Math.max(hs[0] * 0.5, Math.min(full(), startH - dy)), false);
    };
    const onEnd = (e) => {
      if (!tracking) return;
      tracking = false;
      if (!dragging) return;
      e.preventDefault();
      const dy = (e.changedTouches[0]?.clientY ?? startY) - startY;
      const cur = startH - dy, hs = sh.heights();
      if (onClose && cur < hs[0] - 90) { el.classList.remove("dragging"); return onClose(); }
      // ближайшая точка с учётом направления жеста
      let idx = hs.reduce((b, h, i) => (Math.abs(h - cur) < Math.abs(hs[b] - cur) ? i : b), 0);
      if (Math.abs(dy) > 40 && idx === sh.snap) idx += dy < 0 ? 1 : -1;
      sh.to(idx);
    };
    grips.forEach((g) => {
      const body = g.classList.contains("panel-body") || g.classList.contains("venue-body") ? g : null;
      g.addEventListener("touchstart", (e) => onStart(e, body), { passive: true });
      g.addEventListener("touchmove", onMove, { passive: false });
      g.addEventListener("touchend", onEnd, { passive: false });
      g.addEventListener("touchcancel", onEnd, { passive: false });
    });
    return sh;
  }

  const PEEK = () => $("#panel-head").offsetHeight + 26 + 8;
  const panelSheet = makeSheet($("#panel"), {
    snaps: () => [PEEK(), Math.round(window.innerHeight * 0.5), Infinity],
    grips: [$("#panel-handle"), $("#panel-head"), $("#list")],
  });
  const venueSheet = makeSheet($("#venue"), {
    snaps: () => [Math.round(window.innerHeight * 0.58), Infinity],
    grips: [$("#venue-grip"), $("#venue-hero"), $("#venue-tabs"), $("#venue-body")],
    onClose: () => closeVenue(),
  });
  // при смене положения шторки списка — подвинуть «центр» карты
  panelSheet.onSnap = (h) => { if (isMobile() && !state.venue) map.easeTo({ padding: { ...basePadding(false), bottom: Math.min(h, window.innerHeight * 0.6) }, duration: 450 }); };
  function initSheets() { if (isMobile()) { panelSheet.to(panelSheet.snap); if (state.venue) venueSheet.to(venueSheet.snap); } }
  window.addEventListener("resize", () => { clearTimeout(initSheets.t); initSheets.t = setTimeout(initSheets, 150); });
  requestAnimationFrame(initSheets);

  // ---------- Камера ----------
  function basePadding(withVenue = false) {
    if (isMobile()) return { top: 70, bottom: withVenue ? Math.round(window.innerHeight * 0.58) : (panelSheet?.vis?.() || 170), left: 28, right: 28 };
    return { top: 90, bottom: 30, left: 420, right: withVenue ? 480 : 30 };
  }
  function stopOrbit() { if (state.orbit) cancelAnimationFrame(state.orbit); state.orbit = null; }
  function startOrbit() {
    stopOrbit();
    let last = performance.now();
    const tick = (now) => { const dt = Math.min(64, now - last); last = now; map.setBearing(map.getBearing() + dt * 0.003); state.orbit = requestAnimationFrame(tick); };
    state.orbit = requestAnimationFrame(tick);
  }
  ["mousedown", "touchstart", "wheel"].forEach((ev) => map.getCanvasContainer().addEventListener(ev, stopOrbit, { passive: true }));

  // ---------- Панель ----------
  function renderChips() {
    const chips = [{ id: "all", label: "Все", color: "var(--text)" }, ...Object.entries(CATS).map(([id, c]) => ({ id, label: c.label, color: c.color }))];
    $("#chips").innerHTML = chips.map((c) => `<button class="chip ${state.cat === c.id ? "active" : ""}" data-cat="${c.id}"><span class="dot" style="background:${c.color}"></span>${c.label}</button>`).join("");
  }
  $("#chips").addEventListener("click", (e) => { const b = e.target.closest("[data-cat]"); if (b) { state.cat = b.dataset.cat; renderAll(); } });

  $("#mode").addEventListener("click", (e) => {
    const b = e.target.closest("[data-mode]"); if (!b) return;
    state.mode = b.dataset.mode;
    [...$("#mode").children].forEach((x) => x.classList.toggle("active", x === b));
    $("#search-wrap").hidden = state.mode === "near";
    $("#near-box").hidden = state.mode !== "near";
    if (isMobile() && panelSheet.snap === 0) panelSheet.to(1);
    if (state.mode === "near" && !state.me) setTimeout(() => $("#address").focus(), 50);
    renderAll();
  });

  let searchT;
  $("#search").addEventListener("input", (e) => {
    clearTimeout(searchT);
    searchT = setTimeout(() => { state.query = e.target.value.trim().toLowerCase(); renderAll(); }, 120);
  });

  const nearestVenues = () => !state.me ? [] :
    VENUES.filter(venueVisible).map((v) => ({ v, km: haversine(state.me.coords, v.coords) })).sort((a, b) => a.km - b.km);
  const nextSessionAt = (v) => v.events.flatMap((id) => upcoming(v, id).map((s) => ({ ...s, id }))).sort((a, b) => a.date - b.date)[0];

  function renderList() {
    const list = $("#list");
    let i = 0;
    const delay = () => `animation-delay:${Math.min(i++ * 22, 380)}ms`;
    const mark = (v) => (hasStamp(v.id) ? ' <span class="stamped-mark" title="Штамп получен">●</span>' : "");

    if (state.mode === "near") {
      if (!state.me) {
        list.innerHTML = `<div class="empty"><span class="serif">Что рядом с вами</span>Напишите адрес или нажмите «Определить моё местоположение». Покажем, куда ближе всего идти.</div>`;
        return;
      }
      list.innerHTML = `<div class="group-title">Ближайшие<small>${esc(state.me.label)}</small></div>` + nearestVenues().map(({ v, km }) => {
        const nx = nextSessionAt(v);
        return `<button class="row ${state.venue?.id === v.id ? "active" : ""}" data-venue="${v.id}" style="${delay()}">
          ${ico(v.type)}
          <div class="row-main"><div class="row-title">${esc(v.name)}${mark(v)}</div>
          <div class="row-sub">${nx ? `${esc(EVENTS[nx.id].title)} · ${sameDay(nx.date, new Date()) ? "сегодня" : fmtDay(nx.date)} в ${fmtTime(nx.date)}` : esc(v.place)}</div></div>
          <div class="row-side"><b>${fmtDist(km)}</b>${travel(km)}</div>
        </button>`;
      }).join("");
      return;
    }

    if (state.mode === "places") {
      const groups = Object.keys(CATS).map((cat) => [cat, VENUES.filter((v) => v.type === cat && venueVisible(v))]).filter(([, a]) => a.length);
      if (!groups.length) { list.innerHTML = `<div class="empty"><span class="serif">Ничего не нашлось</span>Попробуйте другой запрос.</div>`; return; }
      list.innerHTML = groups.map(([cat, arr]) => `
        <div class="group-title">${CATS[cat].label}<small>${arr.length}</small></div>
        ${arr.map((v) => `
          <button class="row ${state.venue?.id === v.id ? "active" : ""}" data-venue="${v.id}" style="${delay()}">
            ${ico(cat)}
            <div class="row-main"><div class="row-title">${esc(v.name)}${mark(v)}</div><div class="row-sub">${esc(v.place)} · ${esc(v.address)}</div></div>
            <div class="row-side"><b>${v.events.length}</b>${plural(v.events.length, "событие", "события", "событий")}</div>
          </button>`).join("")}`).join("");
      return;
    }

    const evs = Object.entries(EVENTS).filter(([, ev]) => (state.cat === "all" || ev.type === state.cat) && matchesQuery(ev.title + " " + ev.genre));
    if (!evs.length) { list.innerHTML = `<div class="empty"><span class="serif">Ничего не нашлось</span>Попробуйте другой запрос.</div>`; return; }
    const groups = Object.keys(CATS).map((cat) => [cat, evs.filter(([, e]) => e.type === cat)]).filter(([, a]) => a.length);
    list.innerHTML = groups.map(([cat, arr]) => `
      <div class="group-title">${CATS[cat].label}<small>${arr.length}</small></div>
      ${arr.map(([id, ev]) => {
        const places = VENUES.filter((v) => v.events.includes(id));
        const prices = places.flatMap((v) => upcoming(v, id).map((s) => s.price));
        return `<button class="row" data-event="${id}" style="${delay()}">
          ${poster(ev, "xs")}
          <div class="row-main"><div class="row-title">${esc(ev.title)}</div>
          <div class="row-sub">${esc(ev.genre)} · ${places.length} ${plural(places.length, "площадка", "площадки", "площадок")}</div></div>
          <div class="row-side"><b>${ev.rating.toFixed(1)}</b>${prices.length ? `от ${Math.min(...prices)} ₽` : ""}</div>
        </button>`;
      }).join("")}`).join("");
  }

  $("#list").addEventListener("click", (e) => {
    const v = e.target.closest("[data-venue]"); if (v) return selectVenue(byId[v.dataset.venue]);
    const ev = e.target.closest("[data-event]"); if (ev) openEvent(ev.dataset.event);
  });

  function renderMarkers() {
    VENUES.forEach((v) => {
      const { el } = markers[v.id];
      el.classList.toggle("dim", !venueVisible(v));
      el.classList.toggle("active", state.venue?.id === v.id);
      el.classList.toggle("stamped", hasStamp(v.id));
    });
  }
  function renderPassportCount(bump = false) {
    const n = stampedVenues().length, el = $("#passport-count");
    el.textContent = n >= STAMPS_GOAL ? `✓ ${n}` : `${n}/${STAMPS_GOAL}`;
    if (bump) { el.classList.remove("bump"); void el.offsetWidth; el.classList.add("bump"); }
  }
  function renderAll() { renderChips(); renderList(); renderMarkers(); refreshMapData(); renderPassportCount(); }

  // ---------- Рядом со мной (геокодер Photon на данных OSM) ----------
  let addrT, addrCtl;
  $("#address").addEventListener("input", (e) => {
    clearTimeout(addrT);
    const q = e.target.value.trim();
    if (q.length < 3) { $("#suggest").innerHTML = ""; return; }
    addrT = setTimeout(() => geocode(q), 300);
  });
  async function geocode(q) {
    addrCtl?.abort(); addrCtl = new AbortController();
    const query = /казан/i.test(q) ? q : `${q}, Казань`;
    const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=6&lat=55.79&lon=49.12&bbox=48.85,55.65,49.35,55.95`;
    try {
      const data = await (await fetch(url, { signal: addrCtl.signal })).json();
      const items = (data.features || []).filter((f) => f.geometry?.coordinates);
      if (!items.length) { $("#suggest").innerHTML = `<button disabled>Адрес не найден</button>`; return; }
      $("#suggest").innerHTML = items.map((f, i) => {
        const p = f.properties;
        const title = [p.street || p.name, p.housenumber].filter(Boolean).join(", ") || p.name || "Точка на карте";
        const sub = [p.name && p.street ? p.name : null, p.district, p.city].filter(Boolean).join(" · ");
        return `<button data-i="${i}">${esc(title)}<small>${esc(sub)}</small></button>`;
      }).join("");
      $("#suggest").onclick = (ev) => {
        const b = ev.target.closest("[data-i]"); if (!b) return;
        const f = items[+b.dataset.i], p = f.properties;
        const label = [p.street || p.name, p.housenumber].filter(Boolean).join(", ");
        $("#address").value = label; $("#suggest").innerHTML = "";
        setMe(f.geometry.coordinates, label);
      };
    } catch (err) { if (err.name !== "AbortError") $("#suggest").innerHTML = `<button disabled>Сервис адресов недоступен</button>`; }
  }
  $("#geolocate").addEventListener("click", () => {
    if (!navigator.geolocation) return toast("Геолокация недоступна в этом браузере");
    toast("Определяем местоположение…");
    navigator.geolocation.getCurrentPosition(
      (pos) => setMe([pos.coords.longitude, pos.coords.latitude], "Моё местоположение"),
      () => toast("Не получилось определить, где вы. Напишите адрес"),
      { enableHighAccuracy: true, timeout: 8000 },
    );
  });

  function setMe(coords, label) {
    state.me = { coords, label };
    if (!meMarker) { const el = document.createElement("div"); el.className = "me-marker"; meMarker = new maplibregl.Marker({ element: el }).setLngLat(coords).addTo(map); }
    else meMarker.setLngLat(coords);
    if (state.venue) closeVenue(true);
    renderAll();
    const b = new maplibregl.LngLatBounds(coords, coords);
    nearestVenues().slice(0, 3).forEach(({ v }) => b.extend(v.coords));
    stopOrbit();
    if (isMobile()) { $("#address").blur(); panelSheet.to(1); }
    map.fitBounds(b, { padding: isMobile() ? { top: 90, bottom: Math.round(window.innerHeight * 0.5) + 20, left: 40, right: 60 } : { top: 150, bottom: 110, left: 470, right: 120 }, pitch: 50, maxZoom: 15.5, duration: 2200 });
  }

  // ---------- Площадка ----------
  function selectVenue(v) {
    if (!v) return;
    state.venue = v;
    // открываем первый день, где ещё есть сеансы
    const now = new Date();
    state.day = Math.max(0, [...Array(7).keys()].find((i) => v.events.some((id) => v.sessions[id].some((x) => sameDay(x.date, dayDate(i)) && x.date > now))) ?? 0);
    history.replaceState(null, "", `#venue=${v.id}`);
    renderVenue();
    $("#venue").classList.add("open"); $("#venue").setAttribute("aria-hidden", "false");
    document.body.classList.add("venue-open");
    if (isMobile()) { $("#panel").classList.add("away"); $("#search").blur(); venueSheet.to(0); }
    renderList(); renderMarkers(); refreshMapData();
    stopOrbit();
    map.flyTo({ center: v.coords, zoom: 16.7, pitch: 64, bearing: map.getBearing() + (introDone ? 35 : 0) - 10, padding: basePadding(true), speed: 0.85, curve: 1.5, essential: true });
    map.once("moveend", () => { if (state.venue === v) startOrbit(); });
  }
  function closeVenue(silent = false) {
    state.venue = null; stopOrbit();
    history.replaceState(null, "", location.pathname + location.search);
    $("#venue").classList.remove("open"); $("#venue").setAttribute("aria-hidden", "true");
    document.body.classList.remove("venue-open");
    $("#panel").classList.remove("away");
    renderList(); renderMarkers(); refreshMapData();
    if (!silent) map.easeTo({ zoom: 14.4, pitch: 56, padding: basePadding(false), duration: 1400 });
  }
  $("#venue-close").addEventListener("click", () => closeVenue());

  function renderVenue() {
    const v = state.venue, cat = CATS[v.type];
    const route = `https://yandex.ru/maps/?rtext=${state.me ? state.me.coords[1] + "," + state.me.coords[0] : ""}~${v.coords[1]},${v.coords[0]}&rtt=mt`;
    const km = state.me ? haversine(state.me.coords, v.coords) : null;
    $("#venue-hero").style.setProperty("--hero", `linear-gradient(115deg, #121a2c 38%, ${cat.color}66 130%)`);
    const collage = v.events.slice(0, 3).map((id, i) => `<div class="collage-card" style="--c:${cat.color};--i:${i}">${icon(v.type, 30)}</div>`).join("");
    $("#venue-hero").innerHTML = `<div class="collage">${collage}</div>`;
    $("#venue-hero").innerHTML += `
      <div class="kicker">${cat.label} · ${esc(v.place)}</div>
      <div class="venue-name">${esc(v.name)}</div>
      <div class="venue-addr">${esc(v.address)}${km != null ? ` · ${fmtDist(km)} от вас` : ""}</div>
      <div class="venue-meta">${v.tags.map((t) => `<span class="tag">${esc(t)}</span>`).join("")}
        ${hasStamp(v.id) ? `<span class="stamp-chip">${SEAL(14)} Штамп получен</span>` : ""}</div>
      <div class="hero-actions">
        <a class="btn ghost-light" href="${route}" target="_blank" rel="noopener">Маршрут</a>
        ${v.site ? `<a class="btn ghost-light" href="${v.site}" target="_blank" rel="noopener">Сайт площадки</a>` : ""}
      </div>`;
    $("#venue-tabs").innerHTML = Array.from({ length: 7 }, (_, i) => {
      const d = dayDate(i);
      const has = v.events.some((e) => v.sessions[e].some((s) => sameDay(s.date, d) && s.date > new Date()));
      return `<button class="day ${state.day === i ? "active" : ""} ${has ? "" : "off"}" data-day="${i}"><b>${d.getDate()}</b>${dayLabel(i)}</button>`;
    }).join("");
    renderVenueBody();
  }
  $("#venue-tabs").addEventListener("click", (e) => {
    const b = e.target.closest("[data-day]"); if (!b) return;
    state.day = +b.dataset.day;
    [...$("#venue-tabs").children].forEach((x) => x.classList.toggle("active", x === b));
    renderVenueBody();
  });

  const timeBtn = (v, id, s, withDay = false) =>
    `<button class="time" data-buy="${v.id}|${id}|${s.date.getTime()}">${withDay ? s.date.toLocaleDateString("ru-RU", { day: "numeric", month: "short" }).replace(".", "") + ", " : ""}${fmtTime(s.date)}<small>${s.price} ₽</small></button>`;

  function renderVenueBody() {
    const v = state.venue, d = dayDate(state.day), now = new Date();
    const items = v.events.map((id) => [id, EVENTS[id], v.sessions[id].filter((s) => sameDay(s.date, d) && s.date > now)]).sort((a, b) => b[2].length - a[2].length);
    $("#venue-body").innerHTML = items.map(([id, ev, ss], i) => `
      <div class="tkt" style="animation-delay:${i * 45}ms;--c:${CATS[ev.type].color}">
        <div class="tkt-stub" data-event="${id}">${icon(ev.type, 26)}<b>${ev.age}</b><small>${dur(ev.duration)}</small></div>
        <div class="tkt-main">
          <div class="card-title" data-event="${id}">${esc(ev.title)}</div>
          <div class="card-meta"><span class="score-inline">${STAR}${ev.rating.toFixed(1)}</span><span>${esc(ev.genre)}</span></div>
          ${ss.length ? `<div class="times">${ss.slice(0, 6).map((s) => timeBtn(v, id, s)).join("")}</div>` : `<div class="no-times">Нет сеансов в этот день</div>`}
        </div>
      </div>`).join("");
    $("#venue-body").scrollTop = 0;
  }
  $("#venue-body").addEventListener("click", (e) => {
    const t = e.target.closest("[data-buy]"); if (t) return openCheckout(...t.dataset.buy.split("|"));
    const c = e.target.closest("[data-event]"); if (c) openEvent(c.dataset.event, state.venue);
  });

  // ---------- Карточка события ----------
  function openEvent(id, venue = null) {
    const ev = EVENTS[id];
    state.currentEvent = id;
    const places = venue ? [venue, ...VENUES.filter((v) => v !== venue && v.events.includes(id))] : VENUES.filter((v) => v.events.includes(id));
    if (state.me) places.sort((a, b) => (a === venue ? -1 : b === venue ? 1 : haversine(state.me.coords, a.coords) - haversine(state.me.coords, b.coords)));
    const stars = Math.round(ev.rating / 2);
    const ytSearch = `https://www.youtube.com/results?search_query=${encodeURIComponent(ev.title + " " + (ev.type === "cinema" ? "трейлер" : "Казань"))}`;
    const first = places.map((v) => [v, upcoming(v, id)[0]]).find(([, s]) => s);
    const prices = places.flatMap((v) => upcoming(v, id).map((s) => s.price));

    $("#modal-content").innerHTML = `
      <div class="ev-hero" style="--hero:linear-gradient(115deg, ${CATS[ev.type].color} 0%, ${CATS[ev.type].color}66 35%, #121a2c 78%)">
        ${poster(ev, "lg")}
        <div class="ev-info">
          <span class="ev-pk">Принимается Пушкинская карта</span>
          <h2 class="ev-title">${esc(ev.title)}</h2>
          <div class="ev-meta"><span>${CATS[ev.type].label}</span><span>${esc(ev.genre)}</span><span>${ev.age}</span><span>${dur(ev.duration)}</span></div>
          <div class="score"><b>${ev.rating.toFixed(1)}</b>
            <div><div class="stars">${Array.from({ length: 5 }, (_, i) => `<span class="${i < stars ? "on" : ""}">${STAR}</span>`).join("")}</div>
            <small>${ev.votes.toLocaleString("ru-RU")} оценок зрителей</small></div></div>
          <div class="ev-actions">
            ${first ? `<button class="btn gold" data-buy="${first[0].id}|${id}|${first[1].date.getTime()}">Купить билет · от ${Math.min(...prices)} ₽</button>` : ""}
            ${ev.trailer ? `<button class="btn ghost-light" data-play>Смотреть трейлер</button>` : `<a class="btn ghost-light" href="${ytSearch}" target="_blank" rel="noopener">${ev.type === "cinema" ? "Трейлер" : "Видео"} на YouTube</a>`}
          </div>
        </div>
      </div>
      <div class="ev-body">
        <div id="trailer-slot"></div>
        <div><div class="label">О событии</div><p>${esc(ev.description)}</p></div>
        <div><div class="label">Где посмотреть · ${places.length}</div>
          ${places.map((v) => `<div class="where-row">
              ${ico(v.type)}
              <div class="row-main"><div class="row-title">${esc(v.name)}</div><div class="row-sub">${esc(v.place)}${state.me ? " · " + fmtDist(haversine(state.me.coords, v.coords)) : ""}</div>
              ${venue === v ? "" : `<button class="goto" data-goto="${v.id}">Показать на карте →</button>`}</div>
              <div class="times">${upcoming(v, id).slice(0, 4).map((s) => timeBtn(v, id, s, true)).join("")}</div>
            </div>`).join("")}
        </div>
        <p class="note">Рейтинг, сеансы и цены пока примерные. Оплату Пушкинской картой уточняйте при покупке.</p>
      </div>`;
    openModal();
  }

  $("#modal-content").addEventListener("click", (e) => {
    if (e.target.closest("[data-play]")) {
      const id = EVENTS[state.currentEvent]?.trailer;
      $("#trailer-slot").innerHTML = `<div class="trailer"><iframe src="https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}?autoplay=1&rel=0" allow="autoplay; encrypted-media; fullscreen" allowfullscreen></iframe></div>`;
      $("#trailer-slot").scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
    const buy = e.target.closest("[data-buy]"); if (buy) return openCheckout(...buy.dataset.buy.split("|"));
    const g = e.target.closest("[data-goto]"); if (g) { closeModal(); selectVenue(byId[g.dataset.goto]); }
    const act = e.target.closest("[data-action]"); if (act) actions[act.dataset.action]?.(act);
  });

  // ---------- Покупка + штамп ----------
  const checkout = { qty: 1 };
  function openCheckout(venueId, eventId, ts) {
    const v = byId[venueId], ev = EVENTS[eventId];
    const s = v.sessions[eventId].find((x) => x.date.getTime() === +ts);
    if (!s) return;
    Object.assign(checkout, { v, ev, eventId, s, qty: 1 });
    const fresh = !hasStamp(v.id);
    const left = Math.max(0, STAMPS_GOAL - stampedVenues().length - (fresh ? 1 : 0));
    $("#modal-content").innerHTML = `
      <div class="checkout">
        <div><div class="label">Оформление билета</div><h2>Пушкинская карта</h2></div>
        <div class="ticket">
          <div class="ticket-main">
            <span class="pk">${CATS[ev.type].label} · ${ev.age}</span>
            <div class="t-title">${esc(ev.title)}</div>
            <div class="t-sub">${esc(v.name)} · ${esc(v.address)}</div>
            <div class="t-sub">${fmtDay(s.date)}, ${s.date.toLocaleDateString("ru-RU", { weekday: "long" })} · ${fmtTime(s.date)}</div>
          </div>
          <div class="ticket-side"><b id="co-total">${s.price} ₽</b><small>${s.price} ₽ × <span id="co-q">1</span></small></div>
        </div>
        <div class="qty"><span>Количество билетов</span>
          <div class="qty-ctrl"><button data-action="minus">−</button><span id="co-qty">1</span><button data-action="plus">+</button></div></div>
        <div class="perk">${SEAL()}<div>${fresh
          ? `За покупку вы получите <b>штамп «${esc(v.name)}»</b> в культурный паспорт. ${left ? `До розыгрыша осталось ${left} ${plural(left, "место", "места", "мест")}.` : "Это пятое место, после покупки вы участвуете в розыгрыше."}`
          : "Штамп этого места уже есть в паспорте. Чтобы приблизиться к розыгрышу, выберите новое место."}</div></div>
        <button class="btn gold block" data-action="pay">Оплатить Пушкинской картой</button>
        <p class="note">Демо-режим: деньги не списываются. В рабочей версии здесь будет платёжный виджет билетного оператора, а штамп начисляется после подтверждения покупки.</p>
      </div>`;
    $(".modal-card").classList.add("narrow");
    openModal(true);
  }
  const actions = {
    plus() { checkout.qty = Math.min(4, checkout.qty + 1); updQty(); },
    minus() { checkout.qty = Math.max(1, checkout.qty - 1); updQty(); },
    pay(btn) {
      btn.disabled = true; btn.textContent = "Оплачено";
      $("#modal-content .ticket")?.classList.add("tearing");
      setTimeout(() => {
        const fresh = !hasStamp(checkout.v.id);
        state.stamps.push({ venue: checkout.v.id, event: checkout.eventId, date: checkout.s.date.toISOString(), ts: Date.now() });
        store.set("pk-stamps", state.stamps);
        renderAll(); renderPassportCount(true);
        if (state.venue) renderVenue();
        openPassport(fresh ? checkout.v.id : null, true);
      }, 1300);
    },
    reset() {
      if (!confirm("Очистить паспорт? Все штампы будут удалены.")) return;
      state.stamps = []; store.set("pk-stamps", []); store.set("pk-draw-code", null);
      renderAll(); if (state.venue) renderVenue(); openPassport();
    },
  };
  function updQty() {
    $("#co-qty").textContent = checkout.qty; $("#co-q").textContent = checkout.qty;
    $("#co-total").textContent = `${checkout.s.price * checkout.qty} ₽`;
  }

  // ---------- Культурный паспорт ----------
  function stampSVG(v, i) {
    const name = v.name.replace(/[«»"]/g, "").toUpperCase();
    const short = name.length > 24 ? name.slice(0, 23) + "…" : name;
    const date = new Date(state.stamps.find((s) => s.venue === v.id).ts).toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "2-digit" });
    const id = `arc-${v.id}`;
    return `<svg class="stamp" viewBox="0 0 100 100" style="--c:var(--accent);--r:${[-9, 6, -4, 11, -13][i % 5]}deg">
      <defs><path id="${id}" d="M50 50 m-36 0 a36 36 0 1 1 72 0 a36 36 0 1 1 -72 0"/></defs>
      <circle cx="50" cy="50" r="46" fill="none" stroke="currentColor" stroke-width="1.6"/>
      <circle cx="50" cy="50" r="42" fill="none" stroke="currentColor" stroke-width=".7"/>
      <circle cx="50" cy="50" r="27" fill="none" stroke="currentColor" stroke-width=".7"/>
      <text><textPath href="#${id}">${esc(short)} · КАЗАНЬ ·</textPath></text>
      <g transform="translate(38 31)" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${ICONS[v.type]}</g>
      <text x="50" y="66" text-anchor="middle" class="big" style="font-size:8.5px;letter-spacing:1px">${date}</text>
    </svg>`;
  }

  function openPassport(newVenue = null, celebrate = false) {
    const venues = stampedVenues();
    const n = venues.length, done = n >= STAMPS_GOAL;
    let code = store.get("pk-draw-code", null);
    if (done && !code) { code = "PK-" + Math.random().toString(36).slice(2, 6).toUpperCase() + "-" + String(Date.now()).slice(-4); store.set("pk-draw-code", code); }
    const slots = Array.from({ length: STAMPS_GOAL }, (_, i) => {
      const v = byId[venues[i]];
      return v ? `<div class="slot filled ${v.id === newVenue ? "new" : ""}" title="${esc(v.name)}">${stampSVG(v, i)}</div>` : `<div class="slot">${i + 1}</div>`;
    }).join("");
    $("#modal-content").innerHTML = `
      <div class="passport">
        <div class="passport-head">
          <div><div class="label">${celebrate ? (newVenue ? "Билет оформлен · новый штамп" : "Билет оформлен") : "Ваш прогресс"}</div><h2>Культурный паспорт</h2></div>
          <div style="font-family:var(--serif);font-size:40px;font-weight:600;line-height:1">${Math.min(n, STAMPS_GOAL)}<span style="color:var(--muted);font-size:24px">/${STAMPS_GOAL}</span></div>
        </div>
        <div class="progress"><i style="width:${(Math.min(n, STAMPS_GOAL) / STAMPS_GOAL) * 100}%"></i></div>
        <div class="slots">${slots}</div>
        ${n > STAMPS_GOAL ? `<div><div class="label">Ещё штампы</div><div class="extra-stamps">${venues.slice(STAMPS_GOAL).map((id) => `<span>${esc(byId[id].name)}</span>`).join("")}</div></div>` : ""}
        ${done
          ? `<div class="draw"><span class="pk">Вы в розыгрыше</span><b>Пять мест собрано</b><span class="note" style="color:inherit">Ваш номер участника:</span><code>${code}</code><span class="note">Итоги подводим в последний день месяца.</span></div>`
          : `<p class="note" style="font-size:13.5px">Осталось ${STAMPS_GOAL - n} ${plural(STAMPS_GOAL - n, "место", "места", "мест")}, и вы участвуете в розыгрыше. Он проходит каждый месяц.</p>`}
        <div><div class="label">Как это работает</div>
          <ol class="rules">
            <li>Покупайте билеты по Пушкинской карте через этот сайт.</li>
            <li>За каждое новое место (кинотеатр, театр, музей, концертный зал) в паспорт ставится штамп.</li>
            <li>Пять штампов из разных мест, и вы в розыгрыше. Места со штампом видно на карте.</li>
          </ol></div>
        <div class="ev-actions">
          ${n ? `<button class="btn line" data-action="reset">Очистить (демо)</button>` : `<button class="btn gold" data-close>Выбрать место на карте</button>`}
        </div>
      </div>`;
    $(".modal-card").classList.add("narrow");
    openModal(true);
    if (celebrate) toast(newVenue ? `Штамп «${byId[newVenue].name}» добавлен в паспорт` : "Билет оформлен");
  }
  $("#btn-passport").addEventListener("click", () => openPassport());

  // ---------- Модальное окно ----------
  function openModal(narrow = false) {
    $(".modal-card").classList.toggle("narrow", narrow);
    $("#modal").classList.add("open"); $("#modal").setAttribute("aria-hidden", "false"); $("#modal-content").scrollTop = 0;
  }
  function closeModal() {
    $("#modal").classList.remove("open"); $("#modal").setAttribute("aria-hidden", "true");
    setTimeout(() => { if (!$("#modal").classList.contains("open")) $("#modal-content").innerHTML = ""; }, 450);
  }
  $("#modal").addEventListener("click", (e) => { if (e.target.closest("[data-close]")) closeModal(); });
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    if ($("#modal").classList.contains("open")) closeModal(); else if (state.venue) closeVenue();
  });

  let toastT;
  function toast(msg) {
    const t = $("#toast");
    t.innerHTML = `${SEAL(18)}<span>${esc(msg)}</span>`;
    t.classList.add("show"); clearTimeout(toastT);
    toastT = setTimeout(() => t.classList.remove("show"), 3200);
  }

  // ---------- О программе ----------
  $("#btn-about").addEventListener("click", () => {
    $("#modal-content").innerHTML = `
      <div class="about">
        <div><div class="label">О программе</div><h2>Пушкинская карта</h2></div>
        <p>Государственная программа для молодёжи от 14 до 22 лет: на карту зачисляются деньги, которые можно потратить на билеты в кино, театры, музеи и на концерты. Актуальный годовой лимит указан в приложении «Госуслуги Культура».</p>
        <div class="facts">
          <div class="fact"><b>${VENUES.length}</b><span>площадок на карте</span></div>
          <div class="fact"><b>${Object.keys(EVENTS).length}</b><span>событий в афише</span></div>
          <div class="fact"><b>14–22</b><span>возраст участников</span></div>
        </div>
        <div><div class="label">Как получить и потратить</div>
        <ol class="rules">
          <li>Скачайте «Госуслуги Культура» и войдите через учётную запись Госуслуг.</li>
          <li>Оформите виртуальную карту или пластиковую в банке-партнёре.</li>
          <li>Выберите событие на карте Казани и нажмите «Купить билет».</li>
          <li>В кино картой можно оплатить только фильмы с отметкой программы.</li>
        </ol></div>
        <p class="note">Адреса площадок взяты из открытых источников. Рейтинги, сеансы и цены пока примерные.</p>
        <a class="btn gold" style="width:fit-content" href="https://www.culture.ru/pushkinskaya-karta" target="_blank" rel="noopener">Подробнее на culture.ru</a>
      </div>`;
    openModal(true);
  });

  // ---------- Управление ----------
  $("#btn-theme").addEventListener("click", () => {
    state.theme = state.theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = state.theme;
    store.set("pk-theme", state.theme);
    if (state.mapMode === "scheme") map.setStyle(styleFor(), { diff: false });
    else { map.removeLayer?.("pk-mask"); addMaskOnly(); }
  });
  // переключатель режима карты
  function renderMapMode() {
    $("#map-mode").innerHTML = Object.entries(MAP_MODES).map(([k, l]) => `<button data-mm="${k}" class="${state.mapMode === k ? "on" : ""}">${l}</button>`).join("");
  }
  $("#map-mode").addEventListener("click", (e) => {
    const b = e.target.closest("[data-mm]"); if (!b || b.dataset.mm === state.mapMode) return;
    state.mapMode = b.dataset.mm; store.set("pk-mapmode", state.mapMode); renderMapMode();
    map.setStyle(styleFor(), { diff: false });
  });
  renderMapMode();
  $("#ctrl-tilt").addEventListener("click", (e) => {
    const flat = map.getPitch() > 10;
    stopOrbit(); map.easeTo({ pitch: flat ? 0 : 60, duration: 900 });
    e.currentTarget.textContent = flat ? "2D" : "3D";
  });
  $("#ctrl-north").addEventListener("click", () => { stopOrbit(); map.easeTo({ bearing: 0, duration: 900 }); });
  const goHome = () => { if (state.venue) closeVenue(true); stopOrbit(); map.flyTo({ ...homeView(), padding: basePadding(false), speed: 0.8 }); };
  $("#ctrl-home").addEventListener("click", goHome);
  $("#brand").addEventListener("click", (e) => { e.preventDefault(); goHome(); });
  $("#panel-handle").addEventListener("click", () => panelSheet.to(panelSheet.snap === 0 ? 1 : 0));
  $("#search").addEventListener("focus", () => { if (isMobile()) panelSheet.to(2); });
  $("#address").addEventListener("focus", () => { if (isMobile()) panelSheet.to(2); });
  // тап по пустой карте на телефоне — свернуть список, чтобы карта была видна
  map.on("click", () => { if (isMobile() && !state.venue && panelSheet.snap > 0) { $("#search").blur(); panelSheet.to(0); } });
  window.addEventListener("hashchange", () => {
    const id = location.hash.match(/venue=([\w-]+)/)?.[1];
    if (id && byId[id] && state.venue?.id !== id) selectVenue(byId[id]);
  });

  const DICE = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3.5" y="3.5" width="17" height="17" rx="4"/><circle cx="8.5" cy="8.5" r="1.2" fill="currentColor"/><circle cx="15.5" cy="15.5" r="1.2" fill="currentColor"/><circle cx="12" cy="12" r="1.2" fill="currentColor"/><circle cx="15.5" cy="8.5" r="1.2" fill="currentColor"/><circle cx="8.5" cy="15.5" r="1.2" fill="currentColor"/></svg>';

  // ---------- Приветствие по времени суток ----------
  (function greet() {
    const h = new Date().getHours();
    const hi = h < 5 ? "Доброй ночи" : h < 12 ? "Доброе утро" : h < 18 ? "Добрый день" : "Добрый вечер";
    const ask = h < 12 ? "В музей с утра?" : h < 18 ? "Куда пойдём после пар?" : "Кино или театр сегодня?";
    $("#panel-head").insertAdjacentHTML("afterbegin", `<div class="greet-row"><div class="greet">${hi}!<small>${ask}</small></div><button class="lucky-mini" data-lucky title="Мне повезёт: случайный сеанс">${DICE}</button></div>`);
  })();

  // ---------- Заставка ----------
  (function intro() {
    const now = new Date();
    const all = VENUES.flatMap((v) => v.events.flatMap((id) => v.sessions[id].filter((x) => sameDay(x.date, now) && x.date > now)));
    const minP = Math.min(...VENUES.flatMap((v) => v.events.flatMap((id) => upcoming(v, id).map((x) => x.price))));
    $("#intro-stats").innerHTML = all.length
      ? `Сегодня ещё <b>${all.length} ${plural(all.length, "сеанс", "сеанса", "сеансов")}</b> на ${VENUES.length} площадках. Билеты от <b>${minP} ₽</b>.`
      : `${VENUES.length} площадок по всему центру. Билеты от <b>${minP} ₽</b>.`;
    $("#intro-cats").innerHTML = Object.entries(CATS).map(([k, c]) => {
      const n = VENUES.filter((v) => v.type === k).length;
      return `<button data-icat="${k}" style="--c:${c.color}"><i>${icon(k, 20)}</i><b>${c.label}</b><span>${n} ${plural(n, "место", "места", "мест")}</span></button>`;
    }).join("");
    let seen = false; try { seen = sessionStorage.getItem("pk-intro") === "1"; } catch (_) {}
    if (seen || location.hash.includes("venue=")) return;
    // вместо заставки — промо-ролик; по окончании или «Пропустить» открывается карта
    const promo = $("#promo"), frame = $("#promo-frame");
    promo.hidden = false;
    document.body.classList.add("intro-on");
    frame.src = "promo/?embed=1";
    let done = false;
    const finish = () => {
      if (done) return; done = true;
      try { sessionStorage.setItem("pk-intro", "1"); } catch (_) {}
      promo.classList.add("leaving");
      document.body.classList.remove("intro-on");
      setTimeout(() => { promo.hidden = true; frame.src = "about:blank"; }, 800);
    };
    window.addEventListener("message", (e) => { if (e.origin === location.origin && e.data === "promo-done") finish(); });
    $("#promo-skip").addEventListener("click", finish);
    document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !promo.hidden) finish(); });
    setTimeout(finish, 15000); // запасной выход, если ролик не загрузится
    return;

    // (прежняя заставка оставлена в коде, сейчас не показывается)
    $("#intro").hidden = false;
    document.body.classList.add("intro-on");
    const close = (after) => {
      try { sessionStorage.setItem("pk-intro", "1"); } catch (_) {}
      $("#intro").classList.add("leaving");
      document.body.classList.remove("intro-on");
      setTimeout(() => { $("#intro").hidden = true; }, 700);
      after?.();
    };
    $("#intro-go").addEventListener("click", () => close());
    $("#intro-near").addEventListener("click", () => close(() => $('[data-mode="near"]').click()));
    $("#intro-cats").addEventListener("click", (e) => {
      const b = e.target.closest("[data-icat]"); if (!b) return;
      close(() => { state.cat = b.dataset.icat; renderAll(); });
    });
  })();

  // ---------- Бегущая лента ближайших сеансов ----------
  function renderTicker() {
    const now = new Date();
    const items = VENUES.flatMap((v) => v.events.flatMap((id) => upcoming(v, id).slice(0, 2).map((x) => ({ v, id, x }))))
      .sort((a, b) => a.x.date - b.x.date).slice(0, 14);
    if (!items.length) { $("#ticker").hidden = true; return; }
    const html = items.map(({ v, id, x }) => {
      const mins = Math.round((x.date - now) / 60000);
      const when = sameDay(x.date, now) ? (mins < 60 ? `через ${mins} мин` : fmtTime(x.date)) : `${x.date.toLocaleDateString("ru-RU", { weekday: "short" })} ${fmtTime(x.date)}`;
      return `<button class="tick" data-buy="${v.id}|${id}|${x.date.getTime()}" style="--c:${CATS[v.type].color}"><i></i><b>${when}</b>${esc(EVENTS[id].title)}<span>${esc(v.name)} · ${x.price} ₽</span></button>`;
    }).join("");
    $("#ticker-row").innerHTML = html + html; // дубль для бесшовной прокрутки
    $("#ticker-row").style.setProperty("--dur", `${items.length * 6}s`);
  }
  $("#ticker").addEventListener("click", (e) => { const t = e.target.closest("[data-buy]"); if (t) openCheckout(...t.dataset.buy.split("|")); });
  renderTicker();
  setInterval(renderTicker, 60000);

  // ---------- 3D-карта: наклон за курсором, вращение мышью, переворот ----------
  (function card3d() {
    const stage = $("#card-stage"), card = $("#card3d");
    if (!stage) return;
    let rx = 0, ry = 0, flip = 0, drag = null, raf = 0, tx = 0, ty = 0;
    const apply = () => {
      card.style.transform = `rotateX(${rx}deg) rotateY(${ry + flip}deg)`;
      card.style.setProperty("--hx", `${50 + ry * 2}%`);
      card.style.setProperty("--hy", `${50 - rx * 2}%`);
    };
    const ease = () => {
      rx += (tx - rx) * 0.12; ry += (ty - ry) * 0.12; apply();
      if (Math.abs(tx - rx) + Math.abs(ty - ry) > 0.05) raf = requestAnimationFrame(ease);
    };
    const go = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(ease); };
    stage.addEventListener("pointermove", (e) => {
      const r = stage.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5, py = (e.clientY - r.top) / r.height - 0.5;
      if (drag) {
        const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
        if (Math.abs(dx) + Math.abs(dy) > 4) drag.moved = true;
        ty = drag.ry + dx * 0.6;
        tx = Math.max(-40, Math.min(40, drag.rx - dy * 0.4));
      } else { tx = -py * 22; ty = px * 28; }
      go();
    });
    stage.addEventListener("pointerleave", () => { if (!drag) { tx = 0; ty = 0; go(); } });
    stage.addEventListener("pointerdown", (e) => {
      drag = { x: e.clientX, y: e.clientY, rx, ry, moved: false };
      stage.setPointerCapture(e.pointerId); stage.classList.add("grab");
    });
    const up = () => {
      if (!drag) return;
      stage.classList.remove("grab");
      if (!drag.moved) flip += 180;
      else { // докрутили больше чем на пол-оборота: карта переворачивается
        const turns = Math.round(ry / 180);
        flip += turns * 180; ry -= turns * 180;
      }
      drag = null; card.classList.add("spring"); tx = 0; ty = 0; apply(); go();
      setTimeout(() => card.classList.remove("spring"), 700);
    };
    stage.addEventListener("pointerup", up);
    stage.addEventListener("pointercancel", up);
    apply();
  })();

  // ---------- «Мне повезёт»: 3D-барабан со случайным сеансом ----------
  function openLucky() {
    const now = new Date();
    let pool = VENUES.filter((v) => state.cat === "all" || v.type === state.cat)
      .flatMap((v) => v.events.map((id) => ({ v, id, x: upcoming(v, id)[0] })).filter((o) => o.x));
    pool = pool.sort(() => Math.random() - 0.5).slice(0, 12);
    if (pool.length < 3) return toast("Сейчас не из чего выбирать, попробуйте другую категорию");
    const n = pool.length, step = 360 / n, H = 74, R = Math.round(H / 2 / Math.tan(Math.PI / n)) + 6;
    $("#modal-content").innerHTML = `
      <div class="lucky">
        <div><div class="label">Не можете выбрать?</div><h2>Крутите барабан</h2><p class="lucky-sub">Сайт сам подберёт сеанс на ближайшее время${state.cat !== "all" ? `, только «${CATS[state.cat].label}»` : ""}.</p></div>
        <div class="drum-wrap"><div class="drum-window"></div>
          <div class="drum" id="drum">${pool.map((o, i) => `
            <div class="drum-item" style="transform: rotateX(${-i * step}deg) translateZ(${R}px); --c:${CATS[o.v.type].color}">
              <i>${icon(o.v.type, 18)}</i><b>${esc(EVENTS[o.id].title)}</b><span>${fmtTime(o.x.date)}</span>
            </div>`).join("")}</div>
        </div>
        <div class="lucky-result" id="lucky-result"></div>
        <button class="btn gold block" id="lucky-spin">${DICE} Крутить</button>
      </div>`;
    openModal(true);
    let rot = 0, spinning = false;
    const drum = $("#drum");
    const spin = () => {
      if (spinning) return;
      spinning = true; $("#lucky-result").innerHTML = ""; $("#lucky-spin").disabled = true;
      drum.querySelectorAll(".drum-item").forEach((el) => el.classList.remove("win"));
      const pick = Math.floor(Math.random() * n);
      const cur = ((Math.round(rot / step) % n) + n) % n;
      const target = rot + (n * 3 + ((pick - cur + n) % n)) * step;
      const from = rot, t0 = performance.now(), dur = 2600;
      const tick = (t) => {
        const k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 4);
        rot = from + (target - from) * e;
        drum.style.transform = `translateZ(${-R}px) rotateX(${rot}deg)`;
        if (k < 1) return requestAnimationFrame(tick);
        spinning = false; $("#lucky-spin").disabled = false; $("#lucky-spin").innerHTML = `${DICE} Ещё раз`;
        const o = pool[pick], ev = EVENTS[o.id];
        drum.querySelectorAll(".drum-item").forEach((el, i) => el.classList.toggle("win", i === pick));
        const today = sameDay(o.x.date, now);
        $("#lucky-result").innerHTML = `
          <div class="tkt" style="--c:${CATS[o.v.type].color}">
            <div class="tkt-stub">${icon(o.v.type, 24)}<b>${ev.age}</b></div>
            <div class="tkt-main"><div class="card-title">${esc(ev.title)}</div>
              <div class="card-meta"><span>${esc(o.v.name)}</span><span>${today ? "сегодня" : fmtDay(o.x.date)} в ${fmtTime(o.x.date)}</span><span>${o.x.price} ₽</span></div>
              <div class="lucky-acts"><button class="btn gold" data-buy="${o.v.id}|${o.id}|${o.x.date.getTime()}">Беру</button><button class="btn line" data-goto="${o.v.id}">Показать на карте</button></div>
            </div></div>`;
      };
      requestAnimationFrame(tick);
    };
    $("#lucky-spin").addEventListener("click", spin);
    drum.style.transform = `translateZ(${-R}px) rotateX(0deg)`;
    setTimeout(spin, 350);
  }
  document.addEventListener("click", (e) => {
    if (!e.target.closest("[data-lucky]")) return;
    if (document.body.classList.contains("intro-on")) $("#intro-go").click();
    openLucky();
  });


  window.__map = map;
  renderAll();
})();
