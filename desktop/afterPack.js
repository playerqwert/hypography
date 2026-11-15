// После упаковки ставим иконку и описание exe сами (через npm-пакет rcedit),
// потому что встроенный в electron-builder шаг требует winCodeSign, а тот не распаковывается
// без прав на символические ссылки в Windows.
const path = require("path");
exports.default = async (ctx) => {
  if (ctx.electronPlatformName !== "win32") return;
  const m = require("rcedit");
  const rcedit = m.rcedit || m.default || m;
  const exe = path.join(ctx.appOutDir, `${ctx.packager.appInfo.productFilename}.exe`);
  await rcedit(exe, {
    icon: path.join(__dirname, "build", "icon.ico"),
    "version-string": { ProductName: "Hypography", FileDescription: "Hypography — poster factory", CompanyName: "Hypography", OriginalFilename: "Hypography.exe" },
    "file-version": "1.0.0",
    "product-version": "1.0.0",
  });
};
