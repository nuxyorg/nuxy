export interface OllamaMessage {
  role: 'system' | 'user' | 'assistant' | 'tool'
  content: string | null
  tool_calls?: OllamaToolCall[]
}

export interface OllamaToolCall {
  function: {
    name: string
    arguments: Record<string, unknown>
  }
}

export interface OllamaChatResponse {
  message: OllamaMessage
}

export interface ToolFunctionDef {
  name: string
  description: string
  parameters: JsonSchema
  __extId?: string
}

export interface ToolDef {
  type: 'function'
  function: ToolFunctionDef
}

export interface JsonSchema {
  type: string
  properties?: Record<string, JsonSchema>
  required?: string[]
  description?: string
}

export interface CallableExtension {
  id: string
  manifest?: {
    name?: string
    description?: string
  }
  schema?: JsonSchema
}

export interface OrchestratorResult {
  type: 'tool_result' | 'direct' | 'error'
  query: string
  answer?: string
  error?: string
  toolCalls?: OllamaToolCall[]
}

export interface RoutePayload {
  text?: string
}
