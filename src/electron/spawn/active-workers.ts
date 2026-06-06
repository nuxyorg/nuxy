import type { Worker } from 'worker_threads'

export const activeWorkers = new Map<string, Worker>()

// fallow-ignore-next-line unused-type
export type WorkerExitListener = (extId: string, code: number) => void

export const workerExitListeners = new Set<WorkerExitListener>()

// fallow-ignore-next-line unused-type
export type WorkerRegistryErrorListener = (extId: string) => void

export const workerRegistryErrorListeners = new Set<WorkerRegistryErrorListener>()
