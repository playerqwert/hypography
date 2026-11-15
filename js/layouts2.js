/* Дополнительные раскладки: «Билет» (фан-сектор), «Колонка» (ксерокс), «Выбор героя» и «Продолжить?» (босс-файт),
   и два новых стиля — «Розыск» (вестерн-плакат) и «Таблоид» (первая полоса газеты). */
(() => {
  const P5 = window.P5, T = P5.T, L = P5.layouts, D = P5.draw;
  const { textEl, bg, qrD, headPos, smallText, words, noteWithArrow, fxFor, hudD, numGlyph } = P5.LH;
  const UIx = (S) => P5.UI[S.lang];
  const up = (S, s) => T.upper(s, S.lang);

  // ---------- новые элементы ----------
  P5.PIX.arrowL = ["....1", "...11", "..111", ".1111", "..111", "...11", "....1"];
  P5.PIX.arrowR = ["1....", "11...", "111..", "1111.", "111..", "11...", "1...."];
  P5.PIX.coin = [".111.", "11.11", "1.1.1", "1.1.1", "1.1.1", "11.11", ".111."];

  D.perf = (c, el) => { // линия отреза билета
    c.strokeStyle = el.d.color; c.lineWidth = 3; c.setLineDash([14, 10]);
    c.beginPath(); c.moveTo(-el.w / 2, 0); c.lineTo(el.w / 2, 0); c.stroke(); c.setLineDash([]);
    c.fillStyle = el.d.color; c.font = '700 26px "Handjet"'; c.fillText("✂", -el.w / 2 + 14, -8);
  };
  D.frame = (c, el) => { // рамка «Розыска»: двойная линия + звёзды в углах
    const d = el.d, w = el.w, h = el.h;
    c.strokeStyle = d.color; c.lineWidth = d.lw || 10; c.strokeRect(-w / 2 + c.lineWidth / 2, -h / 2 + c.lineWidth / 2, w - c.lineWidth, h - c.lineWidth);
    if (d.double) { c.lineWidth = 3; c.strokeRect(-w / 2 + 22, -h / 2 + 22, w - 44, h - 44); }
    if (d.stars) for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) star5(c, sx * (w / 2 - 46), sy * (h / 2 - 46), 13, d.color);
  };
  function star5(c, x, y, r, color) {
    c.beginPath();
    for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i * Math.PI) / 5, rr = i % 2 ? r * 0.42 : r; c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
    c.closePath(); c.fillStyle = color; c.fill();
  }
  D.star5 = (c, el) => star5(c, 0, 0, el.w / 2, el.d.color);
  D.stats = (c, el) => { // характеристики героя
    const d = el.d, x0 = -el.w / 2, rowH = el.h / d.rows.length;
    d.rows.forEach((r, i) => {
      const y = -el.h / 2 + i * rowH;
      c.font = '800 34px "Handjet"'; c.fillStyle = d.text; c.letterSpacing = "2px";
      c.fillText(up(d, r.label), x0, y + rowH * 0.66); c.letterSpacing = "0px";
      const bx = x0 + 170, bw = el.w - 170, segs = 10, g = 4, sw = (bw - g * (segs - 1)) / segs, bh = rowH * 0.5, by = y + rowH * 0.24;
      for (let k = 0; k < segs; k++) {
        if (k < r.v) { c.fillStyle = d.fill; c.fillRect(bx + k * (sw + g), by, sw, bh); }
        else { c.lineWidth = 3; c.strokeStyle = d.text; c.strokeRect(bx + k * (sw + g) + 1.5, by + 1.5, sw - 3, bh - 3); }
      }
    });
  };
  D.bars = (c, el) => { // «газетный текст» — серые строки вместо бессмысленных букв
    const d = el.d, r = P5.rng(d.seed || 5), lh = 15;
    c.fillStyle = d.color;
    for (let y = -el.h / 2; y < el.h / 2 - 8; y += lh) {
      const para = r() < 0.12, w = para ? el.w * P5.between(r, 0.3, 0.7) : el.w * P5.between(r, 0.88, 1);
      c.fillRect(-el.w / 2, y, w, 6);
      if (para) y += lh * 0.6;
    }
  };
  D.badge = (c, el) => { // звезда «Срочно!»
    const d = el.d, R = el.w / 2;
    c.beginPath();
    for (let i = 0; i < 28; i++) { const a = (i * Math.PI) / 14, rr = i % 2 ? R * 0.8 : R; c.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
    c.closePath(); c.fillStyle = d.bg; c.fill();
    const t = up(d, d.t), m = T.m(t, "Sofia", 900, 100), size = Math.min(60, (100 * R * 1.3) / m.w);
    const mm = T.m(t, "Sofia", 900, size);
    c.font = T.font("Sofia", 900, size); c.fillStyle = d.color; c.fillText(t, -mm.w / 2 + mm.l, (mm.asc - mm.desc) / 2);
  };
  D.dateline = (c, el) => { // строка под газетной шапкой
    const d = el.d, w = el.w;
    c.fillStyle = d.color; c.fillRect(-w / 2, -el.h / 2, w, 4); c.fillRect(-w / 2, el.h / 2 - 2, w, 2);
    c.font = '700 24px "Sofia"'; c.letterSpacing = "3px";
    const t = up(d, d.t), m = c.measureText(t);
    c.fillText(t, -m.width / 2, 9); c.letterSpacing = "0px";
  };
  const fitLine = (S, text, fam, wt, W, H, maxSize) => T.fitStack(text, { fam, wt, W, H, maxLines: 1, maxSize, lang: S.lang });
  const center = (res, cx, top, id, d) => textEl(id, res, cx - res.w / 2, top, d);

  // ---------- A · ФАН-СЕКТОР: «Билет» ----------
  function fanTicket(S, P, R) {
    const W = 840, H = 1188, els = [bg(W, H, P.paper)], UI = UIx(S);
    const hf = P5.headFont(S, { fam: "Sofia", wt: 900 });
    els.push(numGlyph(S, P, 420, 420, 1000, 760, W));
    const ph = P5.photos[S.pid], card = ph && ph.kind === "card";
    els.push({ id: "photo", type: "photo", x: 420, y: 380, w: card ? 560 : 800, h: card ? 560 : 640, rot: card ? -2 : 0,
      d: { pid: S.pid, fx: fxFor(S, "halftone"), ink: P.ink, paper: P.paper, anchor: "bottom", pad: 14, frame: "box", cardBg: "#fff", lw: 6 } });
    const sub = (S.sub || "").replace(/★\s*$/, "").trim();
    els.push({ id: "band", type: "band", x: 420, y: 702, w: 1040, h: 86, rot: P5.between(R, 2.2, 3.6) * (R() < 0.5 ? 1 : -1),
      d: { text: up(S, sub) + "  ★  ", fam: "Sofia", wt: 900, size: 60, bg: P.acc, color: P.accInk, offset: 20 + Math.round(R() * 60) } });
    const head = T.fitStack(S.head, { fam: hf.fam, wt: hf.wt, W: 752, H: 240, maxLines: 3, maxSize: 210, lang: S.lang });
    els.push(textEl("head", head, 44, 778, { color: P.text, outline: { color: P.paper, w: 6 } }));
    els.push({ id: "perf", type: "perf", x: 420, y: 1046, w: 840, h: 6, locked: false, d: { color: P.text } });
    els.push(smallText("tag", up(S, UI.event + " · " + UI.vote), "Handjet", 700, 30, 48, 1074, "left", P.text, 2));
    els.push(smallText("foot", up(S, UI.foot.join(" · ")), "Handjet", 600, 24, 48, 1118, "left", P.text, 2));
    if (S.showQR) els.push({ id: "qr", type: "qr", x: W - 48 - 72, y: H - 36 - 70, w: 144, h: 144, d: qrD(S, { pad: 10, lw: 5 }) });
    return { W, H, els };
  }

  // ---------- B · КСЕРОКС: «Колонка» ----------
  function zineColumn(S, P, R) {
    const W = 840, H = 1188, els = [bg(W, H, P.paper)], UI = UIx(S);
    const hf = P5.headFont(S, { fam: "Sofia", wt: 900 });
    const rot = P5.between(R, 2, 3.5), cx = 575, cy = 480;
    if (S.color !== "bw") els.push({ id: "accsheet", type: "rect", x: cx - 22, y: cy + 26, w: 500, h: 700, rot: -3, d: { stroke: P.acc, lw: 10 } });
    els.push({ id: "sheet", type: "torn", x: cx, y: cy, w: 510, h: 720, rot, d: { fill: P.sheet, pts: P5.tornPoints(R) } });
    els.push({ id: "photo", type: "photo", x: cx, y: cy + 6, w: 470, h: 690, rot, d: { pid: S.pid, fx: fxFor(S, "xerox"), ink: P.ink, paper: "#ffffff", anchor: "bottom", seed: 5 + (S.seed % 7), pad: 0, frame: "none" } });
    els.push({ id: "tape1", type: "tape", x: cx - 200, y: cy - 345, w: 160, h: 44, rot: -22 });
    els.push({ id: "tape2", type: "tape", x: cx + 210, y: cy - 352, w: 160, h: 44, rot: 17 });
    els.push(words("head", S, P, R, S.head, 40, 70, [300, 300, 300, 300, 300, 300], 720, 110, hf));
    if (S.showQR) {
      els.push({ id: "qr", type: "qr", x: 150, y: 1000, w: 190, h: 190, rot: -4, d: qrD(S, { pad: 12, lw: 0 }) });
      els.push({ id: "tape3", type: "tape", x: 160, y: 902, w: 120, h: 38, rot: 8 });
      els.push({ id: "qrnote", type: "note", x: 170, y: 1138, w: 260, h: 60, rot: -3, d: { t: UI.qrNote, size: 44, color: P.ink } });
    }
    const st = up(S, UI.stamp), sm = T.m(st, "Sofia", 900, 54);
    els.push({ id: "stamp", type: "stamp", x: 790 - (sm.w + 50) / 2, y: 1112, w: sm.w + 50, h: 70, rot: -6 + P5.between(R, -2, 2), d: { t: st, size: 54, color: P.stamp, multiply: S.color !== "bw" } });
    const hp = headPos(els.find((e) => e.id === "photo"));
    if ((S.sub || "").trim()) els.push(noteWithArrow("note", S.sub.trim(), 54, P.ink, hp.x + 40, Math.max(70, hp.top - 30), hp.x + hp.w * 0.3, hp.y + hp.w * 0.25, -6));
    els.push({ id: "overlay", type: "overlay", x: W / 2, y: H / 2, w: W, h: H, locked: true, d: { seed: 3 + (S.seed % 5) } });
    return { W, H, els };
  }

  // ---------- C · БОСС-ФАЙТ: «Выбор героя» ----------
  function bossSelect(S, P, R) {
    const W = 840, H = 1188, els = [bg(W, H, P.paper)], UI = UIx(S);
    const hf = P5.headFont(S, { fam: "PressStart", wt: 400 });
    const head = T.wrap(S.head, { fam: hf.fam, wt: hf.wt, W: 740, H: 150, maxLines: 2, maxSize: 64, minSize: 20, upper: true, lang: S.lang, gap: 0.35, align: "center" });
    els.push(center(head, 420, 50, "head", { color: P.head }));
    const ph = P5.photos[S.pid], card = ph && ph.kind === "card";
    els.push({ id: "card", type: "rect", x: 420, y: 555, w: 600, h: 610, d: { stroke: P.ink, lw: 8 } });
    els.push({ id: "photo", type: "photo", x: 420, y: 562, w: card ? 540 : 584, h: card ? 560 : 590, d: { pid: S.pid, fx: fxFor(S, "dither"), ink: P.ink, paper: P.paper, anchor: "bottom", pad: 0, frame: "none", cell: 3 } });
    els.push({ id: "arL", type: "pixel", x: 68, y: 555, w: 50, h: 70, d: { pat: "arrowL", color: P.deco } });
    els.push({ id: "arR", type: "pixel", x: 772, y: 555, w: 50, h: 70, d: { pat: "arrowR", color: P.deco } });
    const nm = T.wrap(up(S, UI.name), { fam: "Handjet", wt: 900, W: 560, H: 64, maxLines: 1, maxSize: 64, minSize: 24, align: "center" });
    els.push({ id: "name", type: "label", x: 420, y: 902, w: 600, h: 84, d: { rows: nm.rows, bg: "#111111", color: P.label || "#fff", padX: 20, padY: (84 - nm.h) / 2 } });
    const v3 = 7 + Math.floor(R() * 3);
    els.push({ id: "stats", type: "stats", x: 300, y: 1060, w: 500, h: 168, d: { text: "#111111", fill: P.hp, lang: S.lang, rows: UI.stats.slice(0, 3).map((l, i) => ({ label: l, v: [10, 9, v3][i] })) } });
    if (S.showQR) els.push({ id: "qr", type: "qr", x: 700, y: 1060, w: 180, h: 180, d: qrD(S, { pad: 12, lw: 6 }) });
    return { W, H, els };
  }

  // ---------- C · БОСС-ФАЙТ: «Продолжить?» ----------
  function bossContinue(S, P, R) {
    const W = 840, H = 1188, els = [bg(W, H, P.paper)], UI = UIx(S);
    const hf = P5.headFont(S, { fam: "PressStart", wt: 400 });
    const head = T.wrap(S.head, { fam: hf.fam, wt: hf.wt, W: 760, H: 230, maxLines: 3, maxSize: 100, minSize: 22, upper: true, lang: S.lang, gap: 0.32, align: "center" });
    els.push(center(head, 420, 48, "head", { color: P.head, outline: { color: P.paper, w: 7 } }));
    const ph = P5.photos[S.pid], card = ph && ph.kind === "card", top = 48 + head.h + 20;
    els.push({ id: "photo", type: "photo", x: 420, y: (top + 900) / 2, w: card ? 560 : 840, h: 900 - top,
      d: { pid: S.pid, fx: fxFor(S, "dither"), ink: P.ink, paper: P.paper, anchor: "bottom", pad: 12, frame: "pixel", cardBg: "#fff", paperBg: P.paper, cell: 3 } });
    for (let i = 0; i < 3; i++) els.push({ id: "spark" + i, type: "pixel", x: i % 2 ? 760 - R() * 40 : 80 + R() * 40, y: top + 70 + i * 170 + R() * 40, w: 46, h: 46, d: { pat: i === 1 ? "star" : "spark", color: P.deco } });
    const qs = S.showQR ? 210 : 0;
    const rows = T.wrap(up(S, UI.cont2), { fam: "PressStart", wt: 400, W: 760 - 68 - (qs ? qs + 20 : 0), H: 90, maxLines: 2, maxSize: 40, minSize: 18, gap: 0.4 });
    els.push({ id: "dialog", type: "dialog", x: 420, y: 1030, w: 760, h: 250, d: { panel: P.panel, frame: "#111111", text: "#111", rows: rows.rows, opts: [up(S, UI.opts[0])], qr: S.showQR ? qrD(S, {}) : null } });
    return { W, H, els };
  }

  // ---------- D · РОЗЫСК ----------
  L.wanted = {};
  L.wanted.poster = (S, P, R, v) => {
    const W = 840, H = 1188, els = [bg(W, H, P.paper)], UI = UIx(S), ribbon = v % 2 === 1;
    const hf = P5.headFont(S, { fam: "Slab", wt: 900 });
    els.push({ id: "frame", type: "frame", x: 420, y: 594, w: 804, h: 1152, locked: true, d: { color: P.title, lw: ribbon ? 14 : 10, double: !ribbon, stars: true } });
    const t = fitLine(S, UI.wanted, hf.fam, hf.wt, ribbon ? 640 : 700, 140, 170);
    if (ribbon) els.push({ id: "ribbon", type: "rect", x: 420, y: 72 + t.h / 2, w: 760, h: t.h + 44, rot: -1.5, d: { fill: P.acc } });
    els.push(center(t, 420, 72, "title", { color: ribbon ? P.accInk : P.title }));
    const st = smallText("sub2", up(S, UI.wantedSub), "Sofia", 700, 34, 420, 72 + t.h + (ribbon ? 40 : 20), "center", P.text, 4);
    els.push(st);
    const ptop = st.y + st.h / 2 + 22, pbot = ptop + 470;
    els.push({ id: "pframe", type: "rect", x: 420, y: (ptop + pbot) / 2, w: 540, h: pbot - ptop, d: { stroke: P.ink, lw: 6 } });
    els.push({ id: "photo", type: "photo", x: 420, y: (ptop + pbot) / 2 + 2, w: 524, h: pbot - ptop - 12, d: { pid: S.pid, fx: fxFor(S, "xerox"), ink: P.ink, paper: "#ffffff", anchor: "bottom", seed: 5 + (S.seed % 7), pad: 0, frame: "none" } });
    els.push({ id: "st1", type: "star5", x: 100, y: (ptop + pbot) / 2, w: 44, h: 44, d: { color: P.title } });
    els.push({ id: "st2", type: "star5", x: 740, y: (ptop + pbot) / 2, w: 44, h: 44, d: { color: P.title } });
    const nm = fitLine(S, UI.name, hf.fam, hf.wt, 640, 110, 120);
    els.push(center(nm, 420, pbot + 24, "name", { color: P.text }));
    const why = T.wrap(S.head, { fam: "Sofia", wt: 800, W: 680, H: 100, maxLines: 2, maxSize: 46, minSize: 22, upper: true, lang: S.lang, gap: 0.12, align: "center" });
    const wtop = pbot + 24 + nm.h + 18;
    els.push(center(why, 420, wtop, "head", { color: P.text }));
    const rtop = Math.max(wtop + why.h + 26, 935);
    els.push({ id: "rule", type: "rect", x: 420, y: rtop - 10, w: 700, h: 4, d: { fill: P.title } });
    const rl = smallText("rlabel", up(S, UI.rewardLbl), hf.fam, hf.wt, 34, 70, rtop + 12, "left", P.text, 3);
    els.push(rl);
    const rw = T.fitStack(up(S, S.sub || ""), { fam: hf.fam, wt: hf.wt, W: S.showQR ? 440 : 680, H: 120, maxLines: 2, maxSize: 96, lang: S.lang });
    els.push(textEl("reward", rw, 70, rtop + 60, { color: P.title }));
    if (S.showQR) els.push({ id: "qr", type: "qr", x: 680, y: rtop + 100, w: 170, h: 170, d: qrD(S, { pad: 12, lw: 5 }) });
    return { W, H, els };
  };
  L.wanted.meme = (S, P, R, v) => {
    const W = 1000, H = 1000, els = [bg(W, H, P.paper)], UI = UIx(S);
    const hf = P5.headFont(S, { fam: "Slab", wt: 900 });
    els.push({ id: "frame", type: "frame", x: 500, y: 500, w: 964, h: 964, locked: true, d: { color: P.title, lw: 10, double: true, stars: true } });
    const t = fitLine(S, UI.wanted, hf.fam, hf.wt, 800, 120, 140);
    els.push(center(t, 500, 66, "title", { color: P.title }));
    const cap = T.wrap(S.head, { fam: "Sofia", wt: 800, W: 820, H: 180, maxLines: 3, maxSize: 64, minSize: 26, upper: true, lang: S.lang, gap: 0.1, align: "center" });
    const ptop = 66 + t.h + 26, pbot = 1000 - 70 - cap.h - 26;
    els.push({ id: "pframe", type: "rect", x: 500, y: (ptop + pbot) / 2, w: 640, h: pbot - ptop, d: { stroke: P.ink, lw: 6 } });
    els.push({ id: "photo", type: "photo", x: 500, y: (ptop + pbot) / 2 + 2, w: 624, h: pbot - ptop - 12, d: { pid: S.pid, fx: fxFor(S, "xerox"), ink: P.ink, paper: "#fff", anchor: "bottom", seed: 5 } });
    els.push(center(cap, 500, pbot + 26, "head", { color: P.text }));
    return { W, H, els };
  };

  // ---------- E · ТАБЛОИД ----------
  L.news = {};
  L.news.poster = (S, P, R, v) => {
    const W = 840, H = 1188, els = [bg(W, H, P.paper)], UI = UIx(S), right = v % 2 === 1;
    const hf = P5.headFont(S, { fam: "Sofia", wt: 900 });
    const mast = fitLine(S, UI.mast, "Playfair", 900, 760, 120, 140);
    els.push(center(mast, 420, 40, "mast", { color: P.title }));
    const dl = 40 + mast.h + 34;
    els.push({ id: "dateline", type: "dateline", x: 420, y: dl, w: 760, h: 44, d: { t: UI.dateline, color: P.text, lang: S.lang } });
    const head = T.fitStack(S.head, { fam: hf.fam, wt: hf.wt, W: 760, H: 300, maxLines: 3, maxSize: 190, lang: S.lang });
    const htop = dl + 40;
    els.push(textEl("head", head, 40, htop, { color: P.text }));
    const top = htop + head.h + 28, bot = 1130, px = right ? 312 : 40, cx = right ? 40 : 568;
    els.push({ id: "pframe", type: "rect", x: px + 244, y: (top + bot) / 2, w: 488, h: bot - top, d: { stroke: P.ink, lw: 3 } });
    els.push({ id: "photo", type: "photo", x: px + 244, y: (top + bot) / 2, w: 480, h: bot - top - 8, d: { pid: S.pid, fx: fxFor(S, "halftone"), ink: P.ink, paper: "#ffffff", anchor: "bottom", pad: 0, frame: "none", cell: 5 } });
    els.push({ id: "badge", type: "badge", x: right ? px + 40 : px + 448, y: top + 40, w: 170, h: 170, rot: right ? 12 : -12, d: { t: UI.urgent, bg: P.acc, color: P.accInk, lang: S.lang } });
    const sub = T.wrap(S.sub || "", { fam: "Playfair", wt: 900, W: 232, H: 190, maxLines: 5, maxSize: 40, minSize: 20, lang: S.lang, gap: 0.12 });
    els.push(textEl("sub2", sub, cx, top, { color: P.text }));
    const qrTop = S.showQR ? bot - 232 : bot;
    const btop = top + sub.h + 22;
    if (qrTop - btop > 40) els.push({ id: "bars", type: "bars", x: cx + 116, y: (btop + qrTop - 18) / 2, w: 232, h: qrTop - 18 - btop, d: { color: "#bdbab2", seed: S.seed } });
    if (S.showQR) els.push({ id: "qr", type: "qr", x: cx + 116, y: bot - 116, w: 196, h: 232, d: qrD(S, { label: up(S, UI.qrBox), lfam: "Sofia", lwt: 900, lsize: 26, pad: 14, lw: 4 }) });
    return { W, H, els };
  };
  L.news.meme = (S, P, R, v) => {
    const W = 1000, H = 1000, els = [bg(W, H, P.paper)], UI = UIx(S);
    const hf = P5.headFont(S, { fam: "Sofia", wt: 900 });
    const mast = fitLine(S, UI.mast, "Playfair", 900, 900, 100, 120);
    els.push(center(mast, 500, 34, "mast", { color: P.title }));
    const dl = 34 + mast.h + 30;
    els.push({ id: "dateline", type: "dateline", x: 500, y: dl, w: 920, h: 44, d: { t: UI.dateline, color: P.text, lang: S.lang } });
    const cap = T.wrap(S.head, { fam: hf.fam, wt: hf.wt, W: 920, H: 220, maxLines: 3, maxSize: 90, minSize: 28, upper: true, lang: S.lang, gap: 0.06 });
    const top = dl + 36, bot = 1000 - 36 - cap.h - 24;
    els.push({ id: "photo", type: "photo", x: 500, y: (top + bot) / 2, w: 920, h: bot - top, d: { pid: S.pid, fx: fxFor(S, "halftone"), ink: P.ink, paper: "#fff", anchor: "bottom", cell: 5 } });
    els.push({ id: "badge", type: "badge", x: 840, y: top + 90, w: 170, h: 170, rot: 12, d: { t: UI.urgent, bg: P.acc, color: P.accInk, lang: S.lang } });
    els.push(textEl("head", cap, 40, bot + 24, { color: P.text }));
    return { W, H, els };
  };

  // ---------- подключаем новые варианты к старым стилям ----------
  const fan0 = L.fan.poster, zine0 = L.zine.poster, boss0 = L.boss.poster;
  L.fan.poster = (S, P, R, v) => (v === 2 ? fanTicket(S, P, R) : fan0(S, P, R, v));
  L.zine.poster = (S, P, R, v) => (v === 2 ? zineColumn(S, P, R) : zine0(S, P, R, v));
  L.boss.poster = (S, P, R, v) => (v === 2 ? bossSelect(S, P, R) : v === 3 ? bossContinue(S, P, R) : boss0(S, P, R, v));
  void hudD;
})();
