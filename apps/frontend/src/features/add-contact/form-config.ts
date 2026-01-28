export type ConnectionMode = 'paircode' | 'qrcode'

export interface FormState {
  instanceName: string
  instancePhone: string
  systemName: string
  adminField01: string
  adminField02: string
  fingerprintProfile: string
  browser: string
  connectionMode: ConnectionMode
}

export interface FieldConfig {
  key: keyof Omit<FormState, 'connectionMode'>
  label: string
  placeholder: string
  required?: boolean
  helper?: string
  type?: 'text' | 'tel'
}

export const initialForm: FormState = {
  instanceName: '',
  instancePhone: '',
  systemName: '',
  adminField01: '',
  adminField02: '',
  fingerprintProfile: 'chrome',
  browser: 'chrome',
  connectionMode: 'paircode'
}

export const baseFields: FieldConfig[] = [
  { key: 'instanceName', label: 'Nome da instância *', placeholder: 'Ex: Atendimentos Norte', required: true },
  {
    key: 'instancePhone',
    label: 'Número do WhatsApp',
    placeholder: 'Ex: 5511988887777',
    helper: 'Digite apenas números com DDI + DDD',
    type: 'tel'
  }
]

export const advancedFields: FieldConfig[] = [
  { key: 'systemName', label: 'Nome do sistema', placeholder: 'Ex: uazapiGO' },
  { key: 'adminField01', label: 'Admin Field 01', placeholder: 'Metadado opcional 1' },
  { key: 'adminField02', label: 'Admin Field 02', placeholder: 'Metadado opcional 2' },
  { key: 'fingerprintProfile', label: 'Fingerprint profile', placeholder: 'Ex: chrome' },
  { key: 'browser', label: 'Browser', placeholder: 'Ex: chrome' }
]
