import type { IpcChannelMap } from '@nuxy/extension-sdk'

export interface Reminder {
  id: string
  label: string
  fireAt: number
  createdAt: number
  fired: boolean
}

export interface ParsedReminder {
  label: string
  fireAt: number
  delayMs: number
}

export interface CreatePayload {
  text: string
}

export interface CancelPayload {
  id: string
}

export interface ParsePayload {
  text: string
}

export interface IpcChannels extends IpcChannelMap {
  'remind:create': { input: CreatePayload; output: Reminder }
  'remind:list': { input: void; output: Reminder[] }
  'remind:cancel': { input: CancelPayload; output: void }
  'remind:parse': { input: ParsePayload; output: ParsedReminder | null }
}
