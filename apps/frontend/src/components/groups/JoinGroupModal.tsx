'use client'

import { useState } from 'react'
import { X, Link, Users, LogOut } from 'lucide-react'
import { joinGroup, getInviteInfo } from '@/services/uazapi/groups'

// ─── Types ────────────────────────────────────────────────────────────────────

interface JoinGroupModalProps {
  open: boolean
  instanceToken: string
  onClose: () => void
  onJoined: () => void
}

interface InvitePreview {
  name: string
  participant_count: number
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function extractInviteCode(input: string): string {
  const trimmed = input.trim()
  // Handle full invite URLs like https://chat.whatsapp.com/XXXX
  const urlMatch = trimmed.match(/chat\.whatsapp\.com\/([A-Za-z0-9]+)/)
  if (urlMatch) return urlMatch[1]
  return trimmed
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function JoinGroupModal({
  open,
  instanceToken,
  onClose,
  onJoined,
}: JoinGroupModalProps) {
  const [inviteInput, setInviteInput] = useState('')
  const [preview, setPreview] = useState<InvitePreview | null>(null)
  const [previewing, setPreviewing] = useState(false)
  const [joining, setJoining] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!open) return null

  function handleClose() {
    if (joining) return
    setInviteInput('')
    setPreview(null)
    setError(null)
    onClose()
  }

  async function handlePreview() {
    const code = extractInviteCode(inviteInput)
    if (!code) {
      setError('Insira um link ou código de convite válido.')
      return
    }

    setPreviewing(true)
    setError(null)
    setPreview(null)
    try {
      const result = await getInviteInfo(instanceToken, { invitecode: code })
      setPreview(result as InvitePreview)
    } catch (err) {
      console.error('[JoinGroupModal] getInviteInfo failed:', err)
      setError('Não foi possível obter informações do grupo. Verifique o link.')
    } finally {
      setPreviewing(false)
    }
  }

  async function handleJoin() {
    const code = extractInviteCode(inviteInput)
    if (!code) return

    setJoining(true)
    setError(null)
    try {
      await joinGroup(instanceToken, { invitecode: code })
      onJoined()
      handleClose()
    } catch (err) {
      console.error('[JoinGroupModal] joinGroup failed:', err)
      setError('Não foi possível entrar no grupo. O link pode estar expirado.')
    } finally {
      setJoining(false)
    }
  }

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="relative w-full max-w-sm rounded-2xl border border-white/10 bg-[#111B21] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 bg-[#202C33] px-6 py-4 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <Link className="h-5 w-5 text-[#25D366]" />
            <h2 className="text-base font-semibold text-[#E9EDEF]">Entrar em grupo</h2>
          </div>
          <button
            onClick={handleClose}
            disabled={joining}
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

          {/* Invite input + preview button */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-[#8696A0]">Link ou código de convite</label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="https://chat.whatsapp.com/..."
                value={inviteInput}
                onChange={(e) => { setInviteInput(e.target.value); setPreview(null) }}
                disabled={joining}
                className="flex-1 rounded-xl border border-white/10 bg-[#0B141A] px-4 py-2.5 text-sm text-[#E9EDEF] placeholder-[#8696A0] outline-none transition-colors focus:border-[#25D366] disabled:opacity-50"
              />
              <button
                onClick={handlePreview}
                disabled={!inviteInput.trim() || previewing || joining}
                className="flex-shrink-0 rounded-xl border border-white/10 px-3 py-2.5 text-sm text-[#8696A0] transition-colors hover:bg-white/5 hover:text-[#E9EDEF] disabled:opacity-50"
              >
                {previewing ? '...' : 'Ver'}
              </button>
            </div>
          </div>

          {/* Preview card */}
          {preview && (
            <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-[#0B141A] px-4 py-3">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-[#202C33] text-[#25D366]">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-medium text-[#E9EDEF]">{preview.name}</p>
                <p className="text-xs text-[#8696A0]">
                  {preview.participant_count} participante{preview.participant_count !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 border-t border-white/10 px-6 py-4">
          <button
            onClick={handleClose}
            disabled={joining}
            className="rounded-xl border border-white/10 px-5 py-2.5 text-sm text-[#8696A0] transition-colors hover:bg-white/5 hover:text-[#E9EDEF] disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleJoin}
            disabled={!inviteInput.trim() || joining}
            className="flex items-center gap-2 rounded-xl bg-[#25D366] px-5 py-2.5 text-sm font-semibold text-[#111B21] transition-colors hover:bg-[#20C05A] disabled:opacity-50"
          >
            <LogOut className="h-4 w-4 rotate-180" />
            {joining ? 'Entrando...' : 'Entrar'}
          </button>
        </div>
      </div>
    </div>
  )
}
