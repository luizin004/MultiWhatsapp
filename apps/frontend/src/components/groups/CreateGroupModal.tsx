'use client'

import { useState } from 'react'
import { X, Users } from 'lucide-react'
import { GroupInfo } from '@/types/database'
import { createGroup } from '@/services/uazapi/groups'

// ─── Types ────────────────────────────────────────────────────────────────────

interface CreateGroupModalProps {
  open: boolean
  instanceToken: string
  onClose: () => void
  onCreated: (group: GroupInfo) => void
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parsePhones(raw: string): string[] {
  return raw
    .split(/[\n,]/)
    .map((s) => s.trim().replace(/\D/g, ''))
    .filter((s) => s.length >= 8)
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function CreateGroupModal({
  open,
  instanceToken,
  onClose,
  onCreated,
}: CreateGroupModalProps) {
  const [name, setName] = useState('')
  const [participantsRaw, setParticipantsRaw] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!open) return null

  function handleClose() {
    if (loading) return
    setName('')
    setParticipantsRaw('')
    setError(null)
    onClose()
  }

  async function handleCreate() {
    const trimmedName = name.trim()
    if (!trimmedName) {
      setError('O nome do grupo é obrigatório.')
      return
    }

    const participants = parsePhones(participantsRaw)

    setLoading(true)
    setError(null)
    try {
      const result = await createGroup(instanceToken, { name: trimmedName, participants })
      setName('')
      setParticipantsRaw('')
      onCreated(result as GroupInfo)
    } catch (err) {
      console.error('[CreateGroupModal] createGroup failed:', err)
      setError('Não foi possível criar o grupo. Verifique os dados e tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  const phoneCount = parsePhones(participantsRaw).length

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="relative w-full max-w-md rounded-2xl border border-white/10 bg-[#111B21] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 bg-[#202C33] px-6 py-4 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <Users className="h-5 w-5 text-[#25D366]" />
            <h2 className="text-base font-semibold text-[#E9EDEF]">Criar grupo</h2>
          </div>
          <button
            onClick={handleClose}
            disabled={loading}
            className="rounded-full p-1 text-[#8696A0] transition-colors hover:bg-white/10 hover:text-[#E9EDEF] disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex flex-col gap-4 p-6">
          {error && (
            <div className="rounded-xl bg-red-900/30 px-4 py-3 text-sm text-red-300">{error}</div>
          )}

          {/* Group name */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-[#8696A0]">
              Nome do grupo <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              placeholder="Ex: Time de Vendas"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={loading}
              maxLength={100}
              className="rounded-xl border border-white/10 bg-[#0B141A] px-4 py-2.5 text-sm text-[#E9EDEF] placeholder-[#8696A0] outline-none transition-colors focus:border-[#25D366] disabled:opacity-50"
            />
          </div>

          {/* Participants */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-[#8696A0]">
              Participantes{' '}
              <span className="text-[#8696A0]/60">(um por linha ou separado por vírgula)</span>
            </label>
            <textarea
              rows={5}
              placeholder={"5511999998888\n5521988887777\n5531977776666"}
              value={participantsRaw}
              onChange={(e) => setParticipantsRaw(e.target.value)}
              disabled={loading}
              className="resize-none rounded-xl border border-white/10 bg-[#0B141A] px-4 py-2.5 text-sm text-[#E9EDEF] placeholder-[#8696A0] outline-none transition-colors focus:border-[#25D366] disabled:opacity-50"
            />
            {phoneCount > 0 && (
              <p className="text-xs text-[#8696A0]">
                {phoneCount} número{phoneCount !== 1 ? 's' : ''} detectado{phoneCount !== 1 ? 's' : ''}
              </p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 border-t border-white/10 px-6 py-4">
          <button
            onClick={handleClose}
            disabled={loading}
            className="rounded-xl border border-white/10 px-5 py-2.5 text-sm text-[#8696A0] transition-colors hover:bg-white/5 hover:text-[#E9EDEF] disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleCreate}
            disabled={loading || !name.trim()}
            className="rounded-xl bg-[#25D366] px-5 py-2.5 text-sm font-semibold text-[#111B21] transition-colors hover:bg-[#20C05A] disabled:opacity-50"
          >
            {loading ? 'Criando...' : 'Criar grupo'}
          </button>
        </div>
      </div>
    </div>
  )
}
