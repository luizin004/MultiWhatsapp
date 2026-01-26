'use client'

import { InstanceWithContacts } from '@/types/database'
import { Bell, Phone, User, Pencil } from 'lucide-react'

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
  const formatPhoneNumber = (phone: string) => {
    // Formatar numero de telefone para exibicao
    return phone.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3')
  }

  const formatLastMessage = (message?: string) => {
    if (!message) return 'Sem mensagens'
    return message.length > 30 ? message.substring(0, 30) + '...' : message
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

  if (loading) {
    return (
      <div className="w-full md:w-80 bg-white/70 border-r border-slate-200/70 flex flex-col">
        <div className="p-5 border-b border-slate-200/70 bg-white/80">
          <h2 className="text-lg font-semibold text-slate-900">Conversas</h2>
        </div>
        <div className="flex-1 overflow-y-auto">
          <div className="p-4 space-y-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="flex items-center space-x-3 p-3 rounded-lg">
                  <div className="w-12 h-12 bg-slate-200 rounded-full"></div>
                  <div className="flex-1">
                    <div className="h-4 bg-slate-200 rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-slate-200 rounded w-1/2"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full md:w-80 bg-white/70 border-r border-slate-200/70 flex flex-col">
      {/* Header */}
      <div className="p-5 border-b border-slate-200/70 space-y-2 bg-white/80">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold text-slate-900">Conversas</h2>
              <div className="flex items-center gap-1 text-xs text-slate-500">
                <Bell className="w-4 h-4" />
                <span>
                  {instances.reduce((total, instance) => {
                    return (
                      total + (instance.contacts?.reduce((sum, contact) => sum + (contact.unread_count || 0), 0) || 0)
                    )
                  }, 0)} notificações
                </span>
              </div>
            </div>
            <p className="text-sm text-slate-500">{instances.length} instancias</p>
          </div>
          <button
            onClick={onAddInstance}
            className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-700 transition hover:bg-emerald-100"
          >
            + Novo
          </button>
        </div>
        <p className="text-xs text-slate-500">Cadastre contatos e gere o webhook da instancia.</p>
      </div>

      {/* Lista de contatos */}
      <div className="flex-1 overflow-y-auto">
        {instances.length === 0 ? (
          <div className="p-4 text-center text-slate-500">
            <User className="w-12 h-12 mx-auto mb-2 text-slate-300" />
            <p>Nenhuma conversa encontrada</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-200/70">
            {instances.map((instance) => (
              <div
                key={instance.id}
                onClick={() => onSelectInstance(instance)}
                className={`p-4 hover:bg-white/80 cursor-pointer transition-colors ${
                  selectedInstance?.id === instance.id ? 'bg-emerald-50 border-l-4 border-emerald-500' : ''
                }`}
              >
                <div className="flex items-start space-x-3">
                  {/* Avatar da instancia */}
                  <div className="relative">
                    {instance.profile_pic_url ? (
                      <img
                        src={instance.profile_pic_url}
                        alt={`Avatar da instancia ${instance.name}`}
                        className="h-12 w-12 rounded-full object-cover border border-slate-200"
                      />
                    ) : (
                      <div className="w-12 h-12 bg-slate-900 rounded-full flex items-center justify-center">
                        <Phone className="w-6 h-6 text-emerald-200" />
                      </div>
                    )}
                    {(() => {
                      const unread = instance.contacts?.reduce((sum, contact) => sum + (contact.unread_count || 0), 0) || 0
                      if (!unread) return null
                      return (
                        <div className="absolute -bottom-1 -right-1 rounded-full bg-rose-500 px-2 py-0.5 text-[10px] font-semibold text-white shadow-lg">
                          {unread > 99 ? '99+' : unread}
                        </div>
                      )
                    })()}
                  </div>

                  {/* Informacoes da instancia */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-slate-900 truncate">
                      {instance.name}
                    </h3>
                    
                    <div className="flex items-center mt-1 text-xs text-slate-500">
                      <Phone className="w-3 h-3 mr-1" />
                      {instance.uazapi_instance_id.substring(0, 8)}...
                    </div>

                    {/* Contatos da instancia */}
                    <div className="flex items-center mt-1 text-xs text-slate-500">
                      <User className="w-3 h-3 mr-1" />
                      {instance.contacts?.length || 0} contatos
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation()
                      onEditInstance(instance)
                    }}
                    className="rounded-full border border-slate-200 p-2 text-slate-500 hover:border-slate-300 hover:text-slate-700"
                    title="Editar instancia"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
