'use client'

import { useState } from 'react'
import { X, Plus, Trash2, ChevronDown, ChevronUp } from 'lucide-react'
import { sendMenu } from '../../services/uazapi/messages'

interface ListItem {
  id: string
  text: string
  description: string
}

interface ListSection {
  title: string
  items: ListItem[]
}

interface ListBuilderProps {
  open: boolean
  onClose: () => void
  instanceToken: string
  contactNumber: string
}

const inputClass =
  'w-full rounded-xl border border-white/10 bg-[#0B141A] px-4 py-2.5 text-sm text-[#E9EDEF] placeholder:text-[#8696A0] focus:border-[#25D366] focus:outline-none'

const newItem = (): ListItem => ({ id: crypto.randomUUID(), text: '', description: '' })
const newSection = (): ListSection => ({ title: '', items: [newItem()] })

export default function ListBuilder({ open, onClose, instanceToken, contactNumber }: ListBuilderProps) {
  const [header, setHeader] = useState('')
  const [buttonText, setButtonText] = useState('')
  const [footer, setFooter] = useState('')
  const [sections, setSections] = useState<ListSection[]>([newSection()])
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')

  const updateSection = (si: number, field: keyof ListSection, value: string) => {
    setSections((prev) => prev.map((s, i) => (i === si ? { ...s, [field]: value } : s)))
  }

  const addSection = () => setSections((prev) => [...prev, newSection()])
  const removeSection = (si: number) => setSections((prev) => prev.filter((_, i) => i !== si))

  const addItem = (si: number) => {
    setSections((prev) =>
      prev.map((s, i) => (i === si ? { ...s, items: [...s.items, newItem()] } : s))
    )
  }

  const removeItem = (si: number, ii: number) => {
    setSections((prev) =>
      prev.map((s, i) =>
        i === si ? { ...s, items: s.items.filter((_, j) => j !== ii) } : s
      )
    )
  }

  const updateItem = (si: number, ii: number, field: keyof ListItem, value: string) => {
    setSections((prev) =>
      prev.map((s, i) =>
        i === si
          ? { ...s, items: s.items.map((item, j) => (j === ii ? { ...item, [field]: value } : item)) }
          : s
      )
    )
  }

  const handleSend = async () => {
    if (!header.trim()) { setError('Informe o cabeçalho.'); return }
    if (!buttonText.trim()) { setError('Informe o texto do botão.'); return }

    const choices: string[] = []
    for (const section of sections) {
      for (const item of section.items) {
        if (item.text.trim()) choices.push(item.text.trim())
      }
    }
    if (choices.length === 0) { setError('Adicione pelo menos um item.'); return }

    setSending(true)
    setError('')
    try {
      await sendMenu(instanceToken, {
        number: contactNumber,
        type: 'list',
        text: header.trim(),
        choices,
        listButton: buttonText.trim(),
        footerText: footer.trim() || undefined,
      })
      handleClose()
    } catch {
      setError('Erro ao enviar lista. Tente novamente.')
    } finally {
      setSending(false)
    }
  }

  const handleClose = () => {
    setHeader('')
    setButtonText('')
    setFooter('')
    setSections([newSection()])
    setError('')
    onClose()
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-[#111B21] shadow-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between border-b border-white/10 bg-[#202C33] px-6 py-4 rounded-t-2xl shrink-0">
          <h2 className="text-sm font-semibold text-[#E9EDEF]">Nova Lista</h2>
          <button onClick={handleClose} className="rounded-full p-1 text-[#8696A0] hover:bg-white/10 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex flex-col gap-4 overflow-y-auto px-6 py-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-xs text-[#8696A0]">Cabeçalho *</label>
              <input className={inputClass} placeholder="Título da mensagem" value={header} onChange={(e) => setHeader(e.target.value)} />
            </div>
            <div>
              <label className="mb-1.5 block text-xs text-[#8696A0]">Texto do Botão *</label>
              <input className={inputClass} placeholder="Ex: Ver opções" value={buttonText} onChange={(e) => setButtonText(e.target.value)} />
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-xs text-[#8696A0]">Rodapé (opcional)</label>
            <input className={inputClass} placeholder="Texto de rodapé" value={footer} onChange={(e) => setFooter(e.target.value)} />
          </div>

          {sections.map((section, si) => (
            <div key={si} className="rounded-xl border border-white/10 bg-[#0B141A] p-3">
              <div className="mb-3 flex items-center gap-2">
                <input
                  className={inputClass}
                  placeholder={`Título da seção ${si + 1}`}
                  value={section.title}
                  onChange={(e) => updateSection(si, 'title', e.target.value)}
                />
                {sections.length > 1 && (
                  <button onClick={() => removeSection(si)} className="rounded-full p-1.5 text-[#8696A0] hover:text-red-400">
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
              <div className="flex flex-col gap-2">
                {section.items.map((item, ii) => (
                  <div key={item.id} className="flex items-start gap-2">
                    <div className="flex flex-1 flex-col gap-1">
                      <input
                        className={inputClass}
                        placeholder="Texto do item *"
                        value={item.text}
                        onChange={(e) => updateItem(si, ii, 'text', e.target.value)}
                      />
                      <input
                        className={inputClass}
                        placeholder="Descrição (opcional)"
                        value={item.description}
                        onChange={(e) => updateItem(si, ii, 'description', e.target.value)}
                      />
                    </div>
                    {section.items.length > 1 && (
                      <button onClick={() => removeItem(si, ii)} className="mt-2 rounded-full p-1.5 text-[#8696A0] hover:text-red-400">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <button onClick={() => addItem(si)} className="mt-2 flex items-center gap-1.5 text-xs text-[#25D366] hover:underline">
                <Plus className="h-3.5 w-3.5" /> Adicionar item
              </button>
            </div>
          ))}

          <button onClick={addSection} className="flex items-center gap-1.5 text-xs text-[#25D366] hover:underline">
            <Plus className="h-3.5 w-3.5" /> Adicionar seção
          </button>

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
            {sending ? 'Enviando...' : 'Enviar Lista'}
          </button>
        </div>
      </div>
    </div>
  )
}
