'use client'

import { useEffect, useState } from 'react'
import {
  User,
  X,
  Phone,
  Tag,
  Mail,
  FileText,
  Pin,
  BellOff,
  Archive,
  Ban,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { Contact, ChatDetails } from '@/types/database'
import { getChatDetails } from '@/services/uazapi/chat'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ContactDetailsPanelProps {
  open: boolean
  contact: Contact
  instanceToken: string
  onClose: () => void
  onBlockToggle?: (blocked: boolean) => void
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const LABEL_COLORS: Record<number, string> = {
  1: 'bg-[#FF2B2B]',
  2: 'bg-[#FF6600]',
  3: 'bg-[#FFCC00]',
  4: 'bg-[#00D26A]',
  5: 'bg-[#00B0FF]',
  6: 'bg-[#7B61FF]',
  7: 'bg-[#FF5E94]',
}

function labelColorClass(index: number): string {
  return LABEL_COLORS[(index % 7) + 1] ?? 'bg-[#8696A0]'
}

function formatPhone(phone: string): string {
  if (phone.length < 10) return phone
  return phone.replace(/(\d{2})(\d{2})(\d{5})(\d{4})/, '+$1 ($2) $3-$4')
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SkeletonLine({ width }: { width: string }) {
  return <div className={`h-3 animate-pulse rounded bg-white/10 ${width}`} />
}

function LoadingSkeleton() {
  return (
    <div className="flex flex-col items-center gap-4 p-6">
      <div className="h-24 w-24 animate-pulse rounded-full bg-white/10" />
      <SkeletonLine width="w-40" />
      <SkeletonLine width="w-28" />
      <div className="mt-4 w-full space-y-3">
        <SkeletonLine width="w-full" />
        <SkeletonLine width="w-3/4" />
        <SkeletonLine width="w-full" />
      </div>
    </div>
  )
}

interface SectionRowProps {
  icon: React.ReactNode
  label: string
  value?: string | null
}

function SectionRow({ icon, label, value }: SectionRowProps) {
  if (!value) return null
  return (
    <div className="flex items-start gap-3 py-3">
      <span className="mt-0.5 text-[#8696A0]">{icon}</span>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-[#8696A0]">{label}</p>
        <p className="mt-0.5 break-words text-sm text-[#E9EDEF]">{value}</p>
      </div>
    </div>
  )
}

interface ActionButtonProps {
  icon: React.ReactNode
  label: string
  onClick: () => void
  danger?: boolean
}

function ActionButton({ icon, label, onClick, danger }: ActionButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-4 px-6 py-4 text-sm transition-colors hover:bg-white/5 ${
        danger ? 'text-red-400' : 'text-[#E9EDEF]'
      }`}
    >
      <span className={danger ? 'text-red-400' : 'text-[#8696A0]'}>{icon}</span>
      {label}
    </button>
  )
}

interface CollapsibleSectionProps {
  title: string
  children: React.ReactNode
}

function CollapsibleSection({ title, children }: CollapsibleSectionProps) {
  const [expanded, setExpanded] = useState(true)

  return (
    <div className="border-t border-white/5">
      <button
        onClick={() => setExpanded((prev) => !prev)}
        className="flex w-full items-center justify-between px-6 py-4 text-sm font-medium text-[#8696A0] hover:bg-white/5"
      >
        {title}
        {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>
      {expanded && <div className="px-6 pb-4">{children}</div>}
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ContactDetailsPanel({
  open,
  contact,
  instanceToken,
  onClose,
  onBlockToggle,
}: ContactDetailsPanelProps) {
  const [details, setDetails] = useState<ChatDetails | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [blockConfirmOpen, setBlockConfirmOpen] = useState(false)

  useEffect(() => {
    if (!open) return

    let cancelled = false

    async function fetchDetails() {
      setLoading(true)
      setError(null)
      setDetails(null)

      try {
        const result = await getChatDetails(instanceToken, { number: contact.phone_number })
        if (!cancelled) {
          setDetails(result as ChatDetails)
        }
      } catch (err) {
        if (!cancelled) {
          setError('Não foi possível carregar os detalhes do contato.')
          console.error('[ContactDetailsPanel] getChatDetails failed:', err)
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    fetchDetails()

    return () => {
      cancelled = true
    }
  }, [open, contact.phone_number, instanceToken])

  // Reset block confirmation when panel closes
  useEffect(() => {
    if (!open) setBlockConfirmOpen(false)
  }, [open])

  const displayName =
    details?.wa_contactName ?? details?.wa_name ?? details?.lead_name ?? contact.name ?? formatPhone(contact.phone_number)

  const profilePic = details?.image ?? contact.profile_pic_url ?? null

  const isBlocked = details?.wa_isBlocked ?? contact.is_blocked ?? false

  function handleBlockToggle() {
    if (!blockConfirmOpen) {
      setBlockConfirmOpen(true)
      return
    }
    setBlockConfirmOpen(false)
    onBlockToggle?.(!isBlocked)
  }

  return (
    <>
      {/* Overlay — click to close */}
      <div
        aria-hidden="true"
        className={`absolute inset-0 z-20 bg-black/30 transition-opacity duration-300 ${
          open ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={onClose}
      />

      {/* Panel */}
      <aside
        role="complementary"
        aria-label="Info do contato"
        className={`absolute right-0 top-0 z-30 flex h-full w-[380px] flex-col overflow-y-auto bg-[#111B21] shadow-2xl transition-transform duration-300 ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* ── Header ── */}
        <div className="flex flex-shrink-0 items-center gap-4 bg-[#202C33] px-6 py-5">
          <button
            onClick={onClose}
            className="rounded-full p-1 text-[#8696A0] transition-colors hover:bg-white/10 hover:text-[#E9EDEF]"
            aria-label="Fechar painel"
          >
            <X className="h-5 w-5" />
          </button>
          <h2 className="text-base font-medium text-[#E9EDEF]">Info do contato</h2>
        </div>

        {loading && <LoadingSkeleton />}

        {error && (
          <div className="m-6 rounded-lg bg-red-900/30 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        {!loading && (
          <>
            {/* ── Profile section ── */}
            <div className="flex flex-col items-center gap-3 border-b border-white/5 py-8">
              <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full bg-[#202C33] text-[#25D366]">
                {profilePic ? (
                  <img
                    src={profilePic}
                    alt={displayName}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <User className="h-12 w-12" />
                )}
              </div>
              <div className="text-center">
                <p className="text-lg font-semibold text-[#E9EDEF]">{displayName}</p>
                <p className="mt-1 flex items-center gap-1.5 text-sm text-[#8696A0]">
                  <Phone className="h-3.5 w-3.5" />
                  {formatPhone(contact.phone_number)}
                </p>
              </div>
            </div>

            {/* ── About / Status ── */}
            {(details?.wa_name || details?.wa_contactName) && (
              <div className="border-b border-white/5 px-6 py-4">
                <p className="text-xs text-[#8696A0]">Nome no WhatsApp</p>
                <p className="mt-1 text-sm text-[#E9EDEF]">
                  {details.wa_contactName ?? details.wa_name}
                </p>
              </div>
            )}

            {/* ── Labels section ── */}
            {details?.wa_label && details.wa_label.length > 0 && (
              <div className="border-b border-white/5 px-6 py-4">
                <p className="mb-2 flex items-center gap-2 text-xs text-[#8696A0]">
                  <Tag className="h-3.5 w-3.5" />
                  Etiquetas
                </p>
                <div className="flex flex-wrap gap-2">
                  {details.wa_label.map((label, index) => (
                    <span
                      key={label}
                      className={`rounded-full px-3 py-1 text-xs font-medium text-white ${labelColorClass(index)}`}
                    >
                      {label}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* ── Lead / CRM section (collapsible) ── */}
            {(details?.lead_name ||
              details?.lead_email ||
              details?.lead_status ||
              details?.lead_notes ||
              (details?.lead_tags && details.lead_tags.length > 0) ||
              details?.lead_isTicketOpen !== undefined ||
              details?.lead_assignedAttendant_id) && (
              <CollapsibleSection title="CRM / Lead">
                <div className="divide-y divide-white/5">
                  <SectionRow
                    icon={<User className="h-4 w-4" />}
                    label="Nome do lead"
                    value={details?.lead_name}
                  />
                  <SectionRow
                    icon={<Mail className="h-4 w-4" />}
                    label="E-mail"
                    value={details?.lead_email}
                  />
                  <SectionRow
                    icon={<FileText className="h-4 w-4" />}
                    label="Status"
                    value={details?.lead_status}
                  />
                  <SectionRow
                    icon={<FileText className="h-4 w-4" />}
                    label="Notas"
                    value={details?.lead_notes}
                  />
                </div>

                {details?.lead_tags && details.lead_tags.length > 0 && (
                  <div className="mt-3">
                    <p className="mb-2 text-xs text-[#8696A0]">Tags</p>
                    <div className="flex flex-wrap gap-2">
                      {details.lead_tags.map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full bg-[#202C33] px-3 py-1 text-xs text-[#E9EDEF]"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {details?.lead_isTicketOpen !== undefined && (
                  <div className="mt-3 flex items-center gap-2">
                    <span className="text-xs text-[#8696A0]">Ticket:</span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        details.lead_isTicketOpen
                          ? 'bg-[#25D366]/20 text-[#25D366]'
                          : 'bg-white/10 text-[#8696A0]'
                      }`}
                    >
                      {details.lead_isTicketOpen ? 'Aberto' : 'Fechado'}
                    </span>
                  </div>
                )}

                {details?.lead_assignedAttendant_id && (
                  <div className="mt-3 flex items-center gap-2">
                    <span className="text-xs text-[#8696A0]">Atendente:</span>
                    <span className="text-xs text-[#E9EDEF]">
                      {details.lead_assignedAttendant_id}
                    </span>
                  </div>
                )}
              </CollapsibleSection>
            )}

            {/* ── Actions section ── */}
            <div className="mt-auto border-t border-white/5">
              <ActionButton
                icon={<BellOff className="h-5 w-5" />}
                label="Silenciar notificações"
                onClick={() => {}}
              />
              <ActionButton
                icon={<Pin className="h-5 w-5" />}
                label={details?.wa_isPinned ? 'Desafixar conversa' : 'Fixar conversa'}
                onClick={() => {}}
              />
              <ActionButton
                icon={<Archive className="h-5 w-5" />}
                label={details?.wa_archived ? 'Desarquivar conversa' : 'Arquivar conversa'}
                onClick={() => {}}
              />

              {/* Block — with inline confirmation */}
              <div className="border-t border-white/5">
                <ActionButton
                  icon={<Ban className="h-5 w-5" />}
                  label={isBlocked ? 'Desbloquear contato' : 'Bloquear contato'}
                  onClick={handleBlockToggle}
                  danger
                />
                {blockConfirmOpen && (
                  <div className="mx-6 mb-4 rounded-lg bg-red-900/30 px-4 py-3">
                    <p className="text-xs text-red-300">
                      {isBlocked
                        ? 'Deseja desbloquear este contato?'
                        : 'Deseja bloquear este contato? Ele não poderá enviar mensagens.'}
                    </p>
                    <div className="mt-3 flex gap-3">
                      <button
                        onClick={handleBlockToggle}
                        className="flex-1 rounded-md bg-red-600 py-1.5 text-xs font-medium text-white hover:bg-red-700"
                      >
                        Confirmar
                      </button>
                      <button
                        onClick={() => setBlockConfirmOpen(false)}
                        className="flex-1 rounded-md bg-white/10 py-1.5 text-xs font-medium text-[#E9EDEF] hover:bg-white/20"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </aside>
    </>
  )
}
