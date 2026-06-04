import type { Worker } from 'worker_threads'

export const activeWorkers = new Map<string, Worker>()

export type WorkerExitListener = (extId: string, code: number) => void

export const workerExitListeners = new Set<WorkerExitListener>()

export type WorkerRegistryErrorListener = (extId: string) => void

export const workerRegistryErrorListeners = new Set<WorkerRegistryErrorListener>()
