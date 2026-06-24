import { describe, it, expect } from 'vitest'
import {
  DEFAULT_ENTER_ACTION_PRIORITY,
  normalizeEnterActionPriority,
  resolveEffectiveActions,
} from '../utils/enter-action-priority.ts'
import {
  ENTER_ACTION_COPY,
  ENTER_ACTION_DOWNLOAD,
  ENTER_ACTION_TORRENT_CLIENT,
  type EnterAction,
} from '../utils/enter-action-options.ts'

describe('DEFAULT_ENTER_ACTION_PRIORITY', () => {
  it('orders torrentClient, copyMagnet, downloadTorrent', () => {
    expect(DEFAULT_ENTER_ACTION_PRIORITY).toEqual([
      ENTER_ACTION_TORRENT_CLIENT,
      ENTER_ACTION_COPY,
      ENTER_ACTION_DOWNLOAD,
    ])
  })
})

describe('normalizeEnterActionPriority', () => {
  it('returns default order when raw is empty and no legacy settings', () => {
    expect(normalizeEnterActionPriority(null)).toEqual(DEFAULT_ENTER_ACTION_PRIORITY)
    expect(normalizeEnterActionPriority([])).toEqual(DEFAULT_ENTER_ACTION_PRIORITY)
  })

  it('keeps valid saved order and dedupes', () => {
    expect(
      normalizeEnterActionPriority([
        ENTER_ACTION_COPY,
        ENTER_ACTION_COPY,
        ENTER_ACTION_DOWNLOAD,
        ENTER_ACTION_TORRENT_CLIENT,
      ])
    ).toEqual([ENTER_ACTION_COPY, ENTER_ACTION_DOWNLOAD, ENTER_ACTION_TORRENT_CLIENT])
  })

  it('fills missing actions from default order', () => {
    expect(normalizeEnterActionPriority([ENTER_ACTION_COPY])).toEqual([
      ENTER_ACTION_COPY,
      ENTER_ACTION_TORRENT_CLIENT,
      ENTER_ACTION_DOWNLOAD,
    ])
  })

  it('filters unknown values', () => {
    expect(normalizeEnterActionPriority(['bogus', ENTER_ACTION_DOWNLOAD])).toEqual([
      ENTER_ACTION_DOWNLOAD,
      ENTER_ACTION_TORRENT_CLIENT,
      ENTER_ACTION_COPY,
    ])
  })

  it('migrates legacy torrentClient enterAction to default order', () => {
    expect(
      normalizeEnterActionPriority(null, { enterAction: ENTER_ACTION_TORRENT_CLIENT })
    ).toEqual(DEFAULT_ENTER_ACTION_PRIORITY)
  })

  it('migrates legacy copyMagnet with useQbittorrent=true', () => {
    expect(
      normalizeEnterActionPriority(null, {
        enterAction: ENTER_ACTION_COPY,
        useQbittorrent: true,
      })
    ).toEqual(DEFAULT_ENTER_ACTION_PRIORITY)
  })

  it('migrates legacy copyMagnet with useQbittorrent=false', () => {
    expect(
      normalizeEnterActionPriority(null, {
        enterAction: ENTER_ACTION_COPY,
        useQbittorrent: false,
      })
    ).toEqual([ENTER_ACTION_COPY, ENTER_ACTION_DOWNLOAD, ENTER_ACTION_TORRENT_CLIENT])
  })

  it('migrates legacy downloadTorrent with useQbittorrent=true', () => {
    expect(
      normalizeEnterActionPriority(null, {
        enterAction: ENTER_ACTION_DOWNLOAD,
        useQbittorrent: true,
      })
    ).toEqual([ENTER_ACTION_TORRENT_CLIENT, ENTER_ACTION_DOWNLOAD, ENTER_ACTION_COPY])
  })

  it('migrates legacy downloadTorrent with useQbittorrent=false', () => {
    expect(
      normalizeEnterActionPriority(null, {
        enterAction: ENTER_ACTION_DOWNLOAD,
        useQbittorrent: false,
      })
    ).toEqual([ENTER_ACTION_DOWNLOAD, ENTER_ACTION_COPY, ENTER_ACTION_TORRENT_CLIENT])
  })
})

describe('resolveEffectiveActions', () => {
  const defaultPriority = DEFAULT_ENTER_ACTION_PRIORITY

  it('binds Enter and Shift+Enter to first two priorities when torrent client is ready', () => {
    expect(resolveEffectiveActions(defaultPriority, true)).toEqual({
      enter: ENTER_ACTION_TORRENT_CLIENT,
      shiftEnter: ENTER_ACTION_COPY,
    })
  })

  it('skips torrentClient when not ready and binds to next priorities', () => {
    expect(resolveEffectiveActions(defaultPriority, false)).toEqual({
      enter: ENTER_ACTION_COPY,
      shiftEnter: ENTER_ACTION_DOWNLOAD,
    })
  })

  it('keeps copyMagnet first when it leads the list regardless of client readiness', () => {
    const priority: EnterAction[] = [
      ENTER_ACTION_COPY,
      ENTER_ACTION_DOWNLOAD,
      ENTER_ACTION_TORRENT_CLIENT,
    ]
    expect(resolveEffectiveActions(priority, true)).toEqual({
      enter: ENTER_ACTION_COPY,
      shiftEnter: ENTER_ACTION_DOWNLOAD,
    })
    expect(resolveEffectiveActions(priority, false)).toEqual({
      enter: ENTER_ACTION_COPY,
      shiftEnter: ENTER_ACTION_DOWNLOAD,
    })
  })

  it('returns null shiftEnter when only one effective action remains', () => {
    expect(resolveEffectiveActions([ENTER_ACTION_TORRENT_CLIENT], false)).toEqual({
      enter: ENTER_ACTION_COPY,
      shiftEnter: null,
    })
  })
})
