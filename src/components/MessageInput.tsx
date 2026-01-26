'use client'

import { useRef, useState } from 'react'
import { Send, Paperclip, Smile, FileText } from 'lucide-react'

export type AttachmentPayload = {
  url: string
  mimeType: string
  fileName: string
  type: 'image' | 'video' | 'document'
  caption?: string
}

interface MessageInputProps {
  onSendMessage: (content: string) => Promise<void> | void
  onSendAttachment?: (payload: AttachmentPayload) => Promise<void> | void
  disabled?: boolean
  selectedInstanceId?: string | null
  selectedContactId?: string | null
}

export default function MessageInput({
  onSendMessage,
  onSendAttachment,
  disabled = false,
  selectedInstanceId,
  selectedContactId
}: MessageInputProps) {
  const [message, setMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const hasPendingAttachment = Boolean(pendingFile)

  const clearPreview = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setPreviewUrl(null)
  }

  const resetAttachment = () => {
    clearPreview()
    setPendingFile(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!message.trim() || isSubmitting || isUploading || disabled || hasPendingAttachment) return

    setIsSubmitting(true)
    
    try {
      await onSendMessage(message.trim())
      setMessage('')
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  const detectAttachmentType = (mimeType: string, fileName: string): AttachmentPayload['type'] => {
    if (mimeType?.startsWith('image/')) return 'image'
    if (mimeType?.startsWith('video/')) return 'video'
    const extension = fileName.toLowerCase()
    if (extension.endsWith('.mp4') || extension.endsWith('.mov') || extension.endsWith('.mkv')) return 'video'
    if (extension.endsWith('.png') || extension.endsWith('.jpg') || extension.endsWith('.jpeg') || extension.endsWith('.gif')) return 'image'
    return 'document'
  }

  const handleFileSelect = () => {
    if (disabled || isSubmitting || isUploading) return
    fileInputRef.current?.click()
  }

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!onSendAttachment || !selectedInstanceId || !selectedContactId) {
      console.warn('Instancia ou contato nao selecionado para anexar arquivos.')
      event.target.value = ''
      return
    }
    if (previewUrl) clearPreview()
    setPendingFile(file)
    setPreviewUrl(URL.createObjectURL(file))
    event.target.value = ''
  }

  const handleConfirmAttachment = async () => {
    if (!pendingFile || !onSendAttachment || !selectedInstanceId || !selectedContactId) return

    setIsUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', pendingFile)
      formData.append('instanceId', selectedInstanceId)
      formData.append('contactId', selectedContactId)

      const response = await fetch('/api/attachments/upload', {
        method: 'POST',
        body: formData
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data?.error || 'Falha ao enviar anexo')

      await onSendAttachment({
        url: data.url,
        mimeType: data.mimeType,
        fileName: data.fileName,
        type: detectAttachmentType(data.mimeType, data.fileName),
        caption: message.trim() || undefined
      })

      setMessage('')
      resetAttachment()
    } catch (error) {
      console.error('Erro ao processar anexo:', error)
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="border-t border-slate-200/70 bg-white/80 p-4">
      {pendingFile && (
        <div className="mb-3 rounded-2xl border border-slate-200 bg-white/90 p-3 shadow-sm">
          <div className="flex gap-3">
            {previewUrl && pendingFile.type.startsWith('image/') && (
              <img src={previewUrl} alt={pendingFile.name} className="h-20 w-20 rounded-xl object-cover" />
            )}
            {previewUrl && pendingFile.type.startsWith('video/') && (
              <video src={previewUrl} className="h-20 w-20 rounded-xl" controls muted />
            )}
            {!pendingFile.type.startsWith('image/') && !pendingFile.type.startsWith('video/') && (
              <div className="flex h-20 w-20 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
                <FileText className="h-8 w-8" />
              </div>
            )}
            <div className="flex-1 text-sm text-slate-600">
              <p className="font-medium text-slate-900">{pendingFile.name}</p>
              <p>{(pendingFile.size / 1024 / 1024).toFixed(2)} MB · {pendingFile.type || 'arquivo'}</p>
              <p className="text-xs text-slate-500">Use o campo abaixo para escrever uma legenda antes do envio.</p>
            </div>
          </div>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={() => {
                resetAttachment()
                setMessage('')
              }}
              className="flex-1 rounded-xl border border-slate-200 py-2 text-slate-600 hover:bg-slate-100"
              disabled={isUploading}
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleConfirmAttachment}
              className="flex-1 rounded-xl bg-slate-900 py-2 text-white hover:bg-slate-800 disabled:opacity-60"
              disabled={isUploading}
            >
              {isUploading ? 'Enviando...' : 'Enviar arquivo'}
            </button>
          </div>
        </div>
      )}
      <form onSubmit={handleSubmit} className="flex items-end gap-2">
        <div className="flex space-x-1">
          <button
            type="button"
            onClick={handleFileSelect}
            className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-40"
            disabled={disabled || isSubmitting || isUploading || !onSendAttachment}
            title="Anexar arquivo"
          >
            <Paperclip className="w-5 h-5" />
          </button>
          <button
            type="button"
            className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
            title="Emoji"
          >
            <Smile className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1">
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Digite uma mensagem..."
            className="w-full px-4 py-2 border border-slate-200 rounded-xl resize-none bg-white/80 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-300 focus:border-transparent"
            rows={1}
            disabled={isSubmitting || disabled}
          />
        </div>

        <button
          type="submit"
          disabled={!message.trim() || isSubmitting || disabled || hasPendingAttachment}
          className={`p-2 rounded-xl transition-colors ${
            message.trim() && !isSubmitting && !disabled
              ? 'bg-slate-900 text-white hover:bg-slate-800'
              : 'bg-slate-100 text-slate-400 cursor-not-allowed'
          }`}
          title={isUploading ? 'Enviando anexo...' : 'Enviar mensagem'}
        >
          <Send className="w-5 h-5" />
        </button>
      </form>

      <div className="mt-2 text-xs text-slate-500 text-center">
        {disabled
          ? 'Selecione um contato conectado para enviar mensagens.'
          : isUploading
            ? 'Processando arquivo...'
            : hasPendingAttachment
              ? 'Revise o anexo antes de enviar.'
              : 'Pressione Enter para enviar, Shift+Enter para nova linha'}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        onChange={handleFileChange}
        className="hidden"
        accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.rar"
      />
    </div>
  )
}
