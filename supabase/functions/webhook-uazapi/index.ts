import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, token'
}

type SupabaseClient = ReturnType<typeof createClient>
type MessageDirection = 'inbound' | 'outbound'

interface ConversationRecord {
  id: string
  instance_id: string
  contact_id: string
  started_at: string
  first_reply_at?: string | null
  closed_at?: string | null
  status: 'active' | 'waiting' | 'closed'
  sla_violation?: boolean | null
  messages_count?: number | null
  customer_messages_count?: number | null
  instance_messages_count?: number | null
  last_message_direction?: MessageDirection | null
  updated_at?: string
}

const captureInstanceActivity = async (supabase: SupabaseClient, instanceId: string) => {
  console.log('[Activity] Capturando snapshot para instância', instanceId)

  const { data: openConversations, error: openConvError } = await supabase
    .from('conversations')
    .select('id, last_message_direction, status')
    .eq('instance_id', instanceId)
    .in('status', ['active', 'waiting'])

  if (openConvError) {
    console.error('Erro ao buscar conversas abertas para atividade:', openConvError)
    throw openConvError
  }

  const activeChats = openConversations?.length || 0
  const pendingQueue = (openConversations || []).filter(
    (conversation) => conversation.last_message_direction === 'inbound'
  ).length

  const { data: lastOutboundMessage, error: lastOutboundError } = await supabase
    .from('messages')
    .select('created_at')
    .eq('instance_id', instanceId)
    .eq('direction', 'outbound')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (lastOutboundError) {
    console.error('Erro ao buscar última mensagem outbound:', lastOutboundError)
    throw lastOutboundError
  }

  await supabase.from('instance_activity').insert({
    instance_id: instanceId,
    active_chats: activeChats,
    pending_queue: pendingQueue,
    idle_since: lastOutboundMessage?.created_at ?? null
  })

  console.log('[Activity] Snapshot registrado', {
    instanceId,
    activeChats,
    pendingQueue,
    idleSince: lastOutboundMessage?.created_at ?? null
  })
}

const SLA_MINUTES = Number(Deno.env.get('SLA_MINUTES') ?? '5')
const CONVERSATION_IDLE_MINUTES = Number(Deno.env.get('CONVERSATION_IDLE_MINUTES') ?? '60')

const dayKey = (isoString: string) => new Date(isoString).toISOString().split('T')[0]

const resolveExternalMessageId = (message: Record<string, unknown>): string | null => {
  const candidateValues: unknown[] = [
    message.id,
    message.messageId,
    message.message_id,
    (message.key && typeof (message.key as Record<string, unknown>).id === 'string'
      ? (message.key as Record<string, unknown>).id
      : null),
    message.client_ref,
    message.externalId
  ]

  for (const candidate of candidateValues) {
    if (typeof candidate === 'string' && candidate.trim().length > 0) {
      return candidate
    }
  }

  return null
}

const ensureConversation = async (
  supabase: SupabaseClient,
  instanceId: string,
  contactId: string,
  messageCreatedAt: string,
  direction: MessageDirection
): Promise<ConversationRecord> => {
  const { data: existingConversation, error } = await supabase
    .from('conversations')
    .select('*')
    .eq('instance_id', instanceId)
    .eq('contact_id', contactId)
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error && error.code !== 'PGRST116') {
    throw error
  }

  const lastActivityAt = existingConversation?.updated_at || existingConversation?.started_at || null

  const minutesSinceLastActivity = lastActivityAt
    ? (new Date(messageCreatedAt).getTime() - new Date(lastActivityAt).getTime()) / 60000
    : 0

  const exceededIdleThreshold = minutesSinceLastActivity > CONVERSATION_IDLE_MINUTES

  const isSameDay = existingConversation
    ? dayKey(existingConversation.started_at) === dayKey(messageCreatedAt)
    : false

  const needsNewConversation =
    !existingConversation || existingConversation.status === 'closed' || !isSameDay || exceededIdleThreshold

  if (!needsNewConversation && existingConversation) {
    return existingConversation as ConversationRecord
  }

  if (existingConversation && existingConversation.status !== 'closed') {
    await supabase
      .from('conversations')
      .update({ status: 'closed', closed_at: lastActivityAt || messageCreatedAt })
      .eq('id', existingConversation.id)
  }

  const { data: newConversation, error: createConvError } = await supabase
    .from('conversations')
    .insert({
      instance_id: instanceId,
      contact_id: contactId,
      started_at: messageCreatedAt,
      status: 'active',
      last_message_direction: direction
    })
    .select('*')
    .single()

  if (createConvError || !newConversation) {
    throw createConvError || new Error('Falha ao criar conversa')
  }

  return newConversation as ConversationRecord
}

