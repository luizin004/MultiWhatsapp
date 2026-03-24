'use client'

import { useEffect, useState } from 'react'
import { Wifi, WifiOff } from 'lucide-react'
import { getProxy, updateProxy, deleteProxy } from '@/services/uazapi/instance'

interface ProxySettingsProps {
  instanceToken: string
}

interface ProxyState {
  enabled: boolean
  url: string
}

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

export default function ProxySettings({ instanceToken }: ProxySettingsProps) {
  const [proxy, setProxy] = useState<ProxyState>({ enabled: false, url: '' })
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const [deleteStatus, setDeleteStatus] = useState<SaveStatus>('idle')

  useEffect(() => {
    let cancelled = false

    async function fetchProxy() {
      setLoading(true)
      setFetchError(null)
      try {
        const result = await getProxy(instanceToken) as Record<string, unknown>
        if (!cancelled) {
          setProxy({
            enabled: Boolean(result?.enable ?? result?.enabled ?? false),
            url: String(result?.proxy_url ?? result?.url ?? ''),
          })
        }
      } catch {
        if (!cancelled) setFetchError('Não foi possível carregar as configurações de proxy.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchProxy()
    return () => { cancelled = true }
  }, [instanceToken])

  async function handleSave() {
    setSaveStatus('saving')
    try {
      await updateProxy(instanceToken, {
        enable: proxy.enabled,
        ...(proxy.enabled && proxy.url ? { proxy_url: proxy.url } : {}),
      })
      setSaveStatus('saved')
      setTimeout(() => setSaveStatus('idle'), 2000)
    } catch {
      setSaveStatus('error')
      setTimeout(() => setSaveStatus('idle'), 3000)
    }
  }

  async function handleDelete() {
    setDeleteStatus('saving')
    try {
      await deleteProxy(instanceToken)
      setProxy({ enabled: false, url: '' })
      setDeleteStatus('saved')
      setTimeout(() => setDeleteStatus('idle'), 2000)
    } catch {
      setDeleteStatus('error')
      setTimeout(() => setDeleteStatus('idle'), 3000)
    }
  }

  if (loading) {
    return <div className="h-28 animate-pulse rounded-xl bg-white/5" />
  }

  if (fetchError) {
    return <p className="text-sm text-[#f7a8a2]">{fetchError}</p>
  }

  return (
    <div className="space-y-4">
      {/* Enable toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {proxy.enabled
            ? <Wifi className="h-4 w-4 text-[#25D366]" />
            : <WifiOff className="h-4 w-4 text-[#8696A0]" />}
          <span className="text-sm text-[#E9EDEF]">
            {proxy.enabled ? 'Proxy ativado' : 'Proxy desativado'}
          </span>
        </div>
        <button
          onClick={() => setProxy((prev) => ({ ...prev, enabled: !prev.enabled }))}
          className={`relative h-6 w-11 rounded-full transition-colors ${
            proxy.enabled ? 'bg-[#25D366]' : 'bg-white/20'
          }`}
          aria-label="Ativar/desativar proxy"
        >
          <span
            className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
              proxy.enabled ? 'left-5' : 'left-0.5'
            }`}
          />
        </button>
      </div>

      {/* URL input — only when enabled */}
      {proxy.enabled && (
        <div>
          <label className="mb-1 block text-xs text-[#8696A0]">URL do Proxy</label>
          <input
            type="text"
            value={proxy.url}
            onChange={(e) => setProxy((prev) => ({ ...prev, url: e.target.value }))}
            placeholder="http://usuario:senha@host:porta"
            className="w-full rounded-xl border border-white/10 bg-[#0B141A] px-4 py-2.5 text-sm text-[#E9EDEF] placeholder:text-[#8696A0] focus:border-[#25D366] focus:outline-none"
          />
        </div>
      )}

      {/* Action buttons */}
      <div className="flex items-center gap-3 pt-1">
        <button
          onClick={handleSave}
          disabled={saveStatus === 'saving'}
          className="rounded-full bg-[#25D366] px-5 py-2 text-sm font-medium text-[#111B21] transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {saveStatus === 'saving' ? 'Salvando…' : 'Salvar'}
        </button>

        <button
          onClick={handleDelete}
          disabled={deleteStatus === 'saving'}
          className="rounded-full border border-white/10 px-5 py-2 text-sm text-[#f7a8a2] transition-colors hover:bg-white/5 disabled:opacity-60"
        >
          {deleteStatus === 'saving' ? 'Removendo…' : 'Remover proxy'}
        </button>

        {saveStatus === 'saved' && <span className="text-xs text-[#25D366]">Salvo com sucesso</span>}
        {saveStatus === 'error' && <span className="text-xs text-[#f7a8a2]">Erro ao salvar</span>}
        {deleteStatus === 'saved' && <span className="text-xs text-[#25D366]">Proxy removido</span>}
        {deleteStatus === 'error' && <span className="text-xs text-[#f7a8a2]">Erro ao remover</span>}
      </div>
    </div>
  )
}
