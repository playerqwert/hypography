/* Типографика: подбор размера, перенос строк без висячих предлогов,
   интерлиньяж по реальным контурам букв (Ё, É, Ã никогда не налезают и не обрезаются). */
(() => {
  const P5 = window.P5;
  const T = (P5.T = {});
  const mctx = P5.canvas(8, 8).getContext("2d");
  const NB = " ";

  T.font = (fam, wt, size) => `${wt} ${size}px "${fam}"`;
  const mcache = new Map();
  // метрики строки на 100px
  T.m100 = (text, fam, wt) => {
    const k = fam + "|" + wt + "|" + text;
    if (mcache.has(k)) return mcache.get(k);
    mctx.font = T.font(fam, wt, 100);
    const m = mctx.measureText(text);
    const r = { l: m.actualBoundingBoxLeft, r: m.actualBoundingBoxRight, asc: m.actualBoundingBoxAscent, desc: m.actualBoundingBoxDescent, adv: m.width };
    r.w = r.l + r.r;
    if (mcache.size > 4000) mcache.clear();
    mcache.set(k, r);
    return r;
  };
  T.m = (text, fam, wt, size) => {
    const a = T.m100(text, fam, wt), k = size / 100;
    return { l: a.l * k, r: a.r * k, asc: a.asc * k, desc: a.desc * k, adv: a.adv * k, w: a.w * k };
  };
  T.upper = (s, lang) => s.toLocaleUpperCase(lang === "pt" ? "pt-PT" : lang === "en" ? "en-US" : "ru-RU");

  // короткие слова приклеиваются к следующему, тире — к предыдущему
  const SHORT = new Set(("в во на за и а но о об от до по к ко с со у не ни из без для что как же ли бы то " +
    "the a an of to in on at by and or no not is it my your " +
    "o a os as e é um uma no na nos nas do da dos das de em ao à se te me tu eu já").split(" "));
  T.tokens = (str) => {
    const raw = String(str || "").replace(/\s+/g, " ").trim().split(" ").filter(Boolean);
    const a = [];
    for (const w of raw) {
      if (/^[—–-]+$/.test(w) && a.length) { a[a.length - 1] += NB + w; continue; }
      a.push(w);
    }
    const out = []; let carry = "";
    for (let i = 0; i < a.length; i++) {
      const bare = a[i].toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");
      if (i < a.length - 1 && (SHORT.has(bare) || (bare.length <= 1 && /\p{L}/u.test(bare)))) { carry = carry ? carry + NB + a[i] : a[i]; continue; }
      out.push(carry ? carry + NB + a[i] : a[i]); carry = "";
    }
    if (carry) { if (out.length) out[out.length - 1] += NB + carry; else out.push(carry); }
    return out;
  };

  function* partitions(tokens, k) {
    const n = tokens.length;
    if (k === 1) { yield [tokens.join(" ")]; return; }
    for (let i = 1; i <= n - k + 1; i++) {
      const head = tokens.slice(0, i).join(" ");
      for (const rest of partitions(tokens.slice(i), k - 1)) yield [head, ...rest];
    }
  }
  const split = (text) => String(text || "").split(/\n/).map((s) => s.trim()).filter(Boolean);

  function stack(lines, sizes, fam, wt, gapK) {
    let y = 0; const out = [];
    lines.forEach((t, i) => {
      const m = T.m(t, fam, wt, sizes[i]);
      if (i === 0) y = m.asc;
      else { const p = out[i - 1]; y = p.base + p.m.desc + sizes[i] * gapK + m.asc; }
      out.push({ t, size: sizes[i], base: y, m });
    });
    const h = out.length ? out[out.length - 1].base + out[out.length - 1].m.desc : 0;
    return { rows: out, h };
  }

  // «баннерная» вёрстка: каждая строка растянута на всю ширину
  T.fitStack = (text, o) => {
    const { fam, wt, W, H } = o, maxLines = o.maxLines || 4, maxSize = o.maxSize || 400, gapK = o.gap ?? 0.075;
    const up = o.upper === false ? (s) => s : (s) => T.upper(s, o.lang);
    const forced = split(text).map(up);
    let cands = [];
    if (forced.length > 1) cands = [forced];
    else {
      const toks = T.tokens(forced[0] || " ");
      for (let k = 1; k <= Math.min(maxLines, toks.length); k++) for (const p of partitions(toks, k)) { cands.push(p); if (cands.length > 400) break; }
      if (!cands.length) cands = [[" "]];
    }
    let best = null;
    for (const lines of cands) {
      let sizes = lines.map((t) => Math.min(maxSize, (100 * W) / Math.max(1, T.m100(t, fam, wt).w)));
      let s = stack(lines, sizes, fam, wt, gapK), f = 1;
      if (s.h > H) { f = H / s.h; sizes = sizes.map((v) => v * f); s = stack(lines, sizes, fam, wt, gapK); }
      const mn = Math.min(...sizes), mx = Math.max(...sizes), ratio = mx / mn;
      let score = mn * (0.55 + 0.45 * f) * (1 - 0.1 * (ratio - 1));
      if (ratio > 2.7) score *= 0.55;
      for (const t of lines) if (t.replace(/[^\p{L}\p{N}]/gu, "").length <= 2 && lines.length > 1) score *= 0.6;
      if (!best || score > best.score) best = { score, lines, sizes, s };
    }
    const rows = best.s.rows.map((r) => ({ t: r.t, size: r.size, fam, wt, base: r.base, x: r.m.l, w: r.m.w }));
    const w = Math.max(...rows.map((r) => r.w));
    rows.forEach((r) => { if (o.align === "center") r.x += (w - r.w) / 2; else if (o.align === "right") r.x += w - r.w; });
    return { rows, w, h: best.s.h };
  };

  // одинаковый размер для всех строк, ровные переносы
  T.wrap = (text, o) => {
    const { fam, wt, W, H } = o, maxLines = o.maxLines || 3, gapK = o.gap ?? 0.18;
    const up = o.upper ? (s) => T.upper(s, o.lang) : (s) => s;
    const forced = split(text).map(up);
    const lay = (size) => {
      if (forced.length > 1) return forced;
      const toks = T.tokens(forced[0] || " ");
      const lines = []; let cur = "";
      for (const tk of toks) {
        const tryL = cur ? cur + " " + tk : tk;
        if (!cur || T.m(tryL, fam, wt, size).w <= W) cur = tryL;
        else { lines.push(cur); cur = tk; }
      }
      if (cur) lines.push(cur);
      return lines;
    };
    const ok = (size) => {
      const lines = lay(size);
      if (lines.length > maxLines && forced.length <= 1) return null;
      if (lines.some((l) => T.m(l, fam, wt, size).w > W)) return null;
      const s = stack(lines, lines.map(() => size), fam, wt, gapK);
      return s.h <= H ? lines : null;
    };
    let lo = o.minSize || 8, hi = o.maxSize || 200, lines = ok(lo) || lay(lo);
    for (let it = 0; it < 18; it++) { const mid = (lo + hi) / 2, r = ok(mid); if (r) { lo = mid; lines = r; } else hi = mid; }
    const size = lo;
    // выравниваем переносы: минимизируем самую длинную строку
    if (forced.length <= 1 && lines.length > 1) {
      const toks = T.tokens(forced[0]);
      let bestL = lines, bestW = Math.max(...lines.map((l) => T.m(l, fam, wt, size).w));
      for (const p of partitions(toks, lines.length)) {
        const mw = Math.max(...p.map((l) => T.m(l, fam, wt, size).w));
        if (mw < bestW - 0.5) { bestW = mw; bestL = p; }
      }
      lines = bestL;
    }
    const s = stack(lines, lines.map(() => size), fam, wt, gapK);
    const rows = s.rows.map((r) => ({ t: r.t, size, fam, wt, base: r.base, x: r.m.l, w: r.m.w }));
    const w = o.align ? W : Math.max(...rows.map((r) => r.w));
    rows.forEach((r) => { if (o.align === "center") r.x += (w - r.w) / 2; else if (o.align === "right") r.x += w - r.w; });
    return { rows, w, h: s.h, size };
  };

  // слова в плашках (ксерокс): строки разной ширины, размер подбирается
  T.flowWords = (text, o) => {
    const { fam, wt, rowW, H, lang } = o, gap = o.gap || 14;
    const toks = split(text).length > 1 ? split(text).map((s) => T.upper(s, lang)) : T.tokens(T.upper(text || " ", lang));
    const lay = (size) => {
      const padX = size * 0.16, padT = size * 0.12, padB = size * 0.1;
      const rows = []; let row = [], x = 0, ri = 0;
      const width = (i) => rowW[Math.min(i, rowW.length - 1)];
      for (const t of toks) {
        const m = T.m(t, fam, wt, size), bw = m.w + padX * 2;
        if (row.length && x + gap + bw > width(ri)) { rows.push(row); row = []; x = 0; ri++; }
        if (bw > width(ri)) return null;
        row.push({ t, m, bw, x: row.length ? x + gap : 0 });
        x = row[row.length - 1].x + bw;
      }
      if (row.length) rows.push(row);
      let y = 0; const items = [];
      rows.forEach((r) => {
        const asc = Math.max(...r.map((it) => it.m.asc)), desc = Math.max(size * 0.02, ...r.map((it) => it.m.desc));
        const bh = asc + desc + padT + padB;
        r.forEach((it) => items.push({ t: it.t, size, fam, wt, x: it.x, y, w: it.bw, h: bh, tx: padX + it.m.l, base: padT + asc }));
        y += bh + gap;
      });
      const h = y - gap;
      return h <= H ? { items, h, rows: rows.length } : null;
    };
    let lo = o.minSize || 20, hi = o.maxSize || 180, best = lay(lo);
    for (let it = 0; it < 16; it++) { const mid = (lo + hi) / 2, r = lay(mid); if (r) { lo = mid; best = r; } else hi = mid; }
    if (!best) best = { items: [], h: 0, rows: 0 };
    return best;
  };
})();
