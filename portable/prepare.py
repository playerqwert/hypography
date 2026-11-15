"""Копирует программу в portable/www, подключает neutralino.js и иконку."""
import os, shutil
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE); WWW = os.path.join(HERE, "www")
lib = os.path.join(WWW, "js", "lib", "neutralino.js")
keep = open(lib, "rb").read() if os.path.exists(lib) else None
if os.path.isdir(WWW): shutil.rmtree(WWW)
os.makedirs(WWW)
for d in ("css", "js"): shutil.copytree(os.path.join(ROOT, d), os.path.join(WWW, d))
if keep: open(lib, "wb").write(keep)
html = open(os.path.join(ROOT, "index.html"), encoding="utf-8").read()
html = html.replace('<script src="js/lib/qrcode.js', '<script src="js/lib/neutralino.js"></script>\n<script>try { Neutralino.init(); } catch (e) {}</script>\n<script src="js/lib/qrcode.js', 1)
open(os.path.join(WWW, "index.html"), "w", encoding="utf-8").write(html)
icon = os.path.join(ROOT, "desktop", "icon.png")
if os.path.exists(icon): shutil.copy2(icon, os.path.join(WWW, "icon.png"))
print("www ok")
