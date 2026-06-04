import React from 'react'
import './index.css'
import { MarkdownText } from '../MarkdownText'

export interface ChatMessageProps {
  role: 'user' | 'assistant'
  content: string
}

export function ChatMessage({ role, content }: ChatMessageProps) {
  return (
    <div className={`nuxy-chat-message nuxy-chat-message--${role}`}>
      <div className="nuxy-chat-message__bubble">
        {role === 'assistant' ? <MarkdownText>{content}</MarkdownText> : content}
      </div>
      <div className="nuxy-chat-message__role">{role === 'user' ? 'You' : 'Assistant'}</div>
    </div>
  )
}

export interface ChatListProps {
  messages: ChatMessageProps[]
}

export function ChatList({ messages }: ChatListProps) {
  return (
    <div className="nuxy-chat-list">
      {messages.map((msg, i) => (
        <ChatMessage key={i} role={msg.role} content={msg.content} />
      ))}
    </div>
  )
}
