// Coral Sands Cover Studio — cover renderer.
// Draws a six-panel GTA-style poster cover onto any 2D canvas at any size.
// Written from scratch in this session. No Rockstar art, logos or fonts:
// lettering is system fonts only, every photo is an original/AI-made sample
// or a photo the user loads from their own machine.

export const SAMPLES = [
  { id: 'convertible', src: 'samples/convertible.jpg', label: 'Convertible' },
  { id: 'neonportrait', src: 'samples/neonportrait.jpg', label: 'Neon portrait' },
  { id: 'coastalroad', src: 'samples/coastalroad.jpg', label: 'Coastal road' },
  { id: 'gasstation', src: 'samples/gasstation.jpg', label: 'Gas station' },
  { id: 'marina', src: 'samples/marina.jpg', label: 'Marina' },
  { id: 'lifeguard', src: 'samples/lifeguard.jpg', label: 'Lifeguard tower' },
  { id: 'boulevard', src: 'samples/boulevard.jpg', label: 'Boulevard' },
  { id: 'pier', src: 'samples/pier.jpg', label: 'Pier' },
];

export const LAYOUTS = {
  'hero-left': {
    label: 'Hero left',
    rects(pw, ph) {
      return [
        { x: 0, y: 0, w: 0.52, h: 1 },
        { x: 0.52, y: 0, w: 0.24, h: 0.34 },
        { x: 0.76, y: 0, w: 0.24, h: 0.34 },
        { x: 0.52, y: 0.34, w: 0.24, h: 0.33 },
        { x: 0.76, y: 0.34, w: 0.24, h: 0.33 },
        { x: 0.52, y: 0.67, w: 0.48, h: 0.33 },
      ].map((r) => ({ x: r.x * pw, y: r.y * ph, w: r.w * pw, h: r.h * ph }));
    },
  },
  'hero-right': {
    label: 'Hero right',
    rects(pw, ph) {
      return [
        { x: 0.48, y: 0, w: 0.52, h: 1 },
        { x: 0.24, y: 0, w: 0.24, h: 0.34 },
        { x: 0, y: 0, w: 0.24, h: 0.34 },
        { x: 0.24, y: 0.34, w: 0.24, h: 0.33 },
        { x: 0, y: 0.34, w: 0.24, h: 0.33 },
        { x: 0, y: 0.67, w: 0.48, h: 0.33 },
      ].map((r) => ({ x: r.x * pw, y: r.y * ph, w: r.w * pw, h: r.h * ph }));
    },
  },
  'hero-top': {
    label: 'Hero top',
    rects(pw, ph) {
      return [
        { x: 0, y: 0, w: 1, h: 0.56 },
        { x: 0, y: 0.56, w: 0.34, h: 0.22 },
        { x: 0.34, y: 0.56, w: 0.33, h: 0.22 },
        { x: 0.67, y: 0.56, w: 0.33, h: 0.22 },
        { x: 0, y: 0.78, w: 0.5, h: 0.22 },
        { x: 0.5, y: 0.78, w: 0.5, h: 0.22 },
      ].map((r) => ({ x: r.x * pw, y: r.y * ph, w: r.w * pw, h: r.h * ph }));
    },
  },
  'six-grid': {
    label: 'Six grid',
    rects(pw, ph) {
      const out = [];
      for (let row = 0; row < 2; row++) {
        for (let col = 0; col < 3; col++) {
          out.push({ x: (col / 3) * pw, y: (row / 2) * ph, w: pw / 3, h: ph / 2 });
        }
      }
      return out;
    },
  },
};

