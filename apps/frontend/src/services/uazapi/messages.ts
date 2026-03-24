import { uazapiFetch } from './client'

export interface SendTextParams {
  number: string
  text: string
  linkPreview?: boolean
  linkPreviewTitle?: string
  linkPreviewDescription?: string
  linkPreviewImage?: string
  linkPreviewLarge?: boolean
  replyid?: string
  mentions?: string
  readchat?: boolean
  readmessages?: boolean
  delay?: number
  forward?: boolean
  track_source?: string
  track_id?: string
  async?: boolean
}

export interface SendMediaParams {
  number: string
  type: 'image' | 'video' | 'document' | 'audio' | 'myaudio' | 'ptt' | 'ptv' | 'sticker'
  file: string
  text?: string
  docName?: string
  thumbnail?: string
  mimetype?: string
  replyid?: string
  mentions?: string
  readchat?: boolean
  readmessages?: boolean
  delay?: number
  forward?: boolean
  track_source?: string
  track_id?: string
  async?: boolean
}

export interface SendContactParams {
  number: string
  fullName: string
  phoneNumber: string
  organization?: string
  email?: string
  url?: string
  replyid?: string
  mentions?: string
  readchat?: boolean
  delay?: number
  track_source?: string
  track_id?: string
}

export interface SendLocationParams {
  number: string
  name?: string
  address?: string
  latitude: number
  longitude: number
  replyid?: string
  mentions?: string
  readchat?: boolean
  delay?: number
  track_source?: string
  track_id?: string
}

export interface SendMenuParams {
  number: string
  type: 'button' | 'list' | 'poll' | 'carousel'
  text: string
  choices: string[]
  footerText?: string
  listButton?: string
  selectableCount?: number
  imageButton?: string
  replyid?: string
  mentions?: string
  readchat?: boolean
  delay?: number
  track_source?: string
  track_id?: string
  async?: boolean
}

export interface CarouselButton {
  id: string
  text: string
  type: 'REPLY' | 'URL' | 'COPY' | 'CALL'
}

export interface CarouselCard {
  text: string
  image?: string
  video?: string
  document?: string
  filename?: string
  buttons: CarouselButton[]
}

export interface SendCarouselParams {
  number: string
  text: string
  carousel: CarouselCard[]
  delay?: number
  readchat?: boolean
  readmessages?: boolean
  replyid?: string
  mentions?: string
  forward?: boolean
  async?: boolean
  track_source?: string
  track_id?: string
}

export interface SendStatusParams {
  type: 'text' | 'image' | 'video' | 'audio' | 'myaudio' | 'ptt'
  text?: string
  background_color?: number
  font?: number
  file?: string
  thumbnail?: string
  mimetype?: string
  replyid?: string
  mentions?: string
  readchat?: boolean
  delay?: number
  forward?: boolean
  async?: boolean
  track_source?: string
  track_id?: string
}

export interface SendLocationButtonParams {
  number: string
  text: string
  delay?: number
  readchat?: boolean
  readmessages?: boolean
  replyid?: string
  mentions?: string
  async?: boolean
  track_source?: string
  track_id?: string
}

export interface SendPaymentRequestParams {
  number: string
  amount: number
  text?: string
  title?: string
  footer?: string
  itemName?: string
  invoiceNumber?: string
  pixKey?: string
  pixType?: string
  pixName?: string
  paymentLink?: string
  fileUrl?: string
  fileName?: string
  boletoCode?: string
  replyid?: string
  mentions?: string
  delay?: number
  readchat?: boolean
  readmessages?: boolean
  async?: boolean
  track_source?: string
  track_id?: string
}

export interface SendPixButtonParams {
  number: string
  pixType: 'CPF' | 'CNPJ' | 'PHONE' | 'EMAIL' | 'EVP'
  pixKey: string
  pixName?: string
  async?: boolean
  delay?: number
  readchat?: boolean
  readmessages?: boolean
  replyid?: string
  mentions?: string
  track_source?: string
  track_id?: string
}

export interface SendPresenceParams {
  number: string
  presence: 'composing' | 'recording' | 'paused'
  delay?: number
}

export function sendText(token: string, params: SendTextParams) {
  return uazapiFetch<unknown>('/send/text', token, { body: params })
}

export function sendMedia(token: string, params: SendMediaParams) {
  return uazapiFetch<unknown>('/send/media', token, { body: params })
}

export function sendContact(token: string, params: SendContactParams) {
  return uazapiFetch<unknown>('/send/contact', token, { body: params })
}

export function sendLocation(token: string, params: SendLocationParams) {
  return uazapiFetch<unknown>('/send/location', token, { body: params })
}

export function sendMenu(token: string, params: SendMenuParams) {
  return uazapiFetch<unknown>('/send/menu', token, { body: params })
}

export function sendCarousel(token: string, params: SendCarouselParams) {
  return uazapiFetch<unknown>('/send/carousel', token, { body: params })
}

export function sendStatus(token: string, params: SendStatusParams) {
  return uazapiFetch<unknown>('/send/status', token, { body: params })
}

export function sendLocationButton(token: string, params: SendLocationButtonParams) {
  return uazapiFetch<unknown>('/send/location-button', token, { body: params })
}

export function sendPaymentRequest(token: string, params: SendPaymentRequestParams) {
  return uazapiFetch<unknown>('/send/request-payment', token, { body: params })
}

export function sendPixButton(token: string, params: SendPixButtonParams) {
  return uazapiFetch<unknown>('/send/pix-button', token, { body: params })
}

export function sendPresence(token: string, params: SendPresenceParams) {
  return uazapiFetch<unknown>('/message/presence', token, { body: params })
}
