import type { Worker } from 'worker_threads'

export const activeWorkers = new Map<string, Worker>()

// fallow-ignore-next-line unused-type
export type WorkerExitListener = (extId: string, code: number) => void

export const workerExitListeners = new Set<WorkerExitListener>()

// fallow-ignore-next-line unused-type
export type WorkerRegistryErrorListener = (extId: string) => void

export const workerRegistryErrorListeners = new Set<WorkerRegistryErrorListener>()

/** extIds whose non-zero exit is intentional (e.g. shell refresh). Suppresses WARN log and crash-restart. */
export const suppressedWorkerExits = new Set<string>()