export const GRADES = {
  sunset: {
    label: 'Sunset',
    sat: 1.3, con: 1.08, bri: 1.02,
    tint: ['rgba(255,122,26,0.20)', 'rgba(255,45,120,0.16)'],
  },
  neon: {
    label: 'Neon night',
    sat: 1.45, con: 1.14, bri: 0.96,
    tint: ['rgba(255,0,128,0.22)', 'rgba(0,210,255,0.14)'],
  },
  vice: {
    label: 'Vice pink',
    sat: 1.35, con: 1.05, bri: 1.0,
    tint: ['rgba(255,60,160,0.24)', 'rgba(120,40,255,0.12)'],
  },
  golden: {
    label: 'Golden hour',
    sat: 1.2, con: 1.04, bri: 1.06,
    tint: ['rgba(255,190,60,0.20)', 'rgba(255,120,20,0.10)'],
  },
};

// Deterministic pseudo-random, so every export of the same state is identical.
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

let grainTile = null;
function getGrainTile() {
  if (grainTile) return grainTile;
  const c = document.createElement('canvas');
  c.width = 128; c.height = 128;
  const g = c.getContext('2d');
  const img = g.createImageData(128, 128);
  const rnd = mulberry32(20261119);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = Math.floor(rnd() * 255);
    img.data[i] = v; img.data[i + 1] = v; img.data[i + 2] = v; img.data[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  grainTile = c;
  return c;
}

let halftoneTile = null;
function getHalftoneTile() {
  if (halftoneTile) return halftoneTile;
  const c = document.createElement('canvas');
  c.width = 12; c.height = 12;
  const g = c.getContext('2d');
  g.clearRect(0, 0, 12, 12);
  g.fillStyle = '#000';
  g.beginPath(); g.arc(6, 6, 1.6, 0, Math.PI * 2); g.fill();
  halftoneTile = c;
  return c;
}

function roundRectPath(ctx, x, y, w, h, r) {
  const rad = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rad, y);
  ctx.arcTo(x + w, y, x + w, y + h, rad);
  ctx.arcTo(x + w, y + h, x, y + h, rad);
  ctx.arcTo(x, y + h, x, y, rad);
  ctx.arcTo(x, y, x + w, y, rad);
  ctx.closePath();
}

function drawPalm(ctx, x, y, s, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 2.4;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(3, -14, 8, -26);
  ctx.stroke();
  for (let i = 0; i < 6; i++) {
    const a = (-Math.PI * 0.15) - (i * Math.PI) / 7;
    const ex = 8 + Math.cos(a) * 15;
    const ey = -26 + Math.sin(a) * 8;
    ctx.beginPath();
    ctx.moveTo(8, -26);
    ctx.quadraticCurveTo(8 + Math.cos(a) * 9, -26 + Math.sin(a) * 2, ex, ey);
    ctx.stroke();
  }
  ctx.restore();
}

function drawBarcode(ctx, x, y, w, h) {
  const rnd = mulberry32(77);
  ctx.save();
  ctx.fillStyle = '#fff';
  ctx.fillRect(x - 3, y - 3, w + 6, h + 6);
  ctx.fillStyle = '#111';
  let bx = x;
  while (bx < x + w - 2) {
    const bw = 1 + Math.floor(rnd() * 3);
    if (rnd() > 0.45) ctx.fillRect(bx, y, bw, h);
    bx += bw + 1;
  }
  ctx.restore();
}

function drawSeal(ctx, cx, cy, r, year) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.fillStyle = '#ffc21c';
  ctx.strokeStyle = '#7a4a00';
  ctx.lineWidth = Math.max(1.5, r * 0.05);
  ctx.beginPath();
  const spikes = 18;
  for (let i = 0; i < spikes * 2; i++) {
    const ang = (i / (spikes * 2)) * Math.PI * 2;
    const rad = i % 2 === 0 ? r : r * 0.86;
    const px = Math.cos(ang) * rad;
    const py = Math.sin(ang) * rad;
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.72, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = '#241100';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `900 ${r * 0.3}px "Arial Black", sans-serif`;
  ctx.fillText('EST.', 0, -r * 0.22);
  ctx.font = `900 ${r * 0.44}px "Arial Black", sans-serif`;
  ctx.fillText(String(year), 0, r * 0.22);
  ctx.restore();
}

