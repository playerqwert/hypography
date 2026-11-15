/* Раскладки. Каждая функция получает состояние S и возвращает сцену {W, H, els}.
   Варианты (🎲) — это seed: он меняет зеркальность, углы, мелкие детали, но в рамках продуманной сетки. */
(() => {
  const P5 = window.P5, T = P5.T;
  const L = (P5.layouts = {});

  const fxFor = (S, def) => (S.fx === "auto" ? def : S.fx === "photo" ? "mono" : S.fx);
  const textEl = (id, res, left, top, d = {}) => ({
    id, type: "text", x: left + res.w / 2, y: top + res.h / 2, w: Math.max(1, res.w), h: Math.max(1, res.h), rot: d.rot || 0,
    d: { rows: res.rows, color: d.color, outline: d.outline, ls: d.ls },
  });
  const bg = (W, H, color) => ({ id: "bg", type: "fill", x: W / 2, y: H / 2, w: W, h: H, locked: true, d: { color } });
  const qrD = (S, extra) => ({ mode: S.qr.mode, url: S.qr.mode === "custom" ? S.qr.url : P5.DEFAULT_QR_URL, ink: "#111", badge: true, ...extra });

  function headPos(el) {
    const ph = P5.photos[el.d.pid]; if (!ph) return { x: el.x, y: el.y - el.h / 2, w: 200, top: el.y - el.h / 2 };
    const card = ph.kind === "card", pad = card ? el.d.pad || 0 : 0;
    const r = P5.fitPhoto(ph, el.w - pad * 2, el.h - pad * 2, card ? "center" : el.d.anchor);
    return { x: el.x + r.x + ph.head.x * r.w, y: el.y + r.y + ph.head.y * r.h, w: ph.head.w * r.w, top: el.y + r.y - pad, rect: r };
  }

  function smallText(id, text, fam, wt, size, x, y, align, color, ls) {
    const res = T.wrap(text, { fam, wt, W: 2000, H: 400, maxLines: 4, maxSize: size, minSize: size, gap: 0.22 });
    if (ls) { res.rows.forEach((r) => { r.w += ls * (r.t.length - 1); }); res.w = Math.max(...res.rows.map((r) => r.w)); }
    const left = align === "right" ? x - res.w : align === "center" ? x - res.w / 2 : x;
    res.rows.forEach((r) => { if (align === "right") r.x += res.w - r.w; else if (align === "center") r.x += (res.w - r.w) / 2; });
    return textEl(id, res, left, y, { color, ls });
  }

  // подпись маркером со стрелкой к голове
  function noteWithArrow(id, text, size, color, nx, ny, hx, hy, rot, W = 840) {
    let m = T.m(text, "Caveat", 700, size);
    if (m.w > W * 0.42) { size = (size * W * 0.42) / m.w; m = T.m(text, "Caveat", 700, size); }
    nx = Math.max(m.w / 2 + 34, Math.min(W - m.w / 2 - 34, nx));
    const dir = hx < nx ? -1 : 1;
    const a0 = [nx + dir * Math.min(40, m.w * 0.25), ny + size * 0.45];
    const a1 = [hx, hy];
    const ctrl = [a0[0] + (a1[0] - a0[0]) * 0.15, a1[1] - 6];
    const xs = [nx - m.w / 2 - 10, nx + m.w / 2 + 10, a0[0], a1[0], ctrl[0]], ys = [ny - m.asc, ny + m.desc + 8, a0[1], a1[1], ctrl[1]];
    const minX = Math.min(...xs) - 16, maxX = Math.max(...xs) + 16, minY = Math.min(...ys) - 16, maxY = Math.max(...ys) + 16;
    const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;
    return {
      id, type: "note", x: cx, y: cy, w: maxX - minX, h: maxY - minY, rot,
      d: { t: text, size, color, tx: nx - cx, ty: ny - cy, arrow: [a0[0] - cx, a0[1] - cy, ctrl[0] - cx, ctrl[1] - cy, a1[0] - cx, a1[1] - cy] },
    };
  }

  function words(id, S, P, R, text, left, top, rowW, H, maxSize, hf) {
    const res = T.flowWords(text, { fam: hf.fam, wt: hf.wt, rowW, H, lang: S.lang, maxSize, gap: 24 });
    const styles = S.color === "bw" ? ["black", "line", "black", "black", "line"] : ["acc", "line", "black", "acc", "black", "line"];
    let rowIdx = -1, lastY = null, shift = 0;
    const items = res.items.map((it, i) => {
      if (it.y !== lastY) { rowIdx++; lastY = it.y; shift = rowIdx % 2 ? Math.round(P5.between(R, 20, 70)) : 0; }
      const maxW = rowW[Math.min(rowIdx, rowW.length - 1)];
      const rowEnd = Math.max(...res.items.filter((o) => o.y === it.y).map((o) => o.x + o.w));
      const sh = Math.min(shift, Math.max(0, maxW - rowEnd));
      return { ...it, x: it.x + sh, style: styles[i % styles.length], rot: (i % 2 ? 1 : -1) * P5.between(R, 1, 3.2) };
    });
    const w = items.length ? Math.max(...items.map((it) => it.x + it.w)) : 10;
    return { id, type: "words", x: left + w / 2, y: top + res.h / 2, w, h: Math.max(10, res.h), d: { items, pal: { ink: P.ink, paper: P.paper, acc: P.acc, accInk: P.accInk } } };
  }


  // большое полосатое число на фоне: 5, 42 или своё; ширина ограничена, чтобы «42» не вылезало
  function numGlyph(S, P, x, y, size, maxW, W) {
    const ch = String(S.num || "5").slice(0, 3) || "5";
    let m = T.m(ch, "Sofia", 900, size);
    if (m.w > maxW) { size = (size * maxW) / m.w; m = T.m(ch, "Sofia", 900, size); }
    const gw = m.w + 40, gh = m.asc + m.desc + 40;
    x = Math.max(gw / 2 - 80, Math.min(W - gw / 2 + 80, x));
    return { id: "five", type: "glyph", x, y, w: gw, h: gh, rot: 0, d: { ch, fam: "Sofia", wt: 900, size, color: P.five, stripe: 9, tx: 20 + m.l, base: 20 + m.asc } };
  }

  // ===================== A · ФАН-СЕКТОР =====================
  L.fan = {};
  L.fan.poster = (S, P, R, v) => {
    const W = 840, H = 1188, els = [bg(W, H, P.paper)], flip = v % 2 === 1, UI = P5.UI[S.lang];
    const hf = P5.headFont(S, { fam: "Sofia", wt: 900 });
    const head = T.fitStack(S.head, { fam: hf.fam, wt: hf.wt, W: 752, H: 370, maxLines: 4, maxSize: 290, lang: S.lang });
    const headTop = 104;
    els.push(numGlyph(S, P, flip ? 250 : 600, 800, 1120, 800, W));
    els.push({ id: "tag", type: "tag", x: 420, y: 62, w: 744, h: 40, d: { left: T.upper(UI.event, S.lang), right: T.upper(UI.vote, S.lang), fam: "Handjet", wt: 700, size: 34, ls: 2, color: P.text } });
    const ph = P5.photos[S.pid], card = ph && ph.kind === "card";
    const pTop = headTop + head.h - (card ? -10 : 50), pBot = card ? 870 : 925;
    els.push({ id: "photo", type: "photo", x: card ? (flip ? 470 : 380) : flip ? 470 : 370, y: (pTop + pBot) / 2, w: card ? 600 : 820, h: pBot - pTop, rot: card ? (flip ? 2 : -2) : 0,
      d: { pid: S.pid, fx: fxFor(S, "halftone"), ink: P.ink, paper: P.paper, anchor: "bottom", pad: 14, frame: "box", cardBg: "#fff", lw: 6 } });
    els.push(textEl("head", head, 44, headTop, { color: P.text, outline: { color: P.paper, w: 8 } }));
    const sub = (S.sub || "").trim().replace(/★\s*$/, "").trim();
    els.push({ id: "band", type: "band", x: 420, y: 905, w: 1040, h: 92, rot: flip ? 3.5 : -4 + P5.between(R, -0.6, 0.6),
      d: { text: T.upper(sub, S.lang) + "  ★  ", fam: "Sofia", wt: 900, size: 64, bg: P.acc, color: P.accInk, offset: 30 + Math.round(R() * 60) } });
    if (S.showQR) els.push({ id: "qr", type: "qr", x: flip ? 50 + 98 : W - 50 - 98, y: H - 44 - 118, w: 196, h: 236, rot: flip ? -4 : 4,
      d: qrD(S, { label: T.upper(UI.qr, S.lang), lfam: "Handjet", lwt: 800, lsize: UI.qr.length > 14 ? 22 : 26, pad: 14, lw: 6 }) });
    els.push(smallText("foot", T.upper(UI.foot[0] + "\n" + UI.foot[1], S.lang), "Handjet", 700, 28, flip ? W - 48 : 48, H - 50 - 62, flip ? "right" : "left", P.text, 2));
    return { W, H, els };
  };

  L.fan.meme = (S, P, R, v) => {
    const W = 1000, H = 1000, els = [bg(W, H, P.paper)], flip = v % 2 === 1;
    const hf = P5.headFont(S, { fam: "Sofia", wt: 900 });
    const head = T.wrap(S.head, { fam: hf.fam, wt: hf.wt, W: 920, H: 330, maxLines: 4, maxSize: 150, minSize: 30, upper: true, lang: S.lang, gap: 0.08 });
    els.push(numGlyph(S, P, flip ? 230 : 770, 640, 1000, 900, W));
    const top = 40 + head.h - 40;
    els.push({ id: "photo", type: "photo", x: flip ? 560 : 440, y: (top + 1000) / 2, w: 920, h: 1000 - top, d: { pid: S.pid, fx: fxFor(S, "halftone"), ink: P.ink, paper: P.paper, anchor: "bottom", pad: 14, frame: "box", cardBg: "#fff" } });
    els.push(textEl("head", head, 40, 40, { color: P.text, outline: { color: P.paper, w: 8 } }));
    const sub = (S.sub || "").replace(/★\s*$/, "").trim();
    els.push({ id: "band", type: "band", x: 500, y: 930, w: 1100, h: 76, rot: flip ? 3 : -3, d: { text: T.upper(sub, S.lang) + "  ★  ", fam: "Sofia", wt: 900, size: 52, bg: P.acc, color: P.accInk, offset: 30 } });
    return { W, H, els };
  };

  L.fan.sticker = (S, P, R, v) => {
    const W = 1000, H = 1000, els = [], flip = v % 2 === 1;
    const hf = P5.headFont(S, { fam: "Sofia", wt: 900 });
    els.push({ id: "photo", type: "photo", x: 500, y: 400, w: 860, h: 760, d: { pid: S.pid, fx: fxFor(S, "halftone"), ink: "#111", paper: "#fff", anchor: "bottom", pad: 14, frame: "box", cardBg: "#fff" } });
    const res = T.wrap(S.head, { fam: hf.fam, wt: hf.wt, W: 700, H: 190, maxLines: 2, maxSize: 170, minSize: 40, upper: true, lang: S.lang, gap: 0.08, align: "center" });
    const padX = 34, padY = 22, bw = res.w + padX * 2, bh = res.h + padY * 2;
    els.push({ id: "label", type: "label", x: 500, y: 830, w: bw, h: bh, rot: flip ? 4 : -5, d: { rows: res.rows, bg: P.acc, color: P.accInk, padX, padY } });
    return { W, H, els, sticker: true };
  };

  // ===================== B · КСЕРОКС =====================
  L.zine = {};
  L.zine.poster = (S, P, R, v) => (v % 2 ? zinePosterB(S, P, R) : zinePosterA(S, P, R, v));

  // вариант Б: слова сверху, фото-листок ниже, QR приклеен на угол листка
  function zinePosterB(S, P, R) {
    const W = 840, H = 1188, els = [bg(W, H, P.paper)], UI = P5.UI[S.lang];
    const hf = P5.headFont(S, { fam: "Sofia", wt: 900 });
    const w = words("head", S, P, R, S.head, 44, 60, [752, 700, 640], 300, 150, hf);
    els.push(w);
    const top = 60 + w.h + 40, cy = (top + 1090) / 2, sh = 1090 - top, rot = 2.5;
    const ph = P5.photos[S.pid], card = ph && ph.kind === "card";
    if (S.color !== "bw") els.push({ id: "accsheet", type: "rect", x: 404, y: cy + 26, w: 640, h: sh - 20, rot: -4, d: { stroke: P.acc, lw: 10 } });
    els.push({ id: "sheet", type: "torn", x: 430, y: cy, w: 660, h: sh, rot, d: { fill: P.sheet, pts: P5.tornPoints(R) } });
    els.push({ id: "photo", type: "photo", x: 430, y: cy + 6, w: card ? 580 : 620, h: sh - (card ? 70 : 30), rot, d: { pid: S.pid, fx: fxFor(S, "xerox"), ink: P.ink, paper: "#ffffff", anchor: "bottom", seed: 5 + (S.seed % 7), pad: 0, frame: "none" } });
    els.push({ id: "tape1", type: "tape", x: 150, y: top + 6, w: 170, h: 46, rot: -18 + P5.between(R, -5, 5) });
    if (S.showQR) {
      els.push({ id: "qr", type: "qr", x: 676, y: 1010, w: 200, h: 200, rot: 5 + P5.between(R, -1.5, 1.5), d: qrD(S, { pad: 12, lw: 0 }) });
      els.push({ id: "tape3", type: "tape", x: 700, y: 906, w: 130, h: 40, rot: -8 });
      els.push({ id: "qrnote", type: "note", x: 660, y: 1146, w: 260, h: 60, rot: -3, d: { t: UI.qrNote, size: 46, color: P.ink } });
    }
    const st = T.upper(UI.stamp, S.lang), sm = T.m(st, "Sofia", 900, 54);
    els.push({ id: "stamp", type: "stamp", x: 70 + (sm.w + 50) / 2, y: 1136, w: sm.w + 50, h: 70, rot: -5 + P5.between(R, -2, 2), d: { t: st, size: 54, color: P.stamp, multiply: S.color !== "bw" } });
    const hp = headPos(els.find((e) => e.id === "photo"));
    const right = hp.x < 430;
    const nx = right ? Math.min(740, hp.x + hp.w * 0.75 + 120) : Math.max(110, hp.x - hp.w * 0.75 - 120);
    if ((S.sub || "").trim()) els.push(noteWithArrow("note", S.sub.trim(), 58, P.ink, nx, Math.max(top + 40, hp.top + 30), hp.x + (right ? 1 : -1) * hp.w * 0.42, hp.y + hp.w * 0.32, right ? -7 : 7));
    els.push({ id: "overlay", type: "overlay", x: W / 2, y: H / 2, w: W, h: H, locked: true, d: { seed: 3 + (S.seed % 5) } });
    return { W, H, els };
  }

  function zinePosterA(S, P, R, v) {
    const W = 840, H = 1188, els = [bg(W, H, P.paper)], flip = false, UI = P5.UI[S.lang];
    void v;
    const hf = P5.headFont(S, { fam: "Sofia", wt: 900 });
    const rot = (R() < 0.5 ? 1 : -1) * P5.between(R, 1.2, 2.6), cx = 420, cy = 432;
    if (S.color !== "bw") els.push({ id: "accsheet", type: "rect", x: cx + 30, y: cy + 30, w: 690, h: 700, rot: rot + (flip ? -6 : 6), d: { stroke: P.acc, lw: 10 } });
    els.push({ id: "sheet", type: "torn", x: cx, y: cy, w: 700, h: 720, rot, d: { fill: P.sheet, pts: P5.tornPoints(R) } });
    const ph = P5.photos[S.pid], card = ph && ph.kind === "card";
    els.push({ id: "photo", type: "photo", x: cx, y: cy + (card ? 0 : 8), w: card ? 610 : 650, h: card ? 650 : 690, rot,
      d: { pid: S.pid, fx: fxFor(S, "xerox"), ink: P.ink, paper: "#ffffff", anchor: "bottom", seed: 5 + (S.seed % 7), pad: 0, frame: "none" } });
    els.push({ id: "tape1", type: "tape", x: flip ? 110 : 96, y: 84, w: 170, h: 46, rot: -24 + P5.between(R, -5, 5) });
    els.push({ id: "tape2", type: "tape", x: flip ? 744 : 730, y: 74, w: 170, h: 46, rot: 18 + P5.between(R, -5, 5) });
    const rowW = S.showQR ? [752, 520, 520] : [752, 752, 752];
    els.push(words("head", S, P, R, S.head, 44, 784, rowW, 300, 150, hf));
    if (S.showQR) {
      els.push({ id: "qr", type: "qr", x: 693, y: 1003, w: 194, h: 194, rot: -3 + P5.between(R, -1.5, 1.5), d: qrD(S, { pad: 12, lw: 0 }) });
      els.push({ id: "tape3", type: "tape", x: 690, y: 902, w: 130, h: 40, rot: 6 });
      els.push({ id: "qrnote", type: "note", x: 690, y: 1140, w: 260, h: 60, rot: -4, d: { t: UI.qrNote, size: 46, color: P.ink } });
    }
    const st = T.upper(UI.stamp, S.lang), sm = T.m(st, "Sofia", 900, 54);
    els.push({ id: "stamp", type: "stamp", x: 64 + (sm.w + 50) / 2, y: 1130, w: sm.w + 50, h: 70, rot: -7 + P5.between(R, -2, 2), d: { t: st, size: 54, color: P.stamp, multiply: S.color !== "bw" } });
    // «это он» → к голове
    const hp = headPos(els.find((e) => e.id === "photo"));
    const right = hp.x < 430;
    const nx = right ? Math.min(730, hp.x + hp.w * 0.75 + 120) : Math.max(110, hp.x - hp.w * 0.75 - 120);
    const ny = Math.max(110, hp.top + 40);
    if ((S.sub || "").trim()) els.push(noteWithArrow("note", S.sub.trim(), 58, P.ink, nx, ny, hp.x + (right ? 1 : -1) * hp.w * 0.42, hp.y + hp.w * 0.32, right ? -7 : 7));
    els.push({ id: "overlay", type: "overlay", x: W / 2, y: H / 2, w: W, h: H, locked: true, d: { seed: 3 + (S.seed % 5) } });
    return { W, H, els };
  };

  L.zine.meme = (S, P, R, v) => {
    const W = 1000, H = 1000, els = [bg(W, H, P.paper)], flip = v % 2 === 1;
    const hf = P5.headFont(S, { fam: "Sofia", wt: 900 });
    const rot = flip ? 2 : -2;
    if (S.color !== "bw") els.push({ id: "accsheet", type: "rect", x: 520, y: 360, w: 760, h: 600, rot: rot + 5, d: { stroke: P.acc, lw: 10 } });
    els.push({ id: "sheet", type: "torn", x: 500, y: 340, w: 780, h: 610, rot, d: { fill: P.sheet, pts: P5.tornPoints(R) } });
    els.push({ id: "photo", type: "photo", x: 500, y: 350, w: 720, h: 580, rot, d: { pid: S.pid, fx: fxFor(S, "xerox"), ink: P.ink, paper: "#fff", anchor: "bottom", seed: 5 + (S.seed % 7) } });
    els.push({ id: "tape1", type: "tape", x: 150, y: 52, w: 170, h: 46, rot: -20 });
    els.push({ id: "tape2", type: "tape", x: 850, y: 48, w: 170, h: 46, rot: 16 });
    els.push(words("head", S, P, R, S.head, 40, 680, [920], 290, 120, hf));
    els.push({ id: "overlay", type: "overlay", x: W / 2, y: H / 2, w: W, h: H, locked: true, d: { seed: 4 } });
    return { W, H, els };
  };

  L.zine.sticker = (S, P, R, v) => {
    const W = 1000, H = 1000, els = [];
    const hf = P5.headFont(S, { fam: "Sofia", wt: 900 });
    els.push({ id: "photo", type: "photo", x: 500, y: 420, w: 860, h: 760, d: { pid: S.pid, fx: fxFor(S, "xerox"), ink: "#111", paper: "#fff", anchor: "bottom", seed: 5 + (S.seed % 7), pad: 16, frame: "box", cardBg: "#fff", lw: 0 } });
    const w = words("head", S, P, R, S.head, 0, 0, [820], 230, 170, hf);
    w.x = 500; w.y = 860 - w.h / 2 + 60; w.rot = v % 2 ? 3 : -3;
    els.push(w);
    els.push({ id: "tape1", type: "tape", x: 230, y: 120, w: 190, h: 52, rot: -28 });
    return { W, H, els, sticker: true };
  };

  // ===================== C · БОСС-ФАЙТ =====================
  L.boss = {};
  const hudD = (S, P, v, nsize = 64) => {
    const UI = P5.UI[S.lang];
    return { panel: P.panel, frame: "#111111", labelInk: P.label || "#ffffff", text: "#111", hp: P.hp, label: UI.boss, name: T.upper(UI.name, S.lang), lvl: UI.lvl,
      mode: v % 2 ? "hearts" : "bar", nfam: "Handjet", nwt: 900, nsize, lsize: 44 };
  };
  L.boss.poster = (S, P, R, v) => {
    const W = 840, H = 1188, els = [bg(W, H, P.paper)], UI = P5.UI[S.lang];
    const hf = P5.headFont(S, { fam: "PressStart", wt: 400 });
    els.push({ id: "hud", type: "hud", x: 420, y: 106, w: 760, h: 132, d: hudD(S, P, v) });
    els.push(smallText("tag", T.upper(UI.round, S.lang), "Handjet", 700, 30, 796, 196, "right", P.text, 3));
    const ph = P5.photos[S.pid], card = ph && ph.kind === "card";
    const photo = { id: "photo", type: "photo", x: 420, y: card ? 545 : 590, w: card ? 560 : 840, h: card ? 560 : 640,
      d: { pid: S.pid, fx: fxFor(S, "dither"), ink: P.ink, paper: P.paper, anchor: "bottom", pad: 12, frame: "pixel", cardBg: "#fff", paperBg: P.paper, cell: 3 } };
    els.push(photo);
    const hp = headPos(photo);
    if (!card) {
      const cw = P5.clamp(hp.w * 0.62, 110, 210), ch = (cw * 7) / 11;
      els.push({ id: "crown", type: "pixel", x: hp.x, y: hp.top - ch * 0.18, w: cw, h: ch, rot: P5.between(R, -12, 4), d: { pat: "crown", color: P.deco } });
    }
    const sp = [[P5.clamp(hp.x - hp.w * 1.3, 70, 380), P5.clamp(hp.top + 70, 250, 600), 56], [P5.clamp(hp.x + hp.w * 1.35, 460, 770), P5.clamp(hp.top + 190, 250, 650), 40]];
    sp.forEach(([x, y, s], i) => els.push({ id: "spark" + i, type: "pixel", x: x + P5.between(R, -20, 20), y: y + P5.between(R, -20, 20), w: s, h: s, d: { pat: v % 2 && i ? "heart" : "spark", color: P.deco } }));
    const head = T.wrap(S.head, { fam: hf.fam, wt: hf.wt, W: 760, H: 170, maxLines: 2, maxSize: 112, minSize: 22, upper: true, lang: S.lang, gap: 0.32, align: "center" });
    els.push(textEl("head", head, 420 - head.w / 2, 866 - head.h, { color: P.head, outline: { color: P.paper, w: 8 } }));
    const qs = S.showQR ? 210 : 0;
    const dl = T.wrap(S.sub, { fam: "Handjet", wt: 700, W: 760 - 68 - (qs ? qs + 20 : 0), H: 104, maxLines: 3, maxSize: 44, minSize: 24, gap: 0.12 });
    els.push({ id: "dialog", type: "dialog", x: 420, y: 1017, w: 760, h: 262,
      d: { panel: P.panel, frame: "#111111", text: "#111", rows: dl.rows, opts: UI.opts.map((o) => T.upper(o, S.lang)), qr: S.showQR ? qrD(S, {}) : null } });
    return { W, H, els };
  };

  L.boss.meme = (S, P, R, v) => {
    const W = 1000, H = 1000, els = [bg(W, H, P.paper)], UI = P5.UI[S.lang];
    els.push({ id: "hud", type: "hud", x: 500, y: 92, w: 920, h: 124, d: hudD(S, P, v, 58) });
    const photo = { id: "photo", type: "photo", x: 500, y: 470, w: 1000, h: 560, d: { pid: S.pid, fx: fxFor(S, "dither"), ink: P.ink, paper: P.paper, anchor: "bottom", pad: 12, frame: "pixel", cardBg: "#fff", paperBg: P.paper, cell: 3 } };
    els.push(photo);
    const hp = headPos(photo);
    if (P5.photos[S.pid] && P5.photos[S.pid].kind !== "card") {
      const cw = P5.clamp(hp.w * 0.6, 100, 200);
      els.push({ id: "crown", type: "pixel", x: hp.x, y: hp.top - cw * 0.12, w: cw, h: (cw * 7) / 11, rot: P5.between(R, -10, 6), d: { pat: "crown", color: P.deco } });
    }
    const dl = T.wrap(S.head, { fam: "Handjet", wt: 800, W: 920 - 68, H: 160, maxLines: 4, maxSize: 86, minSize: 26, gap: 0.08 });
    els.push({ id: "dialog", type: "dialog", x: 500, y: 870, w: 920, h: 240, d: { panel: P.panel, frame: "#111111", text: "#111", rows: dl.rows, opts: [T.upper(UI.cont, S.lang)], qr: null } });
    return { W, H, els };
  };

  L.boss.sticker = (S, P, R, v) => {
    const W = 1000, H = 1000, els = [];
    const hf = P5.headFont(S, { fam: "PressStart", wt: 400 });
    const photo = { id: "photo", type: "photo", x: 500, y: 430, w: 860, h: 740, d: { pid: S.pid, fx: fxFor(S, "dither"), ink: "#111", paper: "#fff", anchor: "bottom", pad: 12, frame: "pixel", cardBg: "#fff", paperBg: "#fff", cell: 3.4 } };
    els.push(photo);
    const hp = headPos(photo);
    if (P5.photos[S.pid] && P5.photos[S.pid].kind !== "card") {
      const cw = P5.clamp(hp.w * 0.62, 120, 240);
      els.push({ id: "crown", type: "pixel", x: hp.x, y: hp.top - cw * 0.14, w: cw, h: (cw * 7) / 11, rot: v % 2 ? 8 : -8, d: { pat: "crown", color: P.deco } });
    }
    const res = T.wrap(S.head, { fam: hf.fam, wt: hf.wt, W: 760, H: 170, maxLines: 2, maxSize: 110, minSize: 30, upper: true, lang: S.lang, gap: 0.3, align: "center" });
    const padX = 30, padY = 26;
    els.push({ id: "label", type: "label", x: 500, y: 850, w: res.w + padX * 2, h: res.h + padY * 2, rot: 0,
      d: { rows: res.rows, bg: "#fff", color: "#111", border: "#111", shape: "pixel", padX, padY } });
    return { W, H, els, sticker: true };
  };

  // плашка с текстом (стикеры)
  P5.draw.label = (c, el) => {
    const d = el.d, w = el.w, h = el.h, x0 = -w / 2, y0 = -h / 2;
    if (d.shape === "pixel") {
      const s = 10; c.fillStyle = d.border || d.bg;
      c.fillRect(x0 + s, y0, w - 2 * s, h); c.fillRect(x0, y0 + s, w, h - 2 * s);
      c.fillStyle = d.bg; c.fillRect(x0 + s, y0 + 8, w - 2 * s, h - 16); c.fillRect(x0 + 8, y0 + s, w - 16, h - 2 * s);
    } else { c.fillStyle = d.bg; c.fillRect(x0, y0, w, h); }
    for (const r of d.rows) { c.font = T.font(r.fam, r.wt, r.size); c.fillStyle = d.color; c.fillText(r.t, x0 + d.padX + r.x, y0 + d.padY + r.base); }
  };

  // ---------- проверка качества: не даём важным элементам налезать друг на друга ----------
  P5.aabb = (el) => {
    let bx = -el.w / 2, by = -el.h / 2, bw = el.w, bh = el.h;
    if (el.type === "photo" && P5.photos[el.d.pid]) {
      const ph = P5.photos[el.d.pid], card = ph.kind === "card", pad = card ? el.d.pad || 0 : 0;
      const r = P5.fitPhoto(ph, el.w - pad * 2, el.h - pad * 2, card ? "center" : el.d.anchor);
      bx = r.x - pad; by = r.y - pad; bw = r.w + pad * 2; bh = r.h + pad * 2;
    }
    const a = ((el.rot || 0) * Math.PI) / 180, ca = Math.cos(a), sa = Math.sin(a);
    const pts = [[bx, by], [bx + bw, by], [bx + bw, by + bh], [bx, by + bh]].map(([x, y]) => [el.x + x * ca - y * sa, el.y + x * sa + y * ca]);
    const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
    return { x0: Math.min(...xs), y0: Math.min(...ys), x1: Math.max(...xs), y1: Math.max(...ys) };
  };
  // настоящая форма элемента: набор повёрнутых прямоугольников (у слов-плашек — каждая плашка отдельно)
  function shapes(el) {
    const a = ((el.rot || 0) * Math.PI) / 180, ca = Math.cos(a), sa = Math.sin(a);
    const world = (lx, ly) => ({ x: el.x + lx * ca - ly * sa, y: el.y + lx * sa + ly * ca });
    if (el.type === "words") {
      return el.d.items.map((it) => {
        const c = world(-el.w / 2 + it.x + it.w / 2, -el.h / 2 + it.y + it.h / 2);
        return { x: c.x, y: c.y, w: it.w, h: it.h, rot: (el.rot || 0) + (it.rot || 0) };
      });
    }
    const A = P5.aabb({ ...el, rot: 0 }), c = world((A.x0 + A.x1) / 2 - el.x, (A.y0 + A.y1) / 2 - el.y);
    return [{ x: c.x, y: c.y, w: A.x1 - A.x0, h: A.y1 - A.y0, rot: el.rot || 0 }];
  }
  const inside = (r, x, y) => {
    const a = (-r.rot * Math.PI) / 180, dx = x - r.x, dy = y - r.y;
    const lx = dx * Math.cos(a) - dy * Math.sin(a), ly = dx * Math.sin(a) + dy * Math.cos(a);
    return Math.abs(lx) <= r.w / 2 && Math.abs(ly) <= r.h / 2;
  };
  function samples(rs, n = 9) {
    const pts = [];
    for (const r of rs) {
      const a = (r.rot * Math.PI) / 180, ca = Math.cos(a), sa = Math.sin(a);
      for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
        const lx = ((i + 0.5) / n - 0.5) * r.w, ly = ((j + 0.5) / n - 0.5) * r.h;
        pts.push([r.x + lx * ca - ly * sa, r.y + lx * sa + ly * ca]);
      }
    }
    return pts;
  }
  const area = (rs) => rs.reduce((s, r) => s + r.w * r.h, 0);
  const KEY = ["head", "qr", "stamp", "note", "qrnote", "tag", "foot", "dialog", "hud", "label", "band", "title", "name", "reward", "mast", "dateline", "badge", "stats", "sub2", "sel"];
  P5.overlap = (A, B) => {
    const sa = shapes(A), sb = shapes(B), [small, big] = area(sa) <= area(sb) ? [sa, sb] : [sb, sa];
    const pts = samples(small);
    return pts.filter(([x, y]) => big.some((r) => inside(r, x, y))).length / Math.max(1, pts.length);
  };
  P5.quality = (scene) => {
    const els = scene.els.filter((e) => KEY.includes(e.id));
    let bad = 0;
    for (let i = 0; i < els.length; i++) for (let j = i + 1; j < els.length; j++) if (P5.overlap(els[i], els[j]) > 0.14) bad += 1;
    for (const e of els) {
      if (e.id === "band") continue;
      for (const [x, y] of samples(shapes(e), 3)) if (x < -4 || y < -4 || x > scene.W + 4 || y > scene.H + 4) { bad += 1; break; }
      if (e.type === "text" && e.id === "head" && Math.min(...e.d.rows.map((r) => r.size)) < scene.W * 0.04) bad += 0.5;
    }
    return bad;
  };

  P5.extraImgs = P5.extraImgs || {};
  // сколько раскладок у каждого стиля (🎲 перебирает их через seed)
  P5.VARIANTS = { fan: 3, zine: 3, boss: 4, wanted: 2, news: 2 };
  P5.layout = (S) => {
    const P = P5.palette(S), R = P5.rng(S.seed * 7919 + 13);
    const v = S.format === "poster" ? S.seed % (P5.VARIANTS[S.style] || 2) : S.seed % 2;
    // свои надписи (двойной клик по тексту на плакате) подменяют стандартные
    const ui0 = P5.UI[S.lang], ui = { ...ui0 };
    for (const [k, val] of Object.entries(S.texts || {})) if (val != null && val !== "") ui[k] = Array.isArray(ui0[k]) ? String(val).split("\n") : val;
    P5.UI[S.lang] = ui;
    let scene;
    try { scene = L[S.style][S.format](S, P, R, v); } finally { P5.UI[S.lang] = ui0; }
    scene.pal = P;
    // ксерокс в цвете: второй прогон фото цветом со сдвигом (как ризограф) + цветной скотч и пыль
    if (S.style === "zine" && S.color !== "bw") {
      for (const el of scene.els) {
        if (el.type === "photo") el.d.under = { ink: P.acc, dx: 9, dy: 7, cell: 4.6 };
        if (el.type === "tape") el.d = { ...(el.d || {}), color: P5.fx.rgba(P.acc, 0.5) };
        if (el.type === "overlay") el.d = { ...el.d, acc: P.acc };
      }
    }
    // вставленные картинки — поверх всего, но под зерном ксерокса
    const extras = (S.extras || []).filter((x) => x.f === S.format && P5.extraImgs[x.id]);
    if (extras.length) {
      const ov = scene.els.findIndex((e) => e.type === "overlay");
      const items = extras.map((x) => ({ id: x.id, type: "image", x: x.x, y: x.y, w: x.w, h: x.h, rot: 0, extra: true, d: { id: x.id, gray: S.color === "bw" } }));
      if (ov >= 0) scene.els.splice(ov, 0, ...items); else scene.els.push(...items);
    }
    return scene;
  };
  // помощники для раскладок из layouts2.js
  P5.LH = { textEl, bg, qrD, headPos, smallText, words, noteWithArrow, fxFor, hudD, numGlyph };
})();
