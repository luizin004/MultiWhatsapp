export interface Instance {
  id: string
  name: string
  uazapi_instance_id: string
  status: 'connected' | 'disconnected' | 'connecting'
  profile_pic_url?: string | null
  phone_number?: string | null
  created_at: string
  updated_at: string
}

export interface Contact {
  id: string
  instance_id: string
  name: string
  phone_number: string
  profile_pic_url?: string
  unread_count?: number
  is_pinned?: boolean
  is_muted?: number
  is_archived?: boolean
  is_blocked?: boolean
  labels?: string[]
  is_group?: boolean
  group_jid?: string | null
  lead_status?: string | null
  lead_tags?: string[]
  lead_notes?: string | null
  lead_email?: string | null
  lead_name?: string | null
  created_at: string
  updated_at: string
}

export interface Message {
  id: string
  instance_id: string
  contact_id: string
  content: string
  type: 'text' | 'image' | 'audio' | 'video' | 'document' | 'sticker' | 'contact' | 'location' | 'interactive' | 'ptt'
  direction: 'inbound' | 'outbound'
  status: 'sent' | 'delivered' | 'read' | 'failed'
  external_id?: string
  attachment_url?: string | null
  attachment_mime?: string | null
  attachment_name?: string | null
  isOptimistic?: boolean
  reply_to_id?: string | null
  reactions?: Array<{ emoji: string; from: string }>
  interactive_type?: 'button' | 'list' | 'poll' | 'carousel' | 'payment' | 'location_request' | null
  interactive_data?: Record<string, unknown> | null
  media_url?: string | null
  transcription?: string | null
  created_at: string
  updated_at: string
}

export interface InstanceWithContacts extends Instance {
  contacts: Contact[]
}

export interface ContactWithLastMessage extends Contact {
  instance: Instance
  last_message?: Message
}

export interface Label {
  id: string
  instance_id: string
  label_id: string
  name: string
  color: number
  created_at: string
}

export interface QuickReply {
  id: string
  instance_id: string
  shortcut: string
  type: 'text' | 'audio' | 'myaudio' | 'ptt' | 'document' | 'video' | 'image'
  text?: string | null
  file_url?: string | null
  doc_name?: string | null
  uazapi_id?: string | null
  created_at: string
  updated_at: string
}

export interface GroupParticipant {
  jid: string
  phone: string
  name?: string
  is_admin: boolean
  is_super_admin: boolean
}

export interface GroupInfo {
  jid: string
  name: string
  description?: string
  image_url?: string
  participant_count: number
  participants?: GroupParticipant[]
  is_admin: boolean
  is_announce: boolean
  is_locked: boolean
  is_community: boolean
  invite_link?: string
  created_at?: string
}

export interface ChatDetails {
  id: string
  wa_chatid: string
  wa_name?: string
  wa_contactName?: string
  name?: string
  phone?: string
  image?: string
  imagePreview?: string
  wa_isGroup: boolean
  wa_isBlocked: boolean
  wa_isPinned: boolean
  wa_archived: boolean
  wa_muteEndTime: number
  wa_unreadCount: number
  wa_label: string[]
  lead_name?: string
  lead_email?: string
  lead_status?: string
  lead_tags?: string[]
  lead_notes?: string
  lead_isTicketOpen?: boolean
  lead_assignedAttendant_id?: string
}

export interface Campaign {
  id: string
  instance_id: string
  folder_id: string
  name: string
  status: 'scheduled' | 'sending' | 'paused' | 'done' | 'stopped'
  type: string
  scheduled_for?: string
  delay_min: number
  delay_max: number
  total_messages: number
  sent_count: number
  failed_count: number
  created_at: string
  updated_at: string
}
