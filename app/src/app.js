// Coral Sands Cover Studio — editor wiring.
// Live preview canvas, drag-to-pan / scroll-to-zoom / double-click to re-centre,
// drop a photo onto a panel, swap panels, auto-fill, one-photo-to-all,
// surprise-me, layered text editing and one-click export of all 3 sizes.
// Written from scratch in this session.
import { drawCover, defaultState, SAMPLES, LAYOUTS, GRADES } from './cover.js';

const params = new URLSearchParams(location.search);
const shot = params.get('shot');
const state = defaultState();
const images = new Map();
let selected = 0;
let swapMode = false;
let swapFirst = null;
const uploads = [];

const canvas = document.getElementById('cover');
const ctx = canvas.getContext('2d');
const statusEl = document.getElementById('status');

export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

async function loadAllPhotos() {
  for (const s of SAMPLES) {
    if (!images.has(s.src)) {
      try { images.set(s.src, await loadImage(s.src)); } catch { /* keep going */ }
    }
  }
  for (const u of uploads) {
    if (!images.has(u.src)) {
      try { images.set(u.src, await loadImage(u.src)); } catch { /* keep going */ }
    }
  }
}

function panelZoneH(W, H) {
  const aspect = W / H;
  return H * (aspect > 1.4 ? 0.72 : aspect > 0.9 ? 0.70 : 0.66);
}

function currentRects() {
  const W = canvas.width;
  const H = canvas.height;
  return (LAYOUTS[state.layout] || LAYOUTS['hero-left']).rects(W, panelZoneH(W, H));
}

function redraw() {
  // Cover shots show the clean export; the editor shows the selection.
  const showSelection = !shot || shot === 'editor';
  drawCover(ctx, state, images, canvas.width, canvas.height, { selected: showSelection ? selected : null });
}

function setStatus(msg) {
  if (statusEl) statusEl.textContent = msg;
}

function photoLabel(src) {
  const s = SAMPLES.find((x) => x.src === src);
  if (s) return s.label;
  const u = uploads.find((x) => x.src === src);
  return u ? u.label : 'Photo';
}

// ---- photo strip ---------------------------------------------------------
function buildStrip() {
  const strip = document.getElementById('strip');
  if (!strip) return;
  strip.innerHTML = '';
  const all = [...SAMPLES, ...uploads];
  for (const s of all) {
    const d = document.createElement('div');
    d.className = 'thumb';
    d.draggable = true;
    d.dataset.src = s.src;
    d.title = `Drag onto a panel: ${s.label}`;
    const img = document.createElement('img');
    img.src = s.src;
    img.alt = s.label;
    img.draggable = false;
    const cap = document.createElement('span');
    cap.textContent = s.label;
    d.append(img, cap);
    d.addEventListener('dragstart', (e) => {
      e.dataTransfer.setData('text/plain', s.src);
      e.dataTransfer.effectAllowed = 'copy';
    });
    d.addEventListener('click', () => {
      state.panels[selected].photo = s.src;
      state.panels[selected].ox = 0;
      state.panels[selected].oy = 0;
      state.panels[selected].zoom = 1;
      redraw();
      setStatus(`Panel ${selected + 1} is now “${s.label}”.`);
    });
    strip.appendChild(d);
  }
}

// ---- text + control bindings ---------------------------------------------
function bindText(id, key) {
  const el = document.getElementById(id);
  if (!el) return;
  el.value = state[key];
  el.addEventListener('input', () => { state[key] = el.value; redraw(); });
}

function bindPanelText(id, key) {
  const el = document.getElementById(id);
  if (!el) return;
  el.value = state.panels[selected][key];
  el.addEventListener('input', () => { state.panels[selected][key] = el.value; redraw(); });
}

function refreshPanelFields() {
  for (const key of ['place', 'time', 'note']) {
    const el = document.getElementById('panel-' + key);
    if (el) el.value = state.panels[selected][key];
  }
  const sel = document.getElementById('selected-panel');
  if (sel) sel.textContent = `Panel ${selected + 1} · ${photoLabel(state.panels[selected].photo)}`;
}

function bindRange(id, key, fmt) {
  const el = document.getElementById(id);
  if (!el) return;
  const out = document.getElementById(id + '-val');
  const show = () => { if (out) out.textContent = fmt(state[key]); };
  el.value = state[key];
  show();
  el.addEventListener('input', () => { state[key] = Number(el.value); show(); redraw(); });
}

