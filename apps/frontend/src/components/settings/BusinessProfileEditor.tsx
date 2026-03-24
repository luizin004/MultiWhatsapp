'use client'

import { useEffect, useState } from 'react'
import { Store } from 'lucide-react'
import { getBusinessProfile, updateBusinessProfile } from '@/services/uazapi/instance'

interface BusinessProfileEditorProps {
  instanceToken: string
}

interface ProfileFields {
  description: string
  address: string
  email: string
}

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

export default function BusinessProfileEditor({ instanceToken }: BusinessProfileEditorProps) {
  const [fields, setFields] = useState<ProfileFields>({ description: '', address: '', email: '' })
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')

  useEffect(() => {
    let cancelled = false

    async function fetchProfile() {
      setLoading(true)
      setFetchError(null)
      try {
        const result = await getBusinessProfile(instanceToken, {}) as Record<string, unknown>
        if (!cancelled) {
          setFields({
            description: String(result?.description ?? ''),
            address: String(result?.address ?? ''),
            email: String(result?.email ?? ''),
          })
        }
      } catch {
        if (!cancelled) setFetchError('Não foi possível carregar o perfil comercial.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchProfile()
    return () => { cancelled = true }
  }, [instanceToken])

  function handleChange(field: keyof ProfileFields, value: string) {
    setFields((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSave() {
    setSaveStatus('saving')
    try {
      await updateBusinessProfile(instanceToken, {
        description: fields.description || undefined,
        address: fields.address || undefined,
        email: fields.email || undefined,
      })
      setSaveStatus('saved')
      setTimeout(() => setSaveStatus('idle'), 2500)
    } catch {
      setSaveStatus('error')
      setTimeout(() => setSaveStatus('idle'), 3000)
    }
  }

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => <div key={i} className="h-12 animate-pulse rounded-xl bg-white/5" />)}
      </div>
    )
  }

  if (fetchError) {
    return <p className="text-sm text-[#f7a8a2]">{fetchError}</p>
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="mb-1 block text-xs text-[#8696A0]">Descrição</label>
        <textarea
          value={fields.description}
          onChange={(e) => handleChange('description', e.target.value)}
          placeholder="Descrição do negócio"
          rows={3}
          className="w-full resize-none rounded-xl border border-white/10 bg-[#0B141A] px-4 py-2.5 text-sm text-[#E9EDEF] placeholder:text-[#8696A0] focus:border-[#25D366] focus:outline-none"
        />
      </div>

      <div>
        <label className="mb-1 block text-xs text-[#8696A0]">Endereço</label>
        <input
          type="text"
          value={fields.address}
          onChange={(e) => handleChange('address', e.target.value)}
          placeholder="Endereço comercial"
          className="w-full rounded-xl border border-white/10 bg-[#0B141A] px-4 py-2.5 text-sm text-[#E9EDEF] placeholder:text-[#8696A0] focus:border-[#25D366] focus:outline-none"
        />
      </div>

      <div>
        <label className="mb-1 block text-xs text-[#8696A0]">E-mail</label>
        <input
          type="email"
          value={fields.email}
          onChange={(e) => handleChange('email', e.target.value)}
          placeholder="email@empresa.com"
          className="w-full rounded-xl border border-white/10 bg-[#0B141A] px-4 py-2.5 text-sm text-[#E9EDEF] placeholder:text-[#8696A0] focus:border-[#25D366] focus:outline-none"
        />
      </div>

      <div className="flex items-center gap-3 pt-1">
        <button
          onClick={handleSave}
          disabled={saveStatus === 'saving'}
          className="rounded-full bg-[#25D366] px-5 py-2 text-sm font-medium text-[#111B21] transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {saveStatus === 'saving' ? 'Salvando…' : 'Salvar perfil'}
        </button>
        {saveStatus === 'saved' && <span className="text-xs text-[#25D366]">Salvo com sucesso</span>}
        {saveStatus === 'error' && <span className="text-xs text-[#f7a8a2]">Erro ao salvar</span>}
      </div>
    </div>
  )
}
