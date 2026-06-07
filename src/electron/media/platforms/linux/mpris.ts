import { kernelLogger } from '@nuxy/core'
import type { NowPlaying } from '../../types.js'
import { parseMprisPlayer, pickBestMprisPlayer } from '../../parse-mpris.js'

const log = kernelLogger.child('Media:linux:mpris')

const MPRIS_PREFIX = 'org.mpris.MediaPlayer2.'
const PLAYER_PATH = '/org/mpris/MediaPlayer2'
const PLAYER_IFACE = 'org.mpris.MediaPlayer2.Player'
const PROPS_IFACE = 'org.freedesktop.DBus.Properties'

type DbusModule = typeof import('dbus-next')
type MessageBus = ReturnType<DbusModule['sessionBus']>

let sessionBus: MessageBus | null = null
let connectPromise: Promise<MessageBus> | null = null

async function getSessionBus(): Promise<MessageBus> {
  if (sessionBus) return sessionBus
  if (!connectPromise) {
    connectPromise = (async () => {
      const dbus: DbusModule = await import('dbus-next')
      const bus = dbus.sessionBus()
      bus.on('error', (err: Error) => {
        log.warn('Session bus error', { message: err.message })
      })
      sessionBus = bus
      return bus
    })()
  }
  return connectPromise
}

async function listMprisBusNames(): Promise<string[]> {
  const bus = await getSessionBus()
  const obj = await bus.getProxyObject('org.freedesktop.DBus', '/org/freedesktop/DBus')
  const dbusIface = obj.getInterface('org.freedesktop.DBus')
  const names: string[] = await dbusIface.ListNames()
  return names.filter((n) => n.startsWith(MPRIS_PREFIX))
}

async function queryPlayer(busName: string): Promise<NowPlaying | null> {
  const bus = await getSessionBus()
  const obj = await bus.getProxyObject(busName, PLAYER_PATH)
  const props = obj.getInterface(PROPS_IFACE)
  const [playbackStatus, metadata] = await Promise.all([
    props.Get(PLAYER_IFACE, 'PlaybackStatus'),
    props.Get(PLAYER_IFACE, 'Metadata'),
  ])
  return parseMprisPlayer(busName, metadata, playbackStatus)
}

/** Read now-playing metadata from the session MPRIS bus (D-Bus). */
export async function getMprisNowPlaying(): Promise<NowPlaying | null> {
  try {
    const players = await listMprisBusNames()
    if (players.length === 0) {
      log.silly('No MPRIS media players on session bus')
      return null
    }

    const results = await Promise.all(
      players.map(async (busName) => {
        try {
          return { busName, nowPlaying: await queryPlayer(busName) }
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : String(err)
          log.silly(`Skipping MPRIS player ${busName}`, { error: message })
          return { busName, nowPlaying: null }
        }
      })
    )

    return pickBestMprisPlayer(results)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    log.warn('MPRIS query failed', { error: message })
    return null
  }
}