function fitFont(ctx, text, maxWidth, startPx, family, weight) {
  let px = startPx;
  while (px > 12) {
    ctx.font = `${weight} ${px}px ${family}`;
    if (ctx.measureText(text).width <= maxWidth) return px;
    px -= 2;
  }
  return px;
}

function drawPanelChip(ctx, rect, panel, scale) {
  const pad = 10 * scale;
  const fs1 = Math.max(11, rect.w * 0.052);
  const fs2 = Math.max(9, rect.w * 0.036);
  ctx.save();
  ctx.font = `900 ${fs1}px "Arial Black", sans-serif`;
  const w1 = ctx.measureText(panel.place).width;
  ctx.font = `${fs2}px Arial, sans-serif`;
  const w2 = ctx.measureText(`${panel.time} · ${panel.note}`).width;
  const bw = Math.max(w1, w2) + pad * 2;
  const bh = fs1 + fs2 + pad * 2.1;
  const bx = rect.x + 8 * scale;
  const by = rect.y + rect.h - bh - 8 * scale;
  ctx.fillStyle = 'rgba(8,4,14,0.85)';
  roundRectPath(ctx, bx, by, bw, bh, 4 * scale);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.font = `900 ${fs1}px "Arial Black", sans-serif`;
  ctx.fillText(panel.place, bx + pad, by + pad * 0.7);
  ctx.fillStyle = '#ffb3d9';
  ctx.font = `${fs2}px Arial, sans-serif`;
  ctx.fillText(`${panel.time} · ${panel.note}`, bx + pad, by + pad * 0.7 + fs1 + 3);
  ctx.restore();
}

function drawPanelPhoto(ctx, img, rect, panel, grade, strength, grainAmt, halftone, vignette) {
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  const base = Math.max(rect.w / iw, rect.h / ih);
  const s = base * (panel.zoom || 1);
  const dw = iw * s;
  const dh = ih * s;
  const cx = rect.x + rect.w / 2 + (panel.ox || 0) * rect.w;
  const cy = rect.y + rect.h / 2 + (panel.oy || 0) * rect.h;
  ctx.save();
  ctx.beginPath();
  ctx.rect(rect.x, rect.y, rect.w, rect.h);
  ctx.clip();
  ctx.filter = `saturate(${(grade.sat * strength + (1 - strength)).toFixed(3)}) ` +
    `contrast(${(grade.con * strength + (1 - strength)).toFixed(3)}) ` +
    `brightness(${(grade.bri * strength + (1 - strength)).toFixed(3)})`;
  ctx.drawImage(img, cx - dw / 2, cy - dh / 2, dw, dh);
  ctx.filter = 'none';
  // Warm grade wash, stronger at the bottom of each panel.
  const wash = ctx.createLinearGradient(0, rect.y, 0, rect.y + rect.h);
  wash.addColorStop(0, grade.tint[0].replace(/[\d.]+\)$/, `${(0.10 * strength).toFixed(3)})`));
  wash.addColorStop(1, grade.tint[1].replace(/[\d.]+\)$/, `${(0.22 * strength).toFixed(3)})`));
  ctx.globalCompositeOperation = 'overlay';
  ctx.fillStyle = wash;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  ctx.globalCompositeOperation = 'source-over';
  if (halftone) {
    ctx.globalAlpha = 0.05;
    ctx.fillStyle = ctx.createPattern(getHalftoneTile(), 'repeat');
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
    ctx.globalAlpha = 1;
  }
  if (grainAmt > 0.02) {
    ctx.globalAlpha = grainAmt * 0.14;
    ctx.fillStyle = ctx.createPattern(getGrainTile(), 'repeat');
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
    ctx.globalAlpha = 1;
  }
  if (vignette) {
    const vg = ctx.createRadialGradient(
      rect.x + rect.w / 2, rect.y + rect.h / 2, Math.min(rect.w, rect.h) * 0.35,
      rect.x + rect.w / 2, rect.y + rect.h / 2, Math.max(rect.w, rect.h) * 0.75,
    );
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, 'rgba(10,0,10,0.32)');
    ctx.fillStyle = vg;
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  }
  ctx.restore();
}

