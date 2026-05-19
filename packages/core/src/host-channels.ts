/** Kernel host-call channels — shared by worker proxy and main-process handlers. */
export const HostChannel = {
  CLIPBOARD_READ: 'clipboard:readText',
  CLIPBOARD_WRITE: 'clipboard:writeText',
  STORAGE_READ: 'storage:read',
  STORAGE_WRITE: 'storage:write',
  MEDIA_GET_NOW_PLAYING: 'media:getNowPlaying',
  BROKER_INVOKE: 'broker:invoke'
} as const

export type HostChannelName = (typeof HostChannel)[keyof typeof HostChannel]
