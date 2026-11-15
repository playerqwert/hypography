"""Копирует программу в desktop/www и рисует иконки (icon.png, build/icon.ico)."""
import os, shutil, sys
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE)
sys.path.insert(0, os.path.join(ROOT, "android-app"))
WWW = os.path.join(HERE, "www")
if os.path.isdir(WWW): shutil.rmtree(WWW)
os.makedirs(WWW)
shutil.copy2(os.path.join(ROOT, "index.html"), WWW)
for d in ("css", "js"): shutil.copytree(os.path.join(ROOT, d), os.path.join(WWW, d))
from PIL import Image, ImageDraw, ImageFont
f = ImageFont.truetype(os.path.join(ROOT, "assets", "fonts", "SofiaSansExtraCondensed.ttf"), 470)
try: f.set_variation_by_axes([900])
except Exception: pass
im = Image.new("RGBA", (512, 512), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
d.rounded_rectangle((0, 0, 511, 511), radius=92, fill="#111111")
l, t, r, b = d.textbbox((0, 0), "5", font=f)
d.text(((512 - (r - l)) / 2 - l, (512 - (b - t)) / 2 - t), "5", font=f, fill="#d7ff1f")
im.save(os.path.join(HERE, "icon.png"))
im.save(os.path.join(HERE, "build", "icon.ico"), sizes=[(16, 16), (24, 24), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)])
print("ok")
