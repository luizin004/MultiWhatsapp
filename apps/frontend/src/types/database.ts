export interface Instance {
  id: string
  name: string
  uazapi_instance_id: string
  status: 'connected' | 'disconnected' | 'connecting'
  profile_pic_url?: string | null
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
  created_at: string
  updated_at: string
}

export interface Message {
  id: string
  instance_id: string
  contact_id: string
  content: string
  type: 'text' | 'image' | 'audio' | 'video' | 'document'
  direction: 'inbound' | 'outbound'
  status: 'sent' | 'delivered' | 'read' | 'failed'
  external_id?: string
  attachment_url?: string | null
  attachment_mime?: string | null
  attachment_name?: string | null
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
