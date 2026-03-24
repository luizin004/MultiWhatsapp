'use client'

import { useState } from 'react'
import { X, Plus, Trash2 } from 'lucide-react'
import { sendMenu } from '../../services/uazapi/messages'

interface PollBuilderProps {
  open: boolean
  onClose: () => void
  instanceToken: string
  contactNumber: string
}

const inputClass =
  'w-full rounded-xl border border-white/10 bg-[#0B141A] px-4 py-2.5 text-sm text-[#E9EDEF] placeholder:text-[#8696A0] focus:border-[#25D366] focus:outline-none'

export default function PollBuilder({ open, onClose, instanceToken, contactNumber }: PollBuilderProps) {
  const [question, setQuestion] = useState('')
  const [options, setOptions] = useState(['', ''])
  const [selectableCount, setSelectableCount] = useState(1)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')

  const addOption = () => {
    if (options.length < 12) setOptions([...options, ''])
  }

  const removeOption = (index: number) => {
    if (options.length <= 2) return
    setOptions(options.filter((_, i) => i !== index))
  }

  const updateOption = (index: number, value: string) => {
    const updated = [...options]
    updated[index] = value
    setOptions(updated)
  }

  const handleSend = async () => {
    const filledOptions = options.filter((o) => o.trim())
    if (!question.trim()) { setError('Digite a pergunta.'); return }
    if (filledOptions.length < 2) { setError('Adicione pelo menos 2 opções.'); return }

    setSending(true)
    setError('')
    try {
      await sendMenu(instanceToken, {
        number: contactNumber,
        type: 'poll',
        text: question.trim(),
        choices: filledOptions,
        selectableCount,
      })
      handleClose()
    } catch {
      setError('Erro ao enviar enquete. Tente novamente.')
    } finally {
      setSending(false)
    }
  }

  const handleClose = () => {
    setQuestion('')
    setOptions(['', ''])
    setSelectableCount(1)
    setError('')
    onClose()
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-[#111B21] shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 bg-[#202C33] px-6 py-4 rounded-t-2xl">
          <h2 className="text-sm font-semibold text-[#E9EDEF]">Nova Enquete</h2>
          <button onClick={handleClose} className="rounded-full p-1 text-[#8696A0] hover:bg-white/10 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex flex-col gap-4 px-6 py-4">
          <div>
            <label className="mb-1.5 block text-xs text-[#8696A0]">Pergunta</label>
            <input
              className={inputClass}
              placeholder="Ex: Qual sua preferência?"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs text-[#8696A0]">Opções ({options.length}/12)</label>
            <div className="flex flex-col gap-2">
              {options.map((opt, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    className={inputClass}
                    placeholder={`Opção ${i + 1}`}
                    value={opt}
                    onChange={(e) => updateOption(i, e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => removeOption(i)}
                    disabled={options.length <= 2}
                    className="rounded-full p-1.5 text-[#8696A0] hover:bg-white/10 hover:text-red-400 disabled:opacity-30"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
            {options.length < 12 && (
              <button
                type="button"
                onClick={addOption}
                className="mt-2 flex items-center gap-1.5 text-xs text-[#25D366] hover:underline"
              >
                <Plus className="h-3.5 w-3.5" /> Adicionar opção
              </button>
            )}
          </div>

          <div>
            <label className="mb-1.5 block text-xs text-[#8696A0]">Seleções permitidas</label>
            <select
              className={inputClass}
              value={selectableCount}
              onChange={(e) => setSelectableCount(Number(e.target.value))}
            >
              <option value={1}>1 — Escolha única</option>
              {[2, 3, 4, 5].map((n) => (
                <option key={n} value={n}>{n} — Múltipla escolha</option>
              ))}
            </select>
          </div>

          {error && <p className="text-xs text-red-400">{error}</p>}
        </div>

        <div className="flex gap-3 border-t border-white/10 px-6 py-4">
          <button
            onClick={handleClose}
            className="flex-1 rounded-full border border-white/10 py-2 text-sm text-[#E9EDEF] hover:bg-white/5"
          >
            Cancelar
          </button>
          <button
            onClick={handleSend}
            disabled={sending}
            className="flex-1 rounded-full bg-[#25D366] py-2 text-sm font-semibold text-[#111B21] hover:bg-[#1ed061] disabled:opacity-60"
          >
            {sending ? 'Enviando...' : 'Enviar Enquete'}
          </button>
        </div>
      </div>
    </div>
  )
}
