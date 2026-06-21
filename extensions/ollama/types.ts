import type { IpcChannelMap } from '@nuxyorg/extension-sdk'

export interface OllamaModel {
  name: string
  modified_at: string
  size: number
}

export interface OllamaTagsResponse {
  models: OllamaModel[]
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

export interface ChatPayload {
  messages: ChatMessage[]
}

export interface ChatResult {
  content: string
}

export interface OllamaChatResponse {
  message?: {
    role: string
    content: string
  }
}

export interface QueryPayload {
  model?: string
  prompt: string
}

export interface ConfigurePayload {
  model?: string
  host?: string
  thinkingColor?: string
  systemPrompt?: string
  temperature?: number
}

export interface OllamaConfig {
  model: string
  host: string
  thinkingColor: string
  systemPrompt?: string
  temperature?: number
}

export interface HealthResult {
  ok: boolean
}

export interface HistorySavePayload {
  messages: ChatMessage[]
}

export interface EvalPayload {
  text?: string
}

export interface EvalItem {
  id: string
  title: string
  subtitle: string
  execute: {
    channel: string
    payload: { text: string }
  }
}

export interface EvalResult {
  items: EvalItem[]
}

export interface OpenWithQueryPayload {
  text: string
}

export interface OpenWithQueryResult {
  toolId: string
  query: string
}

export interface IpcChannels extends IpcChannelMap {
  chat: { input: ChatPayload; output: ChatResult }
  query: { input: QueryPayload; output: ChatResult }
  models: { input: void; output: string[] }
  health: { input: void; output: HealthResult }
  configure: { input: ConfigurePayload; output: void }
  getConfig: { input: void; output: OllamaConfig }
  'history:save': { input: HistorySavePayload; output: void }
  'history:load': { input: void; output: ChatMessage[] }
  'history:clear': { input: void; output: void }
}
