import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, token'
}

 type SupabaseClient = ReturnType<typeof createClient>

const getSupabase = () =>
  createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '')

const upsertMetrics = async (supabase: SupabaseClient, instanceId: string, date: string) => {
  const { data: conversations, error: conversationError } = await supabase
    .from('conversations')
    .select('*')
    .eq('instance_id', instanceId)
    .gte('started_at', `${date}T00:00:00.000Z`)
    .lt('started_at', `${date}T23:59:59.999Z`)

  if (conversationError) throw conversationError

  const resolvedConversations = conversations || []
  const totalConversations = resolvedConversations.length

  const avgTmr = resolvedConversations
    .map((conversation) =>
      conversation.first_reply_at
        ? new Date(conversation.first_reply_at).getTime() - new Date(conversation.started_at).getTime()
        : null
    )
    .filter((value): value is number => value !== null)

  const avgTma = resolvedConversations
    .map((conversation) =>
      conversation.closed_at
        ? new Date(conversation.closed_at).getTime() - new Date(conversation.started_at).getTime()
        : null
    )
    .filter((value): value is number => value !== null)

  const slaBreaches = resolvedConversations.filter((conversation) => conversation.sla_violation).length

  const avgMessagesPerConversation =
    resolvedConversations.reduce((sum, conversation) => sum + (conversation.messages_count || 0), 0) /
    Math.max(totalConversations, 1)

  const engagementRates = resolvedConversations
    .map((conversation) => {
      const outbound = conversation.instance_messages_count || 0
      const inbound = conversation.customer_messages_count || 0
      return outbound === 0 ? null : inbound / outbound
    })
    .filter((value): value is number => value !== null)

  const { data: activitySnapshots, error: activityError } = await supabase
    .from('instance_activity')
    .select('*')
    .eq('instance_id', instanceId)
    .gte('captured_at', `${date}T00:00:00.000Z`)
    .lt('captured_at', `${date}T23:59:59.999Z`)

  if (activityError) throw activityError

  const avgActiveChats =
    activitySnapshots?.reduce((sum, snapshot) => sum + (snapshot.active_chats || 0), 0) /
      Math.max(activitySnapshots?.length || 1, 1) || 0

  const maxActiveChats = activitySnapshots?.reduce(
    (max, snapshot) => (snapshot.active_chats > max ? snapshot.active_chats : max),
    0
  )

  await supabase.from('instance_metrics_daily').upsert({
    instance_id: instanceId,
    metric_date: date,
    avg_tmr: avgTmr.length ? `${Math.round(avgTmr.reduce((sum, value) => sum + value, 0) / avgTmr.length)} ms` : null,
    avg_tma: avgTma.length ? `${Math.round(avgTma.reduce((sum, value) => sum + value, 0) / avgTma.length)} ms` : null,
    sla_breach_rate: totalConversations > 0 ? slaBreaches / totalConversations : 0,
    avg_messages_per_conversation: avgMessagesPerConversation,
    engagement_rate: engagementRates.length
      ? engagementRates.reduce((sum, value) => sum + value, 0) / engagementRates.length
      : null,
    follow_up_sent: activitySnapshots?.reduce((sum, snapshot) => sum + (snapshot.follow_up_sent || 0), 0) || 0,
    follow_up_success:
      activitySnapshots?.reduce((sum, snapshot) => sum + (snapshot.follow_up_replied || 0), 0) || 0,
    avg_active_chats: avgActiveChats,
    max_active_chats: maxActiveChats || 0
  })
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = getSupabase()

    const { data: instances, error: instancesError } = await supabase.from('instances').select('id')
    if (instancesError) throw instancesError

    const date = new Date().toISOString().split('T')[0]

    for (const instance of instances || []) {
      await upsertMetrics(supabase, instance.id, date)
    }

    return new Response(JSON.stringify({ success: true, processedInstances: instances?.length || 0 }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (error) {
    console.error('Erro ao processar métricas diárias:', error)
    return new Response(JSON.stringify({ success: false, error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
