'use client'

import { useCallback, useEffect, useMemo, useRef, useState, ChangeEvent } from 'react'
import { InstanceWithContacts, Message, Contact } from '@/types/database'
import { User, Search, MoreVertical, Check, CheckCheck, AlertCircle, Pin, BellOff } from 'lucide-react'
import ContactContextMenu from './ContactContextMenu'
import MessageActions from './MessageActions'

interface ChatAreaProps {
  messages: Message[]
  instance: InstanceWithContacts
  selectedContact: Contact | null
  onSelectContact: (contact: Contact) => void
  onPreviewContact?: (contact: Contact) => void
  instanceToken?: string
  /** Called when the user triggers the reply action on a message. */
  onReplyMessage?: (message: Message) => void
  /** Called when the user triggers the edit action on a message. */
  onEditMessage?: (message: Message) => void
  /** Called when the user triggers the delete action on a message. */
  onDeleteMessage?: (messageId: string) => void
  /** Called when the user triggers the react action on a message. */
  onReactMessage?: (messageId: string, emoji: string) => void
  /** Called when the user clicks the contact name in the header to open the details panel. */
  onOpenContactDetails?: () => void
  /** Presence state for the selected contact: 'composing' | 'recording' | null */
  typingState?: string | null
}

export default function ChatArea({
  messages,
  instance,
  selectedContact,
  onSelectContact,
  onPreviewContact,
  instanceToken = '',
  onReplyMessage,
  onEditMessage,
  onDeleteMessage,
  onReactMessage,
  onOpenContactDetails,
  typingState,
}: ChatAreaProps) {
  // Convenience aliases used internally so existing MessageActions wiring stays clear
  const onReply = onReplyMessage
  const onEdit = onEditMessage
  const onDelete = onDeleteMessage
  const onReact = onReactMessage
  const messagesContainerRef = useRef<HTMLDivElement | null>(null)
  const [contactSearch, setContactSearch] = useState('')
  const [localContacts, setLocalContacts] = useState<Contact[]>(instance.contacts || [])
  const [contextMenu, setContextMenu] = useState<{
    contact: Contact
    position: { x: number; y: number }
  } | null>(null)
  const [hoveredMessageId, setHoveredMessageId] = useState<string | null>(null)

  // Keep local contacts in sync when the instance prop changes
  useEffect(() => {
    setLocalContacts(instance.contacts || [])
  }, [instance.contacts])

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

  const groupMessagesByDate = (msgs: Message[]) => {
    const groups: { [date: string]: Message[] } = {}

    msgs.forEach((message) => {
      const date = new Date(message.created_at).toDateString()
      if (!groups[date]) {
        groups[date] = []
      }
      groups[date].push(message)
    })

    return groups
  }

  const messageGroups = useMemo(() => groupMessagesByDate(messages), [messages])

  // Build a lookup map so quoted messages can be found in O(1)
  const messageById = useMemo<Map<string, Message>>(() => {
    const map = new Map<string, Message>()
    messages.forEach((m) => map.set(m.id, m))
    return map
  }, [messages])

  const contacts = useMemo(() => {
    const byUpdatedAtDesc = (a: Contact, b: Contact) =>
      new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()

    const pinned = localContacts.filter((c) => c.is_pinned).sort(byUpdatedAtDesc)
    const unpinned = localContacts.filter((c) => !c.is_pinned).sort(byUpdatedAtDesc)
    return [...pinned, ...unpinned]
  }, [localContacts])

  const handleContextMenu = useCallback(
    (e: React.MouseEvent, contact: Contact) => {
      e.preventDefault()
      setContextMenu({ contact, position: { x: e.clientX, y: e.clientY } })
    },
    []
  )

  const handleContextMenuAction = useCallback(
    (action: string, contact: Contact) => {
      setLocalContacts((prev) => {
        const updated = prev.map((c) => {
          if (c.id !== contact.id) return c
          switch (action) {
            case 'pin':
              return { ...c, is_pinned: true }
            case 'unpin':
              return { ...c, is_pinned: false }
            case 'mute':
              return { ...c, is_muted: -1 }
            case 'unmute':
              return { ...c, is_muted: 0 }
            case 'archive':
              return { ...c, is_archived: true }
            case 'unarchive':
              return { ...c, is_archived: false }
            case 'read':
              return { ...c, unread_count: 0 }
            case 'unread':
              return { ...c, unread_count: 1 }
            case 'block':
              return { ...c, is_blocked: true }
            case 'unblock':
              return { ...c, is_blocked: false }
            case 'delete':
              return null as unknown as Contact
            default:
              return c
          }
        })
        return updated.filter(Boolean)
      })
      setContextMenu(null)
    },
    []
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

  const hasActionHandlers = Boolean(onReply || onEdit || onDelete || onReact)

  return (
    <div className="flex flex-1 min-h-0 bg-[#0B141A] text-[#E9EDEF]">
      {/* Lista de contatos da instancia */}
      <aside className="hidden w-[320px] flex-shrink-0 flex-col border-r border-white/[0.04] bg-[#111B21] lg:flex">
        <div className="flex items-center justify-between border-b border-white/[0.04] bg-[#202C33] px-4 py-3 flex-shrink-0">
          <div>
            <p className="text-[15px] font-semibold text-[#E9EDEF]">Contatos</p>
            <p className="text-[12px] text-[#8696A0]">{instance.contacts?.length || 0} vinculados</p>
          </div>
        </div>
        <div className="border-b border-white/[0.04] bg-[#111B21] px-3 py-2 flex-shrink-0">
          <div className="flex items-center gap-2 rounded-lg bg-[#202C33] px-3 py-1">
            <Search className="h-4 w-4 flex-shrink-0 text-[#8696A0]" />
            <input
              value={contactSearch}
              onChange={(event: ChangeEvent<HTMLInputElement>) => setContactSearch(event.target.value)}
              placeholder="Pesquisar contato"
              className="h-9 flex-1 bg-transparent text-[14px] text-[#E9EDEF] placeholder:text-[#8696A0] focus:outline-none"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto scrollbar-thin">
          {filteredContacts.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center px-6 py-12 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/5 mb-3">
                <User className="h-6 w-6 text-white/20" />
              </div>
              <p className="text-[13px] text-[#8696A0]">Nenhum contato encontrado</p>
            </div>
          ) : (
            <ul>
              {filteredContacts.map((contact: Contact) => {
                const unread = contact.unread_count || 0
                const isArchived = contact.is_archived ?? false
                const isMuted = (contact.is_muted ?? 0) !== 0
                const isPinned = contact.is_pinned ?? false
                const isSelected = selectedContact?.id === contact.id
                const displayName = contact.name || formatPhoneNumber(contact.phone_number)
                const initials = displayName
                  .split(' ')
                  .slice(0, 2)
                  .map((w: string) => w[0])
                  .join('')
                  .toUpperCase()
                return (
                  <li
                    key={contact.id}
                    onContextMenu={(e) => handleContextMenu(e, contact)}
                    className="border-b border-white/[0.04]"
                  >
                    <button
                      onClick={() => onSelectContact(contact)}
                      onMouseEnter={() => onPreviewContact?.(contact)}
                      onFocus={() => onPreviewContact?.(contact)}
                      className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors duration-150 ${
                        isArchived ? 'opacity-50' : ''
                      } ${
                        isSelected ? 'bg-[#2A3942]' : 'hover:bg-white/[0.03]'
                      }`}
                    >
                      <div className="relative flex-shrink-0">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#2A3942] text-[#aebac1] text-sm font-semibold select-none">
                          {initials || <User className="h-5 w-5" />}
                        </div>
                        {/* Online dot placeholder — shown when there's a typing state for this contact */}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <p className="truncate text-[15px] font-normal text-[#E9EDEF] leading-tight">
                            {displayName}
                          </p>
                          <div className="flex flex-shrink-0 items-center gap-1 leading-tight">
                            {isPinned && (
                              <Pin className="h-3 w-3 text-[#8696A0]" />
                            )}
                            {isMuted && (
                              <BellOff className="h-3 w-3 text-[#8696A0]" />
                            )}
                            <span className={`text-[11px] ${unread > 0 ? 'text-[#25D366]' : 'text-[#8696A0]'}`}>
                              {formatTime(contact.updated_at)}
                            </span>
                          </div>
                        </div>
                        <div className="mt-0.5 flex items-center justify-between gap-2">
                          <p className="truncate text-[13px] text-[#8696A0]">
                            {contact.phone_number}
                          </p>
                          {unread > 0 ? (
                            <span className="flex-shrink-0 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[#25D366] px-1.5 text-[11px] font-semibold text-[#111B21]">
                              {unread > 99 ? '99+' : unread}
                            </span>
                          ) : null}
                        </div>
                      </div>
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
        <div className="flex items-center justify-between border-b border-white/[0.04] bg-[#202C33] px-4 py-2 flex-shrink-0">
          {selectedContact ? (
            <button
              type="button"
              onClick={onOpenContactDetails}
              className="flex items-center gap-3 rounded-lg px-2 py-1.5 transition hover:bg-white/5 focus:outline-none"
              title="Ver info do contato"
            >
              {(() => {
                const displayName = selectedContact.name || formatPhoneNumber(selectedContact.phone_number)
                const initials = displayName
                  .split(' ')
                  .slice(0, 2)
                  .map((w: string) => w[0])
                  .join('')
                  .toUpperCase()
                return (
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-[#2A3942] text-[#aebac1] text-sm font-semibold select-none">
                    {initials || <User className="h-4 w-4" />}
                  </div>
                )
              })()}
              <div className="text-left">
                <p className="text-[15px] font-normal text-[#E9EDEF] leading-tight">
                  {selectedContact.name || formatPhoneNumber(selectedContact.phone_number)}
                </p>
                {typingState && typingState !== 'paused' ? (
                  <p className="text-[13px] text-[#25D366] flex items-center gap-1">
                    <span className="typing-dots">
                      <span /><span /><span />
                    </span>
                    {typingState === 'composing' ? 'Digitando...' : 'Gravando áudio...'}
                  </p>
                ) : (
                  <p className="text-[13px] text-[#8696A0]">{selectedContact.phone_number}</p>
                )}
              </div>
            </button>
          ) : (
            <div className="px-2 py-1.5">
              <p className="text-[15px] font-normal text-[#E9EDEF]">Selecione um contato</p>
              <p className="text-[13px] text-[#8696A0]">Instância: {instance.name}</p>
            </div>
          )}
          <div className="flex items-center gap-1 text-[#aebac1]">
            <button className="rounded-full p-2 transition hover:bg-white/10 hover:text-[#E9EDEF]" title="Pesquisar na conversa">
              <Search className="h-5 w-5" />
            </button>
            <button className="rounded-full p-2 transition hover:bg-white/10 hover:text-[#E9EDEF]" title="Mais opções">
              <MoreVertical className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Context menu rendered at portal level within the chat area wrapper */}
        {contextMenu && instanceToken && (
          <ContactContextMenu
            contact={contextMenu.contact}
            instanceToken={instanceToken}
            position={contextMenu.position}
            onClose={() => setContextMenu(null)}
            onAction={handleContextMenuAction}
          />
        )}

        {/* Area de mensagens */}
        <div className="relative flex-1 overflow-hidden">
          {/* WhatsApp-style chat wallpaper */}
          <div className="chat-wallpaper absolute inset-0" />

          <div ref={messagesContainerRef} className="relative z-10 flex h-full flex-col overflow-y-auto px-4 py-4 scrollbar-thin">
            {!selectedContact ? (
              <div className="flex flex-1 items-center justify-center text-center">
                <div className="rounded-xl border border-white/5 bg-[#111B21]/80 px-10 py-8 shadow-lg">
                  <div className="flex h-16 w-16 mx-auto mb-4 items-center justify-center rounded-full bg-[#202C33]">
                    <User className="h-7 w-7 text-white/20" />
                  </div>
                  <p className="text-[15px] text-[#8696A0]">Escolha um contato para iniciar a conversa</p>
                </div>
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-1 items-center justify-center text-center">
                <div className="rounded-xl border border-white/5 bg-[#111B21]/80 px-10 py-8 shadow-lg">
                  <div className="flex h-16 w-16 mx-auto mb-4 items-center justify-center rounded-full bg-[#202C33]">
                    <User className="h-7 w-7 text-white/20" />
                  </div>
                  <p className="text-[15px] text-[#8696A0]">Nenhuma mensagem ainda. Envie a primeira!</p>
                </div>
              </div>
            ) : (
              groupedEntries.map(([dateString, dateMessages]: [string, Message[]]) => (
                <div key={dateString} className="space-y-1">
                  {/* Separador de data */}
                  <div className="flex items-center justify-center py-3">
                    <span className="rounded-lg bg-[#182229]/90 px-3 py-1 text-[12px] text-[#8696A0] shadow-sm">
                      {formatDate(dateMessages[0].created_at)}
                    </span>
                  </div>

                  {/* Mensagens do dia */}
                  <div className="space-y-[2px]">
                    {dateMessages.map((message: Message, idx: number) => {
                      const isOutbound = message.direction === 'outbound'
                      const isHovered = hoveredMessageId === message.id
                      const quotedMessage = message.reply_to_id ? messageById.get(message.reply_to_id) : null

                      // Grouping: detect first message in a sequence from the same sender
                      const prevMessage = idx > 0 ? dateMessages[idx - 1] : null
                      const isFirstInGroup = !prevMessage || prevMessage.direction !== message.direction
                      const nextMessage = idx < dateMessages.length - 1 ? dateMessages[idx + 1] : null
                      const isLastInGroup = !nextMessage || nextMessage.direction !== message.direction

                      return (
                        <div
                          key={message.id}
                          className={`group flex items-end gap-1 ${isOutbound ? 'justify-end' : 'justify-start'} ${isFirstInGroup ? 'mt-2' : ''}`}
                          onMouseEnter={() => setHoveredMessageId(message.id)}
                          onMouseLeave={() => setHoveredMessageId(null)}
                        >
                          {/* Actions toolbar for inbound messages (left side) */}
                          {!isOutbound && hasActionHandlers && (
                            <div className={`flex-shrink-0 transition-opacity duration-150 ${isHovered ? 'opacity-100' : 'opacity-0'}`}>
                              <MessageActions
                                message={message}
                                instanceToken={instanceToken}
                                contactNumber={selectedContact.phone_number}
                                onReply={onReply ?? (() => {})}
                                onEdit={onEdit ?? (() => {})}
                                onDelete={onDelete ?? (() => {})}
                                onReact={onReact ?? (() => {})}
                              />
                            </div>
                          )}

                          {/* Bubble + quoted + reactions */}
                          <div className={`flex max-w-[65%] flex-col gap-0.5 ${isOutbound ? 'items-end' : 'items-start'}`}>
                            {/* Quoted message preview */}
                            {quotedMessage && (
                              <div className={`w-full rounded-t-lg overflow-hidden text-xs ${isOutbound ? 'bg-[#025144]' : 'bg-[#182229]'}`}>
                                <div className={`border-l-4 px-3 py-2 ${isOutbound ? 'border-[#25D366]' : 'border-[#06cf9c]'}`}>
                                  <p className={`font-semibold mb-0.5 text-[12px] ${isOutbound ? 'text-[#25D366]' : 'text-[#06cf9c]'}`}>
                                    {quotedMessage.direction === 'outbound' ? 'Você' : selectedContact.name || selectedContact.phone_number}
                                  </p>
                                  <p className="truncate text-[#E9EDEF]/70">{quotedMessage.content || '...'}</p>
                                </div>
                              </div>
                            )}

                            {/* Message bubble */}
                            <div
                              className={`relative px-3 py-[6px] text-[14.2px] leading-[19px] shadow-sm ${
                                isOutbound
                                  ? `bg-[#005C4B] text-[#E9EDEF] ${
                                      isFirstInGroup ? 'bubble-tail-out rounded-tl-lg rounded-tr-lg rounded-bl-lg rounded-br-sm' : 'rounded-lg'
                                    }`
                                  : `bg-[#202C33] text-[#E9EDEF] ${
                                      isFirstInGroup ? 'bubble-tail-in rounded-tl-sm rounded-tr-lg rounded-bl-lg rounded-br-lg' : 'rounded-lg'
                                    }`
                              } ${quotedMessage ? '!rounded-t-none' : ''}`}
                            >
                              <p className="whitespace-pre-wrap break-words">{message.content}</p>
                              <div className="mt-[2px] flex items-center justify-end gap-1 float-right ml-3 -mb-0.5">
                                <span className="text-[11px] text-white/50 whitespace-nowrap">{formatTime(message.created_at)}</span>
                                {isOutbound && renderStatusIcon(message.status)}
                              </div>
                              <div className="clear-both" />
                            </div>

                            {/* Reaction badges */}
                            {message.reactions && message.reactions.length > 0 && (
                              <div className="flex flex-wrap gap-1 -mt-1">
                                {aggregateReactions(message.reactions).map(({ emoji, count }) => (
                                  <span
                                    key={emoji}
                                    className="flex items-center gap-0.5 rounded-full bg-[#182229] border border-white/10 px-2 py-0.5 text-[12px] shadow-sm"
                                    title={`${count} reação`}
                                  >
                                    {emoji}
                                    {count > 1 && <span className="text-[11px] text-[#8696A0] ml-0.5">{count}</span>}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Actions toolbar for outbound messages (right side) */}
                          {isOutbound && hasActionHandlers && (
                            <div className={`flex-shrink-0 transition-opacity duration-150 ${isHovered ? 'opacity-100' : 'opacity-0'}`}>
                              <MessageActions
                                message={message}
                                instanceToken={instanceToken}
                                contactNumber={selectedContact.phone_number}
                                onReply={onReply ?? (() => {})}
                                onEdit={onEdit ?? (() => {})}
                                onDelete={onDelete ?? (() => {})}
                                onReact={onReact ?? (() => {})}
                              />
                            </div>
                          )}
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

function aggregateReactions(reactions: Array<{ emoji: string; from: string }>): Array<{ emoji: string; count: number }> {
  const counts = new Map<string, number>()
  reactions.forEach(({ emoji }) => counts.set(emoji, (counts.get(emoji) ?? 0) + 1))
  return Array.from(counts.entries()).map(([emoji, count]) => ({ emoji, count }))
}

const formatPhoneNumber = (phone: string) => (!phone ? '' : phone.length < 10 ? phone : phone.replace(/(\d{2})(\d{2})(\d{5})(\d{4})/, '+$1 ($2) $3-$4'))
