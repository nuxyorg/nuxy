/* cspell:ignore angrysearch */
import { describe, it, expect, vi, beforeEach } from 'vitest'

const hoisted = vi.hoisted(async () => {
  const h = await import('@nuxyorg/extension-sdk/testing')
  h.setupDomGlobals({
    ipc: { invoke: vi.fn() },
    themes: { list: vi.fn() },
    icons: { listPacks: vi.fn() },
    shell: {
      registerShellActions: vi.fn(),
      refreshShellActions: vi.fn(),
      setSearchPlaceholder: vi.fn(),
    },
    events: { on: vi.fn(() => () => {}), emit: vi.fn() },
  })
  return h
})

vi.mock('@nuxyorg/core', async () => {
  const actual = await vi.importActual<typeof import('@nuxyorg/core')>('@nuxyorg/core')
  return (await hoisted).createNuxyCoreMock(actual as Record<string, unknown>)
})

import { flattenTranslations, flattenShellActions, type ShellAction } from '@nuxyorg/core'
import { SettingsController } from '../controller.ts'
import enLocale from '../locales/en.json'

const enTranslations = flattenTranslations(enLocale)

function getRegisteredActions(): ShellAction[] {
  const registerShellActions = window.core!.shell!.registerShellActions as ReturnType<typeof vi.fn>
  const getter = registerShellActions.mock.calls.at(-1)?.[0]
  return getter ? getter() : []
}

function getKeyActionHints() {
  return getRegisteredActions().filter((a) => a.hint)
}

function findRegisteredAction(
  predicate: (action: ReturnType<typeof getRegisteredActions>[number]) => boolean
) {
  return flattenShellActions(getRegisteredActions()).find(predicate)
}

describe('SettingsController boolean rows', () => {
  let ipcInvoke: ReturnType<typeof vi.fn>

  beforeEach(async () => {
    await hoisted
    ;(document as any).documentElement = { style: { setProperty: vi.fn() } }
    ;(document as any).body = { style: {} }
    ipcInvoke = window.core!.ipc!.invoke as ReturnType<typeof vi.fn>
    ipcInvoke.mockReset()
    ;(window.core!.themes!.list as ReturnType<typeof vi.fn>).mockReset()
    ;(window.core!.icons!.listPacks as ReturnType<typeof vi.fn>).mockReset()

    ipcInvoke.mockImplementation(async (_extId: string, channel: string) => {
      if (channel === 'getExtensionTranslations') {
        return { success: true, data: { locale: 'en', dir: 'ltr', translations: enTranslations } }
      }
      if (channel === 'getSettings') return { success: true, data: undefined }
      if (channel === 'listSystemFonts') return { success: true, data: [] }
      if (channel === 'listInstalledExtensions') return { success: true, data: [] }
      if (channel === 'getExtensionSettingsSchemas') {
        return {
          success: true,
          data: [
            {
              extId: 'com.nuxy.angrysearch',
              name: 'ANGRYsearch',
              schema: {
                fields: [
                  { key: 'caseSensitive', label: 'Case Sensitive', type: 'toggle', default: false },
                ],
              },
            },
          ],
        }
      }
      if (channel === 'getExtensionSettingValues') return { success: true, data: {} }
      return { success: true, data: undefined }
    })
    ;(window.core!.themes!.list as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: true,
      data: [],
    })
    ;(window.core!.icons!.listPacks as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: true,
      data: [],
    })
  })

  it('Enter toggles a kernel boolean row directly instead of opening a select dropdown', async () => {
    const controller = new SettingsController(() => {})
    controller.connect()
    await new Promise((resolve) => setTimeout(resolve, 0))

    controller.setSelectedSection('window')
    const meta = controller.computedMeta!
    const start = meta.sectionStartIndex['window'] ?? 0
    const section = meta.sectionsToRender.find((s) => s.id === 'window')!
    const idx = section.resolvedRows.findIndex((r) => r.key === 'alwaysOnTop')
    controller.setSelectedRow(start + idx)

    expect(controller.state.settings.alwaysOnTop).toBe(false)

    const enter = getRegisteredActions().find((a) => a.key === 'Enter')!
    enter.handler?.()

    expect(controller.state.settings.alwaysOnTop).toBe(true)
    expect(controller.state.activeSelect).toBeNull()

    controller.disconnect()
  })

  it('Enter toggles an extension field declared type: "toggle" directly', async () => {
    const controller = new SettingsController(() => {})
    controller.connect()
    await new Promise((resolve) => setTimeout(resolve, 0))
    await new Promise((resolve) => setTimeout(resolve, 0))

    const meta = controller.computedMeta!
    const section = meta.sectionsToRender.find((s) =>
      s.resolvedRows.some((r) => 'fieldKey' in r && r.fieldKey === 'caseSensitive')
    )!
    const start = meta.sectionStartIndex[section.id] ?? 0
    const idx = section.resolvedRows.findIndex(
      (r) => 'fieldKey' in r && r.fieldKey === 'caseSensitive'
    )
    controller.setSelectedSection(section.id)
    controller.setSelectedRow(start + idx)

    const enter = getRegisteredActions().find((a) => a.key === 'Enter')!
    enter.handler?.()

    expect(controller.state.extValues['com.nuxy.angrysearch']?.caseSensitive).toBe(true)
    expect(controller.state.activeSelect).toBeNull()

    controller.disconnect()
  })
})

