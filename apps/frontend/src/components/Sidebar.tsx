'use client'

import { useMemo, useState, MouseEvent } from 'react'
import { InstanceWithContacts } from '@/types/database'
import { Phone, User, Pencil, Plus, Search } from 'lucide-react'

interface SidebarProps {
  instances: InstanceWithContacts[]
  selectedInstance: InstanceWithContacts | null
  onSelectInstance: (instance: InstanceWithContacts) => void
  loading: boolean
  onAddInstance: () => void
  onEditInstance: (instance: InstanceWithContacts) => void
}

export default function Sidebar({
  instances,
  selectedInstance,
  onSelectInstance,
  loading,
  onAddInstance,
  onEditInstance
}: SidebarProps) {
  const [searchTerm, setSearchTerm] = useState('')

  const formatPhoneNumber = (phone: string) => {
    // Formatar numero de telefone para exibicao
    return phone.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3')
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60)
    
    if (diffInHours < 1) {
      return 'Agora'
    } else if (diffInHours < 24) {
      return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    } else if (diffInHours < 48) {
      return 'Ontem'
    } else {
      return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
    }
  }

  const filteredInstances = useMemo(() => {
    if (!searchTerm.trim()) return instances
    return instances.filter((instance) => {
      const query = searchTerm.toLowerCase()
      return (
        instance.name?.toLowerCase().includes(query) ||
        instance.uazapi_instance_id.toLowerCase().includes(query) ||
        instance.phone_number?.toLowerCase().includes(query)
      )
    })
  }, [instances, searchTerm])

  const renderList = () => {
    if (loading) {
      return (
        <div className="space-y-3 px-4 py-6">
          {[...Array(5)].map((_, index) => (
            <div key={index} className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-white/5" />
              <div className="flex-1 space-y-2">
                <div className="h-3 rounded bg-white/5" />
                <div className="h-3 w-3/4 rounded bg-white/5" />
              </div>
            </div>
          ))}
        </div>
      )
    }

    if (!filteredInstances.length) {
      return (
        <div className="flex flex-1 flex-col items-center justify-center px-6 text-center text-[#8696A0]">
          <User className="mb-3 h-12 w-12 text-white/10" />
          <p className="text-sm">Nenhuma conversa encontrada</p>
        </div>
      )
    }

    return filteredInstances.map((instance: InstanceWithContacts) => {
      const unread = instance.contacts?.reduce((sum, contact) => sum + (contact.unread_count || 0), 0) || 0
      const lastUpdate = instance.updated_at || instance.created_at

      return (
        <button
          key={instance.id}
          onClick={() => onSelectInstance(instance)}
          className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors ${
            selectedInstance?.id === instance.id ? 'bg-white/5' : 'hover:bg-white/5'
          }`}
        >
          <div className="relative">
            {instance.profile_pic_url ? (
              <img
                src={instance.profile_pic_url}
                alt={`Avatar da instancia ${instance.name}`}
                className="h-12 w-12 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#202C33] text-[#25D366]">
                <Phone className="h-5 w-5" />
              </div>
            )}
            {unread ? (
              <span className="absolute -bottom-1 -right-1 rounded-full bg-[#25D366] px-2 py-0.5 text-[11px] font-semibold text-[#111B21]">
                {unread > 99 ? '99+' : unread}
              </span>
            ) : null}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <p className="truncate text-sm font-semibold text-[#E9EDEF]">{instance.name}</p>
              {lastUpdate ? (
                <span className="text-[11px] text-[#8696A0]">{formatTime(lastUpdate)}</span>
              ) : null}
            </div>
            <div className="mt-1 flex items-center justify-between text-xs text-[#8696A0]">
              <span className="truncate">{formatPhoneNumber(instance.phone_number || '')}</span>
              <span>{instance.contacts?.length || 0} contatos</span>
            </div>
            <div className="mt-1 text-xs text-[#8696A0]">
              Token: {instance.uazapi_instance_id.substring(0, 10)}...
            </div>
          </div>

          <button
            type="button"
            onClick={(event: MouseEvent<HTMLButtonElement>) => {
              event.stopPropagation()
              onEditInstance(instance)
            }}
            className="rounded-full p-2 text-white/60 transition hover:bg-white/10 hover:text-white"
            title="Editar instancia"
          >
            <Pencil className="h-4 w-4" />
          </button>
        </button>
      )
    })
  }

  return (
    <aside className="flex w-full max-w-xs flex-col border-r border-white/5 bg-[#111B21]">
      <div className="flex items-center justify-between border-b border-white/10 bg-[#202C33] px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#0B141A] text-[#25D366]">
            <User className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-[#E9EDEF]">Conversas</p>
            <p className="text-xs text-[#8696A0]">{instances.length} instancias</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onAddInstance}
            className="rounded-full p-2 text-white/70 transition hover:bg-white/10 hover:text-white"
            title="Adicionar instancia"
          >
            <Plus className="h-4 w-4" />
          </button>
          <button
            onClick={() => selectedInstance && onEditInstance(selectedInstance)}
            disabled={!selectedInstance}
            className="rounded-full p-2 text-white/50 transition hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:text-white/30"
            title="Editar instancia selecionada"
          >
            <Pencil className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="border-b border-white/5 bg-[#111B21] px-4 py-3">
        <div className="flex items-center gap-3 rounded-full bg-[#202C33] px-3">
          <Search className="h-4 w-4 text-[#8696A0]" />
          <input
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Pesquisar ou começar nova conversa"
            className="h-10 flex-1 bg-transparent text-sm text-[#E9EDEF] placeholder:text-[#8696A0] focus:outline-none"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto bg-[#111B21]">{renderList()}</div>
    </aside>
  )
}
