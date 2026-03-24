'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import { sendPixButton, sendPaymentRequest } from '../../services/uazapi/messages'

type PixType = 'CPF' | 'CNPJ' | 'PHONE' | 'EMAIL' | 'EVP'

interface PaymentSenderProps {
  open: boolean
  onClose: () => void
  instanceToken: string
  contactNumber: string
}

const inputClass =
  'w-full rounded-xl border border-white/10 bg-[#0B141A] px-4 py-2.5 text-sm text-[#E9EDEF] placeholder:text-[#8696A0] focus:border-[#25D366] focus:outline-none'

const PIX_TYPES: PixType[] = ['CPF', 'CNPJ', 'PHONE', 'EMAIL', 'EVP']

export default function PaymentSender({ open, onClose, instanceToken, contactNumber }: PaymentSenderProps) {
  const [fullMode, setFullMode] = useState(false)
  const [amount, setAmount] = useState('')
  const [pixKey, setPixKey] = useState('')
  const [pixType, setPixType] = useState<PixType>('EVP')
  const [pixName, setPixName] = useState('')
  const [description, setDescription] = useState('')
  const [title, setTitle] = useState('')
  const [itemName, setItemName] = useState('')
  const [invoiceNumber, setInvoiceNumber] = useState('')
  const [boletoCode, setBoletoCode] = useState('')
  const [paymentLink, setPaymentLink] = useState('')
  const [fileUrl, setFileUrl] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')

  const handleSend = async () => {
    const parsedAmount = parseFloat(amount)
    if (!pixKey.trim()) { setError('Informe a chave PIX.'); return }
    if (fullMode && isNaN(parsedAmount)) { setError('Informe um valor válido.'); return }

    setSending(true)
    setError('')
    try {
      if (fullMode) {
        await sendPaymentRequest(instanceToken, {
          number: contactNumber,
          amount: parsedAmount,
          pixKey: pixKey.trim(),
          pixType,
          pixName: pixName.trim() || undefined,
          text: description.trim() || undefined,
          title: title.trim() || undefined,
          itemName: itemName.trim() || undefined,
          invoiceNumber: invoiceNumber.trim() || undefined,
          boletoCode: boletoCode.trim() || undefined,
          paymentLink: paymentLink.trim() || undefined,
          fileUrl: fileUrl.trim() || undefined,
        })
      } else {
        await sendPixButton(instanceToken, {
          number: contactNumber,
          pixType,
          pixKey: pixKey.trim(),
          pixName: pixName.trim() || undefined,
        })
      }
      handleClose()
    } catch {
      setError('Erro ao enviar pagamento. Tente novamente.')
    } finally {
      setSending(false)
    }
  }

  const handleClose = () => {
    setFullMode(false)
    setAmount('')
    setPixKey('')
    setPixType('EVP')
    setPixName('')
    setDescription('')
    setTitle('')
    setItemName('')
    setInvoiceNumber('')
    setBoletoCode('')
    setPaymentLink('')
    setFileUrl('')
    setError('')
    onClose()
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-[#111B21] shadow-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between border-b border-white/10 bg-[#202C33] px-6 py-4 rounded-t-2xl shrink-0">
          <h2 className="text-sm font-semibold text-[#E9EDEF]">Enviar Pagamento PIX</h2>
          <button onClick={handleClose} className="rounded-full p-1 text-[#8696A0] hover:bg-white/10 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex flex-col gap-4 overflow-y-auto px-6 py-4">
          <div className="flex items-center justify-between rounded-xl border border-white/10 bg-[#0B141A] px-4 py-3">
            <div>
              <p className="text-sm text-[#E9EDEF]">Solicitação completa</p>
              <p className="text-xs text-[#8696A0]">Inclui título, item, boleto e link de pagamento</p>
            </div>
            <button
              type="button"
              onClick={() => setFullMode((v) => !v)}
              className={`relative h-6 w-11 rounded-full transition-colors ${fullMode ? 'bg-[#25D366]' : 'bg-white/10'}`}
            >
              <span
                className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${fullMode ? 'translate-x-5' : 'translate-x-0.5'}`}
              />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-xs text-[#8696A0]">Tipo de chave PIX *</label>
              <select className={inputClass} value={pixType} onChange={(e) => setPixType(e.target.value as PixType)}>
                {PIX_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs text-[#8696A0]">Chave PIX *</label>
              <input className={inputClass} placeholder="Chave PIX" value={pixKey} onChange={(e) => setPixKey(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-xs text-[#8696A0]">Nome do recebedor (opcional)</label>
              <input className={inputClass} placeholder="Nome" value={pixName} onChange={(e) => setPixName(e.target.value)} />
            </div>
            {fullMode && (
              <div>
                <label className="mb-1.5 block text-xs text-[#8696A0]">Valor (R$) *</label>
                <input className={inputClass} type="number" min="0" step="0.01" placeholder="0,00" value={amount} onChange={(e) => setAmount(e.target.value)} />
              </div>
            )}
          </div>

          {fullMode && (
            <>
              <div>
                <label className="mb-1.5 block text-xs text-[#8696A0]">Descrição (opcional)</label>
                <textarea
                  className={`${inputClass} resize-none`}
                  rows={2}
                  placeholder="Texto descritivo do pagamento"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-xs text-[#8696A0]">Título (opcional)</label>
                  <input className={inputClass} placeholder="Título do pedido" value={title} onChange={(e) => setTitle(e.target.value)} />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs text-[#8696A0]">Nome do item (opcional)</label>
                  <input className={inputClass} placeholder="Nome do produto/serviço" value={itemName} onChange={(e) => setItemName(e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-xs text-[#8696A0]">Número da fatura (opcional)</label>
                  <input className={inputClass} placeholder="INV-001" value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs text-[#8696A0]">Código do boleto (opcional)</label>
                  <input className={inputClass} placeholder="Linha digitável" value={boletoCode} onChange={(e) => setBoletoCode(e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-xs text-[#8696A0]">Link de pagamento (opcional)</label>
                  <input className={inputClass} placeholder="https://..." value={paymentLink} onChange={(e) => setPaymentLink(e.target.value)} />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs text-[#8696A0]">URL do arquivo (opcional)</label>
                  <input className={inputClass} placeholder="https://..." value={fileUrl} onChange={(e) => setFileUrl(e.target.value)} />
                </div>
              </div>
            </>
          )}

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
            {sending ? 'Enviando...' : 'Enviar Pagamento'}
          </button>
        </div>
      </div>
    </div>
  )
}
