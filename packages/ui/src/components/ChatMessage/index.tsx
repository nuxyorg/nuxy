
export interface ChatMessageProps {
  role: 'user' | 'assistant'
  content: string
}

export function ChatMessage(...args: any[]): unknown {
  return (window.UI as any)?.ChatMessage?.(...args) ?? null
}

export interface ChatListProps {
  messages: ChatMessageProps[]
}

export function ChatList(...args: any[]): unknown {
  return (window.UI as any)?.ChatList?.(...args) ?? null
}
