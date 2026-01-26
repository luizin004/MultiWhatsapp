'use client'

import { useState } from 'react'
import { MessageSquarePlus } from 'lucide-react'

interface TestMessagePanelProps {
  disabled: boolean
  contactName?: string
  onSimulate: (content: string) => Promise<void>
}

export default function TestMessagePanel({ disabled, contactName, onSimulate }: TestMessagePanelProps) {
  const [message, setMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const handleSimulate = async () => {
    if (!message.trim() || isSubmitting || disabled) return

    setIsSubmitting(true)

    try {
      await onSimulate(message.trim())
      setMessage('')
      setFeedback({ type: 'success', message: 'Mensagem de teste criada como se tivesse vindo de fora.' })
    } catch (error) {
      const text = error instanceof Error ? error.message : 'Falha ao simular mensagem.'
      setFeedback({ type: 'error', message: text })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="border-t border-slate-200/70 bg-slate-50/70 p-4 space-y-3">
      <div className="flex items-center space-x-2 text-sm text-slate-600">
        <MessageSquarePlus className="w-4 h-4" />
        <p>
          Teste mensagens recebidas simulando um envio externo
          {contactName ? ` para ${contactName}` : ''}.
        </p>
      </div>

      <div className="space-y-2">
        <textarea
          className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm resize-none bg-white/80 focus:outline-none focus:ring-2 focus:ring-emerald-300"
          rows={2}
          placeholder="Escreva o corpo da mensagem simulada"
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          disabled={disabled || isSubmitting}
        />

        <button
          type="button"
          onClick={handleSimulate}
          disabled={!message.trim() || disabled || isSubmitting}
          className={`w-full rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
            !message.trim() || disabled
              ? 'bg-slate-200 text-slate-500 cursor-not-allowed'
              : 'bg-slate-900 text-white hover:bg-slate-800'
          }`}
        >
          {isSubmitting ? 'Criando mensagem teste...' : 'Simular mensagem externa'}
        </button>
      </div>

      {feedback && (
        <p
          className={`text-xs ${
            feedback.type === 'success' ? 'text-emerald-600' : 'text-rose-600'
          }`}
        >
          {feedback.message}
        </p>
      )}
    </div>
  )
}
