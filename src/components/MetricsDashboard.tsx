'use client'

import { useEffect, useMemo, useState } from 'react'

import Link from 'next/link'
import { 
  Activity, 
  AlertCircle, 
  Clock, 
  Users, 
  MessageSquare, 
  BarChart3, 
  CheckCircle2, 
  Timer,
  ArrowRight,
  FileText,
  Flame,
  Sparkles,
  Lightbulb,
  PanelRightOpen,
  X
} from 'lucide-react'

// --- Interfaces (Mantidas iguais para garantir compatibilidade) ---
interface OverviewItem {
  instanceId: string
  instanceName: string
  status: string
  profilePicUrl?: string | null
  metricDate: string
  avgTmrFormatted?: string | null
  avgTmaFormatted?: string | null
  slaBreachRate?: number | null
  avgMessagesPerConversation?: number | null
  engagementRate?: number | null
  followUpSent?: number | null
  followUpSuccess?: number | null
  avgActiveChats?: number | null
  maxActiveChats?: number | null
}

interface OverviewResponse {
  date: string
  overview: {
    instances: number
    avgTmrFormatted?: string | null
    avgTmaFormatted?: string | null
    slaBreachRate?: number | null
    avgMessagesPerConversation?: number | null
    engagementRate?: number | null
  }
  items: OverviewItem[]
}

interface RealtimeResponse {
  waitMinutes: number
  forgottenHours: number
  queue: {
    conversationId: string
    instanceId: string
    instanceName: string
    contactId: string
    contactName: string
    contactPhone?: string | null
    startedAt: string
    minutesWaiting: number
  }[]
  forgotten: {
    conversationId: string
    instanceId: string
    instanceName: string
    contactId: string
    contactName: string
    contactPhone?: string | null
    minutesSinceLastInbound: number
  }[]
  activity: {
    instanceId: string
    capturedAt: string
    activeChats: number
    pendingQueue: number
    idleMinutes: number | null
  }[]
}

// --- Utilitários ---
const fetchJson = async <T,>(url: string, signal?: AbortSignal, init?: RequestInit): Promise<T> => {
  const response = await fetch(url, { signal, ...init })
  if (!response.ok) throw new Error(`Erro: ${response.status}`)
  return (await response.json()) as T
}

const rebuildDailyMetrics = async () => {
  const response = await fetch('/api/metrics/rebuild', {
    method: 'POST',
    cache: 'no-store'
  })

  const payload = await response.json().catch(() => ({}))

  if (!response.ok || payload?.success === false) {
    const message = payload?.error || 'Falha ao recomputar métricas.'
    throw new Error(message)
  }

  console.log('[Metrics] Rebuild disparado', payload)
  return payload
}

const parseReportBlocks = (report: string) => {
  if (!report) return []
  const sections = report
    .split(/\n(?=\d+\.)/)
    .map((section) => section.trim())
    .filter(Boolean)

  return sections.map((section) => {
    const [titleLine, ...rest] = section.split('\n')
    const title = titleLine?.replace(/^\d+\.\s*/, '') || 'Seção'
    const content = rest.join('\n').trim()
    return { title, content }
  })
}

