'use client'

import { useEffect, useState, useMemo } from 'react'
import { Search, Users, Plus } from 'lucide-react'
import { GroupInfo } from '@/types/database'
import { listGroups } from '@/services/uazapi/groups'

// ─── Types ────────────────────────────────────────────────────────────────────

interface GroupListProps {
  instanceToken: string
  onSelectGroup: (group: GroupInfo) => void
  selectedGroupJid?: string | null
  onCreateGroup?: () => void
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const GROUP_COLORS = [
  'bg-[#25D366]', 'bg-[#00B0FF]', 'bg-[#FF6600]',
  'bg-[#7B61FF]', 'bg-[#FF5E94]', 'bg-[#FFCC00]',
]

function groupColor(jid: string): string {
  let hash = 0
  for (let i = 0; i < jid.length; i++) {
    hash = (hash * 31 + jid.charCodeAt(i)) >>> 0
  }
  return GROUP_COLORS[hash % GROUP_COLORS.length]
}

function groupInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0] ?? '')
    .join('')
    .toUpperCase()
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function GroupRow({
  group,
  selected,
  onClick,
}: {
  group: GroupInfo
  selected: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-white/5 ${
        selected ? 'bg-[#202C33]' : ''
      }`}
    >
      <div
        className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full text-sm font-bold text-[#111B21] ${groupColor(group.jid)}`}
      >
        {group.image_url ? (
          <img
            src={group.image_url}
            alt={group.name}
            className="h-full w-full rounded-full object-cover"
          />
        ) : (
          groupInitials(group.name)
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-[#E9EDEF]">{group.name}</p>
        <p className="mt-0.5 flex items-center gap-1 text-xs text-[#8696A0]">
          <Users className="h-3 w-3 flex-shrink-0" />
          {group.participant_count} participante{group.participant_count !== 1 ? 's' : ''}
        </p>
      </div>
    </button>
  )
}

function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <div className="h-11 w-11 flex-shrink-0 animate-pulse rounded-full bg-white/10" />
      <div className="flex-1 space-y-2">
        <div className="h-3 w-3/4 animate-pulse rounded bg-white/10" />
        <div className="h-2.5 w-1/2 animate-pulse rounded bg-white/10" />
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function GroupList({
  instanceToken,
  onSelectGroup,
  selectedGroupJid,
  onCreateGroup,
}: GroupListProps) {
  const [groups, setGroups] = useState<GroupInfo[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  useEffect(() => {
    if (!instanceToken) return

    let cancelled = false

    async function fetchGroups() {
      setLoading(true)
      setError(null)
      try {
        const result = await listGroups(instanceToken, { noParticipants: true })
        if (!cancelled) setGroups((result as GroupInfo[]) ?? [])
      } catch (err) {
        if (!cancelled) {
          setError('Não foi possível carregar os grupos.')
          console.error('[GroupList] listGroups failed:', err)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchGroups()
    return () => { cancelled = true }
  }, [instanceToken])

  const filtered = useMemo(() => {
    if (!search.trim()) return groups
    const lower = search.toLowerCase()
    return groups.filter((g) => g.name.toLowerCase().includes(lower))
  }, [groups, search])

  return (
    <div className="flex h-full flex-col bg-[#111B21]">
      {/* Search bar */}
      <div className="px-3 py-2">
        <div className="flex items-center gap-2 rounded-xl bg-[#202C33] px-3 py-2">
          <Search className="h-4 w-4 flex-shrink-0 text-[#8696A0]" />
          <input
            type="text"
            placeholder="Buscar grupos..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-transparent text-sm text-[#E9EDEF] placeholder-[#8696A0] outline-none"
          />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {loading && (
          <>
            {Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)}
          </>
        )}

        {error && (
          <div className="m-4 rounded-lg bg-red-900/30 px-4 py-3 text-xs text-red-300">
            {error}
          </div>
        )}

        {!loading && !error && filtered.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-12 text-[#8696A0]">
            <Users className="h-10 w-10 opacity-40" />
            <p className="text-sm">{search ? 'Nenhum grupo encontrado' : 'Sem grupos'}</p>
          </div>
        )}

        {!loading &&
          filtered.map((group) => (
            <GroupRow
              key={group.jid}
              group={group}
              selected={group.jid === selectedGroupJid}
              onClick={() => onSelectGroup(group)}
            />
          ))}
      </div>

      {/* Create group button */}
      <div className="border-t border-white/10 p-3">
        <button
          onClick={onCreateGroup}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#25D366] py-2.5 text-sm font-semibold text-[#111B21] transition-colors hover:bg-[#20C05A]"
        >
          <Plus className="h-4 w-4" />
          Criar grupo
        </button>
      </div>
    </div>
  )
}
