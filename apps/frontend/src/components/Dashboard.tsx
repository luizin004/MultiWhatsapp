'use client'

import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { InstanceWithContacts, Message, Contact } from '@/types/database'
import Sidebar from './Sidebar'
import ChatArea from './ChatArea'
import MessageInput, { AttachmentPayload } from './MessageInput'
import AddInstanceModal, { ConnectionResultState } from './AddInstanceModal'
import { sendTextMessage, sendMediaMessage, deleteMessage, reactToMessage } from '@/services/uazapi'
import { UazapiSSE, UazapiEvent } from '@/lib/uazapi-sse'
import InstanceProfileModal from './InstanceProfileModal'
import ContactDetailsPanel from './ContactDetailsPanel'
import { BarChart3, Copy, X } from 'lucide-react'

// How long (ms) to keep a typing indicator visible before auto-clearing.
const TYPING_TIMEOUT_MS = 30_000

export default function Dashboard() {
  const [instances, setInstances] = useState<InstanceWithContacts[]>([])
  const [selectedInstanceId, setSelectedInstanceId] = useState<string | null>(null)
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [sendFeedback, setSendFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [editingInstance, setEditingInstance] = useState<InstanceWithContacts | null>(null)
  const [latestConnectionResult, setLatestConnectionResult] = useState<ConnectionResultState | null>(null)
  const [showConnectionToast, setShowConnectionToast] = useState(false)
  const [copiedToastField, setCopiedToastField] = useState<string | null>(null)
  const messageCacheRef = useRef<Record<string, Message[]>>({})

  // ── Message action state ──────────────────────────────────────────────────
  const [replyTo, setReplyTo] = useState<Message | null>(null)
  const [editingMessage, setEditingMessage] = useState<Message | null>(null)

  // ── Contact details panel ─────────────────────────────────────────────────
  const [showContactDetails, setShowContactDetails] = useState(false)

  // ── Typing/presence indicators keyed by contact phone number ─────────────
  const [typingContacts, setTypingContacts] = useState<Record<string, string>>({})
  const typingTimersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({})

  const selectedInstance = useMemo(
    () => instances.find((instance) => instance.id === selectedInstanceId) || null,
    [instances, selectedInstanceId]
  )

  const selectedContact = useMemo(() => {
    if (!selectedInstance) return null
    return selectedInstance.contacts?.find((contact) => contact.id === selectedContactId) || null
  }, [selectedInstance, selectedContactId])

  const updateContactUnreadLocally = useCallback((contactId: string, unreadCount: number) => {
    setInstances((prev) =>
      prev.map((instance) => ({
        ...instance,
        contacts: instance.contacts?.map((contact) =>
          contact.id === contactId ? { ...contact, unread_count: unreadCount } : contact
        ) || []
      }))
    )
  }, [])

  const markContactAsRead = useCallback(
    async (contactId: string) => {
      try {
        await supabase.from('contacts').update({ unread_count: 0 }).eq('id', contactId)
      } catch (error) {
        console.error('Erro ao marcar contato como lido:', error)
      } finally {
        updateContactUnreadLocally(contactId, 0)
      }
    },
    [updateContactUnreadLocally]
  )

  // ── Message cache (defined early so all handlers below can use it) ─────────

  const updateMessageCache = useCallback(
    (contactId: string, builder: (prev: Message[]) => Message[]) => {
      const previous = messageCacheRef.current[contactId] || []
      const next = builder(previous)
      messageCacheRef.current[contactId] = next
      if (selectedContactId === contactId) {
        setMessages(next)
      }
    },
    [selectedContactId]
  )

  const handleSendAttachment = async ({ url, mimeType, fileName, type, caption }: AttachmentPayload) => {
    if (!selectedInstance || !selectedContact) {
      throw new Error('Selecione uma instancia e um contato para enviar anexos.')
    }

    try {
      await sendMediaMessage({
        token: selectedInstance.uazapi_instance_id,
        number: selectedContact.phone_number,
        type,
        file: url,
        text: caption,
        docName: type === 'document' ? fileName : undefined,
        mimetype: mimeType
      })

      const fallbackContent = caption || fileName || `[${type.toUpperCase()}]`

      const { error: insertError } = await supabase.from('messages').insert({
        instance_id: selectedInstance.id,
        contact_id: selectedContact.id,
        content: fallbackContent,
        type,
        direction: 'outbound',
        status: 'sent',
        attachment_url: url,
        attachment_mime: mimeType,
        attachment_name: fileName
      })

      if (insertError) {
        console.error('Erro ao salvar mensagem com anexo localmente:', insertError)
      }

      await markContactAsRead(selectedContact.id)
      setSendFeedback({ type: 'success', message: 'Anexo enviado via UAZAPI.' })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Falha ao enviar anexo via UAZAPI.'
      setSendFeedback({ type: 'error', message })
      throw error
    }
  }

  // ── Message action handlers ───────────────────────────────────────────────

  const handleDeleteMessage = useCallback(
    async (messageId: string) => {
      if (!selectedInstance) return

      // Optimistically mark as deleted in cache
      const markDeleted = (prev: Message[]): Message[] =>
        prev.map((m) =>
          m.id === messageId ? { ...m, status: 'failed', content: '[Mensagem apagada]' } : m
        )

      if (selectedContact) {
        updateMessageCache(selectedContact.id, markDeleted)
      }

      try {
        await deleteMessage(selectedInstance.uazapi_instance_id, { id: messageId })
      } catch (error) {
        console.error('Erro ao apagar mensagem:', error)
        setSendFeedback({ type: 'error', message: 'Falha ao apagar a mensagem.' })
      }
    },
    [selectedInstance, selectedContact, updateMessageCache]
  )

  const handleReactMessage = useCallback(
    async (messageId: string, emoji: string) => {
      if (!selectedInstance || !selectedContact) return

      try {
        await reactToMessage(selectedInstance.uazapi_instance_id, {
          number: selectedContact.phone_number,
          text: emoji,
          id: messageId
        })

        // Optimistically update reactions in cache
        updateMessageCache(selectedContact.id, (prev) =>
          prev.map((m) => {
            if (m.id !== messageId) return m
            const existing = m.reactions ?? []
            const withoutSelf = existing.filter((r) => r.from !== 'me')
            const reactions = emoji ? [...withoutSelf, { emoji, from: 'me' }] : withoutSelf
            return { ...m, reactions }
          })
        )
      } catch (error) {
        console.error('Erro ao reagir à mensagem:', error)
        setSendFeedback({ type: 'error', message: 'Falha ao reagir à mensagem.' })
      }
    },
    [selectedInstance, selectedContact, updateMessageCache]
  )

  // ── Typing indicator helpers ──────────────────────────────────────────────

  const setContactTyping = useCallback((phone: string, state: string) => {
    setTypingContacts((prev) => ({ ...prev, [phone]: state }))

    // Clear any existing timer for this contact
    if (typingTimersRef.current[phone]) {
      clearTimeout(typingTimersRef.current[phone])
    }

    if (state === 'paused') {
      // Remove immediately on paused
      setTypingContacts((prev) => {
        const next = { ...prev }
        delete next[phone]
        return next
      })
      return
    }

    // Auto-clear after timeout
    typingTimersRef.current[phone] = setTimeout(() => {
      setTypingContacts((prev) => {
        const next = { ...prev }
        delete next[phone]
        return next
      })
    }, TYPING_TIMEOUT_MS)
  }, [])

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      Object.values(typingTimersRef.current).forEach(clearTimeout)
    }
  }, [])

  // ── Data fetching ─────────────────────────────────────────────────────────

  const fetchInstances = async () => {
    try {
      const { data, error } = await supabase
        .from('instances')
        .select(`
          *,
          contacts:contacts(*)
        `)
        .order('updated_at', { ascending: false })
        .order('updated_at', { ascending: false, referencedTable: 'contacts' })

      if (error) throw error
      setInstances(data || [])
    } catch (error) {
      console.error('Erro ao buscar instancias:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchMessages = useCallback(
    async (instanceId: string, contactId: string) => {
      try {
        const { data, error } = await supabase
          .from('messages')
          .select('*')
          .eq('instance_id', instanceId)
          .eq('contact_id', contactId)
          .order('created_at', { ascending: true })

        if (error) throw error
        const normalized = data || []
        updateMessageCache(contactId, () => normalized)
      } catch (error) {
        console.error('Erro ao buscar mensagens:', error)
      }
    },
    [updateMessageCache]
  )

  // ── SSE handler ───────────────────────────────────────────────────────────

  const sseConnectionsRef = useRef<UazapiSSE[]>([])

  useEffect(() => {
    const uazapiUrl = process.env.NEXT_PUBLIC_UAZAPI_BASE_URL
    if (!uazapiUrl) return

    sseConnectionsRef.current.forEach((sse) => sse.disconnect())
    sseConnectionsRef.current = []

    const connectedInstances = instances.filter((inst) => inst.status === 'connected')

    connectedInstances.forEach((inst) => {
      const sse = new UazapiSSE(inst.uazapi_instance_id, uazapiUrl)

      sse.connect(
        async (event: UazapiEvent) => {
          // ── Inbound message ────────────────────────────────────────────────
          if (event.type === 'message') {
            if (!event.data) return
            const msg = event.data
            if (msg.wasSentByApi) return

            const rawPhone =
              msg.chatid || msg.from || msg.sender_pn ||
              (msg.sender && msg.sender.includes('@s.whatsapp.net') ? msg.sender : '')

            if (!rawPhone) return
            const phoneNumber = rawPhone.replace('@s.whatsapp.net', '').replace('@lid', '')

            const messageText = msg.text || msg.content
            if (!messageText) return

            const localContact = inst.contacts?.find((c) => c.phone_number === phoneNumber)

            if (!localContact) {
              setTimeout(() => fetchInstances(), 1500)
              return
            }

            const optimisticMsg: Message = {
              id: `sse-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
              instance_id: inst.id,
              contact_id: localContact.id,
              content: messageText,
              type: 'text',
              direction: 'inbound',
              status: 'delivered',
              isOptimistic: true,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }

            updateMessageCache(localContact.id, (prev) => {
              const isDupe = prev.some(
                (m) =>
                  m.content === messageText &&
                  m.direction === 'inbound' &&
                  Math.abs(new Date(m.created_at).getTime() - Date.now()) < 5000
              )
              if (isDupe) return prev
              return [...prev, optimisticMsg]
            })

            const isViewingThisContact =
              selectedInstanceId === inst.id && selectedContactId === localContact.id

            if (!isViewingThisContact) {
              updateContactUnreadLocally(localContact.id, (localContact.unread_count || 0) + 1)
            } else {
              markContactAsRead(localContact.id)
            }

            setInstances((prev) =>
              prev.map((instance) => {
                if (instance.id !== inst.id) return instance
                return {
                  ...instance,
                  contacts: instance.contacts?.map((c) =>
                    c.id === localContact.id
                      ? { ...c, updated_at: new Date().toISOString() }
                      : c
                  ) || []
                }
              })
            )
            return
          }

          // ── Message status update / reaction / delete ──────────────────────
          if (event.type === 'message_update') {
            const update = event.data
            if (!update) return

            const externalId = update.id || update.messageid
            if (!externalId) return

            // Find which contact owns this message across all contacts in this instance
            const allContactIds = inst.contacts?.map((c) => c.id) ?? []

            for (const contactId of allContactIds) {
              const cached = messageCacheRef.current[contactId] ?? []
              const msgIndex = cached.findIndex(
                (m) => m.id === externalId || m.external_id === externalId
              )
              if (msgIndex === -1) continue

              updateMessageCache(contactId, (prev) =>
                prev.map((m, idx) => {
                  if (idx !== msgIndex) return m

                  // Deletion
                  if (update.status === 'deleted') {
                    return { ...m, content: '[Mensagem apagada]', status: 'failed' as Message['status'] }
                  }

                  // Status update (sent → delivered → read)
                  const statusMap: Record<string, Message['status']> = {
                    sent: 'sent',
                    delivered: 'delivered',
                    read: 'read',
                  }
                  const newStatus = update.status ? (statusMap[update.status] ?? m.status) : m.status

                  // Reaction
                  let reactions = m.reactions ?? []
                  if (update.reaction !== undefined) {
                    const senderKey = update.sender_pn || update.from || 'unknown'
                    reactions = reactions.filter((r) => r.from !== senderKey)
                    if (update.reaction) {
                      reactions = [...reactions, { emoji: update.reaction, from: senderKey }]
                    }
                  }

                  // Edit
                  const content =
                    update.edited !== undefined && update.edited !== null
                      ? update.edited
                      : m.content

                  return { ...m, status: newStatus, reactions, content }
                })
              )
              break
            }
            return
          }

          // ── Presence (typing / recording) ─────────────────────────────────
          if (event.type === 'presence') {
            const presence = event.data
            if (!presence) return

            const rawPhone =
              presence.chatid ||
              presence.from ||
              presence.sender_pn ||
              (presence.sender?.includes('@s.whatsapp.net') ? presence.sender : '')

            if (!rawPhone) return
            const phone = rawPhone.replace('@s.whatsapp.net', '').replace('@lid', '')
            const state = presence.presence ?? presence.state ?? ''

            setContactTyping(phone, state)
            return
          }

          // ── Connection state change ────────────────────────────────────────
          if (event.type === 'connection') {
            const conn = event.data
            const newState = conn?.state
            if (!newState) return

            console.log(`SSE connection change for ${inst.name}:`, newState)

            // Reflect the new status on the instance in local state
            const mappedStatus =
              newState === 'connected'
                ? 'connected'
                : newState === 'disconnected'
                  ? 'disconnected'
                  : inst.status

            setInstances((prev) =>
              prev.map((i) =>
                i.id === inst.id ? { ...i, status: mappedStatus as InstanceWithContacts['status'] } : i
              )
            )
            return
          }

          // ── Labels ────────────────────────────────────────────────────────
          if (event.type === 'labels') {
            // Refresh instances to pick up label changes
            fetchInstances()
            return
          }
        },
        (error) => {
          console.error(`SSE erro (${inst.name}):`, error)
        }
      )

      sseConnectionsRef.current.push(sse)
    })

    return () => {
      sseConnectionsRef.current.forEach((sse) => sse.disconnect())
      sseConnectionsRef.current = []
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [instances.map((i) => i.id + i.status).join(',')])

  // ── Realtime Supabase subscriptions ──────────────────────────────────────

  useEffect(() => {
    const messageSubscription = supabase
      .channel('messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages'
        },
        (payload) => {
          const newMessage = payload.new as Message

          updateMessageCache(newMessage.contact_id, (prev) => {
            if (prev.find((m) => m.id === newMessage.id)) return prev

            const optimisticIndex = prev.findIndex(
              (m) =>
                m.isOptimistic &&
                m.content === newMessage.content &&
                m.direction === newMessage.direction
            )
            if (optimisticIndex !== -1) {
              const next = [...prev]
              next[optimisticIndex] = newMessage
              return next
            }

            return [...prev, newMessage]
          })

          const isViewing =
            selectedInstanceId === newMessage.instance_id &&
            selectedContactId === newMessage.contact_id

          if (newMessage.direction === 'inbound' && !isViewing) {
            setInstances((prev) =>
              prev.map((instance) => ({
                ...instance,
                contacts: instance.contacts?.map((c) =>
                  c.id === newMessage.contact_id
                    ? {
                        ...c,
                        unread_count: (c.unread_count || 0) + 1,
                        updated_at: new Date().toISOString()
                      }
                    : c
                ) || []
              }))
            )
          }
        }
      )
      .subscribe()

    const contactSubscription = supabase
      .channel('contacts')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'contacts' },
        () => { fetchInstances() }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(messageSubscription)
      supabase.removeChannel(contactSubscription)
    }
  }, [selectedInstanceId, selectedContactId, updateMessageCache])

  // ── Initial load ──────────────────────────────────────────────────────────

  useEffect(() => {
    fetchInstances()
  }, [])

  useEffect(() => {
    if (!selectedInstance) {
      setSelectedContactId(null)
      return
    }

    if (selectedInstance.contacts?.length) {
      const exists = selectedInstance.contacts.some((contact) => contact.id === selectedContactId)
      if (!exists) {
        setSelectedContactId(selectedInstance.contacts[0].id)
      }
    } else {
      setSelectedContactId(null)
    }
  }, [selectedInstance, selectedContactId])

  useEffect(() => {
    if (selectedInstance && selectedContact) {
      const cached = messageCacheRef.current[selectedContact.id]
      setMessages(cached || [])
      fetchMessages(selectedInstance.id, selectedContact.id)
    } else {
      setMessages([])
    }
  }, [selectedInstance, selectedContact, fetchMessages])

  // Close contact details panel when contact changes
  useEffect(() => {
    setShowContactDetails(false)
  }, [selectedContactId])

  const prefetchContactMessages = useCallback(
    (contact: Contact) => {
      if (!selectedInstance) return
      if (messageCacheRef.current[contact.id]?.length) return
      fetchMessages(selectedInstance.id, contact.id)
    },
    [selectedInstance, fetchMessages]
  )

  useEffect(() => {
    if (!sendFeedback) return
    const timeout = setTimeout(() => setSendFeedback(null), 4000)
    return () => clearTimeout(timeout)
  }, [sendFeedback])

  // ── Send handlers ─────────────────────────────────────────────────────────

  const handleSendMessage = async (content: string) => {
    if (!selectedInstance || !selectedContact) {
      throw new Error('Selecione uma instancia e um contato para enviar mensagens.')
    }

    const optimisticMsg: Message = {
      id: `opt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      instance_id: selectedInstance.id,
      contact_id: selectedContact.id,
      content,
      type: 'text',
      direction: 'outbound',
      status: 'sent',
      isOptimistic: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    updateMessageCache(selectedContact.id, (prev) => [...prev, optimisticMsg])

    try {
      await sendTextMessage({
        token: selectedInstance.uazapi_instance_id,
        number: selectedContact.phone_number,
        text: content
      })
      await markContactAsRead(selectedContact.id)
    } catch (error) {
      updateMessageCache(selectedContact.id, (prev) =>
        prev.filter((m) => m.id !== optimisticMsg.id)
      )
      const message =
        error instanceof Error ? error.message : 'Falha ao enviar mensagem via UAZAPI.'
      setSendFeedback({ type: 'error', message })
      throw error
    }
  }

  // ── Instance CRUD handlers ────────────────────────────────────────────────

  const handleInstanceCreated = (instance: InstanceWithContacts) => {
    setInstances((prev) => {
      const filtered = prev.filter((item) => item.id !== instance.id)
      return [instance, ...filtered]
    })
    setSelectedInstanceId(instance.id)
    const firstContact = instance.contacts?.[0]
    setSelectedContactId(firstContact ? firstContact.id : null)
  }

  const handleSelectInstance = (instance: InstanceWithContacts) => {
    setSelectedInstanceId(instance.id)
    const firstContact = instance.contacts?.[0]
    setSelectedContactId(firstContact ? firstContact.id : null)
  }

  const handleSelectContact = (contact: Contact) => {
    setSelectedContactId(contact.id)
    markContactAsRead(contact.id)
  }

  const handleInstanceUpdated = (updatedInstance: InstanceWithContacts) => {
    setInstances((prev) =>
      prev.map((instance) => (instance.id === updatedInstance.id ? updatedInstance : instance))
    )
    if (selectedInstanceId === updatedInstance.id) {
      setSelectedInstanceId(updatedInstance.id)
    }
    setEditingInstance(null)
  }

  const handleInstanceDeleted = (instanceId: string) => {
    setInstances((prev) => prev.filter((instance) => instance.id !== instanceId))
    if (selectedInstanceId === instanceId) {
      setSelectedInstanceId(null)
      setSelectedContactId(null)
    }
    setEditingInstance(null)
  }

  const handleConnectionReady = (result: ConnectionResultState) => {
    setLatestConnectionResult(result)
    setShowConnectionToast(true)
  }

  const handleClearConnectionResult = () => {
    setLatestConnectionResult(null)
    setShowConnectionToast(false)
  }

  const toastQrCodeSrc = useMemo(() => {
    if (!latestConnectionResult?.qrcode) return null
    return latestConnectionResult.qrcode.startsWith('data:')
      ? latestConnectionResult.qrcode
      : `data:image/png;base64,${latestConnectionResult.qrcode}`
  }, [latestConnectionResult?.qrcode])

  const handleToastCopy = async (value: string, key: string) => {
    try {
      await navigator.clipboard.writeText(value)
      setCopiedToastField(key)
      setTimeout(() => {
        setCopiedToastField((current) => (current === key ? null : current))
      }, 2000)
    } catch (error) {
      console.error('Erro ao copiar dados da conexão:', error)
    }
  }

  const handleConnectionToastClose = () => {
    setShowConnectionToast(false)
  }

  // ── Typing indicator for selected contact ────────────────────────────────

  const selectedContactTyping = selectedContact
    ? typingContacts[selectedContact.phone_number] ?? null
    : null

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-[#0B141A] text-[#E9EDEF]">
      <div className="relative flex h-screen w-full max-w-[1600px] flex-1 overflow-hidden px-2 py-4 md:px-6">
        <div className="pointer-events-none absolute inset-0 opacity-[0.3]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(37,211,102,0.12),_transparent_55%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom,_rgba(7,94,84,0.25),_transparent_60%)]" />
        </div>

        <div className="absolute right-6 top-6 z-20 flex items-center gap-3">
          <Link
            href="/metrics"
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-[#E9EDEF] shadow-lg shadow-black/20 transition hover:bg-white/10"
          >
            <BarChart3 className="h-4 w-4 text-[#25D366]" />
            Painel de métricas
          </Link>
        </div>

        <div className="relative z-10 flex h-full w-full overflow-hidden rounded-3xl border border-white/5 bg-[#111B21] shadow-[0_20px_80px_rgba(0,0,0,0.45)]">
          <Sidebar
            instances={instances}
            selectedInstance={selectedInstance}
            onSelectInstance={handleSelectInstance}
            loading={loading}
            onAddInstance={() => setIsModalOpen(true)}
            onEditInstance={(instance) => setEditingInstance(instance)}
          />

          <div className="flex min-h-0 flex-1 flex-col bg-[#0B141A]">
            {selectedInstance ? (
              <>
                {/* Chat area — wraps the contact list + message pane + contact details panel */}
                <div className="relative flex min-h-0 flex-1 overflow-hidden">
                  <ChatArea
                    messages={messages}
                    instance={selectedInstance}
                    selectedContact={selectedContact}
                    onSelectContact={handleSelectContact}
                    onPreviewContact={prefetchContactMessages}
                    instanceToken={selectedInstance.uazapi_instance_id}
                    onReplyMessage={(msg) => setReplyTo(msg)}
                    onEditMessage={(msg) => setEditingMessage(msg)}
                    onDeleteMessage={handleDeleteMessage}
                    onReactMessage={handleReactMessage}
                    onOpenContactDetails={() => setShowContactDetails(true)}
                    typingState={selectedContactTyping}
                  />

                  {/* Contact details panel — slides in over the chat area */}
                  {selectedContact && (
                    <ContactDetailsPanel
                      open={showContactDetails}
                      contact={selectedContact}
                      instanceToken={selectedInstance.uazapi_instance_id}
                      onClose={() => setShowContactDetails(false)}
                    />
                  )}
                </div>

                <div className="border-t border-white/5 bg-[#111B21]">
                  {sendFeedback && (
                    <div
                      className={`border-b border-white/5 px-4 py-2 text-sm ${
                        sendFeedback.type === 'success'
                          ? 'bg-[#233d2f] text-[#7dd2a5]'
                          : 'bg-[#3a1f21] text-[#f7a8a2]'
                      }`}
                    >
                      {sendFeedback.message}
                    </div>
                  )}
                  <MessageInput
                    onSendMessage={handleSendMessage}
                    onSendAttachment={handleSendAttachment}
                    disabled={!selectedContact}
                    selectedInstanceId={selectedInstance?.id ?? null}
                    selectedContactId={selectedContact?.id ?? null}
                    replyTo={replyTo}
                    editMessage={editingMessage}
                    onCancelReply={() => setReplyTo(null)}
                    onCancelEdit={() => setEditingMessage(null)}
                  />
                </div>
              </>
            ) : (
              <div className="flex flex-1 items-center justify-center bg-[#0B141A] px-6">
                <div className="rounded-2xl border border-white/5 bg-[#111B21] px-8 py-10 text-center shadow-2xl">
                  <p className="text-lg font-semibold text-[#E9EDEF]">Central de conversas</p>
                  <p className="mt-2 text-sm text-[#8696A0]">
                    Selecione uma instancia na lateral para iniciar uma conversa.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <AddInstanceModal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onInstanceCreated={handleInstanceCreated}
        onConnectionReady={handleConnectionReady}
        onClearConnectionResult={handleClearConnectionResult}
        latestConnectionResult={latestConnectionResult}
      />

      <InstanceProfileModal
        open={Boolean(editingInstance)}
        instance={editingInstance}
        onClose={() => setEditingInstance(null)}
        onUpdated={handleInstanceUpdated}
        onDeleted={handleInstanceDeleted}
      />

      {showConnectionToast && latestConnectionResult && (
        <div className="fixed bottom-6 right-6 z-50 w-80 rounded-2xl border border-white/10 bg-[#111B21] p-4 shadow-[0_20px_50px_rgba(0,0,0,0.45)]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-[#8696A0]">
                Instância pronta
              </p>
              <p className="text-sm font-bold text-[#E9EDEF]">{latestConnectionResult.instanceName}</p>
            </div>
            <button
              onClick={handleConnectionToastClose}
              className="rounded-full p-1 text-white/60 transition hover:bg-white/10 hover:text-white"
              aria-label="Fechar resumo rápido"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-3 space-y-3 text-xs text-[#8696A0]">
            <div className="rounded-xl border border-white/10 bg-[#0B141A] px-3 py-2">
              <p className="text-[11px] uppercase tracking-wide">Token</p>
              <div className="mt-1 flex items-center gap-2 text-[11px] text-[#E9EDEF]">
                <span className="flex-1 truncate">{latestConnectionResult.token}</span>
                <button
                  onClick={() => handleToastCopy(latestConnectionResult.token, 'token')}
                  className="inline-flex items-center gap-1 rounded-full border border-white/10 px-2 py-1 text-[10px] text-[#E9EDEF] hover:bg-white/10"
                >
                  <Copy className="h-3 w-3" />
                  {copiedToastField === 'token' ? 'OK' : 'Copiar'}
                </button>
              </div>
            </div>

            {latestConnectionResult.mode === 'paircode' && latestConnectionResult.paircode ? (
              <div className="rounded-xl border border-[#25D366] bg-[#13251b] px-3 py-2 text-center">
                <p className="text-[11px] uppercase tracking-wide text-[#7dd2a5]">
                  Código de pareamento
                </p>
                <p className="mt-1 text-2xl font-bold tracking-[0.3rem] text-[#7dd2a5]">
                  {latestConnectionResult.paircode.replace(/(.{4})/g, '$1 ').trim()}
                </p>
                <button
                  onClick={() => handleToastCopy(latestConnectionResult.paircode!, 'paircode')}
                  className="mt-2 inline-flex items-center justify-center gap-1 rounded-full border border-[#25D366] px-3 py-1 text-[11px] font-semibold text-[#25D366] hover:bg-[#1f2c24]"
                >
                  <Copy className="h-3 w-3" />
                  {copiedToastField === 'paircode' ? 'Copiado' : 'Copiar'}
                </button>
              </div>
            ) : null}

            {latestConnectionResult.mode === 'qrcode' && toastQrCodeSrc ? (
              <div className="rounded-xl border border-white/10 bg-white p-3 text-center">
                <p className="text-[11px] uppercase tracking-wide text-[#0B141A]">QR Code</p>
                <img src={toastQrCodeSrc} alt="QR Code da instância" className="mx-auto mt-2 w-40" />
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  )
}
