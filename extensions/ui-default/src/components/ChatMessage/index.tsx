import { h } from '../../h'
import './nuxy-chat-message.ts'

export interface ChatMessageProps {
  role: 'user' | 'assistant'
  content: string
  className?: string
}

export function ChatMessage({ role, content, className }: ChatMessageProps) {
  return h('nuxy-chat-message', { role, content, class: className })
}

export interface ChatListProps {
  messages: ChatMessageProps[]
  className?: string
}

export function ChatList({ messages, className }: ChatListProps) {
  return h(
    'div',
    { className: `nuxy-chat-list${className ? ` ${className}` : ''}` },
    messages.map((msg, i) =>
      h('nuxy-chat-message', {
        key: i,
        role: msg.role,
        content: msg.content,
        class: msg.className,
      })
    )
  )
}
