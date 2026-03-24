'use client'

import { useRef, useState, useEffect, useCallback } from 'react'
import { Send, Paperclip, Smile, FileText, Check } from 'lucide-react'
import { Message, QuickReply } from '@/types/database'
import ReplyPreview from './ReplyPreview'
import QuickReplySelector from './QuickReplySelector'
import AttachmentMenu, { BuilderType } from './AttachmentMenu'
import PollBuilder from './builders/PollBuilder'
import ListBuilder from './builders/ListBuilder'
import ButtonBuilder from './builders/ButtonBuilder'
import ContactCardSender from './builders/ContactCardSender'
import LocationSender from './builders/LocationSender'
import PaymentSender from './builders/PaymentSender'

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
  instanceToken?: string
  contactNumber?: string
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
  onCancelEdit,
  instanceToken,
  contactNumber,
}: MessageInputProps) {
  const [message, setMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const imageInputRef = useRef<HTMLInputElement | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const hasPendingAttachment = Boolean(pendingFile)

  // ── Quick reply selector state ────────────────────────────────────────────
  const [quickReplyOpen, setQuickReplyOpen] = useState(false)
  const [quickReplyQuery, setQuickReplyQuery] = useState('')

  // ── Attachment menu + builder state ──────────────────────────────────────
  const [attachmentMenuOpen, setAttachmentMenuOpen] = useState(false)
  const [activeBuilder, setActiveBuilder] = useState<BuilderType | null>(null)

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
    if (imageInputRef.current) imageInputRef.current.value = ''
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

  // Detect `/query` pattern at the start of the message or after a space.
  // Keeps the popup open while the user types after the slash.
  const detectQuickReplyTrigger = useCallback((value: string) => {
    const match = value.match(/(^|\s)\/(\S*)$/)
    if (match) {
      setQuickReplyQuery(match[2])
      setQuickReplyOpen(true)
    } else {
      setQuickReplyOpen(false)
    }
  }, [])

  const handleMessageChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value
    setMessage(value)
    detectQuickReplyTrigger(value)
  }

  const handleQuickReplySelect = useCallback(
    (reply: QuickReply) => {
      setQuickReplyOpen(false)

      if (reply.type === 'text' && reply.text) {
        // Replace the `/query` portion with the reply text
        setMessage((prev) => prev.replace(/(^|\s)\/\S*$/, (m, space) => space + reply.text))
      } else if (reply.file_url) {
        // For media replies, clear the trigger and let the parent send it as an attachment
        setMessage((prev) => prev.replace(/(^|\s)\/\S*$/, '').trim())
        if (onSendAttachment) {
          const type = (reply.type === 'image' ? 'image' : reply.type === 'video' ? 'video' : 'document') as AttachmentPayload['type']
          const result = onSendAttachment({
            url: reply.file_url!,
            mimeType: '',
            fileName: reply.doc_name ?? reply.shortcut,
            type,
          })
          if (result instanceof Promise) {
            result.catch((err) => console.error('Erro ao enviar resposta rapida de midia:', err))
          }
        }
      }
    },
    [onSendAttachment]
  )

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Escape closes quick reply popup first, then cancels edit/reply
    if (e.key === 'Escape') {
      if (quickReplyOpen) {
        setQuickReplyOpen(false)
        return
      }
      if (editMessage) {
        setMessage('')
        onCancelEdit?.()
      } else if (replyTo) {
        onCancelReply?.()
      }
      return
    }

    // Backspace past the slash closes the popup
    if (e.key === 'Backspace' && quickReplyOpen) {
      const textarea = textareaRef.current
      if (textarea) {
        const cursor = textarea.selectionStart ?? 0
        const before = message.slice(0, cursor)
        // If the character being deleted is the slash trigger, close the popup
        if (/\/$/.test(before)) {
          setQuickReplyOpen(false)
        }
      }
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      // Quick reply selector handles Enter via its own keydown listener (capture phase)
      // so we only submit if the popup is closed
      if (!quickReplyOpen) {
        e.preventDefault()
        handleSubmit(e)
      }
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
    <div className="bg-[#202C33]">
      {/* Reply preview bar */}
      {replyTo && !editMessage && (
        <ReplyPreview message={replyTo} onCancel={() => onCancelReply?.()} />
      )}

      {/* Edit mode indicator */}
      {editMessage && (
        <div className="flex items-center gap-3 border-b border-white/[0.04] bg-[#182229] px-4 py-2">
          <div className="flex-1 border-l-[3px] border-[#25D366] pl-3">
            <p className="text-[12px] font-semibold text-[#25D366]">Editando mensagem</p>
            <p className="mt-0.5 truncate text-[12px] text-[#8696A0]">{editMessage.content}</p>
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

      <div className="px-4 py-2">
        {pendingFile && (
          <div className="mb-3 rounded-xl border border-white/[0.06] bg-[#111B21] p-3 text-sm text-[#E9EDEF]">
            <div className="flex gap-3">
              {previewUrl && pendingFile.type.startsWith('image/') && (
                <img src={previewUrl} alt={pendingFile.name} className="h-16 w-16 flex-shrink-0 rounded-lg object-cover" />
              )}
              {previewUrl && pendingFile.type.startsWith('video/') && (
                <video src={previewUrl} className="h-16 w-16 flex-shrink-0 rounded-lg" controls muted />
              )}
              {!pendingFile.type.startsWith('image/') && !pendingFile.type.startsWith('video/') && (
                <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-lg bg-white/5 text-[#8696A0]">
                  <FileText className="h-7 w-7" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="truncate text-[13px] font-semibold text-[#E9EDEF]">{pendingFile.name}</p>
                <p className="text-[12px] text-[#8696A0]">
                  {(pendingFile.size / 1024 / 1024).toFixed(2)} MB · {pendingFile.type || 'arquivo'}
                </p>
              </div>
            </div>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={() => {
                  resetAttachment()
                  setMessage('')
                }}
                className="flex-1 rounded-full border border-white/10 px-4 py-1.5 text-[13px] text-[#8696A0] transition hover:bg-white/5"
                disabled={isUploading}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmAttachment}
                className="flex-1 rounded-full bg-[#25D366] px-4 py-1.5 text-[13px] font-semibold text-[#111B21] transition hover:bg-[#1ed061] disabled:opacity-60"
                disabled={isUploading}
              >
                {isUploading ? 'Enviando...' : 'Enviar arquivo'}
              </button>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex items-end gap-2">
          {!isEditMode && (
            <div className="flex items-center gap-0.5 pb-1">
              <button
                type="button"
                className="rounded-full p-2 text-[#aebac1] transition hover:bg-white/10 hover:text-[#E9EDEF]"
                title="Emoji"
              >
                <Smile className="h-[22px] w-[22px]" />
              </button>
              {/* Attachment button wrapped in relative container to anchor the menu */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setAttachmentMenuOpen((prev) => !prev)}
                  className="rounded-full p-2 text-[#aebac1] transition hover:bg-white/10 hover:text-[#E9EDEF] disabled:cursor-not-allowed disabled:text-white/20"
                  disabled={disabled || isSubmitting || isUploading}
                  title="Anexar arquivo"
                >
                  <Paperclip className="h-[22px] w-[22px]" />
                </button>
                <AttachmentMenu
                  open={attachmentMenuOpen}
                  onClose={() => setAttachmentMenuOpen(false)}
                  onSelectFile={() => imageInputRef.current?.click()}
                  onSelectDocument={() => fileInputRef.current?.click()}
                  onOpenBuilder={(type) => {
                    setActiveBuilder(type)
                    setAttachmentMenuOpen(false)
                  }}
                />
              </div>
            </div>
          )}

          {/* Textarea wrapper — also anchors the quick reply popup */}
          <div className="relative flex-1">
            {instanceToken && (
              <QuickReplySelector
                open={quickReplyOpen}
                query={quickReplyQuery}
                instanceToken={instanceToken}
                onSelect={handleQuickReplySelect}
                onClose={() => setQuickReplyOpen(false)}
              />
            )}
            <div className="rounded-lg bg-[#2A3942] px-4 py-[9px] min-h-[42px] flex items-end">
              <textarea
                ref={textareaRef}
                value={message}
                onChange={handleMessageChange}
                onKeyDown={handleKeyDown}
                placeholder={isEditMode ? 'Editar mensagem...' : 'Digite uma mensagem'}
                className="max-h-32 w-full resize-none bg-transparent text-[15px] leading-[20px] text-[#E9EDEF] placeholder:text-[#8696A0] focus:outline-none"
                rows={1}
                disabled={isSubmitting || disabled}
              />
            </div>
          </div>

          <div className="pb-1">
            <button
              type="submit"
              disabled={isEditMode ? !message.trim() : !canSend}
              className={`flex h-[42px] w-[42px] items-center justify-center rounded-full text-white transition-all duration-150 ${
                (isEditMode ? message.trim() : canSend)
                  ? 'bg-[#25D366] hover:bg-[#1ed061] scale-100'
                  : 'bg-[#2A3942] text-[#aebac1] cursor-not-allowed'
              }`}
              title={isEditMode ? 'Salvar edição' : isUploading ? 'Enviando anexo...' : 'Enviar mensagem'}
            >
              {isEditMode ? <Check className="h-5 w-5" /> : <Send className="h-5 w-5" />}
            </button>
          </div>
        </form>

        <p className="pb-1 pt-0.5 text-center text-[11px] text-[#8696A0]/60">
          {disabled
            ? 'Selecione um contato para enviar mensagens.'
            : isEditMode
              ? 'Enter salva · Esc cancela'
              : isUploading
                ? 'Processando arquivo...'
                : hasPendingAttachment
                  ? 'Revise o anexo antes de enviar.'
                  : 'Enter envia · Shift+Enter nova linha'}
        </p>

        {/* Hidden input for images/videos (triggered via attachment menu) */}
        <input
          ref={imageInputRef}
          type="file"
          onChange={handleFileChange}
          className="hidden"
          accept="image/*,video/*"
        />
        {/* Hidden input for documents (triggered via attachment menu) */}
        <input
          ref={fileInputRef}
          type="file"
          onChange={handleFileChange}
          className="hidden"
          accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.rar"
        />
      </div>

      {/* Builder modals — rendered outside the form so z-index layering is correct */}
      {instanceToken && contactNumber && (
        <>
          <PollBuilder
            open={activeBuilder === 'poll'}
            onClose={() => setActiveBuilder(null)}
            instanceToken={instanceToken}
            contactNumber={contactNumber}
          />
          <ListBuilder
            open={activeBuilder === 'list'}
            onClose={() => setActiveBuilder(null)}
            instanceToken={instanceToken}
            contactNumber={contactNumber}
          />
          <ButtonBuilder
            open={activeBuilder === 'button'}
            onClose={() => setActiveBuilder(null)}
            instanceToken={instanceToken}
            contactNumber={contactNumber}
          />
          <ContactCardSender
            open={activeBuilder === 'contact'}
            onClose={() => setActiveBuilder(null)}
            instanceToken={instanceToken}
            contactNumber={contactNumber}
          />
          <LocationSender
            open={activeBuilder === 'location'}
            onClose={() => setActiveBuilder(null)}
            instanceToken={instanceToken}
            contactNumber={contactNumber}
          />
          <PaymentSender
            open={activeBuilder === 'payment'}
            onClose={() => setActiveBuilder(null)}
            instanceToken={instanceToken}
            contactNumber={contactNumber}
          />
        </>
      )}
    </div>
  )
}
