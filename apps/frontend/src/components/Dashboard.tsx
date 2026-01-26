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

  const { connectedInstances, totalContacts } = useMemo(() => {
    const contacts = instances.reduce((total, instance) => total + (instance.contacts?.length || 0), 0)
    const connected = instances.filter((instance) => instance.status === 'connected').length
    return { connectedInstances: connected, totalContacts: contacts }
  }, [instances])

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
    <div className="relative flex h-screen w-screen overflow-hidden bg-slate-950 text-slate-100">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-24 top-[-8rem] h-[26rem] w-[26rem] rounded-full bg-[radial-gradient(circle_at_center,rgba(56,189,248,0.4),rgba(56,189,248,0)_65%)] blur-3xl animate-[float_20s_ease-in-out_infinite]" />
        <div className="absolute right-[-10rem] top-[10%] h-[30rem] w-[30rem] rounded-full bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.35),rgba(16,185,129,0)_65%)] blur-3xl animate-[float_26s_ease-in-out_infinite]" />
        <div className="absolute bottom-[-10rem] left-[25%] h-[24rem] w-[24rem] rounded-full bg-[radial-gradient(circle_at_center,rgba(245,158,11,0.3),rgba(245,158,11,0)_65%)] blur-3xl animate-[float_22s_ease-in-out_infinite]" />
      </div>

      <div className="relative flex h-full w-full flex-col overflow-hidden px-4 py-4 md:px-8 md:py-6">
        <header className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.35em] text-slate-300">VIGIA SERVICE</p>
            <h1 className="text-2xl font-semibold text-white md:text-3xl">Central de conversas em tempo real</h1>
            <p className="max-w-xl text-sm text-slate-300">
              Controle instancias, contatos e mensagens com um painel unico e veloz.
            </p>
          </div>
          <div className="grid w-full gap-3 sm:w-auto sm:grid-cols-3">
            <div className="rounded-2xl border border-white/20 bg-white/10 px-4 py-3 backdrop-blur">
              <p className="text-[10px] uppercase tracking-[0.25em] text-slate-200">Instancias</p>
              <p className="text-xl font-semibold text-white">{loading ? '...' : instances.length}</p>
            </div>
            <div className="rounded-2xl border border-white/20 bg-white/10 px-4 py-3 backdrop-blur">
              <p className="text-[10px] uppercase tracking-[0.25em] text-slate-200">Conectadas</p>
              <p className="text-xl font-semibold text-white">{loading ? '...' : connectedInstances}</p>
            </div>
            <div className="rounded-2xl border border-white/20 bg-white/10 px-4 py-3 backdrop-blur">
              <p className="text-[10px] uppercase tracking-[0.25em] text-slate-200">Contatos</p>
              <p className="text-xl font-semibold text-white">{loading ? '...' : totalContacts}</p>
            </div>
          </div>
          <Link
            href="/metrics"
            className="inline-flex items-center justify-center rounded-2xl border border-white/20 bg-white/10 px-4 py-3 text-sm font-semibold text-white shadow hover:border-white/40 hover:bg-white/20"
          >
            Abrir painel de métricas →
          </Link>
        </header>

        <main className="flex-1 min-h-0">
          <div className="flex h-full w-full min-h-0 flex-col overflow-hidden rounded-[32px] border border-white/10 bg-white shadow-[0_24px_80px_-40px_rgba(15,23,42,0.7)] backdrop-blur-xl md:flex-row">
            <Sidebar
              instances={instances}
              selectedInstance={selectedInstance}
              onSelectInstance={handleSelectInstance}
              loading={loading}
              onAddInstance={() => setIsModalOpen(true)}
              onEditInstance={(instance) => setEditingInstance(instance)}
            />

            <div className="flex min-h-0 flex-1 flex-col animate-[fade-up_0.6s_ease_both]" style={{ animationDelay: '120ms' }}>
              {selectedInstance ? (
                <>
                  <ChatArea
                    messages={messages}
                    instance={selectedInstance}
                    selectedContact={selectedContact}
                    onSelectContact={handleSelectContact}
                    onPreviewContact={prefetchContactMessages}
                  />
                  <div className="border-t border-slate-200/70 bg-white/70">
                    {sendFeedback && (
                      <div
                        className={`text-sm px-4 py-2 ${
                          sendFeedback.type === 'success'
                            ? 'bg-emerald-500/15 text-emerald-700 border-b border-emerald-500/20'
                            : 'bg-rose-500/10 text-rose-700 border-b border-rose-500/20'
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
                <div className="flex flex-1 items-center justify-center p-6 text-slate-500">
                  <div className="max-w-md rounded-2xl border border-slate-200/70 bg-white/70 p-6 text-center shadow-sm">
                    <h3 className="text-lg font-semibold text-slate-900">Central de WhatsApp</h3>
                    <p className="mt-2 text-sm text-slate-600">
                      Selecione uma instancia para ver as conversas.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>
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
