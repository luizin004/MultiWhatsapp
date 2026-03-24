'use client'

import { Image, FileText, User, MapPin, BarChart2, List, LayoutGrid, CreditCard } from 'lucide-react'
import { useEffect, useRef } from 'react'

export type BuilderType = 'contact' | 'location' | 'poll' | 'list' | 'button' | 'payment'

interface AttachmentMenuProps {
  open: boolean
  onClose: () => void
  onSelectFile: () => void
  onSelectDocument: () => void
  onOpenBuilder: (type: BuilderType) => void
}

interface MenuOption {
  label: string
  icon: React.ReactNode
  color: string
  action: () => void
}

export default function AttachmentMenu({
  open,
  onClose,
  onSelectFile,
  onSelectDocument,
  onOpenBuilder,
}: AttachmentMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open, onClose])

  const options: MenuOption[] = [
    {
      label: 'Imagem/Vídeo',
      icon: <Image className="h-5 w-5" />,
      color: 'bg-purple-500',
      action: () => { onSelectFile(); onClose() },
    },
    {
      label: 'Documento',
      icon: <FileText className="h-5 w-5" />,
      color: 'bg-blue-500',
      action: () => { onSelectDocument(); onClose() },
    },
    {
      label: 'Contato',
      icon: <User className="h-5 w-5" />,
      color: 'bg-cyan-500',
      action: () => { onOpenBuilder('contact'); onClose() },
    },
    {
      label: 'Localização',
      icon: <MapPin className="h-5 w-5" />,
      color: 'bg-green-500',
      action: () => { onOpenBuilder('location'); onClose() },
    },
    {
      label: 'Enquete',
      icon: <BarChart2 className="h-5 w-5" />,
      color: 'bg-yellow-500',
      action: () => { onOpenBuilder('poll'); onClose() },
    },
    {
      label: 'Lista',
      icon: <List className="h-5 w-5" />,
      color: 'bg-orange-500',
      action: () => { onOpenBuilder('list'); onClose() },
    },
    {
      label: 'Botões',
      icon: <LayoutGrid className="h-5 w-5" />,
      color: 'bg-red-500',
      action: () => { onOpenBuilder('button'); onClose() },
    },
    {
      label: 'Pagamento PIX',
      icon: <CreditCard className="h-5 w-5" />,
      color: 'bg-emerald-500',
      action: () => { onOpenBuilder('payment'); onClose() },
    },
  ]

  if (!open) return null

  return (
    <div
      ref={menuRef}
      className="absolute bottom-full left-0 mb-3 z-50 rounded-2xl border border-white/10 bg-[#202C33] p-4 shadow-2xl"
      style={{ minWidth: '280px' }}
    >
      <div className="grid grid-cols-4 gap-3">
        {options.map((option) => (
          <button
            key={option.label}
            type="button"
            onClick={option.action}
            className="flex flex-col items-center gap-2 rounded-xl p-2 transition hover:bg-white/5"
          >
            <div className={`flex h-12 w-12 items-center justify-center rounded-full text-white ${option.color}`}>
              {option.icon}
            </div>
            <span className="text-center text-[10px] leading-tight text-[#8696A0]">{option.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
