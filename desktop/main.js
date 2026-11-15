// Hypography (Типография хайпа): обёртка Electron. Файлы программы отдаются по app://, чтобы всё работало офлайн
// (вырезание фона MediaPipe грузит wasm и модель через fetch — с file:// это не работает).
const { app, BrowserWindow, protocol, net, shell } = require("electron");
const path = require("path");
const { pathToFileURL } = require("url");

protocol.registerSchemesAsPrivileged([{ scheme: "app", privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true } }]);
if (!app.requestSingleInstanceLock()) app.quit();

let win;
app.whenReady().then(() => {
  const root = path.join(__dirname, "www");
  protocol.handle("app", (req) => {
    let p = decodeURIComponent(new URL(req.url).pathname);
    if (p === "/" || !p) p = "/index.html";
    const file = path.normalize(path.join(root, p));
    if (!file.startsWith(root)) return new Response("forbidden", { status: 403 });
    return net.fetch(pathToFileURL(file).toString());
  });
  win = new BrowserWindow({
    width: 1400, height: 920, minWidth: 900, minHeight: 640, backgroundColor: "#111111",
    title: "Hypography — Типография хайпа", icon: path.join(__dirname, "icon.png"), autoHideMenuBar: true,
    webPreferences: { contextIsolation: true, sandbox: true },
  });
  win.loadURL("app://local/index.html");
  win.webContents.setWindowOpenHandler(({ url }) => { shell.openExternal(url); return { action: "deny" }; });
});
app.on("second-instance", () => { if (win) { if (win.isMinimized()) win.restore(); win.focus(); } });
app.on("window-all-closed", () => app.quit());
