'use client'

import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { InstanceWithContacts, Message, Contact, GroupInfo } from '@/types/database'
import Sidebar from './Sidebar'
import ChatArea from './ChatArea'
import MessageInput, { AttachmentPayload } from './MessageInput'
import AddInstanceModal, { ConnectionResultState } from './AddInstanceModal'
import { sendTextMessage, sendMediaMessage, deleteMessage, reactToMessage, editMessage } from '@/services/uazapi'
import { UazapiSSE, UazapiEvent } from '@/lib/uazapi-sse'
import InstanceProfileModal from './InstanceProfileModal'
import ContactDetailsPanel from './ContactDetailsPanel'
import GroupList from './groups/GroupList'
import GroupDetails from './groups/GroupDetails'
import CreateGroupModal from './groups/CreateGroupModal'
import JoinGroupModal from './groups/JoinGroupModal'
import QuickReplyManager from './QuickReplyManager'
import LabelsManager from './LabelsManager'
import WebhookManager from './WebhookManager'
import { BarChart3, Copy, X, Settings, MessageSquare, Users, Monitor, Smartphone, ArrowLeft, User, Check, CheckCheck, AlertCircle } from 'lucide-react'

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

  // ── Sidebar tab: chats vs groups ──────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<'chats' | 'groups'>('chats')

  // ── Groups state ──────────────────────────────────────────────────────────
  const [selectedGroupJid, setSelectedGroupJid] = useState<string | null>(null)
  const [showGroupDetails, setShowGroupDetails] = useState(false)
  const [showCreateGroup, setShowCreateGroup] = useState(false)
  const [showJoinGroup, setShowJoinGroup] = useState(false)

  // ── Settings / tools menu ─────────────────────────────────────────────────
  const [settingsMenuOpen, setSettingsMenuOpen] = useState(false)
  const [showQuickReplies, setShowQuickReplies] = useState(false)
  const [showLabels, setShowLabels] = useState(false)
  const [showWebhooks, setShowWebhooks] = useState(false)

  // ── View mode toggle (desktop / mobile) ──────────────────────────────────
  const [viewMode, setViewMode] = useState<'desktop' | 'mobile'>('desktop')
  // Mobile panel navigation: which screen is visible
  const [mobilePanel, setMobilePanel] = useState<'sidebar' | 'contacts' | 'chat'>('sidebar')

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

  const handleSaveEdit = useCallback(
    async (messageId: string, newContent: string) => {
      if (!selectedInstance || !selectedContact) return

      // Optimistically update the message content in cache
      updateMessageCache(selectedContact.id, (prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, content: newContent } : m))
      )

      try {
        await editMessage(selectedInstance.uazapi_instance_id, {
          id: messageId,
          text: newContent,
        })
      } catch (error) {
        console.error('Erro ao editar mensagem:', error)
        setSendFeedback({ type: 'error', message: 'Falha ao editar a mensagem.' })
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

  // Reset group selection when instance changes
  useEffect(() => {
    setSelectedGroupJid(null)
    setShowGroupDetails(false)
  }, [selectedInstanceId])

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
    if (viewMode === 'mobile') setMobilePanel('contacts')
  }

  const handleSelectContact = (contact: Contact) => {
    setSelectedContactId(contact.id)
    markContactAsRead(contact.id)
    if (viewMode === 'mobile') setMobilePanel('chat')
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

  // Shared sidebar header (tabs + settings)
  const renderSidebarHeader = () => (
    <div className="flex items-center bg-[#202C33] px-3 py-2 flex-shrink-0 gap-1">
      <button
        onClick={() => setActiveTab('chats')}
        className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-[13px] font-medium transition ${
          activeTab === 'chats'
            ? 'bg-[#2A3942] text-[#E9EDEF]'
            : 'text-[#8696A0] hover:bg-white/5 hover:text-[#E9EDEF]'
        }`}
        title="Conversas"
      >
        <MessageSquare className="h-4 w-4" />
        Conversas
      </button>
      <button
        onClick={() => setActiveTab('groups')}
        className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-[13px] font-medium transition ${
          activeTab === 'groups'
            ? 'bg-[#2A3942] text-[#E9EDEF]'
            : 'text-[#8696A0] hover:bg-white/5 hover:text-[#E9EDEF]'
        }`}
        title="Grupos"
      >
        <Users className="h-4 w-4" />
        Grupos
      </button>
      <div className="relative ml-1">
        <button
          onClick={() => setSettingsMenuOpen((prev) => !prev)}
          className="rounded-full p-2 text-[#aebac1] transition hover:bg-white/10 hover:text-[#E9EDEF]"
          title="Configurações"
        >
          <Settings className="h-4 w-4" />
        </button>
        {settingsMenuOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setSettingsMenuOpen(false)} />
            <div className="absolute right-0 top-full z-50 mt-1 w-48 rounded-xl border border-white/10 bg-[#202C33] py-1 shadow-xl">
              <button type="button" onClick={() => { setShowQuickReplies(true); setSettingsMenuOpen(false) }} disabled={!selectedInstance} className="flex w-full items-center gap-2 px-4 py-2 text-sm text-[#E9EDEF] transition hover:bg-white/5 disabled:text-white/30 disabled:cursor-not-allowed">Respostas rápidas</button>
              <button type="button" onClick={() => { setShowLabels(true); setSettingsMenuOpen(false) }} disabled={!selectedInstance} className="flex w-full items-center gap-2 px-4 py-2 text-sm text-[#E9EDEF] transition hover:bg-white/5 disabled:text-white/30 disabled:cursor-not-allowed">Etiquetas</button>
              <button type="button" onClick={() => { setShowWebhooks(true); setSettingsMenuOpen(false) }} disabled={!selectedInstance} className="flex w-full items-center gap-2 px-4 py-2 text-sm text-[#E9EDEF] transition hover:bg-white/5 disabled:text-white/30 disabled:cursor-not-allowed">Webhooks</button>
              <button type="button" disabled className="flex w-full items-center gap-2 px-4 py-2 text-sm text-[#8696A0]/50 cursor-not-allowed">Privacidade</button>
            </div>
          </>
        )}
      </div>
    </div>
  )

  // Shared chat content (used in both desktop and mobile)
  const renderChatContent = () => {
    if (!selectedInstance) {
      return (
        <div className="flex flex-1 items-center justify-center bg-[#0B141A] px-6">
          <div className="text-center">
            <div className="flex h-24 w-24 mx-auto mb-6 items-center justify-center rounded-full border-4 border-[#202C33]">
              <BarChart3 className="h-10 w-10 text-[#25D366]/30" />
            </div>
            <p className="text-[17px] font-light text-[#E9EDEF]">Vigia WhatsApp</p>
            <p className="mt-2 text-[14px] text-[#8696A0]">Selecione uma instância para ver as conversas.</p>
          </div>
        </div>
      )
    }

    return (
      <>
        <div className="relative flex min-h-0 flex-1 overflow-hidden">
          {activeTab === 'groups' ? (
            <div className="flex flex-1 min-h-0">
              <div className={`${viewMode === 'mobile' ? 'w-full' : 'w-[320px]'} flex-shrink-0 border-r border-white/[0.04]`}>
                <div className="flex items-center justify-between border-b border-white/[0.04] bg-[#202C33] px-4 py-3">
                  <p className="text-[15px] font-semibold text-[#E9EDEF]">Grupos</p>
                  <button type="button" onClick={() => setShowJoinGroup(true)} className="rounded-full p-1.5 text-[#8696A0] transition hover:bg-white/10 hover:text-[#E9EDEF]" title="Entrar em grupo">
                    <Users className="h-4 w-4" />
                  </button>
                </div>
                <div className="flex-1 overflow-hidden" style={{ height: 'calc(100% - 56px)' }}>
                  <GroupList instanceToken={selectedInstance.uazapi_instance_id} onSelectGroup={(group: GroupInfo) => { setSelectedGroupJid(group.jid); setShowGroupDetails(true) }} selectedGroupJid={selectedGroupJid} onCreateGroup={() => setShowCreateGroup(true)} />
                </div>
              </div>
              {viewMode !== 'mobile' && (
                <div className="flex flex-1 items-center justify-center bg-[#0B141A]">
                  <div className="text-center">
                    <div className="flex h-20 w-20 mx-auto mb-4 items-center justify-center rounded-full border-2 border-[#202C33]">
                      <Users className="h-8 w-8 text-[#25D366]/30" />
                    </div>
                    <p className="text-[15px] font-light text-[#8696A0]">Selecione um grupo para ver os detalhes</p>
                  </div>
                </div>
              )}
              {selectedGroupJid && <GroupDetails open={showGroupDetails} groupJid={selectedGroupJid} instanceToken={selectedInstance.uazapi_instance_id} onClose={() => setShowGroupDetails(false)} />}
              <CreateGroupModal open={showCreateGroup} instanceToken={selectedInstance.uazapi_instance_id} onClose={() => setShowCreateGroup(false)} onCreated={(group: GroupInfo) => { setShowCreateGroup(false); setSelectedGroupJid(group.jid); setShowGroupDetails(true) }} />
              <JoinGroupModal open={showJoinGroup} instanceToken={selectedInstance.uazapi_instance_id} onClose={() => setShowJoinGroup(false)} onJoined={() => setShowJoinGroup(false)} />
            </div>
          ) : (
            <>
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
                hideContactList={viewMode === 'mobile'}
              />
              {selectedContact && <ContactDetailsPanel open={showContactDetails} contact={selectedContact} instanceToken={selectedInstance.uazapi_instance_id} onClose={() => setShowContactDetails(false)} />}
            </>
          )}
        </div>
        {activeTab === 'chats' && (
          <div className="flex-shrink-0 border-t border-white/[0.04]">
            {sendFeedback && (
              <div className={`border-b border-white/[0.04] px-4 py-2 text-[13px] ${sendFeedback.type === 'success' ? 'bg-[#1a2c23] text-[#7dd2a5]' : 'bg-[#2c1a1b] text-[#f7a8a2]'}`}>
                {sendFeedback.message}
              </div>
            )}
            <MessageInput
              onSendMessage={handleSendMessage}
              onSendAttachment={handleSendAttachment}
              onSaveEdit={handleSaveEdit}
              disabled={!selectedContact}
              selectedInstanceId={selectedInstance?.id ?? null}
              selectedContactId={selectedContact?.id ?? null}
              replyTo={replyTo}
              editMessage={editingMessage}
              onCancelReply={() => setReplyTo(null)}
              onCancelEdit={() => setEditingMessage(null)}
              instanceToken={selectedInstance?.uazapi_instance_id}
              contactNumber={selectedContact?.phone_number}
            />
          </div>
        )}
      </>
    )
  }

  // ── Mobile contact list panel ───────────────────────────────────────────
  const renderMobileContactList = () => {
    if (!selectedInstance) return null
    const contacts = selectedInstance.contacts || []
    return (
      <div className="flex h-full flex-col bg-[#111B21]">
        <div className="flex items-center gap-3 border-b border-white/[0.04] bg-[#202C33] px-3 py-3 flex-shrink-0">
          <button onClick={() => setMobilePanel('sidebar')} className="rounded-full p-1.5 text-[#aebac1] transition hover:bg-white/10">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <p className="text-[15px] font-semibold text-[#E9EDEF]">{selectedInstance.name || selectedInstance.uazapi_instance_id}</p>
            <p className="text-[12px] text-[#8696A0]">{contacts.length} contatos</p>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto scrollbar-thin">
          {contacts.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center px-6 py-12 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/5 mb-3">
                <User className="h-6 w-6 text-white/20" />
              </div>
              <p className="text-[13px] text-[#8696A0]">Nenhum contato</p>
            </div>
          ) : (
            <ul>
              {contacts.map((contact) => {
                const unread = contact.unread_count || 0
                const isSelected = selectedContactId === contact.id
                const displayName = contact.name || contact.phone_number
                const initials = displayName.split(' ').slice(0, 2).map((w: string) => w[0]).join('').toUpperCase()
                return (
                  <li key={contact.id} className="border-b border-white/[0.04]">
                    <button
                      onClick={() => handleSelectContact(contact)}
                      className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors ${isSelected ? 'bg-[#2A3942]' : 'hover:bg-white/[0.03]'}`}
                    >
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#2A3942] text-[#aebac1] text-sm font-semibold select-none flex-shrink-0">
                        {initials || <User className="h-5 w-5" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <p className="truncate text-[15px] text-[#E9EDEF]">{displayName}</p>
                          <span className={`flex-shrink-0 text-[11px] ${unread > 0 ? 'text-[#25D366]' : 'text-[#8696A0]'}`}>
                            {new Date(contact.updated_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <div className="mt-0.5 flex items-center justify-between gap-2">
                          <p className="truncate text-[13px] text-[#8696A0]">{contact.phone_number}</p>
                          {unread > 0 && (
                            <span className="flex-shrink-0 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[#25D366] px-1.5 text-[11px] font-semibold text-[#111B21]">
                              {unread > 99 ? '99+' : unread}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>
    )
  }

  // ── Mobile chat panel ───────────────────────────────────────────────────
  const renderMobileChatPanel = () => {
    if (!selectedInstance) return null
    return (
      <div className="flex h-full flex-col bg-[#0B141A]">
        {/* Mobile chat header with back button */}
        <div className="flex items-center gap-2 border-b border-white/[0.04] bg-[#202C33] px-2 py-2 flex-shrink-0">
          <button onClick={() => setMobilePanel('contacts')} className="rounded-full p-1.5 text-[#aebac1] transition hover:bg-white/10 flex-shrink-0">
            <ArrowLeft className="h-5 w-5" />
          </button>
          {selectedContact ? (
            <button
              type="button"
              onClick={() => setShowContactDetails(true)}
              className="flex items-center gap-2 rounded-lg px-1 py-1 transition hover:bg-white/5 min-w-0 flex-1"
            >
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-[#2A3942] text-[#aebac1] text-xs font-semibold select-none">
                {(selectedContact.name || selectedContact.phone_number).split(' ').slice(0, 2).map((w: string) => w[0]).join('').toUpperCase() || <User className="h-4 w-4" />}
              </div>
              <div className="text-left min-w-0">
                <p className="truncate text-[14px] text-[#E9EDEF] leading-tight">{selectedContact.name || selectedContact.phone_number}</p>
                {selectedContactTyping && selectedContactTyping !== 'paused' ? (
                  <p className="text-[12px] text-[#25D366]">{selectedContactTyping === 'composing' ? 'Digitando...' : 'Gravando...'}</p>
                ) : (
                  <p className="truncate text-[12px] text-[#8696A0]">{selectedContact.phone_number}</p>
                )}
              </div>
            </button>
          ) : (
            <p className="text-[14px] text-[#8696A0]">Selecione um contato</p>
          )}
        </div>

        {/* Messages area */}
        <div className="relative flex-1 overflow-hidden">
          <div className="chat-wallpaper absolute inset-0" />
          <div className="relative z-10 flex h-full flex-col overflow-y-auto px-3 py-3 scrollbar-thin">
            {!selectedContact ? (
              <div className="flex flex-1 items-center justify-center text-center">
                <p className="text-[14px] text-[#8696A0]">Escolha um contato</p>
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-1 items-center justify-center text-center">
                <p className="text-[14px] text-[#8696A0]">Nenhuma mensagem ainda</p>
              </div>
            ) : (
              Object.entries((() => {
                const groups: { [date: string]: Message[] } = {}
                messages.forEach((m) => {
                  const date = new Date(m.created_at).toDateString()
                  if (!groups[date]) groups[date] = []
                  groups[date].push(m)
                })
                return groups
              })()).map(([dateStr, msgs]) => (
                <div key={dateStr} className="space-y-1">
                  <div className="flex items-center justify-center py-2">
                    <span className="rounded-lg bg-[#182229]/90 px-3 py-1 text-[11px] text-[#8696A0]">
                      {(() => {
                        const d = new Date(msgs[0].created_at)
                        const today = new Date()
                        if (d.toDateString() === today.toDateString()) return 'Hoje'
                        const y = new Date(today); y.setDate(y.getDate() - 1)
                        if (d.toDateString() === y.toDateString()) return 'Ontem'
                        return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
                      })()}
                    </span>
                  </div>
                  <div className="space-y-[2px]">
                    {msgs.map((message: Message) => {
                      const isOutbound = message.direction === 'outbound'
                      return (
                        <div key={message.id} className={`flex ${isOutbound ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[80%] rounded-lg px-3 py-[6px] text-[14px] leading-[19px] shadow-sm ${isOutbound ? 'bg-[#005C4B]' : 'bg-[#202C33]'} text-[#E9EDEF]`}>
                            <p className="whitespace-pre-wrap break-words">{message.content}</p>
                            <div className="mt-[2px] flex items-center justify-end gap-1 float-right ml-3 -mb-0.5">
                              <span className="text-[11px] text-white/50">{new Date(message.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                              {isOutbound && (
                                message.status === 'read' ? <CheckCheck className="h-3.5 w-3.5 text-sky-400" /> :
                                message.status === 'delivered' ? <CheckCheck className="h-3.5 w-3.5 text-white/70" /> :
                                message.status === 'failed' ? <AlertCircle className="h-3.5 w-3.5 text-[#f7a8a2]" /> :
                                <Check className="h-3.5 w-3.5 text-white/70" />
                              )}
                            </div>
                            <div className="clear-both" />
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

        {/* Message input */}
        <div className="flex-shrink-0 border-t border-white/[0.04]">
          {sendFeedback && (
            <div className={`border-b border-white/[0.04] px-3 py-1.5 text-[12px] ${sendFeedback.type === 'success' ? 'bg-[#1a2c23] text-[#7dd2a5]' : 'bg-[#2c1a1b] text-[#f7a8a2]'}`}>
              {sendFeedback.message}
            </div>
          )}
          <MessageInput
            onSendMessage={handleSendMessage}
            onSendAttachment={handleSendAttachment}
            onSaveEdit={handleSaveEdit}
            disabled={!selectedContact}
            selectedInstanceId={selectedInstance?.id ?? null}
            selectedContactId={selectedContact?.id ?? null}
            replyTo={replyTo}
            editMessage={editingMessage}
            onCancelReply={() => setReplyTo(null)}
            onCancelEdit={() => setEditingMessage(null)}
            instanceToken={selectedInstance?.uazapi_instance_id}
            contactNumber={selectedContact?.phone_number}
          />
        </div>

        {/* Contact details panel */}
        {selectedContact && <ContactDetailsPanel open={showContactDetails} contact={selectedContact} instanceToken={selectedInstance.uazapi_instance_id} onClose={() => setShowContactDetails(false)} />}
      </div>
    )
  }

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden bg-[#0B141A] text-[#E9EDEF]">
      {/* ── Top bar: view mode toggle + metrics ────────────────────────────── */}
      <div className="flex items-center justify-between border-b border-white/[0.08] bg-[#202C33] px-4 py-2 flex-shrink-0 z-20">
        <div className="flex items-center gap-1 rounded-lg bg-[#111B21] p-1">
          <button
            onClick={() => { setViewMode('desktop'); setMobilePanel('sidebar') }}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[13px] font-medium transition ${
              viewMode === 'desktop'
                ? 'bg-[#2A3942] text-[#E9EDEF] shadow-sm'
                : 'text-[#8696A0] hover:text-[#E9EDEF]'
            }`}
          >
            <Monitor className="h-4 w-4" />
            Desktop
          </button>
          <button
            onClick={() => { setViewMode('mobile'); setMobilePanel('sidebar') }}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[13px] font-medium transition ${
              viewMode === 'mobile'
                ? 'bg-[#2A3942] text-[#E9EDEF] shadow-sm'
                : 'text-[#8696A0] hover:text-[#E9EDEF]'
            }`}
          >
            <Smartphone className="h-4 w-4" />
            Mobile
          </button>
        </div>

        <Link
          href="/metrics"
          className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-[#111B21] px-3 py-1.5 text-[13px] font-medium text-[#aebac1] transition hover:bg-[#2A3942] hover:text-[#E9EDEF]"
        >
          <BarChart3 className="h-3.5 w-3.5 text-[#25D366]" />
          Métricas
        </Link>
      </div>

      {/* ── Desktop layout ─────────────────────────────────────────────────── */}
      {viewMode === 'desktop' ? (
        <div className="flex min-h-0 flex-1 overflow-hidden">
          <div className="flex w-[400px] flex-shrink-0 flex-col border-r border-white/[0.04]">
            {renderSidebarHeader()}
            <Sidebar
              instances={instances}
              selectedInstance={selectedInstance}
              onSelectInstance={handleSelectInstance}
              loading={loading}
              onAddInstance={() => setIsModalOpen(true)}
              onEditInstance={(instance) => setEditingInstance(instance)}
            />
          </div>
          <div className="flex min-h-0 flex-1 flex-col bg-[#0B141A]">
            {renderChatContent()}
          </div>
        </div>
      ) : (
        /* ── Mobile layout — phone frame centered ─────────────────────────── */
        <div className="flex flex-1 items-center justify-center bg-[#0a0f12] overflow-hidden py-4">
          <div className="mobile-frame bg-[#0B141A]">
            {mobilePanel === 'sidebar' && (
              <div className="flex h-full flex-col">
                {renderSidebarHeader()}
                <Sidebar
                  instances={instances}
                  selectedInstance={selectedInstance}
                  onSelectInstance={handleSelectInstance}
                  loading={loading}
                  onAddInstance={() => setIsModalOpen(true)}
                  onEditInstance={(instance) => setEditingInstance(instance)}
                  compact
                />
              </div>
            )}
            {mobilePanel === 'contacts' && renderMobileContactList()}
            {mobilePanel === 'chat' && renderMobileChatPanel()}
          </div>
        </div>
      )}

      {/* Tools / settings modals */}
      {selectedInstance && (
        <>
          <QuickReplyManager
            open={showQuickReplies}
            instanceToken={selectedInstance.uazapi_instance_id}
            onClose={() => setShowQuickReplies(false)}
          />
          <LabelsManager
            open={showLabels}
            instanceToken={selectedInstance.uazapi_instance_id}
            onClose={() => setShowLabels(false)}
          />
          <WebhookManager
            open={showWebhooks}
            instanceToken={selectedInstance.uazapi_instance_id}
            onClose={() => setShowWebhooks(false)}
          />
        </>
      )}

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
