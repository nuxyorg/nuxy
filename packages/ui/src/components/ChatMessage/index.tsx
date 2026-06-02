import React from 'react'

export interface ChatMessageProps {
  role: 'user' | 'assistant'
  content: string
}

export function ChatMessage(props: ChatMessageProps): React.ReactElement {
  const Impl = (window.UI as any)?.ChatMessage || (() => null)
  return <Impl {...props} />
}

export interface ChatListProps {
  messages: ChatMessageProps[]
}

export function ChatList(props: ChatListProps): React.ReactElement {
  const Impl = (window.UI as any)?.ChatList || (() => null)
  return <Impl {...props} />
}
