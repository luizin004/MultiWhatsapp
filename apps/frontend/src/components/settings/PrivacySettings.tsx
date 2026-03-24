'use client'

import { useEffect, useState } from 'react'
import { Shield } from 'lucide-react'
import { getPrivacy, updatePrivacy, PrivacySettings as PrivacyData } from '@/services/uazapi/instance'

interface PrivacySettingsProps {
  instanceToken: string
}

type FieldStatus = 'idle' | 'saving' | 'saved' | 'error'

interface FieldFeedback {
  [key: string]: FieldStatus
}

const ALL_CONTACTS_NONE = ['all', 'contacts', 'contact_blacklist', 'none'] as const
const ALL_NONE = ['all', 'none'] as const
const ALL_KNOWN = ['all', 'known'] as const
const ALL_MATCH = ['all', 'match_last_seen'] as const

const FIELD_LABELS: Record<keyof PrivacyData, string> = {
  groupadd: 'Quem pode adicionar a grupos',
  last: 'Visto por último',
  status: 'Status / Recado',
  profile: 'Foto de perfil',
  readreceipts: 'Confirmação de leitura',
  online: 'Status online',
  calladd: 'Chamadas',
}

const FIELD_OPTIONS: Record<keyof PrivacyData, readonly string[]> = {
  groupadd: ALL_CONTACTS_NONE,
  last: ALL_CONTACTS_NONE,
  status: ALL_CONTACTS_NONE,
  profile: ALL_CONTACTS_NONE,
  readreceipts: ALL_NONE,
  online: ALL_MATCH,
  calladd: ALL_KNOWN,
}

const OPTION_LABELS: Record<string, string> = {
  all: 'Todos',
  contacts: 'Contatos',
  contact_blacklist: 'Lista negra',
  none: 'Ninguém',
  match_last_seen: 'Igual ao visto por último',
  known: 'Conhecidos',
}

const ORDERED_FIELDS: (keyof PrivacyData)[] = [
  'groupadd', 'last', 'status', 'profile', 'readreceipts', 'online', 'calladd',
]

export default function PrivacySettings({ instanceToken }: PrivacySettingsProps) {
  const [privacy, setPrivacy] = useState<PrivacyData>({})
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [fieldStatus, setFieldStatus] = useState<FieldFeedback>({})

  useEffect(() => {
    let cancelled = false

    async function fetchPrivacy() {
      setLoading(true)
      setFetchError(null)
      try {
        const result = await getPrivacy(instanceToken)
        if (!cancelled) setPrivacy(result as PrivacyData)
      } catch {
        if (!cancelled) setFetchError('Não foi possível carregar as configurações de privacidade.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchPrivacy()
    return () => { cancelled = true }
  }, [instanceToken])

  async function handleFieldChange(field: keyof PrivacyData, value: string) {
    const updated = { ...privacy, [field]: value }
    setPrivacy(updated)
    setFieldStatus((prev) => ({ ...prev, [field]: 'saving' }))

    try {
      await updatePrivacy(instanceToken, { [field]: value })
      setFieldStatus((prev) => ({ ...prev, [field]: 'saved' }))
      setTimeout(() => setFieldStatus((prev) => ({ ...prev, [field]: 'idle' })), 2000)
    } catch {
      setPrivacy((prev) => ({ ...prev }))
      setFieldStatus((prev) => ({ ...prev, [field]: 'error' }))
      setTimeout(() => setFieldStatus((prev) => ({ ...prev, [field]: 'idle' })), 3000)
    }
  }

  if (loading) {
    return (
      <div className="space-y-3">
        {ORDERED_FIELDS.map((f) => (
          <div key={f} className="h-12 animate-pulse rounded-xl bg-white/5" />
        ))}
      </div>
    )
  }

  if (fetchError) {
    return <p className="text-sm text-[#f7a8a2]">{fetchError}</p>
  }

  return (
    <div className="space-y-3">
      {ORDERED_FIELDS.map((field) => {
        const status = fieldStatus[field] ?? 'idle'
        return (
          <div key={field} className="flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <label className="mb-1 block text-xs text-[#8696A0]">{FIELD_LABELS[field]}</label>
              <select
                value={(privacy[field] as string) ?? ''}
                onChange={(e) => handleFieldChange(field, e.target.value)}
                disabled={status === 'saving'}
                className="w-full rounded-xl border border-white/10 bg-[#0B141A] px-4 py-2.5 text-sm text-[#E9EDEF] focus:border-[#25D366] focus:outline-none disabled:opacity-60"
              >
                <option value="" disabled>Selecionar...</option>
                {FIELD_OPTIONS[field].map((opt) => (
                  <option key={opt} value={opt}>{OPTION_LABELS[opt] ?? opt}</option>
                ))}
              </select>
            </div>
            <div className="mt-5 w-16 text-right text-xs">
              {status === 'saving' && <span className="text-[#8696A0]">Salvando…</span>}
              {status === 'saved' && <span className="text-[#25D366]">Salvo</span>}
              {status === 'error' && <span className="text-[#f7a8a2]">Erro</span>}
            </div>
          </div>
        )
      })}
    </div>
  )
}
