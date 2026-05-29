export interface Note {
  id: string
  title: string
  body: string
  createdAt: number
  updatedAt: number
}

export interface NotesCreatePayload {
  title: string
  body: string
}

export interface NotesUpdatePayload {
  id: string
  title?: string
  body?: string
}

export interface NotesDeletePayload {
  id: string
}

export interface NotesSearchPayload {
  query: string
}

export interface NotesTranscribePayload {
  audioBuffer: number[]
  language?: string
}

export interface NotesConfigurePayload {
  openaiApiKey?: string
  language?: string
}

export interface NotesConfig {
  openaiApiKey?: string
  language?: string
}

export interface TranscribeResult {
  transcript: string
}

export interface FtsRow {
  id: string
  title: string
  body: string
}
