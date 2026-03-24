import { uazapiFetch } from './client'

export interface ListContactsParams {
  page?: number
  pageSize?: number
  offset?: number
}

export interface AddContactParams {
  phone: string
  name: string
}

export interface RemoveContactParams {
  phone: string
}

export function getContacts(token: string) {
  return uazapiFetch<unknown>('/contacts', token)
}

export function listContacts(token: string, params?: ListContactsParams) {
  return uazapiFetch<unknown>('/contacts/list', token, { body: params ?? {} })
}

export function addContact(token: string, params: AddContactParams) {
  return uazapiFetch<unknown>('/contact/add', token, { body: params })
}

export function removeContact(token: string, params: RemoveContactParams) {
  return uazapiFetch<unknown>('/contact/remove', token, { body: params })
}
