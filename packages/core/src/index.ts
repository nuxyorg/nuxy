export interface CoreContext {
  storage: {
    read: <T>(file: string) => Promise<T>;
    write: <T>(file: string, data: T) => Promise<void>;
  };
  ipc: {
    handle: <T, R>(channel: string, handler: (payload: T) => Promise<any>) => void;
    broadcast: <T>(channel: string, payload: T) => void;
  };
  registry: {
    registerTool: (config: any) => void;
    registerProvider: (config: any) => void;
    registerOrchestrator: (handler: any) => void;
  };
  /** Scoped logger injected by the Kernel. Use this instead of console.log. */
  logger: {
    silly: (msg: string, meta?: unknown) => void;
    info:  (msg: string, meta?: unknown) => void;
    warn:  (msg: string, meta?: unknown) => void;
    error: (msg: string, meta?: unknown) => void;
  };
}

export { createLogger, kernelLogger } from './logger.js';
export type { Logger, LogLevel } from './logger.js';
