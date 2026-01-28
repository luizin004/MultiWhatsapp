'use client'

import { useEffect, useMemo, useRef, useState, ChangeEvent } from 'react'
import { InstanceWithContacts, Message, Contact } from '@/types/database'
import { User, Search, MoreVertical, Check, CheckCheck, AlertCircle } from 'lucide-react'

interface ChatAreaProps {
  messages: Message[]
  instance: InstanceWithContacts
  selectedContact: Contact | null
  onSelectContact: (contact: Contact) => void
  onPreviewContact?: (contact: Contact) => void
}

export default function ChatArea({ messages, instance, selectedContact, onSelectContact, onPreviewContact }: ChatAreaProps) {
  const messagesContainerRef = useRef<HTMLDivElement | null>(null)
  const [contactSearch, setContactSearch] = useState('')

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

    messages.forEach((message) => {
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

  const filteredContacts = useMemo<Contact[]>(() => {
    if (!contactSearch.trim()) return contacts
    const query = contactSearch.toLowerCase()
    const numericQuery = query.replace(/\D/g, '')

    return contacts.filter((contact: Contact) => {
      const name = (contact.name || '').toLowerCase()
      const phone = (contact.phone_number || '').toLowerCase()
      const normalizedPhone = (contact.phone_number || '').replace(/\D/g, '')

      if (name.includes(query) || phone.includes(query)) return true
      return Boolean(numericQuery) && normalizedPhone.includes(numericQuery)
    })
  }, [contactSearch, contacts])

  const groupedEntries = useMemo(() => Object.entries(messageGroups) as [string, Message[]][], [messageGroups])

  const renderStatusIcon = (status: Message['status']) => {
    if (status === 'failed') {
      return <AlertCircle className="h-3.5 w-3.5 text-[#f7a8a2]" />
    }

    if (status === 'read') {
      return <CheckCheck className="h-3.5 w-3.5 text-sky-400" />
    }

    if (status === 'delivered') {
      return <CheckCheck className="h-3.5 w-3.5 text-white/70" />
    }

    return <Check className="h-3.5 w-3.5 text-white/70" />
  }

  useEffect(() => {
    const container = messagesContainerRef.current
    if (container) {
      container.scrollTop = container.scrollHeight
    }
  }, [messages, selectedContact])

  return (
    <div className="flex flex-1 min-h-0 bg-[#0B141A] text-[#E9EDEF]">
      {/* Lista de contatos da instancia */}
      <aside className="hidden w-[320px] flex-col border-r border-white/5 bg-[#111B21] lg:flex">
        <div className="border-b border-white/10 px-4 py-3">
          <p className="text-sm font-semibold">Contatos</p>
          <p className="text-xs text-[#8696A0]">{instance.contacts?.length || 0} vinculados</p>
        </div>
        <div className="border-b border-white/5 px-4 py-3">
          <div className="flex items-center gap-3 rounded-full bg-[#202C33] px-3">
            <Search className="h-4 w-4 text-[#8696A0]" />
            <input
              value={contactSearch}
              onChange={(event: ChangeEvent<HTMLInputElement>) => setContactSearch(event.target.value)}
              placeholder="Pesquisar contato"
              className="h-10 flex-1 bg-transparent text-sm text-[#E9EDEF] placeholder:text-[#8696A0] focus:outline-none"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {filteredContacts.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center px-6 text-center text-[#8696A0]">
              <User className="mb-3 h-12 w-12 text-white/10" />
              <p className="text-sm">Nenhum contato encontrado</p>
            </div>
          ) : (
            <ul className="divide-y divide-white/5">
              {filteredContacts.map((contact: Contact) => {
                const unread = contact.unread_count || 0
                return (
                  <li key={contact.id}>
                    <button
                      onClick={() => onSelectContact(contact)}
                      onMouseEnter={() => onPreviewContact?.(contact)}
                      onFocus={() => onPreviewContact?.(contact)}
                      className={`flex w-full gap-3 px-4 py-3 text-left transition-colors ${
                        selectedContact?.id === contact.id ? 'bg-white/5' : 'hover:bg-white/5'
                      }`}
                    >
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#202C33] text-[#25D366]">
                        <User className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="truncate text-sm font-semibold">
                            {contact.name || formatPhoneNumber(contact.phone_number)}
                          </p>
                          <span className="text-[11px] text-[#8696A0]">
                            {formatTime(contact.updated_at)}
                          </span>
                        </div>
                        <p className="truncate text-xs text-[#8696A0]">
                          {contact.phone_number}
                        </p>
                      </div>
                      {unread ? (
                        <span className="self-start rounded-full bg-[#25D366] px-2 py-0.5 text-[11px] font-semibold text-[#111B21]">
                          {unread > 99 ? '99+' : unread}
                        </span>
                      ) : null}
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </aside>

      {/* Area do chat */}
      <div className="relative flex min-h-0 flex-1 flex-col">
        {/* Header do chat */}
        <div className="flex items-center justify-between border-b border-white/5 bg-[#202C33] px-6 py-4">
          {selectedContact ? (
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#25D366]/10 text-[#25D366]">
                <User className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-semibold">
                  {selectedContact.name || formatPhoneNumber(selectedContact.phone_number)}
                </p>
                <p className="text-xs text-[#8696A0]">{selectedContact.phone_number}</p>
              </div>
            </div>
          ) : (
            <div>
              <p className="text-sm font-semibold">Selecione um contato</p>
              <p className="text-xs text-[#8696A0]">Instância: {instance.name}</p>
            </div>
          )}
          <div className="flex items-center gap-2 text-white/60">
            <button className="rounded-full p-2 hover:bg-white/10 hover:text-white" title="Pesquisar na conversa">
              <Search className="h-4 w-4" />
            </button>
            <button className="rounded-full p-2 hover:bg-white/10 hover:text-white" title="Mais opções">
              <MoreVertical className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Area de mensagens */}
        <div className="relative flex-1 overflow-hidden bg-[#0B141A]">
          <div className="pointer-events-none absolute inset-0 opacity-[0.15]" style={{ backgroundImage: 'radial-gradient(circle at 25% 25%, rgba(255,255,255,0.2) 1px, transparent 0)', backgroundSize: '180px 180px' }} />

          <div ref={messagesContainerRef} className="relative z-10 flex h-full flex-col overflow-y-auto px-6 py-6">
            {!selectedContact ? (
              <div className="flex flex-1 items-center justify-center text-center text-[#8696A0]">
                <div>
                  <User className="mx-auto mb-4 h-12 w-12 text-white/10" />
                  <p className="text-sm">Escolha um contato para iniciar a conversa</p>
                </div>
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-1 items-center justify-center text-center text-[#8696A0]">
                <div>
                  <User className="mx-auto mb-4 h-12 w-12 text-white/10" />
                  <p className="text-sm">Nenhuma mensagem ainda. Envie a primeira!</p>
                </div>
              </div>
            ) : (
              groupedEntries.map(([dateString, dateMessages]: [string, Message[]]) => (
                <div key={dateString} className="space-y-4">
                  {/* Separador de data */}
                  <div className="flex items-center justify-center">
                    <span className="rounded-full bg-white/10 px-4 py-1 text-xs text-[#E9EDEF]">
                      {formatDate(dateMessages[0].created_at)}
                    </span>
                  </div>

                  {/* Mensagens do dia */}
                  <div className="space-y-2">
                    {dateMessages.map((message: Message) => {
                      const isOutbound = message.direction === 'outbound'
                      return (
                        <div key={message.id} className={`flex ${isOutbound ? 'justify-end' : 'justify-start'}`}>
                          <div
                            className={`relative max-w-[65%] rounded-2xl px-4 py-2 text-sm leading-relaxed ${
                              isOutbound ? 'bg-[#005C4B] text-[#E9EDEF] rounded-br-sm' : 'bg-[#202C33] text-[#E9EDEF] rounded-bl-sm'
                            }`}
                          >
                            <p className="whitespace-pre-wrap break-words">{message.content}</p>
                            <div className="mt-1 flex items-center justify-end gap-1 text-[11px] text-white/70">
                              <span>{formatTime(message.created_at)}</span>
                              {isOutbound && renderStatusIcon(message.status)}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
const formatPhoneNumber = (phone: string) => (phone.length < 10 ? phone : phone.replace(/(\d{2})(\d{2})(\d{5})(\d{4})/, '+$1 ($2) $3-$4'))
