import { uazapiFetch } from './client'

export interface CreateGroupParams {
  name: string
  participants: string[]
}

export interface GetGroupInfoParams {
  groupjid: string
  getInviteLink?: boolean
  force?: boolean
}

export interface ListGroupsParams {
  page?: number
  pageSize?: number
  search?: string
  force?: boolean
  noParticipants?: boolean
  offset?: number
}

export interface JoinGroupParams {
  invitecode: string
}

export interface LeaveGroupParams {
  groupjid: string
}

export interface UpdateGroupNameParams {
  groupjid: string
  name: string
}

export interface UpdateGroupDescriptionParams {
  groupjid: string
  description: string
}

export interface UpdateGroupImageParams {
  groupjid: string
  image: string
}

export interface UpdateGroupAnnounceParams {
  groupjid: string
  announce: boolean
}

export interface UpdateGroupLockedParams {
  groupjid: string
  locked: boolean
}

export interface UpdateParticipantsParams {
  groupjid: string
  action: 'add' | 'remove' | 'promote' | 'demote' | 'approve' | 'reject'
  participants: string[]
}

export interface ResetInviteCodeParams {
  groupjid: string
}

export interface GetInviteInfoParams {
  invitecode: string
}

export function createGroup(token: string, params: CreateGroupParams) {
  return uazapiFetch<unknown>('/group/create', token, { body: params })
}

export function getGroupInfo(token: string, params: GetGroupInfoParams) {
  return uazapiFetch<unknown>('/group/info', token, { body: params })
}

export function listGroups(token: string, params?: ListGroupsParams) {
  return uazapiFetch<unknown>('/group/list', token, { body: params ?? {} })
}

export function joinGroup(token: string, params: JoinGroupParams) {
  return uazapiFetch<unknown>('/group/join', token, { body: params })
}

export function leaveGroup(token: string, params: LeaveGroupParams) {
  return uazapiFetch<unknown>('/group/leave', token, { body: params })
}

export function updateGroupName(token: string, params: UpdateGroupNameParams) {
  return uazapiFetch<unknown>('/group/updateName', token, { body: params })
}

export function updateGroupDescription(token: string, params: UpdateGroupDescriptionParams) {
  return uazapiFetch<unknown>('/group/updateDescription', token, { body: params })
}

export function updateGroupImage(token: string, params: UpdateGroupImageParams) {
  return uazapiFetch<unknown>('/group/updateImage', token, { body: params })
}

export function updateGroupAnnounce(token: string, params: UpdateGroupAnnounceParams) {
  return uazapiFetch<unknown>('/group/updateAnnounce', token, { body: params })
}

export function updateGroupLocked(token: string, params: UpdateGroupLockedParams) {
  return uazapiFetch<unknown>('/group/updateLocked', token, { body: params })
}

export function updateParticipants(token: string, params: UpdateParticipantsParams) {
  return uazapiFetch<unknown>('/group/updateParticipants', token, { body: params })
}

export function resetInviteCode(token: string, params: ResetInviteCodeParams) {
  return uazapiFetch<unknown>('/group/resetInviteCode', token, { body: params })
}

export function getInviteInfo(token: string, params: GetInviteInfoParams) {
  return uazapiFetch<unknown>('/group/inviteInfo', token, { body: params })
}
