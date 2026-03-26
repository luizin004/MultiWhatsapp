'use client'

import { useMemo, useState, MouseEvent } from 'react'
import { InstanceWithContacts } from '@/types/database'
import { Phone, User, Pencil, Plus, Search, MessageSquarePlus, MoreVertical } from 'lucide-react'

interface SidebarProps {
  instances: InstanceWithContacts[]
  selectedInstance: InstanceWithContacts | null
  onSelectInstance: (instance: InstanceWithContacts) => void
  loading: boolean
  onAddInstance: () => void
  onEditInstance: (instance: InstanceWithContacts) => void
  /** When true, renders a narrower version for mobile view */
  compact?: boolean
}

export default function Sidebar({
  instances,
  selectedInstance,
  onSelectInstance,
  loading,
  onAddInstance,
  onEditInstance,
  compact = false
}: SidebarProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [activeFilter, setActiveFilter] = useState<'all' | 'unread' | 'groups'>('all')

  const formatPhoneNumber = (phone: string) => {
    return phone.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3')
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60)

    if (diffInHours < 1) {
      return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    } else if (diffInHours < 24) {
      return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    } else if (diffInHours < 48) {
      return 'Ontem'
    } else {
      return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
    }
  }

  const getInitials = (name: string) => {
    if (!name) return ''
    return name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((word) => word[0])
      .join('')
      .toUpperCase()
  }

  const connectedCount = useMemo(
    () => instances.filter((i) => i.status === 'connected').length,
    [instances]
  )

  const filteredInstances = useMemo(() => {
    let list = instances

    if (activeFilter === 'unread') {
      list = list.filter((instance) => {
        const unread = instance.contacts?.reduce((sum, c) => sum + (c.unread_count || 0), 0) || 0
        return unread > 0
      })
    }

    if (!searchTerm.trim()) return list
    return list.filter((instance) => {
      const query = searchTerm.toLowerCase()
      return (
        instance.name?.toLowerCase().includes(query) ||
        instance.uazapi_instance_id?.toLowerCase().includes(query) ||
        instance.phone_number?.toLowerCase().includes(query)
      )
    })
  }, [instances, searchTerm, activeFilter])

  const renderSkeletons = () => (
    <div className="space-y-0">
      {[...Array(6)].map((_, index) => (
        <div key={index} className="flex items-center gap-3 px-4 py-3">
          <div className="h-12 w-12 flex-shrink-0 rounded-full bg-white/5 animate-pulse" />
          <div className="flex-1 space-y-2 min-w-0">
            <div className="h-3 rounded-full bg-white/5 animate-pulse w-3/4" />
            <div className="h-3 rounded-full bg-white/5 animate-pulse w-1/2" />
          </div>
          <div className="h-3 w-10 rounded-full bg-white/5 animate-pulse flex-shrink-0" />
        </div>
      ))}
    </div>
  )

  const renderEmpty = () => (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-12 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/5 mb-4">
        <MessageSquarePlus className="h-7 w-7 text-white/20" />
      </div>
      <p className="text-sm font-medium text-[#8696A0]">Nenhuma conversa encontrada</p>
      <p className="mt-1 text-xs text-[#8696A0]/60">
        {searchTerm ? 'Tente outro termo de busca' : 'Adicione uma instância para começar'}
      </p>
    </div>
  )

  const renderList = () => {
    if (loading) return renderSkeletons()
    if (!filteredInstances.length) return renderEmpty()

    return filteredInstances.map((instance: InstanceWithContacts) => {
      const unread = instance.contacts?.reduce((sum, contact) => sum + (contact.unread_count || 0), 0) || 0
      const lastUpdate = instance.updated_at || instance.created_at
      const isConnected = instance.status === 'connected'
      const isSelected = selectedInstance?.id === instance.id
      const displayName = instance.name || instance.uazapi_instance_id || ''
      const initials = getInitials(displayName)

      return (
        <button
          key={instance.id}
          onClick={() => onSelectInstance(instance)}
          className={`relative flex w-full items-center gap-3 px-4 py-3 text-left transition-colors duration-150 border-b border-white/[0.04] ${
            isSelected
              ? 'bg-[#2A3942]'
              : 'hover:bg-white/[0.03]'
          }`}
        >
          {/* Avatar */}
          <div className="relative flex-shrink-0">
            {instance.profile_pic_url ? (
              <img
                src={instance.profile_pic_url}
                alt={`Avatar de ${displayName}`}
                className="h-12 w-12 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#2A3942] text-[#aebac1] text-sm font-semibold select-none">
                {initials || <Phone className="h-5 w-5" />}
              </div>
            )}
            {/* Connection status dot */}
            <span
              className={`absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-2 border-[#111B21] ${
                isConnected ? 'bg-[#25D366]' : 'bg-[#8696A0]'
              }`}
            />
          </div>

          {/* Content */}
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <p className="truncate text-[15px] font-normal text-[#E9EDEF] leading-tight">
                {displayName}
              </p>
              <span className={`flex-shrink-0 text-[11px] leading-tight ${unread > 0 ? 'text-[#25D366]' : 'text-[#8696A0]'}`}>
                {lastUpdate ? formatTime(lastUpdate) : ''}
              </span>
            </div>
            <div className="mt-0.5 flex items-center justify-between gap-2">
              <p className="truncate text-[13px] text-[#8696A0]">
                {instance.phone_number
                  ? formatPhoneNumber(instance.phone_number)
                  : `${instance.contacts?.length || 0} contatos`}
              </p>
              {unread > 0 ? (
                <span className="flex-shrink-0 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[#25D366] px-1.5 text-[11px] font-semibold text-[#111B21]">
                  {unread > 99 ? '99+' : unread}
                </span>
              ) : null}
            </div>
          </div>

          {/* Edit button — only visible on hover */}
          <button
            type="button"
            onClick={(event: MouseEvent<HTMLButtonElement>) => {
              event.stopPropagation()
              onEditInstance(instance)
            }}
            className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 rounded-full p-1.5 text-[#8696A0] transition hover:bg-white/10 hover:text-[#E9EDEF] focus-visible:opacity-100"
            title="Editar instância"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
        </button>
      )
    })
  }

  const filterLabels: { key: 'all' | 'unread' | 'groups'; label: string }[] = [
    { key: 'all', label: 'Tudo' },
    { key: 'unread', label: 'Não lidas' },
    { key: 'groups', label: 'Grupos' },
  ]

  return (
    <aside className={`flex ${compact ? 'w-full' : 'w-[400px]'} flex-shrink-0 flex-col border-r border-white/[0.04] bg-[#111B21] scrollbar-thin`}>
      {/* Top bar */}
      <div className="flex items-center justify-between bg-[#202C33] px-4 py-3 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="relative flex h-10 w-10 items-center justify-center rounded-full bg-[#2A3942] text-[#aebac1] select-none">
            <User className="h-5 w-5" />
            <span
              className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-[#202C33] ${
                connectedCount > 0 ? 'bg-[#25D366]' : 'bg-[#8696A0]'
              }`}
            />
          </div>
          <div>
            <p className="text-[15px] font-semibold text-[#E9EDEF] leading-tight">Vigia WhatsApp</p>
            <p className="text-[12px] text-[#8696A0]">
              {connectedCount} conectada{connectedCount !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={onAddInstance}
            className="rounded-full p-2 text-[#aebac1] transition hover:bg-white/10 hover:text-[#E9EDEF]"
            title="Adicionar instância"
          >
            <MessageSquarePlus className="h-5 w-5" />
          </button>
          <button
            onClick={() => selectedInstance && onEditInstance(selectedInstance)}
            disabled={!selectedInstance}
            className="rounded-full p-2 text-[#aebac1] transition hover:bg-white/10 hover:text-[#E9EDEF] disabled:cursor-not-allowed disabled:text-white/20"
            title="Editar instância selecionada"
          >
            <MoreVertical className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Search bar */}
      <div className="bg-[#111B21] px-3 py-2 flex-shrink-0">
        <div className="flex items-center gap-2 rounded-lg bg-[#202C33] px-3 py-1">
          <Search className="h-4 w-4 flex-shrink-0 text-[#8696A0]" />
          <input
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Pesquisar ou começar nova conversa"
            className="h-9 flex-1 bg-transparent text-[14px] text-[#E9EDEF] placeholder:text-[#8696A0] focus:outline-none"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="text-[#8696A0] hover:text-[#E9EDEF] transition"
            >
              <span className="text-xs">✕</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-2 bg-[#111B21] px-4 pb-2 flex-shrink-0">
        {filterLabels.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setActiveFilter(key)}
            className={`rounded-full px-3 py-1 text-[13px] font-medium transition-colors ${
              activeFilter === key
                ? 'bg-[#25D366]/20 text-[#25D366]'
                : 'text-[#8696A0] hover:bg-white/5 hover:text-[#E9EDEF]'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Instance list */}
      <div className="group flex-1 overflow-y-auto scrollbar-thin">{renderList()}</div>
    </aside>
  )
}
