import { uazapiFetch } from './client'

export interface DownloadMediaParams {
  id: string
  return_base64?: boolean
  generate_mp3?: boolean
  return_link?: boolean
  transcribe?: boolean
  openai_apikey?: string
  download_quoted?: boolean
}

export interface FindMessagesParams {
  id?: string
  chatid?: string
  track_source?: string
  track_id?: string
  limit?: number
  offset?: number
}

export interface MarkReadParams {
  id: string[]
}

export interface ReactToMessageParams {
  number: string
  text: string
  id: string
}

export interface DeleteMessageParams {
  id: string
}

export interface EditMessageParams {
  id: string
  text: string
}

export function downloadMedia(token: string, params: DownloadMediaParams) {
  return uazapiFetch<unknown>('/message/download', token, { body: params })
}

export function findMessages(token: string, params: FindMessagesParams) {
  return uazapiFetch<unknown>('/message/find', token, { body: params })
}

export function markRead(token: string, params: MarkReadParams) {
  return uazapiFetch<unknown>('/message/markread', token, { body: params })
}

export function reactToMessage(token: string, params: ReactToMessageParams) {
  return uazapiFetch<unknown>('/message/react', token, { body: params })
}

export function deleteMessage(token: string, params: DeleteMessageParams) {
  return uazapiFetch<unknown>('/message/delete', token, { body: params })
}

export function editMessage(token: string, params: EditMessageParams) {
  return uazapiFetch<unknown>('/message/edit', token, { body: params })
}
