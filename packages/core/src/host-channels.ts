/** Kernel host-call channels — shared by worker proxy and main-process handlers. */
export const HostChannel = {
  CLIPBOARD_READ: 'clipboard:readText',
  CLIPBOARD_WRITE: 'clipboard:writeText',
  CLIPBOARD_READ_IMAGE: 'clipboard:readImage',
  CLIPBOARD_WRITE_IMAGE: 'clipboard:writeImage',
  STORAGE_READ: 'storage:read',
  STORAGE_WRITE: 'storage:write',
  MEDIA_GET_NOW_PLAYING: 'media:getNowPlaying',
  BROKER_INVOKE: 'broker:invoke',
  CLIPBOARD_WRITE_FILES: 'clipboard:writeFiles',
  FS_FILE_EXISTS: 'fs:fileExists',
  THEME_REGISTER: 'theme:register',
  ICONPACK_REGISTER: 'iconpack:register',
  IPC_BROADCAST: 'ipc:broadcast',
  REGISTRY_GET_CALLABLE_TOOLS: 'registry:getCallableTools',
} as const

export type HostChannelName = (typeof HostChannel)[keyof typeof HostChannel]
