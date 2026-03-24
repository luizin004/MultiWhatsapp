'use client'

import { useEffect, useState, useCallback } from 'react'
import { X, Plus, Pencil, Trash2, Check, AlertTriangle } from 'lucide-react'
import { uazapiFetch } from '@/services/uazapi/client'

interface LabelsManagerProps {
  open: boolean
  instanceToken: string
  onClose: () => void
}

interface ApiLabel { id: string; name: string; color: number }
interface LabelFormState { name: string; colorIndex: number }

const LABEL_COLORS = [
  '#00A884', '#53BDEB', '#FF9A3E', '#FC5C65', '#E277CD',
  '#20C997', '#5B5EA6', '#F7B731', '#EB3B5A', '#8854D0',
  '#2BCBBA', '#4B7BEC', '#FD9644', '#FC5C65', '#A55EEA',
  '#26DE81', '#45AAF2', '#F7B731', '#778CA3', '#4B6584',
]

const EMPTY_FORM: LabelFormState = { name: '', colorIndex: 0 }

export default function LabelsManager({ open, instanceToken, onClose }: LabelsManagerProps) {
  const [labels, setLabels] = useState<ApiLabel[]>([])
  const [loading, setLoading] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<LabelFormState>(EMPTY_FORM)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadLabels = useCallback(async () => {
    setLoading(true)
    try {
      const data = await uazapiFetch<ApiLabel[] | { labels?: ApiLabel[] }>('/labels', instanceToken)
      const list = Array.isArray(data) ? data : ((data as { labels?: ApiLabel[] }).labels ?? [])
      setLabels(list)
    } catch { setError('Falha ao carregar etiquetas.') }
    finally { setLoading(false) }
  }, [instanceToken])

  useEffect(() => { if (open) loadLabels() }, [open, loadLabels])

  const openEditForm = (label: ApiLabel) => {
    setEditingId(label.id)
    setForm({ name: label.name, colorIndex: label.color })
    setShowForm(true); setError(null)
  }

  const handleSave = async () => {
    if (!form.name.trim()) return setError('O nome da etiqueta é obrigatório.')
    setSaving(true); setError(null)
    try {
      const body: Record<string, unknown> = { name: form.name.trim(), color: form.colorIndex }
      if (editingId) body.id = editingId
      await uazapiFetch('/label/edit', instanceToken, { body })
      setShowForm(false); setEditingId(null)
      await loadLabels()
    } catch { setError('Falha ao salvar etiqueta.') }
    finally { setSaving(false) }
  }

  const handleDelete = async (id: string) => {
    const label = labels.find((l) => l.id === id)
    if (!label) return
    setSaving(true)
    try {
      await uazapiFetch('/label/edit', instanceToken, { body: { id, name: label.name, color: label.color, delete: true } })
      setConfirmDeleteId(null); await loadLabels()
    } catch { setError('Falha ao deletar etiqueta.') }
    finally { setSaving(false) }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-2xl bg-[#111B21] shadow-2xl flex flex-col max-h-[80vh]">
        <div className="flex items-center justify-between rounded-t-2xl bg-[#202C33] px-5 py-4">
          <h2 className="font-semibold text-[#E9EDEF]">Etiquetas</h2>
          <button type="button" onClick={onClose} className="rounded-full p-1.5 text-[#8696A0] transition hover:bg-white/10 hover:text-[#E9EDEF]"><X className="h-4 w-4" /></button>
        </div>

        {error && <div className="mx-4 mt-3 flex items-center gap-2 rounded-xl bg-red-500/15 px-3 py-2 text-sm text-red-400"><AlertTriangle className="h-4 w-4 shrink-0" />{error}</div>}

        {showForm && (
          <div className="mx-4 mt-3 rounded-xl border border-white/10 bg-[#0B141A] p-4 space-y-3">
            <p className="text-xs font-semibold text-[#8696A0] uppercase tracking-wide">{editingId ? 'Editar etiqueta' : 'Nova etiqueta'}</p>
            <div>
              <label className="mb-1 block text-xs text-[#8696A0]">Nome *</label>
              <input type="text" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="ex: Cliente VIP" className="w-full rounded-xl bg-[#202C33] border border-white/10 px-3 py-2 text-sm text-[#E9EDEF] placeholder:text-[#8696A0] focus:outline-none focus:border-[#25D366]/50" />
            </div>
            <div>
              <label className="mb-2 block text-xs text-[#8696A0]">Cor</label>
              <div className="grid grid-cols-10 gap-1.5">
                {LABEL_COLORS.map((color, index) => (
                  <button key={index} type="button" onClick={() => setForm((f) => ({ ...f, colorIndex: index }))} className={`h-7 w-7 rounded-full transition hover:scale-110 ${form.colorIndex === index ? 'ring-2 ring-white ring-offset-1 ring-offset-[#0B141A]' : ''}`} style={{ backgroundColor: color }} title={`Cor ${index}`} />
                ))}
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <button type="button" onClick={() => { setShowForm(false); setEditingId(null); setError(null) }} className="flex-1 rounded-xl border border-white/10 py-2 text-sm text-[#8696A0] transition hover:bg-white/5">Cancelar</button>
              <button type="button" onClick={handleSave} disabled={saving} className="flex-1 rounded-xl bg-[#25D366] py-2 text-sm font-semibold text-[#111B21] transition hover:bg-[#1ed061] disabled:opacity-60">{saving ? 'Salvando...' : 'Salvar'}</button>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {loading ? <p className="text-center text-sm text-[#8696A0] py-8">Carregando...</p>
            : labels.length === 0 ? <p className="text-center text-sm text-[#8696A0] py-8">Nenhuma etiqueta cadastrada.</p>
            : labels.map((label) => (
              <div key={label.id} className="flex items-center gap-3 rounded-xl border border-white/5 bg-[#0B141A] px-4 py-3">
                <span className="h-4 w-4 rounded-full shrink-0" style={{ backgroundColor: LABEL_COLORS[label.color] ?? '#8696A0' }} />
                <span className="flex-1 text-sm text-[#E9EDEF]">{label.name}</span>
                {confirmDeleteId === label.id ? (
                  <div className="flex items-center gap-1 shrink-0">
                    <button type="button" onClick={() => handleDelete(label.id)} disabled={saving} className="rounded-lg bg-red-500/20 p-1.5 text-red-400 hover:bg-red-500/30 transition" title="Confirmar"><Check className="h-3.5 w-3.5" /></button>
                    <button type="button" onClick={() => setConfirmDeleteId(null)} className="rounded-lg p-1.5 text-[#8696A0] hover:bg-white/5 transition"><X className="h-3.5 w-3.5" /></button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 shrink-0">
                    <button type="button" onClick={() => openEditForm(label)} className="rounded-lg p-1.5 text-[#8696A0] hover:bg-white/5 hover:text-[#E9EDEF] transition" title="Editar"><Pencil className="h-3.5 w-3.5" /></button>
                    <button type="button" onClick={() => setConfirmDeleteId(label.id)} className="rounded-lg p-1.5 text-[#8696A0] hover:bg-red-500/20 hover:text-red-400 transition" title="Deletar"><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                )}
              </div>
            ))}
        </div>

        {!showForm && (
          <div className="border-t border-white/5 px-4 py-3">
            <button type="button" onClick={() => { setEditingId(null); setForm(EMPTY_FORM); setShowForm(true); setError(null) }} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#25D366] py-2.5 text-sm font-semibold text-[#111B21] transition hover:bg-[#1ed061]">
              <Plus className="h-4 w-4" />Adicionar etiqueta
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
