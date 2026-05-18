import fs from "fs";
import path from "path";
import { E as EXTENSION_DIR, k as kernelLogger } from "./main-7c47db97.js";
import "electron";
import "os";
import "worker_threads";
const log = kernelLogger.child("DevScanner");
const DEFAULT_EXTENSIONS_DIR = path.join(import.meta.dirname, "../../../../extensions");
function copyDefaultExtensions() {
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
      log.info("Workspace default extensions copied successfully.");
    } catch (err) {
      log.error("Failed to copy workspace extensions in dev mode:", err);
    }
  }
}
export {
  DEFAULT_EXTENSIONS_DIR,
  copyDefaultExtensions
};
