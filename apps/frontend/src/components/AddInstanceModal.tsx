"use client"

import { FormEvent, ReactNode, useMemo, useState } from "react"
import { supabase } from "@/lib/supabase"
import { InstanceWithContacts } from "@/types/database"
import FormField from "@/components/FormField"
import {
  baseFields,
  advancedFields,
  initialForm,
  FormState,
  FieldConfig,
  ConnectionMode
} from "@/features/add-contact/form-config"
import { Copy, Loader2, X, ChevronDown, ChevronUp, KeyRound, QrCode } from "lucide-react"

interface AddInstanceModalProps {
  open: boolean
  onClose: () => void
  onInstanceCreated: (instance: InstanceWithContacts) => void
}

interface ConnectionResultState {
  mode: ConnectionMode
  status?: string
  paircode?: string
  qrcode?: string
  token: string
  instanceName: string
}

const instructions = [
  'O sistema tenta registrar o webhook automaticamente. Caso precise fazer manualmente:',
  "Envie a URL abaixo no endpoint /webhook da Uazapi.",
  "No payload, use action: 'add' e habilite a instancia (enabled: true).",
  "Inclua os eventos necessários (messages, connection ou groups) e marque excludeMessages: wasSentByApi."
]

const selectWithContacts = `
  *,
  contacts:contacts(*)
`

const Section = ({ title, children, layout }: { title: string; children: ReactNode; layout?: string }) => (
  <section>
    <p className="text-[11px] font-semibold uppercase tracking-wide text-[#8696A0]">{title}</p>
    <div className={layout || "mt-3 grid gap-3"}>{children}</div>
  </section>
)

const connectionModeLabels: Record<ConnectionMode, { title: string; description: string; icon: ReactNode }> = {
  paircode: {
    title: 'Código de pareamento',
    description: 'Gera um código de 8 dígitos para ser digitado em WhatsApp > Aparelhos conectados.',
    icon: <KeyRound className="h-4 w-4" />
  },
  qrcode: {
    title: 'QR Code',
    description: 'Mostra um QR code para leitura direta no WhatsApp.',
    icon: <QrCode className="h-4 w-4" />
  }
}

