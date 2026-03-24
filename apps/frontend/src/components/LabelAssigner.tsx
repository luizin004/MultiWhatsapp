'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { Tag, AlertTriangle } from 'lucide-react'
import { uazapiFetch } from '@/services/uazapi/client'
import { updateLabels } from '@/services/uazapi/chat'

interface LabelAssignerProps {
  open: boolean
  contactNumber: string
  currentLabels: string[]
  instanceToken: string
  onClose: () => void
  onUpdate: (newLabels: string[]) => void
}

interface ApiLabel {
  id: string
  name: string
  color: number
}

const LABEL_COLORS = [
  '#00A884', '#53BDEB', '#FF9A3E', '#FC5C65', '#E277CD',
  '#20C997', '#5B5EA6', '#F7B731', '#EB3B5A', '#8854D0',
  '#2BCBBA', '#4B7BEC', '#FD9644', '#FC5C65', '#A55EEA',
  '#26DE81', '#45AAF2', '#F7B731', '#778CA3', '#4B6584',
]

export default function LabelAssigner({
  open,
  contactNumber,
  currentLabels,
  instanceToken,
  onClose,
  onUpdate,
}: LabelAssignerProps) {
  const [labels, setLabels] = useState<ApiLabel[]>([])
  const [active, setActive] = useState<Set<string>>(new Set(currentLabels))
  const [loading, setLoading] = useState(false)
  const [toggling, setToggling] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const loadLabels = useCallback(async () => {
    setLoading(true)
    try {
      const data = await uazapiFetch<ApiLabel[] | { labels?: ApiLabel[] }>('/labels', instanceToken)
      const list = Array.isArray(data) ? data : ((data as { labels?: ApiLabel[] }).labels ?? [])
      setLabels(list)
    } catch {
      setError('Falha ao carregar etiquetas.')
    } finally {
      setLoading(false)
    }
  }, [instanceToken])

  useEffect(() => {
    if (open) {
      setActive(new Set(currentLabels))
      setError(null)
      loadLabels()
    }
  }, [open, currentLabels, loadLabels])

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

  const toggleLabel = async (labelId: string) => {
    if (toggling) return

    const isActive = active.has(labelId)
    setToggling(labelId)
    setError(null)

    try {
      await updateLabels(instanceToken, {
        number: contactNumber,
        ...(isActive ? { remove_labelid: labelId } : { add_labelid: labelId }),
      })

      const next = new Set(active)
      if (isActive) {
        next.delete(labelId)
      } else {
        next.add(labelId)
      }
      setActive(next)
      onUpdate(Array.from(next))
    } catch {
      setError('Falha ao atualizar etiqueta.')
    } finally {
      setToggling(null)
    }
  }

  if (!open) return null

  return (
    <div
      ref={containerRef}
      className="absolute z-50 mt-1 w-64 rounded-xl border border-white/10 bg-[#202C33] shadow-2xl overflow-hidden"
    >
      <div className="flex items-center gap-2 border-b border-white/5 px-3 py-2.5">
        <Tag className="h-3.5 w-3.5 text-[#25D366]" />
        <span className="text-xs font-semibold text-[#E9EDEF]">Etiquetas</span>
      </div>

      {error && (
        <div className="mx-2 mt-2 flex items-center gap-1.5 rounded-lg bg-red-500/15 px-2 py-1.5 text-xs text-red-400">
          <AlertTriangle className="h-3 w-3 shrink-0" />
          {error}
        </div>
      )}

      <div className="max-h-56 overflow-y-auto py-1">
        {loading ? (
          <p className="px-3 py-4 text-center text-xs text-[#8696A0]">Carregando...</p>
        ) : labels.length === 0 ? (
          <p className="px-3 py-4 text-center text-xs text-[#8696A0]">Nenhuma etiqueta disponível.</p>
        ) : (
          labels.map((label) => {
            const checked = active.has(label.id)
            const isToggling = toggling === label.id

            return (
              <button
                key={label.id}
                type="button"
                onClick={() => toggleLabel(label.id)}
                disabled={!!toggling}
                className="flex w-full items-center gap-3 px-3 py-2 text-left transition hover:bg-white/5 disabled:opacity-60"
              >
                <span
                  className="h-3.5 w-3.5 rounded-full shrink-0"
                  style={{ backgroundColor: LABEL_COLORS[label.color] ?? '#8696A0' }}
                />
                <span className="flex-1 text-sm text-[#E9EDEF]">{label.name}</span>
                {isToggling ? (
                  <span className="h-4 w-4 rounded border border-white/20 shrink-0 animate-pulse bg-white/10" />
                ) : (
                  <span
                    className={`h-4 w-4 rounded border shrink-0 flex items-center justify-center transition ${
                      checked
                        ? 'border-[#25D366] bg-[#25D366]'
                        : 'border-white/20 bg-transparent'
                    }`}
                  >
                    {checked && (
                      <svg viewBox="0 0 10 8" className="h-2.5 w-2.5 fill-[#111B21]">
                        <path d="M1 4l2.5 2.5L9 1" stroke="#111B21" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </span>
                )}
              </button>
            )
          })
        )}
      </div>
    </div>
  )
}
