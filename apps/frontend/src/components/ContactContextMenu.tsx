'use client'

import React, { useEffect, useRef, useState } from 'react'
import { Pin, BellOff, Archive, CheckCheck, Ban, Trash2, ChevronRight } from 'lucide-react'
import { Contact } from '@/types/database'
import {
  pinChat,
  muteChat,
  archiveChat,
  readChat,
  blockContact,
  deleteChat,
} from '@/services/uazapi/chat'

export interface ContactContextMenuProps {
  contact: Contact
  instanceToken: string
  position: { x: number; y: number }
  onClose: () => void
  onAction: (action: string, contact: Contact) => void
}

type MuteDuration = 0 | 8 | 168 | -1

interface MenuItem {
  label: string
  icon: React.ReactNode
  action: () => void
  danger?: boolean
  submenu?: SubMenuItem[]
}

interface SubMenuItem {
  label: string
  action: () => void
}

const MUTE_OPTIONS: { label: string; value: MuteDuration }[] = [
  { label: '8 horas', value: 8 },
  { label: '1 semana', value: 168 },
  { label: 'Sempre', value: -1 },
  { label: 'Desativar silêncio', value: 0 },
]

export default function ContactContextMenu({
  contact,
  instanceToken,
  position,
  onClose,
  onAction,
}: ContactContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)
  const [activeSubmenu, setActiveSubmenu] = useState<string | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [adjustedPosition, setAdjustedPosition] = useState(position)

  // Adjust menu position so it does not overflow the viewport
  useEffect(() => {
    const menu = menuRef.current
    if (!menu) return

    const rect = menu.getBoundingClientRect()
    const viewportWidth = window.innerWidth
    const viewportHeight = window.innerHeight

    let { x, y } = position
    if (x + rect.width > viewportWidth) x = viewportWidth - rect.width - 8
    if (y + rect.height > viewportHeight) y = viewportHeight - rect.height - 8
    if (x < 8) x = 8
    if (y < 8) y = 8

    setAdjustedPosition({ x, y })
  }, [position])

  // Close on outside click or Escape
  useEffect(() => {
    const handlePointerDown = (e: PointerEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [onClose])

  const handlePin = async () => {
    const pin = !contact.is_pinned
    await pinChat(instanceToken, { number: contact.phone_number, pin })
    onAction(pin ? 'pin' : 'unpin', contact)
    onClose()
  }

  const handleMute = async (duration: MuteDuration) => {
    await muteChat(instanceToken, { number: contact.phone_number, muteEndTime: duration })
    onAction(duration === 0 ? 'unmute' : 'mute', contact)
    onClose()
  }

  const handleArchive = async () => {
    const archive = !contact.is_archived
    await archiveChat(instanceToken, { number: contact.phone_number, archive })
    onAction(archive ? 'archive' : 'unarchive', contact)
    onClose()
  }

  const handleRead = async () => {
    const unreadCount = contact.unread_count ?? 0
    const markAsRead = unreadCount > 0
    await readChat(instanceToken, { number: contact.phone_number, read: markAsRead })
    onAction(markAsRead ? 'read' : 'unread', contact)
    onClose()
  }

  const handleBlock = async () => {
    const block = !contact.is_blocked
    await blockContact(instanceToken, { number: contact.phone_number, block })
    onAction(block ? 'block' : 'unblock', contact)
    onClose()
  }

  const handleDelete = async () => {
    await deleteChat(instanceToken, {
      number: contact.phone_number,
      deleteChatDB: true,
      deleteMessagesDB: true,
    })
    onAction('delete', contact)
    onClose()
  }

  const isMuted = (contact.is_muted ?? 0) !== 0
  const hasUnread = (contact.unread_count ?? 0) > 0

  const menuItems: MenuItem[] = [
    {
      label: contact.is_pinned ? 'Desafixar conversa' : 'Fixar conversa',
      icon: <Pin className="h-4 w-4" />,
      action: handlePin,
    },
    {
      label: isMuted ? 'Silêncio' : 'Silenciar',
      icon: <BellOff className="h-4 w-4" />,
      action: () => setActiveSubmenu(activeSubmenu === 'mute' ? null : 'mute'),
      submenu: MUTE_OPTIONS.map(({ label, value }) => ({
        label,
        action: () => handleMute(value),
      })),
    },
    {
      label: contact.is_archived ? 'Desarquivar' : 'Arquivar',
      icon: <Archive className="h-4 w-4" />,
      action: handleArchive,
    },
    {
      label: hasUnread ? 'Marcar como lida' : 'Marcar como não lida',
      icon: <CheckCheck className="h-4 w-4" />,
      action: handleRead,
    },
    {
      label: contact.is_blocked ? 'Desbloquear' : 'Bloquear',
      icon: <Ban className="h-4 w-4" />,
      action: handleBlock,
    },
    {
      label: 'Apagar conversa',
      icon: <Trash2 className="h-4 w-4" />,
      danger: true,
      action: () => setShowDeleteConfirm(true),
    },
  ]

  return (
    <div
      ref={menuRef}
      className="fixed z-50"
      style={{ top: adjustedPosition.y, left: adjustedPosition.x }}
    >
      {showDeleteConfirm ? (
        <DeleteConfirmDialog
          contactName={contact.name || contact.phone_number}
          onConfirm={handleDelete}
          onCancel={() => setShowDeleteConfirm(false)}
        />
      ) : (
        <div className="w-56 overflow-hidden rounded-xl border border-white/10 bg-[#202C33] shadow-lg">
          <ul role="menu">
            {menuItems.map((item) => (
              <li key={item.label} role="none" className="relative">
                <button
                  role="menuitem"
                  onClick={item.action}
                  className={`flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors hover:bg-white/5 ${
                    item.danger ? 'text-red-400' : 'text-[#E9EDEF]'
                  }`}
                >
                  <span className={item.danger ? 'text-red-400' : 'text-[#8696A0]'}>
                    {item.icon}
                  </span>
                  <span className="flex-1">{item.label}</span>
                  {item.submenu && (
                    <ChevronRight className="h-3.5 w-3.5 text-[#8696A0]" />
                  )}
                </button>

                {item.submenu && activeSubmenu === 'mute' && (
                  <ul
                    role="menu"
                    className="absolute left-full top-0 ml-1 w-44 overflow-hidden rounded-xl border border-white/10 bg-[#202C33] shadow-lg"
                  >
                    {item.submenu.map((sub) => (
                      <li key={sub.label} role="none">
                        <button
                          role="menuitem"
                          onClick={sub.action}
                          className="flex w-full items-center px-4 py-2.5 text-left text-sm text-[#E9EDEF] transition-colors hover:bg-white/5"
                        >
                          {sub.label}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

interface DeleteConfirmDialogProps {
  contactName: string
  onConfirm: () => void
  onCancel: () => void
}

function DeleteConfirmDialog({ contactName, onConfirm, onCancel }: DeleteConfirmDialogProps) {
  return (
    <div className="w-72 overflow-hidden rounded-xl border border-white/10 bg-[#202C33] shadow-lg">
      <div className="px-5 py-4">
        <p className="text-sm font-semibold text-[#E9EDEF]">Apagar conversa</p>
        <p className="mt-1.5 text-xs text-[#8696A0]">
          Tem certeza que deseja apagar a conversa com{' '}
          <span className="text-[#E9EDEF]">{contactName}</span>? Esta ação não pode ser desfeita.
        </p>
      </div>
      <div className="flex border-t border-white/10">
        <button
          onClick={onCancel}
          className="flex-1 px-4 py-3 text-sm text-[#8696A0] transition-colors hover:bg-white/5"
        >
          Cancelar
        </button>
        <button
          onClick={onConfirm}
          className="flex-1 border-l border-white/10 px-4 py-3 text-sm font-medium text-red-400 transition-colors hover:bg-red-400/10"
        >
          Apagar
        </button>
      </div>
    </div>
  )
}
