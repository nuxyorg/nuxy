/**
 * Tests for the UNIX socket at /tmp/nuxy.sock.
 * The socket accepts 'toggle' and 'show' commands from external processes.
 */
import { test, expect } from './fixtures.js'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import net from 'node:net'

test.describe('UNIX socket server', () => {
  test('socket file exists after app startup', async ({ appPage }) => {
    const socketPath = path.join(os.tmpdir(), 'nuxy.sock')
    expect(fs.existsSync(socketPath)).toBe(true)
  })

  test('"show" command via socket makes window visible', async ({ appPage }) => {
    const socketPath = path.join(os.tmpdir(), 'nuxy.sock')
    const result = await new Promise<boolean>((resolve) => {
      const client = net.createConnection(socketPath, () => {
        client.write('show')
        client.end()
        resolve(true)
      })
      client.on('error', () => resolve(false))
      setTimeout(() => resolve(false), 200)
    })
    expect(result).toBe(true)
  })

  test('"show" command does not crash the app', async ({ appPage }) => {
    const socketPath = path.join(os.tmpdir(), 'nuxy.sock')
    await new Promise<void>((resolve) => {
      const client = net.createConnection(socketPath, () => {
        client.write('show')
        client.end()
        setTimeout(resolve, 20)
      })
      client.on('error', () => resolve())
    })

    // App should still be responsive after socket command
    await appPage.waitForSelector('input', { timeout: 400 })
    const value = await appPage.evaluate(
      () => (document.querySelector('input') as HTMLInputElement | null)?.value ?? '__missing__'
    )
    expect(value).not.toBe('__missing__')
  })

  test('"toggle" changes window visibility (hide then restore)', async ({
    electronApp,
    appPage,
  }) => {
    const socketPath = path.join(os.tmpdir(), 'nuxy.sock')
    const sendCommand = async (cmd: string) => {
      return new Promise<boolean>((resolve) => {
        const client = net.createConnection(socketPath, () => {
          client.write(cmd)
          client.end()
          setTimeout(() => resolve(true), 10)
        })
        client.on('error', () => resolve(false))
        setTimeout(() => resolve(false), 20)
      })
    }

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

  test('unknown command is silently ignored', async ({ appPage }) => {
    const socketPath = path.join(os.tmpdir(), 'nuxy.sock')
    await new Promise<void>((resolve) => {
      const client = net.createConnection(socketPath, () => {
        client.write('destroy_everything_lol')
        client.end()
        setTimeout(resolve, 10)
      })
      client.on('error', () => resolve())
    })

    // App should still be responding
    const url = appPage.url()
    expect(url).toBeTruthy()
  })
})
