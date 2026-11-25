(() => {
  "use strict";

  const CATS = window.CATEGORIES, EVENTS = window.EVENTS, VENUES = window.VENUES;
  const byId = Object.fromEntries(VENUES.map((v) => [v.id, v]));
  VENUES.forEach((v, i) => (v.num = String(i + 1).padStart(2, "0")));
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const STAMPS_GOAL = 5;

  // ---------- утилиты ----------
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (_) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (_) {} },
  };
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const fmtTime = (d) => d.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
  const fmtDay = (d) => d.toLocaleDateString("ru-RU", { day: "numeric", month: "long" });
  const dayDate = (i) => { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() + i); return d; };
  const sameDay = (a, b) => a.toDateString() === b.toDateString();
  const dur = (m) => `${Math.floor(m / 60)} ч${m % 60 ? " " + (m % 60) + " мин" : ""}`;
  const plural = (n, a, b, c) => { const m = n % 10, h = n % 100; return m === 1 && h !== 11 ? a : m >= 2 && m <= 4 && (h < 10 || h >= 20) ? b : c; };
  const upcoming = (v, id) => v.sessions[id].filter((s) => s.date > new Date());
  const placesOf = (id) => VENUES.filter((v) => v.events.includes(id));
  const minPrice = (id) => { const p = placesOf(id).flatMap((v) => upcoming(v, id).map((s) => s.price)); return p.length ? Math.min(...p) : null; };
  const grad = (ev) => `linear-gradient(160deg, ${ev.palette[1]} 0%, ${ev.palette[0]} 78%)`;
  const ph = (ev, extra = "") => ev.image
    ? `<div class="ph img ${extra}" style="--img:url('${encodeURI(ev.image)}')"></div>`
    : `<div class="ph ${extra}" style="--g:${grad(ev)}"></div>`;
  function haversine([a, b], [c, d]) {
    const R = 6371, t = Math.PI / 180, x = (d - b) * t, y = (c - a) * t;
    const h = Math.sin(x / 2) ** 2 + Math.cos(b * t) * Math.cos(d * t) * Math.sin(y / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
  }
  const fmtDist = (km) => (km < 1 ? `${Math.round(km * 100) * 10} м` : `${km.toFixed(1).replace(".", ",")} км`);
  const travel = (km) => { const r = km * 1.3; return r < 2 ? `${Math.max(2, Math.round((r / 4.8) * 60))} мин пешком` : `${Math.max(5, Math.round((r / 22) * 60 + 4))} мин в пути`; };

  const state = { filter: "all", me: null, venue: null, stamps: store.get("pk-stamps", []) };
  const hasStamp = (id) => state.stamps.some((s) => s.venue === id);
  const stampedVenues = () => [...new Set(state.stamps.map((s) => s.venue))].filter((id) => byId[id]);

  // ---------- Залы ----------
  const HALLS = {
    cinema:  { title: "Кинозал", door: "Кино", unit: ["фильм", "фильма", "фильмов"], layout: "arc", w: 210, h: 315, cta: "Выбрать сеанс" },
    theatre: { title: "Сцена", door: "Театр", unit: ["спектакль", "спектакля", "спектаклей"], layout: "coverflow", w: 230, h: 330, cta: "Выбрать спектакль" },
    museum:  { title: "Галерея", door: "Музеи", unit: ["музей", "музея", "музеев"], layout: "gallery", w: 300, h: 230, cta: "Пойти в музей" },
    concert: { title: "Концертный зал", door: "Концерты", unit: ["концерт", "концерта", "концертов"], layout: "coverflow", w: 240, h: 320, cta: "Выбрать концерт" },
  };
  // элементы зала: для музеев — сами музеи, для остальных — события
  function hallItems(type) {
    if (type === "museum") return VENUES.filter((v) => v.type === "museum").map((v) => ({ kind: "venue", v, ev: EVENTS[v.events[0]] }));
    return Object.entries(EVENTS).filter(([, e]) => e.type === type).map(([id, ev]) => ({ kind: "event", id, ev }));
  }

  // двери на главной
  $("#doors").innerHTML = Object.entries(HALLS).map(([type, h], i) => {
    const n = hallItems(type).length;
    return `<a class="door ${type}" href="#/hall/${type}">
      <div class="scene ${type}"></div>
      <div class="door-label">
        <div class="door-num">0${i + 1} — ${h.title.toUpperCase()}</div>
        <div class="door-name">${h.door}</div>
        <div class="door-foot"><span>${n} ${plural(n, ...h.unit)}</span><b>Войти <span>→</span></b></div>
      </div></a>`;
  }).join("");

  // лента «Сегодня»
  $("#reel").innerHTML = Object.entries(EVENTS).map(([id, ev]) => {
    const p = minPrice(id);
    return `<button class="reel-card" data-event="${id}">
      <div class="ph" style="--g:${grad(ev)}"><span class="tag">${CATS[ev.type].label}</span><span class="rt">${ev.rating.toFixed(1)}</span></div>
      <h3>${esc(ev.title)}</h3><p>${esc(ev.genre)}${p ? ` · от ${p} ₽` : ""}</p></button>`;
  }).join("");
  $$("[data-reel]").forEach((b) => b.addEventListener("click", () => $("#reel").scrollBy({ left: +b.dataset.reel * $("#reel").clientWidth * 0.8, behavior: "smooth" })));
  $("#reel").addEventListener("click", (e) => { const c = e.target.closest("[data-event]"); if (c) openEvent(c.dataset.event); });
  $("#today").textContent = new Date().toLocaleDateString("ru-RU", { weekday: "long", day: "numeric", month: "long" });

  // ---------- Карусель зала ----------
  const hall = { type: null, items: [], pos: 0, target: 0, raf: 0 };
  const ring = $("#ring"), stage = $("#stage");

  function enterHall(type) {
    const cfg = HALLS[type];
    hall.type = type; hall.items = hallItems(type); hall.pos = hall.target = 0;
    const el = $("#hall");
    el.className = `hall hall-${type}`;
    document.body.className = `in-hall hall-${type} locked`;
    $("#hall-title").textContent = cfg.title;
    $("#hall-count").textContent = `${hall.items.length} ${plural(hall.items.length, ...cfg.unit)}`;
    $("#hall-bg").innerHTML = type === "cinema" ? '<div class="screen-glow"></div>' : type === "theatre" ? '<div class="spot"></div>' : type === "museum" ? '<div class="gallery-light"></div>' : "";
    ring.style.setProperty("--w", "0");
    ring.innerHTML = hall.items.map((it, i) => `
      <div class="item" data-i="${i}" style="--w:${cfg.w}px;--h:${cfg.h}px">
        ${ph(it.ev)}
        <div class="cap"><span>${esc(it.kind === "venue" ? it.v.name : it.ev.title)}</span></div>
      </div>`).join("");
    el.setAttribute("aria-hidden", "false");
    if (type === "theatre") { el.classList.remove("curtains-open"); setTimeout(() => el.classList.add("curtains-open"), 250); }
    layout(); renderInfo();
  }
  function leaveHall() {
    hall.type = null;
    document.body.className = "";
    $("#hall").setAttribute("aria-hidden", "true");
    onScroll();
  }

  function layout() {
    const cfg = HALLS[hall.type], n = hall.items.length, p = hall.pos;
    const vw = window.innerWidth, small = vw < 640;
    const scale = small ? 0.72 : 1;
    $$(".item", ring).forEach((el, i) => {
      let d = i - p;
      let t = "", o = 1, z = 0;
      if (cfg.layout === "cylinder") {
        if (d > n / 2) d -= n; if (d < -n / 2) d += n; // по кругу
        const step = 360 / Math.max(n, 7), R = (cfg.w * scale * 1.15) / (2 * Math.tan(Math.PI / Math.max(n, 7)));
        const a = d * step * (Math.PI / 180);
        t = `translate3d(${Math.sin(a) * R}px, 0, ${Math.cos(a) * R - R}px) rotateY(${d * step}deg) scale(${scale})`;
        o = Math.abs(d) > 3.2 ? 0 : 1 - Math.abs(d) * 0.18;
        z = 100 - Math.round(Math.abs(d) * 10);
      } else if (cfg.layout === "arc") {
        // вогнутая стена кинозала: зритель внутри дуги
        const step = 19, R = 980 * scale, ang = d * step * (Math.PI / 180);
        t = `translate3d(${Math.sin(ang) * R}px, 0, ${(1 - Math.cos(ang)) * R * 0.35}px) rotateY(${-d * step}deg) scale(${scale})`;
        o = Math.abs(d) > 3.4 ? 0 : 1 - Math.max(0, Math.abs(d) - 1) * 0.3;
        z = 100 - Math.round(Math.abs(d) * 10);
      } else if (cfg.layout === "coverflow") {
        const ad = Math.abs(d), sg = Math.sign(d);
        const x = sg * (Math.min(ad, 1) * cfg.w * 0.85 + Math.max(0, ad - 1) * cfg.w * 0.42) * scale;
        t = `translate3d(${x}px, 0, ${-Math.min(ad, 3) * 170}px) rotateY(${-sg * Math.min(ad, 1) * 42}deg) scale(${scale})`;
        o = ad > 3.5 ? 0 : 1 - Math.max(0, ad - 1) * 0.25;
        z = 100 - Math.round(ad * 10);
      } else {
        const gap = (cfg.w + (small ? 40 : 120)) * scale;
        t = `translate3d(${d * gap}px, 0, 0) scale(${scale * (1 - Math.min(Math.abs(d), 1) * 0.12)})`;
        o = Math.abs(d) > 2.5 ? 0 : 1 - Math.min(Math.abs(d), 1) * 0.35;
        z = 100 - Math.round(Math.abs(d) * 10);
      }
      el.style.transform = t; el.style.opacity = o; el.style.zIndex = z;
      el.style.pointerEvents = o < 0.1 ? "none" : "";
      el.classList.toggle("cur", Math.abs(d) < 0.5);
    });
    if (hall.type === "cinema") $(".screen-glow")?.style.setProperty("--sg", cur().ev.palette[1]);
  }
  const wrapIdx = (i) => ((i % hall.items.length) + hall.items.length) % hall.items.length;
  const cur = () => hall.items[wrapIdx(Math.round(hall.target))];
  function animateTo(target) {
    const cfg = HALLS[hall.type];
    if (cfg.layout !== "cylinder") target = Math.max(0, Math.min(hall.items.length - 1, target));
    const changed = Math.round(target) !== Math.round(hall.target);
    hall.target = target;
    if (changed) renderInfo();
    cancelAnimationFrame(hall.raf);
    const tick = () => {
      hall.pos += (hall.target - hall.pos) * 0.14;
      if (Math.abs(hall.target - hall.pos) < 0.001) hall.pos = hall.target;
      layout();
      if (hall.pos !== hall.target) hall.raf = requestAnimationFrame(tick);
    };
    hall.raf = requestAnimationFrame(tick);
  }

  function renderInfo() {
    const it = cur(), cfg = HALLS[hall.type];
    let html;
    if (it.kind === "venue") {
      const v = it.v;
      html = `<div class="kick">${esc(v.place)} · ${esc(v.address)}</div>
        <h2>${esc(v.name)}</h2>
        <div class="meta"><span>${esc(it.ev.title)}</span><span>★ <b>${it.ev.rating.toFixed(1)}</b></span>${minPrice(v.events[0]) ? `<span>от <b>${minPrice(v.events[0])} ₽</b></span>` : ""}</div>
        <div class="hall-actions"><button class="btn red" data-open-venue="${v.id}">${cfg.cta}</button><button class="btn ghost" data-map="${v.id}">На карте</button></div>`;
    } else {
      const ev = it.ev, places = placesOf(it.id), p = minPrice(it.id);
      html = `<div class="kick">${esc(ev.genre)} · ${ev.age} · ${dur(ev.duration)}</div>
        <h2>${esc(ev.title)}</h2>
        <div class="meta"><span>★ <b>${ev.rating.toFixed(1)}</b></span><span>${places.length} ${plural(places.length, "площадка", "площадки", "площадок")}</span>${p ? `<span>от <b>${p} ₽</b></span>` : ""}</div>
        <div class="hall-actions"><button class="btn red" data-event="${it.id}">${cfg.cta}</button>${hall.type === "cinema" ? `<a class="btn ghost" target="_blank" rel="noopener" href="https://www.youtube.com/results?search_query=${encodeURIComponent(ev.title + " трейлер")}">Трейлер</a>` : ""}</div>`;
    }
    $("#hall-info").innerHTML = html;
  }
  $("#hall-info").addEventListener("click", (e) => {
    const ev = e.target.closest("[data-event]"); if (ev) return openEvent(ev.dataset.event);
    const ov = e.target.closest("[data-open-venue]"); if (ov) return openVenue(byId[ov.dataset.openVenue]);
    const m = e.target.closest("[data-map]"); if (m) { location.hash = "#/map"; setTimeout(() => focusVenue(byId[m.dataset.map]), 500); }
  });

  // жесты: перетаскивание, колесо, стрелки, клик по карточке
  let drag = null;
  stage.addEventListener("pointerdown", (e) => {
    drag = { x: e.clientX, start: hall.target, moved: false };
    stage.setPointerCapture(e.pointerId); stage.classList.add("grabbing");
  });
  stage.addEventListener("pointermove", (e) => {
    if (!drag) return;
    const dx = e.clientX - drag.x;
    if (Math.abs(dx) > 6) drag.moved = true;
    if (!drag.moved) return;
    const per = HALLS[hall.type].w * (window.innerWidth < 640 ? 0.72 : 1) * 0.9;
    hall.target = drag.start - dx / per;
    hall.pos = hall.target; layout();
  });
  const endDrag = (e) => {
    if (!drag) return;
    stage.classList.remove("grabbing");
    if (drag.moved) animateTo(Math.round(hall.target));
    else {
      const item = document.elementFromPoint(e.clientX, e.clientY)?.closest(".item");
      if (item) {
        const i = +item.dataset.i;
        if (item.classList.contains("cur")) openCurrent();
        else {
          let t = i;
          if (HALLS[hall.type].layout === "cylinder") { const n = hall.items.length; let d = i - wrapIdx(Math.round(hall.target)); if (d > n / 2) d -= n; if (d < -n / 2) d += n; t = Math.round(hall.target) + d; }
          animateTo(t);
        }
      }
    }
    drag = null;
  };
  stage.addEventListener("pointerup", endDrag);
  stage.addEventListener("pointercancel", () => { drag && animateTo(Math.round(hall.target)); drag = null; stage.classList.remove("grabbing"); });
  let wheelLock = 0;
  $("#hall").addEventListener("wheel", (e) => {
    if (!hall.type) return;
    e.preventDefault();
    const now = Date.now();
    if (now - wheelLock < 260) return;
    const d = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
    if (Math.abs(d) < 8) return;
    wheelLock = now; animateTo(Math.round(hall.target) + Math.sign(d));
  }, { passive: false });
  document.addEventListener("keydown", (e) => {
    if ($("#drawer").classList.contains("open")) { if (e.key === "Escape") closeDrawer(); return; }
    if (!hall.type) return;
    if (e.key === "ArrowRight") animateTo(Math.round(hall.target) + 1);
    if (e.key === "ArrowLeft") animateTo(Math.round(hall.target) - 1);
    if (e.key === "Enter") openCurrent();
    if (e.key === "Escape") location.hash = "#/";
  });
  function openCurrent() { const it = cur(); it.kind === "venue" ? openVenue(it.v) : openEvent(it.id); }
  window.addEventListener("resize", () => hall.type && layout());

  // ---------- Карта-гравюра ----------
  const INK = "#1b1b1a", PAPER = "#f1efe9";
  const vb = VENUES.reduce((b, v) => [Math.min(b[0], v.coords[0]), Math.min(b[1], v.coords[1]), Math.max(b[2], v.coords[0]), Math.max(b[3], v.coords[1])], [180, 90, -180, -90]);
  const engraving = {
    version: 8,
    sources: { omt: { type: "vector", url: "https://tiles.openfreemap.org/planet" } },
    layers: [
      { id: "bg", type: "background", paint: { "background-color": PAPER } },
      { id: "park", type: "fill", source: "omt", "source-layer": "park", paint: { "fill-color": "#e4e1d7" } },
      { id: "green", type: "fill", source: "omt", "source-layer": "landcover", filter: ["in", ["get", "class"], ["literal", ["wood", "grass"]]], paint: { "fill-color": "#e6e3da" } },
      { id: "water", type: "fill", source: "omt", "source-layer": "water", paint: { "fill-color": "#d9d6cc" } },
      { id: "water-edge", type: "line", source: "omt", "source-layer": "water", paint: { "line-color": INK, "line-width": 0.8, "line-opacity": 0.55 } },
      { id: "waterway", type: "line", source: "omt", "source-layer": "waterway", paint: { "line-color": INK, "line-width": 0.6, "line-opacity": 0.4 } },
      { id: "bld", type: "fill", source: "omt", "source-layer": "building", minzoom: 14, paint: { "fill-color": "#e9e6de", "fill-outline-color": "rgba(27,27,26,.35)" } },
      { id: "rail", type: "line", source: "omt", "source-layer": "transportation", filter: ["==", ["get", "class"], "rail"], paint: { "line-color": INK, "line-width": 0.7, "line-dasharray": [3, 2], "line-opacity": 0.45 } },
      { id: "road-minor", type: "line", source: "omt", "source-layer": "transportation", minzoom: 13, filter: ["in", ["get", "class"], ["literal", ["minor", "service", "tertiary"]]], paint: { "line-color": INK, "line-opacity": 0.28, "line-width": ["interpolate", ["linear"], ["zoom"], 13, 0.3, 17, 1.4] } },
      { id: "road-major", type: "line", source: "omt", "source-layer": "transportation", filter: ["in", ["get", "class"], ["literal", ["primary", "secondary", "trunk", "motorway"]]], layout: { "line-cap": "round" }, paint: { "line-color": INK, "line-opacity": 0.55, "line-width": ["interpolate", ["linear"], ["zoom"], 11, 0.6, 17, 3] } },
      { id: "bridge", type: "line", source: "omt", "source-layer": "transportation", filter: ["==", ["get", "brunnel"], "bridge"], paint: { "line-color": INK, "line-opacity": 0.8, "line-width": ["interpolate", ["linear"], ["zoom"], 11, 0.8, 17, 3.5] } },
    ],
  };
  let map = null;
  const pins = {};
  function initMap() {
    if (map) return;
    map = new maplibregl.Map({
      container: "map", style: engraving,
      bounds: [[vb[0] - 0.01, vb[1] - 0.008], [vb[2] + 0.01, vb[3] + 0.008]], fitBoundsOptions: { padding: 40 },
      minZoom: 11, maxZoom: 17.5, pitchWithRotate: false, dragRotate: false,
      maxBounds: [[vb[0] - 0.12, vb[1] - 0.07], [vb[2] + 0.12, vb[3] + 0.07]],
      attributionControl: { compact: true }, cooperativeGestures: false,
    });
    map.touchZoomRotate.disableRotation();
    map.scrollZoom.setWheelZoomRate(1 / 300);
    VENUES.forEach((v) => {
      const el = document.createElement("button");
      el.className = "pin"; el.innerHTML = `${v.num}<span class="pin-label">${esc(v.name)}</span>`;
      el.setAttribute("aria-label", v.name);
      el.addEventListener("click", (e) => { e.stopPropagation(); focusVenue(v); openVenue(v); });
      pins[v.id] = new maplibregl.Marker({ element: el }).setLngLat(v.coords).addTo(map);
    });
    [["Кремль", [49.1045, 55.8005]], ["Казанка", [49.128, 55.8085]], ["Волга", [49.06, 55.778]], ["оз. Кабан", [49.137, 55.7735]]]
      .forEach(([t, c]) => { const el = document.createElement("div"); el.className = "place-label"; el.textContent = t; new maplibregl.Marker({ element: el }).setLngLat(c).addTo(map); });
  }
  // карта инициализируется, когда до неё доскроллили
  new IntersectionObserver((es) => es.forEach((e) => e.isIntersecting && initMap()), { rootMargin: "400px" }).observe($("#map"));

  function focusVenue(v) {
    initMap();
    state.venue = v;
    renderVenueList();
    Object.entries(pins).forEach(([id, m]) => m.getElement().classList.toggle("on", id === v.id));
    map.flyTo({ center: v.coords, zoom: 15.5, speed: 0.9, essential: true });
  }

  // список площадок
  function renderFilters() {
    const f = [["all", "Все"], ...Object.entries(CATS).map(([k, c]) => [k, c.label])];
    $("#filters").innerHTML = f.map(([k, l]) => `<button data-f="${k}" class="${state.filter === k ? "on" : ""}">${l}</button>`).join("");
  }
  $("#filters").addEventListener("click", (e) => {
    const b = e.target.closest("[data-f]"); if (!b) return;
    state.filter = b.dataset.f; renderFilters(); renderVenueList();
  });
  function renderVenueList() {
    let list = VENUES.filter((v) => state.filter === "all" || v.type === state.filter);
    if (state.me) list = list.map((v) => ({ v, km: haversine(state.me.coords, v.coords) })).sort((a, b) => a.km - b.km).map((x) => x.v);
    $("#venue-list").innerHTML = list.map((v) => {
      const km = state.me ? haversine(state.me.coords, v.coords) : null;
      return `<li><button data-v="${v.id}" class="${state.venue?.id === v.id ? "on" : ""}">
        <span class="vnum">${v.num}</span>
        <span><span class="vname">${esc(v.name)}${hasStamp(v.id) ? " ●" : ""}</span><br><span class="vsub">${CATS[v.type].label} · ${esc(v.address)}</span></span>
        <span class="vside">${km != null ? `<b>${fmtDist(km)}</b>${travel(km)}` : `<b>${v.events.length}</b>${plural(v.events.length, "событие", "события", "событий")}`}</span>
      </button></li>`;
    }).join("");
    Object.entries(pins).forEach(([id, m]) => m.getElement().classList.toggle("dim", state.filter !== "all" && byId[id].type !== state.filter));
  }
  $("#venue-list").addEventListener("click", (e) => {
    const b = e.target.closest("[data-v]"); if (!b) return;
    const v = byId[b.dataset.v];
    focusVenue(v); openVenue(v);
  });

  // поиск по адресу (Photon / OSM)
  let at, actl, meMarker;
  $("#address").addEventListener("input", (e) => {
    clearTimeout(at); const q = e.target.value.trim();
    if (q.length < 3) { $("#suggest").innerHTML = ""; return; }
    at = setTimeout(async () => {
      actl?.abort(); actl = new AbortController();
      try {
        const r = await (await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(/казан/i.test(q) ? q : q + ", Казань")}&limit=5&lat=55.79&lon=49.12&bbox=48.85,55.65,49.35,55.95`, { signal: actl.signal })).json();
        const items = (r.features || []).filter((f) => f.geometry);
        $("#suggest").innerHTML = items.length ? items.map((f, i) => {
          const p = f.properties, t = [p.street || p.name, p.housenumber].filter(Boolean).join(", ");
          return `<button data-i="${i}">${esc(t || p.name)}<small>${esc([p.district, p.city].filter(Boolean).join(" · "))}</small></button>`;
        }).join("") : `<button disabled>Адрес не найден</button>`;
        $("#suggest").onclick = (ev) => {
          const b = ev.target.closest("[data-i]"); if (!b) return;
          const f = items[+b.dataset.i], p = f.properties;
          const label = [p.street || p.name, p.housenumber].filter(Boolean).join(", ");
          $("#address").value = label; $("#suggest").innerHTML = "";
          setMe(f.geometry.coordinates, label);
        };
      } catch (err) { if (err.name !== "AbortError") $("#suggest").innerHTML = `<button disabled>Сервис адресов недоступен, попробуйте позже</button>`; }
    }, 300);
  });
  $("#geolocate").addEventListener("click", () => {
    if (!navigator.geolocation) return toast("Геолокация недоступна");
    toast("Определяем местоположение…");
    navigator.geolocation.getCurrentPosition((p) => setMe([p.coords.longitude, p.coords.latitude], "Моё местоположение"), () => toast("Не удалось — введите адрес"), { timeout: 8000 });
  });
  function setMe(coords, label) {
    initMap();
    state.me = { coords, label };
    if (!meMarker) { const el = document.createElement("div"); el.className = "me"; meMarker = new maplibregl.Marker({ element: el }).setLngLat(coords).addTo(map); } else meMarker.setLngLat(coords);
    renderVenueList();
    const near = VENUES.map((v) => ({ v, km: haversine(coords, v.coords) })).sort((a, b) => a.km - b.km).slice(0, 3);
    const b = new maplibregl.LngLatBounds(coords, coords); near.forEach(({ v }) => b.extend(v.coords));
    map.fitBounds(b, { padding: 70, maxZoom: 15.5, duration: 1600 });
    toast(`Ближайшее: ${near[0].v.name} — ${fmtDist(near[0].km)}`);
  }

  // ---------- Шторка ----------
  function openDrawer(html) {
    $("#drawer-body").innerHTML = html; $("#drawer-body").scrollTop = 0;
    $("#drawer").classList.add("open"); $("#drawer").setAttribute("aria-hidden", "false");
    document.body.classList.add("locked");
  }
  function closeDrawer() {
    $("#drawer").classList.remove("open"); $("#drawer").setAttribute("aria-hidden", "true");
    if (!hall.type) document.body.classList.remove("locked");
  }
  $("#drawer").addEventListener("click", (e) => { if (e.target.closest("[data-close]")) closeDrawer(); });

  const timeBtn = (v, id, s, withDay) => `<button class="time" data-buy="${v.id}|${id}|${s.date.getTime()}">${withDay ? s.date.toLocaleDateString("ru-RU", { day: "numeric", month: "short" }).replace(".", "") + ", " : ""}${fmtTime(s.date)}<small>${s.price} ₽</small></button>`;

  function openEvent(id, venue = null) {
    const ev = EVENTS[id];
    let places = placesOf(id);
    if (venue) places = [venue, ...places.filter((v) => v !== venue)];
    else if (state.me) places.sort((a, b) => haversine(state.me.coords, a.coords) - haversine(state.me.coords, b.coords));
    const yt = `https://www.youtube.com/results?search_query=${encodeURIComponent(ev.title + " " + (ev.type === "cinema" ? "трейлер" : "Казань"))}`;
    openDrawer(`
      <div class="ev-top">${ph(ev)}<div>
        <div class="kick">${CATS[ev.type].label} · Пушкинская карта</div>
        <h2>${esc(ev.title)}</h2>
        <div class="ev-meta"><span>${esc(ev.genre)}</span><span>${ev.age}</span><span>${dur(ev.duration)}</span></div>
        <div class="score"><b>${ev.rating.toFixed(1)}</b><span>${ev.votes.toLocaleString("ru-RU")} оценок</span></div>
      </div></div>
      <div class="sec"><p class="desc">${esc(ev.description)}</p></div>
      <div class="sec row-btns">
        ${ev.trailer ? `<a class="btn ink" target="_blank" rel="noopener" href="https://www.youtube.com/watch?v=${encodeURIComponent(ev.trailer)}">▶ Трейлер</a>` : `<a class="btn ink" target="_blank" rel="noopener" href="${yt}">▶ ${ev.type === "cinema" ? "Трейлер" : "Видео"} на YouTube</a>`}
      </div>
      <div class="sec"><h4>Где и когда · ${places.length}</h4>
        ${places.map((v) => {
          const ss = upcoming(v, id).slice(0, 6);
          return `<div class="where"><div class="where-h"><div><b>${esc(v.name)}</b> <span>${state.me ? fmtDist(haversine(state.me.coords, v.coords)) + " · " : ""}${esc(v.address)}</span></div><button data-venue="${v.id}">Площадка →</button></div>
            <div class="times">${ss.length ? ss.map((s) => timeBtn(v, id, s, true)).join("") : `<span class="none">Нет ближайших сеансов</span>`}</div></div>`;
        }).join("")}
      </div>
      <div class="sec"><p class="note">Рейтинг, сеансы и цены — демонстрационные.</p></div>`);
  }

  let vday = 0;
  function openVenue(v, day = null) {
    if (day == null) { // первый день, где есть сеансы
      const now = new Date();
      day = Math.max(0, [...Array(7).keys()].find((i) => v.events.some((id) => v.sessions[id].some((s) => sameDay(s.date, dayDate(i)) && s.date > now))) ?? 0);
    }
    vday = day;
    const d = dayDate(day), now = new Date();
    const route = `https://yandex.ru/maps/?rtext=${state.me ? state.me.coords[1] + "," + state.me.coords[0] : ""}~${v.coords[1]},${v.coords[0]}&rtt=mt`;
    openDrawer(`
      <div class="sec" style="padding-top:calc(30px + env(safe-area-inset-top))">
        <div class="kick">${v.num} · ${CATS[v.type].label} · ${esc(v.place)}</div>
        <h2 class="dr-h">${esc(v.name)}</h2>
        <div class="ev-meta"><span>${esc(v.address)}</span>${state.me ? `<span>${fmtDist(haversine(state.me.coords, v.coords))} от вас</span>` : ""}${hasStamp(v.id) ? `<span style="color:var(--accent)">● Штамп получен</span>` : ""}</div>
        <div class="row-btns" style="margin-top:16px"><a class="btn ink" href="${route}" target="_blank" rel="noopener">Маршрут</a>${v.site ? `<a class="btn line" href="${v.site}" target="_blank" rel="noopener">Сайт площадки</a>` : ""}</div>
      </div>
      <div class="sec">
        <div class="days">${Array.from({ length: 7 }, (_, i) => { const dd = dayDate(i); return `<button data-day="${i}" class="${i === day ? "on" : ""}"><b>${dd.getDate()}</b>${i === 0 ? "Сегодня" : i === 1 ? "Завтра" : dd.toLocaleDateString("ru-RU", { weekday: "short" })}</button>`; }).join("")}</div>
        ${v.events.map((id) => {
          const ev = EVENTS[id], ss = v.sessions[id].filter((s) => sameDay(s.date, d) && s.date > now);
          return `<div class="vev"><div data-event="${id}" data-in="${v.id}">${ph(ev)}</div><div>
            <h5 data-event="${id}" data-in="${v.id}">${esc(ev.title)}</h5>
            <div class="ev-meta"><span>★ ${ev.rating.toFixed(1)}</span><span>${esc(ev.genre)}</span><span>${ev.age}</span></div>
            <div class="times">${ss.length ? ss.map((s) => timeBtn(v, id, s)).join("") : `<span class="none">Нет сеансов в этот день</span>`}</div></div></div>`;
        }).join("")}
      </div>`);
    $("#drawer-body").dataset.vid = v.id;
  }

  // ---------- Покупка и паспорт ----------
  const co = { qty: 1 };
  function openCheckout(vid, eid, ts) {
    const v = byId[vid], ev = EVENTS[eid], s = v.sessions[eid].find((x) => x.date.getTime() === +ts);
    if (!s) return;
    Object.assign(co, { v, ev, eid, s, qty: 1 });
    const fresh = !hasStamp(v.id), left = Math.max(0, STAMPS_GOAL - stampedVenues().length - (fresh ? 1 : 0));
    openDrawer(`
      <div class="sec" style="padding-top:calc(30px + env(safe-area-inset-top))"><div class="kick">Оформление билета</div><h2 class="dr-h">Пушкинская карта</h2></div>
      <div class="ticket"><div>
        <div class="kick">${CATS[ev.type].label} · ${ev.age}</div>
        <div class="t-title">${esc(ev.title)}</div>
        <div class="t-sub">${esc(v.name)} · ${esc(v.address)}</div>
        <div class="t-sub">${fmtDay(s.date)}, ${s.date.toLocaleDateString("ru-RU", { weekday: "long" })} · ${fmtTime(s.date)}</div>
      </div><div class="t-side"><b id="co-total">${s.price} ₽</b><span class="t-sub">${s.price} ₽ × <span id="co-q">1</span></span></div></div>
      <div class="sec qty"><span>Билетов</span><div><button data-act="minus">−</button><span id="co-qty">1</span><button data-act="plus">+</button></div></div>
      <div class="sec"><div class="perk">${SEAL}<div>${fresh ? `Получите <b>штамп «${esc(v.name)}»</b> в культурный паспорт. ${left ? `До розыгрыша — ещё ${left} ${plural(left, "место", "места", "мест")}.` : "Это пятое место — вы в розыгрыше!"}` : "Штамп этого места уже есть — для розыгрыша выберите новое место."}</div></div></div>
      <div class="sec"><button class="btn red block" data-act="pay">Оплатить Пушкинской картой</button><p class="note" style="margin-top:12px">Демо-режим: деньги не списываются. В рабочей версии — платёжный виджет билетного оператора.</p></div>`);
  }
  const SEAL = '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.4"><circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="5.5" stroke-dasharray="2 2"/><path d="m9.5 12 1.8 1.8 3.2-3.6"/></svg>';

  function stampSVG(v, i) {
    const name = v.name.replace(/[«»"]/g, "").toUpperCase(), short = name.length > 24 ? name.slice(0, 23) + "…" : name;
    const date = new Date(state.stamps.find((s) => s.venue === v.id).ts).toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "2-digit" });
    return `<svg class="stamp" viewBox="0 0 100 100" style="--r:${[-9, 6, -4, 11, -13][i % 5]}deg">
      <defs><path id="arc-${v.id}" d="M50 50 m-36 0 a36 36 0 1 1 72 0 a36 36 0 1 1 -72 0"/></defs>
      <circle cx="50" cy="50" r="46" fill="none" stroke="currentColor" stroke-width="1.6"/><circle cx="50" cy="50" r="42" fill="none" stroke="currentColor" stroke-width=".7"/><circle cx="50" cy="50" r="27" fill="none" stroke="currentColor" stroke-width=".7"/>
      <text><textPath href="#arc-${v.id}">${esc(short)} · КАЗАНЬ ·</textPath></text>
      <text x="50" y="49" text-anchor="middle" style="font-family:Cormorant,serif;font-size:20px;letter-spacing:0;font-weight:600">${v.num}</text>
      <text x="50" y="63" text-anchor="middle" style="font-size:7px;letter-spacing:1px">${date}</text></svg>`;
  }
  function openPassport(newV = null, celebrate = false) {
    const vs = stampedVenues(), n = vs.length, done = n >= STAMPS_GOAL;
    let code = store.get("pk-draw-code", null);
    if (done && !code) { code = "PK-" + Math.random().toString(36).slice(2, 6).toUpperCase() + "-" + String(Date.now()).slice(-4); store.set("pk-draw-code", code); }
    openDrawer(`
      <div class="sec" style="padding-top:calc(30px + env(safe-area-inset-top))">
        <div class="kick">${celebrate ? (newV ? "Билет оформлен · новый штамп" : "Билет оформлен") : "Ваш прогресс"}</div>
        <h2 class="dr-h">Культурный паспорт</h2>
        <div class="progress"><i style="width:${(Math.min(n, STAMPS_GOAL) / STAMPS_GOAL) * 100}%"></i></div>
        <div class="slots">${Array.from({ length: STAMPS_GOAL }, (_, i) => { const v = byId[vs[i]]; return v ? `<div class="slot filled ${v.id === newV ? "new" : ""}" title="${esc(v.name)}">${stampSVG(v, i)}</div>` : `<div class="slot">${i + 1}</div>`; }).join("")}</div>
      </div>
      <div class="sec">${done ? `<div class="draw"><span class="kick">Вы в розыгрыше</span><b>Пять мест собрано</b><span>Номер участника:</span><code>${code}</code></div>` : `<p style="margin:0">Ещё <b>${STAMPS_GOAL - n} ${plural(STAMPS_GOAL - n, "место", "места", "мест")}</b> — и вы участвуете в ежемесячном розыгрыше призов от партнёров.</p>`}</div>
      <div class="sec"><h4>Как это работает</h4><ol class="rules">
        <li>Покупайте билеты по Пушкинской карте через этот сайт.</li>
        <li>За каждое новое место — кино, театр, музей или концертный зал — ставится штамп.</li>
        <li>Пять разных мест — участие в розыгрыше.</li></ol></div>
      <div class="sec row-btns">${n ? `<button class="btn line" data-act="reset">Очистить (демо)</button>` : `<a class="btn ink" href="#/" data-close>Выбрать зал</a>`}</div>`);
    if (celebrate) toast(newV ? `Штамп «${byId[newV].name}» добавлен` : "Билет оформлен");
  }
  function renderCount(bump) {
    const n = stampedVenues().length, el = $("#passport-count");
    el.textContent = n >= STAMPS_GOAL ? `✓ ${n}` : `${n}/${STAMPS_GOAL}`;
    if (bump) { el.classList.remove("bump"); void el.offsetWidth; el.classList.add("bump"); }
  }
  $("#btn-passport").addEventListener("click", () => openPassport());

  $("#drawer-body").addEventListener("click", (e) => {
    const t = e.target;
    const buy = t.closest("[data-buy]"); if (buy) return openCheckout(...buy.dataset.buy.split("|"));
    const ev = t.closest("[data-event]"); if (ev) return openEvent(ev.dataset.event, ev.dataset.in ? byId[ev.dataset.in] : null);
    const vn = t.closest("[data-venue]"); if (vn) return openVenue(byId[vn.dataset.venue]);
    const day = t.closest("[data-day]"); if (day) return openVenue(byId[$("#drawer-body").dataset.vid], +day.dataset.day);
    const act = t.closest("[data-act]")?.dataset.act;
    if (act === "plus" || act === "minus") {
      co.qty = Math.max(1, Math.min(4, co.qty + (act === "plus" ? 1 : -1)));
      $("#co-qty").textContent = co.qty; $("#co-q").textContent = co.qty; $("#co-total").textContent = `${co.s.price * co.qty} ₽`;
    }
    if (act === "pay") {
      const b = t.closest("[data-act]"); b.disabled = true; b.textContent = "Обработка…";
      setTimeout(() => {
        const fresh = !hasStamp(co.v.id);
        state.stamps.push({ venue: co.v.id, event: co.eid, ts: Date.now() });
        store.set("pk-stamps", state.stamps);
        renderCount(true); renderVenueList();
        openPassport(fresh ? co.v.id : null, true);
      }, 800);
    }
    if (act === "reset" && confirm("Очистить паспорт?")) {
      state.stamps = []; store.set("pk-stamps", []); store.set("pk-draw-code", null);
      renderCount(); renderVenueList(); openPassport();
    }
  });

  let tt;
  function toast(m) { const t = $("#toast"); t.textContent = m; t.classList.add("show"); clearTimeout(tt); tt = setTimeout(() => t.classList.remove("show"), 3000); }

  // ---------- Маршрутизация ----------
  function route() {
    const h = location.hash;
    const m = h.match(/^#\/hall\/(\w+)/);
    closeDrawer();
    if (m && HALLS[m[1]]) return enterHall(m[1]);
    if (hall.type) leaveHall();
    if (h === "#/map") setTimeout(() => $("#guide").scrollIntoView({ behavior: "smooth" }), 50);
  }
  window.addEventListener("hashchange", route);
  const onScroll = () => $("#top").classList.toggle("solid", window.scrollY > 40);
  window.addEventListener("scroll", onScroll, { passive: true });

  renderFilters(); renderVenueList(); renderCount(); onScroll(); route();
})();
