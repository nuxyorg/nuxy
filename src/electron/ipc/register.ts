/// <reference types="vite/client" />
import { ipcMain } from 'electron'
import { kernelLogger } from '@nuxyorg/core'
import { validateExtInvokeArgs } from './validate.js'
import { handleKernelChannel } from './kernel-channels.js'
import { registerWindowChannels } from './window-channels.js'
import { registerDeeplinkChannels } from './deeplink-channels.js'
import { invokeWorker } from './worker-invoke.js'

const log = kernelLogger.child('IPC')

export function registerIpc() {
  log.info('Registering IPC handlers...')

  ipcMain.handle(
    'ext:invoke',
    async (
      _event,
      extId: unknown,
      channel: unknown,
      payload: unknown,
      options?: { callerExtId?: string }
    ) => {
      const validated = validateExtInvokeArgs(extId, channel, payload, options?.callerExtId)
      if (!validated.ok) return validated.result

      const { extId: id, channel: ch, payload: pl } = validated
      log.silly(`ext:invoke`, { extId: id, channel: ch, payload: pl })

      if (id === 'kernel') {
        return handleKernelChannel(ch, pl)
      }

      return invokeWorker(id, ch, pl, options?.callerExtId)
    }
  )

  registerWindowChannels()
  registerDeeplinkChannels()

  log.info('IPC handlers registered.')
}
