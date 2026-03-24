'use client'

import { useEffect, useState, useCallback } from 'react'
import { X, Plus, Pencil, Trash2, Check, AlertTriangle } from 'lucide-react'
import { QuickReply } from '@/types/database'
import { getQuickReplies, editQuickReply, EditQuickReplyParams } from '@/services/uazapi/quick-replies'

interface QuickReplyManagerProps {
  open: boolean
  instanceToken: string
  onClose: () => void
}

type ReplyType = EditQuickReplyParams['type']
const REPLY_TYPES: ReplyType[] = ['text', 'image', 'video', 'audio', 'document']
const TYPE_LABELS: Record<string, string> = { text: 'Texto', image: 'Imagem', video: 'Vídeo', audio: 'Áudio', myaudio: 'Meu Áudio', ptt: 'PTT', document: 'Documento' }
const EMPTY_FORM: EditQuickReplyParams = { shortCut: '', type: 'text', text: '', file: '', docName: '' }

export default function QuickReplyManager({ open, instanceToken, onClose }: QuickReplyManagerProps) {
  const [replies, setReplies] = useState<QuickReply[]>([])
  const [loading, setLoading] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<EditQuickReplyParams>(EMPTY_FORM)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadReplies = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getQuickReplies(instanceToken)
      setReplies(Array.isArray(data) ? (data as QuickReply[]) : [])
    } catch { setError('Falha ao carregar respostas rápidas.') }
    finally { setLoading(false) }
  }, [instanceToken])

  useEffect(() => { if (open) loadReplies() }, [open, loadReplies])

  const openEditForm = (reply: QuickReply) => {
    setEditingId(reply.id)
    setForm({ id: reply.id, shortCut: reply.shortcut, type: reply.type, text: reply.text ?? '', file: reply.file_url ?? '', docName: reply.doc_name ?? '' })
    setShowForm(true)
    setError(null)
  }

  const handleSave = async () => {
    if (!form.shortCut.trim()) return setError('O atalho é obrigatório.')
    setSaving(true); setError(null)
    try {
      const params: EditQuickReplyParams = { ...form, shortCut: form.shortCut.trim(), text: form.text?.trim() || undefined, file: form.file?.trim() || undefined, docName: form.docName?.trim() || undefined }
      if (editingId) params.id = editingId
      await editQuickReply(instanceToken, params)
      setShowForm(false); setEditingId(null)
      await loadReplies()
    } catch { setError('Falha ao salvar.') }
    finally { setSaving(false) }
  }

  const handleDelete = async (id: string) => {
    const r = replies.find((x) => x.id === id)
    if (!r) return
    setSaving(true)
    try {
      await editQuickReply(instanceToken, { id, shortCut: r.shortcut, type: r.type, delete: true })
      setConfirmDeleteId(null)
      await loadReplies()
    } catch { setError('Falha ao deletar.') }
    finally { setSaving(false) }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-[#111B21] shadow-2xl flex flex-col max-h-[85vh]">
        <div className="flex items-center justify-between rounded-t-2xl bg-[#202C33] px-5 py-4">
          <h2 className="font-semibold text-[#E9EDEF]">Respostas Rápidas</h2>
          <button type="button" onClick={onClose} className="rounded-full p-1.5 text-[#8696A0] transition hover:bg-white/10 hover:text-[#E9EDEF]"><X className="h-4 w-4" /></button>
        </div>

        {error && <div className="mx-4 mt-3 flex items-center gap-2 rounded-xl bg-red-500/15 px-3 py-2 text-sm text-red-400"><AlertTriangle className="h-4 w-4 shrink-0" />{error}</div>}

        {showForm && (
          <div className="mx-4 mt-3 rounded-xl border border-white/10 bg-[#0B141A] p-4 space-y-3">
            <p className="text-xs font-semibold text-[#8696A0] uppercase tracking-wide">{editingId ? 'Editar atalho' : 'Novo atalho'}</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs text-[#8696A0]">Atalho *</label>
                <input type="text" value={form.shortCut} onChange={(e) => setForm((f) => ({ ...f, shortCut: e.target.value }))} placeholder="ex: ola" className="w-full rounded-xl bg-[#202C33] border border-white/10 px-3 py-2 text-sm text-[#E9EDEF] placeholder:text-[#8696A0] focus:outline-none focus:border-[#25D366]/50" />
              </div>
              <div>
                <label className="mb-1 block text-xs text-[#8696A0]">Tipo</label>
                <select value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as ReplyType }))} className="w-full rounded-xl bg-[#202C33] border border-white/10 px-3 py-2 text-sm text-[#E9EDEF] focus:outline-none focus:border-[#25D366]/50">
                  {REPLY_TYPES.map((t) => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}
                </select>
              </div>
            </div>
            {form.type === 'text' ? (
              <div>
                <label className="mb-1 block text-xs text-[#8696A0]">Conteúdo</label>
                <textarea value={form.text ?? ''} onChange={(e) => setForm((f) => ({ ...f, text: e.target.value }))} rows={3} placeholder="Texto da resposta..." className="w-full resize-none rounded-xl bg-[#202C33] border border-white/10 px-3 py-2 text-sm text-[#E9EDEF] placeholder:text-[#8696A0] focus:outline-none focus:border-[#25D366]/50" />
              </div>
            ) : (
              <div>
                <label className="mb-1 block text-xs text-[#8696A0]">URL do arquivo</label>
                <input type="url" value={form.file ?? ''} onChange={(e) => setForm((f) => ({ ...f, file: e.target.value }))} placeholder="https://..." className="w-full rounded-xl bg-[#202C33] border border-white/10 px-3 py-2 text-sm text-[#E9EDEF] placeholder:text-[#8696A0] focus:outline-none focus:border-[#25D366]/50" />
              </div>
            )}
            {form.type === 'document' && (
              <div>
                <label className="mb-1 block text-xs text-[#8696A0]">Nome do documento</label>
                <input type="text" value={form.docName ?? ''} onChange={(e) => setForm((f) => ({ ...f, docName: e.target.value }))} placeholder="ex: proposta.pdf" className="w-full rounded-xl bg-[#202C33] border border-white/10 px-3 py-2 text-sm text-[#E9EDEF] placeholder:text-[#8696A0] focus:outline-none focus:border-[#25D366]/50" />
              </div>
            )}
            <div className="flex gap-2 pt-1">
              <button type="button" onClick={() => { setShowForm(false); setEditingId(null); setError(null) }} className="flex-1 rounded-xl border border-white/10 py-2 text-sm text-[#8696A0] transition hover:bg-white/5">Cancelar</button>
              <button type="button" onClick={handleSave} disabled={saving} className="flex-1 rounded-xl bg-[#25D366] py-2 text-sm font-semibold text-[#111B21] transition hover:bg-[#1ed061] disabled:opacity-60">{saving ? 'Salvando...' : 'Salvar'}</button>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {loading ? <p className="text-center text-sm text-[#8696A0] py-8">Carregando...</p>
            : replies.length === 0 ? <p className="text-center text-sm text-[#8696A0] py-8">Nenhuma resposta rápida cadastrada.</p>
            : replies.map((reply) => (
              <div key={reply.id} className="flex items-center gap-3 rounded-xl border border-white/5 bg-[#0B141A] px-4 py-3">
                <span className="font-mono text-sm font-bold text-[#25D366] shrink-0">/{reply.shortcut}</span>
                <span className="flex-1 truncate text-xs text-[#8696A0]">{reply.text ?? reply.doc_name ?? reply.file_url ?? '—'}</span>
                <span className="text-[10px] text-[#8696A0] bg-white/5 rounded-full px-2 py-0.5 shrink-0">{TYPE_LABELS[reply.type] ?? reply.type}</span>
                {confirmDeleteId === reply.id ? (
                  <div className="flex items-center gap-1 shrink-0">
                    <button type="button" onClick={() => handleDelete(reply.id)} disabled={saving} className="rounded-lg bg-red-500/20 p-1.5 text-red-400 hover:bg-red-500/30 transition" title="Confirmar"><Check className="h-3.5 w-3.5" /></button>
                    <button type="button" onClick={() => setConfirmDeleteId(null)} className="rounded-lg p-1.5 text-[#8696A0] hover:bg-white/5 transition"><X className="h-3.5 w-3.5" /></button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 shrink-0">
                    <button type="button" onClick={() => openEditForm(reply)} className="rounded-lg p-1.5 text-[#8696A0] hover:bg-white/5 hover:text-[#E9EDEF] transition" title="Editar"><Pencil className="h-3.5 w-3.5" /></button>
                    <button type="button" onClick={() => setConfirmDeleteId(reply.id)} className="rounded-lg p-1.5 text-[#8696A0] hover:bg-red-500/20 hover:text-red-400 transition" title="Deletar"><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                )}
              </div>
            ))}
        </div>

        {!showForm && (
          <div className="border-t border-white/5 px-4 py-3">
            <button type="button" onClick={() => { setEditingId(null); setForm(EMPTY_FORM); setShowForm(true); setError(null) }} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#25D366] py-2.5 text-sm font-semibold text-[#111B21] transition hover:bg-[#1ed061]">
              <Plus className="h-4 w-4" />Adicionar resposta rápida
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
