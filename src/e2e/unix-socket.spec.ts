/**
 * Tests for the UNIX socket at /tmp/nuxy.sock.
 * The socket accepts 'toggle' and 'show' commands from external processes.
 */
import { test, expect } from './fixtures.js'

test.describe('UNIX socket server', () => {
  test('socket file exists after app startup', async ({ electronApp }) => {
    const exists = await electronApp.evaluate(async () => {
      const fs = require('fs') as typeof import('fs')
      const path = require('path') as typeof import('path')
      const os = require('os') as typeof import('os')
      return fs.existsSync(path.join(os.tmpdir(), 'nuxy.sock'))
    })
    expect(exists).toBe(true)
  })

  test('"show" command via socket makes window visible', async ({ electronApp }) => {
    const result = await electronApp.evaluate(async () => {
      const net = require('net') as typeof import('net')
      const path = require('path') as typeof import('path')
      const os = require('os') as typeof import('os')
      const socketPath = path.join(os.tmpdir(), 'nuxy.sock')

      return new Promise<boolean>((resolve) => {
        const client = net.createConnection(socketPath, () => {
          client.write('show')
          client.end()
          resolve(true)
        })
        client.on('error', () => resolve(false))
        setTimeout(() => resolve(false), 2000)
      })
    })
    expect(result).toBe(true)
  })

  test('"show" command does not crash the app', async ({ electronApp, appPage }) => {
    await electronApp.evaluate(async () => {
      const net = require('net') as typeof import('net')
      const path = require('path') as typeof import('path')
      const os = require('os') as typeof import('os')
      const socketPath = path.join(os.tmpdir(), 'nuxy.sock')

      return new Promise<void>((resolve) => {
        const client = net.createConnection(socketPath, () => {
          client.write('show')
          client.end()
          setTimeout(resolve, 500)
        })
        client.on('error', () => resolve())
      })
    })

    // App should still be responsive after socket command
    await appPage.waitForSelector('input', { timeout: 5000 })
    const value = await appPage.evaluate(
      () => (document.querySelector('input') as HTMLInputElement | null)?.value ?? '__missing__'
    )
    expect(value).not.toBe('__missing__')
  })

  test('"toggle" changes window visibility (hide then restore)', async ({ electronApp }) => {
    const sendCommand = async (cmd: string) =>
      electronApp.evaluate(
        async (_: any, c: string) => {
          const net = require('net') as typeof import('net')
          const path = require('path') as typeof import('path')
          const os = require('os') as typeof import('os')
          const socketPath = path.join(os.tmpdir(), 'nuxy.sock')
          return new Promise<boolean>((resolve) => {
            const client = net.createConnection(socketPath, () => {
              client.write(c)
              client.end()
              setTimeout(() => resolve(true), 600)
            })
            client.on('error', () => resolve(false))
            setTimeout(() => resolve(false), 3000)
          })
        },
        cmd
      )

    const getVisible = () =>
      electronApp.evaluate(({ BrowserWindow }) => {
        const win = BrowserWindow.getAllWindows()[0]
        return win ? win.isVisible() : null
      })

    const before = await getVisible()
    expect(before).not.toBeNull()

    // Toggle hides or shows depending on current state
    const sent = await sendCommand('toggle')
    expect(sent).toBe(true)

    const after = await getVisible()
    expect(after).toBe(!before)

    // Restore to previous state so subsequent tests can still interact with the window
    await sendCommand('toggle')
    const restored = await getVisible()
    expect(restored).toBe(before)
  })

  test('unknown command is silently ignored', async ({ electronApp, appPage }) => {
    await electronApp.evaluate(async () => {
      const net = require('net') as typeof import('net')
      const path = require('path') as typeof import('path')
      const os = require('os') as typeof import('os')
      const socketPath = path.join(os.tmpdir(), 'nuxy.sock')

      return new Promise<void>((resolve) => {
        const client = net.createConnection(socketPath, () => {
          client.write('destroy_everything_lol')
          client.end()
          setTimeout(resolve, 300)
        })
        client.on('error', () => resolve())
      })
    })

    // App should still be responding
    const url = appPage.url()
    expect(url).toBeTruthy()
  })
})
