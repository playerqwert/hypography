/* Своё фото: автоматическое вырезание фона (MediaPipe, работает офлайн) + ручная кисть «стереть / вернуть». */
(() => {
  const P5 = window.P5;
  let segP = null;

  async function segmenter() {
    if (!segP) segP = (async () => {
      const vision = await import("./lib/mediapipe/vision_bundle.js");
      const files = await vision.FilesetResolver.forVisionTasks(new URL("js/lib/mediapipe/wasm", location.href).href);
      return vision.ImageSegmenter.createFromOptions(files, {
        baseOptions: { modelAssetPath: new URL("js/lib/mediapipe/models/selfie_multiclass_256x256.tflite", location.href).href, delegate: "CPU" },
        runningMode: "IMAGE", outputCategoryMask: false, outputConfidenceMasks: true,
      });
    })().catch((e) => { segP = null; throw e; });
    return segP;
  }

  // маска «человек» 0..255 размером с картинку
  async function autoMask(img) {
    const seg = await segmenter();
    const res = seg.segment(img);
    const bgMask = res.confidenceMasks[0];
    const w = bgMask.width, h = bgMask.height, bgv = bgMask.getAsFloat32Array();
    const c = P5.canvas(w, h), x = c.getContext("2d"), id = x.createImageData(w, h);
    for (let i = 0; i < w * h; i++) {
      const p = 1 - bgv[i];
      let a = (p - 0.35) / 0.3; a = a < 0 ? 0 : a > 1 ? 1 : a;
      id.data[i * 4 + 3] = a * 255;
    }
    x.putImageData(id, 0, 0);
    res.confidenceMasks.forEach((m) => m.close && m.close());
    // плавный край и масштаб до размера фото
    const out = P5.canvas(img.width, img.height), ox = out.getContext("2d");
    ox.filter = `blur(${Math.max(0.6, img.width / w * 0.6)}px)`;
    ox.drawImage(c, 0, 0, out.width, out.height); ox.filter = "none";
    return out;
  }

  // ---------- окно редактирования ----------
  const $ = (id) => document.getElementById(id);
  let st = null;

  function draw() {
    if (!st) return;
    const { cv, img, mask } = st, x = cv.getContext("2d");
    x.clearRect(0, 0, cv.width, cv.height);
    x.globalAlpha = 0.22; x.drawImage(img, 0, 0, cv.width, cv.height); x.globalAlpha = 1;
    const tmp = P5.canvas(cv.width, cv.height), t = tmp.getContext("2d");
    t.drawImage(img, 0, 0, cv.width, cv.height);
    t.globalCompositeOperation = "destination-in"; t.drawImage(mask, 0, 0, cv.width, cv.height);
    x.drawImage(tmp, 0, 0);
    if (st.cursor) { x.beginPath(); x.arc(st.cursor.x, st.cursor.y, (st.size * cv.width) / mask.width / 2, 0, Math.PI * 2); x.lineWidth = 2; x.strokeStyle = st.mode === "erase" ? "#ff3b30" : "#1f6bff"; x.stroke(); }
  }
  function fitCanvas() {
    const box = $("cutStage").getBoundingClientRect();
    const k = Math.min(box.width / st.img.width, box.height / st.img.height);
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    st.cv.style.width = Math.floor(st.img.width * k) + "px"; st.cv.style.height = Math.floor(st.img.height * k) + "px";
    st.cv.width = Math.floor(st.img.width * k * dpr); st.cv.height = Math.floor(st.img.height * k * dpr);
    draw();
  }
  function snapshot() { const c = P5.canvas(st.mask.width, st.mask.height); c.getContext("2d").drawImage(st.mask, 0, 0); st.hist.push(c); if (st.hist.length > 30) st.hist.shift(); }
  function paint(px, py, last) {
    const x = st.mask.getContext("2d");
    x.globalCompositeOperation = st.mode === "erase" ? "destination-out" : "source-over";
    x.strokeStyle = x.fillStyle = "#000"; x.lineCap = "round"; x.lineWidth = st.size;
    x.beginPath();
    if (last) { x.moveTo(last.x, last.y); x.lineTo(px, py); x.stroke(); }
    else { x.arc(px, py, st.size / 2, 0, Math.PI * 2); x.fill(); }
    x.globalCompositeOperation = "source-over";
  }
  const toMask = (e) => { const r = st.cv.getBoundingClientRect(); return { x: ((e.clientX - r.left) / r.width) * st.mask.width, y: ((e.clientY - r.top) / r.height) * st.mask.height, cx: ((e.clientX - r.left) / r.width) * st.cv.width, cy: ((e.clientY - r.top) / r.height) * st.cv.height }; };

  function trimmed() {
    const { img, mask } = st;
    const out = P5.canvas(img.width, img.height), x = out.getContext("2d", { willReadFrequently: true });
    x.drawImage(img, 0, 0); x.globalCompositeOperation = "destination-in"; x.drawImage(mask, 0, 0);
    const d = x.getImageData(0, 0, out.width, out.height).data;
    let l = out.width, r = 0, t = out.height, b = 0;
    for (let yy = 0; yy < out.height; yy += 2) for (let xx = 0; xx < out.width; xx += 2) if (d[(yy * out.width + xx) * 4 + 3] > 20) { if (xx < l) l = xx; if (xx > r) r = xx; if (yy < t) t = yy; if (yy > b) b = yy; }
    if (r <= l || b <= t) return null;
    const c = P5.canvas(r - l + 2, b - t + 2);
    c.getContext("2d").drawImage(out, -l, -t);
    return c;
  }

  P5.openCutout = async (file, onDone) => {
    const url = URL.createObjectURL(file);
    let img = await P5.loadImage(url);
    const maxS = 1600;
    if (Math.max(img.width, img.height) > maxS) {
      const k = maxS / Math.max(img.width, img.height), c = P5.canvas(img.width * k, img.height * k);
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height); img = c;
    } else { const c = P5.canvas(img.width, img.height); c.getContext("2d").drawImage(img, 0, 0); img = c; }
    URL.revokeObjectURL(url);
    const mask = P5.canvas(img.width, img.height); const mx = mask.getContext("2d"); mx.fillStyle = "#000"; mx.fillRect(0, 0, mask.width, mask.height);
    st = { img, mask, cv: $("cutCv"), mode: "erase", size: Math.round(Math.max(img.width, img.height) / 22), hist: [], card: false, onDone };
    $("brushSize").value = 40;
    $("cutModal").hidden = false;
    document.querySelectorAll("#brushSeg button").forEach((b) => b.classList.toggle("on", b.dataset.b === "erase"));
    fitCanvas();
    runAuto();
  };

  async function runAuto() {
    const msg = $("cutMsg");
    msg.textContent = "Вырезаю фон… (первый раз может занять пару секунд)";
    try {
      const m = await autoMask(st.img);
      snapshot();
      const x = st.mask.getContext("2d"); x.clearRect(0, 0, st.mask.width, st.mask.height); x.drawImage(m, 0, 0);
      msg.textContent = "Готово! Если где-то лишнее — сотри кистью. Если срезало нужное — «Вернуть».";
    } catch (e) {
      console.warn(e);
      msg.textContent = location.protocol === "file:"
        ? "Автовырезание работает, если открыть программу через «Запустить.bat». Сейчас можно стереть фон кистью."
        : "Не получилось вырезать автоматически. Сотри фон кистью или оставь фото целиком.";
    }
    draw();
  }

  function close() { $("cutModal").hidden = true; st = null; }

  P5.initCutoutUI = () => {
    const cv = $("cutCv");
    let last = null, down = false;
    cv.addEventListener("pointerdown", (e) => { if (!st) return; down = true; snapshot(); const p = toMask(e); paint(p.x, p.y, null); last = p; cv.setPointerCapture(e.pointerId); draw(); });
    cv.addEventListener("pointermove", (e) => { if (!st) return; const p = toMask(e); st.cursor = { x: p.cx, y: p.cy }; if (down) { paint(p.x, p.y, last); last = p; } draw(); });
    cv.addEventListener("pointerup", () => { down = false; last = null; });
    cv.addEventListener("pointerleave", () => { if (st) { st.cursor = null; draw(); } });
    document.querySelectorAll("#brushSeg button").forEach((b) => b.addEventListener("click", () => { st.mode = b.dataset.b; document.querySelectorAll("#brushSeg button").forEach((x) => x.classList.toggle("on", x === b)); }));
    $("brushSize").addEventListener("input", (e) => { if (st) st.size = Math.round((e.target.value / 40) * Math.max(st.img.width, st.img.height) / 22); });
    $("cutUndo").addEventListener("click", () => { if (st && st.hist.length) { const h = st.hist.pop(); const x = st.mask.getContext("2d"); x.clearRect(0, 0, st.mask.width, st.mask.height); x.drawImage(h, 0, 0); draw(); } });
    $("cutAuto").addEventListener("click", () => st && runAuto());
    $("cutNoBg").addEventListener("click", () => { if (!st) return; snapshot(); const x = st.mask.getContext("2d"); x.globalCompositeOperation = "source-over"; x.fillStyle = "#000"; x.fillRect(0, 0, st.mask.width, st.mask.height); st.card = true; $("cutMsg").textContent = "Фото будет целиком, как карточка. Нажми «Готово»."; draw(); });
    $("cutCancel").addEventListener("click", close);
    $("cutSticker").addEventListener("click", () => {
      if (!st) return;
      const res = trimmed() || st.img;
      close();
      res.toBlob((b) => P5.addExtra && P5.addExtra(b));
    });
    $("cutDone").addEventListener("click", () => {
      if (!st) return;
      const full = (() => { const d = st.mask.getContext("2d").getImageData(0, 0, st.mask.width, st.mask.height).data; let n = 0; for (let i = 3; i < d.length; i += 64) if (d[i] > 250) n++; return n / (d.length / 64) > 0.985; })();
      const card = st.card || full;
      const res = card ? st.img : trimmed();
      if (!res) { $("cutMsg").textContent = "Похоже, стёрто всё фото — нажми «Вернуть» или ↶."; return; }
      const cb = st.onDone; close(); cb(res, card ? "card" : "cutout");
    });
    window.addEventListener("resize", () => st && fitCanvas());
  };
})();
