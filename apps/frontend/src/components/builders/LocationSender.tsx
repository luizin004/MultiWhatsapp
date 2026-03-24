'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import { sendLocation, sendLocationButton } from '../../services/uazapi/messages'

interface LocationSenderProps {
  open: boolean
  onClose: () => void
  instanceToken: string
  contactNumber: string
}

const inputClass =
  'w-full rounded-xl border border-white/10 bg-[#0B141A] px-4 py-2.5 text-sm text-[#E9EDEF] placeholder:text-[#8696A0] focus:border-[#25D366] focus:outline-none'

export default function LocationSender({ open, onClose, instanceToken, contactNumber }: LocationSenderProps) {
  const [requestMode, setRequestMode] = useState(false)
  const [name, setName] = useState('')
  const [address, setAddress] = useState('')
  const [latitude, setLatitude] = useState('')
  const [longitude, setLongitude] = useState('')
  const [requestText, setRequestText] = useState('Por favor, compartilhe sua localização.')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')

  const handleSend = async () => {
    setSending(true)
    setError('')
    try {
      if (requestMode) {
        if (!requestText.trim()) { setError('Informe o texto da solicitação.'); setSending(false); return }
        await sendLocationButton(instanceToken, {
          number: contactNumber,
          text: requestText.trim(),
        })
      } else {
        const lat = parseFloat(latitude)
        const lon = parseFloat(longitude)
        if (isNaN(lat) || isNaN(lon)) { setError('Latitude e longitude devem ser números válidos.'); setSending(false); return }
        await sendLocation(instanceToken, {
          number: contactNumber,
          latitude: lat,
          longitude: lon,
          name: name.trim() || undefined,
          address: address.trim() || undefined,
        })
      }
      handleClose()
    } catch {
      setError('Erro ao enviar localização. Tente novamente.')
    } finally {
      setSending(false)
    }
  }

  const handleClose = () => {
    setRequestMode(false)
    setName('')
    setAddress('')
    setLatitude('')
    setLongitude('')
    setRequestText('Por favor, compartilhe sua localização.')
    setError('')
    onClose()
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-[#111B21] shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 bg-[#202C33] px-6 py-4 rounded-t-2xl">
          <h2 className="text-sm font-semibold text-[#E9EDEF]">Enviar Localização</h2>
          <button onClick={handleClose} className="rounded-full p-1 text-[#8696A0] hover:bg-white/10 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex flex-col gap-4 px-6 py-4">
          <div className="flex items-center justify-between rounded-xl border border-white/10 bg-[#0B141A] px-4 py-3">
            <div>
              <p className="text-sm text-[#E9EDEF]">Solicitar localização</p>
              <p className="text-xs text-[#8696A0]">Pede ao contato que compartilhe a localização dele</p>
            </div>
            <button
              type="button"
              onClick={() => setRequestMode((v) => !v)}
              className={`relative h-6 w-11 rounded-full transition-colors ${requestMode ? 'bg-[#25D366]' : 'bg-white/10'}`}
            >
              <span
                className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${requestMode ? 'translate-x-5' : 'translate-x-0.5'}`}
              />
            </button>
          </div>

          {requestMode ? (
            <div>
              <label className="mb-1.5 block text-xs text-[#8696A0]">Texto da solicitação *</label>
              <textarea
                className={`${inputClass} resize-none`}
                rows={3}
                value={requestText}
                onChange={(e) => setRequestText(e.target.value)}
              />
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-xs text-[#8696A0]">Latitude *</label>
                  <input className={inputClass} type="number" step="any" placeholder="-23.5505" value={latitude} onChange={(e) => setLatitude(e.target.value)} />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs text-[#8696A0]">Longitude *</label>
                  <input className={inputClass} type="number" step="any" placeholder="-46.6333" value={longitude} onChange={(e) => setLongitude(e.target.value)} />
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-xs text-[#8696A0]">Nome do local (opcional)</label>
                <input className={inputClass} placeholder="Ex: Escritório central" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div>
                <label className="mb-1.5 block text-xs text-[#8696A0]">Endereço (opcional)</label>
                <input className={inputClass} placeholder="Rua, número, bairro, cidade" value={address} onChange={(e) => setAddress(e.target.value)} />
              </div>
            </>
          )}

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
            {sending ? 'Enviando...' : requestMode ? 'Solicitar Localização' : 'Enviar Localização'}
          </button>
        </div>
      </div>
    </div>
  )
}
