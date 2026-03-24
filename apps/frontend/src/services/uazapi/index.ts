export * from './client'
export * from './messages'
export * from './chat'
export * from './contacts'
export * from './groups'
export * from './instance'
export * from './media'
export * from './quick-replies'

// Backwards-compatible wrappers for the original flat API surface.
// New callers should use sendText / sendMedia directly.
import { sendText, sendMedia } from './messages'

export function sendTextMessage(params: Parameters<typeof sendText>[1] & { token: string }) {
  const { token, ...rest } = params
  return sendText(token, rest)
}

export function sendMediaMessage(params: Parameters<typeof sendMedia>[1] & { token: string }) {
  const { token, ...rest } = params
  return sendMedia(token, rest)
}