function buildPickers() {
  const layoutBox = document.getElementById('layouts');
  if (layoutBox) {
    layoutBox.innerHTML = '';
    for (const [key, L] of Object.entries(LAYOUTS)) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'pick' + (state.layout === key ? ' active' : '');
      b.textContent = L.label;
      b.addEventListener('click', () => {
        state.layout = key;
        layoutBox.querySelectorAll('.pick').forEach((x) => x.classList.remove('active'));
        b.classList.add('active');
        redraw();
      });
      layoutBox.appendChild(b);
    }
  }
  const gradeBox = document.getElementById('grades');
  if (gradeBox) {
    gradeBox.innerHTML = '';
    for (const [key, G] of Object.entries(GRADES)) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'pick' + (state.grade === key ? ' active' : '');
      b.textContent = G.label;
      b.addEventListener('click', () => {
        state.grade = key;
        gradeBox.querySelectorAll('.pick').forEach((x) => x.classList.remove('active'));
        b.classList.add('active');
        redraw();
      });
      gradeBox.appendChild(b);
    }
  }
}

// ---- canvas pointer: select, pan, zoom, re-centre ------------------------
function canvasPoint(e) {
  const r = canvas.getBoundingClientRect();
  return {
    x: ((e.clientX - r.left) / r.width) * canvas.width,
    y: ((e.clientY - r.top) / r.height) * canvas.height,
  };
}

function panelAt(x, y) {
  const rects = currentRects();
  for (let i = rects.length - 1; i >= 0; i--) {
    const r = rects[i];
    if (x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h) return i;
  }
  return -1;
}

let dragging = null;
canvas.addEventListener('pointerdown', (e) => {
  const p = canvasPoint(e);
  const i = panelAt(p.x, p.y);
  if (i < 0) return;
  if (swapMode) {
    if (swapFirst == null) {
      swapFirst = i;
      setStatus(`Swap: picked panel ${i + 1}. Click another panel to swap.`);
    } else {
      const a = state.panels[swapFirst];
      state.panels[swapFirst] = state.panels[i];
      state.panels[i] = a;
      setStatus(`Swapped panels ${swapFirst + 1} and ${i + 1}.`);
      swapFirst = null;
      swapMode = false;
      const sb = document.getElementById('swap');
      if (sb) sb.classList.remove('active');
    }
    redraw();
    return;
  }
  selected = i;
  refreshPanelFields();
  dragging = { i, x: p.x, y: p.y, moved: false };
  canvas.setPointerCapture(e.pointerId);
  redraw();
});

canvas.addEventListener('pointermove', (e) => {
  if (!dragging) return;
  const p = canvasPoint(e);
  const rect = currentRects()[dragging.i];
  const panel = state.panels[dragging.i];
  panel.ox = Math.max(-0.6, Math.min(0.6, panel.ox + (p.x - dragging.x) / rect.w));
  panel.oy = Math.max(-0.6, Math.min(0.6, panel.oy + (p.y - dragging.y) / rect.h));
  if (Math.abs(p.x - dragging.x) + Math.abs(p.y - dragging.y) > 3) dragging.moved = true;
  dragging.x = p.x;
  dragging.y = p.y;
  redraw();
});

canvas.addEventListener('pointerup', () => { dragging = null; });

canvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  const p = canvasPoint(e);
  const i = panelAt(p.x, p.y);
  if (i < 0) return;
  selected = i;
  const panel = state.panels[i];
  panel.zoom = Math.max(1, Math.min(3, panel.zoom * (e.deltaY < 0 ? 1.08 : 0.93)));
  refreshPanelFields();
  redraw();
}, { passive: false });

canvas.addEventListener('dblclick', (e) => {
  const p = canvasPoint(e);
  const i = panelAt(p.x, p.y);
  if (i < 0) return;
  state.panels[i].ox = 0;
  state.panels[i].oy = 0;
  state.panels[i].zoom = 1;
  selected = i;
  refreshPanelFields();
  redraw();
  setStatus(`Panel ${i + 1} re-centred.`);
});

