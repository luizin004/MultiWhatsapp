'use client'

import { useState } from 'react'
import { UserPlus, UserMinus, Shield, Crown, X } from 'lucide-react'
import { GroupParticipant } from '@/types/database'
import { updateParticipants } from '@/services/uazapi/groups'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ParticipantManagerProps {
  groupJid: string
  instanceToken: string
  participants: GroupParticipant[]
  isAdmin: boolean
  onUpdate: () => void
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function displayName(p: GroupParticipant): string {
  return p.name ?? p.phone ?? p.jid
}

function RoleBadge({ participant }: { participant: GroupParticipant }) {
  if (participant.is_super_admin) {
    return (
      <span className="flex items-center gap-1 rounded-full bg-[#25D366]/20 px-2 py-0.5 text-xs font-medium text-[#25D366]">
        <Crown className="h-3 w-3" />
        Dono
      </span>
    )
  }
  if (participant.is_admin) {
    return (
      <span className="flex items-center gap-1 rounded-full bg-[#00B0FF]/20 px-2 py-0.5 text-xs font-medium text-[#00B0FF]">
        <Shield className="h-3 w-3" />
        Admin
      </span>
    )
  }
  return (
    <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs text-[#8696A0]">
      Membro
    </span>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ParticipantManager({
  groupJid,
  instanceToken,
  participants,
  isAdmin,
  onUpdate,
}: ParticipantManagerProps) {
  const [addInput, setAddInput] = useState('')
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function runAction(
    action: 'add' | 'remove' | 'promote' | 'demote',
    phones: string[],
    key: string
  ) {
    setActionLoading(key)
    setError(null)
    try {
      await updateParticipants(instanceToken, { groupjid: groupJid, action, participants: phones })
      onUpdate()
    } catch (err) {
      console.error('[ParticipantManager] updateParticipants failed:', err)
      setError('Ação falhou. Tente novamente.')
    } finally {
      setActionLoading(null)
    }
  }

  function handleAdd() {
    const phones = addInput
      .split(/[\n,]/)
      .map((s) => s.trim())
      .filter(Boolean)
    if (phones.length === 0) return
    setAddInput('')
    runAction('add', phones, 'add')
  }

  return (
    <div className="flex flex-col gap-3">
      {error && (
        <div className="rounded-lg bg-red-900/30 px-3 py-2 text-xs text-red-300">{error}</div>
      )}

      {/* Add participant input */}
      {isAdmin && (
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Número (ex: 5511999998888)"
            value={addInput}
            onChange={(e) => setAddInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            className="flex-1 rounded-xl border border-white/10 bg-[#0B141A] px-3 py-2 text-sm text-[#E9EDEF] placeholder-[#8696A0] outline-none focus:border-[#25D366]"
          />
          <button
            onClick={handleAdd}
            disabled={!addInput.trim() || actionLoading === 'add'}
            className="flex items-center gap-1.5 rounded-xl bg-[#25D366] px-3 py-2 text-xs font-semibold text-[#111B21] transition-colors hover:bg-[#20C05A] disabled:opacity-50"
          >
            <UserPlus className="h-4 w-4" />
            Adicionar
          </button>
        </div>
      )}

      {/* Participant list */}
      <div className="max-h-64 overflow-y-auto rounded-xl border border-white/10">
        {participants.map((p) => (
          <div
            key={p.jid}
            className="flex items-center gap-3 border-b border-white/5 px-3 py-2.5 last:border-b-0"
          >
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[#202C33] text-xs font-bold text-[#25D366]">
              {displayName(p).slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm text-[#E9EDEF]">{displayName(p)}</p>
              {p.name && <p className="text-xs text-[#8696A0]">{p.phone}</p>}
            </div>
            <RoleBadge participant={p} />

            {/* Admin actions */}
            {isAdmin && !p.is_super_admin && (
              <div className="flex gap-1">
                {p.is_admin ? (
                  <button
                    title="Rebaixar admin"
                    disabled={actionLoading === p.jid + 'demote'}
                    onClick={() => runAction('demote', [p.phone ?? p.jid], p.jid + 'demote')}
                    className="rounded-lg p-1.5 text-[#8696A0] transition-colors hover:bg-white/10 hover:text-[#E9EDEF] disabled:opacity-40"
                  >
                    <Shield className="h-3.5 w-3.5" />
                  </button>
                ) : (
                  <button
                    title="Promover a admin"
                    disabled={actionLoading === p.jid + 'promote'}
                    onClick={() => runAction('promote', [p.phone ?? p.jid], p.jid + 'promote')}
                    className="rounded-lg p-1.5 text-[#8696A0] transition-colors hover:bg-white/10 hover:text-[#25D366] disabled:opacity-40"
                  >
                    <Shield className="h-3.5 w-3.5" />
                  </button>
                )}
                <button
                  title="Remover do grupo"
                  disabled={actionLoading === p.jid + 'remove'}
                  onClick={() => runAction('remove', [p.phone ?? p.jid], p.jid + 'remove')}
                  className="rounded-lg p-1.5 text-[#8696A0] transition-colors hover:bg-white/10 hover:text-red-400 disabled:opacity-40"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>
        ))}

        {participants.length === 0 && (
          <p className="px-4 py-6 text-center text-xs text-[#8696A0]">Sem participantes</p>
        )}
      </div>
    </div>
  )
}
