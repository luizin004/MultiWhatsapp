'use client'

import { useEffect, useState } from 'react'
import { X, Users, Link, Copy, LogOut, Shield, Volume2, Lock, RefreshCw } from 'lucide-react'
import { GroupInfo } from '@/types/database'
import {
  getGroupInfo,
  leaveGroup,
  updateGroupName,
  updateGroupDescription,
  updateGroupAnnounce,
  updateGroupLocked,
  resetInviteCode,
} from '@/services/uazapi/groups'
import ParticipantManager from './ParticipantManager'

// ─── Types ────────────────────────────────────────────────────────────────────

interface GroupDetailsProps {
  open: boolean
  groupJid: string
  instanceToken: string
  onClose: () => void
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function SkeletonBlock() {
  return (
    <div className="flex flex-col items-center gap-4 p-6">
      <div className="h-24 w-24 animate-pulse rounded-full bg-white/10" />
      <div className="h-3 w-40 animate-pulse rounded bg-white/10" />
      <div className="h-2.5 w-28 animate-pulse rounded bg-white/10" />
    </div>
  )
}

function ToggleRow({
  icon,
  label,
  value,
  onToggle,
  loading,
}: {
  icon: React.ReactNode
  label: string
  value: boolean
  onToggle: () => void
  loading: boolean
}) {
  return (
    <div className="flex items-center justify-between py-3">
      <div className="flex items-center gap-3 text-sm text-[#E9EDEF]">
        <span className="text-[#8696A0]">{icon}</span>
        {label}
      </div>
      <button
        onClick={onToggle}
        disabled={loading}
        className={`relative h-6 w-11 rounded-full transition-colors disabled:opacity-50 ${
          value ? 'bg-[#25D366]' : 'bg-[#8696A0]/40'
        }`}
      >
        <span
          className={`absolute top-1 h-4 w-4 rounded-full bg-white transition-transform ${
            value ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function GroupDetails({
  open,
  groupJid,
  instanceToken,
  onClose,
}: GroupDetailsProps) {
  const [group, setGroup] = useState<GroupInfo | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [leaveConfirm, setLeaveConfirm] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [editField, setEditField] = useState<'name' | 'description' | null>(null)
  const [editValue, setEditValue] = useState('')
  const [copied, setCopied] = useState(false)

  async function fetchGroup() {
    setLoading(true)
    setError(null)
    try {
      const result = await getGroupInfo(instanceToken, { groupjid: groupJid, getInviteLink: true })
      setGroup(result as GroupInfo)
    } catch (err) {
      setError('Não foi possível carregar informações do grupo.')
      console.error('[GroupDetails] getGroupInfo failed:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!open || !groupJid) return
    setLeaveConfirm(false)
    setEditField(null)
    fetchGroup()
  }, [open, groupJid]) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleToggle(field: 'announce' | 'locked', current: boolean) {
    if (!group) return
    setActionLoading(field)
    try {
      if (field === 'announce') {
        await updateGroupAnnounce(instanceToken, { groupjid: groupJid, announce: !current })
      } else {
        await updateGroupLocked(instanceToken, { groupjid: groupJid, locked: !current })
      }
      await fetchGroup()
    } catch (err) {
      console.error('[GroupDetails] toggle failed:', err)
    } finally {
      setActionLoading(null)
    }
  }

  async function handleSaveEdit() {
    if (!editField || !editValue.trim()) return
    setActionLoading('edit')
    try {
      if (editField === 'name') {
        await updateGroupName(instanceToken, { groupjid: groupJid, name: editValue.trim() })
      } else {
        await updateGroupDescription(instanceToken, { groupjid: groupJid, description: editValue.trim() })
      }
      setEditField(null)
      await fetchGroup()
    } catch (err) {
      console.error('[GroupDetails] save edit failed:', err)
    } finally {
      setActionLoading(null)
    }
  }

  async function handleResetLink() {
    setActionLoading('reset')
    try {
      await resetInviteCode(instanceToken, { groupjid: groupJid })
      await fetchGroup()
    } catch (err) {
      console.error('[GroupDetails] resetInviteCode failed:', err)
    } finally {
      setActionLoading(null)
    }
  }

  async function handleLeave() {
    setActionLoading('leave')
    try {
      await leaveGroup(instanceToken, { groupjid: groupJid })
      onClose()
    } catch (err) {
      console.error('[GroupDetails] leaveGroup failed:', err)
    } finally {
      setActionLoading(null)
    }
  }

  function copyInviteLink() {
    if (!group?.invite_link) return
    navigator.clipboard.writeText(group.invite_link)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <>
      <div
        aria-hidden="true"
        className={`absolute inset-0 z-20 bg-black/30 transition-opacity duration-300 ${
          open ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={onClose}
      />

      <aside
        aria-label="Info do grupo"
        className={`absolute right-0 top-0 z-30 flex h-full w-[400px] flex-col overflow-y-auto bg-[#111B21] shadow-2xl transition-transform duration-300 ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex flex-shrink-0 items-center gap-4 bg-[#202C33] px-6 py-5">
          <button
            onClick={onClose}
            className="rounded-full p-1 text-[#8696A0] transition-colors hover:bg-white/10 hover:text-[#E9EDEF]"
          >
            <X className="h-5 w-5" />
          </button>
          <h2 className="text-base font-medium text-[#E9EDEF]">Info do grupo</h2>
        </div>

        {loading && <SkeletonBlock />}

        {error && (
          <div className="m-4 rounded-lg bg-red-900/30 px-4 py-3 text-sm text-red-300">{error}</div>
        )}

        {!loading && group && (
          <>
            {/* Profile section */}
            <div className="flex flex-col items-center gap-3 border-b border-white/5 py-8 px-6">
              <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full bg-[#202C33] text-2xl font-bold text-[#25D366]">
                {group.image_url ? (
                  <img src={group.image_url} alt={group.name} className="h-full w-full object-cover" />
                ) : (
                  <Users className="h-12 w-12" />
                )}
              </div>

              {/* Editable name */}
              {editField === 'name' ? (
                <div className="flex w-full gap-2">
                  <input
                    autoFocus
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    className="flex-1 rounded-xl border border-[#25D366] bg-[#0B141A] px-3 py-2 text-sm text-[#E9EDEF] outline-none"
                  />
                  <button
                    onClick={handleSaveEdit}
                    disabled={actionLoading === 'edit'}
                    className="rounded-xl bg-[#25D366] px-3 py-2 text-xs font-semibold text-[#111B21] disabled:opacity-50"
                  >
                    Salvar
                  </button>
                  <button
                    onClick={() => setEditField(null)}
                    className="rounded-xl border border-white/10 px-3 py-2 text-xs text-[#8696A0]"
                  >
                    Cancelar
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => { setEditField('name'); setEditValue(group.name) }}
                  className="text-center text-lg font-semibold text-[#E9EDEF] hover:underline"
                  title={group.is_admin ? 'Clique para editar' : undefined}
                  disabled={!group.is_admin}
                >
                  {group.name}
                </button>
              )}

              <div className="flex items-center gap-1.5 text-sm text-[#8696A0]">
                <Users className="h-4 w-4" />
                {group.participant_count} participante{group.participant_count !== 1 ? 's' : ''}
              </div>

              {/* Editable description */}
              {editField === 'description' ? (
                <div className="flex w-full flex-col gap-2">
                  <textarea
                    autoFocus
                    rows={3}
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    className="w-full resize-none rounded-xl border border-[#25D366] bg-[#0B141A] px-3 py-2 text-sm text-[#E9EDEF] outline-none"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleSaveEdit}
                      disabled={actionLoading === 'edit'}
                      className="rounded-xl bg-[#25D366] px-3 py-2 text-xs font-semibold text-[#111B21] disabled:opacity-50"
                    >
                      Salvar
                    </button>
                    <button
                      onClick={() => setEditField(null)}
                      className="rounded-xl border border-white/10 px-3 py-2 text-xs text-[#8696A0]"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => { setEditField('description'); setEditValue(group.description ?? '') }}
                  className="text-center text-sm text-[#8696A0] hover:text-[#E9EDEF]"
                  disabled={!group.is_admin}
                >
                  {group.description ?? (group.is_admin ? '+ Adicionar descrição' : '')}
                </button>
              )}
            </div>

            {/* Participants section */}
            <div className="border-b border-white/5 px-6 py-4">
              <p className="mb-3 text-xs font-medium uppercase tracking-wider text-[#8696A0]">
                Participantes
              </p>
              <ParticipantManager
                groupJid={groupJid}
                instanceToken={instanceToken}
                participants={group.participants ?? []}
                isAdmin={group.is_admin}
                onUpdate={fetchGroup}
              />
            </div>

            {/* Admin actions */}
            {group.is_admin && (
              <div className="border-b border-white/5 px-6 py-4">
                <p className="mb-2 text-xs font-medium uppercase tracking-wider text-[#8696A0]">
                  Configurações
                </p>
                <ToggleRow
                  icon={<Volume2 className="h-4 w-4" />}
                  label="Somente admins enviam"
                  value={group.is_announce}
                  onToggle={() => handleToggle('announce', group.is_announce)}
                  loading={actionLoading === 'announce'}
                />
                <ToggleRow
                  icon={<Lock className="h-4 w-4" />}
                  label="Somente admins editam info"
                  value={group.is_locked}
                  onToggle={() => handleToggle('locked', group.is_locked)}
                  loading={actionLoading === 'locked'}
                />
                <button
                  onClick={handleResetLink}
                  disabled={actionLoading === 'reset'}
                  className="mt-2 flex items-center gap-2 text-sm text-[#8696A0] transition-colors hover:text-[#E9EDEF] disabled:opacity-50"
                >
                  <RefreshCw className="h-4 w-4" />
                  Resetar link de convite
                </button>
              </div>
            )}

            {/* Invite link */}
            {group.invite_link && (
              <div className="border-b border-white/5 px-6 py-4">
                <p className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-[#8696A0]">
                  <Link className="h-3.5 w-3.5" />
                  Link de convite
                </p>
                <div className="flex items-center gap-2 rounded-xl bg-[#0B141A] px-3 py-2">
                  <p className="flex-1 truncate text-xs text-[#8696A0]">{group.invite_link}</p>
                  <button
                    onClick={copyInviteLink}
                    className="flex-shrink-0 rounded-lg p-1.5 text-[#8696A0] transition-colors hover:bg-white/10 hover:text-[#25D366]"
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                </div>
                {copied && <p className="mt-1 text-xs text-[#25D366]">Link copiado!</p>}
              </div>
            )}

            {/* Leave group */}
            <div className="mt-auto border-t border-white/5 px-6 py-4">
              <button
                onClick={() => !leaveConfirm && setLeaveConfirm(true)}
                className="flex w-full items-center gap-3 rounded-xl py-3 text-sm text-red-400 transition-colors hover:bg-white/5"
              >
                <LogOut className="h-5 w-5" />
                Sair do grupo
              </button>
              {leaveConfirm && (
                <div className="mt-2 rounded-xl bg-red-900/30 px-4 py-3">
                  <p className="text-xs text-red-300">Deseja sair deste grupo?</p>
                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={handleLeave}
                      disabled={actionLoading === 'leave'}
                      className="flex-1 rounded-lg bg-red-600 py-1.5 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50"
                    >
                      Confirmar
                    </button>
                    <button
                      onClick={() => setLeaveConfirm(false)}
                      className="flex-1 rounded-lg bg-white/10 py-1.5 text-xs font-medium text-[#E9EDEF] hover:bg-white/20"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </aside>
    </>
  )
}
