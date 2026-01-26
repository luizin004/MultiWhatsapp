import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const OPENAI_API_KEY = process.env.OPENAI_API_KEY

if (!SUPABASE_URL) {
  throw new Error('NEXT_PUBLIC_SUPABASE_URL não configurada.')
}

if (!SERVICE_ROLE_KEY) {
  throw new Error('SUPABASE_SERVICE_ROLE_KEY não configurada no servidor.')
}

if (!OPENAI_API_KEY) {
  throw new Error('OPENAI_API_KEY não configurada no servidor.')
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

export async function POST() {
  try {
    const today = new Date().toISOString().split('T')[0]

    const { data: metricsRows, error: metricsError } = await supabaseAdmin
      .from('instance_metrics_daily')
      .select('*')
      .eq('metric_date', today)

    if (metricsError) {
      throw metricsError
    }

    const instanceIds = (metricsRows || []).map((row) => row.instance_id)
    const { data: instances, error: instancesError } = await supabaseAdmin
      .from('instances')
      .select('id, name, status')
      .in('id', instanceIds)

    if (instancesError) {
      throw instancesError
    }

    const instanceMap = new Map(instances?.map((instance) => [instance.id, instance]))

    const items = (metricsRows || []).map((metric) => {
      const instance = instanceMap.get(metric.instance_id)
      const avgTmrMs = toMsNumber(metric.avg_tmr)
      const avgTmaMs = toMsNumber(metric.avg_tma)

      return {
        instanceId: metric.instance_id,
        instanceName: instance?.name || 'Instância',
        status: instance?.status || 'unknown',
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

    const systemPrompt = `Você é um consultor analista crítico especializado em operações de atendimento e suporte.
Seu papel é avaliar métricas operacionais e entregar um relatório claro, direto e sem rodeios.
Aponte tendências, riscos e oportunidades de melhoria. Indique ações priorizadas.`

    const userPrompt = `Data atual: ${today}
Visão geral: ${JSON.stringify(overview, null, 2)}
Instâncias: ${JSON.stringify(items, null, 2)}

Instrua um relatório estruturado com:
1. Destaques positivos
2. Alertas/críticos
3. Recomendações práticas de curto prazo
4. Recomendações estratégicas`

    const completion = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        temperature: 0.3,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ]
      })
    })

    const completionPayload = await completion.json()

    if (!completion.ok) {
      const message = completionPayload?.error?.message || 'Falha ao gerar relatório com a LLM.'
      throw new Error(message)
    }

    const report = completionPayload?.choices?.[0]?.message?.content?.trim()

    if (!report) {
      throw new Error('Resposta da LLM vazia.')
    }

    return NextResponse.json({
      report,
      overview,
      instances: items
    })
  } catch (error) {
    console.error('Erro ao gerar relatório inteligente:', error)
    const message = error instanceof Error ? error.message : 'Falha ao gerar relatório inteligente.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
