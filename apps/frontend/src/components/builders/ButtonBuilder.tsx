'use client'

import { useState } from 'react'
import { X, Plus, Trash2 } from 'lucide-react'
import { sendMenu } from '../../services/uazapi/messages'

type ButtonType = 'REPLY' | 'URL' | 'CALL' | 'COPY'

interface ButtonRow {
  id: string
  label: string
  type: ButtonType
  value: string
}

interface ButtonBuilderProps {
  open: boolean
  onClose: () => void
  instanceToken: string
  contactNumber: string
}

const inputClass =
  'w-full rounded-xl border border-white/10 bg-[#0B141A] px-4 py-2.5 text-sm text-[#E9EDEF] placeholder:text-[#8696A0] focus:border-[#25D366] focus:outline-none'

const BUTTON_TYPE_LABELS: Record<ButtonType, string> = {
  REPLY: 'Resposta rápida',
  URL: 'Abrir URL',
  CALL: 'Ligar',
  COPY: 'Copiar texto',
}

const VALUE_PLACEHOLDERS: Record<ButtonType, string> = {
  REPLY: 'ID da resposta',
  URL: 'https://...',
  CALL: '+5511999999999',
  COPY: 'Texto a copiar',
}

const newButton = (): ButtonRow => ({ id: crypto.randomUUID(), label: '', type: 'REPLY', value: '' })

export default function ButtonBuilder({ open, onClose, instanceToken, contactNumber }: ButtonBuilderProps) {
  const [text, setText] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [footer, setFooter] = useState('')
  const [buttons, setButtons] = useState<ButtonRow[]>([newButton()])
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')

  const addButton = () => {
    if (buttons.length < 3) setButtons((prev) => [...prev, newButton()])
  }

  const removeButton = (id: string) => {
    setButtons((prev) => prev.filter((b) => b.id !== id))
  }

  const updateButton = (id: string, field: keyof ButtonRow, value: string) => {
    setButtons((prev) => prev.map((b) => (b.id === id ? { ...b, [field]: value } : b)))
  }

  const handleSend = async () => {
    if (!text.trim()) { setError('Digite o texto da mensagem.'); return }
    const validButtons = buttons.filter((b) => b.label.trim())
    if (validButtons.length === 0) { setError('Adicione pelo menos um botão com label.'); return }

    const choices = validButtons.map((b) => `${b.type}|${b.label.trim()}|${b.value.trim()}`)

    setSending(true)
    setError('')
    try {
      await sendMenu(instanceToken, {
        number: contactNumber,
        type: 'button',
        text: text.trim(),
        choices,
        imageButton: imageUrl.trim() || undefined,
        footerText: footer.trim() || undefined,
      })
      handleClose()
    } catch {
      setError('Erro ao enviar mensagem. Tente novamente.')
    } finally {
      setSending(false)
    }
  }

  const handleClose = () => {
    setText('')
    setImageUrl('')
    setFooter('')
    setButtons([newButton()])
    setError('')
    onClose()
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-[#111B21] shadow-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between border-b border-white/10 bg-[#202C33] px-6 py-4 rounded-t-2xl shrink-0">
          <h2 className="text-sm font-semibold text-[#E9EDEF]">Mensagem com Botões</h2>
          <button onClick={handleClose} className="rounded-full p-1 text-[#8696A0] hover:bg-white/10 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex flex-col gap-4 overflow-y-auto px-6 py-4">
          <div>
            <label className="mb-1.5 block text-xs text-[#8696A0]">Texto da mensagem *</label>
            <textarea
              className={`${inputClass} resize-none`}
              rows={3}
              placeholder="Mensagem principal"
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-xs text-[#8696A0]">URL da imagem (opcional)</label>
              <input className={inputClass} placeholder="https://..." value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} />
            </div>
            <div>
              <label className="mb-1.5 block text-xs text-[#8696A0]">Rodapé (opcional)</label>
              <input className={inputClass} placeholder="Texto de rodapé" value={footer} onChange={(e) => setFooter(e.target.value)} />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs text-[#8696A0]">Botões ({buttons.length}/3)</label>
            <div className="flex flex-col gap-3">
              {buttons.map((btn) => (
                <div key={btn.id} className="rounded-xl border border-white/10 bg-[#0B141A] p-3">
                  <div className="mb-2 flex items-center gap-2">
                    <input
                      className={inputClass}
                      placeholder="Label do botão"
                      value={btn.label}
                      onChange={(e) => updateButton(btn.id, 'label', e.target.value)}
                    />
                    {buttons.length > 1 && (
                      <button onClick={() => removeButton(btn.id)} className="rounded-full p-1.5 text-[#8696A0] hover:text-red-400">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      className={inputClass}
                      value={btn.type}
                      onChange={(e) => updateButton(btn.id, 'type', e.target.value as ButtonType)}
                    >
                      {(Object.keys(BUTTON_TYPE_LABELS) as ButtonType[]).map((t) => (
                        <option key={t} value={t}>{BUTTON_TYPE_LABELS[t]}</option>
                      ))}
                    </select>
                    <input
                      className={inputClass}
                      placeholder={VALUE_PLACEHOLDERS[btn.type]}
                      value={btn.value}
                      onChange={(e) => updateButton(btn.id, 'value', e.target.value)}
                    />
                  </div>
                </div>
              ))}
            </div>
            {buttons.length < 3 && (
              <button onClick={addButton} className="mt-2 flex items-center gap-1.5 text-xs text-[#25D366] hover:underline">
                <Plus className="h-3.5 w-3.5" /> Adicionar botão
              </button>
            )}
          </div>

          {error && <p className="text-xs text-red-400">{error}</p>}
        </div>

        <div className="flex gap-3 border-t border-white/10 px-6 py-4 shrink-0">
          <button onClick={handleClose} className="flex-1 rounded-full border border-white/10 py-2 text-sm text-[#E9EDEF] hover:bg-white/5">
            Cancelar
          </button>
          <button
            onClick={handleSend}
            disabled={sending}
            className="flex-1 rounded-full bg-[#25D366] py-2 text-sm font-semibold text-[#111B21] hover:bg-[#1ed061] disabled:opacity-60"
          >
            {sending ? 'Enviando...' : 'Enviar Mensagem'}
          </button>
        </div>
      </div>
    </div>
  )
}
