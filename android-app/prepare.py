"""Копирует программу в android-app/www и рисует иконку приложения.
Запуск из папки android-app:  python prepare.py   (потом: npx cap sync android)"""
import os, shutil
from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
WWW = os.path.join(HERE, "www")

# 1) веб-часть: только то, что нужно приложению
if os.path.isdir(WWW):
    shutil.rmtree(WWW)
os.makedirs(WWW)
shutil.copy2(os.path.join(ROOT, "index.html"), WWW)
shutil.copytree(os.path.join(ROOT, "css"), os.path.join(WWW, "css"))
shutil.copytree(os.path.join(ROOT, "js"), os.path.join(WWW, "js"))
print("www готов:", sum(len(f) for _, _, f in os.walk(WWW)), "файлов")

# 2) иконка: чёрный квадрат, лаймовая «5»
FONT = os.path.join(ROOT, "assets", "fonts", "SofiaSansExtraCondensed.ttf")


def icon(size, pad=0.0, round_=False, bg=True):
    im = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    if bg:
        if round_:
            d.ellipse((0, 0, size - 1, size - 1), fill="#111111")
        else:
            d.rounded_rectangle((0, 0, size - 1, size - 1), radius=int(size * 0.18), fill="#111111")
    f = ImageFont.truetype(FONT, int(size * (0.92 - pad)))
    try:
        f.set_variation_by_axes([900])
    except Exception:
        pass
    l, t, r, b = d.textbbox((0, 0), "5", font=f)
    d.text(((size - (r - l)) / 2 - l, (size - (b - t)) / 2 - t), "5", font=f, fill="#d7ff1f")
    return im


res = os.path.join(HERE, "android", "app", "src", "main", "res")
if os.path.isdir(res):
    sizes = {"mdpi": 48, "hdpi": 72, "xhdpi": 96, "xxhdpi": 144, "xxxhdpi": 192}
    for dpi, s in sizes.items():
        folder = os.path.join(res, f"mipmap-{dpi}")
        icon(s).save(os.path.join(folder, "ic_launcher.png"))
        icon(s, round_=True).save(os.path.join(folder, "ic_launcher_round.png"))
        icon(int(s * 2.25), pad=0.42, bg=False).save(os.path.join(folder, "ic_launcher_foreground.png"))
    bgxml = os.path.join(res, "values", "ic_launcher_background.xml")
    with open(bgxml, "w", encoding="utf-8") as fh:
        fh.write('<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">#111111</color>\n</resources>\n')
    print("иконки готовы")
else:
    print("папки android ещё нет — сначала npx cap add android, потом снова python prepare.py")
