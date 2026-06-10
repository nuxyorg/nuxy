export interface ChatMessageProps {
  role: 'user' | 'assistant'
  content: string
  className?: string
}
export interface ChatListProps {
  messages: ChatMessageProps[]
  className?: string
}
