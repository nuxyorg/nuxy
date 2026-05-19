import type { Worker } from 'worker_threads'

export const activeWorkers = new Map<string, Worker>()
