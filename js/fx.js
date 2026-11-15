/* Обработка фото под печать: растр (точки), ксерокс, пиксели, простое ч/б.
   Размеры точек/пикселей заданы в единицах макета → превью и печать выглядят одинаково. */
(() => {
  const P5 = window.P5;
  const FX = (P5.fx = {});
  const cache = new Map();
  const MAX = 48;
  function memo(key, make) {
    if (cache.has(key)) { const v = cache.get(key); cache.delete(key); cache.set(key, v); return v; }
    const v = make();
    cache.set(key, v);
    if (cache.size > MAX) cache.delete(cache.keys().next().value);
    return v;
  }
  FX.clear = (prefix) => { for (const k of [...cache.keys()]) if (!prefix || k.startsWith(prefix)) cache.delete(k); };
  FX.memo = memo;

  // уровни яркости фото (1% / 99%), считаем один раз на фото
  const stats = new Map();
  function levels(ph) {
    if (stats.has(ph.id)) return stats.get(ph.id);
    const w = 240, h = Math.max(1, Math.round((ph.h / ph.w) * 240));
    const c = P5.canvas(w, h), x = c.getContext("2d", { willReadFrequently: true });
    x.drawImage(ph.img, 0, 0, w, h);
    const d = x.getImageData(0, 0, w, h).data;
    const hist = new Uint32Array(256); let n = 0;
    for (let i = 0; i < d.length; i += 4) if (d[i + 3] > 128) { hist[(0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]) | 0]++; n++; }
    let lo = 0, hi = 255, acc = 0;
    for (let v = 0; v < 256; v++) { acc += hist[v]; if (acc >= n * 0.01) { lo = v; break; } }
    acc = 0;
    for (let v = 255; v >= 0; v--) { acc += hist[v]; if (acc >= n * 0.012) { hi = v; break; } }
    const r = { lo, hi: Math.max(lo + 1, hi) };
    stats.set(ph.id, r);
    return r;
  }
  FX.forget = (id) => { stats.delete(id); FX.clear(id + "|"); };

  // поле «темноты» 0..1 и прозрачности 0..1 на заданной сетке
  function field(ph, sw, sh, card, inv) {
    sw = Math.max(2, Math.round(sw)); sh = Math.max(2, Math.round(sh));
    const c = P5.canvas(sw, sh), x = c.getContext("2d", { willReadFrequently: true });
    x.imageSmoothingQuality = "high";
    if (card) { x.fillStyle = "#fff"; x.fillRect(0, 0, sw, sh); }
    x.drawImage(ph.img, 0, 0, sw, sh);
    const d = x.getImageData(0, 0, sw, sh).data, n = sw * sh;
    const { lo, hi } = levels(ph), span = hi - lo;
    const D = new Float32Array(n), A = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const a = d[i * 4 + 3] / 255;
      const l = 0.299 * d[i * 4] + 0.587 * d[i * 4 + 1] + 0.114 * d[i * 4 + 2];
      let g = (l - lo) / span; g = g < 0 ? 0 : g > 1 ? 1 : g;
      D[i] = inv ? g : 1 - g; A[i] = a;
    }
    return { D, A, w: sw, h: sh };
  }
  function sample(f, x, y) {
    x = Math.max(0, Math.min(f.w - 1.001, x - 0.5)); y = Math.max(0, Math.min(f.h - 1.001, y - 0.5));
    const x0 = x | 0, y0 = y | 0, tx = x - x0, ty = y - y0, i = y0 * f.w + x0;
    const v = (j) => f.D[j] * f.A[j];
    return (v(i) * (1 - tx) + v(i + 1) * tx) * (1 - ty) + (v(i + f.w) * (1 - tx) + v(i + f.w + 1) * tx) * ty;
  }

  // белая (или любая) подложка по силуэту — чтобы фото не просвечивало
  FX.knock = (ph, wpx, hpx, color) => memo(`${ph.id}|knock|${wpx}x${hpx}|${color}`, () => {
    const c = P5.canvas(wpx, hpx), x = c.getContext("2d");
    x.drawImage(ph.img, 0, 0, c.width, c.height);
    x.globalCompositeOperation = "source-in";
    x.fillStyle = color; x.fillRect(0, 0, c.width, c.height);
    return c;
  });

  // растр: круглые точки под 45°, как в газете
  FX.halftone = (ph, wpx, hpx, ppu, color, cellU = 6.2, card = false, inv = false) => memo(`${ph.id}|ht|${wpx}x${hpx}|${color}|${cellU}|${card}|${inv}`, () => {
    const cell = Math.max(2.2, cellU * ppu);
    const f = field(ph, (wpx / cell) * 2, (hpx / cell) * 2, card, inv);
    const c = P5.canvas(wpx, hpx), x = c.getContext("2d");
    x.fillStyle = color;
    const ang = Math.PI / 4, ca = Math.cos(ang), sa = Math.sin(ang);
    const cx = c.width / 2, cy = c.height / 2, n = Math.ceil(Math.hypot(c.width, c.height) / cell / 2) + 2;
    const kx = f.w / c.width, ky = f.h / c.height;
    x.beginPath();
    for (let i = -n; i <= n; i++) for (let j = -n; j <= n; j++) {
      const u = i * cell, v = j * cell;
      const px = cx + u * ca - v * sa, py = cy + u * sa + v * ca;
      if (px < -cell || py < -cell || px > c.width + cell || py > c.height + cell) continue;
      let d = sample(f, px * kx, py * ky);
      if (d < 0.035) continue;
      d = Math.pow(d, 0.92);
      const r = cell * 0.7 * Math.sqrt(d);
      x.moveTo(px + r, py); x.arc(px, py, r, 0, Math.PI * 2);
    }
    x.fill();
    return c;
  });

  // ксерокс: жёсткий контраст + зерно, края чёткие при любом масштабе
  FX.xerox = (ph, wpx, hpx, ppu, color, seed = 7, card = false, inv = false) => memo(`${ph.id}|xr|${wpx}x${hpx}|${color}|${seed}|${card}|${inv}`, () => {
    const wu = wpx / ppu, hu = hpx / ppu;
    const res = Math.min(1.5, 1400 / Math.max(wu, hu));
    const f = field(ph, wu * res, hu * res, card, inv);
    const r = P5.rng(seed);
    const fc = P5.canvas(f.w, f.h), fx = fc.getContext("2d", { willReadFrequently: true });
    const img = fx.createImageData(f.w, f.h);
    for (let i = 0; i < f.w * f.h; i++) {
      const g = 1 - f.D[i];
      let t = 1 / (1 + Math.exp(-(g - 0.5) / 0.075));
      t += (r() - 0.5) * 0.5;
      const v = Math.max(0, Math.min(255, t * 255));
      img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = v;
      img.data[i * 4 + 3] = 255;
    }
    fx.putImageData(img, 0, 0);
    const c = P5.canvas(wpx, hpx), x = c.getContext("2d", { willReadFrequently: true });
    x.imageSmoothingEnabled = true; x.imageSmoothingQuality = "high";
    x.filter = `blur(${Math.max(0.4, ppu * 0.45)}px)`;
    x.drawImage(fc, 0, 0, c.width, c.height);
    x.filter = "none";
    const A = P5.canvas(wpx, hpx), ax = A.getContext("2d", { willReadFrequently: true });
    if (card) { ax.fillStyle = "#000"; ax.fillRect(0, 0, A.width, A.height); } else ax.drawImage(ph.img, 0, 0, A.width, A.height);
    const al = ax.getImageData(0, 0, A.width, A.height).data;
    const out = x.getImageData(0, 0, c.width, c.height), o = out.data;
    const col = hex(color);
    for (let i = 0; i < o.length; i += 4) {
      const g = o[i];
      let a = (132 - g) * 5 + 128; a = a < 0 ? 0 : a > 255 ? 255 : a;
      a = (a * al[i + 3]) / 255;
      o[i] = col[0]; o[i + 1] = col[1]; o[i + 2] = col[2]; o[i + 3] = a;
    }
    x.putImageData(out, 0, 0);
    return c;
  });

  // пиксели: дизеринг Байера, как в старых играх
  const B8 = [0,32,8,40,2,34,10,42,48,16,56,24,50,18,58,26,12,44,4,36,14,46,6,38,60,28,52,20,62,30,54,22,
              3,35,11,43,1,33,9,41,51,19,59,27,49,17,57,25,15,47,7,39,13,45,5,37,63,31,55,23,61,29,53,21];
  FX.dither = (ph, wpx, hpx, ppu, color, paper, cellU = 5, card = false, inv = false) => memo(`${ph.id}|dt|${wpx}x${hpx}|${color}|${paper}|${cellU}|${card}|${inv}`, () => {
    const cell = cellU * ppu;
    const gw = Math.max(2, Math.floor(wpx / cell)), gh = Math.max(2, Math.floor(hpx / cell));
    const f = field(ph, gw, gh, card, inv);
    const c = P5.canvas(wpx, hpx), x = c.getContext("2d");
    const ox = (c.width - gw * cell) / 2, oy = c.height - gh * cell;
    if (paper) {
      x.fillStyle = paper; x.beginPath();
      for (let j = 0; j < gh; j++) for (let i = 0; i < gw; i++) if (f.A[j * gw + i] > 0.5) x.rect(ox + i * cell, oy + j * cell, cell + 0.6, cell + 0.6);
      x.fill();
    }
    x.fillStyle = color; x.beginPath();
    for (let j = 0; j < gh; j++) for (let i = 0; i < gw; i++) {
      const k = j * gw + i;
      if (f.A[k] < 0.5) continue;
      const g = 1 - f.D[k], t = (B8[(j % 8) * 8 + (i % 8)] + 0.5) / 64;
      if (g < t) x.rect(ox + i * cell, oy + j * cell, cell + 0.6, cell + 0.6);
    }
    x.fill();
    return c;
  });

  // обычное ч/б фото с подтянутым контрастом
  FX.mono = (ph, wpx, hpx) => memo(`${ph.id}|mono|${wpx}x${hpx}`, () => {
    const c = P5.canvas(wpx, hpx), x = c.getContext("2d");
    const { lo, hi } = levels(ph);
    const k = 255 / (hi - lo);
    x.filter = `grayscale(1) brightness(${(1 - lo / 255).toFixed(3)}) contrast(${Math.min(2, k / 1).toFixed(3)})`;
    x.drawImage(ph.img, 0, 0, c.width, c.height);
    x.filter = "none";
    return c;
  });

  function hex(c) {
    const m = c.replace("#", "");
    const v = m.length === 3 ? m.split("").map((s) => parseInt(s + s, 16)) : [0, 2, 4].map((i) => parseInt(m.substr(i, 2), 16));
    return v;
  }
  FX.hex = hex;
  FX.rgba = (c, a) => { const [r, g, b] = hex(c); return `rgba(${r},${g},${b},${a})`; };

  // зерно бумаги (для ксерокса), плитка зависит от масштаба
  FX.grain = (ppu) => memo(`grain|${ppu.toFixed(3)}`, () => {
    const u = 260, px = Math.max(64, Math.round(u * ppu));
    const c = P5.canvas(px, px), x = c.getContext("2d");
    const img = x.createImageData(px, px), r = P5.rng(11);
    for (let i = 0; i < px * px; i++) {
      const v = r();
      const a = v < 0.5 ? (0.5 - v) * 70 : 0;
      img.data[i * 4 + 3] = a;
    }
    x.putImageData(img, 0, 0);
    if (ppu > 1.2) { const c2 = P5.canvas(px, px), x2 = c2.getContext("2d"); x2.filter = `blur(${(ppu * 0.35).toFixed(2)}px)`; x2.drawImage(c, 0, 0); return c2; }
    return c;
  });
})();
