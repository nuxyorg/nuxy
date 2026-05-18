/// <reference types="vite/client" />
import { app } from 'electron';
import fs from 'fs';
import path from 'path';
import { EXTENSION_DIR } from './config.js';
import { spawnExtension, activeWorkers } from './worker/spawn.js';
import { kernelLogger } from '../../../packages/core/src/logger.js';

const log = kernelLogger.child('Scanner');

export const loadedExtensions: any[] = [];

export async function scanExtensions() {
  log.info(`Scanning extension directory: ${EXTENSION_DIR}`);

  if (import.meta.env.DEV) {
    try {
      const { copyDefaultExtensions } = await import('./dev/extensions.js');
      copyDefaultExtensions();
    } catch (err) {
      log.error('Failed to run developer-only setup:', err);
    }
  } else {
    // Production Mode: NEVER use or copy DEFAULT_EXTENSIONS_DIR.
    // Just ensure EXTENSION_DIR exists.
    if (!fs.existsSync(EXTENSION_DIR)) {
      log.warn(`Extension directory not found — creating: ${EXTENSION_DIR}`);
      fs.mkdirSync(EXTENSION_DIR, { recursive: true });
    }
  }

  const items = fs.readdirSync(EXTENSION_DIR);
  log.silly(`Found ${items.length} item(s) in extension dir`, items);

  for (const item of items) {
    const itemPath = path.join(EXTENSION_DIR, item);
    if (!fs.statSync(itemPath).isDirectory()) {
      log.silly(`Skipping non-directory item: ${item}`);
      continue;
    }

    const manifestPath = path.join(itemPath, 'manifest.json');
    if (!fs.existsSync(manifestPath)) {
      log.silly(`No manifest.json found for: ${item} — skipping.`);
      continue;
    }

    try {
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
      log.silly(`Parsed manifest for extension "${item}"`, manifest);

      if (manifest.entry && manifest.entry.backend) {
        log.info(`Loading extension: ${item} (backend: ${manifest.entry.backend})`);
        const worker = spawnExtension(item, manifest.entry.backend);
        if (manifest.id && manifest.id !== item) {
          activeWorkers.set(manifest.id, worker);
          log.info(`Registered manifest ID alias: ${item} -> ${manifest.id}`);
        }
        log.info(`Sandboxed worker started for extension: ${item}`);
      } else {
        log.warn(`Extension "${item}" has no backend entry — skipping.`);
      }

      loadedExtensions.push({
        id: item,
        manifest
      });
    } catch (e) {
      log.error(`Failed to load extension "${item}"`, e);
    }
  }

  log.info('Extension scan complete.');
}
