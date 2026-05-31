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
}

export interface OllamaConfig {
  model: string
  host: string
  thinkingColor: string
}

export interface HealthResult {
  ok: boolean
}
