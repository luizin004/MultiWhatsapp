'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import { sendContact } from '../../services/uazapi/messages'

interface ContactCardSenderProps {
  open: boolean
  onClose: () => void
  instanceToken: string
  contactNumber: string
}

const inputClass =
  'w-full rounded-xl border border-white/10 bg-[#0B141A] px-4 py-2.5 text-sm text-[#E9EDEF] placeholder:text-[#8696A0] focus:border-[#25D366] focus:outline-none'

export default function ContactCardSender({ open, onClose, instanceToken, contactNumber }: ContactCardSenderProps) {
  const [fullName, setFullName] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [organization, setOrganization] = useState('')
  const [email, setEmail] = useState('')
  const [url, setUrl] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')

  const handleSend = async () => {
    if (!fullName.trim()) { setError('Informe o nome completo.'); return }
    if (!phoneNumber.trim()) { setError('Informe ao menos um número de telefone.'); return }

    setSending(true)
    setError('')
    try {
      await sendContact(instanceToken, {
        number: contactNumber,
        fullName: fullName.trim(),
        phoneNumber: phoneNumber.trim(),
        organization: organization.trim() || undefined,
        email: email.trim() || undefined,
        url: url.trim() || undefined,
      })
      handleClose()
    } catch {
      setError('Erro ao enviar contato. Tente novamente.')
    } finally {
      setSending(false)
    }
  }

  const handleClose = () => {
    setFullName('')
    setPhoneNumber('')
    setOrganization('')
    setEmail('')
    setUrl('')
    setError('')
    onClose()
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-[#111B21] shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 bg-[#202C33] px-6 py-4 rounded-t-2xl">
          <h2 className="text-sm font-semibold text-[#E9EDEF]">Enviar Contato</h2>
          <button onClick={handleClose} className="rounded-full p-1 text-[#8696A0] hover:bg-white/10 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex flex-col gap-4 px-6 py-4">
          <div>
            <label className="mb-1.5 block text-xs text-[#8696A0]">Nome completo *</label>
            <input className={inputClass} placeholder="João da Silva" value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </div>
          <div>
            <label className="mb-1.5 block text-xs text-[#8696A0]">Telefone(s) * <span className="text-[#8696A0] font-normal">(separados por vírgula)</span></label>
            <input
              className={inputClass}
              placeholder="+5511999999999, +5511888888888"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-xs text-[#8696A0]">Empresa (opcional)</label>
              <input className={inputClass} placeholder="Nome da empresa" value={organization} onChange={(e) => setOrganization(e.target.value)} />
            </div>
            <div>
              <label className="mb-1.5 block text-xs text-[#8696A0]">E-mail (opcional)</label>
              <input className={inputClass} type="email" placeholder="email@exemplo.com" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-xs text-[#8696A0]">URL (opcional)</label>
            <input className={inputClass} type="url" placeholder="https://..." value={url} onChange={(e) => setUrl(e.target.value)} />
          </div>

          {error && <p className="text-xs text-red-400">{error}</p>}
        </div>

        <div className="flex gap-3 border-t border-white/10 px-6 py-4">
          <button onClick={handleClose} className="flex-1 rounded-full border border-white/10 py-2 text-sm text-[#E9EDEF] hover:bg-white/5">
            Cancelar
          </button>
          <button
            onClick={handleSend}
            disabled={sending}
            className="flex-1 rounded-full bg-[#25D366] py-2 text-sm font-semibold text-[#111B21] hover:bg-[#1ed061] disabled:opacity-60"
          >
            {sending ? 'Enviando...' : 'Enviar Contato'}
          </button>
        </div>
      </div>
    </div>
  )
}
