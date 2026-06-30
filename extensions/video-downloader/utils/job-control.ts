import type { IpcInvokeContext } from '@nuxyorg/core'

export interface ControlledJob {
  controllerExtId: string
}

/** Cross-extension pause/resume/cancel requires matching job controller or same-extension UI. */
export function assertJobControl(
  job: ControlledJob,
  selfExtId: string,
  context?: IpcInvokeContext
): void {
  const callerExtId = context?.callerExtId
  if (callerExtId === undefined || callerExtId === selfExtId) return
  if (callerExtId === job.controllerExtId) return
  throw new Error('Not authorized to control this job')
}
