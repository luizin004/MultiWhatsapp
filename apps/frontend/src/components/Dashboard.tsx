'use client'

import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { InstanceWithContacts, Message, Contact } from '@/types/database'
import Sidebar from './Sidebar'
import ChatArea from './ChatArea'
import MessageInput, { AttachmentPayload } from './MessageInput'
import AddInstanceModal from './AddInstanceModal'
import { sendTextMessage, sendMediaMessage } from '@/services/uazapi'
import { UazapiSSE, UazapiEvent } from '@/lib/uazapi-sse'
import InstanceProfileModal from './InstanceProfileModal'
import { BarChart3 } from 'lucide-react'

export default function Dashboard() {
  const [instances, setInstances] = useState<InstanceWithContacts[]>([])
  const [selectedInstanceId, setSelectedInstanceId] = useState<string | null>(null)
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [sendFeedback, setSendFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [sseConnection, setSseConnection] = useState<UazapiSSE | null>(null)
  const [editingInstance, setEditingInstance] = useState<InstanceWithContacts | null>(null)
  const messageCacheRef = useRef<Record<string, Message[]>>({})

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
        mimeType
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

  // Buscar instancias com contatos
  const fetchInstances = async () => {
    try {
      const { data, error } = await supabase
        .from('instances')
        .select(`
          *,
          contacts:contacts(*)
        `)
        .order('created_at', { ascending: false })

      if (error) throw error
      setInstances(data || [])
    } catch (error) {
      console.error('Erro ao buscar instancias:', error)
    } finally {
      setLoading(false)
    }
  }

  // Buscar mensagens do contato selecionado
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

  // Configurar SSE para receber mensagens em tempo real
  useEffect(() => {
    console.log('SSE useEffect - selectedInstance:', selectedInstance?.name)

    if (!selectedInstance) {
      console.log('SSE: Nenhuma instancia selecionada')
      return
    }

    // Desconectar conexao anterior
    if (sseConnection) {
      console.log('SSE: Desconectando conexao anterior')
      sseConnection.disconnect()
    }

    // Criar nova conexao SSE
    const uazapiUrl = process.env.NEXT_PUBLIC_UAZAPI_BASE_URL
    console.log('SSE: URL da UAZAPI:', uazapiUrl)

    if (!uazapiUrl) {
      console.error('URL da UAZAPI nao configurada')
      return
    }

    console.log('SSE: Criando conexao com token:', selectedInstance.uazapi_instance_id)
    const sse = new UazapiSSE(selectedInstance.uazapi_instance_id, uazapiUrl)

    sse.connect(
      async (event: UazapiEvent) => {
        if (event.type === 'message' && event.data) {
          const message = event.data

          if (message.wasSentByApi) {
            return
          }

          const rawPhone =
            message.from ||
            message.chatid ||
            message.sender_pn ||
            (message.sender && message.sender.includes('@s.whatsapp.net') ? message.sender : '')

          if (!rawPhone) {
            console.warn('SSE: Mensagem recebida sem telefone identificavel', message)
            return
          }

          const phoneNumber = rawPhone.replace('@s.whatsapp.net', '')

          const messageText = message.text || message.content

          if (!messageText) {
            console.warn('SSE: Mensagem sem texto para acompanhar', message)
            return
          }

          // Apenas garantir que possuimos o contato localmente
          const { data: contact } = await supabase
            .from('contacts')
            .select('*')
            .eq('phone_number', phoneNumber)
            .eq('instance_id', selectedInstance.id)
            .single()

          if (!contact) {
            // Contato ainda nao sincronizado localmente, recarregar instancias
            fetchInstances()
            return
          }

          if (selectedContact && contact.id === selectedContact.id) {
            fetchMessages(selectedInstance.id, contact.id)
            markContactAsRead(contact.id)
          }
        }
      },
      (error) => {
        console.error('Erro na conexao SSE:', error)
      }
    )

    setSseConnection(sse)

    return () => {
      sse.disconnect()
    }
  }, [selectedInstance])

  // Configurar Realtime Subscriptions (para mensagens enviadas pelo dashboard)
  useEffect(() => {
    // Subscription para novas mensagens
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

          if (
            selectedInstance &&
            selectedContact &&
            newMessage.instance_id === selectedInstance.id &&
            newMessage.contact_id === selectedContact.id
          ) {
            updateMessageCache(newMessage.contact_id, (prev) => {
              if (prev.find((msg) => msg.id === newMessage.id)) {
                return prev
              }
              return [...prev, newMessage]
            })
          }

          fetchInstances()
        }
      )
      .subscribe()

    // Subscription para atualizacoes de contatos
    const contactSubscription = supabase
      .channel('contacts')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'contacts'
        },
        () => {
          fetchInstances()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(messageSubscription)
      supabase.removeChannel(contactSubscription)
    }
  }, [selectedInstance, selectedContact, updateMessageCache, fetchMessages])

  // Carregar dados iniciais
  useEffect(() => {
    fetchInstances()
  }, [])

  // Garantir que contato selecionado exista na instancia
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

  // Carregar mensagens quando selecionar contato
  useEffect(() => {
    if (selectedInstance && selectedContact) {
      const cached = messageCacheRef.current[selectedContact.id]
      setMessages(cached || [])
      fetchMessages(selectedInstance.id, selectedContact.id)
    } else {
      setMessages([])
    }
  }, [selectedInstance, selectedContact, fetchMessages])

  const prefetchContactMessages = useCallback(
    (contact: Contact) => {
      if (!selectedInstance) return
      if (messageCacheRef.current[contact.id]?.length) return
      fetchMessages(selectedInstance.id, contact.id)
    },
    [selectedInstance, fetchMessages]
  )

  // Feedback de envio temporario
  useEffect(() => {
    if (!sendFeedback) return
    const timeout = setTimeout(() => setSendFeedback(null), 4000)
    return () => clearTimeout(timeout)
  }, [sendFeedback])

  const handleSendMessage = async (content: string) => {
    if (!selectedInstance || !selectedContact) {
      throw new Error('Selecione uma instancia e um contato para enviar mensagens.')
    }

    try {
      // Enviar via UAZAPI; o webhook registrará a mensagem no banco
      await sendTextMessage({
        token: selectedInstance.uazapi_instance_id,
        number: selectedContact.phone_number,
        text: content
      })

      await markContactAsRead(selectedContact.id)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Falha ao enviar mensagem via UAZAPI.'
      setSendFeedback({ type: 'error', message })
      throw error
    }
  }

  const handleInstanceCreated = (instance: InstanceWithContacts) => {
    setInstances((prev) => {
      const filtered = prev.filter((item) => item.id !== instance.id)
      return [instance, ...filtered]
    })
    setSelectedInstanceId(instance.id)
    const firstContact = instance.contacts?.[0]
    setSelectedContactId(firstContact ? firstContact.id : null)
    setIsModalOpen(false)
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
    setInstances((prev) => prev.map((instance) => (instance.id === updatedInstance.id ? updatedInstance : instance)))
    if (selectedInstanceId === updatedInstance.id) {
      setSelectedInstanceId(updatedInstance.id)
    }
    setEditingInstance(null)
  }

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
                <ChatArea
                  messages={messages}
                  instance={selectedInstance}
                  selectedContact={selectedContact}
                  onSelectContact={handleSelectContact}
                  onPreviewContact={prefetchContactMessages}
                />
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
                  />
                </div>
              </>
            ) : (
              <div className="flex flex-1 items-center justify-center bg-[#0B141A] px-6">
                <div className="rounded-2xl border border-white/5 bg-[#111B21] px-8 py-10 text-center shadow-2xl">
                  <p className="text-lg font-semibold text-[#E9EDEF]">Central de conversas</p>
                  <p className="mt-2 text-sm text-[#8696A0]">Selecione uma instancia na lateral para iniciar uma conversa.</p>
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
      />

      <InstanceProfileModal
        open={Boolean(editingInstance)}
        instance={editingInstance}
        onClose={() => setEditingInstance(null)}
        onUpdated={handleInstanceUpdated}
      />
    </div>
  )
}
