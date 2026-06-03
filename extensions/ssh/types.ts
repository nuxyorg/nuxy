import type { IpcChannelMap } from '@nuxy/extension-sdk'

export interface SshHost {
  name: string
  hostname: string
  user?: string
  port?: number
  identityFile?: string
}

export interface SshConnectPayload {
  host: string
}

export interface SshConnectResult {
  launched: true
}

export interface IpcChannels extends IpcChannelMap {
  'ssh:list': { input: void; output: SshHost[] }
  'ssh:connect': { input: SshConnectPayload; output: SshConnectResult }
  'ssh:refresh': { input: void; output: SshHost[] }
}
