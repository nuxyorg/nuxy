var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => {
  __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
  return value;
};
import { BrowserWindow, protocol, net, clipboard, ipcMain, screen as screen$1, app } from "electron";
import path from "path";
import fs from "fs";
import os from "os";
import { Worker } from "worker_threads";
const LEVELS = {
  silly: 0,
  info: 1,
  warn: 2,
  error: 3
};
const C = {
  reset: "\x1B[0m",
  dim: "\x1B[2m",
  bold: "\x1B[1m",
  // levels
  silly: "\x1B[35m",
  // magenta
  info: "\x1B[36m",
  // cyan
  warn: "\x1B[33m",
  // yellow
  error: "\x1B[31m",
  // red
  // meta
  time: "\x1B[90m",
  // gray
  ns: "\x1B[34m",
  // blue
  arrow: "\x1B[90m"
  // gray
};
function currentLevel() {
  const env = (process.env.LOG_LEVEL ?? "info").toLowerCase();
  return LEVELS[env] !== void 0 ? env : "info";
}
function timestamp() {
  return (/* @__PURE__ */ new Date()).toISOString().replace("T", " ").substring(0, 23);
}
function pad(s, n) {
  return s.padEnd(n);
}
function formatLine(level, namespace, msg, meta) {
  const color = C[level];
  const ts = `${C.time}${timestamp()}${C.reset}`;
  const lbl = `${color}${C.bold}${pad(level.toUpperCase(), 5)}${C.reset}`;
  const ns = `${C.ns}[${namespace}]${C.reset}`;
  const body = msg;
  const extra = meta !== void 0 ? `
       ${C.dim}${JSON.stringify(meta, null, 2).replace(/\n/g, "\n       ")}${C.reset}` : "";
  return `${ts} ${lbl} ${ns} ${body}${extra}`;
}
function createLogger(namespace) {
  function shouldLog(level) {
    return LEVELS[level] >= LEVELS[currentLevel()];
  }
  function emit(level, msg, meta) {
    if (!shouldLog(level))
      return;
    const line = formatLine(level, namespace, msg, meta);
    if (level === "error") {
      console.error(line);
    } else if (level === "warn") {
      console.warn(line);
    } else {
      console.log(line);
    }
  }
  return {
    silly: (msg, meta) => emit("silly", msg, meta),
    info: (msg, meta) => emit("info", msg, meta),
    warn: (msg, meta) => emit("warn", msg, meta),
    error: (msg, meta) => emit("error", msg, meta),
    child: (sub) => createLogger(`${namespace}:${sub}`)
  };
}
const kernelLogger = createLogger("Kernel");
const log$6 = kernelLogger.child("NuxyConfig");
const DEFAULTS$1 = {
  theme: "dark",
  escAction: "hide",
  windowWidth: 800,
  alwaysOnTop: false,
  opacity: 1,
  showInTaskbar: false,
  startHidden: false
};
const CONFIG_DIR = path.join(os.homedir(), ".nuxy");
const CONFIG_PATH = path.join(CONFIG_DIR, "nuxyconfig");
const THEMES_DIR = path.join(CONFIG_DIR, "themes");
function parseConfig(raw) {
  const result = {};
  for (const rawLine of raw.split("\n")) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#"))
      continue;
    const eqIdx = line.indexOf("=");
    if (eqIdx === -1)
      continue;
    const key = line.slice(0, eqIdx).trim();
    const value = line.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, "");
    switch (key) {
      case "theme":
        if (["dark", "light", "system"].includes(value))
          result.theme = value;
        break;
      case "escAction":
        if (["hide", "minimize", "quit", "none"].includes(value))
          result.escAction = value;
        break;
      case "windowWidth":
        result.windowWidth = Number(value);
        break;
      case "alwaysOnTop":
        result.alwaysOnTop = value === "true";
        break;
      case "opacity":
        result.opacity = Math.min(1, Math.max(0, Number(value)));
        break;
      case "showInTaskbar":
        result.showInTaskbar = value === "true";
        break;
      case "startHidden":
        result.startHidden = value === "true";
        break;
      case "windowPosition":
        result.windowPosition = value;
        break;
      default:
        log$6.warn(`Unknown config key ignored: "${key}"`);
    }
  }
  return result;
}
function writeDefaultConfig() {
  const content = `# Nuxy Configuration File
# Located at: ~/.nuxy/nuxyconfig
# All changes take effect on the next launch.

# Display theme: dark | light | system
theme = dark

# What to do when ESC is pressed in the launcher:
#   hide     — hide the window (default, recommended)
#   minimize — minimize to taskbar
#   quit     — quit the application
#   none     — do nothing
escAction = hide

# Launcher window dimensions (pixels)
windowWidth  = 800

# Keep the window above all other windows
alwaysOnTop = false

# Window opacity (0.0 = fully transparent, 1.0 = fully opaque)
opacity = 1

# Show Nuxy in the system taskbar / dock
showInTaskbar = false

# Start the app hidden (useful when launched at login)
startHidden = false

# Window position on show or startup. Can be fractional (e.g. 1/2, 1/3), percentages (e.g. 50%), or pixels (e.g. 300px).
# Format: x, y (e.g., "1/2, 1/3" or "300px, 1/2" or "center, center")
# If fractional or percentage, the window's own size is subtracted so that the center of the window aligns with the fraction.
# default is centered on the cursor display.
# windowPosition = 1/2, 1/2
`;
  fs.writeFileSync(CONFIG_PATH, content, "utf-8");
  log$6.info(`Created default config at ${CONFIG_PATH}`);
}
let _config = null;
let isWatching = false;
function loadConfig() {
  if (_config)
    return _config;
  if (!fs.existsSync(CONFIG_DIR)) {
    log$6.info(`Creating config directory at ${CONFIG_DIR}`);
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
  }
  if (!fs.existsSync(THEMES_DIR)) {
    log$6.info(`Creating themes directory at ${THEMES_DIR}`);
    fs.mkdirSync(THEMES_DIR, { recursive: true });
  }
  const darkJsonPath = path.join(THEMES_DIR, "dark.json");
  const lightJsonPath = path.join(THEMES_DIR, "light.json");
  try {
    let shouldWriteDark = !fs.existsSync(darkJsonPath);
    if (!shouldWriteDark) {
      const currentDark = fs.readFileSync(darkJsonPath, "utf8");
      if (currentDark.includes("p-3.5")) {
        shouldWriteDark = true;
      }
    }
    if (shouldWriteDark) {
      fs.writeFileSync(
        darkJsonPath,
        JSON.stringify(DEFAULT_DARK_THEME, null, 2),
        "utf8"
      );
      log$6.info("Initialized/Updated default dark.json theme");
    }
    let shouldWriteLight = !fs.existsSync(lightJsonPath);
    if (!shouldWriteLight) {
      const currentLight = fs.readFileSync(lightJsonPath, "utf8");
      if (currentLight.includes("p-3.5")) {
        shouldWriteLight = true;
      }
    }
    if (shouldWriteLight) {
      fs.writeFileSync(
        lightJsonPath,
        JSON.stringify(DEFAULT_LIGHT_THEME, null, 2),
        "utf8"
      );
      log$6.info("Initialized/Updated default light.json theme");
    }
  } catch (e) {
    log$6.error("Failed to initialize/update default themes:", e);
  }
  const oldConfigPath = path.join(os.homedir(), ".nuxyconfig");
  if (fs.existsSync(oldConfigPath)) {
    log$6.info(
      `Found old config at ${oldConfigPath} — migrating to ${CONFIG_PATH}`
    );
    try {
      const rawOld = fs.readFileSync(oldConfigPath, "utf-8");
      fs.writeFileSync(CONFIG_PATH, rawOld, "utf-8");
      log$6.info(`Successfully migrated config to ${CONFIG_PATH}`);
      fs.unlinkSync(oldConfigPath);
      log$6.info(`Removed old config at ${oldConfigPath}`);
    } catch (err) {
      log$6.error(`Failed to migrate old config:`, err);
    }
  }
  function watchConfig() {
    if (isWatching)
      return;
    isWatching = true;
    try {
      fs.watch(CONFIG_DIR, (eventType, filename) => {
        if (filename === "nuxyconfig") {
          log$6.info("nuxyconfig changed on disk — reloading config.");
          try {
            reloadConfig();
          } catch (e) {
            log$6.error("Failed to reload config on file change:", e);
          }
        }
      });
    } catch (err) {
      log$6.error("Failed to watch config directory:", err);
    }
  }
  if (!fs.existsSync(CONFIG_PATH)) {
    log$6.info(`No config found at ${CONFIG_PATH} — writing defaults.`);
    writeDefaultConfig();
    _config = { ...DEFAULTS$1 };
    watchConfig();
    return _config;
  }
  try {
    const raw = fs.readFileSync(CONFIG_PATH, "utf-8");
    const parsed = parseConfig(raw);
    _config = { ...DEFAULTS$1, ...parsed };
    log$6.info(`Config loaded from ${CONFIG_PATH}`, _config);
  } catch (err) {
    log$6.error(`Failed to read config — falling back to defaults.`, err);
    _config = { ...DEFAULTS$1 };
  }
  watchConfig();
  return _config;
}
function reloadConfig() {
  _config = null;
  return loadConfig();
}
function getConfig() {
  if (!_config)
    return loadConfig();
  return _config;
}
const DEFAULT_DARK_THEME = {
  name: "dark",
  colors: {
    "bg-base": "#141414",
    "syntax-comment": "#333333",
    "syntax-variable": "#EEFFFF",
    "syntax-constant": "#FFAA01",
    "syntax-invalid": "#FF1D64",
    "syntax-deprecated": "#B04DFF",
    "syntax-keyword": "#555555",
    "syntax-operator": "#2AC0FF",
    "syntax-tag": "#FF00B0",
    "syntax-function": "#00FECA",
    "syntax-orange": "#F9672B",
    "syntax-peach": "#ff8b5a",
    "terminal-green": "#CCFF2D"
  },
  styles: {
    container: "w-full h-fit bg-bg-base border border-syntax-comment",
    input: "w-full border-syntax-comment bg-bg-base text-syntax-variable placeholder:text-slate-500 text-lg py-5 px-4 rounded-lg focus:border-syntax-operator focus:ring-1 focus:ring-syntax-operator transition-all duration-300 shadow-inner",
    itemActive: "mx-2 my-1 py-2 px-4 rounded-md flex items-center justify-between cursor-pointer transition-all duration-150 bg-syntax-comment text-syntax-variable shadow-sm",
    itemInactive: "mx-2 my-1 py-2 px-4 rounded-md flex items-center justify-between cursor-pointer transition-all duration-150 bg-transparent hover:bg-syntax-comment/40 text-syntax-variable",
    itemTitleActive: "text-base font-medium transition-colors duration-150 text-syntax-function",
    itemTitleInactive: "text-base font-medium transition-colors duration-150 text-syntax-variable",
    itemSubtitleActive: "text-xs font-mono px-2 py-0.5 rounded transition-colors duration-150 text-syntax-constant bg-bg-base border border-syntax-operator",
    itemSubtitleInactive: "text-xs font-mono px-2 py-0.5 rounded transition-colors duration-150 text-syntax-peach bg-syntax-comment border border-transparent"
  }
};
const DEFAULT_LIGHT_THEME = {
  name: "light",
  colors: {
    "bg-base": "#F4F4F5",
    "syntax-comment": "#E4E4E7",
    "syntax-variable": "#18181B",
    "syntax-constant": "#D97706",
    "syntax-invalid": "#DC2626",
    "syntax-deprecated": "#7C3AED",
    "syntax-keyword": "#71717A",
    "syntax-operator": "#2563EB",
    "syntax-tag": "#DB2777",
    "syntax-function": "#059669",
    "syntax-orange": "#EA580C",
    "syntax-peach": "#F97316",
    "terminal-green": "#16A34A"
  },
  styles: {
    container: "w-full h-fit bg-bg-base border border-syntax-comment",
    input: "w-full border-syntax-comment bg-bg-base text-syntax-variable placeholder:text-zinc-400 text-lg py-5 px-4 rounded-lg focus:border-syntax-operator focus:ring-1 focus:ring-syntax-operator transition-all duration-300 shadow-inner",
    itemActive: "mx-2 my-1 py-2 px-4 rounded-md flex items-center justify-between cursor-pointer transition-all duration-150 bg-syntax-comment text-syntax-variable shadow-sm",
    itemInactive: "mx-2 my-1 py-2 px-4 rounded-md flex items-center justify-between cursor-pointer transition-all duration-150 bg-transparent hover:bg-syntax-comment/40 text-syntax-variable",
    itemTitleActive: "text-base font-medium transition-colors duration-150 text-syntax-function",
    itemTitleInactive: "text-base font-medium transition-colors duration-150 text-syntax-variable",
    itemSubtitleActive: "text-xs font-mono px-2 py-0.5 rounded transition-colors duration-150 text-syntax-constant bg-bg-base border border-syntax-operator",
    itemSubtitleInactive: "text-xs font-mono px-2 py-0.5 rounded transition-colors duration-150 text-syntax-peach bg-syntax-comment border border-transparent"
  }
};
const log$5 = kernelLogger.child("Window");
let mainWindow = null;
function createMainWindow() {
  const cfg = getConfig();
  log$5.info("Creating main window with config", cfg);
  mainWindow = new BrowserWindow({
    width: cfg.windowWidth,
    height: 0,
    transparent: false,
    backgroundColor: "#141414",
    frame: false,
    alwaysOnTop: cfg.alwaysOnTop,
    skipTaskbar: !cfg.showInTaskbar,
    opacity: cfg.opacity,
    show: false,
    // position first, then show — avoids flicker
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      preload: path.join(import.meta.dirname, "preload.mjs")
    }
  });
  mainWindow.on("show", () => {
    mainWindow == null ? void 0 : mainWindow.webContents.send("window-show");
  });
  if (!cfg.startHidden) {
    try {
      const cursorPoint = screen.getCursorScreenPoint();
      const display = screen.getDisplayNearestPoint(cursorPoint);
      log$5.info(
        `Showing main window on display ${display.id} near cursor (${cursorPoint.x}, ${cursorPoint.y})`
      );
    } catch (err) {
      log$5.warn("Could not determine screen display before show", err);
    }
    mainWindow.show();
  }
  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(import.meta.dirname, "../dist/index.html"));
  }
}
const EXTENSION_DIR = path.join(os.homedir(), ".nuxy", "extensions");
function registerProtocols() {
  protocol.handle("nuxy-ext", async (request) => {
    const url = request.url.replace("nuxy-ext://", "");
    const [extId, ...rest] = url.split("/");
    const filePath = rest.join("/");
    const absolutePath = path.resolve(EXTENSION_DIR, extId, filePath);
    if (filePath.endsWith(".js") || filePath.endsWith(".jsx") || filePath.endsWith(".tsx")) {
      try {
        if (fs.existsSync(absolutePath)) {
          let code = fs.readFileSync(absolutePath, "utf8");
          if (filePath.endsWith(".jsx") || filePath.endsWith(".tsx") || code.includes("React.createElement") || /<[a-zA-Z]+/.test(code)) {
            let ts;
            try {
              ts = (await import("typescript")).default;
            } catch (err) {
              console.warn("TypeScript module not found for dynamic transpilation, serving raw file.");
            }
            if (ts) {
              const transpiled = ts.transpileModule(code, {
                compilerOptions: {
                  jsx: ts.JsxEmit.React,
                  module: ts.ModuleKind.ESNext,
                  target: ts.ScriptTarget.ESNext
                }
              });
              let output = transpiled.outputText;
              if (!output.includes("const React =")) {
                output = `const React = window.React;
` + output;
              }
              return new Response(output, {
                headers: {
                  "Content-Type": "application/javascript",
                  "Access-Control-Allow-Origin": "*"
                }
              });
            }
          }
        }
      } catch (err) {
        console.error(`Failed to dynamically transpile extension file ${absolutePath}:`, err);
      }
    }
    return net.fetch(`file://${absolutePath}`);
  });
}
const log$4 = kernelLogger.child("Spawn");
const activeWorkers = /* @__PURE__ */ new Map();
function spawnExtension(extId, entryFile) {
  const absolutePath = path.join(EXTENSION_DIR, extId, entryFile);
  log$4.info(`Spawning worker for extension "${extId}" → ${absolutePath}`);
  const logLevel = process.env.LOG_LEVEL ?? "info";
  const worker = new Worker(`
    const { parentPort } = require('worker_threads');

    // ── Minimal inline logger for worker context ──────────────────────────────
    const LEVELS = { silly: 0, info: 1, warn: 2, error: 3 };
    const C = {
      reset: '\\x1b[0m', bold: '\\x1b[1m', dim: '\\x1b[2m',
      silly: '\\x1b[35m', info: '\\x1b[36m', warn: '\\x1b[33m', error: '\\x1b[31m',
      time: '\\x1b[90m', ns: '\\x1b[34m',
    };
    const logLevel = '${logLevel}';
    function wlog(level, ns, msg, meta) {
      if (LEVELS[level] < LEVELS[logLevel]) return;
      const ts = new Date().toISOString().replace('T',' ').substring(0,23);
      const lbl = C[level] + C.bold + level.toUpperCase().padEnd(5) + C.reset;
      const nsp = C.ns + '[Worker:${extId}:' + ns + ']' + C.reset;
      const extra = meta !== undefined
        ? '\\n       ' + C.dim + JSON.stringify(meta) + C.reset : '';
      const line = C.time + ts + C.reset + ' ' + lbl + ' ' + nsp + ' ' + msg + extra;
      if (level === 'error') console.error(line);
      else if (level === 'warn') console.warn(line);
      else console.log(line);
    }
    // ─────────────────────────────────────────────────────────────────────────

    (async () => {
      let ext;
      wlog('info', 'Loader', 'Loading extension module: ${absolutePath.replace(/\\/g, "\\\\")}');
      try {
        const extModule = await import('file://${absolutePath.replace(/\\/g, "\\\\")}');
        wlog('info', 'Loader', 'Module loaded successfully. Keys: ' + Object.keys(extModule || {}).join(', '));
        if (extModule.default) {
          wlog('info', 'Loader', 'default keys: ' + Object.keys(extModule.default || {}).join(', '));
        }

        if (extModule && typeof extModule.register === 'function') {
          ext = extModule;
        } else if (extModule && extModule.default && typeof extModule.default.register === 'function') {
          ext = extModule.default;
        } else if (extModule && extModule.default && extModule.default.default && typeof extModule.default.default.register === 'function') {
          ext = extModule.default.default;
        } else {
          ext = extModule.default || extModule;
        }
      } catch (e) {
        wlog('error', 'Loader', 'Failed to load module: ' + e.message, { stack: e.stack });
      }

      // Host communication routing
      const pendingHostCalls = new Map();
      parentPort.on('message', (msg) => {
        if (msg && msg.type === 'host:reply') {
          const cb = pendingHostCalls.get(msg.id);
          if (cb) {
            pendingHostCalls.delete(msg.id);
            if (msg.error) cb.reject(new Error(msg.error));
            else cb.resolve(msg.result);
          }
        }
      });

      const callHost = (channel, payload) => {
        return new Promise((resolve, reject) => {
          const id = Math.random().toString(36).slice(2);
          pendingHostCalls.set(id, { resolve, reject });
          parentPort.postMessage({ type: 'host:call', id, channel, payload });
        });
      };

      const core = {
        ipc: {
          handle: (channel, handler) => {
            wlog('info', 'IPC', 'Registered handler for channel: ' + channel);
            parentPort.on('message', async (msg) => {
              if (msg && msg.channel === channel) {
                wlog('silly', 'IPC', 'Received message on channel: ' + channel, { id: msg.id, payload: msg.payload });
                try {
                  const res = await handler(msg.payload);
                  wlog('silly', 'IPC', 'Handler result for channel: ' + channel, res);
                  parentPort.postMessage({ id: msg.id, result: res });
                } catch (e) {
                  wlog('error', 'IPC', 'Handler threw on channel: ' + channel, { error: e.message });
                  parentPort.postMessage({ id: msg.id, error: e.message });
                }
              }
            });
          }
        },
        registry: {
          registerTool: (cfg) => {
            wlog('info', 'Registry', 'Registered Tool: ' + cfg.name, cfg);
          },
          registerProvider: (cfg) => {
            wlog('info', 'Registry', 'Registered Provider: ' + cfg.name, cfg);
          },
          registerOrchestrator: (cfg) => {
            wlog('info', 'Registry', 'Registered Orchestrator', cfg);
          }
        },
        clipboard: {
          readText: () => callHost('clipboard:readText'),
          writeText: (text) => callHost('clipboard:writeText', text),
        },
        storage: {
          read: (file) => callHost('storage:read', file),
          write: (file, data) => callHost('storage:write', { file, data }),
        },
        logger: {
          silly: (msg, meta) => wlog('silly', 'Ext', msg, meta),
          info:  (msg, meta) => wlog('info',  'Ext', msg, meta),
          warn:  (msg, meta) => wlog('warn',  'Ext', msg, meta),
          error: (msg, meta) => wlog('error', 'Ext', msg, meta),
        }
      };

      if (ext && ext.register) {
        wlog('info', 'Loader', 'Calling ext.register(core)...');
        try {
          ext.register(core);
          wlog('info', 'Loader', 'Extension registered successfully.');
        } catch (err) {
          wlog('error', 'Loader', 'Error during registration: ' + err.message, { stack: err.stack });
        }
      } else {
        wlog('warn', 'Loader', 'No register() function found on extension module.');
      }
    })();
  `, { eval: true });
  worker.on("message", async (msg) => {
    if (msg && msg.type === "host:call") {
      const { id, channel, payload } = msg;
      try {
        if (channel === "clipboard:readText") {
          const text = clipboard.readText();
          worker.postMessage({ type: "host:reply", id, result: text });
        } else if (channel === "clipboard:writeText") {
          clipboard.writeText(payload);
          worker.postMessage({ type: "host:reply", id, result: true });
        } else if (channel === "storage:read") {
          const dataDir = path.join(os.homedir(), ".config", "nuxy", "data", extId);
          const filePath = path.join(dataDir, payload);
          const resolvedPath = path.resolve(filePath);
          if (!resolvedPath.startsWith(dataDir)) {
            throw new Error("Access denied: Path traversal detected.");
          }
          if (fs.existsSync(resolvedPath)) {
            const fileContent = fs.readFileSync(resolvedPath, "utf8");
            worker.postMessage({ type: "host:reply", id, result: JSON.parse(fileContent) });
          } else {
            worker.postMessage({ type: "host:reply", id, result: null });
          }
        } else if (channel === "storage:write") {
          const { file, data } = payload;
          const dataDir = path.join(os.homedir(), ".config", "nuxy", "data", extId);
          const filePath = path.join(dataDir, file);
          const resolvedPath = path.resolve(filePath);
          if (!resolvedPath.startsWith(dataDir)) {
            throw new Error("Access denied: Path traversal detected.");
          }
          if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
          }
          fs.writeFileSync(resolvedPath, JSON.stringify(data, null, 2), "utf8");
          worker.postMessage({ type: "host:reply", id, result: true });
        }
      } catch (err) {
        log$4.error(`Host call error on channel "${channel}" in extension "${extId}"`, { error: err.message });
        worker.postMessage({ type: "host:reply", id, error: err.message });
      }
    }
  });
  worker.on("error", (err) => {
    log$4.error(`Worker for "${extId}" emitted an error`, { message: err.message, stack: err.stack });
  });
  worker.on("exit", (code) => {
    if (code !== 0) {
      log$4.warn(`Worker for "${extId}" exited with code ${code}`);
    } else {
      log$4.silly(`Worker for "${extId}" exited cleanly.`);
    }
    for (const [key, val] of activeWorkers.entries()) {
      if (val === worker) {
        activeWorkers.delete(key);
      }
    }
  });
  activeWorkers.set(extId, worker);
  log$4.silly(`Worker registered in activeWorkers map. Active workers: ${[...activeWorkers.keys()].join(", ")}`);
  return worker;
}
const log$3 = kernelLogger.child("Scanner");
const loadedExtensions = [];
async function scanExtensions() {
  log$3.info(`Scanning extension directory: ${EXTENSION_DIR}`);
  {
    try {
      const { copyDefaultExtensions } = await import("./extensions-801957c5.js");
      copyDefaultExtensions();
    } catch (err) {
      log$3.error("Failed to run developer-only setup:", err);
    }
  }
  const items = fs.readdirSync(EXTENSION_DIR);
  log$3.silly(`Found ${items.length} item(s) in extension dir`, items);
  for (const item of items) {
    const itemPath = path.join(EXTENSION_DIR, item);
    if (!fs.statSync(itemPath).isDirectory()) {
      log$3.silly(`Skipping non-directory item: ${item}`);
      continue;
    }
    const manifestPath = path.join(itemPath, "manifest.json");
    if (!fs.existsSync(manifestPath)) {
      log$3.silly(`No manifest.json found for: ${item} — skipping.`);
      continue;
    }
    try {
      const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
      log$3.silly(`Parsed manifest for extension "${item}"`, manifest);
      if (manifest.entry && manifest.entry.backend) {
        log$3.info(`Loading extension: ${item} (backend: ${manifest.entry.backend})`);
        const worker = spawnExtension(item, manifest.entry.backend);
        if (manifest.id && manifest.id !== item) {
          activeWorkers.set(manifest.id, worker);
          log$3.info(`Registered manifest ID alias: ${item} -> ${manifest.id}`);
        }
        log$3.info(`Sandboxed worker started for extension: ${item}`);
      } else {
        log$3.warn(`Extension "${item}" has no backend entry — skipping.`);
      }
      loadedExtensions.push({
        id: item,
        manifest
      });
    } catch (e) {
      log$3.error(`Failed to load extension "${item}"`, e);
    }
  }
  log$3.info("Extension scan complete.");
}
const log$2 = kernelLogger.child("Spring");
const DEFAULTS = {
  stiffnessXY: 0.14,
  stiffnessWH: 0.14,
  damping: 0.3,
  restThreshold: 0.5,
  intervalMs: 4
};
class WindowSpringController {
  constructor(win, config = {}) {
    __publicField(this, "win");
    __publicField(this, "cfg");
    __publicField(this, "s");
    __publicField(this, "timer", null);
    this.win = win;
    this.cfg = { ...DEFAULTS, ...config };
    const b = win.getBounds();
    this.s = {
      x: b.x,
      y: b.y,
      w: b.width,
      h: b.height,
      vx: 0,
      vy: 0,
      vw: 0,
      vh: 0,
      tx: b.x,
      ty: b.y,
      tw: b.width,
      th: b.height
    };
  }
  /**
   * Update the animation target. Safe to call at any time, including
   * mid-animation — velocity is preserved and the spring curves naturally.
   * Omitted axes keep their current target.
   */
  setTarget(target) {
    if (target.x !== void 0)
      this.s.tx = target.x;
    if (target.y !== void 0)
      this.s.ty = target.y;
    if (target.width !== void 0)
      this.s.tw = target.width;
    if (target.height !== void 0)
      this.s.th = target.height;
    this._start();
  }
  /**
   * Sync internal spring state from the window's actual current bounds.
   * Call this after externally moving the window (e.g. drag) so future
   * animations start from the correct position.
   */
  syncState() {
    if (this.win.isDestroyed())
      return;
    this._stop();
    const b = this.win.getBounds();
    this.s.x = b.x;
    this.s.y = b.y;
    this.s.w = b.width;
    this.s.h = b.height;
    this.s.tx = b.x;
    this.s.ty = b.y;
    this.s.tw = b.width;
    this.s.th = b.height;
    this.s.vx = 0;
    this.s.vy = 0;
    this.s.vw = 0;
    this.s.vh = 0;
  }
  /** Instantly jump to the current target, cancelling the animation. */
  snapToTarget() {
    const s = this.s;
    s.w = s.tw;
    s.h = s.th;
    s.x = s.tx;
    s.y = s.ty;
    s.vx = 0;
    s.vy = 0;
    s.vw = 0;
    s.vh = 0;
    this._stop();
    if (!this.win.isDestroyed()) {
      this.win.setBounds({
        x: Math.round(s.x),
        y: Math.round(s.y),
        width: Math.max(1, Math.round(s.w)),
        height: Math.max(1, Math.round(s.h))
      });
      log$2.info(`Physical window bounds after snapToTarget:`, this.win.getBounds());
    }
  }
  pause() {
    this._stop();
  }
  resume() {
    const s = this.s;
    const moving = Math.abs(s.tx - s.x) >= this.cfg.restThreshold || Math.abs(s.ty - s.y) >= this.cfg.restThreshold || Math.abs(s.tw - s.w) >= this.cfg.restThreshold || Math.abs(s.th - s.h) >= this.cfg.restThreshold;
    if (moving)
      this._start();
  }
  isAnimating() {
    return this.timer !== null;
  }
  destroy() {
    this._stop();
  }
  // ── internals ───────────────────────────────────────────────────────────────
  _start() {
    if (this.timer !== null)
      return;
    this.timer = setInterval(() => this._tick(), this.cfg.intervalMs);
  }
  _stop() {
    if (this.timer !== null) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }
  _tick() {
    if (this.win.isDestroyed()) {
      this._stop();
      return;
    }
    const { stiffnessXY: sXY, stiffnessWH: sWH, damping: d } = this.cfg;
    const s = this.s;
    s.vw = (s.vw + (s.tw - s.w) * sWH) * d;
    s.vh = (s.vh + (s.th - s.h) * sWH) * d;
    s.w += s.vw;
    s.h += s.vh;
    s.vx = (s.vx + (s.tx - s.x) * sXY) * d;
    s.vy = (s.vy + (s.ty - s.y) * sXY) * d;
    s.x += s.vx;
    s.y += s.vy;
    const r = this.cfg.restThreshold;
    const atRest = Math.abs(s.tw - s.w) < r && Math.abs(s.th - s.h) < r && Math.abs(s.vw) < 0.5 && Math.abs(s.vh) < 0.5 && Math.abs(s.tx - s.x) < r && Math.abs(s.ty - s.y) < r && Math.abs(s.vx) < 0.5 && Math.abs(s.vy) < 0.5;
    if (atRest) {
      s.w = s.tw;
      s.h = s.th;
      s.x = s.tx;
      s.y = s.ty;
      s.vx = 0;
      s.vy = 0;
      s.vw = 0;
      s.vh = 0;
      this.win.setBounds({
        x: Math.round(s.tx),
        y: Math.round(s.ty),
        width: Math.max(1, Math.round(s.tw)),
        height: Math.max(1, Math.round(s.th))
      });
      this._stop();
      log$2.silly(
        `Spring at rest: (${Math.round(s.x)}, ${Math.round(s.y)}) ${Math.round(s.w)}x${Math.round(s.h)}`
      );
      return;
    }
    this.win.setBounds({
      x: Math.round(s.x),
      y: Math.round(s.y),
      width: Math.max(1, Math.round(s.w)),
      height: Math.max(1, Math.round(s.h))
    });
  }
}
const registry = /* @__PURE__ */ new WeakMap();
function getOrCreateSpring(win, config) {
  let ctrl = registry.get(win);
  if (!ctrl) {
    ctrl = new WindowSpringController(win, config);
    registry.set(win, ctrl);
    win.once("closed", () => {
      ctrl.destroy();
      registry.delete(win);
    });
  }
  return ctrl;
}
const log$1 = kernelLogger.child("IPC");
let hoppidikInterval = null;
let dragOffset = null;
function registerIpc() {
  log$1.info("Registering IPC handlers...");
  ipcMain.handle("ext:invoke", async (event, extId, channel, payload) => {
    log$1.silly(`ext:invoke received`, { extId, channel, payload });
    if (extId === "kernel" || extId === "core") {
      if (channel === "listTools") {
        const tools = loadedExtensions.filter((ext) => ext.manifest && ext.manifest.type === "tool");
        return { success: true, data: tools };
      }
      if (channel === "listProviders") {
        const providers = loadedExtensions.filter((ext) => ext.manifest && ext.manifest.type === "provider");
        return { success: true, data: providers };
      }
      if (channel === "getTheme") {
        const cfg = getConfig();
        let themeName = cfg.theme || "dark";
        if (themeName === "system") {
          const { nativeTheme } = await import("electron");
          themeName = nativeTheme.shouldUseDarkColors ? "dark" : "light";
        }
        const themePath = path.join(THEMES_DIR, `${themeName}.json`);
        try {
          if (fs.existsSync(themePath)) {
            const content = fs.readFileSync(themePath, "utf8");
            return { success: true, data: JSON.parse(content) };
          }
        } catch (e) {
          log$1.error(`Failed to read theme ${themeName} from ${themePath}:`, e);
        }
        return { success: true, data: DEFAULT_DARK_THEME };
      }
    }
    const worker = activeWorkers.get(extId);
    if (!worker) {
      log$1.warn(`ext:invoke — no active worker for extId: "${extId}"`);
      return { success: false, error: "Worker not found" };
    }
    return new Promise((resolve) => {
      const msgId = Math.random().toString(36).slice(2);
      log$1.silly(`Dispatching message to worker "${extId}"`, { msgId, channel, payload });
      const listener = (msg) => {
        if (msg.id === msgId) {
          worker.off("message", listener);
          if (msg.error) {
            log$1.warn(`Worker "${extId}" replied with error on channel "${channel}"`, msg.error);
            resolve({ success: false, error: msg.error });
          } else {
            log$1.silly(`Worker "${extId}" replied on channel "${channel}"`, msg.result);
            resolve({ success: true, data: msg.result });
          }
        }
      };
      worker.on("message", listener);
      worker.postMessage({ id: msgId, channel, payload });
    });
  });
  ipcMain.on("window:resize", (event, width, height) => {
    log$1.silly(`window:resize → ${width}x${height}`);
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win) {
      log$1.warn("window:resize — no BrowserWindow for sender");
      return;
    }
    if (hoppidikInterval) {
      log$1.silly("window:resize ignored because hoppidik is active");
      return;
    }
    try {
      const bounds = win.getBounds();
      const [cw, ch] = win.getContentSize();
      const frameW = bounds.width - cw;
      const frameH = bounds.height - ch;
      const scale = screen$1.getDisplayMatching(bounds).scaleFactor;
      const targetW = Math.round(width * scale) + frameW;
      const targetH = Math.round(height * scale) + frameH;
      log$1.silly(`window:resize target → ${targetW}x${targetH} (scale=${scale})`);
      const spring = getOrCreateSpring(win);
      spring.setTarget({
        width: targetW,
        height: targetH
      });
      if (!win.isVisible() || bounds.height < 100) {
        spring.snapToTarget();
        log$1.info(`Window snapped instantly to target size (${targetW}x${targetH})`);
      }
    } catch (error) {
      log$1.error("window:resize failed, falling back to instant resize", error);
      win.setContentSize(width, height);
    }
  });
  ipcMain.on("window:center", (_event) => {
    log$1.silly("window:center received — centering disabled");
  });
  ipcMain.on("window:dragStart", (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win || win.isDestroyed())
      return;
    const cursor = screen$1.getCursorScreenPoint();
    const [wx, wy] = win.getPosition();
    dragOffset = { x: wx - cursor.x, y: wy - cursor.y };
    getOrCreateSpring(win).pause();
    log$1.silly(`window:dragStart offset=(${dragOffset.x}, ${dragOffset.y})`);
  });
  ipcMain.on("window:dragMove", (event) => {
    if (!dragOffset)
      return;
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win || win.isDestroyed())
      return;
    const cursor = screen$1.getCursorScreenPoint();
    win.setPosition(
      Math.round(cursor.x + dragOffset.x),
      Math.round(cursor.y + dragOffset.y)
    );
  });
  ipcMain.on("window:dragEnd", (event) => {
    if (!dragOffset)
      return;
    dragOffset = null;
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win || win.isDestroyed())
      return;
    getOrCreateSpring(win).syncState();
    log$1.silly(`window:dragEnd — spring synced to ${JSON.stringify(win.getBounds())}`);
  });
  ipcMain.on("window:hide", (event) => {
    log$1.info("window:hide received — hiding main window.");
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win) {
      if (hoppidikInterval) {
        clearInterval(hoppidikInterval);
        hoppidikInterval = null;
        log$1.info("Cleared hoppidikInterval due to window:hide");
      }
      win.hide();
    } else {
      log$1.warn("window:hide — no BrowserWindow for sender");
    }
  });
  ipcMain.on("window:startHoppidik", (event) => {
    log$1.info("window:startHoppidik received");
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win) {
      log$1.warn("window:startHoppidik — no BrowserWindow for sender");
      return;
    }
    if (hoppidikInterval)
      return;
    const spring = getOrCreateSpring(win);
    const hop = () => {
      try {
        if (win.isDestroyed()) {
          if (hoppidikInterval) {
            clearInterval(hoppidikInterval);
            hoppidikInterval = null;
          }
          return;
        }
        const bounds = win.getBounds();
        const display = screen$1.getDisplayMatching(bounds);
        const displayBounds = display.bounds;
        const randomHeight = Math.floor(Math.random() * (700 - 150 + 1)) + 150;
        const w = bounds.width;
        const maxX = displayBounds.x + displayBounds.width - w;
        const minX = displayBounds.x;
        const randomX = Math.floor(Math.random() * (maxX - minX + 1)) + minX;
        const maxY = displayBounds.y + displayBounds.height - randomHeight;
        const minY = displayBounds.y;
        const randomY = Math.floor(Math.random() * (maxY - minY + 1)) + minY;
        log$1.info(`Hoppidik bounce to (${randomX}, ${randomY}) with height ${randomHeight}`);
        spring.setTarget({
          x: randomX,
          y: randomY,
          height: randomHeight
        });
      } catch (e) {
        log$1.error("Hoppidik bounce calculation failed", e);
      }
    };
    hop();
    hoppidikInterval = setInterval(hop, 800);
  });
  ipcMain.on("window:stopHoppidik", (event) => {
    log$1.info("window:stopHoppidik received");
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win) {
      log$1.warn("window:stopHoppidik — no BrowserWindow for sender");
      return;
    }
    if (hoppidikInterval) {
      clearInterval(hoppidikInterval);
      hoppidikInterval = null;
      log$1.info("Stopped hoppidik interval");
    }
    log$1.info("Hoppidik stopped");
  });
  log$1.info("IPC handlers registered: [ext:invoke, window:resize, window:center, window:hide, window:startHoppidik, window:stopHoppidik]");
}
if (process.platform === "linux") {
  app.commandLine.appendSwitch("ozone-platform", "x11");
}
const log = kernelLogger.child("App");
const gotTheLock = app.requestSingleInstanceLock();
protocol.registerSchemesAsPrivileged([
  { scheme: "nuxy-ext", privileges: { secure: true, standard: true, supportFetchAPI: true, bypassCSP: true, corsEnabled: true } }
]);
if (!gotTheLock) {
  log.warn("Another instance is already running — quitting.");
  app.quit();
} else {
  app.on("second-instance", () => {
    log.info("Second instance attempted — focusing existing window.");
    try {
      reloadConfig();
    } catch (err) {
      log.error("Failed to reload config on second-instance:", err);
    }
    const wins = BrowserWindow.getAllWindows();
    if (wins.length > 0) {
      const win = wins[0];
      try {
        const cursorPoint = screen$1.getCursorScreenPoint();
        const display = screen$1.getDisplayNearestPoint(cursorPoint);
        if (!win.isVisible()) {
          log.info(`Showing window on display ${display.id} near cursor coordinates (${cursorPoint.x}, ${cursorPoint.y})`);
          win.show();
        } else {
          log.info(`Window is already visible. Focusing window on display ${display.id} near cursor coordinates (${cursorPoint.x}, ${cursorPoint.y})`);
        }
      } catch (err) {
        log.warn("Could not determine screen display before second-instance show/focus", err);
        if (!win.isVisible())
          win.show();
      }
      if (win.isMinimized())
        win.restore();
      win.focus();
      win.webContents.send("window-show");
    }
  });
  app.whenReady().then(async () => {
    log.info("Electron app ready. Bootstrapping kernel...");
    log.silly("Registering custom protocols (nuxy-ext)");
    registerProtocols();
    log.silly("Registering IPC handlers");
    registerIpc();
    log.info("Scanning extensions...");
    await scanExtensions();
    log.info("Creating main window...");
    createMainWindow();
    app.on("activate", () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        log.info("App activated with no windows — creating main window.");
        createMainWindow();
      }
    });
    log.info("Kernel bootstrap complete.");
  });
  app.on("window-all-closed", () => {
    log.info("All windows closed.");
    if (process.platform !== "darwin") {
      log.silly("Platform is not darwin — quitting app.");
      app.quit();
    }
  });
}
export {
  EXTENSION_DIR as E,
  kernelLogger as k
};