export default function AddInstanceModal({ open, onClose, onInstanceCreated }: AddInstanceModalProps) {
  const [form, setForm] = useState<FormState>(initialForm)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [webhookUrl, setWebhookUrl] = useState<string | null>(null)
  const [isRegisteringWebhook, setIsRegisteringWebhook] = useState(false)
  const [webhookFeedback, setWebhookFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [connectionResult, setConnectionResult] = useState<ConnectionResultState | null>(null)
  const [showConnectionPopup, setShowConnectionPopup] = useState(false)
  const [copiedField, setCopiedField] = useState<string | null>(null)
  const edgeBaseUrl = process.env.NEXT_PUBLIC_SUPABASE_EDGE_URL

  const log = (...args: unknown[]) => {
    console.log('[AddInstanceModal]', ...args)
  }

  const connectionStatusColor = useMemo(() => {
    if (!connectionResult?.status) return 'text-[#E9EDEF]'
    if (connectionResult.status.toLowerCase().includes('connect')) return 'text-[#7dd2a5]'
    if (connectionResult.status.toLowerCase().includes('erro')) return 'text-[#f7a8a2]'
    return 'text-[#E9EDEF]'
  }, [connectionResult?.status])

  const qrCodeSrc = useMemo(() => {
    if (!connectionResult?.qrcode) return null
    return connectionResult.qrcode.startsWith('data:')
      ? connectionResult.qrcode
      : `data:image/png;base64,${connectionResult.qrcode}`
  }, [connectionResult?.qrcode])

  const copyToClipboard = async (value: string, key: string) => {
    try {
      await navigator.clipboard.writeText(value)
      setCopiedField(key)
      setTimeout(() => {
        setCopiedField((current: string | null) => (current === key ? null : current))
      }, 2000)
    } catch (error) {
      console.error('Erro ao copiar para a área de transferência:', error)
    }
  }

  if (!open) return null

  const closeModal = () => {
    setForm(initialForm)
    setError(null)
    setWebhookUrl(null)
    setWebhookFeedback(null)
    setConnectionResult(null)
    setCopiedField(null)
    setShowAdvanced(false)
    setShowConnectionPopup(false)
    setIsRegisteringWebhook(false)
    onClose()
  }

  const handleChange = (field: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const normalizePhone = (phone?: string) => phone?.replace(/\D/g, '') || ''

  const sanitize = (value?: string) => {
    if (!value) return ''
    return value.trim()
  }

  const autoRegisterWebhook = async (instanceToken: string) => {
    try {
      log('Iniciando registro automático de webhook', { instanceToken })
      setIsRegisteringWebhook(true)
      setWebhookFeedback(null)

      const response = await fetch('/api/uazapi/webhook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ instanceToken })
      })

      const data = await response.json().catch(() => null)

      if (!response.ok || !data?.success) {
        const message = data?.error || 'Falha ao registrar webhook automaticamente.'
        throw new Error(message)
      }

      log('Webhook registrado com sucesso', data)
      setWebhookFeedback({ type: 'success', message: 'Webhook registrado automaticamente com a Uazapi.' })
    } catch (autoError) {
      const message = autoError instanceof Error ? autoError.message : 'Falha ao automatizar o webhook.'
      log('Falha ao registrar webhook', message)
      setWebhookFeedback({ type: 'error', message })
    } finally {
      setIsRegisteringWebhook(false)
    }
  }

  const saveInstanceToSupabase = async (params: {
    instanceName: string
    phoneNumber: string | null
    instanceToken: string
  }) => {
    const { instanceName, phoneNumber, instanceToken } = params
    log('Persistindo instância no Supabase', { instanceName, phoneNumber, instanceToken })
    const { data: existingInstance, error: fetchError } = await supabase
      .from('instances')
      .select(selectWithContacts)
      .eq('uazapi_instance_id', instanceToken)
      .maybeSingle()

    if (fetchError && fetchError.code !== 'PGRST116') {
      log('Erro ao buscar instância existente', fetchError)
      throw fetchError
    }

    if (existingInstance) {
      log('Instância já existe, atualizando registro', existingInstance.id)
      const { data: updatedInstance, error: updateError } = await supabase
        .from('instances')
        .update({
          name: instanceName,
          phone_number: phoneNumber,
          status: 'connecting'
        })
        .eq('id', existingInstance.id)
        .select(selectWithContacts)
        .single()

      if (updateError || !updatedInstance) {
        log('Erro ao atualizar instância', updateError)
        throw updateError || new Error('Nao foi possivel atualizar a instancia.')
      }

      return {
        ...(updatedInstance as InstanceWithContacts),
        contacts: updatedInstance.contacts || []
      }
    }

    log('Criando novo registro de instância')
    const { data: newInstance, error: createError } = await supabase
      .from('instances')
      .insert({
        name: instanceName,
        phone_number: phoneNumber,
        uazapi_instance_id: instanceToken,
        status: 'connecting'
      })
      .select(selectWithContacts)
      .single()

    if (createError || !newInstance) {
      log('Erro ao criar instância', createError)
      throw createError || new Error('Nao foi possivel criar a instancia.')
    }

    return {
      ...(newInstance as InstanceWithContacts),
      contacts: newInstance.contacts || []
    }
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsSubmitting(true)
    setError(null)
    setConnectionResult(null)

    try {
      const instanceName = sanitize(form.instanceName)
      const normalizedPhone = normalizePhone(form.instancePhone)
      const phoneForPayload = normalizedPhone || undefined
      const phoneForDb = normalizedPhone || null

      log('Submit form', { instanceName, normalizedPhone, connectionMode: form.connectionMode })

      if (!instanceName) {
        throw new Error('Informe o nome da instância.')
      }

      if (form.connectionMode === 'paircode' && !normalizedPhone) {
        throw new Error('Informe o número no formato internacional para gerar o código de pareamento.')
      }

      const payload: Record<string, unknown> = {
        name: instanceName,
        connectionMode: form.connectionMode
      }

      if (phoneForPayload) payload.phone = phoneForPayload
      ;['systemName', 'adminField01', 'adminField02', 'fingerprintProfile', 'browser'].forEach((key) => {
        const value = sanitize(form[key as keyof FormState] as string)
        if (value) {
          payload[key] = value
        }
      })

      if (!payload.fingerprintProfile) payload.fingerprintProfile = 'chrome'
      if (!payload.browser) payload.browser = 'chrome'
      if (!payload.systemName) payload.systemName = 'uazapiGO'

      const response = await fetch('/api/instances/create-and-connect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      })

      const data = await response.json().catch(() => null)

      log('Resposta da criação/conexão', { status: response.status, data })

      if (!response.ok || !data?.instanceToken) {
        const message = data?.error || 'Falha ao criar e conectar a instância na UAZAPI.'
        throw new Error(message)
      }

      const instanceRecord = await saveInstanceToSupabase({
        instanceName,
        phoneNumber: phoneForDb,
        instanceToken: data.instanceToken as string
      })

      onInstanceCreated(instanceRecord)

      if (edgeBaseUrl) {
        setWebhookUrl(`${edgeBaseUrl}?instance_token=${encodeURIComponent(data.instanceToken as string)}`)
      }

      await autoRegisterWebhook(data.instanceToken as string)

      log('Atualizando resultados de conexão', data.connection)
      setConnectionResult({
        mode: data.connectionMode as ConnectionMode,
        status: data.connection?.status,
        paircode: data.connection?.paircode,
        qrcode: data.connection?.qrcode,
        token: data.instanceToken,
        instanceName: data.instanceName || instanceName
      })
      setShowConnectionPopup(true)

      setForm((prev) => ({ ...initialForm, connectionMode: prev.connectionMode }))
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro desconhecido ao salvar a instancia.'
      log('Erro no handleSubmit', message, err)
      setError(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 px-4">
      <div className="w-full max-w-3xl overflow-hidden rounded-2xl border border-white/10 bg-[#111B21] shadow-[0_20px_70px_rgba(0,0,0,0.6)]">
        <div className="flex items-center justify-between border-b border-white/10 bg-[#202C33] px-6 py-4">
          <div>
            <h3 className="text-lg font-semibold text-[#E9EDEF]">Adicionar número do WhatsApp</h3>
            <p className="text-sm text-[#8696A0]">
              Criamos a instância, geramos o token e já iniciamos a conexão automaticamente.
            </p>
          </div>
          <button
            onClick={closeModal}
            className="rounded-full p-2 text-white/60 transition hover:bg-white/10 hover:text-white"
            aria-label="Fechar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="grid gap-5 px-6 py-6">
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <Section title="Dados principais">
              {baseFields.map(({ key, label, placeholder, required, helper, type }: FieldConfig) => (
                <FormField
                  key={String(key)}
                  label={label}
                  value={form[key] as string}
                  placeholder={placeholder}
                  required={required}
                  helper={helper}
                  type={type}
                  onChange={(value) => handleChange(key, value)}
                />
              ))}
            </Section>

            <Section title="Modo de conexão">
              <div className="mt-2 grid gap-3">
                {(Object.keys(connectionModeLabels) as ConnectionMode[]).map((mode) => {
                  const option = connectionModeLabels[mode]
                  const isActive = form.connectionMode === mode
                  return (
                    <button
                      type="button"
                      key={mode}
                      onClick={() => handleChange('connectionMode', mode)}
                      className={`flex items-start gap-3 rounded-2xl border px-4 py-3 text-left transition ${
                        isActive
                          ? 'border-[#25D366] bg-[#1f2c24] text-[#E9EDEF]'
                          : 'border-white/10 bg-[#0B141A] text-[#8696A0] hover:border-white/20'
                      }`}
                    >
                      <div
                        className={`mt-1 flex h-8 w-8 items-center justify-center rounded-full text-sm ${
                          isActive ? 'bg-[#25D366] text-[#111B21]' : 'bg-white/5 text-white/70'
                        }`}
                      >
                        {option.icon}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-[#E9EDEF]">{option.title}</p>
                        <p className="text-xs text-[#8696A0]">{option.description}</p>
                      </div>
                    </button>
                  )
                })}
                {form.connectionMode === 'paircode' && (
                  <p className="rounded-xl border border-dashed border-white/10 bg-[#0B141A] px-3 py-2 text-xs text-[#8696A0]">
                    Utilize o número no formato internacional (DDI + DDD + número). O código expira em até 5 minutos.
                  </p>
                )}
                {form.connectionMode === 'qrcode' && (
                  <p className="rounded-xl border border-dashed border-white/10 bg-[#0B141A] px-3 py-2 text-xs text-[#8696A0]">
                    Abra o WhatsApp no celular e leia o QR code na tela. O código é renovado pela UAZAPI a cada 2 minutos.
                  </p>
                )}
              </div>
            </Section>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#0B141A] p-4">
            <button
              type="button"
              onClick={() => setShowAdvanced((prev) => !prev)}
              className="flex w-full items-center justify-between text-sm font-medium text-[#E9EDEF]"
            >
              <span>Campos avançados (opcionais)</span>
              {showAdvanced ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
            {showAdvanced && (
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {advancedFields.map(({ key, label, placeholder, helper }: FieldConfig) => (
                  <FormField
                    key={String(key)}
                    label={label}
                    value={form[key] as string}
                    placeholder={placeholder}
                    helper={helper}
                    onChange={(value) => handleChange(key, value)}
                  />
                ))}
              </div>
            )}
          </div>

          {error && <p className="rounded-xl bg-[#3a1f21] px-4 py-2 text-sm text-[#f7a8a2]">{error}</p>}

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
            <button
              type="button"
              onClick={closeModal}
              className="rounded-full border border-white/10 px-4 py-2 text-sm font-medium text-[#E9EDEF] hover:bg-white/5"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-[#25D366] px-5 py-2 text-sm font-semibold text-[#111B21] transition hover:bg-[#1ed061] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {isSubmitting ? 'Configurando...' : 'Criar e conectar'}
            </button>
          </div>
        </form>

        {connectionResult && (
          <div className="border-t border-white/10 bg-gradient-to-br from-[#0B141A] to-[#081214] px-6 py-6">
            <div className="flex flex-col gap-4 lg:flex-row">
              <div className="flex-1 rounded-2xl border border-white/10 bg-white/5 p-5">
                <p className="text-sm font-semibold text-[#8696A0]">Instância criada</p>
                <p className="text-lg font-bold text-[#E9EDEF]">{connectionResult.instanceName}</p>
                {connectionResult.status && (
                  <p className={`mt-1 text-sm font-medium ${connectionStatusColor}`}>
                    Status: {connectionResult.status}
                  </p>
                )}
                <div className="mt-3 space-y-2 text-xs text-[#8696A0]">
                  <p>Use o token abaixo para qualquer chamada à UAZAPI.</p>
                  <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-[#111B21] px-3 py-2 text-[11px] text-[#E9EDEF]">
                    <span className="flex-1 truncate">{connectionResult.token}</span>
                    <button
                      onClick={() => copyToClipboard(connectionResult.token, 'token')}
                      className="inline-flex items-center gap-1 rounded-full border border-white/10 px-2 py-1 text-xs text-[#E9EDEF] hover:bg-white/10"
                    >
                      <Copy className="h-3 w-3" />
                      {copiedField === 'token' ? 'Copiado!' : 'Copiar'}
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex-1 rounded-2xl border border-white/10 bg-[#0B141A] p-5">
                <p className="text-sm font-semibold text-[#E9EDEF]">Como conectar</p>
                {connectionResult.mode === 'paircode' && connectionResult.paircode ? (
                  <div className="mt-3 space-y-3">
                    <p className="text-xs text-[#8696A0]">Abra o WhatsApp no celular → Aparelhos conectados → Conectar com código.</p>
                    <p className="text-3xl font-bold tracking-[0.4rem] text-[#7dd2a5]">
                      {connectionResult.paircode.replace(/(.{4})/g, '$1 ').trim()}
                    </p>
                    <button
                      onClick={() => copyToClipboard(connectionResult.paircode!, 'paircode')}
                      className="inline-flex items-center gap-2 rounded-full border border-[#25D366] px-4 py-2 text-sm font-semibold text-[#25D366] hover:bg-[#1f2c24]"
                    >
                      <Copy className="h-4 w-4" />
                      {copiedField === 'paircode' ? 'Copiado!' : 'Copiar código'}
                    </button>
                    <p className="text-xs text-[#8696A0]">O código expira em até 5 minutos.</p>
                  </div>
                ) : null}

                {connectionResult.mode === 'qrcode' && qrCodeSrc ? (
                  <div className="mt-3 space-y-3 text-center">
                    <p className="text-xs text-[#8696A0]">Leia o QR code no WhatsApp → Aparelhos conectados.</p>
                    <div className="mx-auto w-48 overflow-hidden rounded-2xl border border-white/20 bg-white p-3">
                      <img src={qrCodeSrc} alt="QR Code da instância" className="w-full" />
                    </div>
                    <p className="text-xs text-[#8696A0]">O QR code se renova automaticamente se expirar.</p>
                  </div>
                ) : null}

                {!connectionResult.paircode && !connectionResult.qrcode && (
                  <p className="mt-3 text-xs text-[#8696A0]">
                    Aguarde alguns segundos e consulte /instance/status para obter QRCode ou código atualizado.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {webhookUrl && (
          <div className="border-t border-white/10 bg-[#0B141A] px-6 py-5">
            <p className="text-sm font-semibold text-[#E9EDEF]">URL do webhook configurada para a instância</p>
            <div className="mt-2 flex flex-col gap-2 md:flex-row md:items-center">
              <div className="flex-1 truncate rounded-xl border border-white/10 bg-[#111B21] px-3 py-2 text-xs text-[#E9EDEF]">{webhookUrl}</div>
              <button
                onClick={() => copyToClipboard(webhookUrl, 'webhook')}
                className="inline-flex items-center gap-1 rounded-full border border-white/10 px-3 py-2 text-xs font-medium text-[#E9EDEF] hover:bg-white/5"
              >
                <Copy className="h-4 w-4" />
                {copiedField === 'webhook' ? 'Copiado!' : 'Copiar'}
              </button>
            </div>
            <div className="mt-3 space-y-2 text-xs text-[#8696A0]">
              {isRegisteringWebhook && <p>Registrando webhook automaticamente...</p>}
              {webhookFeedback && (
                <p
                  className={`rounded-xl px-3 py-2 font-medium ${
                    webhookFeedback.type === 'success' ? 'bg-[#233d2f] text-[#7dd2a5]' : 'bg-[#3a1f21] text-[#f7a8a2]'
                  }`}
                >
                  {webhookFeedback.message}
                </p>
              )}
            </div>
            <ul className="mt-3 list-disc space-y-1 pl-5 text-xs text-[#8696A0]">
              {instructions.map((text) => (
                <li key={text}>{text}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {showConnectionPopup && connectionResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4">
          <div className="relative w-full max-w-md rounded-2xl border border-white/10 bg-[#0B141A] p-6 shadow-[0_25px_80px_rgba(0,0,0,0.8)]">
            <button
              onClick={() => setShowConnectionPopup(false)}
              className="absolute right-3 top-3 rounded-full p-2 text-white/60 transition hover:bg-white/10 hover:text-white"
              aria-label="Fechar resumo de conexão"
            >
              <X className="h-4 w-4" />
            </button>

            <p className="text-[11px] font-semibold uppercase tracking-wide text-[#8696A0]">Instância pronta para conectar</p>
            <h4 className="mt-1 text-lg font-bold text-[#E9EDEF]">{connectionResult.instanceName}</h4>

            <div className="mt-4 space-y-2">
              <p className="text-xs text-[#8696A0]">Token da instância</p>
              <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-[#111B21] px-3 py-2 text-xs text-[#E9EDEF]">
                <span className="flex-1 truncate">{connectionResult.token}</span>
                <button
                  onClick={() => copyToClipboard(connectionResult.token, 'popup-token')}
                  className="inline-flex items-center gap-1 rounded-full border border-white/10 px-2 py-1 text-[11px] text-[#E9EDEF] hover:bg-white/10"
                >
                  <Copy className="h-3 w-3" />
                  {copiedField === 'popup-token' ? 'Copiado!' : 'Copiar'}
                </button>
              </div>
            </div>

            {connectionResult.mode === 'paircode' && connectionResult.paircode ? (
              <div className="mt-5 space-y-2">
                <p className="text-xs text-[#8696A0]">Código de pareamento</p>
                <p className="text-3xl font-bold tracking-[0.45rem] text-[#7dd2a5]">
                  {connectionResult.paircode.replace(/(.{4})/g, '$1 ').trim()}
                </p>
                <button
                  onClick={() => copyToClipboard(connectionResult.paircode!, 'popup-paircode')}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-[#25D366] px-4 py-2 text-sm font-semibold text-[#25D366] hover:bg-[#1f2c24]"
                >
                  <Copy className="h-4 w-4" />
                  {copiedField === 'popup-paircode' ? 'Copiado!' : 'Copiar código'}
                </button>
              </div>
            ) : null}

            {connectionResult.mode === 'qrcode' && qrCodeSrc ? (
              <div className="mt-5 space-y-3 text-center">
                <p className="text-xs text-[#8696A0]">Leia o QR code no WhatsApp em Aparelhos conectados.</p>
                <div className="mx-auto w-56 overflow-hidden rounded-2xl border border-white/10 bg-white p-4">
                  <img src={qrCodeSrc} alt="QR Code da instância" className="w-full" />
                </div>
              </div>
            ) : null}

            {!connectionResult.paircode && !connectionResult.qrcode && (
              <p className="mt-5 text-xs text-[#8696A0]">
                Assim que a UAZAPI enviar o código, ele aparecerá aqui.
              </p>
            )}

            {connectionResult.status && (
              <p className={`mt-4 text-xs font-semibold ${connectionStatusColor}`}>
                Status atual: {connectionResult.status}
              </p>
            )}

            <p className="mt-6 text-center text-[11px] text-[#8696A0]">
              Feche este pop-up quando terminar de conectar o WhatsApp.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
