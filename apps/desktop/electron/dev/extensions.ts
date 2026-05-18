/// <reference types="vite/client" />
import fs from 'fs';
import path from 'path';
import { EXTENSION_DIR } from '../config.js';
import { kernelLogger } from '../../../../packages/core/src/logger.js';

const log = kernelLogger.child('DevScanner');

export const DEFAULT_EXTENSIONS_DIR = path.join(import.meta.dirname, '../../../../extensions');

export function copyDefaultExtensions() {
  log.info(`Developer environment detected. Checking extensions in ${DEFAULT_EXTENSIONS_DIR}...`);
  if (fs.existsSync(DEFAULT_EXTENSIONS_DIR)) {
    try {
      if (!fs.existsSync(EXTENSION_DIR)) {
        fs.mkdirSync(EXTENSION_DIR, { recursive: true });
      }
      
      const defaultExts = fs.readdirSync(DEFAULT_EXTENSIONS_DIR);
      for (const ext of defaultExts) {
        const srcPath = path.join(DEFAULT_EXTENSIONS_DIR, ext);
        if (fs.statSync(srcPath).isDirectory()) {
          const destPath = path.join(EXTENSION_DIR, ext);
          log.info(`Copying/Overwriting default workspace extension: ${ext}`);
          if (fs.existsSync(destPath)) {
            fs.rmSync(destPath, { recursive: true, force: true });
          }
          fs.cpSync(srcPath, destPath, { recursive: true });
        }
      }
      log.info('Workspace default extensions copied successfully.');
    } catch (err) {
      log.error('Failed to copy workspace extensions in dev mode:', err);
    }
  }
}
