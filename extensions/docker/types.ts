import type { IpcChannelMap } from '@nuxy/extension-sdk'

export interface DockerContainer {
  id: string
  name: string
  image: string
  status: string
  state: 'running' | 'exited' | 'paused' | 'created' | 'restarting'
  ports: string
  created: string
}

export interface DockerImage {
  id: string
  repository: string
  tag: string
  size: string
  created: string
}

export interface ContainersPayload {
  all?: boolean
}

export interface ContainerIdPayload {
  id: string
}

export interface RemovePayload {
  id: string
  force?: boolean
}

export interface LogsPayload {
  id: string
  tail?: number
}

export interface ActionResult {
  success: boolean
  error?: string
}

export interface LogsResult {
  logs: string
}

// Raw JSON output from `docker ps --format json`
export interface DockerPsJsonRow {
  ID: string
  Names: string
  Image: string
  Status: string
  State: string
  Ports: string
  RunningFor: string
}

// Raw JSON output from `docker images --format json`
export interface DockerImagesJsonRow {
  ID: string
  Repository: string
  Tag: string
  Size: string
  CreatedAt: string
}

export interface IpcChannels extends IpcChannelMap {
  'docker:containers': { input: ContainersPayload; output: DockerContainer[] }
  'docker:start': { input: ContainerIdPayload; output: ActionResult }
  'docker:stop': { input: ContainerIdPayload; output: ActionResult }
  'docker:restart': { input: ContainerIdPayload; output: ActionResult }
  'docker:remove': { input: RemovePayload; output: ActionResult }
  'docker:logs': { input: LogsPayload; output: LogsResult }
  'docker:images': { input: void; output: DockerImage[] }
}
