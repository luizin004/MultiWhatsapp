'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { Zap, FileText, Image, Video, Mic, File } from 'lucide-react'
import { QuickReply } from '@/types/database'
import { getQuickReplies } from '@/services/uazapi/quick-replies'

interface QuickReplySelectorProps {
  open: boolean
  query: string
  instanceToken: string
  onSelect: (reply: QuickReply) => void
  onClose: () => void
}

const TYPE_ICONS: Record<QuickReply['type'], React.ReactNode> = {
  text: <FileText className="h-3 w-3" />,
  image: <Image className="h-3 w-3" />,
  video: <Video className="h-3 w-3" />,
  audio: <Mic className="h-3 w-3" />,
  myaudio: <Mic className="h-3 w-3" />,
  ptt: <Mic className="h-3 w-3" />,
  document: <File className="h-3 w-3" />,
}

const TYPE_COLORS: Record<QuickReply['type'], string> = {
  text: 'bg-blue-500/20 text-blue-400',
  image: 'bg-purple-500/20 text-purple-400',
  video: 'bg-pink-500/20 text-pink-400',
  audio: 'bg-yellow-500/20 text-yellow-400',
  myaudio: 'bg-yellow-500/20 text-yellow-400',
  ptt: 'bg-yellow-500/20 text-yellow-400',
  document: 'bg-orange-500/20 text-orange-400',
}

export default function QuickReplySelector({
  open,
  query,
  instanceToken,
  onSelect,
  onClose,
}: QuickReplySelectorProps) {
  const [allReplies, setAllReplies] = useState<QuickReply[]>([])
  const [activeIndex, setActiveIndex] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const fetchedForToken = useRef<string | null>(null)

  const fetchReplies = useCallback(async () => {
    if (fetchedForToken.current === instanceToken) return
    try {
      const data = await getQuickReplies(instanceToken)
      const list = Array.isArray(data) ? (data as QuickReply[]) : []
      setAllReplies(list)
      fetchedForToken.current = instanceToken
    } catch {
      setAllReplies([])
    }
  }, [instanceToken])

  useEffect(() => {
    if (open) fetchReplies()
  }, [open, fetchReplies])

  useEffect(() => {
    setActiveIndex(0)
  }, [query])

  const filtered = allReplies
    .filter((r) => r.shortcut.toLowerCase().includes(query.toLowerCase()))
    .slice(0, 6)

  useEffect(() => {
    if (!open) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setActiveIndex((i) => Math.min(i + 1, filtered.length - 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setActiveIndex((i) => Math.max(i - 1, 0))
      } else if (e.key === 'Enter') {
        e.preventDefault()
        if (filtered[activeIndex]) onSelect(filtered[activeIndex])
      } else if (e.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown, true)
    return () => document.removeEventListener('keydown', handleKeyDown, true)
  }, [open, filtered, activeIndex, onSelect, onClose])

  useEffect(() => {
    if (!open) return
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open, onClose])

  if (!open || filtered.length === 0) return null

  return (
    <div
      ref={containerRef}
      className="absolute bottom-full left-0 mb-2 z-50 w-full max-w-md rounded-xl border border-white/10 bg-[#202C33] shadow-2xl overflow-hidden"
    >
      <div className="flex items-center gap-2 border-b border-white/5 px-3 py-2">
        <Zap className="h-3.5 w-3.5 text-[#25D366]" />
        <span className="text-xs text-[#8696A0]">Respostas rápidas</span>
      </div>

      <div className="max-h-[240px] overflow-y-auto">
        {filtered.map((reply, index) => (
          <button
            key={reply.id}
            type="button"
            onClick={() => onSelect(reply)}
            onMouseEnter={() => setActiveIndex(index)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition ${
              index === activeIndex ? 'bg-white/8' : 'hover:bg-white/5'
            }`}
          >
            <span className="font-mono text-sm font-bold text-[#25D366] shrink-0">
              /{reply.shortcut}
            </span>

            <span className="flex-1 truncate text-xs text-[#8696A0]">
              {reply.text ?? reply.doc_name ?? reply.file_url ?? '—'}
            </span>

            <span
              className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium shrink-0 ${TYPE_COLORS[reply.type]}`}
            >
              {TYPE_ICONS[reply.type]}
              {reply.type}
            </span>
          </button>
        ))}
      </div>

      <div className="border-t border-white/5 px-3 py-1.5">
        <span className="text-[10px] text-[#8696A0]">
          ↑↓ navegar · Enter selecionar · Esc fechar
        </span>
      </div>
    </div>
  )
}
