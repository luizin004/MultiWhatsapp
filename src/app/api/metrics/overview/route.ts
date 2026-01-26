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

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const requestedDate = searchParams.get('date')
    const today = new Date().toISOString().split('T')[0]
    const dateFilter = requestedDate || today

    const { data: metricsForDate, error: metricsError } = await supabaseAdmin
      .from('instance_metrics_daily')
      .select('*')
      .eq('metric_date', dateFilter)

    if (metricsError) {
      console.error('Erro ao buscar métricas do dia:', metricsError)
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
        console.error('Erro ao buscar métricas recentes:', fallbackError)
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
      console.error('Erro ao buscar instâncias:', instancesError)
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

    return NextResponse.json({
      date: metricsRows[0]?.metric_date || dateFilter,
      overview,
      items
    })
  } catch (error) {
    console.error('Erro ao carregar métricas:', error)
    const message = error instanceof Error ? error.message : 'Falha ao carregar métricas'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