describe('SettingsController list fields', () => {
  let ipcInvoke: ReturnType<typeof vi.fn>

  beforeEach(async () => {
    await hoisted
    ;(document as any).documentElement = { style: { setProperty: vi.fn() } }
    ;(document as any).body = { style: {} }
    ipcInvoke = window.core!.ipc!.invoke as ReturnType<typeof vi.fn>
    ipcInvoke.mockReset()
    ;(window.core!.themes!.list as ReturnType<typeof vi.fn>).mockReset()
    ;(window.core!.icons!.listPacks as ReturnType<typeof vi.fn>).mockReset()

    ipcInvoke.mockImplementation(async (_extId: string, channel: string) => {
      if (channel === 'getExtensionTranslations') {
        return { success: true, data: { locale: 'en', dir: 'ltr', translations: enTranslations } }
      }
      if (channel === 'getSettings') return { success: true, data: undefined }
      if (channel === 'listSystemFonts') return { success: true, data: [] }
      if (channel === 'listInstalledExtensions') return { success: true, data: [] }
      if (channel === 'getExtensionSettingsSchemas') {
        return {
          success: true,
          data: [
            {
              extId: 'com.nuxy.angrysearch',
              name: 'ANGRYsearch',
              schema: {
                fields: [
                  {
                    key: 'ignoredRoots',
                    label: 'Ignored Directories',
                    type: 'list',
                    placeholder: '/proc',
                  },
                ],
              },
            },
          ],
        }
      }
      if (channel === 'getExtensionSettingValues') return { success: true, data: {} }
      if (channel === 'saveExtensionSettingValues') return { success: true, data: undefined }
      return { success: true, data: undefined }
    })
    ;(window.core!.themes!.list as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: true,
      data: [],
    })
    ;(window.core!.icons!.listPacks as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: true,
      data: [],
    })
  })

  it('handleListAdd appends an item and persists via saveExtensionSettingValues', async () => {
    const controller = new SettingsController(() => {})
    controller.connect()
    await Promise.resolve()
    await Promise.resolve()
    await Promise.resolve()

    controller.handleListAdd({ extId: 'com.nuxy.angrysearch', fieldKey: 'ignoredRoots' }, '/proc')
    await Promise.resolve()

    expect(controller.state.extValues['com.nuxy.angrysearch']?.ignoredRoots).toEqual(['/proc'])
    expect(ipcInvoke).toHaveBeenCalledWith(
      'com.nuxy.settings',
      'saveExtensionSettingValues',
      {
        extId: 'com.nuxy.angrysearch',
        values: { ignoredRoots: ['/proc'] },
      },
      { callerExtId: 'com.nuxy.settings' }
    )

    controller.disconnect()
  })

  it('handleListAdd does not add duplicate or blank values', async () => {
    const controller = new SettingsController(() => {})
    controller.connect()
    await Promise.resolve()
    await Promise.resolve()
    await Promise.resolve()

    controller.handleListAdd({ extId: 'com.nuxy.angrysearch', fieldKey: 'ignoredRoots' }, '/proc')
    await Promise.resolve()
    controller.handleListAdd({ extId: 'com.nuxy.angrysearch', fieldKey: 'ignoredRoots' }, '/proc')
    await Promise.resolve()
    controller.handleListAdd({ extId: 'com.nuxy.angrysearch', fieldKey: 'ignoredRoots' }, '   ')
    await Promise.resolve()

    expect(controller.state.extValues['com.nuxy.angrysearch']?.ignoredRoots).toEqual(['/proc'])

    controller.disconnect()
  })

  it('handleListRemove removes the item and re-persists the remaining array', async () => {
    const controller = new SettingsController(() => {})
    controller.connect()
    await Promise.resolve()
    await Promise.resolve()
    await Promise.resolve()

    controller.handleListAdd({ extId: 'com.nuxy.angrysearch', fieldKey: 'ignoredRoots' }, '/proc')
    await Promise.resolve()
    controller.handleListAdd({ extId: 'com.nuxy.angrysearch', fieldKey: 'ignoredRoots' }, '/dev')
    await Promise.resolve()

    controller.handleListRemove({
      extId: 'com.nuxy.angrysearch',
      fieldKey: 'ignoredRoots',
      itemValue: '/proc',
    })
    await Promise.resolve()

    expect(controller.state.extValues['com.nuxy.angrysearch']?.ignoredRoots).toEqual(['/dev'])

    controller.disconnect()
  })

  it('Enter on a list-remove row removes that item', async () => {
    const controller = new SettingsController(() => {})
    controller.connect()
    await Promise.resolve()
    await Promise.resolve()
    await Promise.resolve()

    controller.handleListAdd({ extId: 'com.nuxy.angrysearch', fieldKey: 'ignoredRoots' }, '/proc')
    await Promise.resolve()

    const meta = controller.computedMeta!
    const section = meta.sectionsToRender.find((s) => s.id === 'com.nuxy.angrysearch')!
    const start = meta.sectionStartIndex[section.id] ?? 0
    const idx = section.resolvedRows.findIndex((r) => 'isExtListRemove' in r && r.isExtListRemove)
    controller.setSelectedSection(section.id)
    controller.setSelectedRow(start + idx)

    const enter = getRegisteredActions().find((a) => a.key === 'Enter')!
    enter.handler?.()
    await Promise.resolve()

    expect(controller.state.extValues['com.nuxy.angrysearch']?.ignoredRoots).toEqual([])

    controller.disconnect()
  })
})

