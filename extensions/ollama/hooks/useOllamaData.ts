const React = window.React

import type { ChatMessage, OllamaConfig } from '../types.ts'
import { ipc as ipcCall } from '../utils/ipc.ts'

export interface OllamaData {
  messages: ChatMessage[]
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>
  models: string[]
  setModels: React.Dispatch<React.SetStateAction<string[]>>
  selectedModel: string
  setSelectedModel: React.Dispatch<React.SetStateAction<string>>
  thinkingColor: string
  setThinkingColor: React.Dispatch<React.SetStateAction<string>>
}

export function useOllamaData(): OllamaData {
  const [messages, setMessages] = React.useState<ChatMessage[]>([])
  const [models, setModels] = React.useState<string[]>([])
  const [selectedModel, setSelectedModel] = React.useState<string>('')
  const [thinkingColor, setThinkingColor] = React.useState<string>('light')

  React.useEffect(() => {
    Promise.all([
      ipcCall<{ host: string; model: string; thinkingColor?: string }>('getConfig').catch(() => null),
      ipcCall<ChatMessage[]>('history:load').catch(() => [] as ChatMessage[]),
      ipcCall<string[]>('models', {}).catch(() => [] as string[]),
    ]).then(([cfg, history, modelList]) => {
      const list = Array.isArray(modelList) ? modelList : []
      setModels(list)

      const savedModel = cfg?.model ?? ''
      const activeModel = savedModel && list.includes(savedModel) ? savedModel : (list[0] ?? '')
      setSelectedModel(activeModel)
      if (cfg?.thinkingColor) setThinkingColor(cfg.thinkingColor)

      if (Array.isArray(history) && history.length > 0) {
        setMessages(history)
      }
    })
  }, [])

  return { messages, setMessages, models, setModels, selectedModel, setSelectedModel, thinkingColor, setThinkingColor }
}
