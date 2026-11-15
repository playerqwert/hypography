/* Отрисовка сцены: каждый элемент рисуется в своих локальных координатах (центр = 0,0). */
(() => {
  const P5 = window.P5, T = P5.T, FX = P5.fx;
  const D = (P5.draw = {});

  P5.PIX = {
    crown: ["1....1....1", "11..111..11", "111.111.111", "11111111111", "11111111111", "1.1.1.1.1.1", "11111111111"],
    spark: ["...1...", "...1...", "..111..", "1111111", "..111..", "...1...", "...1..."],
    heart: [".11...11.", "1111.1111", "111111111", "111111111", ".1111111.", "..11111..", "...111...", "....1...."],
    star: ["....1....", "....1....", "...111...", "111111111", ".1111111.", "..11111..", "..11.11..", ".11...11.", ".1.....1."],
    skull: [".111111.", "11111111", "1..11..1", "1..11..1", "11111111", ".111111.", ".1.11.1."],
  };

  const setFont = (c, fam, wt, size) => { c.font = T.font(fam, wt, size); };

  D.fill = (c, el, env) => { if (env.transparent) return; c.fillStyle = el.d.color; c.fillRect(-el.w / 2, -el.h / 2, el.w, el.h); };

  D.rect = (c, el) => {
    const { fill, stroke, lw = 6 } = el.d, w = el.w, h = el.h;
    if (fill) { c.fillStyle = fill; c.fillRect(-w / 2, -h / 2, w, h); }
    if (stroke) { c.lineWidth = lw; c.strokeStyle = stroke; c.strokeRect(-w / 2 + lw / 2, -h / 2 + lw / 2, w - lw, h - lw); }
  };

  // многострочный текст (строки уже свёрстаны в text.js)
  D.text = (c, el) => {
    const { rows, color, outline, ls } = el.d, x0 = -el.w / 2, y0 = -el.h / 2;
    c.textBaseline = "alphabetic"; c.textAlign = "left";
    if (ls) c.letterSpacing = ls + "px";
    if (outline) {
      c.lineJoin = "round"; c.lineCap = "round"; c.strokeStyle = outline.color;
      for (const r of rows) { setFont(c, r.fam, r.wt, r.size); c.lineWidth = outline.w * 2; c.strokeText(r.t, x0 + r.x, y0 + r.base); }
    }
    for (const r of rows) { setFont(c, r.fam, r.wt, r.size); c.fillStyle = r.color || color; c.fillText(r.t, x0 + r.x, y0 + r.base); }
    if (ls) c.letterSpacing = "0px";
  };

  // гигантская полосатая «5»
  D.glyph = (c, el, env) => {
    const d = el.d, ppu = env.ppu;
    const key = `glyph|${d.ch}|${d.fam}|${d.size}|${d.color}|${Math.round(el.w * ppu)}x${Math.round(el.h * ppu)}|${d.stripe}`;
    const cv = FX.memo(key, () => {
      const cv = P5.canvas(el.w * ppu, el.h * ppu), x = cv.getContext("2d");
      x.scale(ppu, ppu);
      setFont(x, d.fam, d.wt, d.size);
      x.fillStyle = "#000"; x.fillText(d.ch, d.tx, d.base);
      x.globalCompositeOperation = "source-in";
      x.strokeStyle = d.color; x.lineWidth = d.stripe;
      const step = d.stripe * 2.35;
      x.beginPath();
      for (let k = -el.h; k < el.w + el.h; k += step) { x.moveTo(k, 0); x.lineTo(k - el.h, el.h); }
      x.stroke();
      return cv;
    });
    c.drawImage(cv, -el.w / 2, -el.h / 2, el.w, el.h);
  };

  // строка-шапка: «SLAY 2026 ———— ГОЛОСОВАНИЕ»
  D.tag = (c, el) => {
    const d = el.d, x0 = -el.w / 2;
    setFont(c, d.fam, d.wt, d.size); c.fillStyle = d.color; c.textBaseline = "middle";
    c.letterSpacing = d.ls + "px";
    const lw = c.measureText(d.left).width, rw = c.measureText(d.right).width;
    c.textAlign = "left"; c.fillText(d.left, x0, 2);
    c.textAlign = "right"; c.fillText(d.right, el.w / 2, 2);
    c.letterSpacing = "0px"; c.textAlign = "left";
    c.fillRect(x0 + lw + 16, -2, el.w - lw - rw - 32, 4);
    c.textBaseline = "alphabetic";
  };

  // лента-«шарф» с повторяющимся текстом
  D.band = (c, el) => {
    const d = el.d, w = el.w, h = el.h;
    c.fillStyle = d.bg; c.fillRect(-w / 2, -h / 2, w, h);
    c.save(); c.beginPath(); c.rect(-w / 2, -h / 2, w, h); c.clip();
    setFont(c, d.fam, d.wt, d.size); c.fillStyle = d.color; c.textBaseline = "alphabetic";
    const m = T.m(d.text, d.fam, d.wt, d.size), base = (m.asc - m.desc) / 2;
    const ref = T.m("Н5", d.fam, d.wt, d.size), y = ref.asc / 2;
    let x = -w / 2 + (d.offset || 20);
    for (let i = 0; i < 40 && x < w / 2; i++) { c.fillText(d.text, x, y); x += m.adv; }
    c.restore();
    void base;
  };

  // вписываем фото в рамку (по нижнему краю, по центру)
  P5.fitPhoto = (ph, w, h, anchor = "bottom") => {
    const k = Math.min(w / ph.w, h / ph.h), fw = ph.w * k, fh = ph.h * k;
    const y = anchor === "center" ? -fh / 2 : h / 2 - fh;
    return { x: -fw / 2, y, w: fw, h: fh };
  };

  function photoLayers(ph, fx, wpx, hpx, ppu, d) {
    const card = ph.kind === "card";
    const ink = card ? "#111111" : d.ink;
    // светлые точки на тёмном фоне: инвертируем, чтобы фото не стало негативом
    const inv = !card && d.paper && P5.Y(ink) > P5.Y(d.paper);
    const out = [];
    if (fx === "dither") { out.push(FX.dither(ph, wpx, hpx, ppu, ink, card ? null : d.paper, d.cell || 3, card, inv)); return out; }
    if (!card && d.paper) out.push(FX.knock(ph, wpx, hpx, d.paper));
    if (fx === "halftone") out.push(FX.halftone(ph, wpx, hpx, ppu, ink, d.cell || 6.2, card, inv));
    else if (fx === "xerox") out.push(FX.xerox(ph, wpx, hpx, ppu, ink, d.seed || 7, card, inv));
    else out.push(FX.mono(ph, wpx, hpx));
    return out;
  }

  D.photo = (c, el, env) => {
    const d = el.d, ph = P5.photos[d.pid];
    if (!ph) return;
    const card = ph.kind === "card";
    const r = P5.fitPhoto(ph, el.w - (card ? d.pad * 2 || 0 : 0), el.h - (card ? d.pad * 2 || 0 : 0), card ? "center" : d.anchor);
    const ppu = env.fast ? env.ppu * 0.6 : env.ppu;
    if (card) {
      const p = d.pad || 0;
      const fr = { x: r.x - p, y: r.y - p, w: r.w + p * 2, h: r.h + p * 2 };
      if (d.frame === "torn" && d.torn) {
        tornPath(c, fr, d.torn); c.fillStyle = "#fff"; c.fill();
      } else {
        c.fillStyle = d.cardBg || "#fff"; c.fillRect(fr.x, fr.y, fr.w, fr.h);
        if (d.frame === "box" || d.frame === "pixel") { c.lineWidth = d.lw || 6; c.strokeStyle = d.ink; c.strokeRect(fr.x + c.lineWidth / 2, fr.y + c.lineWidth / 2, fr.w - c.lineWidth, fr.h - c.lineWidth); }
      }
    }
    const wpx = Math.max(4, Math.round(r.w * ppu)), hpx = Math.max(4, Math.round(r.h * ppu));
    const layers = photoLayers(ph, d.fx, wpx, hpx, ppu, d);
    if (d.under) {
      // цветной второй прогон со сдвигом — «ризограф»
      const u = d.under, card = ph.kind === "card";
      if (layers.length > 1) { c.drawImage(layers[0], r.x, r.y, r.w, r.h); layers.shift(); }
      c.drawImage(FX.halftone(ph, wpx, hpx, ppu, u.ink, u.cell || 4.6, card, false), r.x + u.dx, r.y + u.dy, r.w, r.h);
    }
    for (const L of layers) c.drawImage(L, r.x, r.y, r.w, r.h);
    if (card && d.frame === "pixel") {
      const p = d.pad || 0, s = 10; c.fillStyle = d.paperBg || "#fff";
      [[r.x - p, r.y - p], [r.x + r.w + p - s, r.y - p], [r.x - p, r.y + r.h + p - s], [r.x + r.w + p - s, r.y + r.h + p - s]].forEach(([x, y]) => c.fillRect(x, y, s, s));
    }
  };

  function tornPath(c, r, pts) {
    c.beginPath();
    pts.forEach(([u, v], i) => { const x = r.x + u * r.w, y = r.y + v * r.h; i ? c.lineTo(x, y) : c.moveTo(x, y); });
    c.closePath();
  }
  P5.tornPoints = (rng, amp = [0.012, 0.01, 0.022, 0.01]) => {
    const pts = [], n = 44;
    const edge = (x0, y0, x1, y1, a, horiz) => {
      for (let i = 0; i < n; i++) {
        const t = i / n, j = (rng() - 0.5) * a * 2;
        pts.push([x0 + (x1 - x0) * t + (horiz ? 0 : j), y0 + (y1 - y0) * t + (horiz ? j : 0)]);
      }
    };
    edge(0.005, 0.006, 0.995, 0.004, amp[0], true);
    edge(0.995, 0.004, 0.994, 0.996, amp[1], false);
    edge(0.994, 0.996, 0.006, 0.994, amp[2], true);
    edge(0.006, 0.994, 0.005, 0.006, amp[3], false);
    return pts;
  };
  D.torn = (c, el) => {
    const r = { x: -el.w / 2, y: -el.h / 2, w: el.w, h: el.h };
    c.save(); c.translate(4, 6); tornPath(c, r, el.d.pts); c.fillStyle = "rgba(0,0,0,0.07)"; c.fill(); c.restore();
    tornPath(c, r, el.d.pts); c.fillStyle = el.d.fill; c.fill();
  };

  D.tape = (c, el) => {
    const w = el.w, h = el.h, k = 6, z = w * 0.035;
    c.beginPath();
    for (let i = 0; i <= k; i++) c.lineTo(-w / 2 + (i % 2 ? 0 : z), -h / 2 + (i * h) / k);
    for (let i = k; i >= 0; i--) c.lineTo(w / 2 - (i % 2 ? 0 : z), -h / 2 + (i * h) / k);
    c.closePath();
    c.fillStyle = (el.d && el.d.color) || "rgba(214,210,196,0.84)"; c.fill();
  };

  // QR: оригинал с плакатов или собственный (чёткие модули, «5» в центре)
  const qrCache = new Map();
  P5.qrMatrix = (text) => {
    if (qrCache.has(text)) return qrCache.get(text);
    const q = window.qrcode(0, "H"); q.addData(unescape(encodeURIComponent(text))); q.make();
    const n = q.getModuleCount(), m = [];
    for (let y = 0; y < n; y++) { m.push([]); for (let x = 0; x < n; x++) m[y].push(q.isDark(y, x)); }
    qrCache.set(text, m);
    return m;
  };
  function drawQR(c, x, y, s, d) {
    // тихая зона вокруг кода — без неё телефоны хуже читают QR (проверено тестами)
    if (d.mode === "orig") { const q = s * 0.05; c.drawImage(P5.qrImage, x + q, y + q, s - q * 2, s - q * 2); return; }
    const m = P5.qrMatrix(d.url || P5.DEFAULT_QR_URL), n = m.length, cell = s / (n + 3);
    x += cell * 1.5; y += cell * 1.5;
    const badge = n < 45 ? Math.round(n * 0.22) | 1 : 0, b0 = Math.floor((n - badge) / 2);
    const inBadge = (i, j) => badge && d.badge !== false && i >= b0 && i < b0 + badge && j >= b0 && j < b0 + badge;
    c.fillStyle = d.ink || "#111";
    c.beginPath();
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) if (m[j][i] && !inBadge(i, j)) c.rect(x + i * cell, y + j * cell, cell + 0.3, cell + 0.3);
    c.fill();
    if (!badge) return;
    if (d.badge !== false) {
      const bx = x + b0 * cell, by = y + b0 * cell, bs = badge * cell;
      c.fillStyle = "#fff"; c.fillRect(bx, by, bs, bs);
      c.fillStyle = d.ink || "#111"; c.fillRect(bx + cell * 0.6, by + cell * 0.6, bs - cell * 1.2, bs - cell * 1.2);
      const fs = bs * 1.02, m5 = T.m("5", "Sofia", 900, fs);
      setFont(c, "Sofia", 900, fs); c.fillStyle = "#fff";
      c.fillText("5", bx + bs / 2 - m5.w / 2 + m5.l, by + bs / 2 + (m5.asc - m5.desc) / 2);
    }
  }
  D.qr = (c, el) => {
    const d = el.d, w = el.w, h = el.h, lw = d.lw ?? 6, p = d.pad ?? 14;
    if (d.frame !== "none") {
      c.fillStyle = "#fff"; c.fillRect(-w / 2, -h / 2, w, h);
      if (lw) { c.lineWidth = lw; c.strokeStyle = d.ink || "#111"; c.strokeRect(-w / 2 + lw / 2, -h / 2 + lw / 2, w - lw, h - lw); }
    }
    const s = w - p * 2;
    drawQR(c, -w / 2 + p, -h / 2 + p, s, d);
    if (d.label) {
      setFont(c, d.lfam || "Handjet", d.lwt || 800, d.lsize || 26);
      c.fillStyle = d.ink || "#111"; c.textAlign = "center"; c.letterSpacing = "1px";
      const m = T.m("Н", d.lfam || "Handjet", d.lwt || 800, d.lsize || 26);
      const area = h - p - s - p * 0.4;
      c.fillText(d.label, 0, -h / 2 + p + s + area / 2 + m.asc / 2);
      c.letterSpacing = "0px"; c.textAlign = "left";
    }
  };

  // слова в плашках (ксерокс)
  D.words = (c, el) => {
    const x0 = -el.w / 2, y0 = -el.h / 2;
    for (const it of el.d.items) {
      c.save();
      c.translate(x0 + it.x + it.w / 2, y0 + it.y + it.h / 2); c.rotate((it.rot || 0) * Math.PI / 180);
      const st = it.style, P = el.d.pal;
      const bg = st === "black" ? P.ink : st === "acc" ? P.acc : P.paper, fg = st === "black" ? P.paper : st === "acc" ? P.accInk || P.ink : P.ink;
      c.fillStyle = bg; c.fillRect(-it.w / 2, -it.h / 2, it.w, it.h);
      if (st === "line") { const lw = Math.max(4, it.size * 0.055); c.lineWidth = lw; c.strokeStyle = P.ink; c.strokeRect(-it.w / 2 + lw / 2, -it.h / 2 + lw / 2, it.w - lw, it.h - lw); }
      setFont(c, it.fam, it.wt, it.size); c.fillStyle = fg;
      c.fillText(it.t, -it.w / 2 + it.tx, -it.h / 2 + it.base);
      c.restore();
    }
  };

  // подпись маркером + стрелка
  D.note = (c, el) => {
    const d = el.d;
    setFont(c, "Caveat", 700, d.size); c.fillStyle = d.color; c.textAlign = "center";
    const m = T.m(d.t, "Caveat", 700, d.size);
    c.fillText(d.t, d.tx || 0, (d.ty || 0) + (m.asc - m.desc) / 2);
    c.textAlign = "left";
    if (d.arrow) {
      const a = d.arrow;
      c.strokeStyle = d.color; c.lineWidth = d.lw || 6; c.lineCap = "round"; c.lineJoin = "round";
      c.beginPath(); c.moveTo(a[0], a[1]); c.quadraticCurveTo(a[2], a[3], a[4], a[5]); c.stroke();
      const ang = Math.atan2(a[5] - a[3], a[4] - a[2]), L = 26;
      c.beginPath();
      c.moveTo(a[4] - L * Math.cos(ang - 0.5), a[5] - L * Math.sin(ang - 0.5)); c.lineTo(a[4], a[5]);
      c.lineTo(a[4] - L * Math.cos(ang + 0.5), a[5] - L * Math.sin(ang + 0.5)); c.stroke();
    }
  };

  // штамп
  D.stamp = (c, el) => {
    const d = el.d, w = el.w, h = el.h, lw = 6;
    c.save(); if (d.multiply) c.globalCompositeOperation = "multiply";
    c.strokeStyle = d.color; c.lineWidth = lw; c.strokeRect(-w / 2 + lw / 2, -h / 2 + lw / 2, w - lw, h - lw);
    setFont(c, "Sofia", 900, d.size); c.fillStyle = d.color; c.textAlign = "center"; c.letterSpacing = "2px";
    const m = T.m("Н", "Sofia", 900, d.size);
    c.fillText(d.t, 0, m.asc / 2); c.letterSpacing = "0px"; c.textAlign = "left";
    c.restore();
  };

  // пиксель-арт
  D.pixel = (c, el) => {
    const rows = P5.PIX[el.d.pat], ph = rows.length, pw = rows[0].length, cw = el.w / pw, ch = el.h / ph;
    c.fillStyle = el.d.color;
    rows.forEach((r, y) => [...r].forEach((v, x) => { if (v === "1") c.fillRect(-el.w / 2 + x * cw, -el.h / 2 + y * ch, cw + 0.3, ch + 0.3); }));
  };

  // игровой HUD: «БОСС | ПЯТЁРКА | УР. 99 | полоска здоровья»
  D.hud = (c, el) => {
    const d = el.d, w = el.w, h = el.h, x0 = -w / 2, y0 = -h / 2, lw = 6;
    c.fillStyle = d.panel; c.fillRect(x0, y0, w, h);
    c.lineWidth = lw; c.strokeStyle = d.frame; c.strokeRect(x0 + lw / 2, y0 + lw / 2, w - lw, h - lw);
    const lab = h - lw * 2 + 0;
    c.fillStyle = d.frame; c.fillRect(x0, y0, lab + lw, h);
    setFont(c, "Handjet", 800, d.lsize); c.fillStyle = d.labelInk; c.textAlign = "center";
    const ml = T.m(d.label, "Handjet", 800, d.lsize);
    c.fillText(d.label, x0 + (lab + lw) / 2, (ml.asc - ml.desc) / 2);
    c.textAlign = "left";
    const nx = x0 + lab + lw + 18;
    setFont(c, d.nfam, d.nwt, d.nsize); c.fillStyle = d.text;
    const mn = T.m(d.name, d.nfam, d.nwt, d.nsize);
    c.fillText(d.name, nx + mn.l, y0 + 14 + mn.asc);
    setFont(c, "Handjet", 700, 32); c.textAlign = "right"; c.fillText(d.lvl, w / 2 - 18, y0 + 14 + 26); c.textAlign = "left";
    const by = h / 2 - 16 - 34, bx = nx, bw = w / 2 - 18 - bx;
    if (d.mode === "hearts") {
      const n = 5, hs = 34, gap = 10;
      for (let i = 0; i < n; i++) drawPix(c, "heart", bx + i * (hs * 9 / 8 + gap), by, hs * 9 / 8, hs, i < n ? d.hp : d.text);
      setFont(c, "Handjet", 700, 30); c.fillStyle = d.text; c.textAlign = "right"; c.fillText("× 5", w / 2 - 18, by + 28); c.textAlign = "left";
    } else {
      const segs = 10, g = 5, sw = (bw - g * (segs - 1)) / segs;
      for (let i = 0; i < segs; i++) {
        const sx = bx + i * (sw + g);
        if (i < 9) { c.fillStyle = d.hp; c.fillRect(sx, by, sw, 34); }
        else { c.lineWidth = 4; c.strokeStyle = d.text; c.strokeRect(sx + 2, by + 2, sw - 4, 30); }
      }
    }
  };
  function drawPix(c, pat, x, y, w, h, color) {
    const rows = P5.PIX[pat], ph = rows.length, pw = rows[0].length, cw = w / pw, ch = h / ph;
    c.fillStyle = color;
    rows.forEach((r, j) => [...r].forEach((v, i) => { if (v === "1") c.fillRect(x + i * cw, y + j * ch, cw + 0.3, ch + 0.3); }));
  }

  // диалог как в RPG + QR
  D.dialog = (c, el) => {
    const d = el.d, w = el.w, h = el.h, x0 = -w / 2, y0 = -h / 2, lw = 6;
    c.fillStyle = d.panel; c.fillRect(x0, y0, w, h);
    c.lineWidth = lw; c.strokeStyle = d.frame; c.strokeRect(x0 + lw / 2, y0 + lw / 2, w - lw, h - lw);
    c.lineWidth = 3; c.strokeStyle = d.text; c.strokeRect(x0 + 12, y0 + 12, w - 24, h - 24);
    const qs = d.qr ? Math.min(h - 48, 210) : 0;
    for (const r of d.rows) { setFont(c, r.fam, r.wt, r.size); c.fillStyle = d.text; c.fillText(r.t, x0 + 34 + r.x, y0 + 28 + r.base); }
    if (d.opts) {
      setFont(c, "Handjet", 800, 46); c.letterSpacing = "2px";
      d.opts.forEach((o, i) => { c.fillStyle = d.text; c.globalAlpha = i ? 0.42 : 1; c.fillText((i ? "   " : "") + o, x0 + 34, y0 + h - 30 - (d.opts.length - 1 - i) * 52); });
      c.globalAlpha = 1; c.letterSpacing = "0px";
    }
    if (d.qr) drawQR(c, w / 2 - 24 - qs, y0 + 24, qs, d.qr);
  };

  // зерно и пыль ксерокса поверх всего
  D.overlay = (c, el, env) => {
    const d = el.d, w = el.w, h = el.h;
    const g = FX.grain(env.ppu), pat = c.createPattern(g, "repeat");
    c.save(); c.scale(1 / env.ppu, 1 / env.ppu);
    c.globalAlpha = d.grain ?? 0.55; c.fillStyle = pat; c.fillRect((-w / 2) * env.ppu, (-h / 2) * env.ppu, w * env.ppu, h * env.ppu);
    c.restore();
    const r = P5.rng(d.seed || 3);
    c.fillStyle = "#111";
    for (let i = 0; i < (d.specks || 160); i++) {
      const x = -w / 2 + r() * w, y = -h / 2 + r() * h, s = r() < 0.8 ? 1.4 : 2.8;
      c.fillStyle = d.acc && i % 3 === 0 ? d.acc : "#111";
      c.globalAlpha = 0.25 + r() * 0.55; c.fillRect(x, y, s, s);
    }
    c.globalAlpha = 0.06;
    for (let i = 0; i < 5; i++) { const x = -w / 2 + r() * w; c.fillRect(x, -h / 2, 1.2, h); }
    c.globalAlpha = 1;
  };

  // вставленные картинки (Ctrl+V / «＋ Картинка»): в ч/б режиме — в оттенках серого
  D.image = (c, el) => {
    const img = P5.extraImgs && P5.extraImgs[el.d.id];
    if (!img) return;
    if (el.d.gray) c.filter = "grayscale(1) contrast(1.08)";
    c.drawImage(img, -el.w / 2, -el.h / 2, el.w, el.h);
    c.filter = "none";
  };

  // ---------- вся сцена ----------
  P5.elBox = (el, ov) => {
    const o = (ov && ov[el.id]) || {};
    return { x: el.x + (o.dx || 0), y: el.y + (o.dy || 0), rot: (el.rot || 0) + (o.dr || 0), s: o.ds || 1, hidden: !!o.hidden };
  };
  P5.render = (ctx, scene, opt = {}) => {
    const scale = opt.scale || 1, ov = opt.overrides || {};
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.restore();
    for (const el of scene.els) {
      const b = P5.elBox(el, ov);
      if (b.hidden) continue;
      const fn = D[el.type];
      if (!fn) continue;
      ctx.save();
      ctx.setTransform(scale, 0, 0, scale, (opt.ox || 0), (opt.oy || 0));
      ctx.translate(b.x, b.y);
      if (b.rot) ctx.rotate((b.rot * Math.PI) / 180);
      if (b.s !== 1) ctx.scale(b.s, b.s);
      try { fn(ctx, el, { ppu: scale * b.s, transparent: opt.transparent, fast: opt.fast }); } catch (e) { console.error("draw", el.id, e); }
      ctx.restore();
    }
  };

  // белая обводка для стикера
  P5.outline = (src, r, color = "#fff") => {
    const pad = Math.ceil(r) + 2;
    const sil = P5.canvas(src.width, src.height), sx = sil.getContext("2d");
    sx.drawImage(src, 0, 0); sx.globalCompositeOperation = "source-in"; sx.fillStyle = color; sx.fillRect(0, 0, sil.width, sil.height);
    const out = P5.canvas(src.width, src.height), ox = out.getContext("2d");
    const n = 28;
    for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2; ox.drawImage(sil, Math.cos(a) * r, Math.sin(a) * r); }
    for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2; ox.drawImage(sil, Math.cos(a) * r * 0.55, Math.sin(a) * r * 0.55); }
    ox.drawImage(src, 0, 0);
    void pad;
    return out;
  };
})();
