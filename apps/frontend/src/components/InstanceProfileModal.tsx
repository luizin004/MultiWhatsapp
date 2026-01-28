'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { InstanceWithContacts } from '@/types/database'
import { Loader2, UploadCloud, X, Trash2, ImagePlus } from 'lucide-react'

interface InstanceProfileModalProps {
  open: boolean
  instance: InstanceWithContacts | null
  onClose: () => void
  onUpdated: (instance: InstanceWithContacts) => void
  onDeleted: (instanceId: string) => void
}

const selectWithContacts = `
  *,
  contacts:contacts(*)
`

export default function InstanceProfileModal({ open, instance, onClose, onUpdated, onDeleted }: InstanceProfileModalProps) {
  const [name, setName] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [objectUrl, setObjectUrl] = useState<string | null>(null)
  const [removePhoto, setRemovePhoto] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    if (open && instance) {
      setName(instance.name)
      setSelectedFile(null)
      setPreviewUrl(instance.profile_pic_url || null)
      setRemovePhoto(false)
      setError(null)
      setSuccess(null)
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl)
        setObjectUrl(null)
      }
    }
  }, [open, instance])

  useEffect(() => {
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [objectUrl])

  const handleFileSelect = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      setError('Escolha um arquivo de imagem (PNG, JPG, etc).')
      return
    }

    if (objectUrl) {
      URL.revokeObjectURL(objectUrl)
      setObjectUrl(null)
    }

    const nextObjectUrl = URL.createObjectURL(file)
    setSelectedFile(file)
    setPreviewUrl(nextObjectUrl)
    setObjectUrl(nextObjectUrl)
    setRemovePhoto(false)
    setError(null)
    event.target.value = ''
  }

  const handleRemovePhoto = () => {
    setSelectedFile(null)
    setPreviewUrl(null)
    setRemovePhoto(true)
    setSuccess(null)
    if (objectUrl) {
      URL.revokeObjectURL(objectUrl)
      setObjectUrl(null)
    }
  }

  const uploadAvatar = async (): Promise<string> => {
    if (!selectedFile || !instance) return instance?.profile_pic_url || ''

    const formData = new FormData()
    formData.append('file', selectedFile)
    formData.append('instanceId', instance.id)

    const response = await fetch('/api/instances/avatar', {
      method: 'POST',
      body: formData
    })

    const data = await response.json()
    if (!response.ok) {
      throw new Error(data?.error || 'Falha ao subir avatar.')
    }

    return data.url as string
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!instance || !name.trim()) {
      setError('Informe um nome para a instancia.')
      return
    }

    setIsSaving(true)
    setError(null)
    setSuccess(null)

    try {
      let profilePicUrl = instance.profile_pic_url || null

      if (removePhoto) {
        profilePicUrl = null
      } else if (selectedFile) {
        profilePicUrl = await uploadAvatar()
      }

      const { data, error: updateError } = await supabase
        .from('instances')
        .update({ name: name.trim(), profile_pic_url: profilePicUrl })
        .eq('id', instance.id)
        .select(selectWithContacts)
        .single()

      if (updateError || !data) {
        throw updateError || new Error('Nao foi possivel atualizar a instancia.')
      }

      onUpdated(data as InstanceWithContacts)
      setSuccess('Dados atualizados com sucesso!')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Falha ao atualizar instancia.'
      setError(message)
    } finally {
      setIsSaving(false)
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl)
        setObjectUrl(null)
      }
    }
  }

  const photoLabel = useMemo(() => {
    if (removePhoto) return 'Sem foto'
    if (previewUrl) return 'Foto selecionada'
    return 'Sem foto'
  }, [previewUrl, removePhoto])

  const handleDeleteInstance = async () => {
    if (!instance || isDeleting) return

    try {
      setIsDeleting(true)
      setError(null)
      setSuccess(null)

      const response = await fetch('/api/instances/delete', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ instanceToken: instance.uazapi_instance_id })
      })

      const data = await response.json().catch(() => null)

      if (!response.ok) {
        throw new Error(data?.error || 'Falha ao excluir a instância na UAZAPI.')
      }

      onDeleted(instance.id)
      setSuccess('Instância excluída com sucesso.')
      onClose()
    } catch (deleteError) {
      const message = deleteError instanceof Error ? deleteError.message : 'Não foi possível excluir a instância.'
      setError(message)
    } finally {
      setIsDeleting(false)
    }
  }

  if (!open || !instance) return null

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 px-4">
      <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-white/10 bg-[#111B21] shadow-[0_20px_70px_rgba(0,0,0,0.6)]">
        <div className="flex items-center justify-between border-b border-white/10 bg-[#202C33] px-6 py-4">
          <div>
            <h3 className="text-lg font-semibold text-[#E9EDEF]">Editar instancia</h3>
            <p className="text-sm text-[#8696A0]">Atualize nome e foto de perfil.</p>
          </div>
          <button onClick={onClose} className="rounded-full p-2 text-white/60 transition hover:bg-white/10 hover:text-white" title="Fechar">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 px-6 py-6">
          <div>
            <label className="text-sm font-medium text-[#E9EDEF]">Nome da instancia</label>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="mt-1 w-full rounded-xl border border-white/10 bg-[#202C33] px-3 py-2 text-sm text-[#E9EDEF] placeholder:text-[#8696A0] focus:border-[#25D366] focus:outline-none"
              placeholder="Ex: OralAligner - Leticia"
              maxLength={80}
            />
          </div>

          <div className="rounded-2xl border border-dashed border-white/10 bg-[#0B141A] p-4">
            <div className="flex items-center gap-4">
              {previewUrl ? (
                <img src={previewUrl} alt="Pré-visualização" className="h-20 w-20 rounded-xl object-cover" />
              ) : (
                <div className="flex h-20 w-20 items-center justify-center rounded-xl bg-white/5 text-white/40">
                  <ImagePlus className="h-8 w-8" />
                </div>
              )}
              <div className="flex-1">
                <p className="text-sm font-medium text-[#E9EDEF]">{photoLabel}</p>
                <p className="text-xs text-[#8696A0]">PNG ou JPG até 5MB.</p>
                <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                  <button
                    type="button"
                    onClick={handleFileSelect}
                    className="flex items-center justify-center gap-2 rounded-full bg-[#25D366] px-4 py-2 text-sm font-medium text-[#111B21] transition hover:bg-[#1ed061]"
                  >
                    <UploadCloud className="h-4 w-4" />
                    Escolher foto
                  </button>
                  <button
                    type="button"
                    onClick={handleRemovePhoto}
                    className="flex items-center justify-center gap-2 rounded-full border border-white/10 px-4 py-2 text-sm text-[#E9EDEF] hover:bg-white/5 disabled:cursor-not-allowed disabled:text-white/30"
                    disabled={!previewUrl && !selectedFile && !instance.profile_pic_url}
                  >
                    <Trash2 className="h-4 w-4" />
                    Remover
                  </button>
                </div>
              </div>
            </div>
          </div>

          {error && <p className="text-sm text-[#f7a8a2]">{error}</p>}
          {success && <p className="text-sm text-[#7dd2a5]">{success}</p>}

          <div className="flex flex-col gap-3 pt-2">
            <button
              type="button"
              onClick={handleDeleteInstance}
              disabled={isDeleting}
              className="inline-flex items-center justify-center gap-2 rounded-full border border-[#F87171] px-4 py-2 text-sm font-semibold text-[#F87171] transition hover:bg-[#3a1f21] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              {isDeleting ? 'Excluindo...' : 'Excluir instância'}
            </button>

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="rounded-full border border-white/10 px-4 py-2 text-sm font-medium text-[#E9EDEF] hover:bg-white/5"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="flex items-center gap-2 rounded-full bg-[#25D366] px-5 py-2 text-sm font-semibold text-[#111B21] transition hover:bg-[#1ed061] disabled:opacity-70"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Salvando...
                  </>
                ) : (
                  'Salvar alterações'
                )}
              </button>
            </div>
          </div>
        </form>

        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
      </div>
    </div>
  )
}
