/* Редактор на холсте.
   • клик — выбрать; Shift/Ctrl+клик — добавить к выделению; рамка по пустому месту — выделить несколько
   • тащить — двигать (всё выделенное вместе); ■ уголок — размер; ○ кружок — поворот; × — убрать
   • привязки как в фотошопе: к краям и центру листа, полям, краям и центрам других элементов (Alt — без привязки)
   • стрелки — сдвиг, Delete — удалить, Ctrl+A — выделить всё, Ctrl+Z — отменить */
(() => {
  const P5 = window.P5;
  const GUIDE = "#ff2bd6", SEL = "#1f6bff";

  class Editor {
    constructor(canvas, wrap, hooks) {
      this.cv = canvas; this.wrap = wrap; this.ctx = canvas.getContext("2d");
      this.hooks = hooks;
      this.scene = null; this.sels = []; this.drag = null; this.marq = null; this.guides = []; this.dirty = true;
      this.dpr = Math.min(2.5, window.devicePixelRatio || 1);
      new ResizeObserver(() => this.resize()).observe(wrap);
      canvas.addEventListener("pointerdown", (e) => this.down(e));
      window.addEventListener("pointermove", (e) => this.move(e));
      window.addEventListener("pointerup", (e) => this.up(e));
      window.addEventListener("pointercancel", (e) => this.up(e));
      canvas.addEventListener("dblclick", (e) => {
        const h = this.hit(this.pt(e));
        if (h) this.hooks.dbl(h, e);
      });
      window.addEventListener("keydown", (e) => this.key(e));
      const loop = () => { if (this.dirty) { this.dirty = false; this.paint(); } requestAnimationFrame(loop); };
      requestAnimationFrame(loop);
    }
    get sel() { return this.sels.length === 1 ? this.sels[0] : null; }
    set sel(v) { this.sels = v ? [v] : []; this.dirty = true; }

    setScene(scene) {
      this.scene = scene;
      this.sels = this.sels.filter((id) => scene.els.find((e) => e.id === id));
      this.resize(true);
      this.dirty = true;
    }
    resize(quiet) {
      if (!this.scene) return;
      const r = this.wrap.getBoundingClientRect(), W = this.scene.W, H = this.scene.H;
      const k = Math.min(r.width / W, r.height / H);
      const cw = Math.max(50, Math.floor(W * k)), ch = Math.max(50, Math.floor(H * k));
      if (this.cssW !== cw || this.cssH !== ch) {
        this.cssW = cw; this.cssH = ch;
        this.cv.style.width = cw + "px"; this.cv.style.height = ch + "px";
        this.cv.width = Math.round(cw * this.dpr); this.cv.height = Math.round(ch * this.dpr);
      }
      this.scale = this.cv.width / W;
      this.cv.classList.toggle("transparent", !!this.scene.sticker);
      if (!quiet) this.dirty = true;
    }
    paint() {
      if (!this.scene) return;
      const ov = this.hooks.getOv();
      const fast = !!(this.drag && this.drag.mode === "scale");
      if (this.scene.sticker) {
        const off = P5.canvas(this.cv.width, this.cv.height);
        P5.render(off.getContext("2d"), this.scene, { scale: this.scale, overrides: ov, transparent: true, fast });
        const out = P5.outline(off, 22 * this.scale);
        this.ctx.clearRect(0, 0, this.cv.width, this.cv.height);
        this.ctx.drawImage(out, 0, 0);
      } else P5.render(this.ctx, this.scene, { scale: this.scale, overrides: ov, fast });
      this.drawOverlay();
    }

    // ---------- геометрия ----------
    k() { return this.cssW / this.scene.W; }
    pt(e) { const r = this.cv.getBoundingClientRect(); return { x: ((e.clientX - r.left) / r.width) * this.scene.W, y: ((e.clientY - r.top) / r.height) * this.scene.H }; }
    el(id) { return this.scene.els.find((e) => e.id === id); }
    local(el, p) {
      const b = P5.elBox(el, this.hooks.getOv());
      const a = (-b.rot * Math.PI) / 180, dx = p.x - b.x, dy = p.y - b.y;
      return { x: (dx * Math.cos(a) - dy * Math.sin(a)) / b.s, y: (dx * Math.sin(a) + dy * Math.cos(a)) / b.s, b };
    }
    bounds(el) {
      if (el.type === "photo") {
        const ph = P5.photos[el.d.pid];
        if (ph) { const card = ph.kind === "card", pad = card ? el.d.pad || 0 : 0; const r = P5.fitPhoto(ph, el.w - pad * 2, el.h - pad * 2, card ? "center" : el.d.anchor); return { x: r.x - pad, y: r.y - pad, w: r.w + pad * 2, h: r.h + pad * 2 }; }
      }
      return { x: -el.w / 2, y: -el.h / 2, w: el.w, h: el.h };
    }
    selectable(el) { return !el.locked && !P5.elBox(el, this.hooks.getOv()).hidden; }
    hit(p) {
      for (let i = this.scene.els.length - 1; i >= 0; i--) {
        const el = this.scene.els[i];
        if (!this.selectable(el)) continue;
        const l = this.local(el, p), bb = this.bounds(el), pad = 6;
        if (l.x >= bb.x - pad && l.x <= bb.x + bb.w + pad && l.y >= bb.y - pad && l.y <= bb.y + bb.h + pad) return el;
      }
      return null;
    }
    corners(el) {
      const b = P5.elBox(el, this.hooks.getOv()), bb = this.bounds(el), a = (b.rot * Math.PI) / 180;
      const tr = (x, y) => ({ x: b.x + (x * Math.cos(a) - y * Math.sin(a)) * b.s, y: b.y + (x * Math.sin(a) + y * Math.cos(a)) * b.s });
      const c = [tr(bb.x, bb.y), tr(bb.x + bb.w, bb.y), tr(bb.x + bb.w, bb.y + bb.h), tr(bb.x, bb.y + bb.h)];
      const topMid = tr(bb.x + bb.w / 2, bb.y), up = { x: Math.sin(a), y: -Math.cos(a) };
      return { c, center: { x: b.x, y: b.y }, rotH: { x: topMid.x + (up.x * 34) / this.k(), y: topMid.y + (up.y * 34) / this.k() }, scaleH: c[2], delH: c[1], b };
    }
    box(el) { const c = this.corners(el).c, xs = c.map((p) => p.x), ys = c.map((p) => p.y); return { x0: Math.min(...xs), y0: Math.min(...ys), x1: Math.max(...xs), y1: Math.max(...ys) }; }
    groupBox(ids) {
      const bs = ids.map((id) => this.el(id)).filter(Boolean).map((e) => this.box(e));
      if (!bs.length) return null;
      return { x0: Math.min(...bs.map((b) => b.x0)), y0: Math.min(...bs.map((b) => b.y0)), x1: Math.max(...bs.map((b) => b.x1)), y1: Math.max(...bs.map((b) => b.y1)) };
    }

    // ---------- привязки ----------
    snapTargets(exclude) {
      const W = this.scene.W, H = this.scene.H, M = Math.round(W * 0.052);
      const xs = [0, W / 2, W, M, W - M], ys = [0, H / 2, H, M, H - M];
      for (const el of this.scene.els) {
        if (!this.selectable(el) || exclude.includes(el.id)) continue;
        const b = this.box(el);
        xs.push(b.x0, (b.x0 + b.x1) / 2, b.x1); ys.push(b.y0, (b.y0 + b.y1) / 2, b.y1);
      }
      return { xs, ys };
    }
    snap(box, dx, dy, T) {
      const best = (cands, targets) => {
        let bd = null;
        for (const c of cands) for (const t of targets) { const d = t - c; if (Math.abs(d) <= T && (bd === null || Math.abs(d) < Math.abs(bd.d))) bd = { d, t }; }
        return bd;
      };
      const g = this.drag.targets;
      const bx = best([box.x0 + dx, (box.x0 + box.x1) / 2 + dx, box.x1 + dx], g.xs);
      const by = best([box.y0 + dy, (box.y0 + box.y1) / 2 + dy, box.y1 + dy], g.ys);
      this.guides = [];
      if (bx) { dx += bx.d; this.guides.push({ x: bx.t }); }
      if (by) { dy += by.d; this.guides.push({ y: by.t }); }
      return { dx, dy };
    }

    // ---------- рисуем выделение, рамку и направляющие ----------
    drawOverlay() {
      const x = this.ctx, s = this.scale, d = this.dpr;
      x.save(); x.setTransform(1, 0, 0, 1, 0, 0);
      for (const g of this.guides) {
        x.strokeStyle = GUIDE; x.lineWidth = 1.5 * d; x.setLineDash([]);
        x.beginPath();
        if (g.x !== undefined) { x.moveTo(g.x * s, 0); x.lineTo(g.x * s, this.cv.height); }
        else { x.moveTo(0, g.y * s); x.lineTo(this.cv.width, g.y * s); }
        x.stroke();
      }
      const ids = this.sels.filter((id) => this.el(id));
      for (const id of ids) {
        const g = this.corners(this.el(id));
        x.lineWidth = 2 * d; x.strokeStyle = SEL; x.setLineDash([6 * d, 5 * d]);
        x.beginPath(); g.c.forEach((p, i) => (i ? x.lineTo(p.x * s, p.y * s) : x.moveTo(p.x * s, p.y * s))); x.closePath(); x.stroke();
      }
      x.setLineDash([]);
      const dot = (p, r, fill) => { x.beginPath(); x.arc(p.x * s, p.y * s, r * d, 0, Math.PI * 2); x.fillStyle = fill; x.fill(); x.lineWidth = 2 * d; x.strokeStyle = SEL; x.stroke(); };
      const cross = (p) => { dot(p, 12, "#ff3b30"); x.strokeStyle = "#fff"; x.lineWidth = 2.4 * d; const cx = p.x * s, cy = p.y * s, q = 5 * d; x.beginPath(); x.moveTo(cx - q, cy - q); x.lineTo(cx + q, cy + q); x.moveTo(cx + q, cy - q); x.lineTo(cx - q, cy + q); x.stroke(); };
      if (ids.length === 1) {
        const g = this.corners(this.el(ids[0]));
        const top = { x: (g.c[0].x + g.c[1].x) / 2, y: (g.c[0].y + g.c[1].y) / 2 };
        x.strokeStyle = SEL; x.lineWidth = 2 * d;
        x.beginPath(); x.moveTo(top.x * s, top.y * s); x.lineTo(g.rotH.x * s, g.rotH.y * s); x.stroke();
        dot(g.rotH, 9, "#fff");
        x.fillStyle = "#fff"; x.fillRect(g.scaleH.x * s - 8 * d, g.scaleH.y * s - 8 * d, 16 * d, 16 * d); x.strokeRect(g.scaleH.x * s - 8 * d, g.scaleH.y * s - 8 * d, 16 * d, 16 * d);
        cross(g.delH);
      } else if (ids.length > 1) {
        const b = this.groupBox(ids);
        x.strokeStyle = SEL; x.lineWidth = 2.5 * d;
        x.strokeRect(b.x0 * s, b.y0 * s, (b.x1 - b.x0) * s, (b.y1 - b.y0) * s);
        cross({ x: b.x1, y: b.y0 });
        x.font = `600 ${12 * d}px system-ui`; x.fillStyle = SEL;
        x.fillText(`выбрано: ${ids.length}`, b.x0 * s, b.y0 * s - 6 * d);
      }
      if (this.marq) {
        const m = this.marq, x0 = Math.min(m.x0, m.x1), y0 = Math.min(m.y0, m.y1);
        x.fillStyle = "rgba(31,107,255,0.08)"; x.strokeStyle = SEL; x.lineWidth = 1.5 * d;
        x.fillRect(x0 * s, y0 * s, Math.abs(m.x1 - m.x0) * s, Math.abs(m.y1 - m.y0) * s);
        x.strokeRect(x0 * s, y0 * s, Math.abs(m.x1 - m.x0) * s, Math.abs(m.y1 - m.y0) * s);
      }
      x.restore();
    }
    handleAt(p) {
      const ids = this.sels.filter((id) => this.el(id));
      if (!ids.length) return null;
      const R = 18 / this.k(), near = (q) => Math.hypot(q.x - p.x, q.y - p.y) < R;
      if (ids.length > 1) { const b = this.groupBox(ids); return near({ x: b.x1, y: b.y0 }) ? "delete" : null; }
      const g = this.corners(this.el(ids[0]));
      if (near(g.delH)) return "delete";
      if (near(g.rotH)) return "rotate";
      if (near(g.scaleH)) return "scale";
      return null;
    }

    // ---------- события ----------
    removeSel() {
      const ids = this.sels.filter((id) => this.el(id));
      if (!ids.length) return;
      this.sels = []; this.hooks.remove(ids); this.dirty = true;
    }
    startMove(p) {
      const ov = this.hooks.getOv(), o0 = {};
      for (const id of this.sels) { const o = (ov[id] = ov[id] || {}); o0[id] = { dx: o.dx || 0, dy: o.dy || 0 }; }
      this.hooks.beginChange();
      this.drag = { mode: "move", p0: p, o0, box: this.groupBox(this.sels), targets: this.snapTargets(this.sels), moved: false };
    }
    down(e) {
      if (!this.scene) return;
      const p = this.pt(e), add = e.shiftKey || e.ctrlKey || e.metaKey;
      try { this.cv.setPointerCapture(e.pointerId); } catch (err) { /* синтетический указатель */ }
      e.preventDefault();
      const h = add ? null : this.handleAt(p);
      if (h === "delete") { this.removeSel(); return; }
      if (h === "rotate" || h === "scale") {
        const id = this.sels[0], el = this.el(id), ov = this.hooks.getOv(), o = (ov[id] = ov[id] || {}), b = P5.elBox(el, ov);
        this.hooks.beginChange();
        this.drag = { mode: h, id, p0: p, o0: { ds: o.ds || 1, dr: o.dr || 0 }, c: { x: b.x, y: b.y }, moved: false };
        this.dirty = true; return;
      }
      const el = this.hit(p);
      if (add) {
        if (el) {
          if (this.sels.includes(el.id)) this.sels = this.sels.filter((x) => x !== el.id);
          else { this.sels = [...this.sels, el.id]; this.startMove(p); }
        } else this.marq = { x0: p.x, y0: p.y, x1: p.x, y1: p.y, base: [...this.sels] };
      } else if (el) {
        if (!this.sels.includes(el.id)) this.sels = [el.id];
        this.startMove(p);
      } else { this.sels = []; this.marq = { x0: p.x, y0: p.y, x1: p.x, y1: p.y, base: [] }; }
      this.dirty = true;
    }
    move(e) {
      if (!this.scene) return;
      const p = this.pt(e);
      if (this.marq) {
        const m = this.marq; m.x1 = p.x; m.y1 = p.y;
        const r = { x0: Math.min(m.x0, m.x1), y0: Math.min(m.y0, m.y1), x1: Math.max(m.x0, m.x1), y1: Math.max(m.y0, m.y1) };
        const hit = this.scene.els.filter((el) => this.selectable(el)).filter((el) => { const b = this.box(el); return b.x0 < r.x1 && b.x1 > r.x0 && b.y0 < r.y1 && b.y1 > r.y0; }).map((el) => el.id);
        this.sels = [...new Set([...m.base, ...hit])];
        this.dirty = true; return;
      }
      if (!this.drag) {
        const h = this.handleAt(p);
        this.cv.style.cursor = h === "rotate" ? "grab" : h === "scale" ? "nwse-resize" : h === "delete" ? "pointer" : this.hit(p) ? "move" : "crosshair";
        return;
      }
      const d = this.drag, ov = this.hooks.getOv();
      if (d.mode === "move") {
        let dx = p.x - d.p0.x, dy = p.y - d.p0.y;
        if (!e.altKey && d.box) ({ dx, dy } = this.snap(d.box, dx, dy, 7 / this.k())); else this.guides = [];
        for (const id of Object.keys(d.o0)) { const o = (ov[id] = ov[id] || {}); o.dx = d.o0[id].dx + dx; o.dy = d.o0[id].dy + dy; }
      } else if (d.mode === "scale") {
        const o = ov[d.id];
        const r0 = Math.hypot(d.p0.x - d.c.x, d.p0.y - d.c.y), r1 = Math.hypot(p.x - d.c.x, p.y - d.c.y);
        o.ds = P5.clamp(d.o0.ds * (r1 / Math.max(1, r0)), 0.15, 6);
      } else if (d.mode === "rotate") {
        const o = ov[d.id];
        const a0 = Math.atan2(d.p0.y - d.c.y, d.p0.x - d.c.x), a1 = Math.atan2(p.y - d.c.y, p.x - d.c.x);
        let r = d.o0.dr + ((a1 - a0) * 180) / Math.PI;
        const base = this.el(d.id).rot || 0, total = base + r, snapA = Math.round(total / 45) * 45;
        if (!e.altKey && Math.abs(total - snapA) < 3) r = snapA - base;
        o.dr = r;
      }
      d.moved = true; this.dirty = true;
    }
    up() {
      if (this.marq) { this.marq = null; this.dirty = true; return; }
      if (!this.drag) return;
      const d = this.drag; this.drag = null; this.guides = [];
      if (d.moved) this.hooks.changed(); else this.hooks.cancelChange && this.hooks.cancelChange();
      this.dirty = true;
    }
    key(e) {
      const tag = (document.activeElement && document.activeElement.tagName) || "";
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key.toLowerCase() === "z") { e.preventDefault(); this.hooks.undo(); return; }
      if (mod && e.key.toLowerCase() === "a" && this.scene) { e.preventDefault(); this.sels = this.scene.els.filter((el) => this.selectable(el)).map((el) => el.id); this.dirty = true; return; }
      if (!this.sels.length) return;
      if (e.key === "Delete" || e.key === "Backspace") { this.removeSel(); e.preventDefault(); }
      else if (e.key === "Escape") { this.sels = []; this.dirty = true; }
      else if (e.key.startsWith("Arrow")) {
        const st = e.shiftKey ? 10 : 2, ov = this.hooks.getOv();
        this.hooks.beginChange();
        for (const id of this.sels) {
          const o = (ov[id] = ov[id] || {});
          if (e.key === "ArrowLeft") o.dx = (o.dx || 0) - st; if (e.key === "ArrowRight") o.dx = (o.dx || 0) + st;
          if (e.key === "ArrowUp") o.dy = (o.dy || 0) - st; if (e.key === "ArrowDown") o.dy = (o.dy || 0) + st;
        }
        this.hooks.changed(); this.dirty = true; e.preventDefault();
      }
    }
  }
  P5.Editor = Editor;
})();
