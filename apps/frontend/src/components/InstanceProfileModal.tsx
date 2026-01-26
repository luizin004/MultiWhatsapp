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
}

const selectWithContacts = `
  *,
  contacts:contacts(*)
`

export default function InstanceProfileModal({ open, instance, onClose, onUpdated }: InstanceProfileModalProps) {
  const [name, setName] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [objectUrl, setObjectUrl] = useState<string | null>(null)
  const [removePhoto, setRemovePhoto] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
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

  if (!open || !instance) return null

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/40 px-4">
      <div className="w-full max-w-lg rounded-2xl bg-white/95 shadow-2xl backdrop-blur">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Editar instancia</h3>
            <p className="text-sm text-slate-500">Atualize nome e foto de perfil.</p>
          </div>
          <button onClick={onClose} className="rounded-full p-2 text-slate-500 hover:bg-slate-100" title="Fechar">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 px-6 py-5">
          <div>
            <label className="text-sm font-medium text-slate-700">Nome da instancia</label>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white/80 px-3 py-2 text-sm text-slate-900 focus:border-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-300"
              placeholder="Ex: OralAligner - Leticia"
              maxLength={80}
            />
          </div>

          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/60 p-4">
            <div className="flex items-center gap-4">
              {previewUrl ? (
                <img src={previewUrl} alt="Pré-visualização" className="h-20 w-20 rounded-xl object-cover" />
              ) : (
                <div className="flex h-20 w-20 items-center justify-center rounded-xl bg-white text-slate-400">
                  <ImagePlus className="h-8 w-8" />
                </div>
              )}
              <div className="flex-1">
                <p className="text-sm font-medium text-slate-800">{photoLabel}</p>
                <p className="text-xs text-slate-500">PNG ou JPG até 5MB.</p>
                <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                  <button
                    type="button"
                    onClick={handleFileSelect}
                    className="flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800"
                  >
                    <UploadCloud className="h-4 w-4" />
                    Escolher foto
                  </button>
                  <button
                    type="button"
                    onClick={handleRemovePhoto}
                    className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-600 hover:bg-slate-100"
                    disabled={!previewUrl && !selectedFile && !instance.profile_pic_url}
                  >
                    <Trash2 className="h-4 w-4" />
                    Remover
                  </button>
                </div>
              </div>
            </div>
          </div>

          {error && <p className="text-sm text-rose-600">{error}</p>}
          {success && <p className="text-sm text-emerald-600">{success}</p>}

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-emerald-600 disabled:opacity-70"
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
        </form>

        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
      </div>
    </div>
  )
}
