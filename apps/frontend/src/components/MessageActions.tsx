'use client'

import { useState, useRef, useEffect } from 'react'
import { Reply, SmilePlus, Pencil, Trash2 } from 'lucide-react'
import { Message } from '@/types/database'

const QUICK_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🙏']

interface MessageActionsProps {
  message: Message
  instanceToken: string
  contactNumber: string
  onReply: (message: Message) => void
  onEdit: (message: Message) => void
  onDelete: (messageId: string) => void
  onReact: (messageId: string, emoji: string) => void
}

export default function MessageActions({
  message,
  onReply,
  onEdit,
  onDelete,
  onReact
}: MessageActionsProps) {
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const emojiPickerRef = useRef<HTMLDivElement | null>(null)
  const isOutbound = message.direction === 'outbound'
  const isTextMessage = message.type === 'text'

  useEffect(() => {
    if (!showEmojiPicker) return

    const handleClickOutside = (e: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(e.target as Node)) {
        setShowEmojiPicker(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showEmojiPicker])

  const handleReact = (emoji: string) => {
    onReact(message.id, emoji)
    setShowEmojiPicker(false)
  }

  return (
    <div className="relative flex items-center gap-1 rounded-lg bg-[#202C33] px-1 py-1 shadow-lg">
      <ActionButton title="Responder" onClick={() => onReply(message)}>
        <Reply className="h-4 w-4" />
      </ActionButton>

      <div ref={emojiPickerRef} className="relative">
        <ActionButton title="Reagir" onClick={() => setShowEmojiPicker((prev) => !prev)}>
          <SmilePlus className="h-4 w-4" />
        </ActionButton>

        {showEmojiPicker && (
          <div
            className={`absolute bottom-full mb-2 flex gap-1 rounded-lg bg-[#202C33] p-1.5 shadow-xl ${
              isOutbound ? 'right-0' : 'left-0'
            }`}
          >
            {QUICK_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                onClick={() => handleReact(emoji)}
                className="flex h-8 w-8 items-center justify-center rounded-md text-base transition hover:bg-white/10"
                title={emoji}
              >
                {emoji}
              </button>
            ))}
          </div>
        )}
      </div>

      {isOutbound && isTextMessage && (
        <ActionButton title="Editar" onClick={() => onEdit(message)}>
          <Pencil className="h-4 w-4" />
        </ActionButton>
      )}

      {isOutbound && (
        <ActionButton title="Apagar" onClick={() => onDelete(message.id)}>
          <Trash2 className="h-4 w-4" />
        </ActionButton>
      )}
    </div>
  )
}

interface ActionButtonProps {
  title: string
  onClick: () => void
  children: React.ReactNode
}

function ActionButton({ title, onClick, children }: ActionButtonProps) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className="flex h-7 w-7 items-center justify-center rounded-md text-[#8696A0] transition hover:bg-white/10 hover:text-[#E9EDEF]"
    >
      {children}
    </button>
  )
}
