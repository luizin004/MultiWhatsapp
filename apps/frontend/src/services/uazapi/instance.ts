import { uazapiFetch } from './client'

export interface PrivacySettings {
  groupadd?: 'all' | 'contacts' | 'contact_blacklist' | 'none'
  last?: 'all' | 'contacts' | 'contact_blacklist' | 'none'
  status?: 'all' | 'contacts' | 'contact_blacklist' | 'none'
  profile?: 'all' | 'contacts' | 'contact_blacklist' | 'none'
  readreceipts?: 'all' | 'none'
  online?: 'all' | 'match_last_seen'
  calladd?: 'all' | 'known'
}

export interface UpdatePresenceParams {
  presence: 'available' | 'unavailable'
}

export interface UpdateProxyParams {
  enable: boolean
  proxy_url?: string
}

export interface WebhookConfig {
  id?: string
  enabled?: boolean
  url: string
  events?: string[]
  excludeMessages?: string[]
  addUrlEvents?: boolean
  addUrlTypesMessages?: boolean
  action?: 'add' | 'update' | 'delete'
}

export interface GetBusinessProfileParams {
  jid?: string
}

export interface UpdateBusinessProfileParams {
  description?: string
  address?: string
  email?: string
}

export interface ListCatalogParams {
  jid: string
}

export function getPrivacy(token: string) {
  return uazapiFetch<unknown>('/instance/privacy', token)
}

export function updatePrivacy(token: string, settings: PrivacySettings) {
  return uazapiFetch<unknown>('/instance/privacy', token, { body: settings })
}

export function updatePresence(token: string, params: UpdatePresenceParams) {
  return uazapiFetch<unknown>('/instance/presence', token, { body: params })
}

export function getProxy(token: string) {
  return uazapiFetch<unknown>('/instance/proxy', token)
}

export function updateProxy(token: string, params: UpdateProxyParams) {
  return uazapiFetch<unknown>('/instance/proxy', token, { body: params })
}

export function deleteProxy(token: string) {
  return uazapiFetch<unknown>('/instance/proxy', token, { method: 'DELETE' })
}

export function getWebhooks(token: string) {
  return uazapiFetch<unknown>('/webhook', token)
}

export function updateWebhook(token: string, webhookConfig: WebhookConfig) {
  return uazapiFetch<unknown>('/webhook', token, { body: webhookConfig })
}

export function getBusinessProfile(token: string, params: GetBusinessProfileParams) {
  return uazapiFetch<unknown>('/business/get/profile', token, { body: params })
}

export function updateBusinessProfile(token: string, params: UpdateBusinessProfileParams) {
  return uazapiFetch<unknown>('/business/update/profile', token, { body: params })
}

export function getBusinessCategories(token: string) {
  return uazapiFetch<unknown>('/business/get/categories', token)
}

export function listCatalog(token: string, params: ListCatalogParams) {
  return uazapiFetch<unknown>('/business/catalog/list', token, { body: params })
}
