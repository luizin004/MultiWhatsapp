'use client'

import { useEffect, useState, useCallback } from 'react'
import { X, Plus, Trash2, AlertTriangle, Webhook, ToggleLeft, ToggleRight } from 'lucide-react'
import { getWebhooks, updateWebhook, WebhookConfig } from '@/services/uazapi/instance'

interface WebhookManagerProps {
  open: boolean
  instanceToken: string
  onClose: () => void
}

const AVAILABLE_EVENTS = ['messages', 'messages_update', 'connection', 'call', 'contacts', 'presence', 'groups', 'labels', 'chats', 'chat_labels', 'blocks', 'leads', 'sender']
const EXCLUDE_FILTERS = ['wasSentByApi', 'wasNotSentByApi', 'fromMeYes', 'fromMeNo', 'isGroupYes', 'isGroupNo']

interface WebhookFormState {
  url: string
  events: string[]
  excludeMessages: string[]
}

const EMPTY_FORM: WebhookFormState = { url: '', events: [], excludeMessages: [] }

function toggleArr(arr: string[], value: string): string[] {
  return arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value]
}

export default function WebhookManager({ open, instanceToken, onClose }: WebhookManagerProps) {
  const [webhooks, setWebhooks] = useState<WebhookConfig[]>([])
  const [loading, setLoading] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<WebhookFormState>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadWebhooks = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getWebhooks(instanceToken)
      setWebhooks(Array.isArray(data) ? (data as WebhookConfig[]) : [])
    } catch { setError('Falha ao carregar webhooks.') }
    finally { setLoading(false) }
  }, [instanceToken])

  useEffect(() => { if (open) loadWebhooks() }, [open, loadWebhooks])

  const handleAdd = async () => {
    if (!form.url.trim()) return setError('A URL do webhook é obrigatória.')
    setSaving(true); setError(null)
    try {
      await updateWebhook(instanceToken, { url: form.url.trim(), events: form.events.length > 0 ? form.events : undefined, excludeMessages: form.excludeMessages.length > 0 ? form.excludeMessages : undefined, action: 'add' })
      setShowForm(false); setForm(EMPTY_FORM)
      await loadWebhooks()
    } catch { setError('Falha ao adicionar webhook.') }
    finally { setSaving(false) }
  }

  const handleToggle = async (wh: WebhookConfig) => {
    setSaving(true)
    try { await updateWebhook(instanceToken, { ...wh, enabled: !wh.enabled, action: 'update' }); await loadWebhooks() }
    catch { setError('Falha ao atualizar webhook.') }
    finally { setSaving(false) }
  }

  const handleDelete = async (wh: WebhookConfig) => {
    setSaving(true)
    try { await updateWebhook(instanceToken, { ...wh, action: 'delete' }); await loadWebhooks() }
    catch { setError('Falha ao deletar webhook.') }
    finally { setSaving(false) }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-xl rounded-2xl bg-[#111B21] shadow-2xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between rounded-t-2xl bg-[#202C33] px-5 py-4">
          <div className="flex items-center gap-2"><Webhook className="h-4 w-4 text-[#25D366]" /><h2 className="font-semibold text-[#E9EDEF]">Webhooks</h2></div>
          <button type="button" onClick={onClose} className="rounded-full p-1.5 text-[#8696A0] transition hover:bg-white/10 hover:text-[#E9EDEF]"><X className="h-4 w-4" /></button>
        </div>

        {error && <div className="mx-4 mt-3 flex items-center gap-2 rounded-xl bg-red-500/15 px-3 py-2 text-sm text-red-400"><AlertTriangle className="h-4 w-4 shrink-0" />{error}</div>}

        {showForm && (
          <div className="mx-4 mt-3 rounded-xl border border-white/10 bg-[#0B141A] p-4 space-y-4">
            <p className="text-xs font-semibold text-[#8696A0] uppercase tracking-wide">Novo Webhook</p>
            <div>
              <label className="mb-1 block text-xs text-[#8696A0]">URL *</label>
              <input type="url" value={form.url} onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))} placeholder="https://seu-servidor.com/webhook" className="w-full rounded-xl bg-[#202C33] border border-white/10 px-3 py-2 text-sm text-[#E9EDEF] placeholder:text-[#8696A0] focus:outline-none focus:border-[#25D366]/50" />
            </div>
            <div>
              <label className="mb-2 block text-xs text-[#8696A0]">Eventos</label>
              <div className="grid grid-cols-3 gap-1">
                {AVAILABLE_EVENTS.map((ev) => (
                  <label key={ev} className="flex items-center gap-2 cursor-pointer rounded-lg px-2 py-1 hover:bg-white/5 transition">
                    <input type="checkbox" checked={form.events.includes(ev)} onChange={() => setForm((f) => ({ ...f, events: toggleArr(f.events, ev) }))} className="accent-[#25D366]" />
                    <span className="text-xs text-[#E9EDEF]">{ev}</span>
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label className="mb-2 block text-xs text-[#8696A0]">Excluir mensagens</label>
              <div className="grid grid-cols-2 gap-1">
                {EXCLUDE_FILTERS.map((f) => (
                  <label key={f} className="flex items-center gap-2 cursor-pointer rounded-lg px-2 py-1 hover:bg-white/5 transition">
                    <input type="checkbox" checked={form.excludeMessages.includes(f)} onChange={() => setForm((ff) => ({ ...ff, excludeMessages: toggleArr(ff.excludeMessages, f) }))} className="accent-[#25D366]" />
                    <span className="text-xs text-[#E9EDEF]">{f}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => { setShowForm(false); setForm(EMPTY_FORM); setError(null) }} className="flex-1 rounded-xl border border-white/10 py-2 text-sm text-[#8696A0] transition hover:bg-white/5">Cancelar</button>
              <button type="button" onClick={handleAdd} disabled={saving} className="flex-1 rounded-xl bg-[#25D366] py-2 text-sm font-semibold text-[#111B21] transition hover:bg-[#1ed061] disabled:opacity-60">{saving ? 'Adicionando...' : 'Adicionar'}</button>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {loading ? <p className="text-center text-sm text-[#8696A0] py-8">Carregando...</p>
            : webhooks.length === 0 ? <p className="text-center text-sm text-[#8696A0] py-8">Nenhum webhook configurado.</p>
            : webhooks.map((wh, i) => (
              <div key={wh.id ?? i} className="rounded-xl border border-white/5 bg-[#0B141A] p-4 space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <span className="flex-1 truncate text-sm text-[#E9EDEF] font-mono break-all">{wh.url}</span>
                  <div className="flex items-center gap-2 shrink-0">
                    <button type="button" onClick={() => handleToggle(wh)} disabled={saving} className="transition" title={wh.enabled ? 'Desativar' : 'Ativar'}>
                      {wh.enabled ? <ToggleRight className="h-5 w-5 text-[#25D366]" /> : <ToggleLeft className="h-5 w-5 text-[#8696A0]" />}
                    </button>
                    <button type="button" onClick={() => handleDelete(wh)} disabled={saving} className="rounded-lg p-1 text-[#8696A0] hover:bg-red-500/20 hover:text-red-400 transition" title="Deletar"><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                </div>
                {wh.events && wh.events.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {wh.events.map((ev) => <span key={ev} className="rounded-full bg-[#25D366]/15 px-2 py-0.5 text-[10px] text-[#25D366]">{ev}</span>)}
                  </div>
                )}
                {wh.excludeMessages && wh.excludeMessages.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {wh.excludeMessages.map((f) => <span key={f} className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] text-[#8696A0]">excl: {f}</span>)}
                  </div>
                )}
              </div>
            ))}
        </div>

        {!showForm && (
          <div className="border-t border-white/5 px-4 py-3">
            <button type="button" onClick={() => { setShowForm(true); setError(null) }} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#25D366] py-2.5 text-sm font-semibold text-[#111B21] transition hover:bg-[#1ed061]">
              <Plus className="h-4 w-4" />Adicionar webhook
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
