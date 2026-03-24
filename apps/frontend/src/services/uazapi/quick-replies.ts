import { uazapiFetch } from './client'

export interface EditQuickReplyParams {
  id?: string
  delete?: boolean
  shortCut: string
  type: 'text' | 'audio' | 'myaudio' | 'ptt' | 'document' | 'video' | 'image'
  text?: string
  file?: string
  docName?: string
}

export function getQuickReplies(token: string) {
  return uazapiFetch<unknown>('/quickreply/showall', token)
}

export function editQuickReply(token: string, params: EditQuickReplyParams) {
  return uazapiFetch<unknown>('/quickreply/edit', token, { body: params })
}
