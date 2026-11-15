/* Пятёрка — фабрика плакатов: состояние, панель, кнопки. */
(() => {
  const P5 = window.P5, $ = (id) => document.getElementById(id), $$ = (s) => [...document.querySelectorAll(s)];

  const DEFAULT_PID = {
    poster: { fan: "glasses", zine: "royal", boss: "pointing", wanted: "glasses", news: "royal" },
    meme: { fan: "sad", zine: "laugh", boss: "sad", wanted: "sad", news: "laugh" },
    sticker: { fan: "glasses", zine: "royal", boss: "pointing", wanted: "glasses", news: "royal" },
  };
  const DICE_PIDS = { poster: ["glasses", "royal", "pointing", "lookup"], meme: ["sad", "laugh", "glasses", "lookup", "pointing"], sticker: ["glasses", "royal", "pointing", "lookup", "sad"] };
  const SUB_LABEL = { fan: "Лента (бегущая строка)", zine: "Подпись маркером", boss: "Реплика в диалоге", wanted: "Награда", news: "Подзаголовок" };
  const HEAD_LABEL = { poster: "Главный текст", meme: "Подпись мема", sticker: "Надпись на стикере" };
  const QR_TIP = {
    orig: "Ведёт на 5slay.ru — тот же QR, что на плакатах.",
    clean: "Та же ссылка 5slay.ru, но чёткие квадраты и «5» в центре — сканируется надёжнее и не мылится на A3.",
    custom: "Вставь свою ссылку — QR соберётся сам.",
  };

  const S = {
    format: "poster", style: "fan", color: "bw", acc: 0, pid: "glasses", pidPicked: false, fx: "auto", lang: "ru", fonts: { fan: "auto", zine: "auto", boss: "auto" }, custom: null, extras: [], num: "5", texts: {},
    head: "", sub: "", headIdx: 0, subIdx: 0, headEdited: false, subEdited: false, qr: { mode: "orig", url: "" }, showQR: true, seed: 2,
  };
  const OV = {};
  const sig = () => `${S.format}:${S.style}`;
  const ov = () => (OV[sig()] = OV[sig()] || {});
  const hist = []; let pending = null;
  const snap = () => JSON.stringify({ S, OV });
  const beginChange = () => { pending = snap(); };
  const commit = () => { if (pending) { hist.push(pending); if (hist.length > 80) hist.shift(); pending = null; } save(); updateReset(); };
  // «Вернуть всё на места» — только если что-то двигали
  function updateReset() {
    const b = $("btnReset"); if (!b) return;
    const o = OV[`${S.format}:${S.style}`] || {};
    b.hidden = !Object.values(o).some((x) => x && ((x.dx || 0) !== 0 || (x.dy || 0) !== 0 || (x.dr || 0) !== 0 || (x.ds && x.ds !== 1) || x.hidden));
  }
  const cancelChange = () => { pending = null; };
  const undo = () => {
    const s = hist.pop(); if (!s) { toast("Нечего отменять"); return; }
    const o = JSON.parse(s); Object.assign(S, o.S);
    for (const k of Object.keys(OV)) delete OV[k]; Object.assign(OV, o.OV);
    if (!P5.photos[S.pid]) S.pid = DEFAULT_PID[S.format][S.style];
    syncUI(); rebuild();
  };
  const HUNT_KEYS = ["style", "format", "pid", "fonts", "lang", "headIdx", "showQR", "fx"];
  const set = (patch) => { beginChange(); Object.assign(S, patch); commit(); syncUI(); rebuild(Object.keys(patch).some((k) => HUNT_KEYS.includes(k))); };

  // перебираем варианты раскладки и берём первый без наложений (или лучший из найденных)
  function bestSeed(base, tries = 12, st = S) {
    let best = base, bq = Infinity;
    for (let i = 0; i < tries; i++) {
      const seed = base + i;
      const q = P5.quality(P5.layout({ ...st, seed }));
      if (q < bq) { bq = q; best = seed; }
      if (q === 0) break;
    }
    return best;
  }

  const subUsed = () => S.format === "poster" || (S.format === "meme" && S.style === "fan");
  function ensureText() {
    const hl = P5.phraseList(S, "head");
    if (!S.headEdited) S.head = hl[S.headIdx % hl.length];
    const sl = P5.phraseList(S, "sub");
    if (!S.subEdited) S.sub = sl[S.subIdx % sl.length];
  }

  let editor, scene;
  function rebuild(hunt) {
    if (!P5.photos[S.pid]) { S.pid = DEFAULT_PID[S.format][S.style]; S.pidPicked = false; }
    ensureText();
    if (hunt && !Object.keys(ov()).length && P5.quality(P5.layout(S)) > 0) S.seed = bestSeed(S.seed + 1, 10);
    scene = P5.layout(S);
    editor.setScene(scene);
    updateReset();
    if (document.activeElement !== $("tHead")) $("tHead").value = S.head;
    if (document.activeElement !== $("tSub")) $("tSub").value = S.sub;
    thumbsSoon();
  }

  // ---------- миниатюры стилей ----------
  let thumbT = 0;
  function thumbsSoon() { clearTimeout(thumbT); thumbT = setTimeout(thumbs, 350); }
  function thumbs() {
    $$("#styles button").forEach((b) => {
      const st = b.dataset.style, c = b.querySelector("canvas");
      const T = { ...S, style: st, pid: S.pidPicked ? S.pid : DEFAULT_PID[S.format][st], headEdited: S.headEdited, subEdited: S.subEdited };
      if (!T.headEdited) T.head = P5.phraseList(T, "head")[S.headIdx % P5.phraseList(T, "head").length];
      if (!T.subEdited) T.sub = P5.phraseList(T, "sub")[S.subIdx % P5.phraseList(T, "sub").length];
      const sc = P5.layout(T);
      const w = Math.round(c.clientWidth * 2) || 220;
      c.width = w; c.height = Math.round((w * sc.H) / sc.W);
      c.style.aspectRatio = `${sc.W} / ${sc.H}`;
      const ctx = c.getContext("2d");
      if (sc.sticker) {
        const off = P5.canvas(c.width, c.height);
        P5.render(off.getContext("2d"), sc, { scale: c.width / sc.W, transparent: true });
        ctx.clearRect(0, 0, c.width, c.height); ctx.drawImage(P5.outline(off, 22 * (c.width / sc.W)), 0, 0);
      } else P5.render(ctx, sc, { scale: c.width / sc.W, overrides: OV[`${S.format}:${st}`] || {} });
    });
  }

  // ---------- панель ----------
  function buildPhotos() {
    const box = $("photos"); box.innerHTML = "";
    const add = document.createElement("button");
    add.className = "add"; add.innerHTML = "<b>＋</b>Своё фото<small>Ctrl+V — наклеить</small>"; add.title = "Загрузить своё фото";
    add.addEventListener("click", () => $("file").click());
    box.appendChild(add);

    Object.values(P5.photos).forEach((ph) => {
      const b = document.createElement("button");
      b.dataset.pid = ph.id; b.title = ph.name;
      const im = document.createElement("img");
      im.alt = ph.name;
      im.src = ph.user ? ph.img.toDataURL("image/png") : P5.ASSETS.photos[ph.id].src;
      b.appendChild(im);
      const sp = document.createElement("span"); sp.textContent = ph.name; b.appendChild(sp);
      b.addEventListener("click", () => set({ pid: ph.id, pidPicked: true }));
      box.appendChild(b);
    });
    syncUI();
  }
  function buildFonts() {
    const box = $("fonts"); box.innerHTML = "";
    const cur = S.fonts[S.style] || "auto";
    P5.FONT_SETS[S.style].forEach((id) => {
      const f = P5.FONTS.find((x) => x.id === id);
      const b = document.createElement("button"); b.dataset.font = id;
      const auto = id === "auto", famName = auto ? P5.AUTO_FONT_NAME[S.style] : f.name;
      const fam = auto ? (S.style === "boss" ? "PressStart" : "Sofia") : f.fam, wt = auto ? (S.style === "boss" ? 400 : 900) : f.wt;
      const sp = document.createElement("span"); sp.textContent = "Аа5";
      sp.style.fontFamily = `"${fam}"`; sp.style.fontWeight = wt; if (fam === "PressStart") sp.style.fontSize = "15px";
      const sm = document.createElement("small"); sm.textContent = auto ? famName + " · основной" : famName;
      b.append(sp, sm); b.classList.toggle("on", cur === id);
      b.addEventListener("click", () => set({ fonts: { ...S.fonts, [S.style]: id } }));
      box.appendChild(b);
    });
  }
  // свои цвета хранятся в браузере
  let myColors = [];
  try { myColors = JSON.parse(localStorage.getItem("p5colors") || "[]").filter((c) => /^#[0-9a-f]{6}$/i.test(c)).slice(0, 12); } catch (e) { myColors = []; }
  const saveColors = () => { try { localStorage.setItem("p5colors", JSON.stringify(myColors)); } catch (e) { /* не страшно */ } };
  function swatch(color, on, title, onClick) {
    const b = document.createElement("button"); b.style.background = color; b.title = title; b.classList.toggle("on", on);
    if (P5.Y(color) > 0.8) b.classList.add("light");
    b.addEventListener("click", onClick);
    return b;
  }
  function buildSwatches() {
    const box = $("swatches"); box.innerHTML = "";
    P5.PALETTES[S.style].color.forEach((p, i) => box.appendChild(swatch(p.chip, S.color === "color" && !S.custom && S.acc === i, "Цвет " + (i + 1), () => set({ color: "color", acc: i, custom: null }))));
    const mine = $("mySwatches"); mine.innerHTML = "";
    myColors.forEach((c) => {
      const w = document.createElement("span"); w.className = "mine";
      w.appendChild(swatch(c, S.color === "color" && S.custom === c, "Мой цвет " + c, () => set({ color: "color", custom: c })));
      const x = document.createElement("i"); x.textContent = "×"; x.title = "Убрать цвет";
      x.addEventListener("click", (e) => { e.stopPropagation(); myColors = myColors.filter((m) => m !== c); saveColors(); if (S.custom === c) set({ custom: null }); else buildSwatches(); });
      w.appendChild(x); mine.appendChild(w);
    });
    const add = document.createElement("label"); add.className = "addColor"; add.title = "Добавить свой цвет";
    add.innerHTML = '<span>＋</span><input type="color" value="#ff5b1f">';
    add.querySelector("input").addEventListener("change", (e) => {
      const c = e.target.value.toLowerCase();
      if (!myColors.includes(c)) { myColors = [c, ...myColors].slice(0, 12); saveColors(); }
      set({ color: "color", custom: c });
    });
    mine.appendChild(add);
    $("colorBox").hidden = S.color === "bw";
    $("customHint").textContent = S.style === "zine" ? "Свой цвет станет акцентом (плашки, листок, штамп)." : "Свой цвет станет фоном. Цвет текста подберётся сам — чтобы читалось.";
  }
  function syncUI() {
    $$("#formats button").forEach((b) => b.classList.toggle("on", b.dataset.format === S.format));
    $$("#styles button").forEach((b) => b.classList.toggle("on", b.dataset.style === S.style));
    $$("#photos button[data-pid]").forEach((b) => b.classList.toggle("on", b.dataset.pid === S.pid));
    $$("#fxChips button").forEach((b) => b.classList.toggle("on", b.dataset.fx === S.fx));
    $$("#langChips button").forEach((b) => b.classList.toggle("on", b.dataset.lang === S.lang));
    $$("#colorSeg button").forEach((b) => b.classList.toggle("on", b.dataset.c === S.color));
    $$("#qrSeg button").forEach((b) => b.classList.toggle("on", b.dataset.q === S.qr.mode));
    buildSwatches(); buildFonts();
    $("qrShow").checked = S.showQR;
    $("numRow").hidden = S.style !== "fan";
    $$("#numChips button").forEach((b) => b.classList.toggle("on", b.dataset.num === String(S.num || "5")));
    if (document.activeElement !== $("numInput")) $("numInput").value = ["5", "42"].includes(String(S.num || "5")) ? "" : S.num;
    $("diceColor").hidden = S.color === "bw";
    const ph = P5.photos[S.pid];
    $("fitRow").hidden = !(ph && ph.crop);
    $$("#fitChips button").forEach((b) => b.classList.toggle("on", b.dataset.fit === (S.cardFull ? "full" : "auto")));
    $("qrUrl").hidden = S.qr.mode !== "custom";
    if (document.activeElement !== $("qrUrl")) $("qrUrl").value = S.qr.url;
    $("qrTip").textContent = QR_TIP[S.qr.mode];
    qrCheckSoon();
    $("qrCard").hidden = S.format !== "poster";
    $("subWrap").hidden = !subUsed();
    $("subLabel").textContent = SUB_LABEL[S.style];
    $("headLabel").textContent = HEAD_LABEL[S.format];
    $("tHead").rows = S.format === "meme" ? 3 : 2;
    buildExportMenu();
  }

  // ---------- экспорт ----------
  function buildExportMenu() {
    const m = $("exportMenu"); m.innerHTML = "";
    const items = S.format === "poster"
      ? [["pdfA4", "PDF A4 — для принтера", "лист A4, 300 dpi"],
         ["sheet3same", "3 на листе A4", "три копии, режь по меткам"],
         ["sheet9", "9 на листе A4 — маленькие", "9 копий, режь по меткам"],
         ["png", "PNG-картинка", "2480 × 3508, чтобы скинуть в чат"]]
      : S.format === "sticker"
        ? [["sticker", "Стикер для Telegram", "PNG 512×512, прозрачный фон — сразу в @Stickers"], ["stickerBig", "Большой PNG", "1024×1024 с белой обводкой"]]
        : [["meme", "Мем PNG", "1080 × 1080"],
           ["meme6", "6 на листе A4", "мемы по 9 см, режь по меткам"], ["meme12", "12 на листе A4", "мемы по 6 см, режь по меткам"]];
    items.forEach(([id, t, s]) => {
      const b = document.createElement("button"); b.innerHTML = `<b>${t}</b><small>${s}</small>`;
      b.addEventListener("click", () => { m.hidden = true; doExport(id); });
      m.appendChild(b);
    });
  }
  async function doExport(kind) {
    editor.sel = null; editor.dirty = true;
    $("busy").hidden = false; $("busyText").textContent = kind.startsWith("pdf") ? "Собираю PDF для печати…" : "Готовлю файл…";
    await new Promise((r) => setTimeout(r, 60));
    try {
      const E = P5.exporter, o = ov();
      if (kind === "pdfA4") await E.pdf(scene, o, "A4");
      else if (kind === "pdfA3") await E.pdf(scene, o, "A3");
      else if (kind === "sheet3same") await E.sheetPdf([0, 1, 2].map(() => ({ scene, ov: o })), "pyaterka-3-na-liste");
      else if (kind === "sheet3mix") await E.sheetPdf(sheetVariants(), "pyaterka-3-raznyh");
      else if (kind === "meme6" || kind === "meme12") { const n = kind === "meme6" ? 6 : 12; await E.sheetPdf(Array.from({ length: n }, () => ({ scene, ov: o })), `pyaterka-memy-${n}-na-liste`); }
      else if (kind === "sheet9") await E.sheetPdf(Array.from({ length: 9 }, () => ({ scene, ov: o })), "pyaterka-9-na-liste");
      else if (kind === "png") await E.png(scene, o, 2480, "pyaterka-plakat");
      else if (kind === "sticker") await E.sticker(scene, o);
      else if (kind === "stickerBig") { const big = E.renderTo(scene, o, 1024, { transparent: true }); const out = P5.outline(big, 22 * 1.024); await new Promise((r) => out.toBlob((b) => r(E.save(b, "pyaterka-sticker-1024.png")))); }
      else if (kind === "meme") await E.png(scene, o, 1080, "pyaterka-mem");
      else if (kind === "memeJpg") { const c = E.renderTo(scene, o, 1080); await new Promise((r) => c.toBlob((b) => r(E.save(b, "pyaterka-mem.jpg")), "image/jpeg", 0.92)); }
      toast((window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform()) || /Electron/.test(navigator.userAgent) || window.Neutralino ? "Готово!" : "Готово! Файл в «Загрузках».");
    } catch (e) { console.error(e); toast("Не получилось сохранить: " + e.message); }
    $("busy").hidden = true;
  }

  // текущий плакат + 2 других варианта (другая раскладка; фраза и фото — если ты их не выбирал сам)
  function sheetVariants() {
    const out = [{ scene, ov: ov() }];
    const pool = DICE_PIDS.poster, pi = Math.max(0, pool.indexOf(S.pid));
    for (const k of [1, 2]) {
      const T = { ...S, headIdx: S.headIdx + (S.headEdited ? 0 : k), pid: S.pidPicked ? S.pid : pool[(pi + k) % pool.length] };
      if (!T.headEdited) { const hl = P5.phraseList(T, "head"); T.head = hl[T.headIdx % hl.length]; }
      T.seed = bestSeed(S.seed + k * 97, 12, T);
      out.push({ scene: P5.layout(T), ov: {} });
    }
    return out;
  }
  P5.sheetVariants = sheetVariants;

  // проверяем, что свой / чёткий QR реально читается (тем же декодером, что и камеры)
  let qrT = 0;
  function qrCheckSoon() { clearTimeout(qrT); qrT = setTimeout(qrCheck, 300); }
  function qrCheck() {
    if (S.qr.mode === "orig" || !window.jsQR || S.format !== "poster") return;
    const url = S.qr.mode === "custom" ? S.qr.url : P5.DEFAULT_QR_URL;
    if (!url) { $("qrTip").textContent = "Вставь ссылку — QR соберётся сам."; return; }
    const sc = { W: 240, H: 240, els: [{ id: "bg", type: "fill", x: 120, y: 120, w: 240, h: 240, d: { color: "#fff" } },
      { id: "qr", type: "qr", x: 120, y: 120, w: 200, h: 200, d: { mode: "custom", url, ink: "#111", badge: true, pad: 12, lw: 0 } }] };
    let r = null;
    try {
      P5.qrMatrix(url);
      const c = P5.canvas(360, 360), x = c.getContext("2d", { willReadFrequently: true });
      P5.render(x, sc, { scale: 1.5 });
      r = window.jsQR(x.getImageData(0, 0, 360, 360).data, 360, 360);
    } catch (e) { r = null; }
    const ok = r && r.data === url;
    $("qrTip").textContent = ok
      ? `✓ Проверено: QR читается и ведёт на ${url.length > 42 ? url.slice(0, 40) + "…" : url}`
      : "⚠ Этот QR плохо читается — попробуй ссылку покороче.";
    $("qrTip").classList.toggle("warn", !ok);
  }

  // ---------- редактирование мелких надписей по двойному клику ----------
  const EDIT = {
    tag: () => (S.style === "boss" ? [["round", "Строка сверху"]] : [["event", "Слева"], ["vote", "Справа"]]),
    foot: () => [["foot", "Подпись внизу", true]],
    qr: () => (S.style === "news" ? [["qrBox", "Подпись у QR"]] : S.style === "fan" ? [["qr", "Подпись под QR"]] : null),
    qrnote: () => [["qrNote", "Подпись у QR"]],
    stamp: () => [["stamp", "Штамп"]],
    hud: () => [["boss", "Метка"], ["name", "Имя"], ["lvl", "Уровень"]],
    name: () => [["name", "Имя"]],
    stats: () => [["stats", "Характеристики (каждая с новой строки)", true]],
    dialog: () => (S.format === "meme" ? [["cont", "Кнопка"]] : scene.els.some((x) => x.id === "dialog" && x.d.opts && x.d.opts.length === 1)
      ? [["cont2", "Вопрос"], ["opts", "Кнопки (каждая с новой строки)", true]] : [["$sub", "Реплика"], ["opts", "Кнопки (каждая с новой строки)", true]]),
    title: () => [["wanted", "Заголовок"]],
    sub2: () => (S.style === "wanted" ? [["wantedSub", "Подзаголовок"]] : [["$sub", "Подзаголовок"]]),
    rlabel: () => [["rewardLbl", "Подпись"]],
    reward: () => [["$sub", "Награда"]],
    mast: () => [["mast", "Название газеты"]],
    dateline: () => [["dateline", "Строка под шапкой"]],
    badge: () => [["urgent", "Значок"]],
  };
  let popFields = null;
  function openPop(el, e) {
    const f = EDIT[el.id] && EDIT[el.id]();
    if (!f) { if (["head", "label", "words", "band", "note"].includes(el.id) || el.type === "text") editor.hooks.focusText(el.id); return; }
    const ui = P5.UI[S.lang], box = $("popFields"); box.innerHTML = ""; popFields = f;
    f.forEach(([key, label, multi]) => {
      const cur = key === "$sub" ? S.sub : S.texts && S.texts[key] != null ? S.texts[key] : Array.isArray(ui[key]) ? ui[key].join("\n") : ui[key];
      const lb = document.createElement("label"); lb.textContent = label;
      const inp = document.createElement(multi ? "textarea" : "input"); inp.value = cur || ""; inp.dataset.key = key; if (multi) inp.rows = 2;
      inp.addEventListener("keydown", (ev) => { if (ev.key === "Enter" && !multi) { ev.preventDefault(); popSave(); } if (ev.key === "Escape") $("pop").hidden = true; });
      box.append(lb, inp);
    });
    const p = $("pop"); p.hidden = false;
    const x = Math.min(window.innerWidth - p.offsetWidth - 12, Math.max(12, e.clientX - 150)), y = Math.min(window.innerHeight - p.offsetHeight - 12, e.clientY + 14);
    p.style.left = x + "px"; p.style.top = y + "px";
    const first = box.querySelector("input,textarea"); first.focus(); first.select();
  }
  function popSave() {
    const patch = { texts: { ...(S.texts || {}) } };
    $$("#popFields [data-key]").forEach((inp) => {
      const k = inp.dataset.key, v = inp.value.trim();
      const def = P5.UI[S.lang][k], defS = Array.isArray(def) ? def.join(String.fromCharCode(10)) : def;
      if (k === "$sub") { if (v !== S.sub) { patch.sub = v; patch.subEdited = v.length > 0; } } else if (v && v !== defS) patch.texts[k] = v; else delete patch.texts[k];
    });
    $("pop").hidden = true; set(patch);
  }
  function popReset() {
    const patch = { texts: { ...(S.texts || {}) } };
    (popFields || []).forEach(([k]) => { if (k === "$sub") patch.subEdited = false; else delete patch.texts[k]; });
    $("pop").hidden = true; set(patch);
  }

  // ---------- очередь на печать ----------
  const QUEUE = []; let qMode = 1;
  const clone = (o) => JSON.parse(JSON.stringify(o));
  function addToQueue() {
    const snapS = clone(S), snapOv = clone(ov());
    const c = P5.exporter.renderTo(P5.layout(snapS), snapOv, 180);
    QUEUE.push({ id: "q" + Date.now().toString(36) + QUEUE.length, S: snapS, ov: snapOv, format: S.format, thumb: c.toDataURL("image/png") });
    buildQueue();
    const b = $("btnQueue"); b.classList.remove("pulse"); void b.offsetWidth; b.classList.add("pulse");
    toast(`В очереди: ${QUEUE.length}`);
  }
  function queuePages() {
    const P = QUEUE.filter((q) => q.format === "poster").length, M = QUEUE.length - P;
    if (qMode === 1) return QUEUE.length;
    return Math.ceil(P / (qMode === 3 ? 3 : 9)) + Math.ceil(M / (qMode === 3 ? 6 : 12));
  }
  const pagesWord = (n) => (n % 10 === 1 && n % 100 !== 11 ? "лист" : [2, 3, 4].includes(n % 10) && ![12, 13, 14].includes(n % 100) ? "листа" : "листов");
  function buildQueue() {
    $("queueCard").hidden = QUEUE.length === 0;
    const box = $("queueList"); box.innerHTML = "";
    QUEUE.forEach((q, i) => {
      const d = document.createElement("div"); d.className = "qi"; d.title = "Вернуть в редактор";
      d.innerHTML = `<img src="${q.thumb}" alt=""><span>${i + 1}</span><i title="Убрать">×</i>`;
      d.querySelector("i").addEventListener("click", (e) => { e.stopPropagation(); QUEUE.splice(QUEUE.indexOf(q), 1); buildQueue(); });
      d.addEventListener("click", () => {
        beginChange(); Object.assign(S, clone(q.S)); OV[`${S.format}:${S.style}`] = clone(q.ov); commit();
        P5.setCardFit(!!S.cardFull); syncUI(); rebuild(); toast("Дизайн вернулся в редактор");
      });
      box.appendChild(d);
    });
    $$("#qMode button").forEach((b) => b.classList.toggle("on", +b.dataset.q === qMode));
    const n = queuePages();
    $("qExport").textContent = `Скачать одним PDF · ${n} ${pagesWord(n)}`;
  }
  async function exportQueue() {
    if (!QUEUE.length) return;
    editor.sel = null;
    $("busy").hidden = false;
    const E = P5.exporter, fit0 = !!S.cardFull, pages = [];
    const sceneOf = (q) => { P5.setCardFit(!!q.S.cardFull); return { scene: P5.layout(q.S), ov: q.ov }; };
    if (qMode === 1) {
      for (const q of QUEUE) pages.push(() => { const it = sceneOf(q); return q.format === "poster" ? E.renderTo(it.scene, it.ov, 2480) : E.memePage(it.scene, it.ov); });
    } else {
      for (const [fmt, per] of [["poster", qMode === 3 ? 3 : 9], ["meme", qMode === 3 ? 6 : 12]]) {
        const list = QUEUE.filter((q) => q.format === fmt);
        for (let i = 0; i < list.length; i += per) { const chunk = list.slice(i, i + per); pages.push(() => E.sheetCanvas(chunk.map(sceneOf))); }
      }
    }
    try {
      await E.multiPdf(pages, `pyaterka-ochered-${QUEUE.length}`, (i, n) => { $("busyText").textContent = `Собираю PDF: лист ${i + 1} из ${n}…`; });
      toast((window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform()) || /Electron/.test(navigator.userAgent) || window.Neutralino ? "Готово!" : "Готово! Файл в «Загрузках».");
    } catch (e) { console.error(e); toast("Не получилось сохранить: " + e.message); }
    P5.setCardFit(fit0); rebuild();
    $("busy").hidden = true;
  }
  P5.queue = { list: QUEUE, add: addToQueue, pages: queuePages, exportQueue, setMode: (m) => { qMode = m; buildQueue(); } };

  let toastT = 0;
  function toast(t) { const el = $("toast"); el.textContent = t; el.classList.add("show"); clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove("show"), 2600); }

  // ---------- запоминаем настройки ----------
  function save() { try { localStorage.setItem("p5state", JSON.stringify({ ...S, extras: [], pid: P5.photos[S.pid] && P5.photos[S.pid].user ? null : S.pid })); } catch (e) { /* приватный режим — не страшно */ } }
  function load() {
    try {
      const s = JSON.parse(localStorage.getItem("p5state") || "null");
      if (s && typeof s === "object") { Object.assign(S, s, { qr: { ...S.qr, ...(s.qr || {}) }, fonts: { ...S.fonts, ...(s.fonts || {}) }, extras: [] }); delete S.font; if (!P5.FORMATS[S.format] || S.format === "sticker") S.format = "poster"; if (!S.pid || !P5.photos[S.pid]) { S.pid = DEFAULT_PID[S.format][S.style]; S.pidPicked = false; } }
    } catch (e) { /* ничего */ }
  }

  // ---------- запуск ----------
  async function start() {
    await P5.init();
    load();
    editor = new P5.Editor($("cv"), $("canvasWrap"), {
      getOv: ov, beginChange, changed: commit, cancelChange, undo,
      remove: (ids) => {
        beginChange();
        const o = ov();
        for (const id of ids) {
          if ((S.extras || []).some((x) => x.id === id)) S.extras = S.extras.filter((x) => x.id !== id);
          else (o[id] = o[id] || {}).hidden = true;
        }
        commit(); rebuild();
      },
      focusText: (id) => { const f = ["band", "note", "dialog"].includes(id) && subUsed() ? $("tSub") : $("tHead"); f.focus(); f.select(); },
      dbl: (el, e) => openPop(el, e),
    });
    buildPhotos();

    const autoPid = (format, style) => (S.pidPicked && P5.photos[S.pid] ? {} : { pid: DEFAULT_PID[format][style] });
    $$("#formats button").forEach((b) => b.addEventListener("click", () => { editor.sel = null; set({ format: b.dataset.format, headEdited: false, ...autoPid(b.dataset.format, S.style) }); }));
    $$("#styles button").forEach((b) => b.addEventListener("click", () => { editor.sel = null; set({ style: b.dataset.style, ...autoPid(S.format, b.dataset.style) }); }));
    $$("#fxChips button").forEach((b) => b.addEventListener("click", () => set({ fx: b.dataset.fx })));
    $$("#langChips button").forEach((b) => b.addEventListener("click", () => set({ lang: b.dataset.lang, headEdited: false, subEdited: false })));
    $$("#colorSeg button").forEach((b) => b.addEventListener("click", () => set({ color: b.dataset.c })));
    $$("#qrSeg button").forEach((b) => b.addEventListener("click", () => { set({ qr: { ...S.qr, mode: b.dataset.q } }); if (b.dataset.q === "custom") setTimeout(() => $("qrUrl").focus(), 30); }));
    $$("#fitChips button").forEach((b) => b.addEventListener("click", () => { P5.setCardFit(b.dataset.fit === "full"); set({ cardFull: b.dataset.fit === "full" }); }));
    $$("#numChips button").forEach((b) => b.addEventListener("click", () => set({ num: b.dataset.num })));
    let numT = 0;
    $("numInput").addEventListener("input", (e) => { clearTimeout(numT); const v = e.target.value.trim().slice(0, 3); numT = setTimeout(() => set({ num: v || "5" }), 250); });
    $("popOk").addEventListener("click", popSave);
    $("popReset").addEventListener("click", popReset);
    document.addEventListener("pointerdown", (e) => { if (!$("pop").hidden && !e.target.closest("#pop") && e.target.id !== "cv") $("pop").hidden = true; });
    $("diceColor").addEventListener("click", () => {
      const n = P5.PALETTES[S.style].color.length;
      let i; do i = Math.floor(Math.random() * n); while (n > 1 && S.color === "color" && !S.custom && i === S.acc);
      set({ color: "color", acc: i, custom: null });
    });
    $("qrShow").addEventListener("change", (e) => set({ showQR: e.target.checked }));
    let urlT = 0;
    $("qrUrl").addEventListener("input", (e) => { clearTimeout(urlT); urlT = setTimeout(() => set({ qr: { ...S.qr, url: e.target.value.trim() } }), 250); });

    const textInput = (el, key, editedKey) => {
      let raf = 0;
      el.addEventListener("focus", beginChange);
      el.addEventListener("blur", commit);
      el.addEventListener("input", () => {
        S[key] = el.value; S[editedKey] = el.value.trim().length > 0;
        cancelAnimationFrame(raf); raf = requestAnimationFrame(() => { scene = P5.layout(S); editor.setScene(scene); thumbsSoon(); });
      });
    };
    textInput($("tHead"), "head", "headEdited");
    textInput($("tSub"), "sub", "subEdited");
    const nextIdx = (cur, len) => { if (len < 2) return 0; let n; do n = Math.floor(Math.random() * len); while (n === cur % len); return n; };
    $("diceHead").addEventListener("click", () => set({ headIdx: nextIdx(S.headIdx, P5.phraseList(S, "head").length), headEdited: false }));
    $("diceSub").addEventListener("click", () => set({ subIdx: nextIdx(S.subIdx, P5.phraseList(S, "sub").length), subEdited: false }));

    $("btnDice").addEventListener("click", () => {
      const b = $("btnDice"); b.classList.remove("rolling"); void b.offsetWidth; b.classList.add("rolling");
      beginChange();
      S.seed = 1 + Math.floor(Math.random() * 99999);
      if (!S.pidPicked) { const pool = DICE_PIDS[S.format].filter((p) => p !== S.pid); S.pid = pool[Math.floor(Math.random() * pool.length)]; S.pidPicked = false; }
      if (!S.headEdited) S.headIdx = nextIdx(S.headIdx, P5.phraseList(S, "head").length);
      OV[sig()] = {}; editor.sel = null;
      ensureText(); S.seed = bestSeed(S.seed, 12);
      commit(); syncUI(); rebuild();
    });
    $("btnUndo").addEventListener("click", undo);
    $("btnQueue").addEventListener("click", addToQueue);
    $("qExport").addEventListener("click", exportQueue);
    $("qClear").addEventListener("click", () => { QUEUE.length = 0; buildQueue(); });
    $$("#qMode button").forEach((b) => b.addEventListener("click", () => { qMode = +b.dataset.q; buildQueue(); }));
    $("btnReset").addEventListener("click", () => { beginChange(); OV[sig()] = {}; commit(); editor.sel = null; editor.dirty = true; toast("Всё вернулось на свои места"); });
    $("btnExport").addEventListener("click", (e) => { e.stopPropagation(); $("exportMenu").hidden = !$("exportMenu").hidden; });
    document.addEventListener("click", (e) => { if (!e.target.closest(".exportWrap")) $("exportMenu").hidden = true; });

    $("file").addEventListener("change", async (e) => {
      const f = e.target.files[0]; e.target.value = "";
      if (!f) return;
      P5.openCutout(f, (canvas, kind) => {
        const n = Object.values(P5.photos).filter((p) => p.user).length + 1;
        const id = "user" + Date.now();
        P5.addPhoto(id, canvas, kind, n > 1 ? `Моё ${n}` : "Моё фото", true);
        buildPhotos();
        set({ pid: id, pidPicked: true });
        toast("Фото добавлено!");
      });
    });
    P5.initCutoutUI();

    // картинки-наклейки: Ctrl+V, перетаскивание на холст, кнопка «＋ Картинка»
    const addExtra = async (blob) => {
      let img;
      try { img = await createImageBitmap(blob); } catch (e) { toast("Это не картинка"); return; }
      const max = 1600, k = Math.min(1, max / Math.max(img.width, img.height));
      const c = P5.canvas(img.width * k, img.height * k); c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
      const id = "x" + Date.now().toString(36);
      P5.extraImgs[id] = c;
      const F = P5.FORMATS[S.format], fit = Math.min((F.W * 0.42) / c.width, (F.H * 0.32) / c.height);
      beginChange();
      S.extras = [...(S.extras || []), { id, f: S.format, x: F.W / 2, y: F.H / 2, w: c.width * fit, h: c.height * fit }];
      commit(); rebuild();
      editor.sel = id;
      toast(S.color === "bw" ? "Картинка вставлена (в ч/б режиме она серая)" : "Картинка вставлена — тащи куда нужно");
    };
    P5.addExtra = addExtra;
    window.addEventListener("paste", (e) => {
      const t = document.activeElement && document.activeElement.tagName;
      if (t === "INPUT" || t === "TEXTAREA") return;
      const item = [...(e.clipboardData ? e.clipboardData.items : [])].find((it) => it.type.startsWith("image/"));
      if (item) { e.preventDefault(); addExtra(item.getAsFile()); }
      else toast("В буфере нет картинки — скопируй PNG и нажми Ctrl+V");
    });
    $("canvasWrap").addEventListener("dragover", (e) => e.preventDefault());
    $("canvasWrap").addEventListener("drop", (e) => { e.preventDefault(); const f = [...e.dataTransfer.files].find((x) => x.type.startsWith("image/")); if (f) addExtra(f); });
    $("fileExtra").addEventListener("change", (e) => { const f = e.target.files[0]; e.target.value = ""; if (f) addExtra(f); });

    P5.setCardFit(!!S.cardFull);
    syncUI(); rebuild();
    $("boot").hidden = true;
    window.addEventListener("resize", thumbsSoon);
  }
  start().catch((e) => { console.error(e); $("boot").querySelector("span").textContent = "Ошибка загрузки: " + e.message; });
  P5.app = { S, OV, get scene() { return scene; }, get editor() { return editor; } };
})();