// Drop a photo (from the strip, or a file from the machine) onto a panel.
canvas.addEventListener('dragover', (e) => { e.preventDefault(); });
canvas.addEventListener('drop', async (e) => {
  e.preventDefault();
  const p = canvasPoint(e);
  const i = panelAt(p.x, p.y);
  if (i < 0) return;
  const src = e.dataTransfer.getData('text/plain');
  if (src) {
    state.panels[i].photo = src;
    state.panels[i].ox = 0;
    state.panels[i].oy = 0;
    state.panels[i].zoom = 1;
    selected = i;
    refreshPanelFields();
    redraw();
    setStatus(`Panel ${i + 1} is now “${photoLabel(src)}”.`);
    return;
  }
  const file = e.dataTransfer.files && e.dataTransfer.files[0];
  if (file && file.type.startsWith('image/')) {
    await addUpload(file, i);
  }
});

async function addUpload(file, panelIndex) {
  const url = URL.createObjectURL(file);
  const img = await loadImage(url);
  const src = url;
  images.set(src, img);
  const label = file.name.replace(/\.[^.]+$/, '').slice(0, 18) || 'Your photo';
  uploads.push({ id: 'up' + uploads.length, src, label });
  if (panelIndex != null) {
    state.panels[panelIndex].photo = src;
    state.panels[panelIndex].ox = 0;
    state.panels[panelIndex].oy = 0;
    state.panels[panelIndex].zoom = 1;
    selected = panelIndex;
  }
  buildStrip();
  refreshPanelFields();
  redraw();
  setStatus(`Added “${label}” — drag it onto any panel.`);
}

// ---- actions --------------------------------------------------------------
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function autoFill() {
  const pool = shuffle([...SAMPLES.map((s) => s.src), ...uploads.map((u) => u.src)]);
  state.panels.forEach((p, i) => {
    p.photo = pool[i % pool.length];
    p.ox = 0; p.oy = 0; p.zoom = 1;
  });
  redraw();
  setStatus('Auto-filled: every panel got a different photo.');
}

function onePhotoToAll() {
  const src = state.panels[selected].photo;
  const crops = [
    { ox: -0.18, oy: -0.08, zoom: 1.35 },
    { ox: 0.18, oy: 0.05, zoom: 1.35 },
    { ox: 0, oy: -0.18, zoom: 1.5 },
    { ox: -0.1, oy: 0.18, zoom: 1.5 },
    { ox: 0.22, oy: -0.12, zoom: 1.4 },
    { ox: 0, oy: 0, zoom: 1.15 },
  ];
  state.panels.forEach((p, i) => {
    p.photo = src;
    p.ox = crops[i].ox; p.oy = crops[i].oy; p.zoom = crops[i].zoom;
  });
  redraw();
  setStatus(`One photo (“${photoLabel(src)}”) fills all 6 panels, each cropped differently.`);
}

const SURPRISE_TITLES = ['CORAL SANDS', 'PALM HEIST', 'NEON TIDE', 'SALT & SMOKE', 'VICE PALMS', 'GOLDEN GETAWAY'];
const SURPRISE_SUBS = ['Salt air & neon nights', 'Chase the last light', 'No maps, just vibes', 'Every sunset a getaway', 'Trouble looks good here'];
const SURPRISE_TAGS = ['SIX NIGHTS · ONE COAST · NO WAY BACK', 'DRIVE FAST · SHINE BRIGHT · VANISH', 'THE COAST NEVER SLEEPS', 'GOLDEN HOUR, EVERY HOUR'];
const SURPRISE_QUOTES = ['Sunset tastes better here', 'The coast never sleeps', 'Every light is a dare', 'Paradise, with a record'];

function surpriseMe() {
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  state.layout = pick(Object.keys(LAYOUTS));
  state.grade = pick(Object.keys(GRADES));
  state.gradeStrength = 0.7 + Math.random() * 0.3;
  state.title = pick(SURPRISE_TITLES);
  state.subtitle = pick(SURPRISE_SUBS);
  state.tagline = pick(SURPRISE_TAGS);
  state.quote = pick(SURPRISE_QUOTES);
  autoFill();
  const t = document.getElementById('text-title');
  if (t) t.value = state.title;
  const s = document.getElementById('text-subtitle');
  if (s) s.value = state.subtitle;
  const g = document.getElementById('text-tagline');
  if (g) g.value = state.tagline;
  const q = document.getElementById('text-quote');
  if (q) q.value = state.quote;
  buildPickers();
  const gs = document.getElementById('grade-strength');
  if (gs) gs.value = state.gradeStrength;
  setStatus('Surprise! New layout, grade, photos and words.');
}

