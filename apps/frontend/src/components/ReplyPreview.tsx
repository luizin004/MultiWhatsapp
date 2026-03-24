'use client'

import { X } from 'lucide-react'
import { Message } from '@/types/database'

interface ReplyPreviewProps {
  message: Message
  onCancel: () => void
}

export default function ReplyPreview({ message, onCancel }: ReplyPreviewProps) {
  const previewText = getPreviewText(message)
  const label = message.direction === 'outbound' ? 'Você' : 'Contato'

  return (
    <div className="flex items-center gap-3 border-b border-white/5 bg-[#1A2730] px-4 py-2">
      <div className="flex-1 border-l-4 border-[#25D366] pl-3">
        <p className="text-xs font-semibold text-[#25D366]">{label}</p>
        <p className="mt-0.5 truncate text-xs text-[#8696A0]">{previewText}</p>
      </div>
      <button
        type="button"
        onClick={onCancel}
        className="flex h-7 w-7 items-center justify-center rounded-full text-[#8696A0] transition hover:bg-white/10 hover:text-[#E9EDEF]"
        title="Cancelar resposta"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}

function getPreviewText(message: Message): string {
  if (message.content) return message.content

  switch (message.type) {
    case 'image': return 'Imagem'
    case 'video': return 'Vídeo'
    case 'audio':
    case 'ptt': return 'Áudio'
    case 'document': return message.attachment_name || 'Documento'
    case 'sticker': return 'Sticker'
    case 'location': return 'Localização'
    default: return 'Mensagem'
  }
}
