/* Экспорт: PDF A4/A3 для печати (300 dpi), PNG, стикер Telegram 512×512, мем 1080×1080. */
(() => {
  const P5 = window.P5;
  const E = (P5.exporter = {});

  E.renderTo = (scene, ov, pxW, opt = {}) => {
    const scale = pxW / scene.W;
    const c = P5.canvas(pxW, Math.round(scene.H * scale));
    P5.render(c.getContext("2d"), scene, { scale, overrides: ov, transparent: !!opt.transparent });
    return c;
  };

  // на Android (Capacitor) ссылка-скачивание не работает — сохраняем во временную папку и открываем «Поделиться»
  const native = () => !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
  const toB64 = (blob) => new Promise((res) => { const r = new FileReader(); r.onload = () => res(String(r.result).split(",")[1]); r.readAsDataURL(blob); });
  const download = async (blob, name) => {
    // лёгкая portable-версия (Neutralino): системное окно «Сохранить как»
    if (window.Neutralino && window.NL_TOKEN !== undefined) {
      const ext = name.split(".").pop();
      const path = await window.Neutralino.os.showSaveDialog("Сохранить файл", { defaultPath: name, filters: [{ name: ext.toUpperCase(), extensions: [ext] }] });
      if (path) await window.Neutralino.filesystem.writeBinaryFile(path, await blob.arrayBuffer());
      return;
    }
    if (native()) {
      const { Filesystem, Share } = window.Capacitor.Plugins;
      const w = await Filesystem.writeFile({ path: name, data: await toB64(blob), directory: "CACHE" });
      await Share.share({ title: name, files: [w.uri], dialogTitle: "Сохранить или отправить" }).catch(() => {});
      return;
    }
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  };
  const toBlob = (c, type = "image/png", q) => new Promise((res) => c.toBlob(res, type, q));
  const stamp = () => new Date().toISOString().slice(0, 16).replace(/[-:T]/g, "");

  E.save = download;
  E.pdf = async (scene, ov, size) => {
    const mm = size === "A3" ? [297, 420] : [210, 297];
    const px = size === "A3" ? 3508 : 2480; // 300 dpi
    const c = E.renderTo(scene, ov, px);
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: size.toLowerCase(), compress: true });
    doc.addImage(c, "PNG", 0, 0, mm[0], mm[1], undefined, "FAST");
    doc.setProperties({ title: "Пятёрка · SLAY 2026", creator: "Пятёрка — фабрика плакатов" });
    download(doc.output("blob"), `pyaterka-plakat-${size}-${stamp()}.pdf`);
  };

  // несколько плакатов на одном листе A4: подбираем сетку и поворот, чтобы плакаты были как можно крупнее
  E.sheetCanvas = (items, opt = {}) => {
    const mm = 300 / 25.4, SW = 210, SH = 297, M = opt.margin ?? 7, G = opt.gap ?? 6, n = items.length;
    const { W, H } = items[0].scene;
    let best = null;
    for (let cols = 1; cols <= n; cols++) {
      const rows = Math.ceil(n / cols);
      for (const rot of [false, true]) {
        const pw = rot ? H : W, ph = rot ? W : H;
        const cw = (SW - 2 * M - (cols - 1) * G) / cols, ch = (SH - 2 * M - (rows - 1) * G) / rows;
        const k = Math.min(cw / pw, ch / ph), full = cols * rows === n; // без пустых ячеек — бумага не пропадает
        if (!best || (full && !best.full) || (full === best.full && k > best.k)) best = { cols, rows, rot, k, cw, ch, full };
      }
    }
    const c = P5.canvas(SW * mm, SH * mm), x = c.getContext("2d");
    x.fillStyle = "#fff"; x.fillRect(0, 0, c.width, c.height);
    const pwmm = W * best.k, phmm = H * best.k;
    items.forEach((it, i) => {
      const col = i % best.cols, row = Math.floor(i / best.cols);
      const cx = (M + col * (best.cw + G) + best.cw / 2) * mm, cy = (M + row * (best.ch + G) + best.ch / 2) * mm;
      const img = E.renderTo(it.scene, it.ov || {}, Math.round(pwmm * mm));
      x.save(); x.translate(cx, cy); if (best.rot) x.rotate(-Math.PI / 2);
      x.drawImage(img, (-pwmm * mm) / 2, (-phmm * mm) / 2, pwmm * mm, phmm * mm);
      // метки реза: короткие линии у углов, снаружи плаката
      const hw = (pwmm * mm) / 2, hh = (phmm * mm) / 2, L = 4 * mm, o = 1.2 * mm;
      x.strokeStyle = "#888"; x.lineWidth = 0.15 * mm; x.beginPath();
      for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
        x.moveTo(sx * (hw + o), sy * hh); x.lineTo(sx * (hw + o + L), sy * hh);
        x.moveTo(sx * hw, sy * (hh + o)); x.lineTo(sx * hw, sy * (hh + o + L));
      }
      x.stroke(); x.restore();
    });
    return c;
  };
  E.sheetPdf = async (items, name) => {
    const c = E.sheetCanvas(items), { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4", compress: true });
    doc.addImage(c, "PNG", 0, 0, 210, 297, undefined, "FAST");
    download(doc.output("blob"), `${name}-${stamp()}.pdf`);
  };

  // много листов в одном PDF: pages — функции, каждая рисует свой лист A4 (рисуем по одному, чтобы не съесть память)
  E.multiPdf = async (pages, name, onPage) => {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4", compress: true });
    for (let i = 0; i < pages.length; i++) {
      if (onPage) onPage(i, pages.length);
      await new Promise((r) => setTimeout(r, 20));
      const c = pages[i]();
      if (i) doc.addPage("a4", "portrait");
      doc.addImage(c, "PNG", 0, 0, 210, 297, undefined, "FAST");
    }
    await download(doc.output("blob"), `${name}-${stamp()}.pdf`);
  };
  // мем по одному на лист: квадрат 19 см по центру A4
  E.memePage = (scene, ov) => {
    const mm = 300 / 25.4, c = P5.canvas(210 * mm, 297 * mm), x = c.getContext("2d");
    x.fillStyle = "#fff"; x.fillRect(0, 0, c.width, c.height);
    const s = Math.round(190 * mm), img = E.renderTo(scene, ov, s);
    x.drawImage(img, (c.width - s) / 2, (c.height - s) / 2);
    return c;
  };

  E.png = async (scene, ov, px, name) => {
    const c = E.renderTo(scene, ov, px);
    download(await toBlob(c), `${name}-${stamp()}.png`);
  };

  E.sticker = async (scene, ov) => {
    const big = E.renderTo(scene, ov, 1024, { transparent: true });
    const outl = P5.outline(big, 22 * (1024 / scene.W));
    const c = P5.canvas(512, 512), x = c.getContext("2d");
    x.imageSmoothingQuality = "high"; x.drawImage(outl, 0, 0, 512, 512);
    download(await toBlob(c), `pyaterka-sticker-${stamp()}.png`);
  };
})();