// Main entry: draw the whole cover. images is a Map from photo src -> HTMLImageElement.
// opts.selected (panel index) draws a selection outline for the editor preview.
export function drawCover(ctx, state, images, W, H, opts = {}) {
  const scale = W / 1080;
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = '#160818';
  ctx.fillRect(0, 0, W, H);

  const aspect = W / H;
  const panelZoneH = H * (aspect > 1.4 ? 0.72 : aspect > 0.9 ? 0.70 : 0.66);
  const titleZoneY = panelZoneH;
  const titleZoneH = H - panelZoneH;
  const stripH = Math.max(34 * scale, H * 0.055);

  const layout = LAYOUTS[state.layout] || LAYOUTS['hero-left'];
  const rects = layout.rects(W, panelZoneH);
  const baseGrade = GRADES[state.grade] || GRADES.sunset;
  const grade = {
    ...baseGrade,
    sat: baseGrade.sat * (state.saturation ?? 1),
    con: baseGrade.con * (state.contrast ?? 1),
  };
  const strength = state.gradeStrength ?? 0.8;

  state.panels.forEach((panel, i) => {
    const img = images.get(panel.photo);
    const rect = rects[i];
    if (!rect) return;
    if (img && img.complete && (img.naturalWidth || img.width)) {
      drawPanelPhoto(ctx, img, rect, panel, grade, strength,
        state.grain ?? 0.5, state.halftone !== false, state.vignette !== false);
    } else {
      ctx.fillStyle = '#3a1530';
      ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
    }
    drawPanelChip(ctx, rect, panel, scale);
  });

  // White panel borders + dark outer frame.
  ctx.save();
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = Math.max(2, W * 0.0028);
  rects.forEach((r) => ctx.strokeRect(r.x, r.y, r.w, r.h));
  ctx.strokeStyle = '#14060f';
  ctx.lineWidth = Math.max(6, W * 0.009);
  ctx.strokeRect(0, 0, W, panelZoneH);
  ctx.restore();

  if (opts.selected != null && rects[opts.selected]) {
    const r = rects[opts.selected];
    ctx.save();
    ctx.strokeStyle = '#ffd23e';
    ctx.lineWidth = Math.max(3, W * 0.004);
    ctx.setLineDash([14 * scale, 8 * scale]);
    ctx.strokeRect(r.x + 4, r.y + 4, r.w - 8, r.h - 8);
    ctx.restore();
  }

  // WANTED badge, top-right of the panel zone.
  const badgeR = 30 * scale;
  const bx = W - 168 * scale;
  const by = 34 * scale;
  ctx.save();
  ctx.translate(bx, by);
  ctx.rotate(-0.06);
  ctx.fillStyle = 'rgba(8,4,14,0.88)';
  roundRectPath(ctx, -104 * scale, -badgeR, 208 * scale, badgeR * 2, badgeR);
  ctx.fill();
  ctx.strokeStyle = '#ffd23e';
  ctx.lineWidth = 2.5 * scale;
  ctx.stroke();
  ctx.fillStyle = '#fff';
  ctx.font = `900 ${18 * scale}px "Arial Black", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(state.badge || 'WANTED', -42 * scale, 0);
  ctx.fillStyle = '#ffd23e';
  ctx.font = `${14 * scale}px sans-serif`;
  ctx.fillText('★★★★★', 52 * scale, 0);
  ctx.restore();

  // Title zone: deep magenta gradient.
  const tz = ctx.createLinearGradient(0, titleZoneY, 0, H);
  tz.addColorStop(0, '#2a0a2e');
  tz.addColorStop(0.55, '#4a0f3d');
  tz.addColorStop(1, '#1c0618');
  ctx.fillStyle = tz;
  ctx.fillRect(0, titleZoneY, W, titleZoneH - stripH);

  // Press-quote strip.
  const qy = titleZoneY + (titleZoneH - stripH) * 0.16;
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffd23e';
  ctx.font = `${20 * scale}px sans-serif`;
  const quoteText = `“${state.quote}” — ${state.quoteSource}`;
  const qw = ctx.measureText('★★★★★  ' + quoteText).width;
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  roundRectPath(ctx, W / 2 - qw / 2 - 16 * scale, qy - 15 * scale, qw + 32 * scale, 30 * scale, 15 * scale);
  ctx.fill();
  ctx.fillStyle = '#ffd23e';
  ctx.fillText('★★★★★', W / 2 - qw / 2 + 8 * scale, qy);
  ctx.fillStyle = '#fff';
  ctx.font = `700 ${15 * scale}px Arial, sans-serif`;
  ctx.textAlign = 'left';
  ctx.fillText(quoteText, W / 2 - qw / 2 + 8 * scale + ctx.measureText('★★★★★  ').width, qy);
  ctx.restore();

  // Round seal, left of the title.
  const sealR = Math.min(52 * scale, (titleZoneH - stripH) * 0.28);
  drawSeal(ctx, 78 * scale, titleZoneY + (titleZoneH - stripH) * 0.58, sealR, 2026);

  // Giant gradient title. Capped so it always fits the title zone height,
  // leaving room for the script subtitle underneath it.
  const title = (state.title || 'CORAL SANDS').toUpperCase();
  const titleMaxW = W - 190 * scale;
  const titleCap = (titleZoneH - stripH) * 0.46;
  const titlePx = Math.min(
    fitFont(ctx, title, titleMaxW, 118 * scale, '"Arial Black", "Archivo Black", sans-serif', 900),
    titleCap,
  );
  const titleY = titleZoneY + (titleZoneH - stripH) * 0.46;
  ctx.save();
  ctx.translate(W / 2 + 20 * scale, titleY);
  ctx.rotate(-0.02);
  ctx.font = `900 ${titlePx}px "Arial Black", "Archivo Black", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = '#1c0416';
  ctx.lineWidth = titlePx * 0.1;
  ctx.shadowColor = 'rgba(255,0,140,0.55)';
  ctx.shadowBlur = 22 * scale;
  ctx.shadowOffsetY = 6 * scale;
  const tg = ctx.createLinearGradient(0, -titlePx * 0.55, 0, titlePx * 0.55);
  tg.addColorStop(0, '#ffffff');
  tg.addColorStop(0.45, '#ffe9a3');
  tg.addColorStop(0.75, '#ff9e2c');
  tg.addColorStop(1, '#ff5e1f');
  ctx.strokeText(title, 0, 0);
  ctx.fillStyle = tg;
  ctx.fillText(title, 0, 0);
  ctx.restore();

  // Neon pink script subtitle, overlapping the title's lower right.
  const subPx = Math.max(26 * scale, titlePx * 0.42);
  ctx.save();
  ctx.font = `italic 700 ${subPx}px "Brush Script MT", "Segoe Script", cursive`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = '#ff2e9a';
  ctx.shadowBlur = 18 * scale;
  ctx.fillStyle = '#ff6ec7';
  ctx.translate(W * 0.62, titleY + titlePx * 0.62);
  ctx.rotate(-0.04);
  ctx.fillText(state.subtitle || '', 0, 0);
  ctx.restore();

  // VOL chip + ribbon, top-right of the title zone.
  ctx.save();
  ctx.fillStyle = '#19c8e8';
  roundRectPath(ctx, W - 148 * scale, titleZoneY + 12 * scale, 128 * scale, 34 * scale, 5 * scale);
  ctx.fill();
  ctx.fillStyle = '#062a33';
  ctx.font = `900 ${18 * scale}px "Arial Black", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(state.vol || 'VOL. 07', W - 84 * scale, titleZoneY + 30 * scale);
  ctx.restore();
  ctx.save();
  ctx.translate(W - 10 * scale, titleZoneY + (titleZoneH - stripH) * 0.78);
  ctx.fillStyle = '#ff2e7e';
  const ribbon = state.ribbon || "COLLECTOR'S EDITION";
  ctx.font = `900 ${14 * scale}px "Arial Black", sans-serif`;
  const rw = ctx.measureText(ribbon).width + 28 * scale;
  ctx.beginPath();
  ctx.moveTo(-rw, -15 * scale);
  ctx.lineTo(10 * scale, -15 * scale);
  ctx.lineTo(0, 0);
  ctx.lineTo(10 * scale, 15 * scale);
  ctx.lineTo(-rw, 15 * scale);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(ribbon, -rw / 2 + 4 * scale, 0);
  ctx.restore();

  // Bottom film-poster strip.
  const sy = H - stripH;
  ctx.fillStyle = '#0a0208';
  ctx.fillRect(0, sy, W, stripH);
  drawPalm(ctx, 26 * scale, sy + stripH - 8 * scale, 0.9 * scale, '#3d1533');
  drawPalm(ctx, 62 * scale, sy + stripH - 6 * scale, 0.7 * scale, '#3d1533');
  drawPalm(ctx, W - 150 * scale, sy + stripH - 8 * scale, 0.9 * scale, '#3d1533');
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#fff';
  ctx.font = `900 ${Math.max(12, 15 * scale)}px Arial, sans-serif`;
  ctx.fillText(state.tagline || '', W / 2, sy + stripH * 0.32);
  ctx.fillStyle = '#9a8a96';
  ctx.font = `${Math.max(8, 9.5 * scale)}px Arial, sans-serif`;
  ctx.fillText(state.credits || '', W / 2, sy + stripH * 0.72);
  ctx.restore();
  drawBarcode(ctx, W - 92 * scale, sy + stripH * 0.22, 62 * scale, stripH * 0.56);

  // Outer dark frame.
  ctx.save();
  ctx.strokeStyle = '#14060f';
  ctx.lineWidth = Math.max(6, W * 0.009);
  ctx.strokeRect(0, 0, W, H);
  ctx.restore();
}

export function defaultState() {
  return {
    layout: 'hero-left',
    grade: 'sunset',
    gradeStrength: 0.85,
    contrast: 1.0,
    saturation: 1.0,
    grain: 0.5,
    halftone: true,
    vignette: true,
    title: 'CORAL SANDS',
    subtitle: 'Salt air & neon nights',
    tagline: 'SIX NIGHTS · ONE COAST · NO WAY BACK',
    quote: 'Sunset tastes better here',
    quoteSource: 'THE SANDS GAZETTE',
    badge: 'WANTED',
    vol: 'VOL. 07',
    ribbon: "COLLECTOR'S EDITION",
    credits: 'CORAL SANDS — A CORAL SANDS COVER STUDIO PICTURE · STARRING YOU · SHOT ON YOUR OWN CAMERA',
    panels: [
      { photo: 'samples/convertible.jpg', ox: 0, oy: 0, zoom: 1, place: 'CORAL BOULEVARD', time: '6:42 PM', note: 'TOP DOWN, NO PLANS' },
      { photo: 'samples/neonportrait.jpg', ox: 0, oy: 0, zoom: 1, place: 'NEON ROW', time: '9:15 PM', note: 'TOO BRIGHT TO HIDE' },
      { photo: 'samples/coastalroad.jpg', ox: 0, oy: 0, zoom: 1, place: 'SANDS FREEWAY', time: '7:05 PM', note: 'COASTAL CRUISE' },
      { photo: 'samples/gasstation.jpg', ox: 0, oy: 0, zoom: 1, place: 'SANDS MARINA', time: '7:48 PM', note: 'BOATS AND BAD IDEAS' },
      { photo: 'samples/marina.jpg', ox: 0, oy: 0, zoom: 1, place: 'TOWER 9', time: '6:10 PM', note: 'LAST DIP OF THE DAY' },
      { photo: 'samples/lifeguard.jpg', ox: 0, oy: 0, zoom: 1, place: 'OLD PIER', time: '5:30 AM', note: 'FIRST CAST WINS' },
    ],
  };
}
