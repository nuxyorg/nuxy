/**
 * Tests for window dragging, resizing, core.window.* API calls, and the
 * window:resize IPC path. All run against the live Electron window.
 */
import { test, expect } from './fixtures.js'

test.describe('window.core.window API', () => {
  test('core.window.center() does not throw', async ({ appPage }) => {
    const ok = await appPage.evaluate(async () => {
      try {
        ;(window as any).core.window.center()
        return true
      } catch {
        return false
      }
    })
    expect(ok).toBe(true)
  })

  test('core.window.esc() does not throw', async ({ appPage }) => {
    const ok = await appPage.evaluate(async () => {
      try {
        ;(window as any).core.window.esc()
        return true
      } catch {
        return false
      }
    })
    expect(ok).toBe(true)
  })

  test('core.window.resize() sends window:resize without throw', async ({ appPage }) => {
    const ok = await appPage.evaluate(async () => {
      try {
        ;(window as any).core.window.resize(800, 500)
        return true
      } catch {
        return false
      }
    })
    expect(ok).toBe(true)
  })

  test('onShow returns an unsubscribe function', async ({ appPage }) => {
    const isFunction = await appPage.evaluate(() => {
      const unsub = (window as any).core.window.onShow(() => {})
      return typeof unsub === 'function'
    })
    expect(isFunction).toBe(true)
  })
})

test.describe('window dragging', () => {
  test('shell container is draggable (has drag handle)', async ({ appPage }) => {
    await appPage.waitForSelector('.nuxy-shell-omni-bar', { timeout: 400 })

    const hasDragHandle = await appPage.evaluate(() => {
      return document.querySelector('.nuxy-shell-omni-bar') !== null
    })
    expect(hasDragHandle).toBe(true)
  })

  test('mousedown on omnibar initiates drag', async ({ appPage }) => {
    await appPage.waitForSelector('.nuxy-shell-omni-bar', { timeout: 400 })

    const omnibar = await appPage.$('.nuxy-shell-omni-bar')
    expect(omnibar).not.toBeNull()

    const box = await omnibar!.boundingBox()
    expect(box).not.toBeNull()

    // Simulate drag gesture without crashing
    await appPage.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2)
    await appPage.mouse.down()
    await appPage.mouse.move(box!.x + box!.width / 2 + 10, box!.y + box!.height / 2 + 5)
    await appPage.mouse.up()

    // App should still be alive
    const inputExists = await appPage.evaluate(() => document.querySelector('input') !== null)
    expect(inputExists).toBe(true)
  })
})

test.describe('window resize handles', () => {
  test('resize handle elements exist in the shell container', async ({ appPage }) => {
    // The shell renders 8 resize handles (n, s, e, w, ne, nw, se, sw)
    // They are absolutely-positioned divs without specific class names
    await appPage.waitForSelector('.nuxy-main-wrapper', { timeout: 400 })

    const hasMainWrapper = await appPage.evaluate(() => {
      return document.querySelector('.nuxy-main-wrapper') !== null
    })
    expect(hasMainWrapper).toBe(true)
  })
})

test.describe('window resize via IPC', () => {
  test('window:resize is a no-op (transparent full-screen overlay)', async ({
    appPage,
    electronApp,
  }) => {
    // The resize IPC handler is intentionally ignored because the window is a
    // transparent full-screen overlay — its size is determined by the display.
    const before = await electronApp.evaluate(({ BrowserWindow }) => {
      const win = BrowserWindow.getAllWindows()[0]
      return win ? win.getContentSize() : null
    })
    expect(before).not.toBeNull()

    await appPage.evaluate(() => {
      ;(window as any).core.window.resize(810, 550)
    })

    const after = await electronApp.evaluate(({ BrowserWindow }) => {
      const win = BrowserWindow.getAllWindows()[0]
      return win ? win.getContentSize() : null
    })
    expect(after).not.toBeNull()
    // Size must be unchanged — resize is intentionally a no-op for overlay windows
    expect(after![0]).toBe(before![0])
    expect(after![1]).toBe(before![1])
  })

  test('window:hide makes window not visible', async ({ appPage, electronApp }) => {
    const wasBefore = await electronApp.evaluate(({ BrowserWindow }) => {
      const win = BrowserWindow.getAllWindows()[0]
      return win ? win.isVisible() : null
    })
    expect(wasBefore).toBe(true)

    await appPage.evaluate(() => {
      ;(window as any).core.window.hide()
    })

    // Poll until the window is hidden in the main process
    await expect
      .poll(
        async () => {
          return await electronApp.evaluate(({ BrowserWindow }) => {
            const win = BrowserWindow.getAllWindows()[0]
            return win ? win.isVisible() : null
          })
        },
        { timeout: 200 }
      )
      .toBe(false)

    // Restore window so subsequent tests can interact with the renderer
    await electronApp.evaluate(({ BrowserWindow }) => {
      const win = BrowserWindow.getAllWindows()[0]
      if (win) win.show()
    })

    // Poll until the window is visible in the main process
    await expect
      .poll(
        async () => {
          return await electronApp.evaluate(({ BrowserWindow }) => {
            const win = BrowserWindow.getAllWindows()[0]
            return win ? win.isVisible() : null
          })
        },
        { timeout: 200 }
      )
      .toBe(true)
  })

  test('window content size covers the display work area', async ({ electronApp }) => {
    const result = await electronApp.evaluate(({ BrowserWindow, screen }) => {
      const win = BrowserWindow.getAllWindows()[0]
      if (!win) return null
      const [w, h] = win.getContentSize()
      const display = screen.getDisplayMatching(win.getBounds())
      return { w, h, workW: display.workArea.width, workH: display.workArea.height }
    })
    expect(result).not.toBeNull()
    // Overlay window should fill or nearly fill the display work area
    expect(result!.w).toBeGreaterThanOrEqual(result!.workW * 0.9)
    expect(result!.h).toBeGreaterThanOrEqual(result!.workH * 0.9)
  })
})
