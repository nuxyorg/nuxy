import { Worker } from 'worker_threads';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { clipboard } from 'electron';
import { EXTENSION_DIR } from '../config.js';
import { kernelLogger } from '../../../../packages/core/src/logger.js';

const log = kernelLogger.child('Spawn');

export const activeWorkers = new Map<string, Worker>();

export function spawnExtension(extId: string, entryFile: string) {
  const absolutePath = path.join(EXTENSION_DIR, extId, entryFile);
  log.info(`Spawning worker for extension "${extId}" → ${absolutePath}`);

  // currentLevel is forwarded so the worker uses the same LOG_LEVEL
  const logLevel = process.env.LOG_LEVEL ?? 'info';

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
      wlog('info', 'Loader', 'Loading extension module: ${absolutePath.replace(/\\/g, '\\\\')}');
      try {
        const extModule = await import('file://${absolutePath.replace(/\\/g, '\\\\')}');
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

  worker.on('message', async (msg) => {
    if (msg && msg.type === 'host:call') {
      const { id, channel, payload } = msg;
      try {
        if (channel === 'clipboard:readText') {
          const text = clipboard.readText();
          worker.postMessage({ type: 'host:reply', id, result: text });
        } else if (channel === 'clipboard:writeText') {
          clipboard.writeText(payload);
          worker.postMessage({ type: 'host:reply', id, result: true });
        } else if (channel === 'storage:read') {
          // Sandboxed storage logic
          const dataDir = path.join(os.homedir(), '.config', 'nuxy', 'data', extId);
          const filePath = path.join(dataDir, payload);
          const resolvedPath = path.resolve(filePath);
          if (!resolvedPath.startsWith(dataDir)) {
            throw new Error('Access denied: Path traversal detected.');
          }
          if (fs.existsSync(resolvedPath)) {
            const fileContent = fs.readFileSync(resolvedPath, 'utf8');
            worker.postMessage({ type: 'host:reply', id, result: JSON.parse(fileContent) });
          } else {
            worker.postMessage({ type: 'host:reply', id, result: null });
          }
        } else if (channel === 'storage:write') {
          // Sandboxed storage logic
          const { file, data } = payload;
          const dataDir = path.join(os.homedir(), '.config', 'nuxy', 'data', extId);
          const filePath = path.join(dataDir, file);
          const resolvedPath = path.resolve(filePath);
          if (!resolvedPath.startsWith(dataDir)) {
            throw new Error('Access denied: Path traversal detected.');
          }
          if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
          }
          fs.writeFileSync(resolvedPath, JSON.stringify(data, null, 2), 'utf8');
          worker.postMessage({ type: 'host:reply', id, result: true });
        }
      } catch (err: any) {
        log.error(`Host call error on channel "${channel}" in extension "${extId}"`, { error: err.message });
        worker.postMessage({ type: 'host:reply', id, error: err.message });
      }
    }
  });

  worker.on('error', (err) => {
    log.error(`Worker for "${extId}" emitted an error`, { message: err.message, stack: err.stack });
  });

  worker.on('exit', (code) => {
    if (code !== 0) {
      log.warn(`Worker for "${extId}" exited with code ${code}`);
    } else {
      log.silly(`Worker for "${extId}" exited cleanly.`);
    }
    for (const [key, val] of activeWorkers.entries()) {
      if (val === worker) {
        activeWorkers.delete(key);
      }
    }
  });

  activeWorkers.set(extId, worker);
  log.silly(`Worker registered in activeWorkers map. Active workers: ${[...activeWorkers.keys()].join(', ')}`);
  return worker;
}