const metricGlossary = [
  {
    id: 'avg_tmr',
    title: 'Tempo de 1ª Resposta (TMR)',
    goal: 'Responder em até 5 minutos.',
    description:
      'Média do intervalo entre o início da conversa e a primeira resposta enviada pela instância. Impacta diretamente a percepção de velocidade do atendimento.'
  },
  {
    id: 'avg_tma',
    title: 'Tempo Médio de Atendimento (TMA)',
    goal: 'Fechar conversas no mesmo dia.',
    description:
      'Quanto tempo, em média, levamos para concluir uma conversa desde a abertura até o fechamento. Conversas longas podem indicar gargalos de processo.'
  },
  {
    id: 'sla',
    title: 'Taxa de Atraso (>5m)',
    goal: 'Manter violações abaixo de 10%.',
    description:
      'Percentual de conversas que excederam o SLA de primeira resposta. Valores altos significam clientes esperando demais e colaboradores sobrecarregados.'
  },
  {
    id: 'messages',
    title: 'Mensagens por Conversa',
    goal: 'Entre 3 e 6 mensagens.',
    description:
      'Mostra a profundidade média dos atendimentos. Poucas mensagens podem indicar respostas robotizadas, enquanto muitas apontam para retrabalho.'
  },
  {
    id: 'engagement',
    title: 'Taxa de Engajamento',
    goal: 'Manter acima de 40%.',
    description:
      'Relação entre mensagens de clientes e mensagens da instância. Ajuda a entender o quanto cada disparo gera respostas reais.'
  },
  {
    id: 'activity',
    title: 'Atividade Simultânea',
    goal: 'Distribuir carga ao longo do dia.',
    description:
      'Dados vindos de instance_activity mostram chats simultâneos, fila pendente e períodos ociosos. Útil para planejar escala do time.'
  }
]

// --- Componentes de UI Refinados ---
const StatCard = ({ 
  label, 
  value, 
  helper, 
  icon: Icon, 
  trend 
}: { 
  label: string; 
  value?: string | number | null; 
  helper?: string; 
  icon: any; 
  trend?: 'good' | 'bad' | 'neutral' 
}) => (
  <div className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white/90 p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">
    <div className="flex items-start justify-between">
      <div>
        <p className="text-sm font-medium text-slate-500">{label}</p>
        <p className="mt-2 text-2xl font-bold tracking-tight text-slate-900">{value ?? '—'}</p>
      </div>
      <div className="rounded-lg bg-slate-100 p-2 text-slate-500 group-hover:text-blue-500 transition-colors">
        <Icon size={20} />
      </div>
    </div>
    {helper && (
      <div className="mt-3 flex items-center gap-2">
        <div className={`h-1.5 w-1.5 rounded-full ${trend === 'bad' ? 'bg-rose-500' : 'bg-emerald-500'}`} />
        <p className="text-xs text-slate-500">{helper}</p>
      </div>
    )}
  </div>
)

const SectionHeader = ({ title, subtitle, icon: Icon }: { title: string; subtitle?: string; icon?: any }) => (
  <div className="mb-6 flex items-center gap-3">
    {Icon && <Icon className="text-blue-500" size={20} />}
    <div>
      <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
      {subtitle && <p className="text-sm text-slate-500">{subtitle}</p>}
    </div>
  </div>
)

