import { uazapiFetch } from './client'

export interface ArchiveChatParams {
  number: string
  archive: boolean
}

export interface PinChatParams {
  number: string
  pin: boolean
}

export interface MuteChatParams {
  number: string
  muteEndTime: 0 | 8 | 168 | -1
}

export interface ReadChatParams {
  number: string
  read: boolean
}

export interface DeleteChatParams {
  number: string
  deleteChatDB?: boolean
  deleteMessagesDB?: boolean
  deleteChatWhatsApp?: boolean
}

export interface BlockContactParams {
  number: string
  block: boolean
}

export interface UpdateLabelsParams {
  number: string
  labelids?: string[]
  add_labelid?: string
  remove_labelid?: string
}

export interface FindChatsParams {
  operator?: 'AND' | 'OR'
  sort?: string
  limit?: number
  offset?: number
  wa_fastid?: string
  wa_chatid?: string
  wa_archived?: boolean
  wa_contactName?: string
  wa_name?: string
  name?: string
  wa_isBlocked?: boolean
  wa_isGroup?: boolean
  wa_isGroup_admin?: boolean
  wa_isGroup_announce?: boolean
  wa_isGroup_member?: boolean
  wa_isPinned?: boolean
  wa_label?: string
  lead_tags?: string
  lead_isTicketOpen?: boolean
  lead_assignedAttendant_id?: string
  lead_status?: string
}

export interface GetChatDetailsParams {
  number: string
  preview?: boolean
}

export interface CheckNumbersParams {
  numbers: string[]
}

export interface EditLeadParams {
  id: string
  chatbot_disableUntil?: number
  lead_isTicketOpen?: boolean
  lead_assignedAttendant_id?: string
  lead_kanbanOrder?: number
  lead_tags?: string[]
  lead_name?: string
  lead_fullName?: string
  lead_email?: string
  lead_personalid?: string
  lead_status?: string
  lead_notes?: string
  lead_field01?: string
  lead_field02?: string
  lead_field03?: string
  lead_field04?: string
  lead_field05?: string
  lead_field06?: string
  lead_field07?: string
  lead_field08?: string
  lead_field09?: string
  lead_field10?: string
  lead_field11?: string
  lead_field12?: string
  lead_field13?: string
  lead_field14?: string
  lead_field15?: string
  lead_field16?: string
  lead_field17?: string
  lead_field18?: string
  lead_field19?: string
  lead_field20?: string
}

export function archiveChat(token: string, params: ArchiveChatParams) {
  return uazapiFetch<unknown>('/chat/archive', token, { body: params })
}

export function pinChat(token: string, params: PinChatParams) {
  return uazapiFetch<unknown>('/chat/pin', token, { body: params })
}

export function muteChat(token: string, params: MuteChatParams) {
  return uazapiFetch<unknown>('/chat/mute', token, { body: params })
}

export function readChat(token: string, params: ReadChatParams) {
  return uazapiFetch<unknown>('/chat/read', token, { body: params })
}

export function deleteChat(token: string, params: DeleteChatParams) {
  return uazapiFetch<unknown>('/chat/delete', token, { body: params })
}

export function blockContact(token: string, params: BlockContactParams) {
  return uazapiFetch<unknown>('/chat/block', token, { body: params })
}

export function getBlocklist(token: string) {
  return uazapiFetch<unknown>('/chat/blocklist', token)
}

export function updateLabels(token: string, params: UpdateLabelsParams) {
  return uazapiFetch<unknown>('/chat/labels', token, { body: params })
}

export function findChats(token: string, params: FindChatsParams) {
  return uazapiFetch<unknown>('/chat/find', token, { body: params })
}

export function getChatDetails(token: string, params: GetChatDetailsParams) {
  return uazapiFetch<unknown>('/chat/details', token, { body: params })
}

export function checkNumbers(token: string, params: CheckNumbersParams) {
  return uazapiFetch<unknown>('/chat/check', token, { body: params })
}

export function editLead(token: string, params: EditLeadParams) {
  return uazapiFetch<unknown>('/chat/lead/edit', token, { body: params })
}
