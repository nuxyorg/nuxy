import { describe, it, expect, vi, beforeEach } from 'vitest'

const hoisted = vi.hoisted(async () => {
  const h = await import('@nuxyorg/extension-sdk/testing')
  h.setupDomGlobals({
    ipc: { invoke: vi.fn() },
    shell: {
      registerKeyActions: vi.fn(),
      registerActions: vi.fn(),
      refreshKeyHints: vi.fn(),
      controlOmniBar: vi.fn(),
      setSearchPlaceholder: vi.fn(),
      setShellResetPaused: vi.fn(),
    },
    window: {
      setBlurSuppressed: vi.fn(),
      setBlurSuppressedSync: vi.fn().mockResolvedValue({ suppressed: true }),
      clearBlurSuppressed: vi.fn(),
    },
    events: { on: vi.fn(() => () => {}) },
  })
  return h
})

vi.mock('@nuxyorg/core', async () => {
  const actual = await vi.importActual<typeof import('@nuxyorg/core')>('@nuxyorg/core')
  return (await hoisted).createNuxyCoreMock(actual as Record<string, unknown>)
})

import type { Note } from '../types.ts'
import { NotesController } from '../controller.ts'

function makeNote(id: string): Note {
  return { id, title: id, body: '', createdAt: 0, updatedAt: 0 } as Note
}

describe('NotesController.setEditMode', () => {
  let setBlurSuppressedMock: ReturnType<typeof vi.fn>
  let setBlurSuppressedSyncMock: ReturnType<typeof vi.fn>
  let setShellResetPausedMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    setBlurSuppressedMock = window.core!.window!.setBlurSuppressed as ReturnType<typeof vi.fn>
    setBlurSuppressedSyncMock = window.core!.window!.setBlurSuppressedSync as ReturnType<
      typeof vi.fn
    >
    setShellResetPausedMock = window.core!.shell!.setShellResetPaused as ReturnType<typeof vi.fn>
    setBlurSuppressedMock.mockReset()
    setBlurSuppressedSyncMock.mockReset().mockResolvedValue({ suppressed: true })
    setShellResetPausedMock.mockReset()
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
      cb(0)
      return 0
    })
  })

  it('suppresses blur hide while editing', async () => {
    const controller = new NotesController(() => {})
    controller.setEditMode(true)
    await Promise.resolve()
    expect(setBlurSuppressedSyncMock).toHaveBeenCalledWith(true, 'tool')
    expect(setShellResetPausedMock).toHaveBeenCalledWith(true)
  })

  it('restores blur hide after leaving edit mode', async () => {
    const controller = new NotesController(() => {})
    controller.setEditMode(true)
    await Promise.resolve()
    controller.setEditMode(false)
    await Promise.resolve()
    expect(setBlurSuppressedMock).toHaveBeenLastCalledWith(false, 'tool')
    expect(setShellResetPausedMock).toHaveBeenLastCalledWith(false)
  })

  it('clears tool blur suppression on disconnect', async () => {
    const controller = new NotesController(() => {})
    controller.setEditMode(true)
    await Promise.resolve()
    setBlurSuppressedMock.mockClear()
    setShellResetPausedMock.mockClear()
    controller.disconnect()
    expect(setBlurSuppressedMock).toHaveBeenCalledWith(false, 'tool')
    expect(setShellResetPausedMock).toHaveBeenCalledWith(false)
  })
})

describe('NotesController.handleDelete', () => {
  let invokeMock: ReturnType<typeof vi.fn>
  let controlOmniBarMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    invokeMock = window.core!.ipc!.invoke as ReturnType<typeof vi.fn>
    controlOmniBarMock = window.core!.shell!.controlOmniBar as ReturnType<typeof vi.fn>
    invokeMock.mockReset()
    controlOmniBarMock.mockReset()
  })

  function setupInvoke(remaining: Note[]): void {
    invokeMock.mockImplementation(async (_ext: string, channel: string) => {
      if (channel === 'notes:delete') return { success: true, data: undefined }
      if (channel === 'notes:list') return { success: true, data: remaining }
      return { success: true, data: [] }
    })
  }

  it('keeps the same index selected (now pointing at the next note) after deleting a middle item', async () => {
    setupInvoke([makeNote('a'), makeNote('c')])

    const controller = new NotesController(() => {})
    controller.store.setState({
      notes: [makeNote('a'), makeNote('b'), makeNote('c')],
      filteredNotes: [makeNote('a'), makeNote('b'), makeNote('c')],
      selectedIndex: 1,
      selected: makeNote('b'),
    })

    await controller.handleDelete()

    expect(controller.state.selectedIndex).toBe(1)
    expect(controller.state.selected?.id).toBe('c')
    expect(controlOmniBarMock).not.toHaveBeenCalled()
  })

  it('keeps index 0 selected after deleting the first item', async () => {
    setupInvoke([makeNote('b'), makeNote('c')])

    const controller = new NotesController(() => {})
    controller.store.setState({
      notes: [makeNote('a'), makeNote('b'), makeNote('c')],
      filteredNotes: [makeNote('a'), makeNote('b'), makeNote('c')],
      selectedIndex: 0,
      selected: makeNote('a'),
    })

    await controller.handleDelete()

    expect(controller.state.selectedIndex).toBe(0)
    expect(controller.state.selected?.id).toBe('b')
    expect(controlOmniBarMock).not.toHaveBeenCalled()
  })

  it('selects the new last item when the deleted note was the last one', async () => {
    setupInvoke([makeNote('a'), makeNote('b')])

    const controller = new NotesController(() => {})
    controller.store.setState({
      notes: [makeNote('a'), makeNote('b'), makeNote('c')],
      filteredNotes: [makeNote('a'), makeNote('b'), makeNote('c')],
      selectedIndex: 2,
      selected: makeNote('c'),
    })

    await controller.handleDelete()

    expect(controller.state.selectedIndex).toBe(1)
    expect(controller.state.selected?.id).toBe('b')
    expect(controlOmniBarMock).not.toHaveBeenCalled()
  })

  it('focuses the omnibar when deleting the only remaining item', async () => {
    setupInvoke([])

    const controller = new NotesController(() => {})
    controller.store.setState({
      notes: [makeNote('a')],
      filteredNotes: [makeNote('a')],
      selectedIndex: 0,
      selected: makeNote('a'),
    })

    await controller.handleDelete()

    expect(controller.state.selectedIndex).toBe(-1)
    expect(controller.state.selected).toBeNull()
    expect(controlOmniBarMock).toHaveBeenCalledWith('show')
  })
})
