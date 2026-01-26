"use client"

import { ReactNode, useState } from "react"
import { supabase } from "@/lib/supabase"
import { InstanceWithContacts } from "@/types/database"
import FormField from "@/components/FormField"
import { instanceFields, initialForm, FormState, FieldConfig } from "@/features/add-contact/form-config"
import { Copy, Loader2, X } from "lucide-react"

interface AddInstanceModalProps {
  open: boolean
  onClose: () => void
  onInstanceCreated: (instance: InstanceWithContacts) => void
}

const instructions = [
  'O sistema tenta registrar o webhook automaticamente. Caso precise fazer manualmente:',
  "Envie a URL abaixo no endpoint /webhook da Uazapi.",
  "No payload, use action: 'add' e habilite a instancia (enabled: true).",
  "Inclua os eventos necessários (messages, connection ou groups) e marque excludeMessages: wasSentByApi."
]

const Section = ({ title, children, layout }: { title: string; children: ReactNode; layout?: string }) => (
  <section>
    <p className="text-xs font-semibold uppercase text-slate-400">{title}</p>
    <div className={layout || "mt-2 grid gap-3"}>{children}</div>
  </section>
)

export default function AddInstanceModal({ open, onClose, onInstanceCreated }: AddInstanceModalProps) {
  const [form, setForm] = useState<FormState>(initialForm)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [webhookUrl, setWebhookUrl] = useState<string | null>(null)
  const [isRegisteringWebhook, setIsRegisteringWebhook] = useState(false)
  const [webhookFeedback, setWebhookFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const edgeBaseUrl = process.env.NEXT_PUBLIC_SUPABASE_EDGE_URL

  if (!open) return null

  const closeModal = () => {
    setForm(initialForm)
    setError(null)
    setWebhookUrl(null)
    setWebhookFeedback(null)
    setIsRegisteringWebhook(false)
    onClose()
  }

  const handleChange = (field: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const normalizePhone = (phone: string) => phone.replace(/\D/g, "")

  const autoRegisterWebhook = async (instanceToken: string) => {
    try {
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

      setWebhookFeedback({ type: 'success', message: 'Webhook registrado automaticamente com a Uazapi.' })
    } catch (autoError) {
      const message = autoError instanceof Error ? autoError.message : 'Falha ao automatizar o webhook.'
      setWebhookFeedback({ type: 'error', message })
    } finally {
      setIsRegisteringWebhook(false)
    }
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setIsSubmitting(true)
    setError(null)

    try {
      const normalizedPhone = normalizePhone(form.instancePhone)
      const instanceName = form.instanceName.trim()
      const instanceToken = form.instanceToken.trim()

      if (!instanceName || !normalizedPhone || !instanceToken) {
        throw new Error("Preencha nome, numero e token da instancia.")
      }

      const selectWithContacts = `
        *,
        contacts:contacts(*)
      `

      const { data: existingInstance, error: fetchError } = await supabase
        .from('instances')
        .select(selectWithContacts)
        .eq('uazapi_instance_id', instanceToken)
        .maybeSingle()

      if (fetchError && fetchError.code !== 'PGRST116') {
        throw fetchError
      }

      let instanceRecord: InstanceWithContacts | null = null

      if (existingInstance) {
        const { data: updatedInstance, error: updateError } = await supabase
          .from('instances')
          .update({
            name: instanceName,
            phone_number: normalizedPhone,
            status: 'connecting'
          })
          .eq('id', existingInstance.id)
          .select(selectWithContacts)
          .single()

        if (updateError || !updatedInstance) {
          throw updateError || new Error('Nao foi possivel atualizar a instancia.')
        }

        instanceRecord = {
          ...(updatedInstance as InstanceWithContacts),
          contacts: updatedInstance.contacts || []
        }
      } else {
        const { data: newInstance, error: createInstanceError } = await supabase
          .from('instances')
          .insert({
            name: instanceName,
            phone_number: normalizedPhone,
            uazapi_instance_id: instanceToken,
            status: 'connecting'
          })
          .select(selectWithContacts)
          .single()

        if (createInstanceError || !newInstance) {
          throw createInstanceError || new Error('Nao foi possivel criar a instancia.')
        }

        instanceRecord = {
          ...(newInstance as InstanceWithContacts),
          contacts: newInstance.contacts || []
        }
      }

      if (instanceRecord) {
        onInstanceCreated(instanceRecord)
      }

      if (edgeBaseUrl) {
        setWebhookUrl(`${edgeBaseUrl}?instance_token=${encodeURIComponent(instanceToken)}`)
      }

      await autoRegisterWebhook(instanceToken)

      setForm(initialForm)
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro desconhecido ao salvar a instancia."
      setError(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const copyWebhookUrl = async () => {
    if (webhookUrl) await navigator.clipboard.writeText(webhookUrl)
  }

  const renderField = ({ key, label, placeholder, required, helper }: FieldConfig) => (
    <FormField
      key={String(key)}
      label={label}
      value={form[key]}
      placeholder={placeholder}
      required={required}
      helper={helper}
      type={key.toLowerCase().includes("phone") ? "tel" : "text"}
      onChange={(value) => handleChange(key, value)}
    />
  )

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/40 px-4">
      <div className="w-full max-w-lg rounded-2xl bg-white/90 shadow-2xl backdrop-blur">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Registrar nova instancia</h3>
            <p className="text-sm text-slate-500">Informe os dados do WhatsApp que sera gerenciado.</p>
          </div>
          <button onClick={closeModal} className="rounded-full p-2 text-slate-500 hover:bg-slate-100" aria-label="Fechar">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 px-6 py-5">
          <Section title="Dados da instancia" layout="mt-2 grid gap-3">
            {instanceFields.map(renderField)}
          </Section>

          {error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}

          <div className="flex items-center justify-end space-x-3">
            <button type="button" onClick={closeModal} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {isSubmitting ? "Salvando..." : "Salvar instancia"}
            </button>
          </div>
        </form>

        {webhookUrl && (
          <div className="border-t border-slate-100 bg-slate-50 px-6 py-4">
            <p className="text-sm font-medium text-slate-800">URL do webhook para configurar na Uazapi</p>
            <div className="mt-2 flex items-center gap-2">
              <div className="flex-1 truncate rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700">{webhookUrl}</div>
              <button onClick={copyWebhookUrl} className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100">
                <Copy className="mr-1 h-4 w-4" /> Copiar
              </button>
            </div>
            <div className="mt-3 space-y-2 text-xs">
              {isRegisteringWebhook && (
                <p className="text-slate-500">Registrando webhook automaticamente...</p>
              )}
              {webhookFeedback && (
                <p
                  className={`rounded-lg px-3 py-2 font-medium ${{
                    success: 'bg-emerald-50 text-emerald-700',
                    error: 'bg-rose-50 text-rose-700'
                  }[webhookFeedback.type]}`}
                >
                  {webhookFeedback.message}
                </p>
              )}
            </div>
            <ul className="mt-3 list-disc space-y-1 pl-5 text-xs text-slate-600">
              {instructions.map((text) => (
                <li key={text}>{text}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}