export default function MetricsDashboard() {
  const [overviewData, setOverviewData] = useState<OverviewResponse | null>(null)
  const [realtimeData, setRealtimeData] = useState<RealtimeResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [rebuildState, setRebuildState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [rebuildError, setRebuildError] = useState<string | null>(null)
  const [reportState, setReportState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [reportError, setReportError] = useState<string | null>(null)
  const [reportContent, setReportContent] = useState<string>('')
  const [isGuideOpen, setIsGuideOpen] = useState(false)

  const reportBlocks = useMemo(() => parseReportBlocks(reportContent), [reportContent])

  // Hooks de dados mantidos idênticos
  useEffect(() => {
    const controller = new AbortController()
    const loadOverview = async () => {
      try {
        const data = await fetchJson<OverviewResponse>('/api/metrics/overview', controller.signal)
        setOverviewData(data)
      } catch (e) { console.error(e) } finally { setIsLoading(false) }
    }
    loadOverview()
    return () => controller.abort()
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    const loadRealtime = async () => {
      try {
        const data = await fetchJson<RealtimeResponse>('/api/metrics/realtime?waitMinutes=5&forgottenHours=24', controller.signal)
        setRealtimeData(data)
      } catch (e) { console.error(e) }
    }
    loadRealtime()
    const interval = setInterval(loadRealtime, 15_000)
    return () => { controller.abort(); clearInterval(interval) }
  }, [])

  const ov = overviewData?.overview
  const queue = realtimeData?.queue || []
  const forgotten = realtimeData?.forgotten || []
  const instances = overviewData?.items.sort((a, b) => (b.avgTmrFormatted ? 1 : -1)) || []

  return (
    <div className="relative min-h-screen w-full bg-gradient-to-br from-[#f8fafc] via-[#eef2ff] to-[#fef2f2] text-slate-800 selection:bg-blue-500/30">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-[-10%] top-[-10%] h-72 w-72 rounded-full bg-pink-200/60 blur-3xl" />
        <div className="absolute right-[-5%] top-10 h-80 w-80 rounded-full bg-blue-200/70 blur-3xl" />
        <div className="absolute inset-x-0 bottom-[-30%] mx-auto h-96 w-96 rounded-full bg-emerald-100/80 blur-3xl" />
      </div>

      {/* Top Navigation Bar */}
      <nav className="sticky top-0 z-50 border-b border-white/50 bg-white/80 px-6 py-4 backdrop-blur-xl shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 font-bold text-white">
              <Activity size={18} />
            </div>
            <div>
              <h1 className="text-sm font-bold text-slate-900">Central de Comando</h1>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider">Monitoramento em Tempo Real</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden sm:block text-right">
              <p className="text-xs text-slate-500">Última atualização</p>
              <p className="text-xs font-mono text-emerald-500">Agora mesmo</p>
            </div>
            <button
              onClick={() => setIsGuideOpen(true)}
              className="hidden sm:flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-xs font-medium text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
            >
              <PanelRightOpen size={16} />
              Entenda as métricas
            </button>
            <button
              onClick={async () => {
                if (reportState === 'loading') return
                setReportState('loading')
                setReportError(null)
                try {
                  const response = await fetch('/api/metrics/report', {
                    method: 'POST',
                    cache: 'no-store'
                  })
                  const payload = await response.json()
                  if (!response.ok) {
                    throw new Error(payload?.error || 'Falha ao gerar relatório inteligente.')
                  }
                  setReportContent(payload.report)
                  setReportState('success')
                  console.log('[Metrics] Relatório gerado via LLM', payload)
                } catch (error) {
                  console.error(error)
                  const message = error instanceof Error ? error.message : 'Falha ao gerar relatório inteligente.'
                  setReportError(message)
                  setReportState('error')
                }
              }}
              className={`rounded-lg px-4 py-2 text-xs font-medium transition-all flex items-center gap-2 ${
                reportState === 'loading'
                  ? 'bg-slate-200 text-slate-500 cursor-wait'
                  : 'bg-indigo-500 text-white shadow-sm hover:bg-indigo-400'
              }`}
            >
              {reportState === 'loading' ? 'Gerando relatório...' : 'Gerar relatório inteligente'}
            </button>
            <button
              onClick={async () => {
                if (rebuildState === 'loading') return
                setRebuildState('loading')
                setRebuildError(null)
                try {
                  const rebuildResult = await rebuildDailyMetrics()
                  const refreshed = await fetchJson<OverviewResponse>('/api/metrics/overview')
                  console.log('[Metrics] Overview atualizado após rebuild', {
                    rebuildResult,
                    overview: refreshed.overview,
                    instances: refreshed.items.map((item) => ({
                      instanceId: item.instanceId,
                      instanceName: item.instanceName,
                      avgTmrFormatted: item.avgTmrFormatted,
                      avgTmaFormatted: item.avgTmaFormatted,
                      slaBreachRate: item.slaBreachRate,
                      avgMessagesPerConversation: item.avgMessagesPerConversation,
                      engagementRate: item.engagementRate,
                      followUpSent: item.followUpSent,
                      followUpSuccess: item.followUpSuccess,
                      avgActiveChats: item.avgActiveChats,
                      maxActiveChats: item.maxActiveChats
                    }))
                  })
                  setOverviewData(refreshed)
                  setRebuildState('success')
                } catch (error) {
                  console.error(error)
                  const message = error instanceof Error ? error.message : 'Falha ao recomputar métricas.'
                  setRebuildError(message)
                  setRebuildState('error')
                } finally {
                  setTimeout(() => setRebuildState('idle'), 3000)
                }
              }}
              className={`rounded-lg px-4 py-2 text-xs font-medium transition-all flex items-center gap-2 ${
                rebuildState === 'loading'
                  ? 'bg-slate-200 text-slate-500 cursor-not-allowed'
                  : 'bg-emerald-500 text-white shadow-sm hover:bg-emerald-400'
              }`}
            >
              {rebuildState === 'loading' ? 'Recalculando...' : 'Recalcular agora'}
            </button>
            <Link href="/" className="rounded-lg bg-slate-900/80 px-4 py-2 text-xs font-medium text-white shadow-sm hover:bg-slate-900">
              Voltar ao Painel
            </Link>
          </div>
        </div>
      </nav>

      <main className="relative z-10 mx-auto max-w-7xl px-6 py-8">
        {rebuildState === 'error' && rebuildError && (
          <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {rebuildError}
          </div>
        )}
        {rebuildState === 'success' && (
          <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            Métricas recalculadas com sucesso.
          </div>
        )}
        {reportState === 'error' && reportError && (
          <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {reportError}
          </div>
        )}
        {reportBlocks.length > 0 && (
          <section className="mb-8 rounded-3xl border border-white/60 bg-gradient-to-br from-white via-slate-50 to-white p-6 shadow-xl">
            <SectionHeader
              title="Relatório inteligente"
              subtitle="Resumo crítico gerado pela LLM com sugestões priorizadas"
              icon={ArrowRight}
            />
            <div className="grid gap-4 md:grid-cols-2">
              {reportBlocks.map((block, index) => {
                const iconMap = [FileText, Sparkles, Flame, Lightbulb]
                const Icon = iconMap[index % iconMap.length]
                return (
                  <div
                    key={`${block.title}-${index}`}
                    className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"
                  >
                    <div className="mb-3 flex items-center gap-2">
                      <div className="rounded-full bg-indigo-50 p-2 text-indigo-500">
                        <Icon size={18} />
                      </div>
                      <h4 className="text-sm font-semibold text-slate-900">{block.title}</h4>
                    </div>
                    <p className="text-sm text-slate-600 whitespace-pre-line leading-relaxed">
                      {block.content || reportContent}
                    </p>
                  </div>
                )
              })}
            </div>
          </section>
        )}

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          {/* Coluna Esquerda: Métricas Gerais e Instâncias (2/3 da tela) */}
          <div className="lg:col-span-2 space-y-8">
            {/* KPI Cards Grid */}
            <section>
              <SectionHeader title="Performance Geral" subtitle="Consolidado do dia atual" icon={BarChart3} />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <StatCard 
                  label="Tempo de 1ª Resposta" // Substituiu TMR
                  value={ov?.avgTmrFormatted} 
                  helper="Meta: < 5 min"
                  icon={Timer}
                  trend="neutral"
                />
                <StatCard 
                  label="Tempo de Resolução" // Substituiu TMA
                  value={ov?.avgTmaFormatted} 
                  helper="Ciclo completo"
                  icon={Clock}
                  trend="neutral"
                />
                <StatCard 
                  label="Taxa de Atraso (>5m)" // Substituiu SLA
                  value={ov?.slaBreachRate ? `${(ov.slaBreachRate * 100).toFixed(1)}%` : '0%'} 
                  helper="Violações de SLA"
                  icon={AlertCircle}
                  trend={ov?.slaBreachRate && ov.slaBreachRate > 0.1 ? 'bad' : 'good'}
                />
                <StatCard 
                  label="Mensagens / Conversa"
                  value={ov?.avgMessagesPerConversation?.toFixed(1)} 
                  helper="Profundidade média"
                  icon={MessageSquare}
                  trend="neutral"
                />
                <StatCard 
                  label="Taxa de Engajamento"
                  value={ov?.engagementRate ? `${(ov.engagementRate * 100).toFixed(1)}%` : '—'} 
                  helper="Retorno do cliente"
                  icon={Users}
                  trend="good"
                />
                <StatCard 
                  label="Instâncias Ativas"
                  value={ov?.instances} 
                  helper="Conectadas agora"
                  icon={Activity}
                  trend="neutral"
                />
              </div>
            </section>

            {/* Tabela de Instâncias */}
            <section className="rounded-2xl border border-white/70 bg-white/80 overflow-hidden shadow-lg">
              <div className="border-b border-white/70 bg-white px-6 py-4">
                <h3 className="font-semibold text-slate-900">Detalhamento por Instância</h3>
              </div>
              <div className="divide-y divide-slate-100">
                {instances.length === 0 ? (
                  <div className="p-8 text-center text-slate-500">Nenhum dado disponível hoje.</div>
                ) : (
                  instances.map((item) => (
                    <div key={item.instanceId} className="flex flex-col gap-4 p-4 hover:bg-slate-50 sm:flex-row sm:items-center sm:justify-between transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-indigo-200 to-purple-200 flex items-center justify-center text-xs font-bold text-slate-800">
                          {item.instanceName.substring(0,2).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">{item.instanceName}</p>
                          <div className="flex items-center gap-2 text-xs text-slate-500">
                            <span className={item.slaBreachRate && item.slaBreachRate > 0 ? "text-rose-500" : "text-emerald-500"}>
                              SLA {(item.slaBreachRate || 0) * 100}%
                            </span>
                            <span>•</span>
                            <span>Pico: {item.maxActiveChats || 0} chats</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <div className="flex flex-col items-end px-3">
                          <span className="text-[10px] uppercase text-slate-500">1ª Resp</span>
                          <span className="font-mono text-sm text-slate-900">{item.avgTmrFormatted || '-'}</span>
                        </div>
                        <div className="flex flex-col items-end px-3 border-l border-slate-200">
                          <span className="text-[10px] uppercase text-slate-500">Resolução</span>
                          <span className="font-mono text-sm text-slate-900">{item.avgTmaFormatted || '-'}</span>
                        </div>
                        <div className="flex flex-col items-end px-3 border-l border-slate-200">
                          <span className="text-[10px] uppercase text-slate-500">Msgs</span>
                          <span className="font-mono text-sm text-slate-900">{item.avgMessagesPerConversation?.toFixed(0) || '-'}</span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>
          </div>

          {/* Coluna Direita: Realtime (Urgente) */}
          <div className="space-y-6">
            {/* Fila de Espera */}
            <div className="rounded-2xl border border-rose-200 bg-white/90 shadow-lg">
              <div className="flex items-center justify-between border-b border-rose-100 px-5 py-4">
                <div className="flex items-center gap-2 text-rose-500">
                  <AlertCircle size={18} />
                  <h3 className="font-semibold">Fila Crítica (+{realtimeData?.waitMinutes || 5} min)</h3>
                </div>
                <span className="rounded-full bg-rose-100 px-2 py-0.5 text-xs font-bold text-rose-600">
                  {queue.length}
                </span>
              </div>
              <div className="max-h-[300px] overflow-y-auto p-2 scrollbar-thin scrollbar-thumb-rose-200">
                {queue.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-slate-500">
                    <CheckCircle2 size={32} className="mb-2 text-emerald-400" />
                    <p className="text-sm">Fila zerada!</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {queue.map((item) => (
                      <div key={item.conversationId} className="relative overflow-hidden rounded-lg bg-rose-50 p-3 hover:bg-rose-100 transition-colors border-l-4 border-rose-400">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium text-rose-700 text-sm">{item.contactName}</p>
                            <p className="text-xs text-rose-500 mt-0.5">{item.instanceName}</p>
                          </div>
                          <span className="font-mono text-xs font-bold text-rose-600">
                            {item.minutesWaiting.toFixed(0)}m
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Contatos Esquecidos */}
            <div className="rounded-2xl border border-amber-200 bg-white/90 shadow-lg">
              <div className="flex items-center justify-between border-b border-amber-100 px-5 py-4">
                <div className="flex items-center gap-2 text-amber-500">
                  <Clock size={18} />
                  <h3 className="font-semibold">Esquecidos (+{realtimeData?.forgottenHours || 24}h)</h3>
                </div>
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-600">
                  {forgotten.length}
                </span>
              </div>
              <div className="max-h-[300px] overflow-y-auto p-2 scrollbar-thin scrollbar-thumb-amber-200">
                {forgotten.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-slate-500">
                    <CheckCircle2 size={32} className="mb-2 text-emerald-400" />
                    <p className="text-sm">Nenhum esquecido.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {forgotten.map((item) => (
                      <div key={item.conversationId} className="rounded-lg bg-amber-50 p-3 hover:bg-amber-100 transition-colors border border-transparent hover:border-amber-200">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium text-amber-700 text-sm">{item.contactName}</p>
                            <p className="text-xs text-amber-500 mt-0.5">{item.instanceName}</p>
                          </div>
                          <div className="text-right">
                            <span className="block font-mono text-xs font-bold text-amber-600">
                              {item.minutesSinceLastInbound.toFixed(0)}m
                            </span>
                            <span className="text-[10px] text-amber-500/80">sem resposta</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Painel Lateral Informacional */}
      {isGuideOpen && (
        <div className="fixed inset-0 z-50 flex">
          <div
            className="flex-1 bg-slate-900/50 backdrop-blur-sm"
            onClick={() => setIsGuideOpen(false)}
          />
          <aside className="w-full max-w-md bg-white shadow-2xl animate-slide-in-right">
            <div className="flex items-start justify-between border-b border-slate-100 px-6 py-5">
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-400">Guia rápido</p>
                <h3 className="text-lg font-semibold text-slate-900">Como ler as métricas</h3>
                <p className="text-sm text-slate-500">Saiba o que cada indicador revela e como agir.</p>
              </div>
              <button
                onClick={() => setIsGuideOpen(false)}
                className="rounded-full border border-slate-200 p-1 text-slate-500 hover:text-slate-900"
              >
                <X size={16} />
              </button>
            </div>

            <div className="h-[calc(100vh-80px)] overflow-y-auto px-6 py-6 space-y-4">
              {metricGlossary.map((metric) => {
                const currentValue = (() => {
                  const ov = overviewData?.overview
                  switch (metric.id) {
                    case 'avg_tmr':
                      return ov?.avgTmrFormatted || '—'
                    case 'avg_tma':
                      return ov?.avgTmaFormatted || '—'
                    case 'sla': {
                      const rate = typeof ov?.slaBreachRate === 'number' ? ov.slaBreachRate : null
                      return rate !== null ? `${(rate * 100).toFixed(1)}%` : '—'
                    }
                    case 'messages':
                      return ov?.avgMessagesPerConversation?.toFixed(1) || '—'
                    case 'engagement': {
                      const engagement = typeof ov?.engagementRate === 'number' ? ov.engagementRate : null
                      return engagement !== null ? `${(engagement * 100).toFixed(1)}%` : '—'
                    }
                    case 'activity':
                      return `${realtimeData?.activity?.length || 0} snapshots hoje`
                    default:
                      return '—'
                  }
                })()

                return (
                  <article
                    key={metric.id}
                    className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4 shadow-sm"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs uppercase tracking-wide text-slate-400">Indicador</p>
                        <h4 className="text-base font-semibold text-slate-900">{metric.title}</h4>
                      </div>
                      <span className="rounded-full bg-white px-3 py-1 text-xs font-mono text-slate-700">
                        {currentValue}
                      </span>
                    </div>
                    <p className="mt-3 text-sm text-slate-600 leading-relaxed">{metric.description}</p>
                    <div className="mt-4 rounded-xl bg-white/80 p-3 text-xs text-slate-500">
                      <p className="font-semibold text-slate-700">Meta sugerida</p>
                      <p>{metric.goal}</p>
                    </div>
                  </article>
                )
              })}
            </div>
          </aside>
        </div>
      )}
    </div>
  )
}