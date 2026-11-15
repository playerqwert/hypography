"""Пакует фото, шрифты и QR в js/assets.js (base64), чтобы программа работала даже без сервера.
Запуск:  python tools/build_assets.py   (из папки plakat5)"""
import base64, io, json, os, sys
from PIL import Image
from fontTools import subset
from fontTools.ttLib import TTFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
A = lambda *p: os.path.join(ROOT, "assets", *p)

PHOTOS = [  # id, file, kind, name
    ("glasses",  "glasses.png",      "cutout", "Очки"),
    ("royal",    "royal.png",        "cutout", "Король"),
    ("pointing", "pointing.png",     "cutout", "Ты!"),
    ("lookup",   "lookup.png",       "cutout", "Взгляд"),
    ("praying",  "praying_card.png", "card",   "Молитва"),
    ("sad",      "sad.png",          "cutout", "Грустный"),
    ("laugh",    "laugh.png",        "cutout", "Опа"),
]
FONTS = [  # family, file, css weight range
    ("Sofia", "SofiaSansExtraCondensed.ttf", "100 900"),
    ("Handjet", "Handjet.ttf", "100 900"),
    ("Caveat", "Caveat.ttf", "400 700"),
    ("PressStart", "PressStart2P.ttf", "400"),
    ("Dela", "DelaGothicOne.ttf", "400"),
    ("Unbounded", "Unbounded.ttf", "200 900"),
    ("Seymour", "SeymourOne.ttf", "400"),
    ("Slab", "RobotoSlab.ttf", "100 900"),
    ("Playfair", "PlayfairDisplay.ttf", "400 900"),
    ("Russo", "RussoOne.ttf", "400"),
    ("RubikMono", "RubikMonoOne.ttf", "400"),
]
UNICODES = (list(range(0x20, 0x250)) + list(range(0x300, 0x370)) + list(range(0x400, 0x500)) +
            list(range(0x2010, 0x2070)) + [0x20AC, 0x2116, 0x2122] + list(range(0x2190, 0x2200)) +
            list(range(0x25A0, 0x2600)) + list(range(0x2600, 0x2700)))

def b64(data, mime): return f"data:{mime};base64," + base64.b64encode(data).decode()

def photo(fn, maxw=1400):
    im = Image.open(A("photos", fn)).convert("RGBA")
    if im.width > maxw: im = im.resize((maxw, round(im.height * maxw / im.width)), Image.LANCZOS)
    buf = io.BytesIO(); im.save(buf, "WEBP", quality=88, method=6)
    return b64(buf.getvalue(), "image/webp"), im.size

def fix_pixel(f):
    """У Press Start 2P «Й» сжата (крышка вдавлена в букву). Собираем её заново: целая «И» + пиксельная крышка над ней.
    Шрифт изменён, поэтому по условиям OFL (Reserved Font Name) переименовываем его в «Hypography Pixel»."""
    from fontTools.pens.ttGlyphPen import TTGlyphPen
    g, cm = f["glyf"], f.getBestCmap()
    pen = TTGlyphPen(g)
    g[cm[ord("И")]].draw(pen, g)
    for x0, y0, x1, y1 in [(125, 1250, 250, 1375), (625, 1250, 750, 1375), (250, 1125, 625, 1250)]:
        pen.moveTo((x0, y0)); pen.lineTo((x0, y1)); pen.lineTo((x1, y1)); pen.lineTo((x1, y0)); pen.closePath()
    g[cm[ord("Й")]] = pen.glyph()
    for rec in f["name"].names:
        if rec.nameID in (1, 3, 4, 6, 16, 17):
            rec.string = "HypographyPixel" if rec.nameID == 6 else "Hypography Pixel"
    return f


def font(fn):
    f = TTFont(A("fonts", fn))
    if fn.startswith("PressStart"): f = fix_pixel(f)
    opt = subset.Options(); opt.flavor = "woff2"; opt.layout_features = ["*"]; opt.name_IDs = ["*"]; opt.notdef_outline = True
    s = subset.Subsetter(opt); s.populate(unicodes=UNICODES); s.subset(f)
    buf = io.BytesIO(); f.flavor = "woff2"; f.save(buf)
    return b64(buf.getvalue(), "font/woff2")

out = {"photos": {}, "fonts": [], "qr": None}
for pid, fn, kind, name in PHOTOS:
    src, (w, h) = photo(fn)
    out["photos"][pid] = {"src": src, "kind": kind, "name": name, "w": w, "h": h}
    print("photo", pid, w, h, len(src) // 1024, "KB")
for fam, fn, wt in FONTS:
    src = font(fn); out["fonts"].append({"family": fam, "src": src, "weight": wt})
    print("font", fam, len(src) // 1024, "KB")
qr = Image.open(A("qr", "qr_default.png")).convert("RGBA").resize((1200, 1200), Image.LANCZOS)
buf = io.BytesIO(); qr.save(buf, "PNG", optimize=True)
out["qr"] = {"src": b64(buf.getvalue(), "image/png"), "url": "https://5slay.ru/"}
js = "/* сгенерировано tools/build_assets.py — не редактировать руками */\nwindow.P5 = window.P5 || {};\nP5.ASSETS = " + json.dumps(out, ensure_ascii=False) + ";\n"
open(os.path.join(ROOT, "js", "assets.js"), "w", encoding="utf-8").write(js)
print("assets.js", len(js) // 1024, "KB")
