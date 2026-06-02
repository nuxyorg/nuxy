export interface Snippet {
  id: string
  title: string
  content: string
  tags: string[]
  createdAt: string
  updatedAt: string
}

export interface AddSnippetPayload {
  title: string
  content: string
  tags?: string[]
}

export interface DeleteSnippetPayload {
  id: string
}

export interface CopySnippetPayload {
  id: string
}

export interface GetSnippetsPayload {
  query?: string
}
