import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL) {
  throw new Error('NEXT_PUBLIC_SUPABASE_URL não configurada.')
}

if (!SERVICE_ROLE_KEY) {
  throw new Error('SUPABASE_SERVICE_ROLE_KEY não configurada no servidor.')
}

const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
})

const minutesDiff = (from?: string | null, to?: number) => {
  if (!from) return null
  const target = new Date(from).getTime()
  if (Number.isNaN(target)) return null
  const now = to ?? Date.now()
  return (now - target) / 60000
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const waitMinutes = Number(searchParams.get('waitMinutes') || process.env.SLA_MINUTES || 5)
    const forgottenHours = Number(searchParams.get('forgottenHours') || 24)
    const now = Date.now()

    const { data: waitingConversations, error: waitingError } = await supabaseAdmin
      .from('conversations')
      .select(
        `
        id, instance_id, contact_id, started_at, first_reply_at, status, last_message_direction,
        contact:contacts (id, name, phone_number),
        instance:instances (id, name)
      `
      )
      .eq('status', 'waiting')

    if (waitingError) {
      console.error('Erro ao buscar conversas em fila:', waitingError)
      throw waitingError
    }

    const queue = (waitingConversations || [])
      .map((conversation: any) => {
        const contactRecord = Array.isArray(conversation.contact)
          ? conversation.contact[0]
          : conversation.contact
        const instanceRecord = Array.isArray(conversation.instance)
          ? conversation.instance[0]
          : conversation.instance
        const minutesWaiting = minutesDiff(conversation.started_at, now)
        return {
          conversationId: conversation.id,
          instanceId: conversation.instance_id,
          instanceName: instanceRecord?.name || 'Instância',
          contactId: conversation.contact_id,
          contactName: contactRecord?.name || contactRecord?.phone_number || 'Contato',
          contactPhone: contactRecord?.phone_number,
          startedAt: conversation.started_at,
          minutesWaiting: minutesWaiting || 0
        }
      })
      .filter((item) => item.minutesWaiting >= waitMinutes)
      .sort((a, b) => b.minutesWaiting - a.minutesWaiting)

    const forgottenThresholdMinutes = forgottenHours * 60
    const forgotten = (waitingConversations || [])
      .filter((conversation: any) => conversation.last_message_direction === 'inbound')
      .map((conversation: any) => {
        const contactRecord = Array.isArray(conversation.contact)
          ? conversation.contact[0]
          : conversation.contact
        const instanceRecord = Array.isArray(conversation.instance)
          ? conversation.instance[0]
          : conversation.instance
        const minutesSinceLastInbound = minutesDiff(conversation.started_at, now)
        return {
          conversationId: conversation.id,
          instanceId: conversation.instance_id,
          instanceName: instanceRecord?.name || 'Instância',
          contactId: conversation.contact_id,
          contactName: contactRecord?.name || contactRecord?.phone_number || 'Contato',
          contactPhone: contactRecord?.phone_number,
          minutesSinceLastInbound: minutesSinceLastInbound || 0
        }
      })
      .filter((item) => item.minutesSinceLastInbound >= forgottenThresholdMinutes)
      .sort((a, b) => b.minutesSinceLastInbound - a.minutesSinceLastInbound)

    const { data: activitySnapshots, error: activityError } = await supabaseAdmin
      .from('instance_activity')
      .select('instance_id, captured_at, active_chats, pending_queue, idle_since')
      .order('captured_at', { ascending: false })
      .limit(200)

    if (activityError) {
      console.error('Erro ao buscar snapshots de atividade:', activityError)
      throw activityError
    }

    const latestActivityMap = new Map<string, (typeof activitySnapshots)[number]>()
    for (const snapshot of activitySnapshots || []) {
      if (!latestActivityMap.has(snapshot.instance_id)) {
        latestActivityMap.set(snapshot.instance_id, snapshot)
      }
    }

    const activity = Array.from(latestActivityMap.entries()).map(([instanceId, snapshot]) => {
      const idleMinutes = minutesDiff(snapshot.idle_since, now)
      return {
        instanceId,
        capturedAt: snapshot.captured_at,
        activeChats: snapshot.active_chats,
        pendingQueue: snapshot.pending_queue,
        idleMinutes: idleMinutes === null ? null : Number(idleMinutes.toFixed(1))
      }
    })

    return NextResponse.json({
      waitMinutes,
      forgottenHours,
      queue,
      forgotten,
      activity
    })
  } catch (error) {
    console.error('Erro ao carregar métricas em tempo real:', error)
    const details = error instanceof Error ? { message: error.message, stack: error.stack } : { error }
    return NextResponse.json({ error: 'Falha ao carregar métricas', details }, { status: 500 })
  }
}
