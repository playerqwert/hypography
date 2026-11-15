/* Пятёрка · фабрика плакатов — общие утилиты и загрузка ассетов */
window.P5 = window.P5 || {};
(() => {
  const P5 = window.P5;

  // детерминированный генератор случайных чисел (одинаковый seed → одинаковый плакат)
  P5.rng = (seed) => {
    let a = (seed >>> 0) ^ 0x9e3779b9;
    return () => {
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };
  P5.pick = (r, arr) => arr[Math.floor(r() * arr.length) % arr.length];
  P5.between = (r, a, b) => a + (b - a) * r();
  P5.clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  P5.canvas = (w, h) => {
    const c = document.createElement("canvas");
    c.width = Math.max(1, Math.round(w));
    c.height = Math.max(1, Math.round(h));
    return c;
  };
  P5.loadImage = (src) => new Promise((res, rej) => {
    const im = new Image();
    im.onload = () => res(im);
    im.onerror = rej;
    im.src = src;
  });

  // форматы в «единицах макета»; экспорт просто масштабирует
  P5.FORMATS = {
    poster: { W: 840, H: 1188, name: "Плакат" },
    meme: { W: 1000, H: 1000, name: "Мем" },
    sticker: { W: 1000, H: 1000, name: "Стикер" },
  };

  // ---------- цвета ----------
  // контраст по APCA (новый стандарт W3C): лучше старой формулы угадывает, когда на насыщенном фоне нужен белый текст
  P5.Y = (hex) => {
    const m = hex.replace("#", ""), v = (i) => parseInt(m.substr(i, 2), 16) / 255;
    return 0.2126729 * v(0) ** 2.4 + 0.7151522 * v(2) ** 2.4 + 0.072175 * v(4) ** 2.4;
  };
  P5.apca = (txt, bg) => {
    const cl = (y) => (y >= 0.022 ? y : y + (0.022 - y) ** 1.414);
    const yt = cl(P5.Y(txt)), yb = cl(P5.Y(bg));
    if (yb > yt) { const s = (yb ** 0.56 - yt ** 0.57) * 1.14; return s < 0.1 ? 0 : (s - 0.027) * 100; }
    const s = (yb ** 0.65 - yt ** 0.62) * 1.14; return s > -0.1 ? 0 : (s + 0.027) * 100;
  };
  // какой цвет текста лучше читается на фоне
  P5.bestOn = (bg, options = ["#111111", "#ffffff"]) => options.reduce((a, b) => (Math.abs(P5.apca(b, bg)) > Math.abs(P5.apca(a, bg)) ? b : a));
  P5.isDark = (bg) => P5.Y(bg) < 0.1;

  // цветной режим экономит краску: фон всегда белый, цвет идёт только в акценты
  const strongOnWhite = (c) => Math.abs(P5.apca(c, "#ffffff")) >= 55;
  P5.makePalette = (style, c) => {
    const onWhite = strongOnWhite(c) ? c : "#111111";
    if (style === "fan") return { paper: "#ffffff", text: "#111111", ink: "#111111", five: c, acc: c, accInk: P5.bestOn(c), sheet: "#ffffff", chip: c };
    if (style === "zine") return { paper: "#fbfaf7", text: "#111111", ink: "#111111", acc: c, accInk: P5.bestOn(c), sheet: "#ffffff", stamp: onWhite, chip: c };
    if (style === "wanted" || style === "news") return { paper: "#ffffff", text: "#111111", ink: "#111111", acc: c, accInk: P5.bestOn(c), title: onWhite, chip: c };
    return { paper: "#ffffff", text: "#111111", ink: onWhite, head: onWhite, hp: c, label: P5.bestOn("#111111", [c, "#ffffff"]), deco: c, panel: "#ffffff", chip: c };
  };
  const BW = {
    fan: { paper: "#ffffff", text: "#111111", ink: "#111111", five: "#111111", acc: "#111111", accInk: "#ffffff", sheet: "#ffffff" },
    zine: { paper: "#fbfaf7", text: "#111111", ink: "#111111", acc: "#111111", accInk: "#ffffff", sheet: "#ffffff", stamp: "#111111" },
    boss: { paper: "#ffffff", text: "#111111", ink: "#111111", head: "#111111", hp: "#111111", label: "#ffffff", deco: "#111111", panel: "#ffffff" },
    wanted: { paper: "#ffffff", text: "#111111", ink: "#111111", acc: "#111111", accInk: "#ffffff", title: "#111111" },
    news: { paper: "#ffffff", text: "#111111", ink: "#111111", acc: "#111111", accInk: "#ffffff", title: "#111111" },
  };
  const PRESETS = {
    fan: ["#e8001c", "#ff5b1f", "#1f3cff", "#ff2e88", "#00a65a", "#8f5bff", "#ffc400", "#00b3d6", "#d7ff1f"],
    zine: ["#ff3d9a", "#1f8fff", "#ffd400", "#ff3b30", "#19c37d", "#ff7a1a", "#8f5bff", "#00d5e0"],
    boss: ["#2a3cff", "#e8001c", "#ff2e88", "#00a65a", "#6b2bff", "#ff7a1a", "#008c8c", "#1f8fff"],
    wanted: ["#b3261e", "#8a4b1d", "#1f3cff", "#00805a", "#ff5b1f", "#6b2bff", "#111111"],
    news: ["#e8001c", "#1f3cff", "#ff2e88", "#00a65a", "#ff7a1a", "#ffc400", "#8f5bff"],
  };
  P5.PALETTES = {};
  for (const st of ["fan", "zine", "boss", "wanted", "news"]) P5.PALETTES[st] = { bw: BW[st], color: PRESETS[st].map((k) => P5.makePalette(st, k)) };
  // свой цвет: для «Фан-сектора» и «Босс-файта» это фон, для «Ксерокса» — акцент
  P5.customPalette = (style, hex) => P5.makePalette(style, hex);
  P5.palette = (S) => {
    const p = P5.PALETTES[S.style];
    if (S.color === "bw") return p.bw;
    if (S.custom) return P5.customPalette(S.style, S.custom);
    return p.color[S.acc % p.color.length];
  };

  // шрифты для заголовка (все — с кириллицей и португальскими буквами)
  P5.FONTS = [
    { id: "auto", name: "Авто", fam: null },
    { id: "Sofia", name: "Sofia", fam: "Sofia", wt: 900 },
    { id: "Dela", name: "Dela Gothic", fam: "Dela", wt: 400 },
    { id: "Unbounded", name: "Unbounded", fam: "Unbounded", wt: 900 },
    { id: "Seymour", name: "Seymour", fam: "Seymour", wt: 400 },
    { id: "Slab", name: "Slab", fam: "Slab", wt: 900 },
    { id: "Russo", name: "Russo", fam: "Russo", wt: 400 },
    { id: "RubikMono", name: "Rubik Mono", fam: "RubikMono", wt: 400 },
    { id: "PressStart", name: "Pixel", fam: "PressStart", wt: 400 },
    { id: "Handjet", name: "Handjet", fam: "Handjet", wt: 800 },
  ];
  // какие шрифты подходят какому стилю (неподходящие просто не показываем — чтобы не было «дичи»)
  P5.FONT_SETS = {
    fan: ["auto", "Dela", "Unbounded", "Seymour", "Russo", "RubikMono"],
    zine: ["auto", "Dela", "Seymour", "Unbounded", "Russo", "RubikMono"],
    boss: ["auto", "Handjet", "Russo", "RubikMono", "Sofia", "Dela"],
    wanted: ["auto", "Sofia", "Dela", "Russo", "Seymour"],
    news: ["auto", "Dela", "Unbounded", "Seymour", "Russo", "Slab"],
  };
  P5.AUTO_FONT_NAME = { fan: "Sofia", zine: "Sofia", boss: "Pixel", wanted: "Slab", news: "Sofia" };
  P5.AUTO_FONT = { fan: ["Sofia", 900], zine: ["Sofia", 900], boss: ["PressStart", 400], wanted: ["Slab", 900], news: ["Sofia", 900] };
  P5.headFont = (S, def) => {
    const id = (S.fonts && S.fonts[S.style]) || "auto";
    const f = P5.FONTS.find((x) => x.id === id);
    if (!f || !f.fam || !P5.FONT_SETS[S.style].includes(id)) return def;
    return { fam: f.fam, wt: f.wt };
  };

  // где на фото голова (для короны, подписей «это он» и т.п.) — считаем по маске
  P5.headAnchor = (img) => {
    const w = 160, h = Math.max(1, Math.round((img.height / img.width) * 160));
    const c = P5.canvas(w, h), x = c.getContext("2d", { willReadFrequently: true });
    x.drawImage(img, 0, 0, w, h);
    const d = x.getImageData(0, 0, w, h).data;
    const rowCount = (y) => { let n = 0; for (let i = 0; i < w; i++) if (d[(y * w + i) * 4 + 3] > 128) n++; return n; };
    let top = 0;
    for (let y = 0; y < h; y++) if (rowCount(y) > w * 0.03) { top = y; break; }
    let sx = 0, n = 0;
    const band = Math.max(2, Math.round(h * 0.12));
    for (let y = top; y < Math.min(h, top + band); y++)
      for (let i = 0; i < w; i++) if (d[(y * w + i) * 4 + 3] > 128) { sx += i; n++; }
    const cx = n ? sx / n : w / 2;
    const yy = Math.min(h - 1, top + Math.round(h * 0.1));
    let l = w, r = 0;
    for (let i = 0; i < w; i++) if (d[(yy * w + i) * 4 + 3] > 128) { l = Math.min(l, i); r = Math.max(r, i); }
    return { x: cx / w, y: top / h, w: r > l ? (r - l) / w : 0.3 };
  };

  P5.photos = {};
  // «Авто» (кадр) или «Целиком» для фото-карточек
  P5.setCardFit = (full) => {
    for (const ph of Object.values(P5.photos)) {
      if (!ph.crop) continue;
      ph.img = full ? ph.full : ph.crop; ph.w = ph.img.width; ph.h = ph.img.height;
      P5.fx.forget(ph.id);
    }
  };
  P5.qrImage = null;
  P5.addPhoto = (id, img, kind, name, user = false) => {
    let full = img, crop = null;
    if (kind === "card" && img.height / img.width > 1.3) {
      // узкая карточка смотрится полоской — авто-кадр 3:4 по верхней части (там лицо); оригинал храним
      const h = Math.round(img.width * 1.35), c = P5.canvas(img.width, h);
      c.getContext("2d").drawImage(img, 0, -Math.round(img.height * 0.1));
      crop = c; img = c;
    }
    P5.photos[id] = { id, img, full, crop, kind, name, user, w: img.width, h: img.height,
      head: kind === "cutout" ? P5.headAnchor(img) : { x: 0.5, y: 0, w: 0.5 } };
    return P5.photos[id];
  };

  P5.init = async () => {
    const A = P5.ASSETS;
    await Promise.all(A.fonts.map(async (f) => {
      const ff = new FontFace(f.family, `url(${f.src})`, { weight: f.weight });
      await ff.load();
      document.fonts.add(ff);
    }));
    await Promise.all(Object.entries(A.photos).map(async ([id, p]) => {
      const img = await P5.loadImage(p.src);
      P5.addPhoto(id, img, p.kind, p.name);
    }));
    P5.qrImage = await P5.loadImage(A.qr.src);
    P5.DEFAULT_QR_URL = A.qr.url;
  };
})();