function download(blob, name) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}

function exportOne(w, h, name) {
  return new Promise((resolve) => {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    drawCover(c.getContext('2d'), state, images, w, h);
    c.toBlob((blob) => {
      if (blob) download(blob, name);
      resolve();
    }, 'image/png');
  });
}

async function exportAll() {
  setStatus('Exporting 3 PNGs…');
  await exportOne(1080, 1080, 'coral-sands-1080x1080.png');
  await exportOne(1080, 1350, 'coral-sands-1080x1350.png');
  await exportOne(1920, 1080, 'coral-sands-1920x1080.png');
  setStatus('Saved 3 PNGs: 1080×1080, 1080×1350, 1920×1080.');
}

// ---- shot mode (deterministic screenshots) ---------------------------------
function applyShot() {
  if (!shot || shot === 'editor') return false;
  document.body.classList.add('shot');
  if (shot === 'cover') {
    canvas.width = 1920; canvas.height = 1080;
  } else if (shot === 'square') {
    canvas.width = 1080; canvas.height = 1080;
  } else if (shot === 'portrait') {
    canvas.width = 1080; canvas.height = 1350;
  }
  return true;
}

// ---- boot ------------------------------------------------------------------
async function boot() {
  const isShot = applyShot();
  buildStrip();
  buildPickers();
  bindText('text-title', 'title');
  bindText('text-subtitle', 'subtitle');
  bindText('text-tagline', 'tagline');
  bindText('text-quote', 'quote');
  bindText('text-quotesource', 'quoteSource');
  bindText('text-badge', 'badge');
  bindText('text-vol', 'vol');
  bindText('text-ribbon', 'ribbon');
  bindText('text-credits', 'credits');
  bindPanelText('panel-place', 'place');
  bindPanelText('panel-time', 'time');
  bindPanelText('panel-note', 'note');
  bindRange('grade-strength', 'gradeStrength', (v) => `${Math.round(v * 100)}%`);
  bindRange('grade-contrast', 'contrast', (v) => `${v.toFixed(2)}×`);
  bindRange('grade-saturation', 'saturation', (v) => `${v.toFixed(2)}×`);
  bindRange('grade-grain', 'grain', (v) => `${Math.round(v * 100)}%`);
  const halftone = document.getElementById('fx-halftone');
  if (halftone) {
    halftone.checked = state.halftone;
    halftone.addEventListener('change', () => { state.halftone = halftone.checked; redraw(); });
  }
  const vignette = document.getElementById('fx-vignette');
  if (vignette) {
    vignette.checked = state.vignette;
    vignette.addEventListener('change', () => { state.vignette = vignette.checked; redraw(); });
  }
  const up = document.getElementById('upload');
  if (up) up.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (file) await addUpload(file, selected);
    e.target.value = '';
  });
  const bind = (id, fn) => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('click', fn);
  };
  bind('autofill', autoFill);
  bind('onephoto', onePhotoToAll);
  bind('surprise', surpriseMe);
  bind('export-all', exportAll);
  bind('export-square', () => exportOne(1080, 1080, 'coral-sands-1080x1080.png'));
  bind('export-portrait', () => exportOne(1080, 1350, 'coral-sands-1080x1350.png'));
  bind('export-wide', () => exportOne(1920, 1080, 'coral-sands-1920x1080.png'));
  bind('swap', () => {
    swapMode = !swapMode;
    swapFirst = null;
    const sb = document.getElementById('swap');
    if (sb) sb.classList.toggle('active', swapMode);
    setStatus(swapMode ? 'Swap mode: click two panels to swap them.' : 'Swap mode off.');
  });
  bind('recenter', () => {
    state.panels[selected].ox = 0;
    state.panels[selected].oy = 0;
    state.panels[selected].zoom = 1;
    redraw();
    setStatus(`Panel ${selected + 1} re-centred.`);
  });
  refreshPanelFields();
  await loadAllPhotos();
  redraw();
  if (isShot) document.body.classList.add('ready');
}

boot();
