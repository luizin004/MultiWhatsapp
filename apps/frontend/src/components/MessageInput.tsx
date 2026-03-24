'use client'

import { useRef, useState, useEffect } from 'react'
import { Send, Paperclip, Smile, FileText, Check } from 'lucide-react'
import { Message } from '@/types/database'
import ReplyPreview from './ReplyPreview'

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
  onSaveEdit?: (messageId: string, newContent: string) => Promise<void> | void
  disabled?: boolean
  selectedInstanceId?: string | null
  selectedContactId?: string | null
  replyTo?: Message | null
  editMessage?: Message | null
  onCancelReply?: () => void
  onCancelEdit?: () => void
}

export default function MessageInput({
  onSendMessage,
  onSendAttachment,
  onSaveEdit,
  disabled = false,
  selectedInstanceId,
  selectedContactId,
  replyTo,
  editMessage,
  onCancelReply,
  onCancelEdit
}: MessageInputProps) {
  const [message, setMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const hasPendingAttachment = Boolean(pendingFile)

  // When entering edit mode, populate the textarea with the existing text
  useEffect(() => {
    if (editMessage) {
      setMessage(editMessage.content || '')
      textareaRef.current?.focus()
    }
  }, [editMessage])

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
      if (editMessage && onSaveEdit) {
        await onSaveEdit(editMessage.id, message.trim())
        setMessage('')
        onCancelEdit?.()
      } else {
        await onSendMessage(message.trim())
        setMessage('')
        onCancelReply?.()
      }
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Escape cancels edit mode
    if (e.key === 'Escape') {
      if (editMessage) {
        setMessage('')
        onCancelEdit?.()
      } else if (replyTo) {
        onCancelReply?.()
      }
      return
    }

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

  const isEditMode = Boolean(editMessage)
  const canSend = message.trim() && !isSubmitting && !disabled && !hasPendingAttachment

  return (
    <div className="border-t border-white/5 bg-[#111B21]">
      {/* Reply preview bar */}
      {replyTo && !editMessage && (
        <ReplyPreview message={replyTo} onCancel={() => onCancelReply?.()} />
      )}

      {/* Edit mode indicator */}
      {editMessage && (
        <div className="flex items-center gap-3 border-b border-white/5 bg-[#1A2730] px-4 py-2">
          <div className="flex-1 border-l-4 border-[#25D366] pl-3">
            <p className="text-xs font-semibold text-[#25D366]">Editando mensagem</p>
            <p className="mt-0.5 truncate text-xs text-[#8696A0]">{editMessage.content}</p>
          </div>
          <button
            type="button"
            onClick={() => {
              setMessage('')
              onCancelEdit?.()
            }}
            className="flex h-7 w-7 items-center justify-center rounded-full text-[#8696A0] transition hover:bg-white/10 hover:text-[#E9EDEF]"
            title="Cancelar edição"
          >
            <span className="text-sm leading-none">✕</span>
          </button>
        </div>
      )}

      <div className="px-4 py-3">
        {pendingFile && (
          <div className="mb-3 rounded-2xl border border-white/5 bg-[#0B141A] p-4 text-sm text-[#E9EDEF]">
            <div className="flex gap-4">
              {previewUrl && pendingFile.type.startsWith('image/') && (
                <img src={previewUrl} alt={pendingFile.name} className="h-20 w-20 rounded-xl object-cover" />
              )}
              {previewUrl && pendingFile.type.startsWith('video/') && (
                <video src={previewUrl} className="h-20 w-20 rounded-xl" controls muted />
              )}
              {!pendingFile.type.startsWith('image/') && !pendingFile.type.startsWith('video/') && (
                <div className="flex h-20 w-20 items-center justify-center rounded-xl bg-white/5 text-white/70">
                  <FileText className="h-8 w-8" />
                </div>
              )}
              <div className="flex-1">
                <p className="text-sm font-semibold text-[#E9EDEF]">{pendingFile.name}</p>
                <p className="text-xs text-[#8696A0]">
                  {(pendingFile.size / 1024 / 1024).toFixed(2)} MB · {pendingFile.type || 'arquivo'}
                </p>
                <p className="mt-2 text-xs text-[#8696A0]">Use o campo abaixo para escrever uma legenda antes do envio.</p>
              </div>
            </div>
            <div className="mt-3 flex gap-3">
              <button
                type="button"
                onClick={() => {
                  resetAttachment()
                  setMessage('')
                }}
                className="flex-1 rounded-full border border-white/10 px-4 py-2 text-sm text-[#8696A0] transition hover:bg-white/5"
                disabled={isUploading}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmAttachment}
                className="flex-1 rounded-full bg-[#25D366] px-4 py-2 text-sm font-semibold text-[#111B21] transition hover:bg-[#1ed061] disabled:opacity-60"
                disabled={isUploading}
              >
                {isUploading ? 'Enviando...' : 'Enviar arquivo'}
              </button>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex items-end gap-3">
          {!isEditMode && (
            <div className="flex items-center gap-1">
              <button
                type="button"
                className="rounded-full p-2 text-white/60 transition hover:bg-white/10 hover:text-white"
                title="Emoji"
              >
                <Smile className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={handleFileSelect}
                className="rounded-full p-2 text-white/60 transition hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:text-white/20"
                disabled={disabled || isSubmitting || isUploading || !onSendAttachment}
                title="Anexar arquivo"
              >
                <Paperclip className="h-5 w-5" />
              </button>
            </div>
          )}

          <div className="flex-1 rounded-full bg-[#202C33] px-4 py-2">
            <textarea
              ref={textareaRef}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={isEditMode ? 'Editar mensagem...' : 'Digite uma mensagem'}
              className="max-h-32 w-full resize-none bg-transparent text-sm text-[#E9EDEF] placeholder:text-[#8696A0] focus:outline-none"
              rows={1}
              disabled={isSubmitting || disabled}
            />
          </div>

          <button
            type="submit"
            disabled={!canSend}
            className={`rounded-full p-3 text-white transition ${
              canSend
                ? 'bg-[#25D366] hover:bg-[#1ed061]'
                : 'bg-white/10 text-white/40 cursor-not-allowed'
            }`}
            title={isEditMode ? 'Salvar edição' : isUploading ? 'Enviando anexo...' : 'Enviar mensagem'}
          >
            {isEditMode ? <Check className="h-4 w-4" /> : <Send className="h-4 w-4" />}
          </button>
        </form>

        <div className="mt-2 text-center text-xs text-[#8696A0]">
          {disabled
            ? 'Selecione um contato conectado para enviar mensagens.'
            : isEditMode
              ? 'Enter salva · Esc cancela edição'
              : isUploading
                ? 'Processando arquivo...'
                : hasPendingAttachment
                  ? 'Revise o anexo antes de enviar.'
                  : 'Enter envia · Shift + Enter cria nova linha'}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          onChange={handleFileChange}
          className="hidden"
          accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.rar"
        />
      </div>
    </div>
  )
}