describe('SettingsController priority-list rows', () => {
  let ipcInvoke: ReturnType<typeof vi.fn>

  beforeEach(async () => {
    await hoisted
    ;(document as any).documentElement = { style: { setProperty: vi.fn() } }
    ;(document as any).body = { style: {} }
    ipcInvoke = window.core!.ipc!.invoke as ReturnType<typeof vi.fn>
    ipcInvoke.mockReset()
    ;(window.core!.themes!.list as ReturnType<typeof vi.fn>).mockReset()
    ;(window.core!.icons!.listPacks as ReturnType<typeof vi.fn>).mockReset()

    ipcInvoke.mockImplementation(async (_extId: string, channel: string) => {
      if (channel === 'getExtensionTranslations') {
        return { success: true, data: { locale: 'en', dir: 'ltr', translations: enTranslations } }
      }
      if (channel === 'getSettings') return { success: true, data: undefined }
      if (channel === 'listSystemFonts') return { success: true, data: [] }
      if (channel === 'listInstalledExtensions') return { success: true, data: [] }
      if (channel === 'getExtensionSettingsSchemas') {
        return {
          success: true,
          data: [
            {
              extId: 'com.nuxy.nyaa',
              name: 'Nyaa Search',
              schema: {
                fields: [
                  {
                    key: 'enterActionPriority',
                    label: 'Enter Key Action Priority',
                    type: 'priority-list',
                    default: ['torrentClient', 'copyMagnet', 'downloadTorrent'],
                    options: [
                      { value: 'torrentClient', label: 'Add via qBittorrent' },
                      { value: 'copyMagnet', label: 'Copy Magnet Link' },
                      { value: 'downloadTorrent', label: 'Save Torrent File' },
                    ],
                  },
                ],
              },
            },
          ],
        }
      }
      if (channel === 'getExtensionSettingValues') {
        return {
          success: true,
          data: {
            enterActionPriority: ['torrentClient', 'copyMagnet', 'downloadTorrent'],
          },
        }
      }
      if (channel === 'saveExtensionSettingValues') return { success: true, data: undefined }
      return { success: true, data: undefined }
    })
    ;(window.core!.themes!.list as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: true,
      data: [],
    })
    ;(window.core!.icons!.listPacks as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: true,
      data: [],
    })
  })

  it('Shift+ArrowDown swaps priority items while editing a priority-list row', async () => {
    const controller = new SettingsController(() => {})
    controller.connect()
    await Promise.resolve()
    await Promise.resolve()
    await Promise.resolve()

    const meta = controller.computedMeta!
    const section = meta.sectionsToRender.find((s) => s.id === 'com.nuxy.nyaa')!
    const start = meta.sectionStartIndex[section.id] ?? 0
    controller.setSelectedSection(section.id)
    controller.setSelectedRow(start)

    getRegisteredActions()
      .find((a) => a.key === 'Enter')!
      .handler?.()
    expect(controller.state.activePriorityList).toBe('com.nuxy.nyaa:enterActionPriority')
    expect(controller.state.priorityFocused).toBe(0)

    const shiftDown = findRegisteredAction(
      (a) => a.key === 'ArrowDown' && (a.modifiers?.includes('shift') ?? false)
    )!
    shiftDown.handler?.()
    await Promise.resolve()

    expect(controller.state.extValues['com.nuxy.nyaa']?.enterActionPriority).toEqual([
      'copyMagnet',
      'torrentClient',
      'downloadTorrent',
    ])
    expect(controller.state.priorityFocused).toBe(1)

    controller.disconnect()
  })

  it('shows minimal footer hints while editing a priority list', async () => {
    const controller = new SettingsController(() => {})
    controller.connect()
    await Promise.resolve()
    await Promise.resolve()
    await Promise.resolve()

    const meta = controller.computedMeta!
    const section = meta.sectionsToRender.find((s) => s.id === 'com.nuxy.nyaa')!
    const start = meta.sectionStartIndex[section.id] ?? 0
    controller.setSelectedSection(section.id)
    controller.setSelectedRow(start)

    getRegisteredActions()
      .find((a) => a.key === 'Enter')!
      .handler?.()

    expect(getKeyActionHints()).toHaveLength(3)
    expect(getKeyActionHints().some((a) => a.key === 'Escape')).toBe(false)
    expect(
      getKeyActionHints().find((a) => Array.isArray(a.hint) && a.hint.includes('⇧'))?.hint
    ).toEqual(['⇧', '↑↓'])
    expect(getRegisteredActions().find((a) => a.key === 'Enter')?.label).toBe(
      enTranslations['actions.closeSetting']
    )

    controller.disconnect()
  })
})
