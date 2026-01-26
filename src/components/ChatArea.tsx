'use client'

import { useEffect, useMemo, useRef } from 'react'
import { InstanceWithContacts, Message, Contact } from '@/types/database'
import { Phone, User } from 'lucide-react'

interface ChatAreaProps {
  messages: Message[]
  instance: InstanceWithContacts
  selectedContact: Contact | null
  onSelectContact: (contact: Contact) => void
  onPreviewContact?: (contact: Contact) => void
}

export default function ChatArea({ messages, instance, selectedContact, onSelectContact, onPreviewContact }: ChatAreaProps) {
  const messagesContainerRef = useRef<HTMLDivElement | null>(null)

  const formatTime = (dateString: string) => new Date(dateString).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    if (date.toDateString() === today.toDateString()) {
      return 'Hoje'
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Ontem'
    } else {
      return date.toLocaleDateString('pt-BR', { 
        day: '2-digit', 
        month: '2-digit', 
        year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined 
      })
    }
  }

  const groupMessagesByDate = (messages: Message[]) => {
    const groups: { [date: string]: Message[] } = {}
    
    messages.forEach(message => {
      const date = new Date(message.created_at).toDateString()
      if (!groups[date]) {
        groups[date] = []
      }
      groups[date].push(message)
    })
    
    return groups
  }

  const messageGroups = useMemo(() => groupMessagesByDate(messages), [messages])
  const contacts = useMemo(
    () => [...(instance.contacts || [])].sort((a, b) => (b.unread_count || 0) - (a.unread_count || 0)),
    [instance.contacts]
  )

  useEffect(() => {
    const container = messagesContainerRef.current
    if (container) {
      container.scrollTop = container.scrollHeight
    }
  }, [messages, selectedContact])

  return (
    <div className="flex flex-1 min-h-0 bg-white/60">
      {/* Lista de contatos da instancia */}
      <aside className="w-72 border-r border-slate-200/70 bg-white/70 flex flex-col">
        <div className="p-4 border-b border-slate-200/70 bg-white/80">
          <p className="text-sm font-medium text-slate-700">Contatos da instancia</p>
          <p className="text-xs text-slate-500 mt-1">Selecione um contato para visualizar a conversa</p>
        </div>
        <div className="flex-1 overflow-y-auto">
          {contacts.length === 0 ? (
            <div className="p-4 text-center text-slate-500">
              <User className="w-10 h-10 mx-auto mb-2 text-slate-300" />
              <p>Nenhum contato associado</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-200/70">
              {contacts.map((contact) => (
                <button
                  key={contact.id}
                  onClick={() => onSelectContact(contact)}
                  onMouseEnter={() => onPreviewContact?.(contact)}
                  onFocus={() => onPreviewContact?.(contact)}
                  className={`w-full text-left p-4 hover:bg-white transition ${
                    selectedContact?.id === contact.id ? 'bg-white shadow-inner' : ''
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-slate-900">
                      {contact.name || formatPhoneNumber(contact.phone_number)}
                    </p>
                    {contact.unread_count ? (
                      <span className="inline-flex items-center rounded-full bg-rose-500 px-2 py-0.5 text-[11px] font-semibold text-white">
                        {contact.unread_count}
                      </span>
                    ) : null}
                  </div>
                  <p className="text-xs text-slate-500 mt-1 flex items-center">
                    <Phone className="w-3 h-3 mr-1" />
                    {contact.phone_number}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>
      </aside>

      {/* Area do chat */}
      <div className="flex min-h-0 flex-1 flex-col">
        {/* Header do chat */}
        <div className="p-5 border-b border-slate-200/70 bg-white/80">
          <div className="flex items-center space-x-3">
            {instance.profile_pic_url ? (
              <img
                src={instance.profile_pic_url}
                alt={`Avatar da instancia ${instance.name}`}
                className="h-12 w-12 rounded-full object-cover border border-slate-200"
              />
            ) : (
              <div className="w-12 h-12 bg-slate-900 rounded-full flex items-center justify-center">
                <User className="w-5 h-5 text-emerald-200" />
              </div>
            )}
            
            <div className="flex-1">
              <h3 className="font-medium text-slate-900">
                {instance.name}
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Token: {instance.uazapi_instance_id.substring(0, 8)}...
              </p>
              {selectedContact && (
                <div className="mt-2 text-sm text-slate-600">
                  Conversando com{' '}
                  <span className="font-medium">
                    {selectedContact.name || formatPhoneNumber(selectedContact.phone_number)}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Area de mensagens */}
        <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-5 space-y-4 bg-white/40">
          {!selectedContact ? (
            <div className="flex items-center justify-center h-full text-slate-500">
              <div className="text-center">
                <User className="w-12 h-12 mx-auto mb-2 text-slate-300" />
                <p>Selecione um contato para visualizar as mensagens</p>
              </div>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex items-center justify-center h-full text-slate-500">
              <div className="text-center">
                <User className="w-12 h-12 mx-auto mb-2 text-slate-300" />
                <p>Nenhuma mensagem com este contato</p>
              </div>
            </div>
          ) : (
            Object.entries(messageGroups).map(([dateString, dateMessages]) => (
              <div key={dateString}>
                {/* Separador de data */}
                <div className="flex items-center justify-center my-4">
                  <div className="bg-slate-100 text-slate-600 px-3 py-1 rounded-full text-xs">
                    {formatDate(dateMessages[0].created_at)}
                  </div>
                </div>

                {/* Mensagens do dia */}
                <div className="space-y-2">
                  {dateMessages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-xs lg:max-w-md px-4 py-2 rounded-2xl shadow-sm ${
                          message.direction === 'outbound'
                            ? 'bg-slate-900 text-white'
                            : 'bg-white text-slate-900'
                        }`}
                      >
                        {/* Conteudo da mensagem */}
                        <p className="text-sm break-words">
                          {message.content}
                        </p>

                        {/* Status e hora */}
                        <div className={`flex items-center justify-end mt-1 space-x-1 text-xs ${
                          message.direction === 'outbound' ? 'text-slate-300' : 'text-slate-500'
                        }`}>
                          <span>{formatTime(message.created_at)}</span>
                          {message.direction === 'outbound' && (
                            <span className="ml-1">
                              {message.status === 'sent' && 'sent'}
                              {message.status === 'delivered' && 'del'}
                              {message.status === 'read' && 'read'}
                              {message.status === 'failed' && 'fail'}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
          <div className="h-1" />
        </div>
      </div>
    </div>
  )
}
const formatPhoneNumber = (phone: string) => (phone.length < 10 ? phone : phone.replace(/(\d{2})(\d{2})(\d{5})(\d{4})/, '+$1 ($2) $3-$4'))