const updateConversationStats = async (
  supabase: SupabaseClient,
  conversation: ConversationRecord,
  direction: MessageDirection,
  messageCreatedAt: string
): Promise<ConversationRecord> => {
  const totalMessages = (conversation.messages_count ?? 0) + 1
  const customerMessages =
    direction === 'inbound'
      ? (conversation.customer_messages_count ?? 0) + 1
      : conversation.customer_messages_count ?? 0
  const instanceMessages =
    direction === 'outbound'
      ? (conversation.instance_messages_count ?? 0) + 1
      : conversation.instance_messages_count ?? 0

  const updates: Record<string, unknown> = {
    messages_count: totalMessages,
    customer_messages_count: customerMessages,
    instance_messages_count: instanceMessages,
    last_message_direction: direction,
    status: direction === 'inbound' ? 'waiting' : 'active'
  }

  if (direction === 'outbound' && !conversation.first_reply_at) {
    const diffMinutes =
      (new Date(messageCreatedAt).getTime() - new Date(conversation.started_at).getTime()) / 60000
    updates.first_reply_at = messageCreatedAt
    updates.sla_violation = diffMinutes > SLA_MINUTES
  }

  const { data: updatedConversation, error: convUpdateError } = await supabase
    .from('conversations')
    .update(updates)
    .eq('id', conversation.id)
    .select('*')
    .single()

  if (convUpdateError || !updatedConversation) {
    throw convUpdateError || new Error('Falha ao atualizar conversa')
  }

  return updatedConversation as ConversationRecord
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Log inicial para debug
    console.log('Request method:', req.method)
    console.log('Request URL:', req.url)
    console.log('Headers:', Object.fromEntries(req.headers.entries()))
    
    // Tentar ler body
    let body
    try {
      const bodyText = await req.text()
      console.log('Body raw:', bodyText)
      body = bodyText ? JSON.parse(bodyText) : {}
    } catch (e) {
      console.log('Erro ao parsear body:', e)
      body = {}
    }
    console.log('Body parsed:', JSON.stringify(body, null, 2))

    // Validar token da instância
    const url = new URL(req.url)
    const instanceToken = url.searchParams.get('instance_token')
    
    if (!instanceToken) {
      throw new Error('instance_token é obrigatório')
    }

    // Criar cliente Supabase
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Buscar instância pelo token
    const { data: instance, error: instanceError } = await supabase
      .from('instances')
      .select('*')
      .eq('uazapi_instance_id', instanceToken)
      .single()

    if (instanceError || !instance) {
      throw new Error('Instância não encontrada ou token inválido')
    }

    // Processar diferentes tipos de eventos da UAZAPI
    const headerEvent = req.headers.get('x-uazapi-event')
    const bodyEvent = typeof body?.event === 'string' ? body.event : undefined
    const event = headerEvent || bodyEvent || 'unknown'

    console.log(`Webhook recebido - Evento: ${event}, Instância: ${instance.name}`)

    // Considerar cada item no payload que represente mensagem
    const candidateMessages: unknown[] = []

    if (Array.isArray(body)) {
      candidateMessages.push(...body)
    } else if (Array.isArray(body?.messages)) {
      candidateMessages.push(...body.messages)
    } else if (body?.data) {
      candidateMessages.push(body.data)
    } else if (body?.message) {
      candidateMessages.push(body.message)
    }

    const normalizeBoolean = (value: unknown) => {
      if (typeof value === 'boolean') return value
      if (typeof value === 'string') return value.toLowerCase() === 'true'
      if (typeof value === 'number') return value === 1
      return undefined
    }

    let activityNeedsUpdate = false

    for (const candidate of candidateMessages) {
      const message = typeof candidate === 'object' ? candidate as Record<string, unknown> : null
      if (!message) continue

      const externalId = resolveExternalMessageId(message)

      const messageText =
        (typeof message.text === 'string' && message.text.trim() !== '' && message.text) ||
        (typeof message.content === 'string' && message.content.trim() !== '' && message.content) ||
        null

      if (!messageText) {
        console.log('Ignorando payload sem texto/conteúdo', message)
        continue
      }

      console.log('Processando mensagem recebida via webhook:', message)

      const fromMe = normalizeBoolean(message.fromMe ?? message.from_me) ?? false
      const direction: 'inbound' | 'outbound' = fromMe ? 'outbound' : 'inbound'

      const timestampValue =
        typeof message.messageTimestamp === 'number'
          ? message.messageTimestamp
          : typeof message.timestamp === 'number'
            ? message.timestamp
            : null

      const messageCreatedAt = (() => {
        if (!timestampValue) return new Date().toISOString()
        const isMilliseconds = timestampValue > 1e12
        const date = new Date(isMilliseconds ? timestampValue : timestampValue * 1000)
        return date.toISOString()
      })()

      // Buscar ou criar contato
      const rawPhone = (() => {
        const inboundFields = [
          message.from,
          message.chatid,
          message.sender_pn,
          typeof message.sender === 'string' && message.sender.includes('@s.whatsapp.net') ? message.sender : undefined
        ]

        const outboundFields = [
          message.to,
          message.chatid,
          (message as Record<string, unknown>).recipient,
          (message as Record<string, unknown>).remoteJid
        ]

        const fields = fromMe ? outboundFields : inboundFields
        for (const field of fields) {
          if (typeof field === 'string' && field.trim() !== '') {
            return field
          }
        }
        return ''
      })()

      const phoneNumber = rawPhone?.replace('@s.whatsapp.net', '')

      if (!phoneNumber) {
        throw new Error('Número de telefone não encontrado na mensagem')
      }

      let { data: contact, error: contactError } = await supabase
        .from('contacts')
        .select('*')
        .eq('phone_number', phoneNumber)
        .eq('instance_id', instance.id)
        .single()

      if (contactError && contactError.code === 'PGRST116') {
        // Contato não existe, criar novo
        const { data: newContact, error: createError } = await supabase
          .from('contacts')
          .insert({
            instance_id: instance.id,
            phone_number: phoneNumber,
            name: message.senderName || phoneNumber
          })
          .select()
          .single()

        if (createError) throw createError
        contact = newContact
      } else if (contactError) {
        throw contactError
      }

      let conversation: ConversationRecord | null = null
      try {
        conversation = await ensureConversation(
          supabase,
          instance.id,
          contact.id,
          messageCreatedAt,
          direction
        )
      } catch (convError) {
        console.error('Falha ao garantir conversa:', convError)
      }

      if (externalId) {
        const { data: existingByExternal } = await supabase
          .from('messages')
          .select('id')
          .eq('instance_id', instance.id)
          .eq('contact_id', contact.id)
          .eq('direction', direction)
          .eq('external_id', externalId)
          .maybeSingle()

        if (existingByExternal) {
          console.log('Mensagem duplicada via external_id, ignorando insert.', {
            contact: contact.id,
            external_id: externalId
          })
          continue
        }
      }

      // Deduplicar fallback por timestamp + conteúdo + contato
      const { data: existingMessage } = await supabase
        .from('messages')
        .select('id')
        .eq('contact_id', contact.id)
        .eq('direction', direction)
        .eq('content', messageText)
        .eq('created_at', messageCreatedAt)
        .maybeSingle()

      if (existingMessage) {
        console.log('Mensagem duplicada detectada, ignorando insert.', {
          contact: contact.id,
          created_at: messageCreatedAt
        })
        continue
      }

      // Inserir mensagem
      const { error: msgError } = await supabase
        .from('messages')
        .insert({
          instance_id: instance.id,
          contact_id: contact.id,
          conversation_id: conversation?.id ?? null,
          external_id: externalId,
          content: messageText,
          type: (message.messageType as string) || (message.type as string) || 'text',
          direction,
          status: direction === 'outbound' ? 'sent' : 'delivered',
          created_at: messageCreatedAt
        })

      if (msgError) {
        console.error('Erro ao salvar mensagem:', msgError)
        console.error('Payload que falhou:', {
          instance: instance.id,
          contact: contact.id,
          message
        })
        throw msgError
      }

      activityNeedsUpdate = true

      if (conversation) {
        try {
          await updateConversationStats(supabase, conversation, direction, messageCreatedAt)
          activityNeedsUpdate = true
        } catch (statsError) {
          console.error('Falha ao atualizar estatísticas da conversa:', statsError)
        }
      }

      if (direction === 'inbound') {
        await supabase
          .from('contacts')
          .update({ unread_count: (contact.unread_count || 0) + 1 })
          .eq('id', contact.id)
      }

      console.log(`Mensagem salva - Contato: ${contact.name}, Direção: ${direction}`)
    }

    if (activityNeedsUpdate) {
      try {
        await captureInstanceActivity(supabase, instance.id)
      } catch (activityError) {
        console.error('Falha ao registrar snapshot de atividade:', activityError)
      }
    } else {
      console.log('[Activity] Nenhuma mudança detectada, pulando snapshot')
    }

    return new Response(JSON.stringify({
      success: true,
      message: 'Webhook processado com sucesso',
      instance: instance.name
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Erro no webhook:', error)
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Erro desconhecido' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
