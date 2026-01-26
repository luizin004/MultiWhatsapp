import { Router, Request, Response } from 'express'
import { createClient } from '@supabase/supabase-js'

const router = Router()

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL) {
  throw new Error('SUPABASE_URL not configured for backend service.')
}

if (!SERVICE_ROLE_KEY) {
  throw new Error('SUPABASE_SERVICE_ROLE_KEY not configured for backend service.')
}

const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
})

const parseIntervalToMs = (raw: string) => {
  const parts = raw.split(':')
  if (parts.length < 2) return null
  const [hoursStr, minutesStr, secondsStr = '0'] = parts
  const hours = Number(hoursStr)
  const minutes = Number(minutesStr)
  const seconds = Number(secondsStr)
  if ([hours, minutes, seconds].some((n) => Number.isNaN(n))) return null
  return Math.round(((hours * 3600 + minutes * 60 + seconds) * 1000))
}

const toMsNumber = (value?: string | null) => {
  if (!value) return null
  if (value.includes(':')) {
    const intervalMs = parseIntervalToMs(value)
    if (intervalMs !== null) return intervalMs
  }
  const parsed = parseInt(value.toString().replace(/[^0-9.-]/g, ''), 10)
  return Number.isNaN(parsed) ? null : parsed
}

const formatMs = (value?: number | null) => {
  if (value === null || value === undefined) return null
  const minutes = value / 60000
  return minutes >= 1 ? `${minutes.toFixed(1)} min` : `${Math.round(value / 1000)} s`
}

router.get('/overview', async (req: Request, res: Response) => {
  try {
    const dateFilter = (req.query.date as string) || new Date().toISOString().split('T')[0]

    const { data: metricsForDate, error: metricsError } = await supabaseAdmin
      .from('instance_metrics_daily')
      .select('*')
      .eq('metric_date', dateFilter)

    if (metricsError) {
      throw metricsError
    }

    let metricsRows = metricsForDate || []

    if (metricsRows.length === 0) {
      const { data: fallbackMetrics, error: fallbackError } = await supabaseAdmin
        .from('instance_metrics_daily')
        .select('*')
        .order('metric_date', { ascending: false })
        .limit(50)

      if (fallbackError) {
        throw fallbackError
      }

      metricsRows = fallbackMetrics || []
    }

    const instanceIds = metricsRows.map((metric) => metric.instance_id)

    const { data: instances, error: instancesError } = await supabaseAdmin
      .from('instances')
      .select('id, name, status, profile_pic_url')
      .in('id', instanceIds)

    if (instancesError) {
      throw instancesError
    }

    const instanceMap = new Map(instances?.map((instance) => [instance.id, instance]))

    const items = metricsRows.map((metric) => {
      const instance = instanceMap.get(metric.instance_id)
      const avgTmrMs = toMsNumber(metric.avg_tmr)
      const avgTmaMs = toMsNumber(metric.avg_tma)

      return {
        instanceId: metric.instance_id,
        instanceName: instance?.name || 'Instância',
        status: instance?.status || 'unknown',
        profilePicUrl: instance?.profile_pic_url,
        metricDate: metric.metric_date,
        avgTmrMs,
        avgTmrFormatted: formatMs(avgTmrMs),
        avgTmaMs,
        avgTmaFormatted: formatMs(avgTmaMs),
        slaBreachRate: metric.sla_breach_rate,
        avgMessagesPerConversation: metric.avg_messages_per_conversation,
        engagementRate: metric.engagement_rate,
        followUpSent: metric.follow_up_sent,
        followUpSuccess: metric.follow_up_success,
        avgActiveChats: metric.avg_active_chats,
        maxActiveChats: metric.max_active_chats
      }
    })

    const aggregate = items.reduce(
      (acc, item) => {
        acc.count += 1
        if (item.avgTmrMs) acc.sumTmr += item.avgTmrMs
        if (item.avgTmaMs) acc.sumTma += item.avgTmaMs
        acc.sumSla += item.slaBreachRate || 0
        acc.sumMsgs += item.avgMessagesPerConversation || 0
        acc.sumEngagement += item.engagementRate || 0
        return acc
      },
      { count: 0, sumTmr: 0, sumTma: 0, sumSla: 0, sumMsgs: 0, sumEngagement: 0 }
    )

    const overview = {
      instances: aggregate.count,
      avgTmrFormatted: aggregate.count ? formatMs(aggregate.sumTmr / aggregate.count) : null,
      avgTmaFormatted: aggregate.count ? formatMs(aggregate.sumTma / aggregate.count) : null,
      slaBreachRate: aggregate.count ? aggregate.sumSla / aggregate.count : 0,
      avgMessagesPerConversation: aggregate.count ? aggregate.sumMsgs / aggregate.count : 0,
      engagementRate: aggregate.count ? aggregate.sumEngagement / aggregate.count : 0
    }

    return res.json({
      date: metricsRows[0]?.metric_date || dateFilter,
      overview,
      items
    })
  } catch (error) {
    console.error('Erro ao carregar métricas:', error)
    const message = error instanceof Error ? error.message : 'Falha ao carregar métricas'
    return res.status(500).json({ error: message })
  }
})

router.get('/realtime', async (req: Request, res: Response) => {
  try {
    const waitMinutes = Number(req.query.waitMinutes || process.env.SLA_MINUTES || 5)
    const forgottenHours = Number(req.query.forgottenHours || 24)
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
        const minutesWaiting = ((now - new Date(conversation.started_at).getTime()) / 60000) || 0
        return {
          conversationId: conversation.id,
          instanceId: conversation.instance_id,
          instanceName: instanceRecord?.name || 'Instância',
          contactId: conversation.contact_id,
          contactName: contactRecord?.name || contactRecord?.phone_number || 'Contato',
          contactPhone: contactRecord?.phone_number,
          startedAt: conversation.started_at,
          minutesWaiting: minutesWaiting
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
        const minutesSinceLastInbound = ((now - new Date(conversation.started_at).getTime()) / 60000) || 0
        return {
          conversationId: conversation.id,
          instanceId: conversation.instance_id,
          instanceName: instanceRecord?.name || 'Instância',
          contactId: conversation.contact_id,
          contactName: contactRecord?.name || contactRecord?.phone_number || 'Contato',
          contactPhone: contactRecord?.phone_number,
          minutesSinceLastInbound: minutesSinceLastInbound
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
      throw activityError
    }

    const latestActivityMap = new Map<string, (typeof activitySnapshots)[number]>()
    for (const snapshot of activitySnapshots || []) {
      if (!latestActivityMap.has(snapshot.instance_id)) {
        latestActivityMap.set(snapshot.instance_id, snapshot)
      }
    }

    const activity = Array.from(latestActivityMap.entries()).map(([instanceId, snapshot]) => {
      const idleMinutes = snapshot.idle_since ? ((now - new Date(snapshot.idle_since).getTime()) / 60000) : null
      return {
        instanceId,
        capturedAt: snapshot.captured_at,
        activeChats: snapshot.active_chats,
        pendingQueue: snapshot.pending_queue,
        idleMinutes: idleMinutes === null ? null : Number(idleMinutes.toFixed(1))
      }
    })

    return res.json({
      waitMinutes,
      forgottenHours,
      queue,
      forgotten,
      activity
    })
  } catch (error) {
    console.error('Erro ao carregar métricas em tempo real:', error)
    const message = error instanceof Error ? error.message : 'Falha ao carregar métricas'
    return res.status(500).json({ error: message })
  }
})

export default router
