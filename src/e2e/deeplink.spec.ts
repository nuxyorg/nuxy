/**
 * End-to-end coverage for the nuxy:// deeplink system.
 *
 * Round-trip under test: a "nuxy://settings/extension/com.nuxy.nyaa" URL,
 * delivered via the `/tmp/nuxy.sock` control socket's "open:<url>" command
 * (the same path `nuxy.sh --open` uses), should:
 *   1. resolve "settings" against the live extension registry
 *      (src/electron/deeplink/dispatch.ts),
 *   2. push a `deeplink:open` IPC event to the renderer,
 *   3. have the shell's DeeplinkController activate/mount the settings tool
 *      (extensions/shell/controllers/deeplink-controller.ts),
 *   4. have the settings tool select the Nyaa extension's settings panel
 *      (extensions/settings: SettingsController.selectPanelFromDeeplinkPath).
 */
import { test, expect } from './fixtures.js'
import net from 'node:net'

function sendSocketCommand(socketPath: string, cmd: string): Promise<boolean> {
  return new Promise((resolve) => {
    const client = net.createConnection(socketPath, () => {
      client.write(cmd)
      client.end()
      setTimeout(() => resolve(true), 10)
    })
    client.on('error', () => resolve(false))
    setTimeout(() => resolve(false), 500)
  })
}

test.describe('nuxy:// deeplink system', () => {
  test('opens Settings with the Nyaa extension panel selected via the control socket', async ({
    socketPath,
    appPage,
  }) => {
    const sent = await sendSocketCommand(
      socketPath,
      'open:nuxy://settings/extension/com.nuxy.nyaa'
    )
    expect(sent).toBe(true)

    // Settings tool should mount.
    await appPage.waitForSelector('nuxy-tool-settings', { timeout: 3000 })

    // The Nyaa extension's settings section should be the active/selected one.
    await expect
      .poll(
        async () =>
          appPage.evaluate(() => {
            const settingsEl = document.querySelector('nuxy-tool-settings') as any
            return settingsEl?.controller?.effectiveSectionId ?? null
          }),
        { timeout: 3000 }
      )
      .toBe('com.nuxy.nyaa')
  })

  test('unknown extension id in the deeplink is ignored without crashing the app', async ({
    socketPath,
    appPage,
  }) => {
    const sent = await sendSocketCommand(socketPath, 'open:nuxy://does-not-exist/foo')
    expect(sent).toBe(true)

    // App should still be responsive.
    await appPage.waitForSelector('input', { timeout: 1000 })
    const value = await appPage.evaluate(
      () => (document.querySelector('input') as HTMLInputElement | null)?.value ?? '__missing__'
    )
    expect(value).not.toBe('__missing__')
  })
})
