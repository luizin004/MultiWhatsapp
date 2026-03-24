'use client'

import { useState } from 'react'
import { X, Shield, Wifi, Store, Package, ChevronDown, ChevronUp } from 'lucide-react'
import { updatePresence } from '@/services/uazapi/instance'
import PrivacySettings from './PrivacySettings'
import ProxySettings from './ProxySettings'
import BusinessProfileEditor from './BusinessProfileEditor'
import CatalogViewer from './CatalogViewer'

interface InstanceSettingsProps {
  open: boolean
  instanceToken: string
  instanceName: string
  onClose: () => void
}

interface SectionProps {
  id: string
  title: string
  icon: React.ReactNode
  expanded: boolean
  onToggle: () => void
  children: React.ReactNode
}

function Section({ title, icon, expanded, onToggle, children }: SectionProps) {
  return (
    <div className="border-t border-white/5">
      <button
        onClick={onToggle}
        className="flex w-full items-center justify-between px-6 py-4 text-left hover:bg-white/5"
      >
        <div className="flex items-center gap-3">
          <span className="text-[#8696A0]">{icon}</span>
          <span className="text-sm font-medium text-[#E9EDEF]">{title}</span>
        </div>
        {expanded
          ? <ChevronUp className="h-4 w-4 text-[#8696A0]" />
          : <ChevronDown className="h-4 w-4 text-[#8696A0]" />}
      </button>
      {expanded && <div className="px-6 pb-5">{children}</div>}
    </div>
  )
}

type SectionId = 'privacy' | 'presence' | 'proxy' | 'business' | 'catalog'

export default function InstanceSettings({
  open,
  instanceToken,
  instanceName,
  onClose,
}: InstanceSettingsProps) {
  const [expanded, setExpanded] = useState<SectionId | null>(null)
  const [presence, setPresence] = useState<'available' | 'unavailable'>('available')
  const [presenceStatus, setPresenceStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')

  function toggleSection(id: SectionId) {
    setExpanded((prev) => (prev === id ? null : id))
  }

  async function handlePresenceToggle() {
    const next = presence === 'available' ? 'unavailable' : 'available'
    setPresenceStatus('saving')
    try {
      await updatePresence(instanceToken, { presence: next })
      setPresence(next)
      setPresenceStatus('saved')
      setTimeout(() => setPresenceStatus('idle'), 2000)
    } catch {
      setPresenceStatus('error')
      setTimeout(() => setPresenceStatus('idle'), 3000)
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div
        aria-hidden="true"
        className={`absolute inset-0 z-20 bg-black/40 transition-opacity duration-300 ${
          open ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={onClose}
      />

      {/* Slide-in panel */}
      <aside
        role="complementary"
        aria-label="Configurações da instância"
        className={`absolute right-0 top-0 z-30 flex h-full w-[420px] flex-col bg-[#111B21] shadow-2xl transition-transform duration-300 ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex flex-shrink-0 items-center gap-4 bg-[#202C33] px-6 py-5">
          <button
            onClick={onClose}
            className="rounded-full p-1 text-[#8696A0] transition-colors hover:bg-white/10 hover:text-[#E9EDEF]"
            aria-label="Fechar configurações"
          >
            <X className="h-5 w-5" />
          </button>
          <div>
            <h2 className="text-base font-medium text-[#E9EDEF]">Configurações</h2>
            <p className="text-xs text-[#8696A0]">{instanceName}</p>
          </div>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto">
          {/* 1. Privacidade */}
          <Section
            id="privacy"
            title="Privacidade"
            icon={<Shield className="h-4 w-4" />}
            expanded={expanded === 'privacy'}
            onToggle={() => toggleSection('privacy')}
          >
            <PrivacySettings instanceToken={instanceToken} />
          </Section>

          {/* 2. Presença */}
          <Section
            id="presence"
            title="Presença"
            icon={
              <span className={`h-2 w-2 rounded-full ${presence === 'available' ? 'bg-[#25D366]' : 'bg-[#8696A0]'}`} />
            }
            expanded={expanded === 'presence'}
            onToggle={() => toggleSection('presence')}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[#E9EDEF]">
                  {presence === 'available' ? 'Online' : 'Offline'}
                </p>
                <p className="text-xs text-[#8696A0]">
                  {presence === 'available'
                    ? 'Instância aparece como online'
                    : 'Instância aparece como offline'}
                </p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <button
                  onClick={handlePresenceToggle}
                  disabled={presenceStatus === 'saving'}
                  className={`relative h-6 w-11 rounded-full transition-colors disabled:opacity-60 ${
                    presence === 'available' ? 'bg-[#25D366]' : 'bg-white/20'
                  }`}
                  aria-label="Alternar presença"
                >
                  <span
                    className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                      presence === 'available' ? 'left-5' : 'left-0.5'
                    }`}
                  />
                </button>
                {presenceStatus === 'saved' && (
                  <span className="text-xs text-[#25D366]">Salvo</span>
                )}
                {presenceStatus === 'error' && (
                  <span className="text-xs text-[#f7a8a2]">Erro</span>
                )}
              </div>
            </div>
          </Section>

          {/* 3. Proxy */}
          <Section
            id="proxy"
            title="Proxy"
            icon={<Wifi className="h-4 w-4" />}
            expanded={expanded === 'proxy'}
            onToggle={() => toggleSection('proxy')}
          >
            <ProxySettings instanceToken={instanceToken} />
          </Section>

          {/* 4. Perfil Comercial */}
          <Section
            id="business"
            title="Perfil Comercial"
            icon={<Store className="h-4 w-4" />}
            expanded={expanded === 'business'}
            onToggle={() => toggleSection('business')}
          >
            <BusinessProfileEditor instanceToken={instanceToken} />
          </Section>

          {/* 5. Catálogo */}
          <Section
            id="catalog"
            title="Catálogo"
            icon={<Package className="h-4 w-4" />}
            expanded={expanded === 'catalog'}
            onToggle={() => toggleSection('catalog')}
          >
            <CatalogViewer instanceToken={instanceToken} />
          </Section>
        </div>
      </aside>
    </>
  )
}
